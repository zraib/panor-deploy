import React from 'react';
import Hotspot from '../hotspot/Hotspot';
import { SceneInfo as SceneInfoType } from '@/types/scenes';

interface HotspotRendererProps {
  currentScene: string | null;
  scenesRef: React.MutableRefObject<Record<string, SceneInfoType>>;
  hotspotsVisible: boolean;
  onNavigate: (sceneId: string, sourceHotspotYaw?: number) => Promise<void>;
}

const HotspotRenderer: React.FC<HotspotRendererProps> = React.memo(({
  currentScene,
  scenesRef,
  hotspotsVisible,
  onNavigate,
}) => {
  if (!currentScene || !scenesRef.current[currentScene]) {
    return null;
  }

  const sceneInfo = scenesRef.current[currentScene];
   
  return (
    <>
      {sceneInfo.hotspotElements?.map((element, index) => {
        const hotspotData = sceneInfo.data?.linkHotspots[index];
        if (!hotspotData) return null;

        return (
          <Hotspot
            key={`${currentScene}-${index}-${hotspotData.target}`}
            element={element}
            data={hotspotData}
            visible={hotspotsVisible}
            onNavigate={onNavigate}
          />
        );
      })}
    </>
  );
}, (prevProps, nextProps) => {
  // Re-render only if essential props change
  return (
    prevProps.currentScene === nextProps.currentScene &&
    prevProps.hotspotsVisible === nextProps.hotspotsVisible &&
    prevProps.scenesRef === nextProps.scenesRef &&
    prevProps.onNavigate === nextProps.onNavigate
  );
});

export default HotspotRenderer;