'use client';

import { useState, useEffect, useCallback, ReactElement } from 'react';
import styles from './FloorSelector.module.css';
import { SceneData } from '@/types/scenes';

interface FloorSelectorProps {
  scenes: SceneData[];
  currentScene: SceneData | null;
  onFloorChange: (_sceneId: string) => void;
}

export default function FloorSelector({
  scenes,
  currentScene,
  onFloorChange,
}: FloorSelectorProps): ReactElement {
  const [floors, setFloors] = useState<number[]>([]);

  useEffect(() => {
    // Get unique floors
    const floorValues = scenes.map(s => s.floor);
    const uniqueFloors = floorValues
      .filter((value, index, self) => {
        return self.indexOf(value) === index;
      })
      .sort((a, b) => a - b);
    setFloors(uniqueFloors);
  }, [scenes]);

  const handleFloorClick = useCallback(
    (floor: number) => {
      const floorScenes = scenes.filter(s => s.floor === floor);
      if (floorScenes.length === 0) return;

      if (!currentScene) {
        onFloorChange(floorScenes[0].id);
        return;
      }

      // Find closest scene on selected floor to current position
      let closestScene = floorScenes[0];
      let minDistance = Infinity;

      floorScenes.forEach(scene => {
        const dx = scene.position.x - currentScene.position.x;
        const dy = scene.position.y - currentScene.position.y;
        const dz = scene.position.z - currentScene.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < minDistance) {
          minDistance = distance;
          closestScene = scene;
        }
      });

      onFloorChange(closestScene.id);
    },
    [scenes, currentScene, onFloorChange]
  );

  const getFloorLabel = (floor: number): string => {
    if (floor === 0) return 'Ground';
    if (floor > 0) return `Level ${floor}`;
    return `Basement ${Math.abs(floor)}`;
  };

  const getSceneCount = (floor: number): number => {
    return scenes.filter(s => s.floor === floor).length;
  };

  return (
    <div className={styles.container}>
      <h3>FLOOR SELECTION</h3>
      <div className={styles.buttons}>
        {floors.map(floor => (
          <button
            key={floor}
            className={`${styles.button} ${currentScene?.floor === floor ? styles.active : ''}`}
            onClick={() => handleFloorClick(floor)}
            title={`${getSceneCount(floor)} panoramas`}
          >
            {getFloorLabel(floor)}
          </button>
        ))}
      </div>
    </div>
  );
}
