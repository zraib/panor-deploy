import { Position, PanoPosition } from '@/types/scenes';

// Check WebGL support
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
      return false;
    }
    // Check if WebGL is actually working
    if (gl.getParameter(gl.VERSION)) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
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
