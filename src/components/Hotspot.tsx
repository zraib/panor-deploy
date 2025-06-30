'use client';

import { useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import styles from './Hotspot.module.css';
import { LinkHotspot } from '@/types/scenes';

interface HotspotProps {
  element: HTMLElement;
  data: LinkHotspot;
  visible: boolean;
  onNavigate: (_sceneId: string, _sourceHotspotYaw: number) => void;
}

export default function Hotspot({ element, data, visible, onNavigate }: HotspotProps) {
  const rootRef = useRef<Root | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!element) return;

    // Create root only once
    if (!rootRef.current && !isInitializedRef.current) {
      rootRef.current = createRoot(element);
      isInitializedRef.current = true;
    }

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onNavigate(data.target, data.yaw);
    };

    // Render hotspot content using createRoot
    if (rootRef.current) {
      rootRef.current.render(
        <div className={`${styles.hotspot} ${visible ? styles.visible : ''}`} onClick={handleClick}>
          <div className={styles.arrow}></div>
          <div className={styles.distance}>{data.distance}m</div>
        </div>
      );
    }
  }, [element, data, visible, onNavigate]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []);

  return null;
}
