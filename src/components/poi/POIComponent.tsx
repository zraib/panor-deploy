'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { renderToString } from 'react-dom/server';
import { v4 as uuidv4 } from 'uuid';
import {
  POIComponentProps,
  POIData,
  POIFormData,
  POIPosition,
} from '@/types/poi';
import {
  screenToYawPitch,
  screenToYawPitchRaycast,
  validateViewAngles,
  generateUniqueFilename,
} from './utils';
import POIContextMenu from './POIContextMenu';
import POIModal from './POIModal';
import POIPreview from './POIPreview';
import {
  FaMapPin,
  FaImage,
  FaVideo,
  FaFilePdf,
  FaFile,
  FaGlobe,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import styles from './POIComponent.module.css';

// Function to determine the appropriate icon based on POI type and content
const getPOIIcon = (poi: POIData): React.ReactElement => {
  const iconProps = { size: 32, style: { color: '#fff' } };

  if (poi.type === 'iframe') {
    return <FaGlobe {...iconProps} />;
  }

  if (poi.type === 'file' && poi.content) {
    const extension = poi.content.toLowerCase().split('.').pop();

    switch (extension) {
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
      case 'webm':
        return <FaVideo {...iconProps} />;

      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return <FaImage {...iconProps} />;

      case 'pdf':
        return <FaFilePdf {...iconProps} />;

      default:
        return <FaFile {...iconProps} />; // Default fallback
    }
  }

  return <FaMapPin {...iconProps} />; // Default fallback
};

export interface POIComponentRef {
  editPOI: (poi: POIData) => void;
  deletePOI: (poiId: string) => void;
}

const POIComponent = React.forwardRef<POIComponentRef, POIComponentProps>((
  {
    projectId,
    currentPanoramaId,
    viewerSize,
    viewerRef,
    panoRef,
    onPOICreated
  },
  ref
) => {
  const [pois, setPois] = useState<POIData[]>([]);
  const [pendingPOI, setPendingPOI] = useState<POIPosition | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showModal, setShowModal] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POIData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [debugMarker, setDebugMarker] = useState<POIPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingPOIRef = useRef<POIPosition | null>(null);
  const debugHotspotRef = useRef<any>(null);
  
  // Clear debug marker
  const clearDebugMarker = useCallback(() => {
    if (debugHotspotRef.current && viewerRef.current) {
      try {
        const scene = viewerRef.current.scene();
        if (scene) {
          const hotspotContainer = scene.hotspotContainer();
          if (hotspotContainer && debugHotspotRef.current.hotspot) {
            hotspotContainer.destroyHotspot(debugHotspotRef.current.hotspot);
          }
        }
        
        // Style is now handled by CSS module, no cleanup needed
      } catch (error) {
        console.warn('Failed to clear debug marker:', error);
      }
      
      debugHotspotRef.current = null;
    }
    setDebugMarker(null);
  }, [viewerRef]);
   
   // Create temporary debug marker to verify positioning accuracy
   const createDebugMarker = useCallback((position: POIPosition) => {
     if (!viewerRef.current) return;
     
     try {
       const scene = viewerRef.current.scene();
       if (!scene) return;
       
       const hotspotContainer = scene.hotspotContainer();
       if (!hotspotContainer) return;
       
       // Clear existing debug marker
       clearDebugMarker();
       
       // Create debug marker element
        const element = document.createElement('div');
        element.className = styles.debugMarker;
       
       // Create hotspot
       const hotspot = hotspotContainer.createHotspot(element, {
         yaw: position.yaw * (Math.PI / 180),
         pitch: position.pitch * (Math.PI / 180)
       });
       
       debugHotspotRef.current = { hotspot, element };
       setDebugMarker(position);
       
       // Auto-remove after 3 seconds
       setTimeout(() => {
         clearDebugMarker();
       }, 3000);
       
     } catch (error) {
       console.error('Failed to create debug marker:', error);
     }
   }, [viewerRef, clearDebugMarker]);

  // Load POIs on component mount and when panorama changes
  useEffect(() => {
    if (currentPanoramaId) {
      loadPOIs();
      // Clear any pending POI when switching panoramas
      setPendingPOI(null);
      pendingPOIRef.current = null;
      setShowContextMenu(false);
      clearDebugMarker();
    }
  }, [currentPanoramaId, projectId]);

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
      
      // Use more precise coordinate calculation
      // Account for any padding or borders in the container
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      
      // Ensure coordinates are within bounds
      const clampedX = Math.max(0, Math.min(rect.width, relativeX));
      const clampedY = Math.max(0, Math.min(rect.height, relativeY));

      console.log('Right-click coordinates:', {
        clientX: e.clientX,
        clientY: e.clientY,
        rectLeft: rect.left,
        rectTop: rect.top,
        rectWidth: rect.width,
        rectHeight: rect.height,
        relativeX: clampedX,
        relativeY: clampedY,
        viewParams
      });

      // Test both coordinate conversion methods
      const position1 = screenToYawPitch(
        clampedX,
        clampedY,
        rect.width,
        rect.height,
        viewParams.yaw,
        viewParams.pitch,
        viewParams.fov
      );
      
      const position2 = screenToYawPitchRaycast(
        clampedX,
        clampedY,
        rect.width,
        rect.height,
        viewParams.yaw,
        viewParams.pitch,
        viewParams.fov
      );

      console.log('Coordinate conversion comparison:', {
        simple: position1,
        raycast: position2,
        difference: {
          yaw: Math.abs(position1.yaw - position2.yaw),
          pitch: Math.abs(position1.pitch - position2.pitch)
        }
      });
      
      // Use the simple method by default, but this can be easily switched
       const position = position1;
       console.log('Using POI position:', position);
       
       // Create temporary debug marker to verify positioning
       createDebugMarker(position);
       
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
    clearDebugMarker();
  };

  const handleModalClose = () => {
    console.log('Modal closing, clearing pendingPOI');
    setShowModal(false);
    setPendingPOI(null);
    pendingPOIRef.current = null;
  };

  const savePOI = async (data: POIFormData) => {
    console.log('savePOI called with data:', data);
    
    const isEditing = !!(data as any).id;
    const editingId = (data as any).id;
    
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid POI position: ${errorMessage}`);
    }

    const poiId = isEditing ? editingId : uuidv4();
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
        const uploadErrorData = await uploadResponse.text();
        console.error('File Upload API Error:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          response: uploadErrorData
        });
        
        // Try to parse error response for better user feedback
        try {
          const errorJson = JSON.parse(uploadErrorData);
          throw new Error(errorJson.error || `Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`);
        } catch (parseError) {
          throw new Error(`Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
      }
      
      contentPath = uniqueFilename;
    }

    const poiData: POIData = {
      id: poiId,
      panoramaId: currentPanoramaId,
      name: data.name.trim(),
      description: data.description.trim(),
      position: currentPendingPOI,
      type: data.type,
      content: contentPath,
      createdAt: isEditing ? (selectedPOI?.createdAt || timestamp) : timestamp,
      updatedAt: timestamp
    };

    const requestPayload = { ...poiData, projectId };
    console.log(`POI ${isEditing ? 'Update' : 'Save'} Request Payload:`, requestPayload);
    console.log('Project ID:', projectId);
    console.log('Current Panorama ID:', currentPanoramaId);

    // Save or update POI data
    const saveResponse = await fetch(isEditing ? '/api/poi/update' : '/api/poi/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    if (!saveResponse.ok) {
      const errorData = await saveResponse.text();
      console.error(`${isEditing ? 'Update' : 'Save'} POI API Error:`, {
        status: saveResponse.status,
        statusText: saveResponse.statusText,
        response: errorData
      });
      throw new Error(`Failed to ${isEditing ? 'update' : 'save'} POI data: ${saveResponse.status} ${saveResponse.statusText}`);
    }

    // Update local state
    if (isEditing) {
      setPois(prev => prev.map(poi => poi.id === poiId ? poiData : poi));
    } else {
      setPois(prev => [...prev, poiData]);
      
      // Notify parent component for new POIs only
      if (onPOICreated) {
        onPOICreated(poiData);
      }
    }

    // Clear pending POI and close modal
    setPendingPOI(null);
    pendingPOIRef.current = null;
    setSelectedPOI(null);
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

  const handleEditPOI = (poi: POIData) => {
    // Close preview and open modal with POI data for editing
    setShowPreview(false);
    setSelectedPOI(poi);
    setPendingPOI(poi.position);
    setShowModal(true);
  };

  const handleDeletePOI = async (poiId: string) => {
    try {
      const response = await fetch('/api/poi/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ poiId, projectId })
      });

      if (!response.ok) {
        throw new Error(`Failed to delete POI: ${response.status}`);
      }

      // Update local state
      setPois(prev => prev.filter(poi => poi.id !== poiId));
      
      // Close preview
      setShowPreview(false);
      setSelectedPOI(null);
      
      toast.success('POI deleted successfully');
    } catch (error) {
      console.error('Error deleting POI:', error);
      toast.error('Failed to delete POI');
    }
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
          element.className = styles.poiMarkerBase;
          
          // Get the appropriate icon for this POI
          const iconComponent = getPOIIcon(poi);
          const iconHtml = renderToString(iconComponent);
          
          // Create POI marker content with custom icon
          element.innerHTML = `
            <div class="${styles.poiMarker}">
              <div class="${styles.poiIconContainer}">
                ${iconHtml}
              </div>
              <div class="${styles.poiTooltip}">
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

      // POI hotspots created successfully
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

  // Expose methods through ref
  React.useImperativeHandle(ref, () => ({
    editPOI: handleEditPOI,
    deletePOI: handleDeletePOI,
  }), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPOIHotspots();
      clearDebugMarker();
    };
  }, [clearPOIHotspots, clearDebugMarker]);

  return (
    <>
      {/* Container reference for POI positioning */}
       <div 
         ref={containerRef}
         className={styles.poiContainer}
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
          editingPOI={selectedPOI}
        />
      )}
      
      {showPreview && selectedPOI && (
        <POIPreview
          poi={selectedPOI}
          projectId={projectId}
          onClose={handlePreviewClose}
          onEdit={handleEditPOI}
          onDelete={handleDeletePOI}
        />
      )}
    </>
  );
});

POIComponent.displayName = 'POIComponent';

export default POIComponent;