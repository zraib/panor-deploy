'use client';

import { useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import styles from './Hotspot.module.css';
import { LinkHotspot } from '@/types/scenes';

interface HotspotProps {
  element: HTMLElement;
  data: LinkHotspot;
  visible: boolean;
  onNavigate: (_sceneId: string, _sourceHotspotYaw: number) => void;
  hasPOIs?: boolean;
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

      const hotspotStyle = {
        '--scale-factor': scaleFactor,
        '--oval-factor': ovalFactor,
        '--perspective-rotation': `${perspectiveRotation}deg`,
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
  }, [data, visible, onNavigate]);

  return null;
}
