'use client';

import React, { ReactElement } from 'react';
import styles from './ControlPanel.module.css';
import { SceneData } from '@/types/scenes';
import { ControlButton } from './ControlButton';
import { ProjectsPanel, FloorSelectorPanel, PerformanceMonitorPanel } from './panels';
import { ProjectsIcon, FloorsIcon, PerformanceIcon } from './icons';
import { usePanelState } from '../../hooks/usePanelState';

interface PerformanceStats {
  loadedScenes: number;
  memoryUsage: string;
  avgLoadTime: number;
}

interface ControlPanelProps {
  // Floor Selector props
  scenes?: SceneData[];
  currentScene?: SceneData | null;
  onFloorChange?: (sceneId: string) => void;

  // Performance Monitor props
  performanceStats?: PerformanceStats;
  totalScenes?: number;
  onOptimize?: () => void;
}

export default function ControlPanel({
  scenes = [],
  currentScene,
  onFloorChange,
  performanceStats,
  totalScenes = 0,
  onOptimize,
}: ControlPanelProps): ReactElement {
  const {
    expandedPanel,
    handlePanelToggle,
    handleMouseEnter,
    handleMouseLeave,
    closePanels,
  } = usePanelState();

  return (
    <div className={styles.controlPanel}>
      {/* Projects Panel */}
      <ControlButton
        id='projects'
        expandedPanel={expandedPanel}
        onToggle={handlePanelToggle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        icon={<ProjectsIcon />}
      >
        <ProjectsPanel onPanelClose={closePanels} />
      </ControlButton>

      {/* Floor Selector Panel */}
      {scenes.length > 0 && onFloorChange && (
        <ControlButton
          id='floors'
          expandedPanel={expandedPanel}
          onToggle={handlePanelToggle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          icon={<FloorsIcon />}
        >
          <FloorSelectorPanel
            scenes={scenes}
            currentScene={currentScene}
            onFloorChange={onFloorChange}
            onPanelClose={closePanels}
          />
        </ControlButton>
      )}

      {/* Performance Monitor Panel */}
      {performanceStats && (
        <ControlButton
          id='performance'
          expandedPanel={expandedPanel}
          onToggle={handlePanelToggle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          icon={<PerformanceIcon />}
        >
          <PerformanceMonitorPanel
            performanceStats={performanceStats}
            totalScenes={totalScenes}
            onOptimize={onOptimize}
            onPanelClose={closePanels}
          />
        </ControlButton>
      )}
    </div>
  );
}
