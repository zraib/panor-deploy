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
  }

  interface SceneOptions {
    source: any;
    geometry: any;
    view: any;
    pinFirstLevel?: boolean;
  }

  interface Scene {
    switchTo(): void;
  }

  interface ImageUrlSource {
    new (_options: any): ImageUrlSource;
    url(): string;
  }

  namespace ImageUrlSource {
    function fromString(_url: string): ImageUrlSource;
  }

  interface EquirectGeometry {
    new (_levels: Array<{ width: number }>): EquirectGeometry;
  }

  interface RectilinearView {
    new (_params: { yaw: number; pitch: number; fov: number }, _limiter?: any): RectilinearView;
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
