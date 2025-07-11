import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import Hotspot from '../hotspot/Hotspot';
import { SceneInfo as SceneInfoType } from '@/types/scenes';
import { ViewParams } from '@/hooks/usePanoramaViewer';

interface HotspotRendererProps {
  currentScene: string | null;
  scenesRef: React.MutableRefObject<Record<string, SceneInfoType>>;
  hotspotsVisible: boolean;
  onNavigate: (sceneId: string, sourceHotspotYaw?: number) => Promise<void>;
  projectId?: string;
  currentViewParams?: ViewParams | null;
}

export interface HotspotRendererRef {
  refreshPOISceneCounts: () => void;
}

const HotspotRenderer = React.memo(forwardRef<HotspotRendererRef, HotspotRendererProps>(({
  currentScene,
  scenesRef,
  hotspotsVisible,
  onNavigate,
  projectId,
  currentViewParams,
}, ref) => {
  const [poiSceneCounts, setPoiSceneCounts] = useState<Record<string, number>>({});

  // Function to fetch POI scene counts
  const fetchPoiSceneCounts = async () => {
    if (!projectId) {
      setPoiSceneCounts({});
      return;
    }

    try {
      const response = await fetch(`/api/poi/scene-counts?projectId=${encodeURIComponent(projectId)}`);
      if (response.ok) {
        const data = await response.json();
        setPoiSceneCounts(data.sceneCounts || {});
      } else {
        console.warn('Failed to fetch POI scene counts:', response.status);
        setPoiSceneCounts({});
      }
    } catch (error) {
      console.error('Error fetching POI scene counts:', error);
      setPoiSceneCounts({});
    }
  };

  // Expose refresh function through ref
  useImperativeHandle(ref, () => ({
    refreshPOISceneCounts: fetchPoiSceneCounts,
  }), [projectId]);

  // Fetch POI scene counts when projectId changes
  useEffect(() => {
    fetchPoiSceneCounts();
  }, [projectId]);

  if (!currentScene || !scenesRef.current[currentScene]) {
    return null;
  }

  const sceneInfo = scenesRef.current[currentScene];
   
  return (
    <>
      {sceneInfo.hotspotElements?.map((element, index) => {
        const hotspotData = sceneInfo.data?.linkHotspots[index];
        if (!hotspotData) return null;

        // Check if the target scene has POIs
        const targetHasPOIs = (poiSceneCounts[hotspotData.target] || 0) > 0;

        return (
          <Hotspot
            key={`${currentScene}-${index}-${hotspotData.target}`}
            element={element}
            data={hotspotData}
            visible={hotspotsVisible}
            onNavigate={onNavigate}
            hasPOIs={targetHasPOIs}
            currentViewParams={currentViewParams}
          />
        );
      })}
    </>
  );
}), (prevProps, nextProps) => {
  // Re-render only if essential props change
  return (
    prevProps.currentScene === nextProps.currentScene &&
    prevProps.hotspotsVisible === nextProps.hotspotsVisible &&
    prevProps.scenesRef === nextProps.scenesRef &&
    prevProps.onNavigate === nextProps.onNavigate &&
    prevProps.projectId === nextProps.projectId &&
    prevProps.currentViewParams?.fov === nextProps.currentViewParams?.fov
  );
});

export default HotspotRenderer;