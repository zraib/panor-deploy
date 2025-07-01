// Type definitions for Marzipano library

declare namespace Marzipano {
  interface ViewerOptions {
    controls?: {
      mouseViewMode?: string;
    };
    stage?: {
      progressive?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  }

  interface Viewer {
    createScene(options: SceneOptions): Scene;
    destroy(): void;
    view(): RectilinearView;
    lookTo(params: { yaw: number; pitch: number; fov: number }, options?: { transitionDuration: number }): void;
    addEventListener?(event: string, callback: () => void): void;
    removeEventListener?(event: string, callback: () => void): void;
  }

  interface SceneOptions {
    source: any;
    geometry: any;
    view: any;
    pinFirstLevel?: boolean;
  }

  interface Scene {
    switchTo(options?: { transitionDuration?: number }): void;
    hotspotContainer(): HotspotContainer;
  }

  interface HotspotContainer {
    createHotspot(element: HTMLElement, coords: { yaw: number; pitch: number }): Hotspot;
    destroyHotspot(hotspot: Hotspot): void;
  }

  interface Hotspot {
    destroy(): void;
  }

  interface ImageUrlSource {
    new (_options: any): ImageUrlSource;
    url(): string;
  }

  namespace ImageUrlSource {
    function fromString(_url: string): ImageUrlSource;
  }

  class EquirectGeometry {
    constructor(_levels: Array<{ width: number }>);
  }

  class RectilinearView {
    constructor(_params: { yaw: number; pitch: number; fov: number }, _limiter?: any);
    setYaw(_yaw: number): void;
    setPitch(_pitch: number): void;
    setFov(_fov: number): void;
    yaw(): number;
    pitch(): number;
    fov(): number;
  }

  namespace RectilinearView {
    // eslint-disable-next-line no-unused-vars
    namespace limit {
      // eslint-disable-next-line no-unused-vars
      function traditional(_maxResolution: number, _maxVFov: number): any;
    }
  }
}

// eslint-disable-next-line no-unused-vars
declare interface Window {
  Marzipano: typeof Marzipano;
}
