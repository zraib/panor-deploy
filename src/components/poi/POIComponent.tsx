'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { POIComponentProps, POIData, POIFormData, POIPosition } from '@/types/poi';
import { screenToYawPitch, validateViewAngles, generateUniqueFilename } from './utils';
import POIContextMenu from './POIContextMenu';
import POIModal from './POIModal';
import POIPreview from './POIPreview';
import { FaMapPin } from 'react-icons/fa';
import { toast } from 'react-toastify';

const POIComponent: React.FC<POIComponentProps> = ({
  projectId,
  currentPanoramaId,
  viewerSize,
  viewerRef,
  panoRef,
  onPOICreated
}) => {
  const [pois, setPois] = useState<POIData[]>([]);
  const [pendingPOI, setPendingPOI] = useState<POIPosition | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showModal, setShowModal] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POIData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingPOIRef = useRef<POIPosition | null>(null);

  // Load POIs on component mount and when panorama changes
  useEffect(() => {
    if (currentPanoramaId) {
      loadPOIs();
      // Clear any pending POI when switching panoramas
      setPendingPOI(null);
      pendingPOIRef.current = null;
      setShowContextMenu(false);
      setShowModal(false);
    }
  }, [currentPanoramaId]);

  const loadPOIs = async () => {
    try {
      const response = await fetch(`/api/poi/load?projectId=${encodeURIComponent(projectId)}&panoramaId=${encodeURIComponent(currentPanoramaId)}`);
      if (response.ok) {
        const data = await response.json();
        setPois(data.pois || []);
      } else if (response.status === 404) {
        // File doesn't exist yet, start with empty array
        setPois([]);
      } else {
        throw new Error(`Failed to load POIs: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading POIs:', error);
      setPois([]);
    }
  };

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!viewerRef.current || !currentPanoramaId) {
      toast.error('Viewer not initialized or no active panorama');
      return;
    }

    try {
      // Get current view parameters from the viewer
      const view = viewerRef.current.view();
      const viewParams = {
        yaw: view.yaw() * (180 / Math.PI), // Convert from radians to degrees
        pitch: view.pitch() * (180 / Math.PI),
        fov: view.fov() * (180 / Math.PI)
      };

      // Get the panorama container bounds for accurate coordinate calculation
      const panoContainer = panoRef.current;
      if (!panoContainer) {
        toast.error('Unable to determine panorama container bounds');
        return;
      }

      const rect = panoContainer.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;

      const { yaw, pitch } = screenToYawPitch(
        relativeX,
        relativeY,
        rect.width,
        rect.height,
        viewParams.yaw,
        viewParams.pitch,
        viewParams.fov
      );

      const position = { yaw, pitch };
      console.log('Setting pendingPOI:', position);
      setPendingPOI(position);
      pendingPOIRef.current = position; // Backup in ref
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    } catch (error) {
      console.error('Error calculating POI position:', error);
      toast.error('Failed to calculate POI position. Please try again.');
    }
  }, [viewerRef, currentPanoramaId, viewerSize]);

  // Add global right-click listener to capture context menu events
  useEffect(() => {
    const handleGlobalRightClick = (e: MouseEvent) => {
      // Check if the right-click is within the panorama viewer element
      if (panoRef.current && panoRef.current.contains(e.target as Node)) {
        e.preventDefault();
        handleRightClick(e as any);
      }
    };

    document.addEventListener('contextmenu', handleGlobalRightClick);
    return () => {
      document.removeEventListener('contextmenu', handleGlobalRightClick);
    };
  }, [handleRightClick, panoRef]);

  // Position lifecycle tracking
  useEffect(() => {
    return () => {
      console.log('Cleanup - Current position state:', {
        pendingPOI,
        pendingPOIRef: pendingPOIRef.current
      });
    };
  }, [currentPanoramaId]); // Cleanup on panorama change

  const handleCreatePOI = () => {
    // Prevent duplicate modals
    if (showModal) return;
    
    console.log('Position capture snapshot:', {
      pendingPOI,
      pendingPOIRef: pendingPOIRef.current,
      panoramaId: currentPanoramaId
    });
    const currentPendingPOI = pendingPOI || pendingPOIRef.current;
    if (!currentPendingPOI) {
      toast.error('No POI position available. Please try right-clicking again.');
      return;
    }
    setShowContextMenu(false);
    setShowModal(true);
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
    setPendingPOI(null);
    pendingPOIRef.current = null;
  };

  const handleModalClose = () => {
    console.log('Modal closing, clearing pendingPOI');
    setShowModal(false);
    setPendingPOI(null);
    pendingPOIRef.current = null;
  };

  const savePOI = async (data: POIFormData) => {
    console.log('savePOI called with data:', data);
    
    // Use position from form data (stored in modal) as primary source
    const currentPendingPOI = data.position || pendingPOI || pendingPOIRef.current;
    if (!currentPendingPOI) {
      console.error('No pending POI position when savePOI was called');
      console.error('Current state:', { 
        dataPosition: data.position, 
        pendingPOI, 
        pendingPOIRef: pendingPOIRef.current, 
        showModal, 
        showContextMenu 
      });
      throw new Error('No pending POI position. Please try creating the POI again.');
    }

    try {
      validateViewAngles(currentPendingPOI.yaw, currentPendingPOI.pitch);
    } catch (error) {
      throw new Error(`Invalid POI position: ${error}`);
    }

    const poiId = uuidv4();
    const timestamp = new Date().toISOString();
    
    let contentPath = data.content;
    
    // Handle file upload
    if (data.type === 'file' && data.file) {
      const uniqueFilename = generateUniqueFilename(data.file.name, poiId);
      
      // Upload file
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('filename', uniqueFilename);
      formData.append('projectId', projectId);
      
      const uploadResponse = await fetch('/api/poi/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }
      
      contentPath = uniqueFilename;
    }

    const newPOI: POIData = {
      id: poiId,
      panoramaId: currentPanoramaId,
      name: data.name.trim(),
      description: data.description.trim(),
      position: currentPendingPOI,
      type: data.type,
      content: contentPath,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Save POI data
    const saveResponse = await fetch('/api/poi/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...newPOI, projectId })
    });

    if (!saveResponse.ok) {
      throw new Error('Failed to save POI data');
    }

    // Update local state
    setPois(prev => [...prev, newPOI]);
    
    // Notify parent component
    if (onPOICreated) {
      onPOICreated(newPOI);
    }

    // Clear pending POI and close modal
    setPendingPOI(null);
    pendingPOIRef.current = null;
    setShowModal(false);
  };

  const handlePOIClick = (poi: POIData) => {
    setSelectedPOI(poi);
    setShowPreview(true);
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
    setSelectedPOI(null);
  };

  // Store POI hotspot elements and references
  const poiHotspotsRef = useRef<{ poi: POIData; element: HTMLElement; hotspot: any }[]>([]);

  // Create POI hotspots using Marzipano's hotspot system
  const createPOIHotspots = useCallback(() => {
    if (!viewerRef.current || !currentPanoramaId) {
      return;
    }

    try {
      const scene = viewerRef.current.scene();
      if (!scene) {
        console.warn('No active scene found for POI hotspots');
        return;
      }

      const hotspotContainer = scene.hotspotContainer();
      if (!hotspotContainer) {
        console.warn('No hotspot container found for POI hotspots');
        return;
      }

      // Clear existing POI hotspots
      clearPOIHotspots();

      // Create hotspots for current panorama's POIs
      const currentPOIs = pois.filter(poi => poi.panoramaId === currentPanoramaId);
      
      currentPOIs.forEach(poi => {
        try {
          // Create DOM element for POI marker
          const element = document.createElement('div');
          element.className = 'poi-marker';
          element.style.cssText = `
            cursor: pointer;
            transform: translate(-50%, -50%);
            pointer-events: auto;
            z-index: 10;
          `;
          
          // Create POI marker content
          element.innerHTML = `
            <div class="relative">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="text-red-500 hover:text-red-600 transition-colors drop-shadow-lg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                ${poi.name}
              </div>
            </div>
          `;

          // Add click handler
          element.addEventListener('click', (e) => {
            e.stopPropagation();
            handlePOIClick(poi);
          });

          // Create Marzipano hotspot with proper yaw/pitch positioning
          const hotspot = hotspotContainer.createHotspot(element, {
            yaw: poi.position.yaw * (Math.PI / 180), // Convert degrees to radians
            pitch: poi.position.pitch * (Math.PI / 180) // Convert degrees to radians
          });

          // Store reference for cleanup
          poiHotspotsRef.current.push({ poi, element, hotspot });
        } catch (error) {
          console.error(`Failed to create POI hotspot for ${poi.name}:`, error);
        }
      });

      console.log(`Created ${poiHotspotsRef.current.length} POI hotspots for panorama ${currentPanoramaId}`);
    } catch (error) {
      console.error('Error creating POI hotspots:', error);
    }
  }, [viewerRef, currentPanoramaId, pois]);

  // Clear POI hotspots
  const clearPOIHotspots = useCallback(() => {
    if (!viewerRef.current) {
      return;
    }

    try {
      const scene = viewerRef.current.scene();
      if (scene) {
        const hotspotContainer = scene.hotspotContainer();
        if (hotspotContainer) {
          // Destroy all POI hotspots
          poiHotspotsRef.current.forEach(({ hotspot }) => {
            try {
              hotspotContainer.destroyHotspot(hotspot);
            } catch (error) {
              console.warn('Failed to destroy POI hotspot:', error);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error clearing POI hotspots:', error);
    }

    // Clear references
    poiHotspotsRef.current = [];
  }, [viewerRef]);

  // Update POI hotspots when POIs or panorama changes
  useEffect(() => {
    if (currentPanoramaId && pois.length >= 0) {
      // Small delay to ensure viewer is ready
      const timer = setTimeout(() => {
        createPOIHotspots();
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      clearPOIHotspots();
    }
  }, [currentPanoramaId, pois, createPOIHotspots, clearPOIHotspots]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPOIHotspots();
    };
  }, [clearPOIHotspots]);

  return (
    <>
      {/* Container reference for POI positioning */}
       <div 
         ref={containerRef}
         className="absolute inset-0"
         style={{ 
           pointerEvents: 'none',
           background: 'transparent',
           zIndex: 5
         }}
       />
      
      {/* POI markers are now handled by Marzipano's hotspot system */}
      
      {showContextMenu && (
        <POIContextMenu
          position={contextMenuPos}
          onCreatePOI={handleCreatePOI}
          onClose={handleCloseContextMenu}
        />
      )}
      
      {showModal && (
        <POIModal
          isOpen={showModal}
          onClose={handleModalClose}
          onSubmit={savePOI}
          pendingPosition={pendingPOI || pendingPOIRef.current}
        />
      )}
      
      {showPreview && selectedPOI && (
        <POIPreview
          poi={selectedPOI}
          projectId={projectId}
          onClose={handlePreviewClose}
        />
      )}
    </>
  );
};

export default POIComponent;