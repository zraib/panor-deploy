'use client';

interface PerformanceStats {
  loadedScenes: number;
  memoryUsage: string;
  avgLoadTime: number;
}

interface PerformanceLevel {
  level: string;
  color: string;
}

export function usePerformanceMonitor() {
  const getPerformanceLevel = (
    performanceStats: PerformanceStats,
    totalScenes: number
  ): PerformanceLevel => {
    if (!performanceStats) return { level: 'unknown', color: '#666' };
    
    const loadRatio = performanceStats.loadedScenes / totalScenes;
    
    if (loadRatio < 0.05) return { level: 'excellent', color: '#4CAF50' };
    if (loadRatio < 0.1) return { level: 'good', color: '#8BC34A' };
    if (loadRatio < 0.2) return { level: 'fair', color: '#FF9800' };
    return { level: 'poor', color: '#F44336' };
  };

  return {
    getPerformanceLevel,
  };
}