// Wrapper for Marzipano to handle initialization and scene management
import { SceneData } from '@/types/scenes';

interface ViewerOptions {
  mouseViewMode?: string;
  stage?: {
    progressive?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

export class MarzipanoWrapper {
  private container: HTMLElement;
  private options: ViewerOptions;
  private viewer: any | null;
  private scenes: Record<string, any>;

  constructor(container: HTMLElement, options: ViewerOptions = {}) {
    this.container = container;
    this.options = options;
    this.viewer = null;
    this.scenes = {};
  }

  async initialize(): Promise<any> {
    if (typeof window === 'undefined' || !(window as any).Marzipano) {
      throw new Error('Marzipano library not available');
    }

    const viewerOpts = {
      controls: {
        mouseViewMode: this.options.mouseViewMode || 'drag',
      },
      stage: {
        progressive: true,
        ...this.options.stage,
      },
    };

    this.viewer = new (window as any).Marzipano.Viewer(this.container, viewerOpts);
    return this.viewer;
  }

  async createScene(sceneData: SceneData): Promise<any> {
    const Marzipano = (window as any).Marzipano;

    // Create source
    const source = Marzipano.ImageUrlSource.fromString(`/images/${sceneData.id}-pano.jpg`);

    // Create geometry
    const geometry = new Marzipano.EquirectGeometry(
      sceneData.levels || [{ width: 1024 }, { width: 2048 }, { width: 4096 }]
    );

    // Create view
    const limiter = Marzipano.RectilinearView.limit.traditional(
      sceneData.faceSize || 2048,
      (100 * Math.PI) / 180
    );
    const view = new Marzipano.RectilinearView(
      sceneData.initialViewParameters || { yaw: 0, pitch: 0, fov: 90 },
      limiter
    );

    // Create scene
    const scene = this.viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true,
    });

    return scene;
  }

  switchToScene(scene: any): void {
    if (scene && scene.switchTo) {
      scene.switchTo();
    }
  }

  destroy(): void {
    if (this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
  }
}
