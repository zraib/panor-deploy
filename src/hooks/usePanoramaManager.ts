import { useCallback, useEffect } from 'react';
import { usePanoramaViewer } from './usePanoramaViewer';
import { useSceneManager } from './useSceneManager';
import { useHotspotManager } from './useHotspotManager';
import { usePerformanceManager } from './usePerformanceManager';
import { useViewerEvents } from './useViewerEvents';
import { checkWebGLSupport, getWebGLDiagnostics } from '@/utils/panoramaUtils';
import { ConfigData } from '@/types/scenes';

interface UsePanoramaManagerProps {
  projectId?: string;
  initialSceneId?: string;
  closePanels?: (() => void);
}

export function usePanoramaManager({ projectId, initialSceneId, closePanels }: UsePanoramaManagerProps) {
  const { state, refs, actions, router } = usePanoramaViewer();
  
  const { clearHotspotsForScene, createHotspotsForScene, toggleHotspots } = useHotspotManager({
    refs,
    actions,
    hotspotsVisible: state.hotspotsVisible,
  });

  const {
    calculateSceneDistance,
    updatePerformanceStats,
    loadScene,
    switchScene,
  } = useSceneManager({
    refs,
    actions,
    projectId,
    currentScene: state.currentScene,
    currentViewParams: state.currentViewParams,
  });

  const { preloadAdjacentScenes, optimizePerformance } = usePerformanceManager({
    refs,
    actions,
    projectId,
    currentScene: state.currentScene,
    calculateSceneDistance,
    loadScene,
    clearHotspotsForScene,
    updatePerformanceStats,
  });

  // Consolidated switchScene function
  const switchSceneWithHooks = useCallback(
    async (
      sceneId: string,
      isInitial: boolean = false,
      preserveViewDirection: boolean = false
    ): Promise<void> => {
      await switchScene(
        sceneId,
        isInitial,
        preserveViewDirection,
        clearHotspotsForScene,
        createHotspotsForScene,
        preloadAdjacentScenes
      );
    },
    [switchScene, clearHotspotsForScene, createHotspotsForScene, preloadAdjacentScenes]
  );

  // Initialize viewer function
  const initializeViewer = useCallback(async () => {
    try {
      if (!checkWebGLSupport()) {
        const diagnostics = getWebGLDiagnostics();
        console.error('WebGL Diagnostics:', diagnostics);
        throw new Error(
          `WebGL is not supported or disabled in your browser. Diagnostics: ${diagnostics}`
        );
      }

      const configUrl = projectId
        ? `/api/projects/${encodeURIComponent(projectId)}/config`
        : '/config.json';
      const response = await fetch(configUrl);
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }

      const configData = (await response.json()) as ConfigData;
      actions.setConfig(configData);

      const Marzipano = (window as any).Marzipano;
      if (!Marzipano) {
        throw new Error('Marzipano library not loaded');
      }

      const viewerOpts = {
        controls: { mouseViewMode: 'drag' },
        stage: { progressive: true },
      };

      if (!refs.panoRef.current) {
        throw new Error('Panorama container not found');
      }

      const viewer = new Marzipano.Viewer(refs.panoRef.current, viewerOpts);
      refs.viewerRef.current = viewer;

      // Setup view parameter tracking for preserving view direction
      setupViewTracking(viewer);

      configData.scenes.forEach(sceneData => {
        refs.scenesRef.current[sceneData.id] = {
          data: sceneData,
          scene: null,
          hotspotElements: [],
          loaded: false,
        };
      });

      if (configData.scenes.length > 0) {
        let targetScene = configData.scenes[0];
        if (initialSceneId) {
          const foundScene = configData.scenes.find(s => s.id === initialSceneId);
          if (foundScene) targetScene = foundScene;
        }

        await loadScene(targetScene.id, 'high');
        await switchSceneWithHooks(targetScene.id, true, false);
      }

      actions.setIsLoading(false);
      setTimeout(() => actions.setShowTapHint(true), 1000);
      setTimeout(() => actions.setShowTapHint(false), 4000);
    } catch (err) {
      console.error('Initialization error:', err);
      actions.setError(err instanceof Error ? err.message : String(err));
      actions.setIsLoading(false);
    }
  }, [loadScene, switchSceneWithHooks, actions, refs, initialSceneId, projectId]);

  // Navigate to scene function
  const navigateToScene = useCallback(
    async (sceneId: string, sourceHotspotYaw?: number): Promise<void> => {
      if (sceneId === state.currentScene) return;

      const sceneInfo = refs.scenesRef.current[sceneId];
      if (sceneInfo) {
        const img = new Image();
        const imagePath = projectId
          ? `/${projectId}/images/${sceneId}-pano.jpg`
          : `/images/${sceneId}-pano.jpg`;
        img.src = imagePath;

        await new Promise<void>(resolve => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });

        if (!sceneInfo.loaded) {
          await loadScene(sceneId, 'high');
        }
      }

      if (projectId) {
        const newUrl = `/${projectId}/${sceneId}`;
        window.history.replaceState(null, '', newUrl);
      }

      await switchSceneWithHooks(sceneId, false, true);
    },
    [switchSceneWithHooks, state.currentScene, loadScene, projectId, refs.scenesRef]
  );

  const {
    handlePanoClick,
    handleMarzipanoLoad,
    handleRetry,
    setupViewTracking,
  } = useViewerEvents({
    refs,
    actions,
    isLoading: state.isLoading,
    currentScene: state.currentScene,
    toggleHotspots,
    initializeViewer,
    closePanels,
  });

  return {
    state,
    refs,
    actions,
    navigateToScene,
    optimizePerformance,
    handlePanoClick,
    handleMarzipanoLoad,
    handleRetry,
    toggleHotspots,
  };
}