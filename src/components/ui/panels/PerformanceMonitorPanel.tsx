'use client';

import React from 'react';
import styles from '../ControlPanel.module.css';
import { usePerformanceMonitor } from '../../../hooks/usePerformanceMonitor';

interface PerformanceStats {
  loadedScenes: number;
  memoryUsage: string;
  avgLoadTime: number;
}

interface PerformanceMonitorPanelProps {
  performanceStats: PerformanceStats;
  totalScenes: number;
  onOptimize?: () => void;
  onPanelClose: () => void;
}

export function PerformanceMonitorPanel({
  performanceStats,
  totalScenes,
  onOptimize,
  onPanelClose,
}: PerformanceMonitorPanelProps) {
  const { getPerformanceLevel } = usePerformanceMonitor();
  const performance = getPerformanceLevel(performanceStats, totalScenes);

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
              d='M3 3V21H21'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path
              d='M9 9L12 6L16 10L20 6'
              stroke='currentColor'
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
              onOptimize();
              onPanelClose();
            }}
          >
            Optimize Performance
          </button>
        )}
      </div>
    </div>
  );
}