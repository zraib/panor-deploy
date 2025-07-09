'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SceneData } from '@/types/scenes';
import styles from './MiniMap.module.css';

interface MiniMapProps {
  scenes: SceneData[];
  currentScene: SceneData;
  viewer: any; // Marzipano viewer
  onSelectScene: (sceneId: string) => void;
  rotationAngle: number;
  poiSceneCounts?: Record<string, number>;
}

interface Position {
  x: number;
  y: number;
}

export default function MiniMap({
  scenes,
  currentScene,
  viewer,
  onSelectScene,
  rotationAngle,
  poiSceneCounts = {},
}: MiniMapProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 }); // Bottom-right by default
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentYaw, setCurrentYaw] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [initialPanOffset, setInitialPanOffset] = useState({ x: 0, y: 0 }); // Store initial pan offset
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });
  const [dragStartPan, setDragStartPan] = useState({ x: 0, y: 0 });

  // Add performance optimization state
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null);
  const [contentDimensions, setContentDimensions] = useState({
    width: 0,
    height: 0,
  });
  const lastMousePosition = useRef({ x: 0, y: 0 });

  const [mapBounds, setMapBounds] = useState({
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
  });

  const miniMapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Helper function to apply inverse rotation to mouse movement
  // This accounts for the minimap rotation when calculating pan deltas
  const rotateMouseDelta = useCallback(
    (deltaX: number, deltaY: number, angle: number) => {
      const radians = (-angle * Math.PI) / 180; // Negative angle for inverse rotation
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      return {
        x: deltaX * cos - deltaY * sin,
        y: deltaX * sin + deltaY * cos,
      };
    },
    []
  );

  // Rotation function to correct minimap orientation
  const rotatePoint = useCallback(
    (
      x: number,
      y: number,
      centerX: number,
      centerY: number,
      angleDegrees: number
    ) => {
      const angle = (angleDegrees * Math.PI) / 180;
      const dx = x - centerX;
      const dy = y - centerY;

      const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
      const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

      return {
        x: centerX + rotatedX,
        y: centerY + rotatedY,
      };
    },
    []
  );

  // Cache content dimensions
  useEffect(() => {
    if (contentRef.current) {
      const updateDimensions = () => {
        const rect = contentRef.current!.getBoundingClientRect();
        setContentDimensions({ width: rect.width, height: rect.height });
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }
  }, [isHovered, isMinimized]);

  // Optimized mouse move handler with requestAnimationFrame throttling
  const handleMouseMoveThrottled = useCallback(
    (e: MouseEvent) => {
      lastMousePosition.current = { x: e.clientX, y: e.clientY };

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      const frameId = requestAnimationFrame(() => {
        const { x: clientX, y: clientY } = lastMousePosition.current;

        if (isDragging) {
          // Minimap window dragging (optimized)
          const newX = clientX - dragOffset.x;
          const newY = clientY - dragOffset.y;

          const maxX = window.innerWidth - (isHovered ? 300 : 200);
          const maxY = window.innerHeight - (isHovered ? 300 : 200);

          setPosition({
            x: Math.max(20, Math.min(newX, maxX)),
            y: Math.max(20, Math.min(newY, maxY)),
          });
        } else if (isPanning && contentDimensions.width > 0) {
          // Calculate mouse movement delta
          const deltaX = clientX - dragStartMouse.x;
          const deltaY = clientY - dragStartMouse.y;

          // Apply inverse rotation to mouse movement
          const rotatedDelta = rotateMouseDelta(deltaX, deltaY, rotationAngle);

          // Use cached content dimensions instead of getBoundingClientRect
          const contentSize = contentDimensions.width;

          // Convert pixel movement to percentage with improved sensitivity
          const sensitivity = 0.8; // Adjust for smoother panning
          const percentDeltaX =
            (rotatedDelta.x / contentSize) * 100 * sensitivity;
          const percentDeltaY =
            (rotatedDelta.y / contentSize) * 100 * sensitivity;

          // Apply movement
          const newPanX = dragStartPan.x + percentDeltaX;
          const newPanY = dragStartPan.y + percentDeltaY;

          // Calculate dynamic pan limits based on zoom level
          // When zoomed in, allow more panning to see all content
          const visibleRange = 100 / zoomLevel;
          const overflowX = Math.max(0, (zoomLevel * 100 - 100) / 2);
          const overflowY = Math.max(0, (zoomLevel * 100 - 100) / 2);

          // Expanded pan limits to ensure all hotspots are accessible
          const maxPanX = overflowX + 20; // Extra margin for better UX
          const maxPanY = overflowY + 20;

          setPanOffset({
            x: Math.max(-maxPanX, Math.min(maxPanX, newPanX)),
            y: Math.max(-maxPanY, Math.min(maxPanY, newPanY)),
          });
        }

        setAnimationFrameId(null);
      });

      setAnimationFrameId(frameId);
    },
    [
      isDragging,
      isPanning,
      dragOffset,
      isHovered,
      dragStartMouse,
      dragStartPan,
      zoomLevel,
      rotateMouseDelta,
      rotationAngle,
      contentDimensions,
    ]
  );

  // Handle mouse move for dragging and panning
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsPanning(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        setAnimationFrameId(null);
      }
    };

    if (isDragging || isPanning) {
      // Use passive event listeners for better performance
      document.addEventListener('mousemove', handleMouseMoveThrottled, {
        passive: true,
      });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveThrottled);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isDragging, isPanning, handleMouseMoveThrottled, animationFrameId]);

  // Calculate map bounds from actual scene positions for true top-down 2D view
  useEffect(() => {
    const currentFloorScenes = scenes.filter(
      scene => scene.floor === currentScene.floor
    );
    if (currentFloorScenes.length === 0) return;

    const positions = currentFloorScenes.map(scene => ({
      x: scene.position.x,
      y: scene.position.y,
    }));

    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));

    const paddingX = Math.max((maxX - minX) * 0.2, 1);
    const paddingY = Math.max((maxY - minY) * 0.2, 1);

    setMapBounds({
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minY: minY - paddingY,
      maxY: maxY + paddingY,
    });
  }, [scenes, currentScene.floor]);

  // Update current yaw from viewer
  useEffect(() => {
    if (!viewer) return;

    const updateYaw = () => {
      const view = viewer.view();
      if (!view) return;
      const yaw = view.yaw();
      setCurrentYaw(yaw);
    };

    viewer.addEventListener('viewChange', updateYaw);
    updateYaw();

    return () => {
      if (viewer) {
        viewer.removeEventListener('viewChange', updateYaw);
      }
    };
  }, [viewer]);

  // Convert actual scene position to 2D map coordinates for top-down view
  const positionToMapCoords = useCallback(
    (sceneId: string) => {
      const scene = scenes.find(s => s.id === sceneId);
      if (!scene) return { x: 50, y: 50 };

      const mapWidth = mapBounds.maxX - mapBounds.minX;
      const mapHeight = mapBounds.maxY - mapBounds.minY;

      if (mapWidth === 0 || mapHeight === 0) return { x: 50, y: 50 };

      const sceneX = scene.position.x;
      const sceneY = scene.position.y;

      const normalizedX = (sceneX - mapBounds.minX) / mapWidth;
      const normalizedY = (sceneY - mapBounds.minY) / mapHeight;

      // Apply zoom first, centered on (50, 50)
      let x = 50 + (normalizedX * 100 - 50) * zoomLevel;
      let y = 50 + ((1 - normalizedY) * 100 - 50) * zoomLevel;

      // Then apply pan
      x += panOffset.x;
      y += panOffset.y;

      // Finally apply rotation
      const rotated = rotatePoint(x, y, 50, 50, rotationAngle);

      return { x: rotated.x, y: rotated.y };
    },
    [mapBounds, scenes, rotatePoint, rotationAngle, zoomLevel, panOffset]
  );

  // Get current floor scenes
  const currentFloorScenes = scenes.filter(
    scene => scene.floor === currentScene.floor
  );

  // Calculate distance between two scenes in map coordinates
  const calculateDistance = useCallback(
    (scene1: SceneData, scene2: SceneData): number => {
      const dx = scene1.position.x - scene2.position.x;
      const dy = scene1.position.y - scene2.position.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    []
  );

  // Filter hotspots based on zoom level and proximity
  const getVisibleHotspots = useCallback(() => {
    if (currentFloorScenes.length === 0) return [];

    // Define zoom thresholds and minimum distances
    const zoomThresholds = {
      minDistance100: 4.0, // At 100% zoom, hide hotspots closer than this
      minDistance200: 2.0, // At 200% zoom
      minDistance300: 1.0, // At 300% zoom
      minDistance400: 0.5, // At 400% zoom, show almost all
    };

    // Calculate minimum distance based on current zoom level
    let minDistance: number;
    if (zoomLevel <= 1.0) {
      minDistance = zoomThresholds.minDistance100;
    } else if (zoomLevel <= 2.0) {
      // Interpolate between 100% and 200%
      const factor = (zoomLevel - 1.0) / 1.0;
      minDistance =
        zoomThresholds.minDistance100 -
        (zoomThresholds.minDistance100 - zoomThresholds.minDistance200) *
          factor;
    } else if (zoomLevel <= 3.0) {
      // Interpolate between 200% and 300%
      const factor = (zoomLevel - 2.0) / 1.0;
      minDistance =
        zoomThresholds.minDistance200 -
        (zoomThresholds.minDistance200 - zoomThresholds.minDistance300) *
          factor;
    } else {
      // Interpolate between 300% and 400%
      const factor = Math.min((zoomLevel - 3.0) / 1.0, 1.0);
      minDistance =
        zoomThresholds.minDistance300 -
        (zoomThresholds.minDistance300 - zoomThresholds.minDistance400) *
          factor;
    }

    // Always show the current scene
    const visibleScenes = new Set<string>([currentScene.id]);

    // Sort scenes by priority: current scene first, then by distance from current scene
    const sortedScenes = [...currentFloorScenes].sort((a, b) => {
      if (a.id === currentScene.id) return -1;
      if (b.id === currentScene.id) return 1;

      const distA = calculateDistance(currentScene, a);
      const distB = calculateDistance(currentScene, b);
      return distA - distB;
    });

    // Add scenes that don't conflict with already visible ones
    for (const scene of sortedScenes) {
      if (visibleScenes.has(scene.id)) continue;

      let canShow = true;

      // Check distance to all already visible scenes
      for (const visibleSceneId of visibleScenes) {
        const visibleScene = currentFloorScenes.find(
          s => s.id === visibleSceneId
        );
        if (
          visibleScene &&
          calculateDistance(scene, visibleScene) < minDistance
        ) {
          canShow = false;
          break;
        }
      }

      if (canShow) {
        visibleScenes.add(scene.id);
      }
    }

    return currentFloorScenes.filter(scene => visibleScenes.has(scene.id));
  }, [currentFloorScenes, currentScene, zoomLevel, calculateDistance]);

  // Get filtered hotspots based on zoom level
  const visibleHotspots = getVisibleHotspots();

  // Handle mouse down for dragging minimap or panning content
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if clicking on interactive elements
      if (
        target.classList.contains('minimize-button') ||
        target.closest('.minimize-button') ||
        target.classList.contains('scene-hotspot') ||
        target.closest('.scene-hotspot') ||
        target.classList.contains(styles.resetIndicator)
      ) {
        return;
      }

      // Dragging the entire minimap
      if (
        target.classList.contains('minimap-header') ||
        target.closest('.minimap-header')
      ) {
        setIsDragging(true);
        setDragOffset({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
      }
      // Panning the content
      else if (
        contentRef.current &&
        (target.classList.contains('minimap-content') ||
          target.closest('.minimap-content'))
      ) {
        setIsPanning(true);
        setDragStartMouse({ x: e.clientX, y: e.clientY });
        setDragStartPan({ x: panOffset.x, y: panOffset.y });
      }
    },
    [position, panOffset]
  );

  // Handle wheel for zooming with improved pan adjustment
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? -0.15 : 0.15; // Slightly faster zoom
      const newZoom = Math.max(0.5, Math.min(4, zoomLevel + delta)); // Increased max zoom

      setZoomLevel(newZoom);

      // Improved pan limits calculation for better zoom experience
      const overflowX = Math.max(0, (newZoom * 100 - 100) / 2);
      const overflowY = Math.max(0, (newZoom * 100 - 100) / 2);

      // More generous pan limits to ensure all content is accessible
      const maxPanX = overflowX + 30;
      const maxPanY = overflowY + 30;

      setPanOffset(prev => ({
        x: Math.max(-maxPanX, Math.min(maxPanX, prev.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, prev.y)),
      }));
    },
    [zoomLevel]
  );

  // Add wheel event listener manually to control passive option
  useEffect(() => {
    const contentEl = contentRef.current;
    if (contentEl) {
      const handleWheelEvent = (e: WheelEvent) => handleWheel(e);
      contentEl.addEventListener('wheel', handleWheelEvent, { passive: false });
      return () => {
        contentEl.removeEventListener('wheel', handleWheelEvent);
      };
    }
  }, [handleWheel]);

  // Add debouncing state for hotspot clicks
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  // Handle hotspot click with debouncing and race condition prevention
  const handleHotspotClick = useCallback(
    (sceneId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTime;
      
      // Prevent rapid clicking (debounce with 200ms)
       if (timeSinceLastClick < 200) {
         console.log('Hotspot click ignored: too rapid');
         return;
       }
      
      // Prevent clicking if already navigating
      if (isNavigating) {
        console.log('Hotspot click ignored: navigation in progress');
        return;
      }
      
      // Prevent clicking on current scene
      if (sceneId === currentScene.id) {
        console.log('Hotspot click ignored: already on this scene');
        return;
      }
      
      setLastClickTime(now);
      setIsNavigating(true);
      
      console.log(`MiniMap: Navigating to scene ${sceneId}`);
      
      // Call the scene selection with error handling
      try {
        onSelectScene(sceneId);
        
        // Reset navigation state after a delay
         setTimeout(() => {
           setIsNavigating(false);
         }, 1200); // Reduced timeout to match scene transition
      } catch (error) {
        console.error('Scene selection failed:', error);
        setIsNavigating(false);
      }
    },
    [onSelectScene, lastClickTime, isNavigating, currentScene.id]
  );

  // Handle minimize toggle
  const toggleMinimize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsMinimized(!isMinimized);
    },
    [isMinimized]
  );

  // Reset pan and zoom
  const resetView = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1);
  }, []);

  // Handle double click to reset view
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resetView();
    },
    [resetView]
  );

  const mapSize = isHovered ? 300 : window.innerWidth <= 768 ? 150 : 200;
  const currentSceneCoords = positionToMapCoords(currentScene.id);

  return (
    <div
      ref={miniMapRef}
      className={[
        styles.minimap,
        isDragging && styles.dragging,
        isPanning && styles.panning,
        isMinimized && styles.minimized,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        position: 'fixed',
        right: `${position.x}px`,
        bottom: `${position.y}px`,
        width: isMinimized ? '60px' : `${mapSize}px`,
        height: isMinimized ? '60px' : `${mapSize}px`,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '12px',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        zIndex: 1400,
        cursor: isDragging ? 'grabbing' : 'default',
        transition: isHovered
          ? 'width 0.3s ease, height 0.3s ease'
          : 'width 0.3s ease, height 0.3s ease, transform 0.2s ease',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with minimize button */}
      <div
        className={`${styles.minimapHeader} minimap-header`}
        style={{
          borderBottom: isMinimized
            ? 'none'
            : '1px solid rgba(255, 255, 255, 0.1)',
          cursor: 'move',
        }}
      >
        {!isMinimized && <span>Floor {currentScene.floor}</span>}
        <button
          onClick={toggleMinimize}
          className={`${styles.minimizeButton} minimize-button`}
          aria-label={isMinimized ? 'Expand minimap' : 'Minimize minimap'}
        >
          {isMinimized ? '📍' : '−'}
        </button>
      </div>

      {!isMinimized && (
        <div
          ref={contentRef}
          className={`${styles.minimapContent} minimap-content`}
          onDoubleClick={handleDoubleClick}
          style={{
            cursor: isPanning ? 'grabbing' : 'grab',
          }}
        >
          {/* Map background grid */}
          <div className={styles.mapGrid} />

          {/* Scene hotspots - filtered by zoom level and proximity */}
          {visibleHotspots.map(scene => {
            const coords = positionToMapCoords(scene.id);
            const isCurrentScene = scene.id === currentScene.id;
            const hasPOIs = (poiSceneCounts[scene.id] || 0) > 0;

            // More generous visibility bounds to show hotspots when zoomed
            const isVisible =
              coords.x > -20 &&
              coords.x < 120 &&
              coords.y > -20 &&
              coords.y < 120;

            return (
              <div
                key={scene.id}
                onClick={e => handleHotspotClick(scene.id, e)}
                className={`${styles.sceneHotspot} scene-hotspot ${isCurrentScene ? styles.current : styles.other} ${hasPOIs && !isCurrentScene ? styles.poiPulse : ''}`}
                style={{
                  left: `${coords.x}%`,
                  top: `${coords.y}%`,
                  transform: 'translate(-50%, -50%)',
                  visibility: isVisible ? 'visible' : 'hidden',
                  opacity: isVisible ? (isNavigating ? 0.5 : 1) : 0,
                  transition: 'opacity 0.3s ease, transform 0.2s ease',
                  zIndex: isCurrentScene ? 10 : 5,
                  cursor: isNavigating ? 'not-allowed' : 'pointer',
                  pointerEvents: isNavigating ? 'none' : 'auto',
                }}
                title={isNavigating ? 'Navigation in progress...' : `${scene.name} (Floor ${scene.floor})`}
                tabIndex={isNavigating ? -1 : 0}
                role='button'
                aria-label={isNavigating ? 'Navigation in progress' : `Navigate to ${scene.name}`}
                aria-disabled={isNavigating}
                onKeyDown={e => {
                  if (!isNavigating && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleHotspotClick(scene.id, e as any);
                  }
                }}
              />
            );
          })}

          {/* Direction indicator */}
          <div
            className={styles.directionIndicator}
            style={{
              left: `${currentSceneCoords.x}%`,
              top: `${currentSceneCoords.y}%`,
              transform: `translate(-50%, -50%) rotate(${((currentYaw * 180) / Math.PI + currentScene.initialYaw) % 360}deg)`,
              visibility:
                currentSceneCoords.x > -20 &&
                currentSceneCoords.x < 120 &&
                currentSceneCoords.y > -20 &&
                currentSceneCoords.y < 120
                  ? 'visible'
                  : 'hidden',
              opacity:
                currentSceneCoords.x > -20 &&
                currentSceneCoords.x < 120 &&
                currentSceneCoords.y > -20 &&
                currentSceneCoords.y < 120
                  ? 1
                  : 0,
              transition: 'opacity 0.2s ease',
            }}
          >
            <div className={styles.directionArrow} />
          </div>

          {/* Connection lines - only for current scene and visible targets */}
          {currentScene.linkHotspots &&
            currentScene.linkHotspots.length > 0 && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                {currentScene.linkHotspots.map((hotspot, index) => {
                  const targetScene = scenes.find(s => s.id === hotspot.target);
                  if (!targetScene || targetScene.floor !== currentScene.floor)
                    return null;

                  // Only show connection if target scene is visible in filtered hotspots
                  const isTargetVisible = visibleHotspots.some(
                    scene => scene.id === hotspot.target
                  );
                  if (!isTargetVisible) return null;

                  const fromCoords = positionToMapCoords(currentScene.id);
                  const toCoords = positionToMapCoords(hotspot.target);

                  // Skip if either point is outside expanded visible area
                  if (
                    fromCoords.x < -30 ||
                    fromCoords.x > 130 ||
                    fromCoords.y < -30 ||
                    fromCoords.y > 130 ||
                    toCoords.x < -30 ||
                    toCoords.x > 130 ||
                    toCoords.y < -30 ||
                    toCoords.y > 130
                  ) {
                    return null;
                  }

                  return (
                    <line
                      key={`${currentScene.id}-${hotspot.target}-${index}`}
                      x1={`${fromCoords.x}%`}
                      y1={`${fromCoords.y}%`}
                      x2={`${toCoords.x}%`}
                      y2={`${toCoords.y}%`}
                      stroke='rgba(255, 255, 255, 0.3)'
                      strokeWidth='1'
                      opacity='0.6'
                    />
                  );
                })}
              </svg>
            )}

          {/* Reset indicator */}
          {(panOffset.x !== 0 || panOffset.y !== 0 || zoomLevel !== 1) && (
            <div
              className={styles.resetIndicator}
              onClick={resetView}
              title='Reset view'
              role='button'
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  resetView();
                }
              }}
            >
              ⌂
            </div>
          )}

          {/* Zoom level indicator */}
          <div className={styles.zoomIndicator}>
            {Math.round(zoomLevel * 100)}%
          </div>

          {/* Hotspot visibility indicator */}
          <div className={styles.hotspotCounter}>
            {visibleHotspots.length}/{currentFloorScenes.length}
          </div>



          {/* Scroll hint for better UX */}
          {isHovered && !isNavigating && (
            <div className={styles.scrollHint}>
              Scroll to zoom • Drag to pan
            </div>
          )}
        </div>
      )}
    </div>
  );
}
