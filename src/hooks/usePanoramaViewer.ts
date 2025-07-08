import { useState, useRef, useReducer, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ConfigData, SceneInfo as SceneInfoType } from '@/types/scenes';

export interface ViewParams {
  yaw: number;
  pitch: number;
  fov: number;
}

export interface PerformanceStats {
  loadedScenes: number;
  memoryUsage: string;
  avgLoadTime: number;
}

// Action types for state reducer
export type PanoramaAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONFIG'; payload: ConfigData | null }
  | { type: 'SET_CURRENT_SCENE'; payload: string | null }
  | { type: 'SET_HOTSPOTS_VISIBLE'; payload: boolean }
  | { type: 'SET_SHOW_TAP_HINT'; payload: boolean }
  | { type: 'SET_VIEWER_SIZE'; payload: { width: number; height: number } }
  | { type: 'SET_ARROW_STYLE'; payload: { transform?: string } }
  | { type: 'SET_CURRENT_YAW'; payload: number }
  | { type: 'SET_ROTATION_ANGLE'; payload: number }
  | { type: 'SET_CURRENT_VIEW_PARAMS'; payload: ViewParams | null }
  | { type: 'SET_PERFORMANCE_STATS'; payload: PerformanceStats }
  | { type: 'RESET_STATE' };

// State reducer function
function panoramaReducer(state: PanoramaViewerState, action: PanoramaAction): PanoramaViewerState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CONFIG':
      return { ...state, config: action.payload };
    case 'SET_CURRENT_SCENE':
      return { ...state, currentScene: action.payload };
    case 'SET_HOTSPOTS_VISIBLE':
      return { ...state, hotspotsVisible: action.payload };
    case 'SET_SHOW_TAP_HINT':
      return { ...state, showTapHint: action.payload };
    case 'SET_VIEWER_SIZE':
      return { ...state, viewerSize: action.payload };
    case 'SET_ARROW_STYLE':
      return { ...state, arrowStyle: action.payload };
    case 'SET_CURRENT_YAW':
      return { ...state, currentYaw: action.payload };
    case 'SET_ROTATION_ANGLE':
      return { ...state, rotationAngle: action.payload };
    case 'SET_CURRENT_VIEW_PARAMS':
      return { ...state, currentViewParams: action.payload };
    case 'SET_PERFORMANCE_STATS':
      return { ...state, performanceStats: action.payload };
    case 'RESET_STATE':
      return {
        isLoading: true,
        error: null,
        config: null,
        currentScene: null,
        hotspotsVisible: false,
        showTapHint: false,
        viewerSize: { width: 0, height: 0 },
        arrowStyle: {},
        currentYaw: 0,
        rotationAngle: -90,
        currentViewParams: null,
        performanceStats: {
          loadedScenes: 0,
          memoryUsage: '0 MB',
          avgLoadTime: 0,
        },
      };
    default:
      return state;
  }
}

export interface PanoramaViewerState {
  isLoading: boolean;
  error: string | null;
  config: ConfigData | null;
  currentScene: string | null;
  hotspotsVisible: boolean;
  showTapHint: boolean;
  viewerSize: { width: number; height: number };
  arrowStyle: { transform?: string };
  currentYaw: number;
  rotationAngle: number;
  currentViewParams: ViewParams | null;
  performanceStats: PerformanceStats;
}

export interface PanoramaViewerRefs {
  viewerRef: React.MutableRefObject<Marzipano.Viewer | null>;
  scenesRef: React.MutableRefObject<Record<string, SceneInfoType>>;
  panoRef: React.MutableRefObject<HTMLDivElement | null>;
  hotspotTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  marzipanoRef: React.MutableRefObject<boolean>;
  loadTimesRef: React.MutableRefObject<number[]>;
}

export interface PanoramaViewerActions {
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConfig: (config: ConfigData | null) => void;
  setCurrentScene: (scene: string | null) => void;
  setHotspotsVisible: (visible: boolean) => void;
  setShowTapHint: (show: boolean) => void;
  setViewerSize: (size: { width: number; height: number }) => void;
  setArrowStyle: (style: { transform?: string }) => void;
  setCurrentYaw: (yaw: number) => void;
  setRotationAngle: (angle: number) => void;
  setCurrentViewParams: (params: ViewParams | null) => void;
  setPerformanceStats: (stats: PerformanceStats) => void;
  resetState: () => void;
}

