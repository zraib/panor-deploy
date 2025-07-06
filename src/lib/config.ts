// Configuration utilities for panorama viewer

import type { EnvironmentConfig } from '../types/config';

/**
 * Get environment configuration with defaults
 */
export function getEnvironmentConfig(): Partial<EnvironmentConfig> {
  return {
    PANORAMA_CONFIG_MODE: (process.env.PANORAMA_CONFIG_MODE as any) || 'standard',
    PANORAMA_YAW_OFFSET: parseFloat(process.env.PANORAMA_YAW_OFFSET || '0'),
    PANORAMA_PITCH_OFFSET: parseFloat(process.env.PANORAMA_PITCH_OFFSET || '0'),
    PANORAMA_CAMERA_OFFSET: parseFloat(process.env.PANORAMA_CAMERA_OFFSET || '1.2'),
    PANORAMA_MAX_DISTANCE: parseFloat(process.env.PANORAMA_MAX_DISTANCE || '10.0'),
    PANORAMA_MAX_CONNECTIONS: parseInt(process.env.PANORAMA_MAX_CONNECTIONS || '6'),
    NEXT_PUBLIC_DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE === 'true',
    NEXT_PUBLIC_SHOW_DEBUG_INFO: process.env.NEXT_PUBLIC_SHOW_DEBUG_INFO === 'true',
  };
}



/**
 * Validate panorama configuration
 */
export function validateConfig(config: any): boolean {
  if (!config || typeof config !== 'object') {
    console.error('Invalid config: not an object');
    return false;
  }

  if (!Array.isArray(config.scenes)) {
    console.error('Invalid config: scenes is not an array');
    return false;
  }

  if (config.scenes.length === 0) {
    console.error('Invalid config: no scenes found');
    return false;
  }

  // Validate each scene
  for (const scene of config.scenes) {
    if (!scene.id || !scene.position || !scene.orientation) {
      console.error('Invalid scene: missing required fields', scene);
      return false;
    }
  }

  return true;
}

/**
 * Get debug information for troubleshooting
 */
export function getDebugInfo() {
  const config = getEnvironmentConfig();
  
  return {
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      ...config,
    },
    performance: typeof performance !== 'undefined' ? {
      memory: (performance as any).memory,
      timing: performance.timing,
    } : null,
  };
}

/**
 * Log debug information to console
 */
export function logDebugInfo() {
  const config = getEnvironmentConfig();
  
  if (config.NEXT_PUBLIC_SHOW_DEBUG_INFO) {
    console.group('🔍 Panorama Viewer Debug Info');
    console.log('Environment Config:', config);
    console.log('Debug Info:', getDebugInfo());
    console.groupEnd();
  }
}

/**
 * Format error messages for user display
 */
export function formatErrorMessage(error: Error | string): string {
  const config = getEnvironmentConfig();
  
  if (config.NEXT_PUBLIC_DEV_MODE) {
    // Show detailed error in development
    return error instanceof Error ? error.message : error;
  } else {
    // Show user-friendly error in production
    return 'An error occurred while loading the panorama viewer. Please try refreshing the page.';
  }
}