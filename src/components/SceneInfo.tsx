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
        <span>{scene.name}</span>
      </p>
      <p>
        <span className={styles.label}>Floor:</span>
        <span>Level {scene.floor}</span>
      </p>
      <p>
        <span className={styles.label}>Position:</span>
        <span>
          ({scene.position.x.toFixed(1)}, {scene.position.y.toFixed(1)})
        </span>
      </p>
      <p>
        <span className={styles.label}>Connections:</span>
        <span>{connections} paths</span>
      </p>
      <p>
        <span className={styles.label}>Compass Arrow:</span>
        <span>{direction.toFixed(1)}°</span>
      </p>
      <p>
        <span className={styles.label}>Minimap Pointer:</span>
        <span>
          {(
            ((currentYaw * 180) / Math.PI - (scene?.northOffset || 0) + 360) % 360
          ).toFixed(1)}°
        </span>
      </p>
      <p>
        <span className={styles.label}>Raw Yaw:</span>
        <span>{((currentYaw * 180) / Math.PI).toFixed(1)}°</span>
      </p>
      <p>
        <span className={styles.label}>North Offset:</span>
        <span>{(scene?.northOffset || 0).toFixed(1)}°</span>
      </p>
      <div className={styles.rotationControl}>
        <span className={styles.label}>Map Rotation:</span>
        <input
          type='range'
          min='-180'
          max='180'
          value={rotationAngle}
          onChange={e => onRotationChange(parseInt(e.target.value, 10))}
          className={styles.slider}
        />
        <span>{rotationAngle}°</span>
      </div>
    </div>
  );
}
