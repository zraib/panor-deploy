'use client';

import React, { useState, ReactElement } from 'react';
import Link from 'next/link';
import styles from './ControlPanel.module.css';
import { SceneData } from '@/types/scenes';

interface ControlButtonProps {
  id: string;
  icon: ReactElement;
  expandedPanel: string | null;
  onToggle: (panelId: string) => void;
  onMouseEnter: (panelId: string) => void;
  onMouseLeave: () => void;
  children: ReactElement;
  className?: string;
  style?: React.CSSProperties;
}

function ControlButton({
  id,
  icon,
  expandedPanel,
  onToggle,
  onMouseEnter,
  onMouseLeave,
  children,
  className = styles.iconButton,
  style,
}: ControlButtonProps): ReactElement {
  return (
    <div
      className={styles.controlItem}
      onMouseEnter={() => onMouseEnter(id)}
      onMouseLeave={onMouseLeave}
    >
      <button className={className} style={style} onClick={() => onToggle(id)}>
        {icon}
      </button>
      {expandedPanel === id && (
        <div
          onMouseLeave={onMouseLeave}
          className={styles.expandedPanelContainer}
        >
          {children}
        </div>
      )}
    </div>
  );
}

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
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [floors, setFloors] = useState<number[]>([]);

  // Floor Selector logic
  React.useEffect(() => {
    if (scenes.length > 0) {
      const uniqueFloors = [...new Set(scenes.map(s => s.floor))].sort(
        (a, b) => a - b
      );
      setFloors(uniqueFloors);
    }
  }, [scenes]);

  const handlePanelToggle = (panelId: string) => {
    setExpandedPanel(expandedPanel === panelId ? null : panelId);
  };

  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (panelId: string) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setExpandedPanel(panelId);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setExpandedPanel(null);
    }, 200); // 200ms delay
    setHoverTimeout(timeout);
  };

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
    setExpandedPanel(null); // Close panel after selection
  };

  const getPerformanceLevel = () => {
    if (!performanceStats) return { level: 'unknown', color: '#666' };
    const loadRatio = performanceStats.loadedScenes / totalScenes;
    if (loadRatio < 0.05) return { level: 'excellent', color: '#4CAF50' };
    if (loadRatio < 0.1) return { level: 'good', color: '#8BC34A' };
    if (loadRatio < 0.2) return { level: 'fair', color: '#FF9800' };
    return { level: 'poor', color: '#F44336' };
  };

  const performance = getPerformanceLevel();

  return (
    <div className={styles.controlPanel}>
      {/* Upload Files */}
      <ControlButton
        id='upload'
        expandedPanel={expandedPanel}
        onToggle={handlePanelToggle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        icon={
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z'
              stroke='white'
              strokeWidth='2'
              fill='none'
            />
            <path d='M14 2V8H20' stroke='white' strokeWidth='2' fill='none' />
            <path
              d='M12 18V12'
              stroke='white'
              strokeWidth='2'
              strokeLinecap='round'
            />
            <path
              d='M9 15L12 12L15 15'
              stroke='white'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        }
      >
        <div className={styles.expandedPanel}>
          <div
            className={styles.header}
            onClick={() => handlePanelToggle('upload')}
          >
            <div className={styles.icon}>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z'
                  stroke='white'
                  strokeWidth='2'
                  fill='none'
                />
                <path
                  d='M14 2V8H20'
                  stroke='white'
                  strokeWidth='2'
                  fill='none'
                />
                <path
                  d='M12 18V12'
                  stroke='white'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
                <path
                  d='M9 15L12 12L15 15'
                  stroke='white'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </div>
            <span className={styles.text}>Upload Files</span>
          </div>
          <div className={styles.content}>
            <p className={styles.description}>
              Upload panorama images and CSV configuration files to create new
              tours.
            </p>
            <Link
              href='/upload'
              className={styles.actionButton}
              onClick={() => setExpandedPanel(null)}
            >
              Go to Upload Page
            </Link>
          </div>
        </div>
      </ControlButton>

      {/* Floor Selector */}
      {scenes.length > 0 && (
        <ControlButton
          id='floors'
          expandedPanel={expandedPanel}
          onToggle={handlePanelToggle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          icon={
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M4 20H10V14H16V8H20'
                stroke='white'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          }
        >
          <div className={styles.expandedPanel}>
            <div
              className={styles.header}
              onClick={() => handlePanelToggle('floors')}
            >
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
              <span className={styles.text}>
                Floor:{' '}
                {currentScene ? getFloorLabel(currentScene.floor) : 'None'}
              </span>
            </div>
            <div className={styles.content}>
              <div className={styles.floorButtons}>
                {floors.map(floor => (
                  <button
                    key={floor}
                    className={`${styles.floorButton} ${currentScene?.floor === floor ? styles.active : ''}`}
                    onClick={() => handleFloorClick(floor)}
                  >
                    {getFloorLabel(floor)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ControlButton>
      )}

      {/* Performance Monitor */}
      {performanceStats && (
        <ControlButton
          id='performance'
          expandedPanel={expandedPanel}
          onToggle={handlePanelToggle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          icon={
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M3 12H6L9 3L15 21L18 12H21'
                stroke='white'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          }
        >
          <div className={styles.expandedPanel}>
            <div
              className={styles.header}
              onClick={() => handlePanelToggle('performance')}
            >
              <div className={styles.icon}>
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M3 3V21H21'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M9 9L12 6L16 10L20 6'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>
              <span className={styles.text}>Performance</span>
            </div>
            <div className={styles.content}>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <label>Loaded Scenes</label>
                  <span>
                    {performanceStats.loadedScenes} / {totalScenes}
                  </span>
                  <div className={styles.bar}>
                    <div
                      className={styles.fill}
                      style={{
                        width: `${(performanceStats.loadedScenes / totalScenes) * 100}%`,
                        backgroundColor: performance.color,
                      }}
                    />
                  </div>
                </div>
                <div className={styles.stat}>
                  <label>Memory Usage</label>
                  <span>{performanceStats.memoryUsage}</span>
                </div>
                <div className={styles.stat}>
                  <label>Avg Load Time</label>
                  <span>{performanceStats.avgLoadTime}ms</span>
                </div>
              </div>
              {onOptimize && (
                <button
                  className={styles.optimizeButton}
                  onClick={() => {
                    onOptimize && onOptimize();
                    setExpandedPanel(null);
                  }}
                >
                  Optimize Performance
                </button>
              )}
            </div>
          </div>
        </ControlButton>
      )}
    </div>
  );
}
