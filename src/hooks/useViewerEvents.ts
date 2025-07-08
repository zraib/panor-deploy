import { useEffect, useCallback, MouseEvent } from 'react';
import { createRipple, checkWebGLSupport, getWebGLDiagnostics } from '@/utils/panoramaUtils';
import { PanoramaViewerRefs, PanoramaViewerActions, ViewParams } from './usePanoramaViewer';

export interface UseViewerEventsProps {
  refs: PanoramaViewerRefs;
  actions: PanoramaViewerActions;
  isLoading: boolean;
  currentScene: string | null;
  toggleHotspots: () => void;
  initializeViewer: () => Promise<void>;
  closePanels?: () => void;
}

export function useViewerEvents({
  refs,
  actions,
  isLoading,
  currentScene,
  toggleHotspots,
  initializeViewer,
  closePanels,
}: UseViewerEventsProps) {
  // Handle panorama click
  const handlePanoClick = useCallback(
    (e: MouseEvent<HTMLDivElement>): void => {
      // Don't toggle if clicking a hotspot
      if ((e.target as HTMLElement).closest('.hotspot')) return;

      // Close any open panels
      if (closePanels) {
        closePanels();
      }

      // Show touch ripple effect
      createRipple(e.clientX, e.clientY, refs.panoRef.current);

      // Toggle hotspots
      toggleHotspots();
    },
    [toggleHotspots, closePanels, refs.panoRef]
  );

  // WebGL context loss recovery
  const handleWebGLContextLoss = useCallback(() => {
    console.warn('WebGL context lost, attempting recovery...');
    actions.setError('WebGL context was lost. Reloading viewer...');

    // Attempt to reinitialize after a short delay
    setTimeout(() => {
      if (checkWebGLSupport()) {
        actions.setError(null);
        actions.setIsLoading(true);
        initializeViewer();
      } else {
        actions.setError(
          'WebGL context could not be restored. Please refresh the page.'
        );
      }
    }, 1000);
  }, [actions, initializeViewer]);

  // Initialize when Marzipano loads
  const handleMarzipanoLoad = (): void => {
    refs.marzipanoRef.current = true;
    initializeViewer();
  };

  // Retry function for WebGL errors
  const handleRetry = useCallback(() => {
    actions.setError(null);
    actions.setIsLoading(true);
    // Small delay to ensure state is reset
    setTimeout(() => {
      initializeViewer();
    }, 100);
  }, [actions, initializeViewer]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent): void => {
      if (e.key === ' ') {
        e.preventDefault();
        toggleHotspots();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [toggleHotspots]);

  // Add WebGL context loss listeners
  useEffect(() => {
    const canvas = refs.panoRef.current?.querySelector('canvas');
    if (canvas) {
      const handleContextLost = (event: Event) => {
        event.preventDefault();
        handleWebGLContextLoss();
      };

      const handleContextRestored = () => {
        console.log('WebGL context restored');
        handleWebGLContextLoss();
      };

      canvas.addEventListener('webglcontextlost', handleContextLost);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);

      return () => {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
        canvas.removeEventListener(
          'webglcontextrestored',
          handleContextRestored
        );
      };
    }
  }, [handleWebGLContextLoss, refs.viewerRef.current]);

  // Check if Marzipano is already loaded on mount
  useEffect(() => {
    // If Marzipano is already available (e.g., when navigating back)
    if ((window as any).Marzipano && !refs.marzipanoRef.current) {
      handleMarzipanoLoad();
    }
  }, []);

  // Update viewer size on resize
  useEffect(() => {
    function updateSize() {
      if (refs.panoRef.current) {
        actions.setViewerSize({
          width: refs.panoRef.current.offsetWidth,
          height: refs.panoRef.current.offsetHeight,
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [refs.panoRef, actions]);

  // Update arrow rotation on view change
  useEffect(() => {
    const viewer = refs.viewerRef.current;
    if (!viewer || isLoading) return;

    const updateArrowRotation = () => {
      const yaw = viewer.view().yaw();
      let rotation = yaw * (180 / Math.PI); // Convert radians to degrees

      // Apply north offset correction for compass arrow
      if (currentScene && refs.scenesRef.current[currentScene]?.data?.northOffset) {
        rotation += refs.scenesRef.current[currentScene].data.northOffset;
      }

      actions.setCurrentYaw(yaw);
      actions.setArrowStyle({
        transform: `rotate(${rotation}deg)`,
      });
    };

    if (viewer.addEventListener) {
      viewer.addEventListener('viewChange', updateArrowRotation);
    }

    return () => {
      if (viewer && viewer.removeEventListener) {
        viewer.removeEventListener('viewChange', updateArrowRotation);
      }
    };
  }, [isLoading, currentScene, refs.viewerRef, refs.scenesRef, actions]);

  // Setup view parameter tracking
  const setupViewTracking = useCallback((viewer: Marzipano.Viewer) => {
    const updateViewParams = () => {
      try {
        if (viewer) {
          const view = viewer.view();
          actions.setCurrentViewParams({
            yaw: view.yaw(),
            pitch: view.pitch(),
            fov: view.fov(),
          });
        }
      } catch (err) {
        // Silently ignore errors during view tracking
      }
    };

    // Listen for view changes
    if (viewer.addEventListener) {
      viewer.addEventListener('viewChange', updateViewParams);
    }

    // Also update on mouse/touch interactions
    if (refs.panoRef.current) {
      refs.panoRef.current.addEventListener('mouseup', updateViewParams);
      refs.panoRef.current.addEventListener('touchend', updateViewParams);
    }

    return updateViewParams;
  }, [refs.panoRef, actions]);

  return {
    handlePanoClick,
    handleWebGLContextLoss,
    handleMarzipanoLoad,
    handleRetry,
    setupViewTracking,
  };
}