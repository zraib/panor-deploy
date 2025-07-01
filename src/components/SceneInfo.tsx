'use client';

import { ReactElement } from 'react';
import styles from './SceneInfo.module.css';
import { SceneData } from '@/types/scenes';

interface SceneInfoProps {
  scene: SceneData | null;
  connections: number;
  direction: number;
}

export default function SceneInfo({ scene, connections, direction }: SceneInfoProps): ReactElement | null {
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
        <span className={styles.label}>Direction:</span>
        <span>{direction.toFixed(2)}°</span>
      </p>
    </div>
  );
}
