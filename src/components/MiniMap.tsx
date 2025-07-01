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
}: MiniMapProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 }); // Bottom-right by default
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentYaw, setCurrentYaw] = useState(0);
  const [mapBounds, setMapBounds] = useState({
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
  });

  const miniMapRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });

  // Calculate map bounds from actual scene positions for true top-down 2D view
  useEffect(() => {
    const currentFloorScenes = scenes.filter(
      scene => scene.floor === currentScene.floor
    );
    if (currentFloorScenes.length === 0) return;

    // Use actual X,Y coordinates for true spatial representation
    const positions = currentFloorScenes.map(scene => ({
      x: scene.position.x,
      y: scene.position.y, // Using Y coordinate for north-south positioning
    }));

    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));

    // Add padding to prevent hotspots from being too close to edges
    const paddingX = Math.max((maxX - minX) * 0.2, 1); // 20% padding for better spacing
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
      const yaw = viewer.view().yaw();
      setCurrentYaw(yaw);
    };

    viewer.addEventListener('viewChange', updateYaw);
    updateYaw(); // Initial update

    return () => {
      if (viewer) {
        viewer.removeEventListener('viewChange', updateYaw);
      }
    };
  }, [viewer]);

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

  // Convert actual scene position to 2D map coordinates for top-down view
  const positionToMapCoords = useCallback(
    (sceneId: string) => {
      const scene = scenes.find(s => s.id === sceneId);
      if (!scene) return { x: 50, y: 50 };

      const mapWidth = mapBounds.maxX - mapBounds.minX;
      const mapHeight = mapBounds.maxY - mapBounds.minY;

      if (mapWidth === 0 || mapHeight === 0) return { x: 50, y: 50 };

      // Use actual X,Y coordinates for true spatial positioning
      const sceneX = scene.position.x;
      const sceneY = scene.position.y;

      // Normalize coordinates to 0-1 range
      const normalizedX = (sceneX - mapBounds.minX) / mapWidth;
      const normalizedY = (sceneY - mapBounds.minY) / mapHeight;

      // Convert to percentage coordinates
      // For top-down view: X = left-right, Y = top-bottom (flipped)
      let x = normalizedX * 100;
      let y = (1 - normalizedY) * 100; // Flip Y axis for proper top-down orientation

      // Apply rotational correction to align with viewer coordinate system
      const rotated = rotatePoint(x, y, 50, 50, rotationAngle);
      x = rotated.x;
      y = rotated.y;

      // Clamp to valid range with some margin
      return {
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y)),
      };
    },
    [mapBounds, scenes, rotatePoint, rotationAngle]
  );

  // Get current floor scenes
  const currentFloorScenes = scenes.filter(
    scene => scene.floor === currentScene.floor
  );

  // Handle mouse down for dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (
        e.target !== e.currentTarget &&
        !(e.target as HTMLElement).classList.contains('minimap-header')
      ) {
        return; // Don't start drag if clicking on hotspots or other elements
      }

      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
      e.preventDefault();
    },
    [position]
  );

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep within viewport bounds
      const maxX = window.innerWidth - (isHovered ? 300 : 200);
      const maxY = window.innerHeight - (isHovered ? 300 : 200);

      setPosition({
        x: Math.max(20, Math.min(newX, maxX)),
        y: Math.max(20, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isHovered]);

  // Handle hotspot click
  const handleHotspotClick = useCallback(
    (sceneId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectScene(sceneId);
    },
    [onSelectScene]
  );

  // Handle minimize toggle
  const toggleMinimize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsMinimized(!isMinimized);
    },
    [isMinimized]
  );

  const mapSize = isHovered ? 300 : window.innerWidth <= 768 ? 150 : 200;
  const currentSceneCoords = positionToMapCoords(currentScene.id);

  return (
    <div
      ref={miniMapRef}
      className={`${styles.minimap} ${isDragging ? styles.dragging : ''} ${isMinimized ? styles.minimized : ''}`}
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
        cursor: isDragging ? 'grabbing' : 'grab',
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
        className={styles.minimapHeader}
        style={{
          borderBottom: isMinimized
            ? 'none'
            : '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {!isMinimized && <span>Floor {currentScene.floor}</span>}
        <button
          onClick={toggleMinimize}
          className={styles.minimizeButton}
          aria-label={isMinimized ? 'Expand minimap' : 'Minimize minimap'}
        >
          {isMinimized ? '📍' : '−'}
        </button>
      </div>

      {!isMinimized && (
        <div className={styles.minimapContent}>
          {/* Map background grid */}
          <div className={styles.mapGrid} />

          {/* Scene hotspots */}
          {currentFloorScenes.map(scene => {
            const coords = positionToMapCoords(scene.id);
            const isCurrentScene = scene.id === currentScene.id;

            return (
              <div
                key={scene.id}
                onClick={e => handleHotspotClick(scene.id, e)}
                className={`${styles.sceneHotspot} ${isCurrentScene ? styles.current : styles.other}`}
                style={{
                  left: `${coords.x}%`,
                  top: `${coords.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                title={scene.name}
                tabIndex={0}
                role='button'
                aria-label={`Navigate to ${scene.name}`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleHotspotClick(scene.id, e as any);
                  }
                }}
              />
            );
          })}

          {/* Compass/Direction indicator */}
          {/* Compass/Direction indicator */}
          <div
            className={styles.directionIndicator}
            style={{
              left: `${currentSceneCoords.x}%`,
              top: `${currentSceneCoords.y}%`,
              transform: `translate(-50%, -50%) rotate(${((currentYaw * 180) / Math.PI + (currentScene.northOffset || 0) - rotationAngle + 360) % 360}deg)`,
            }}
          >
            {/* Direction arrow */}
            <div className={styles.directionArrow} />
          </div>

          {/* Connection lines between linked scenes */}
          {currentScene.linkHotspots.map((hotspot, index) => {
            const targetScene = currentFloorScenes.find(
              s => s.id === hotspot.target
            );
            if (!targetScene) return null;

            const startCoords = currentSceneCoords;
            const endCoords = positionToMapCoords(targetScene.id);

            const deltaX = endCoords.x - startCoords.x;
            const deltaY = endCoords.y - startCoords.y;
            const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

            return (
              <div
                key={`connection-${index}`}
                className={styles.connectionLine}
                style={{
                  left: `${startCoords.x}%`,
                  top: `${startCoords.y}%`,
                  width: `${length}%`,
                  transform: `rotate(${angle}deg)`,
                }}
              />
            );
          })}

          {/* Compass rose in corner */}
          <div className={styles.compassRose}>N</div>
        </div>
      )}
    </div>
  );
}
