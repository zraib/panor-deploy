'use client';

import { useState, useEffect, useRef, ReactElement, Fragment } from 'react';
import { SceneData } from '@/types/scenes';

interface MiniMapProps {
  scenes: SceneData[];
  currentScene: SceneData | null;
  viewer: any; // Marzipano viewer instance
  onSelectScene?: (id: string) => void;
}

export default function MiniMap({
  scenes,
  currentScene,
  viewer,
  onSelectScene,
}: MiniMapProps): ReactElement {
  const [isHovered, setIsHovered] = useState(false);
  const [currentYaw, setCurrentYaw] = useState(0);

  // Update current yaw when view changes
  useEffect(() => {
    if (!viewer || !currentScene) return;

    const updateYaw = () => {
      try {
        const view = viewer.view();
        const yaw = view.yaw();
        setCurrentYaw((yaw * 180) / Math.PI); // Convert to degrees for SVG
      } catch (e) {
        // If view is not ready, use initial yaw
        setCurrentYaw((currentScene.initialViewParameters.yaw * 180) / Math.PI);
      }
    };

    // Initial update
    updateYaw();

    // Set up listener for view changes
    try {
      const view = viewer.view();
      view.addEventListener('change', updateYaw);

      return () => {
        view.removeEventListener('change', updateYaw);
      };
    } catch (e) {
      // Handle case where view might not be ready
      return undefined;
    }
  }, [viewer, currentScene]);

  if (!currentScene) return <Fragment />;

  // Filter scenes on same floor
  const sameFloorScenes = scenes.filter(s => s.floor === currentScene.floor);

  // Calculate bounds
  const positions = sameFloorScenes.map(s => ({
    x: s.position.x,
    y: s.position.y,
  }));

  const minX = Math.min(...positions.map(p => p.x)) - 5;
  const maxX = Math.max(...positions.map(p => p.x)) + 5;
  const minY = Math.min(...positions.map(p => p.y)) - 5;
  const maxY = Math.max(...positions.map(p => p.y)) + 5;

  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <div
      className="fixed bottom-5 right-5 z-[1000] transition-all duration-300 ease-in-out"
      style={{
        width: isHovered ? '220px' : '200px',
        height: isHovered ? '220px' : '200px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
      bg-black/80 backdrop-blur-[10px] p-3 rounded-xl
      transition-all duration-300 ease-in-out w-full h-full
      ${isHovered ? 'scale-110' : 'scale-100'}
    `}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`${minX} ${minY} ${width} ${height}`}
          className="rounded-lg bg-gray-800/50"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background gradient */}
          <defs>
            <radialGradient id="bgGradient">
              <stop offset="0%" stopColor="#374151" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#111827" stopOpacity="0.8" />
            </radialGradient>

            {/* Arrow markers with better styling */}
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="white" opacity="0.7" />
            </marker>
            <marker
              id="arrowhead-current"
              markerWidth="10"
              markerHeight="8"
              refX="9"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 10 4, 0 8" fill="white" opacity="1" />
            </marker>
          </defs>

          {/* Background fill */}
          <rect x={minX} y={minY} width={width} height={height} fill="url(#bgGradient)" />

          {/* Grid pattern for better visual reference */}
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="#374151"
              strokeWidth="0.1"
              opacity="0.3"
            />
          </pattern>
          <rect x={minX} y={minY} width={width} height={height} fill="url(#grid)" />

          {/* Scene points and direction indicators */}
          {sameFloorScenes.map(scene => {
            const isCurrentScene = scene.id === currentScene.id;
            const yawRadians =
              ((isCurrentScene ? currentYaw : scene.initialViewParameters.yaw) * Math.PI) / 180;
            const arrowLength = isCurrentScene ? 5 : 3;

            // Calculate arrow end position
            // Note: In SVG, positive Y goes down, so we adjust the calculation
            const arrowEndX = scene.position.x + Math.sin(yawRadians) * arrowLength;
            const arrowEndY = scene.position.y - Math.cos(yawRadians) * arrowLength;

            return (
              <g key={scene.id} className="transition-all duration-200">
                {/* Glow effect for current scene */}
                {isCurrentScene && (
                  <circle
                    cx={scene.position.x}
                    cy={scene.position.y}
                    r={4}
                    fill="none"
                    stroke="white"
                    strokeWidth="0.5"
                    opacity="0.4"
                    className="animate-pulse"
                  />
                )}

                {/* Direction arrow */}
                <line
                  x1={scene.position.x}
                  y1={scene.position.y}
                  x2={arrowEndX}
                  y2={arrowEndY}
                  stroke="white"
                  strokeWidth={isCurrentScene ? '0.8' : '0.4'}
                  opacity={isCurrentScene ? 1 : 0.6}
                  markerEnd={isCurrentScene ? 'url(#arrowhead-current)' : 'url(#arrowhead)'}
                />

                {/* Scene point */}
                <circle
                  cx={scene.position.x}
                  cy={scene.position.y}
                  r={isCurrentScene ? 2.5 : 1.2}
                  fill="white"
                  fillOpacity={isCurrentScene ? 1 : 0.7}
                  stroke="white"
                  strokeOpacity={isCurrentScene ? 1 : 0.5}
                  strokeWidth={isCurrentScene ? '0.5' : '0.2'}
                  className="cursor-pointer transition-all duration-200 hover:fill-opacity-100"
                  onClick={() => onSelectScene && onSelectScene(scene.id)}
                >
                  <title>{`Scene ${scene.id}`}</title>
                </circle>
              </g>
            );
          })}
        </svg>

        {/* Floor indicator */}
        <div className="flex items-center justify-center mt-2">
          <span className="text-xs font-medium text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
            Floor {currentScene.floor}
          </span>
        </div>
      </div>
    </div>
  );
}
