'use client';

import { useEffect, useCallback } from 'react';
import Script from 'next/script';
import MiniMap from './MiniMap';
import LoadingScreen from '../utility/LoadingScreen';
import ControlPanel from '../ui/ControlPanel';
import Hotspot from '../hotspot/Hotspot';
import { checkWebGLSupport, getWebGLDiagnostics } from '@/utils/panoramaUtils';
import { ConfigData } from '@/types/scenes';
import { usePanoramaViewer } from '@/hooks/usePanoramaViewer';
import { useSceneManager } from '@/hooks/useSceneManager';
import { useHotspotManager } from '@/hooks/useHotspotManager';
import { usePerformanceManager } from '@/hooks/usePerformanceManager';
import { useViewerEvents } from '@/hooks/useViewerEvents';

// Using types imported from @/types/scenes.ts

// Utility to convert yaw/pitch to 2D screen coordinates
function yawPitchToScreen(
  yaw: number,
  pitch: number,
  width: number,
  height: number,
  fov: number
) {
  // Equirectangular projection: center is (width/2, height/2)
  // Yaw: 0 is center, positive is right; Pitch: 0 is center, positive is up
  // fov in radians
  const x = width / 2 + (width / fov) * yaw;
  const y = height / 2 - (height / fov) * pitch;
  return { x, y };
}

interface PanoramaViewerProps {
  projectId?: string;
  initialSceneId?: string;
}

