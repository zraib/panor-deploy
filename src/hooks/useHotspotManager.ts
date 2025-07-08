import { useCallback } from 'react';
import { SceneInfo as SceneInfoType, LinkHotspot } from '@/types/scenes';
import { PanoramaViewerRefs, PanoramaViewerActions } from './usePanoramaViewer';

export interface UseHotspotManagerProps {
  refs: PanoramaViewerRefs;
  actions: PanoramaViewerActions;
  hotspotsVisible: boolean;
}

export function useHotspotManager({
  refs,
  actions,
  hotspotsVisible,
}: UseHotspotManagerProps) {
  // Clear hotspots for a scene
  const clearHotspotsForScene = useCallback(
    (sceneInfo: SceneInfoType): void => {
      if (!sceneInfo?.scene) {
        console.warn('clearHotspotsForScene: Invalid scene info provided');
        return;
      }

      try {
        const hotspotContainer = sceneInfo.scene.hotspotContainer();
        if (!hotspotContainer) {
          console.warn('clearHotspotsForScene: No hotspot container found');
          return;
        }

        // Destroy all hotspots
        const hotspots = hotspotContainer.listHotspots();
        hotspots.forEach((hotspot: Marzipano.Hotspot) => {
          try {
            hotspotContainer.destroyHotspot(hotspot);
          } catch (destroyErr) {
            console.warn('Failed to destroy individual hotspot:', destroyErr);
          }
        });

        // Clear our references
        sceneInfo.hotspotElements = [];
        console.log(`Cleared ${hotspots.length} hotspots for scene ${sceneInfo.data.id}`);
      } catch (err) {
        console.error('Error clearing hotspots:', err);
        // Ensure references are cleared even on error
        sceneInfo.hotspotElements = [];
      }
    },
    []
  );

  // Create hotspots for a scene
  const createHotspotsForScene = useCallback(
    (sceneInfo: SceneInfoType): void => {
      if (!sceneInfo?.scene) {
        console.warn('createHotspotsForScene: Invalid scene info provided');
        return;
      }

      if (!sceneInfo.data?.linkHotspots) {
        console.log(`No hotspots to create for scene ${sceneInfo.data?.id || 'unknown'}`);
        return;
      }

      try {
        const hotspotContainer = sceneInfo.scene.hotspotContainer();
        if (!hotspotContainer) {
          console.warn('createHotspotsForScene: No hotspot container found');
          return;
        }

        // Clear any existing hotspots first
        clearHotspotsForScene(sceneInfo);

        // Create new hotspots
        sceneInfo.data.linkHotspots.forEach((hotspotData: LinkHotspot, index: number) => {
          try {
            if (typeof hotspotData.yaw !== 'number' || typeof hotspotData.pitch !== 'number') {
              console.warn(`Invalid hotspot data at index ${index}:`, hotspotData);
              return;
            }

            const element = document.createElement('div');
            element.setAttribute('data-hotspot-index', index.toString());
            element.setAttribute('data-target-scene', hotspotData.target || 'unknown');

            hotspotContainer.createHotspot(element, {
              yaw: hotspotData.yaw,
              pitch: hotspotData.pitch,
            });

            sceneInfo.hotspotElements.push(element);
          } catch (hotspotErr) {
            console.error(`Failed to create hotspot ${index}:`, hotspotErr);
          }
        });

        console.log(`Created ${sceneInfo.hotspotElements.length} hotspots for scene ${sceneInfo.data.id}`);
      } catch (err) {
        console.error('Error creating hotspots:', err);
      }
    },
    [clearHotspotsForScene]
  );

  // Toggle hotspots with improved error handling
  const toggleHotspots = useCallback((): void => {
    try {
      if (hotspotsVisible) {
        actions.setHotspotsVisible(false);
        if (refs.hotspotTimeoutRef.current) {
          clearTimeout(refs.hotspotTimeoutRef.current);
          refs.hotspotTimeoutRef.current = null;
        }
        console.log('Hotspots hidden');
      } else {
        actions.setHotspotsVisible(true);
        // Auto-hide after 5 seconds
        if (refs.hotspotTimeoutRef.current) {
          clearTimeout(refs.hotspotTimeoutRef.current);
        }
        refs.hotspotTimeoutRef.current = setTimeout(() => {
          try {
            actions.setHotspotsVisible(false);
            console.log('Hotspots auto-hidden after timeout');
          } catch (timeoutErr) {
            console.error('Error during hotspot auto-hide:', timeoutErr);
          }
        }, 5000);
        console.log('Hotspots shown (will auto-hide in 5s)');
      }
    } catch (err) {
      console.error('Error toggling hotspots:', err);
    }
  }, [hotspotsVisible, actions, refs.hotspotTimeoutRef]);

  return {
    clearHotspotsForScene,
    createHotspotsForScene,
    toggleHotspots,
  };
}