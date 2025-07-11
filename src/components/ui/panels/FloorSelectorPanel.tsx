'use client';

import React from 'react';
import styles from '../ControlPanel.module.css';
import { SceneData } from '@/types/scenes';
import { useFloorSelector } from '../../../hooks/useFloorSelector';

interface FloorSelectorPanelProps {
  scenes: SceneData[];
  currentScene: SceneData | null | undefined;
  onFloorChange: (sceneId: string) => void;
  onPanelClose: () => void;
}

export function FloorSelectorPanel({
  scenes,
  currentScene,
  onFloorChange,
  onPanelClose,
}: FloorSelectorPanelProps) {
  const { floors, getFloorLabel, handleFloorClick } = useFloorSelector({
    scenes,
    currentScene,
    onFloorChange,
    onPanelClose,
  });

  return (
    <div className={styles.expandedPanel}>
      <div className={styles.header}>
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
              stroke='currentColor'
              strokeWidth='2'
              fill='none'
            />
            <path
              d='M21 7L12 2L3 7'
              stroke='currentColor'
              strokeWidth='2'
              fill='none'
            />
            <path
              d='M9 21V12H15V21'
              stroke='currentColor'
              strokeWidth='2'
              fill='none'
            />
          </svg>
        </div>
        <span className={styles.text}>
          Floor: {currentScene ? getFloorLabel(currentScene.floor) : 'None'}
        </span>
      </div>
      <div className={styles.content}>
        <div className={styles.floorButtons}>
          {floors.map((floor: number) => (
            <button
              key={floor}
              className={`${styles.floorButton} ${
                currentScene?.floor === floor ? styles.active : ''
              }`}
              onClick={() => handleFloorClick(floor)}
            >
              {getFloorLabel(floor)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}