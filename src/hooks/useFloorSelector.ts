'use client';

import { useState, useEffect } from 'react';
import { SceneData } from '../types/scenes';

interface UseFloorSelectorProps {
  scenes: SceneData[];
  currentScene: SceneData | null | undefined;
  onFloorChange: (sceneId: string) => void;
  onPanelClose: () => void;
}

export function useFloorSelector({
  scenes,
  currentScene,
  onFloorChange,
  onPanelClose,
}: UseFloorSelectorProps) {
  const [floors, setFloors] = useState<number[]>([]);

  // Calculate unique floors from scenes
  useEffect(() => {
    if (scenes.length > 0) {
      const uniqueFloors = [...new Set(scenes.map(s => s.floor))].sort(
        (a, b) => a - b
      );
      setFloors(uniqueFloors);
    }
  }, [scenes]);

  const getFloorLabel = (floor: number): string => {
    if (floor === 0) return 'Ground Floor';
    if (floor > 0) return `Level ${floor}`;
    return `Basement ${Math.abs(floor)}`;
  };

  const handleFloorClick = (floor: number) => {
    if (!onFloorChange) return;

    const floorScenes = scenes.filter(s => s.floor === floor);
    if (!floorScenes.length) return;

    if (!currentScene) {
      onFloorChange(floorScenes[0].id);
      onPanelClose();
      return;
    }

    // Find the closest scene on the selected floor
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
    onPanelClose(); // Close panel after selection
  };

  return {
    floors,
    getFloorLabel,
    handleFloorClick,
  };
}