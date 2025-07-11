'use client';

import { useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import styles from './Hotspot.module.css';
import { LinkHotspot } from '@/types/scenes';
import { ViewParams } from '@/hooks/usePanoramaViewer';

interface HotspotProps {
  element: HTMLElement;
  data: LinkHotspot;
  visible: boolean;
  onNavigate: (_sceneId: string, _sourceHotspotYaw: number) => void;
  hasPOIs?: boolean;
  currentViewParams?: ViewParams | null;
}

// This is the actual React component that will be rendered.
// It contains the state and the JSX for the hotspot.
export function HotspotComponent({
  visible,
  data,
  onNavigate,
  style,
  hasPOIs,
}: {
  visible: boolean;
  data: LinkHotspot;
  onNavigate: (_sceneId: string, _sourceHotspotYaw: number) => void;
  style: React.CSSProperties;
  hasPOIs?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(data.target, data.yaw);
  };

  return (
    <div
      className={`${styles.hotspot} ${visible || isHovered ? styles.visible : ''} ${hasPOIs ? styles.poiGlow : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={style}
      data-testid='hotspot'
    >
      <div className={styles.arrow}></div>
    </div>
  );
}

export default function Hotspot({
  element,
  data,
  visible,
  onNavigate,
  hasPOIs,
  currentViewParams,
}: HotspotProps) {
  const rootRef = useRef<Root | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isUnmounting = useRef(false);

  // Effect for creating and cleaning up the root
  useEffect(() => {
    isUnmounting.current = false;

    if (element) {
      // Create a unique container inside the element
      if (!containerRef.current) {
        containerRef.current = document.createElement('div');
        containerRef.current.style.width = '100%';
        containerRef.current.style.height = '100%';
        element.appendChild(containerRef.current);
      }

      // Create root on our container, not the provided element
      if (!rootRef.current && containerRef.current) {
        rootRef.current = createRoot(containerRef.current);
      }
    }

    // Cleanup function
    return () => {
      isUnmounting.current = true;

      // Clean up root
      if (rootRef.current) {
        const root = rootRef.current;
        rootRef.current = null;
        setTimeout(() => {
          try {
            root.unmount();
          } catch (e) {
            console.warn('Failed to unmount root:', e);
          }
        }, 0);
      }

      // Clean up container
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, [element]); // Only recreate when element changes

  // Effect for rendering the hotspot content
  useEffect(() => {
    if (rootRef.current && !isUnmounting.current) {
      // Calculate perspective effects based on distance
      const distance = data.distance || 5; // Default distance if not provided
      const minDistance = 1;
      const maxDistance = 20;

      // Scale factor: closer = very large (1.5), farther = much smaller (0.2)
      const scaleFactor = Math.max(
        0.2,
        Math.min(
          1.5,
          1.5 - ((distance - minDistance) / (maxDistance - minDistance)) * 1
        )
      );

      // Oval factor: closer = more circular (0.9), farther = more oval/flat (0.3) to simulate floor perspective
      const ovalFactor = Math.max(
        0.3,
        Math.min(
          0.9,
          0.9 - ((distance - minDistance) / (maxDistance - minDistance)) * 0.6
        )
      );

      // Perspective rotation: farther objects appear more tilted to simulate lying flat on floor
      const perspectiveRotation = Math.min(
        65,
        45 + ((distance - minDistance) / (maxDistance - minDistance)) * 20
      );

// Zoom compensation: adjust position to counteract zoom-induced shift
let zoomOffsetX = 0;
let zoomOffsetY = 0;

if (currentViewParams?.fov) {
  // Reference FOV (when hotspots should be in exact position)
  const referenceFov = Math.PI / 4; // 45 degrees in radians
  const currentFov = currentViewParams.fov;
  
  // Calculate zoom factor (higher FOV = zoomed out, lower FOV = zoomed in)
  const zoomFactor = currentFov / referenceFov;
  
  // When zoomed out (higher FOV), hotspots appear to shift backward and right
  // So we compensate by moving them forward (negative Y) and left (negative X)
  const compensationStrength = 0.4; // Increased strength for more noticeable effect
  
  // Calculate offset based on distance and zoom level
  const distanceNormalized = (distance - minDistance) / (maxDistance - minDistance);
  const baseOffset = distanceNormalized * compensationStrength;
  
  // Apply compensation: more compensation for more zoomed out views
  const zoomCompensation = (zoomFactor - 1) * baseOffset;
  
  // NEW: Add distance dampening - reduce compensation for far hotspots
  // Close hotspots (distance < 5) get full compensation
  // Far hotspots get reduced compensation
  const distanceDampening = distance < 5 ? 1 : Math.max(0.1, 1 / (distance / 5));
  
  // More aggressive compensation for forward/left movement when zooming out
  zoomOffsetX = -zoomCompensation * 2 * distanceDampening; // Move left to counteract rightward shift
  zoomOffsetY = -zoomCompensation * 3.5 * distanceDampening; // Move forward to counteract backward shift
}

      const hotspotStyle = {
        '--scale-factor': scaleFactor,
        '--oval-factor': ovalFactor,
        '--perspective-rotation': `${perspectiveRotation}deg`,
        '--zoom-offset-x': `${zoomOffsetX * 100}%`,
        '--zoom-offset-y': `${zoomOffsetY * 100}%`,
      } as React.CSSProperties;

      rootRef.current.render(
        <HotspotComponent
          visible={visible}
          data={data}
          onNavigate={onNavigate}
          style={hotspotStyle}
          hasPOIs={hasPOIs}
        />
      );
    }
  }, [data, visible, onNavigate, currentViewParams]);

  return null;
}
