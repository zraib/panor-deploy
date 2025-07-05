'use client';

import { useState } from 'react';
import styles from './PerformanceMonitor.module.css';

interface PerformanceStats {
  loadedScenes: number;
  memoryUsage: string;
  avgLoadTime: number;
}

interface PerformanceMonitorProps {
  stats: PerformanceStats;
  totalScenes: number;
  onOptimize?: () => void;
}

export default function PerformanceMonitor({ 
  stats, 
  totalScenes, 
  onOptimize 
}: PerformanceMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPerformanceLevel = () => {
    const loadRatio = stats.loadedScenes / totalScenes;
    if (loadRatio < 0.05) return { level: 'excellent', color: '#4CAF50' };
    if (loadRatio < 0.1) return { level: 'good', color: '#8BC34A' };
    if (loadRatio < 0.2) return { level: 'fair', color: '#FF9800' };
    return { level: 'poor', color: '#F44336' };
  };

  const performance = getPerformanceLevel();

  return (
    <div className={styles.monitor}>
      <button 
        className={styles.toggle}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ borderColor: performance.color }}
      >
        <span className={styles.indicator} style={{ backgroundColor: performance.color }} />
        Performance
      </button>
      
      {isExpanded && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <h3>Performance Monitor</h3>
            <span 
              className={styles.status}
              style={{ color: performance.color }}
            >
              {performance.level.toUpperCase()}
            </span>
          </div>
          
          <div className={styles.stats}>
            <div className={styles.stat}>
              <label>Loaded Scenes</label>
              <span>{stats.loadedScenes} / {totalScenes}</span>
              <div className={styles.bar}>
                <div 
                  className={styles.fill}
                  style={{ 
                    width: `${(stats.loadedScenes / totalScenes) * 100}%`,
                    backgroundColor: performance.color
                  }}
                />
              </div>
            </div>
            
            <div className={styles.stat}>
              <label>Memory Usage</label>
              <span>{stats.memoryUsage}</span>
            </div>
            
            <div className={styles.stat}>
              <label>Avg Load Time</label>
              <span>{stats.avgLoadTime}ms</span>
            </div>
          </div>
          
          {onOptimize && (
            <button className={styles.optimize} onClick={onOptimize}>
              🚀 Optimize Performance
            </button>
          )}
          
          <div className={styles.tips}>
            <h4>Performance Tips:</h4>
            <ul>
              <li>Fewer loaded scenes = better performance</li>
              <li>Navigate gradually for optimal experience</li>
              <li>Close other browser tabs if experiencing lag</li>
              {totalScenes > 100 && (
                <li>Large dataset detected - using optimized loading</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}