export default function PanoramaViewer({
  projectId,
  initialSceneId,
}: PanoramaViewerProps = {}) {
  // Initialize custom hooks
  const { state, refs, actions, router } = usePanoramaViewer();
  const {
    isLoading,
    error,
    config,
    currentScene,
    hotspotsVisible,
    showTapHint,
    viewerSize,
    arrowStyle,
    currentYaw,
    rotationAngle,
    currentViewParams,
    performanceStats,
  } = state;
  const { panoRef } = refs;

  // Initialize hotspot manager
  const { clearHotspotsForScene, createHotspotsForScene, toggleHotspots } = useHotspotManager({
    refs,
    actions,
    hotspotsVisible,
  });

  // Initialize scene manager
  const {
    calculateSceneDistance,
    updatePerformanceStats,
    loadScene,
    switchScene,
  } = useSceneManager({
    refs,
    actions,
    projectId,
    currentScene,
    currentViewParams,
  });

  // Initialize performance manager
  const { preloadAdjacentScenes, optimizePerformance } = usePerformanceManager({
    refs,
    actions,
    projectId,
    currentScene,
    calculateSceneDistance,
    loadScene,
    clearHotspotsForScene,
    updatePerformanceStats,
  });

  // Create a modified switchScene function that works with the hook
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
    [
      switchScene,
      clearHotspotsForScene,
      createHotspotsForScene,
      preloadAdjacentScenes,
    ]
  );

  // Initialize viewer function
  const initializeViewer = useCallback(async () => {
    try {
      // Check WebGL support with detailed diagnostics
      if (!checkWebGLSupport()) {
        const diagnostics = getWebGLDiagnostics();
        console.error('WebGL Diagnostics:', diagnostics);
        throw new Error(
          `WebGL is not supported or disabled in your browser. Diagnostics: ${diagnostics}`
        );
      }

      // Load configuration with project-specific path
      const configUrl = projectId
        ? `/api/projects/${encodeURIComponent(projectId)}/config`
        : '/config.json';
      const response = await fetch(configUrl);
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.statusText}`);
      }

      const configData = (await response.json()) as ConfigData;
      actions.setConfig(configData);

      // Initialize Marzipano viewer
      const Marzipano = (window as any).Marzipano;
      if (!Marzipano) {
        throw new Error('Marzipano library not loaded');
      }

      const viewerOpts = {
        controls: {
          mouseViewMode: 'drag',
        },
        stage: {
          progressive: true,
        },
      };

      if (!refs.panoRef.current) {
        throw new Error('Panorama container not found');
      }

      const viewer = new Marzipano.Viewer(refs.panoRef.current, viewerOpts);
      refs.viewerRef.current = viewer;

      // Initialize scenes object (but don't create them yet)
      configData.scenes.forEach(sceneData => {
        refs.scenesRef.current[sceneData.id] = {
          data: sceneData,
          scene: null,
          hotspotElements: [],
          loaded: false,
        };
      });

      // Load and display initial scene with high priority
      if (configData.scenes.length > 0) {
        let targetScene = configData.scenes[0];

        // Use initialSceneId if provided and exists
        if (initialSceneId) {
          const foundScene = configData.scenes.find(
            s => s.id === initialSceneId
          );
          if (foundScene) {
            targetScene = foundScene;
          }
        }

        await loadScene(targetScene.id, 'high');
        await switchSceneWithHooks(targetScene.id, true, false);
      }

      actions.setIsLoading(false);

      // Show tap hint after a delay
      setTimeout(() => actions.setShowTapHint(true), 1000);
      setTimeout(() => actions.setShowTapHint(false), 4000);
    } catch (err) {
      console.error('Initialization error:', err);
      actions.setError(err instanceof Error ? err.message : String(err));
      actions.setIsLoading(false);
    }
  }, [
    loadScene,
    switchSceneWithHooks,
    actions,
    refs,
    initialSceneId,
    projectId,
  ]);

  // toggleHotspots is now provided by useHotspotManager hook

  // Create navigateToScene function
  const navigateToScene = useCallback(
    async (sceneId: string, sourceHotspotYaw?: number): Promise<void> => {
      if (sceneId === state.currentScene) return;

      // First ensure the target scene is fully loaded
      const sceneInfo = refs.scenesRef.current[sceneId];
      if (sceneInfo) {
        // Create image element to force preload with project-specific path
        const img = new Image();
        const imagePath = projectId
          ? `/${projectId}/images/${sceneId}-pano.jpg`
          : `/images/${sceneId}-pano.jpg`;
        img.src = imagePath;

        // Wait for image to load
        await new Promise<void>(resolve => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Continue even if error
        });

        // Load scene in Marzipano if not already loaded
        if (!sceneInfo.loaded) {
          await loadScene(sceneId, 'high');
        }
      }

      // Update URL when navigating via hotspots without triggering page reload
      if (projectId) {
        const newUrl = `/${projectId}/${sceneId}`;
        window.history.replaceState(null, '', newUrl);
      }

      // Switch scene directly
      await switchSceneWithHooks(sceneId, false, true);
    },
    [
      switchSceneWithHooks,
      state.currentScene,
      loadScene,
      router,
      projectId,
      refs.scenesRef,
    ]
  );

  // Initialize event handlers
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
  });

  if (state.error) {
    return <LoadingScreen error={state.error} onRetry={handleRetry} />;
  }

  return (
    <>
      <Script
        src='/assets/js/marzipano.js'
        strategy='afterInteractive'
        onLoad={handleMarzipanoLoad}
      />

      {state.isLoading && <LoadingScreen />}

      {/* Logo */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1200,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '10px',
          borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
        }}
      >
        <img
          src='/assets/svg/primezone-logo.svg'
          alt='PrimeZone Logo'
          style={{
            height: '60px',
            width: 'auto',
            display: 'block',
          }}
        />
      </div>

      <div
        ref={refs.panoRef}
        id='pano'
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          cursor: 'grab',
        }}
        onClick={handlePanoClick}
        onMouseDown={e =>
          ((e.currentTarget as HTMLElement).style.cursor = 'grabbing')
        }
        onMouseUp={e =>
          ((e.currentTarget as HTMLElement).style.cursor = 'grab')
        }
      />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          zIndex: 1600,
          pointerEvents: 'none',
        }}
      />

      {state.showTapHint && (
        <div className='tap-hint show'>Tap anywhere to show navigation</div>
      )}

      {/* Unified Control Panel */}
      <ControlPanel
        scenes={state.config?.scenes || []}
        currentScene={
          state.currentScene && refs.scenesRef.current[state.currentScene]
            ? refs.scenesRef.current[state.currentScene].data
            : null
        }
        onFloorChange={navigateToScene}
        performanceStats={state.performanceStats}
        totalScenes={state.config?.scenes.length || 0}
        onOptimize={optimizePerformance}
      />

      {state.config &&
        state.currentScene &&
        refs.scenesRef.current[state.currentScene] && (
          <>
            <MiniMap
              scenes={state.config.scenes}
              currentScene={refs.scenesRef.current[state.currentScene]?.data}
              viewer={refs.viewerRef.current}
              onSelectScene={navigateToScene}
              rotationAngle={state.rotationAngle}
            />

            {/* Render hotspots */}
            {state.currentScene &&
              refs.scenesRef.current[state.currentScene]?.hotspotElements?.map(
                (element, index) => {
                  const hotspotData =
                    refs.scenesRef.current[state.currentScene!]?.data
                      ?.linkHotspots[index];
                  if (!hotspotData) return null;

                  return (
                    <Hotspot
                      key={`${state.currentScene}-${index}-${hotspotData.target}`}
                      element={element}
                      data={hotspotData}
                      visible={state.hotspotsVisible}
                      onNavigate={navigateToScene}
                    />
                  );
                }
              )}
          </>
        )}

      <div id='controls-hint'>
        <div>🖱️ Drag to look around • Click to show paths</div>
        <div>📍 Click on arrows to navigate</div>
      </div>

      <style jsx>{`
        .tap-hint {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 12px 24px;
          border-radius: 24px;
          font-size: 14px;
          opacity: 0;
          transition: opacity 0.5s;
          pointer-events: none;
          z-index: 1000;
        }

        .compass-arrow-container {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 60px;
          height: 60px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1300;
          transition: transform 0.2s linear;
        }

        .compass-arrow {
          width: 0;
          height: 0;
          border-left: 15px solid transparent;
          border-right: 15px solid transparent;
          border-bottom: 30px solid red;
          transform: translateY(-5px);
        }

        .tap-hint.show {
          opacity: 1;
          animation: fadeInOut 3s ease-in-out;
        }

        #controls-hint {
          position: absolute;
          bottom: 20px;
          left: 20px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 12px;
          z-index: 1000;
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          #controls-hint {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
