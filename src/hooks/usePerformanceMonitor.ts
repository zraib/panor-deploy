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
    
    // Adjust thresholds based on total scene count for more realistic performance indicators
    if (totalScenes > 50) {
      // For large datasets (50+ scenes), use more lenient thresholds
      if (loadRatio < 0.15) return { level: 'excellent', color: '#4CAF50' };
      if (loadRatio < 0.35) return { level: 'good', color: '#8BC34A' };
      if (loadRatio < 0.60) return { level: 'fair', color: '#FF9800' };
      return { level: 'poor', color: '#F44336' };
    } else {
      // For smaller datasets (< 50 scenes), use stricter thresholds
      if (loadRatio < 0.10) return { level: 'excellent', color: '#4CAF50' };
      if (loadRatio < 0.25) return { level: 'good', color: '#8BC34A' };
      if (loadRatio < 0.50) return { level: 'fair', color: '#FF9800' };
      return { level: 'poor', color: '#F44336' };
    }
  };

  return {
    getPerformanceLevel,
  };
}