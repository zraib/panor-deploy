'use client';

import React, { ReactElement, useEffect } from 'react';
import styles from './ControlPanel.module.css';
import { SceneData } from '@/types/scenes';
import { ControlButton } from './ControlButton';
import { ProjectsPanel, FloorSelectorPanel, PerformanceMonitorPanel, POIManagementPanelWithModal } from './panels';
import { ProjectsIcon, FloorsIcon, PerformanceIcon, POIIcon } from './icons';
import { POIData } from '@/types/poi';
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
  
  // POI Management props
  projectId?: string;
  currentPanoramaId?: string | null;
  onPOIEdit?: (poi: POIData) => void;
  onPOIDelete?: (poiId: string | POIData) => void;
  onPOINavigate?: (panoramaId: string) => void;
  
  // Panel control props
  onClosePanels?: (closePanelsFunc: () => void) => void;
}

export default function ControlPanel({
  scenes = [],
  currentScene,
  onFloorChange,
  performanceStats,
  totalScenes = 0,
  onOptimize,
  projectId,
  currentPanoramaId,
  onPOIEdit,
  onPOIDelete,
  onPOINavigate,
  onClosePanels,
}: ControlPanelProps): ReactElement {
  const {
    expandedPanel,
    handlePanelToggle,
    handleMouseEnter,
    handleMouseLeave,
    closePanels,
  } = usePanelState();

  // Provide closePanels function to parent component
  useEffect(() => {
    if (onClosePanels) {
      onClosePanels(closePanels);
    }
  }, [onClosePanels, closePanels]);

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

      {/* POI Management Panel */}
      {projectId && currentPanoramaId && (
        <ControlButton
          id='poi'
          expandedPanel={expandedPanel}
          onToggle={handlePanelToggle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          icon={<POIIcon />}
        >
          <POIManagementPanelWithModal
            projectId={projectId}
            currentPanoramaId={currentPanoramaId}
            onPanelClose={closePanels}
            onPOIEdit={onPOIEdit}
            onPOIDelete={onPOIDelete}
            onPOINavigate={onPOINavigate}
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
