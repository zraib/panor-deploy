'use client';

import Script from 'next/script';
import { useState, useCallback } from 'react';
import MiniMap from './MiniMap';
import LoadingScreen from '../utility/LoadingScreen';
import ControlPanel from '../ui/ControlPanel';
import PanoramaLogo from './PanoramaLogo';
import TapHint from './TapHint';
import ControlsHint from './ControlsHint';
import PanoramaContainer from './PanoramaContainer';
import HotspotRenderer from './HotspotRenderer';
import { usePanoramaManager } from '@/hooks/usePanoramaManager';

interface PanoramaViewerProps {
  projectId?: string;
  initialSceneId?: string;
}

export default function PanoramaViewer({
  projectId,
  initialSceneId,
}: PanoramaViewerProps = {}) {
  const [closePanelsFunc, setClosePanelsFunc] = useState<(() => void) | null>(null);
  
  const handleClosePanels = useCallback((closePanels: () => void) => {
    setClosePanelsFunc(() => closePanels);
  }, []);
  
  const {
    state,
    refs,
    navigateToScene,
    optimizePerformance,
    handlePanoClick,
    handleMarzipanoLoad,
    handleRetry,
  } = usePanoramaManager({ projectId, initialSceneId, closePanels: closePanelsFunc || undefined });

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
              currentScene={state.currentScene}
              scenesRef={refs.scenesRef}
              hotspotsVisible={state.hotspotsVisible}
              onNavigate={navigateToScene}
            />
          </>
        )}

      <ControlsHint />
    </>
  );
}
