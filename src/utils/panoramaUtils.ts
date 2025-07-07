import { Position, PanoPosition } from '@/types/scenes';

// Check WebGL support with detailed diagnostics
export function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined' || !document) {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext);
    if (!gl) {
      console.warn('WebGL not supported: No WebGL context available');
      return false;
    }
    
    // Check if WebGL is actually working
    const version = gl.getParameter(gl.VERSION);
    if (!version) {
      console.warn('WebGL not working: Cannot get version');
      return false;
    }
    
    // Test basic WebGL functionality
    try {
      const buffer = gl.createBuffer();
      if (!buffer) {
        console.warn('WebGL not working: Cannot create buffer');
        return false;
      }
      gl.deleteBuffer(buffer);
    } catch (e) {
      console.warn('WebGL not working: Buffer test failed', e);
      return false;
    }
    
    console.log('WebGL support confirmed:', version);
    return true;
  } catch (e) {
    console.warn('WebGL check failed:', e);
    return false;
  }
}

// Get WebGL diagnostics information
export function getWebGLDiagnostics(): string {
  if (typeof window === 'undefined' || !document) {
    return 'Not in browser environment';
  }
  
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext);
    
    if (!gl) {
      return 'WebGL not available';
    }
    
    const info = {
      version: gl.getParameter(gl.VERSION),
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
    };
    
    return JSON.stringify(info, null, 2);
  } catch (e) {
    return `WebGL diagnostics failed: ${e}`;
  }
}

// Create ripple effect
export function createRipple(
  x: number,
  y: number,
  container?: HTMLElement | null
): void {
  const ripple = document.createElement('div');
  ripple.classList.add('touch-ripple');
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';

  const parent = container || document.body;
  parent.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
}

// Calculate distance between two positions
export function calculateDistance(
  pos1: Position | PanoPosition,
  pos2: Position | PanoPosition
): number {
  return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
}

// Format floor label
export function formatFloorLabel(floor: number): string {
  if (floor === 0) return 'Ground';
  if (floor > 0) return `Level ${floor}`;
  return `Basement ${Math.abs(floor)}`;
}