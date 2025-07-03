'use client';

import { ReactElement } from 'react';
import styles from './SceneInfo.module.css';
import { SceneData } from '@/types/scenes';

interface SceneInfoProps {
  scene: SceneData | null;
  connections: number;
  direction: number;
  rotationAngle: number;
  onRotationChange: (angle: number) => void;
  currentYaw?: number; // Raw yaw from viewer
}

export default function SceneInfo({
  scene,
  connections,
  direction,
  rotationAngle,
  onRotationChange,
  currentYaw = 0,
}: SceneInfoProps): ReactElement | null {
  if (!scene) return null;

  return (
    <div className={styles.container}>
      <h3>Current Location</h3>
      <p>
        <span className={styles.label}>Scene:</span>
        <span>{parseInt(scene.id, 10)}</span>
      </p>
      <p>
        <span className={styles.label}>Connections:</span>
        <span>{connections}</span>
      </p>
    </div>
  );
}
