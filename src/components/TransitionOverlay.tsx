'use client';

import { ReactElement, useState, useEffect } from 'react';
import styles from './TransitionOverlay.module.css';

interface TransitionOverlayProps {
  active: boolean;
}

export default function TransitionOverlay({ active }: TransitionOverlayProps): ReactElement {
  const [phase, setPhase] = useState<'idle' | 'zoom-in' | 'zoom-out'>('idle');

  useEffect(() => {
    if (active) {
      // Start with zoom-in effect
      setPhase('zoom-in');
      
      // After zoom-in completes, switch to zoom-out
      const timer = setTimeout(() => {
        setPhase('zoom-out');
      }, 150); // Half of the transition duration

      return () => clearTimeout(timer);
    } else {
      setPhase('idle');
    }
  }, [active]);

  return (
    <div className={`${styles.overlay} ${active ? styles.active : ''}`}>
      <div className={`${styles.zoomEffect} ${styles[phase]}`} />
    </div>
  );
}
