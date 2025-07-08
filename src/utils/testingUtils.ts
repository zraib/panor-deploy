// Testing and debugging utilities for the panorama application

import { SceneManagerError, SceneManagerException } from '@/hooks/useSceneManager';
import { NavigationError, NavigationException } from '@/hooks/useNavigation';
import { PerformanceMetrics } from '@/hooks/usePerformanceManager';

// Mock data for testing
export const mockSceneData = {
  id: 'test-scene-1',
  name: 'Test Scene',
  position: { x: 0, y: 0, z: 0 },
  initialViewParameters: {
    yaw: 0,
    pitch: 0,
    fov: 90,
  },
  linkHotspots: [
    {
      id: 'hotspot-1',
      target: 'test-scene-2',
      yaw: 45,
      pitch: 0,
    },
  ],
  source: {
    levels: [
      { url: () => '/test-images/low-quality.jpg' },
      { url: () => '/test-images/medium-quality.jpg' },
      { url: () => '/test-images/high-quality.jpg' },
    ],
  },
};

export const mockProjectData = {
  id: 'test-project',
  name: 'Test Project',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  sceneCount: 5,
  hasConfig: true,
};

// Performance testing utilities
export class PerformanceTester {
  private startTime: number = 0;
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(label: string): void {
    this.startTime = performance.now();
    console.log(`🔍 Performance: Starting measurement for ${label}`);
  }

  endMeasurement(label: string): number {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    
    this.measurements.get(label)!.push(duration);
    console.log(`⏱️ Performance: ${label} took ${duration.toFixed(2)}ms`);
    
    return duration;
  }

  getAverageTime(label: string): number {
    const times = this.measurements.get(label);
    if (!times || times.length === 0) return 0;
    
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    console.log(`📊 Performance: Average time for ${label}: ${average.toFixed(2)}ms`);
    
    return average;
  }

  getAllMeasurements(): Record<string, { average: number; count: number; total: number }> {
    const results: Record<string, { average: number; count: number; total: number }> = {};
    
    this.measurements.forEach((times, label) => {
      const total = times.reduce((sum, time) => sum + time, 0);
      results[label] = {
        average: total / times.length,
        count: times.length,
        total,
      };
    });
    
    return results;
  }

  reset(): void {
    this.measurements.clear();
    console.log('🔄 Performance: Measurements reset');
  }
}

// Error testing utilities
export class ErrorTester {
  static testSceneManagerErrors(): void {
    console.log('🧪 Testing Scene Manager Errors...');
    
    try {
      throw new SceneManagerException(
        SceneManagerError.SCENE_NOT_FOUND,
        'Test scene not found',
        'test-scene-id'
      );
    } catch (error) {
      console.log('✅ Scene Manager Error caught:', error);
    }
    
    try {
      throw new SceneManagerException(
        SceneManagerError.VIEWER_NOT_INITIALIZED,
        'Test viewer not initialized'
      );
    } catch (error) {
      console.log('✅ Viewer Error caught:', error);
    }
  }

  static testNavigationErrors(): void {
    console.log('🧪 Testing Navigation Errors...');
    
    try {
      throw new NavigationException(
        NavigationError.INVALID_PROJECT_ID,
        'Test invalid project ID',
        'invalid-project'
      );
    } catch (error) {
      console.log('✅ Navigation Error caught:', error);
    }
  }
}

// Memory testing utilities
export class MemoryTester {
  static async getMemoryUsage(): Promise<PerformanceMetrics> {
    const memoryInfo = (performance as any).memory;
    
    return {
      memoryUsage: memoryInfo ? memoryInfo.usedJSHeapSize : 0,
      loadedScenes: 0, // This would be populated from actual state
      preloadedScenes: 0,
      avgLoadTime: 0,
      lastCleanupTime: Date.now(),
      performanceLevel: 'high',
    };
  }

  static logMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('💾 Memory Usage:', {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
      });
    } else {
      console.log('💾 Memory API not available');
    }
  }

  static async simulateMemoryPressure(): Promise<void> {
    console.log('🧪 Simulating memory pressure...');
    
    // Create large arrays to simulate memory usage
    const largeArrays: number[][] = [];
    
    for (let i = 0; i < 10; i++) {
      largeArrays.push(new Array(1000000).fill(Math.random()));
      await new Promise(resolve => setTimeout(resolve, 100));
      this.logMemoryUsage();
    }
    
    // Clean up
    largeArrays.length = 0;
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
    
    console.log('🧹 Memory pressure simulation completed');
  }
}

