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
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [showButtons, setShowButtons] = useState<boolean>(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const uniqueFloors = [...new Set(scenes.map(s => s.floor))].sort(
      (a, b) => a - b
    );
    setFloors(uniqueFloors);
  }, [scenes]);

  useEffect(() => {
    if (hoverTimeout) clearTimeout(hoverTimeout);

    if (isHovered) {
      const timeout = setTimeout(() => setShowButtons(true), 150);
      setHoverTimeout(timeout);
    } else {
      setShowButtons(false);
    }

    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [isHovered]);

  const handleFloorClick = useCallback(
    (floor: number) => {
      // Instantly close the selector for better UX
      setIsHovered(false);
      setShowButtons(false);
      if (hoverTimeout) clearTimeout(hoverTimeout);

      const floorScenes = scenes.filter(s => s.floor === floor);
      if (!floorScenes.length) return;

      if (!currentScene) {
        onFloorChange(floorScenes[0].id);
        return;
      }

      let closest = floorScenes[0];
      let minDist = Infinity;

      floorScenes.forEach(scene => {
        const dx = scene.position.x - currentScene.position.x;
        const dy = scene.position.y - currentScene.position.y;
        const dz = scene.position.z - currentScene.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < minDist) {
          minDist = dist;
          closest = scene;
        }
      });

      onFloorChange(closest.id);
    },
    [scenes, currentScene, onFloorChange, hoverTimeout]
  );

  const getFloorLabel = (floor: number): string => {
    if (floor === 0) return 'Ground Floor';
    if (floor > 0) return `Level ${floor}`;
    return `Basement ${Math.abs(floor)}`;
  };

  const getSceneCount = (floor: number): number => {
    return scenes.filter(s => s.floor === floor).length;
  };

  return (
    <div
      className={`${styles.container} ${isHovered ? styles.hovered : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3>
        {isHovered ? (
          <>
            <div className={styles.icon}>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V7'
                  stroke='white'
                  strokeWidth='2'
                  fill='none'
                />
                <path
                  d='M21 7L12 2L3 7'
                  stroke='white'
                  strokeWidth='2'
                  fill='none'
                />
                <path
                  d='M9 21V12H15V21'
                  stroke='white'
                  strokeWidth='2'
                  fill='none'
                />
              </svg>
            </div>
            Select a Floor
          </>
        ) : (
          <>
            <div className={styles.icon}>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V7'
                  stroke='white'
                  strokeWidth='2'
                  fill='none'
                />
                <path
                  d='M21 7L12 2L3 7'
                  stroke='white'
                  strokeWidth='2'
                  fill='none'
                />
                <path
                  d='M9 21V12H15V21'
                  stroke='white'
                  strokeWidth='2'
                  fill='none'
                />
              </svg>
            </div>
            Floor:{' '}
            <span className={styles.currentFloorName}>
              {currentScene ? getFloorLabel(currentScene.floor) : 'None'}
              <span className={styles.dropdownIcon} />
            </span>
          </>
        )}
      </h3>
      <div className={`${styles.buttons} ${showButtons ? styles.visible : ''}`}>
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