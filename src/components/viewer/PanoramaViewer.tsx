'use client';

import Script from 'next/script';
import { useState, useCallback, useEffect, useRef } from 'react';
import MiniMap from './MiniMap';
import LoadingScreen from '../utility/LoadingScreen';
import ControlPanel from '../ui/ControlPanel';
import PanoramaLogo from './PanoramaLogo';
import TapHint from './TapHint';
// import ControlsHint from './ControlsHint';
import PanoramaContainer from './PanoramaContainer';
import HotspotRenderer, { HotspotRendererRef } from './HotspotRenderer';
import POIComponent from '../poi/POIComponent';
import { usePanoramaManager } from '@/hooks/usePanoramaManager';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { POIData } from '@/types/poi';

interface PanoramaViewerProps {
  projectId?: string;
  initialSceneId?: string;
}

export default function PanoramaViewer({
  projectId,
  initialSceneId,
}: PanoramaViewerProps = {}) {
  const [closePanelsFunc, setClosePanelsFunc] = useState<(() => void) | null>(
    null
  );
  const hotspotRendererRef = useRef<HotspotRendererRef>(null);

  const handleClosePanels = useCallback((closePanels: () => void) => {
    setClosePanelsFunc(() => closePanels);
  }, []);

  const handlePOICreated = useCallback((poi: POIData) => {
    console.log('POI created:', poi);
    // Refresh POI scene counts to update hotspot icons immediately
    if (hotspotRendererRef.current) {
      hotspotRendererRef.current.refreshPOISceneCounts();
    }
  }, []);

  const {
    state,
    refs,
    navigateToScene,
    optimizePerformance,
    handlePanoClick,
    handleMarzipanoLoad,
    handleRetry,
  } = usePanoramaManager({
    projectId,
    initialSceneId,
    closePanels: closePanelsFunc || undefined,
  });

  // Cleanup effect to properly destroy viewer when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup Marzipano viewer
      if (refs.viewerRef.current) {
        try {
          refs.viewerRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying Marzipano viewer:', error);
        }
        refs.viewerRef.current = null;
      }

      // Clear all scenes
      refs.scenesRef.current = {};

      // Clear any pending timeouts
      if (refs.hotspotTimeoutRef.current) {
        clearTimeout(refs.hotspotTimeoutRef.current);
        refs.hotspotTimeoutRef.current = null;
      }

      // Clear the panorama container
      if (refs.panoRef.current) {
        refs.panoRef.current.innerHTML = '';
      }

      console.log('PanoramaViewer cleanup completed');
    };
  }, []); // Empty dependency array - only run on unmount

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

      <PanoramaLogo />
      <PanoramaContainer panoRef={refs.panoRef} onPanoClick={handlePanoClick} />
      <TapHint show={state.showTapHint} />

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
        onClosePanels={handleClosePanels}
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

            <HotspotRenderer
              ref={hotspotRendererRef}
              currentScene={state.currentScene}
              scenesRef={refs.scenesRef}
              hotspotsVisible={state.hotspotsVisible}
              onNavigate={navigateToScene}
              projectId={projectId}
            />

            <POIComponent
              projectId={projectId || 'default'}
              currentPanoramaId={state.currentScene}
              viewerSize={{ width: 800, height: 600 }} // You may want to get actual viewer size
              viewerRef={refs.viewerRef}
              panoRef={refs.panoRef}
              onPOICreated={handlePOICreated}
            />
          </>
        )}

      {/* <ControlsHint /> */}

      <ToastContainer
        position='bottom-left'
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme='dark'
        toastStyle={{
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
        }}

      />
    </>
  );
}