// Hook testing utilities
export class HookTester {
  static testHookIntegration(hooks: {
    panoramaViewer?: any;
    sceneManager?: any;
    hotspotManager?: any;
    performanceManager?: any;
    navigation?: any;
  }): void {
    console.log('🧪 Testing Hook Integration...');
    
    // Test panorama viewer hook
    if (hooks.panoramaViewer) {
      console.log('✅ Panorama Viewer Hook:', {
        hasState: !!hooks.panoramaViewer.state,
        hasRefs: !!hooks.panoramaViewer.refs,
        hasActions: !!hooks.panoramaViewer.actions,
      });
    }
    
    // Test scene manager hook
    if (hooks.sceneManager) {
      console.log('✅ Scene Manager Hook:', {
        hasCalculateDistance: typeof hooks.sceneManager.calculateSceneDistance === 'function',
        hasLoadScene: typeof hooks.sceneManager.loadScene === 'function',
        hasSwitchScene: typeof hooks.sceneManager.switchScene === 'function',
      });
    }
    
    // Test hotspot manager hook
    if (hooks.hotspotManager) {
      console.log('✅ Hotspot Manager Hook:', {
        hasClearHotspots: typeof hooks.hotspotManager.clearHotspotsForScene === 'function',
        hasCreateHotspots: typeof hooks.hotspotManager.createHotspotsForScene === 'function',
        hasToggleHotspots: typeof hooks.hotspotManager.toggleHotspots === 'function',
      });
    }
    
    // Test performance manager hook
    if (hooks.performanceManager) {
      console.log('✅ Performance Manager Hook:', {
        hasPreloadAdjacent: typeof hooks.performanceManager.preloadAdjacentScenes === 'function',
        hasOptimize: typeof hooks.performanceManager.optimizePerformance === 'function',
        hasUnloadDistant: typeof hooks.performanceManager.unloadDistantScenes === 'function',
      });
    }
    
    // Test navigation hook
    if (hooks.navigation) {
      console.log('✅ Navigation Hook:', {
        hasNavigateToProject: typeof hooks.navigation.navigateToProject === 'function',
        hasNavigateToScene: typeof hooks.navigation.navigateToScene === 'function',
        hasGetCurrentProject: typeof hooks.navigation.getCurrentProject === 'function',
      });
    }
  }
}

// Debug utilities
export class DebugUtils {
  static enableVerboseLogging(): void {
    console.log('🔊 Verbose logging enabled');
    
    // Override console methods to add timestamps
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args) => {
      originalLog(`[${new Date().toISOString()}] [LOG]`, ...args);
    };
    
    console.error = (...args) => {
      originalError(`[${new Date().toISOString()}] [ERROR]`, ...args);
    };
    
    console.warn = (...args) => {
      originalWarn(`[${new Date().toISOString()}] [WARN]`, ...args);
    };
  }

  static logSystemInfo(): void {
    console.log('🖥️ System Information:', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
  }

  static logWebGLInfo(): void {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        console.log('🎮 WebGL Information:', {
          version: (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).VERSION),
          vendor: (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).VENDOR),
          renderer: (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).RENDERER),
          shadingLanguageVersion: (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).SHADING_LANGUAGE_VERSION),
          maxTextureSize: (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_TEXTURE_SIZE),
          maxViewportDims: (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_VIEWPORT_DIMS),
        });
      } else {
        console.warn('🚫 WebGL not supported');
      }
    } catch (error) {
      console.error('❌ Error getting WebGL info:', error);
    }
  }
}

// Export singleton instances
export const performanceTester = new PerformanceTester();
export const memoryTester = new MemoryTester();

// Global debug function
if (typeof window !== 'undefined') {
  (window as any).panoramaDebug = {
    performance: performanceTester,
    memory: memoryTester,
    error: ErrorTester,
    hook: HookTester,
    debug: DebugUtils,
  };
}