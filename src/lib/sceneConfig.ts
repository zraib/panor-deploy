// Scene loading configuration

interface ResolutionLevel {
  width: number;
}

interface SceneConfig {
  // Maximum number of scenes to keep in memory
  maxLoadedScenes: number;

  // Number of adjacent scenes to preload
  preloadCount: number;

  // Delay before preloading adjacent scenes (ms)
  preloadDelay: number;

  // Image resolution levels
  resolutionLevels: ResolutionLevel[];

  // Maximum resolution for view limiter
  maxViewResolution: number;

  // Field of view limit
  maxFov: number;
}

interface MemoryUsage {
  used: number;
  total: number;
  limit: number;
}

export const SCENE_CONFIG: SceneConfig = {
  // Maximum number of scenes to keep in memory
  maxLoadedScenes: 5,

  // Number of adjacent scenes to preload
  preloadCount: 3,

  // Delay before preloading adjacent scenes (ms)
  preloadDelay: 500,

  // Image resolution levels
  resolutionLevels: [
    { width: 512 }, // Lowest quality for quick loading
    { width: 1024 }, // Medium quality
    { width: 2048 }, // High quality
    { width: 4096 }, // Maximum quality (reduced from 8192)
  ],

  // Maximum resolution for view limiter
  maxViewResolution: 2048,

  // Field of view limit
  maxFov: 100,
};

// Memory management utilities
export function getMemoryUsage(): MemoryUsage | null {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1048576),
      total: Math.round((performance as any).memory.totalJSHeapSize / 1048576),
      limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1048576),
    };
  }
  return null;
}

export function shouldCleanupMemory(): boolean {
  const memory = getMemoryUsage();
  if (memory) {
    const usagePercent = (memory.used / memory.limit) * 100;
    return usagePercent > 75; // Cleanup if using more than 75% of memory
  }
  return false;
}