export interface UsePanoramaViewerReturn {
  state: PanoramaViewerState;
  refs: PanoramaViewerRefs;
  actions: PanoramaViewerActions;
  router: ReturnType<typeof useRouter>;
}

export function usePanoramaViewer(): UsePanoramaViewerReturn {
  const router = useRouter();
  
  // Initial state
  const initialState: PanoramaViewerState = {
    isLoading: true,
    error: null,
    config: null,
    currentScene: null,
    hotspotsVisible: false,
    showTapHint: false,
    viewerSize: { width: 0, height: 0 },
    arrowStyle: {},
    currentYaw: 0,
    rotationAngle: -90,
    currentViewParams: null,
    performanceStats: {
      loadedScenes: 0,
      memoryUsage: '0 MB',
      avgLoadTime: 0,
    },
  };

  // Use reducer for state management
  const [state, dispatch] = useReducer(panoramaReducer, initialState);

  // Refs
  const viewerRef = useRef<Marzipano.Viewer | null>(null);
  const scenesRef = useRef<Record<string, SceneInfoType>>({});
  const panoRef = useRef<HTMLDivElement>(null);
  const hotspotTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const marzipanoRef = useRef<boolean>(false);
  const loadTimesRef = useRef<number[]>([]);

  // Memoized action creators
  const actions = {
    setIsLoading: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    }, []),
    setError: useCallback((error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    }, []),
    setConfig: useCallback((config: ConfigData | null) => {
      dispatch({ type: 'SET_CONFIG', payload: config });
    }, []),
    setCurrentScene: useCallback((scene: string | null) => {
      dispatch({ type: 'SET_CURRENT_SCENE', payload: scene });
    }, []),
    setHotspotsVisible: useCallback((visible: boolean) => {
      dispatch({ type: 'SET_HOTSPOTS_VISIBLE', payload: visible });
    }, []),
    setShowTapHint: useCallback((show: boolean) => {
      dispatch({ type: 'SET_SHOW_TAP_HINT', payload: show });
    }, []),
    setViewerSize: useCallback((size: { width: number; height: number }) => {
      dispatch({ type: 'SET_VIEWER_SIZE', payload: size });
    }, []),
    setArrowStyle: useCallback((style: { transform?: string }) => {
      dispatch({ type: 'SET_ARROW_STYLE', payload: style });
    }, []),
    setCurrentYaw: useCallback((yaw: number) => {
      dispatch({ type: 'SET_CURRENT_YAW', payload: yaw });
    }, []),
    setRotationAngle: useCallback((angle: number) => {
      dispatch({ type: 'SET_ROTATION_ANGLE', payload: angle });
    }, []),
    setCurrentViewParams: useCallback((params: ViewParams | null) => {
      dispatch({ type: 'SET_CURRENT_VIEW_PARAMS', payload: params });
    }, []),
    setPerformanceStats: useCallback((stats: PerformanceStats) => {
      dispatch({ type: 'SET_PERFORMANCE_STATS', payload: stats });
    }, []),
    resetState: useCallback(() => {
      dispatch({ type: 'RESET_STATE' });
    }, []),
  };

  const refs: PanoramaViewerRefs = {
    viewerRef,
    scenesRef,
    panoRef,
    hotspotTimeoutRef,
    marzipanoRef,
    loadTimesRef,
  };

  // Cleanup effect to reset state when hook unmounts
  useEffect(() => {
    return () => {
      // Reset state when component unmounts
      dispatch({ type: 'RESET_STATE' });
      
      // Clear refs (but keep marzipanoRef as it tracks library availability)
      viewerRef.current = null;
      scenesRef.current = {};
      loadTimesRef.current = [];
      
      if (hotspotTimeoutRef.current) {
        clearTimeout(hotspotTimeoutRef.current);
        hotspotTimeoutRef.current = null;
      }
      
      console.log('usePanoramaViewer cleanup completed');
    };
  }, []);

  return {
    state,
    refs,
    actions,
    router,
  };
}