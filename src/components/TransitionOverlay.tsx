'use client';

import { ReactElement } from 'react';
import styles from './TransitionOverlay.module.css';

interface TransitionOverlayProps {
  active: boolean;
}

export default function TransitionOverlay({ active }: TransitionOverlayProps): ReactElement {
  return <div className={`${styles.overlay} ${active ? styles.active : ''}`} />;
}
