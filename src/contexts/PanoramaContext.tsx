'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { usePanoramaViewer, UsePanoramaViewerReturn } from '@/hooks/usePanoramaViewer';
import { useSceneManager } from '@/hooks/useSceneManager';
import { useHotspotManager } from '@/hooks/useHotspotManager';
import { usePerformanceManager } from '@/hooks/usePerformanceManager';
import { useViewerEvents } from '@/hooks/useViewerEvents';
import { useNavigation, UseNavigationReturn } from '@/hooks/useNavigation';
import { ConfigData } from '@/types/scenes';

// Context interface
export interface PanoramaContextValue {
  // Core panorama viewer
  panoramaViewer: UsePanoramaViewerReturn;
  
  // Scene management
  sceneManager: {
    calculateSceneDistance: (scene1: string, scene2: string) => number;
    updatePerformanceStats: () => void;
    loadScene: (sceneId: string, priority?: 'high' | 'normal' | 'low') => Promise<void>;
    loadSceneWithProgressiveQuality: (sceneId: string, targetQuality?: number) => Promise<void>;
    switchScene: (
      sceneId: string,
      isInitial: boolean,
      preserveViewDirection: boolean,
      clearHotspotsForScene: (sceneInfo: import("@/types/scenes").SceneInfo) => void,
      createHotspotsForScene: (sceneInfo: import("@/types/scenes").SceneInfo) => void,
      preloadAdjacentScenes: (sceneId: string) => Promise<void>
    ) => Promise<void>;
  };
  
  // Hotspot management
  hotspotManager: {
    clearHotspotsForScene: (sceneInfo: any) => void;
    createHotspotsForScene: (sceneInfo: any) => void;
    toggleHotspots: () => void;
  };
  
  // Performance management
  performanceManager: {
    preloadAdjacentScenes: (sceneId: string) => Promise<void>;
    optimizePerformance: () => void;
    unloadDistantScenes: (currentSceneId: string) => Promise<void>;
    getEstimatedMemoryUsage: () => Promise<number>;
  };
  
  // Navigation
  navigation: UseNavigationReturn;
  
  // Initialization
  initializeViewer: () => Promise<void>;
}

// Create context
const PanoramaContext = createContext<PanoramaContextValue | null>(null);

// Provider props
export interface PanoramaProviderProps {
  children: ReactNode;
  config?: ConfigData | null;
}

// Provider component
export function PanoramaProvider({ children, config }: PanoramaProviderProps) {
  // Initialize all hooks
  const panoramaViewer = usePanoramaViewer();
  const navigation = useNavigation();
  
  // Initialize scene manager
  const sceneManager = useSceneManager({
    refs: panoramaViewer.refs,
    actions: panoramaViewer.actions,
    currentScene: panoramaViewer.state.currentScene,
    currentViewParams: panoramaViewer.state.currentViewParams,
    projectId: navigation.getCurrentProject() || undefined,
  });
  
  // Initialize hotspot manager
  const hotspotManager = useHotspotManager({
    refs: panoramaViewer.refs,
    actions: panoramaViewer.actions,
    hotspotsVisible: panoramaViewer.state.hotspotsVisible,
  });
  
  // Initialize performance manager
  const performanceManager = usePerformanceManager({
    refs: panoramaViewer.refs,
    actions: panoramaViewer.actions,
    currentScene: panoramaViewer.state.currentScene,
    calculateSceneDistance: sceneManager.calculateSceneDistance,
    updatePerformanceStats: sceneManager.updatePerformanceStats,
    loadScene: sceneManager.loadScene,
    clearHotspotsForScene: hotspotManager.clearHotspotsForScene,
    projectId: navigation.getCurrentProject() || undefined,
  });
  
  // Initialize viewer events
  const initializeViewer = async () => {
    try {
      console.log('Initializing panorama viewer...');
      
      // Set config if provided
      if (config) {
        panoramaViewer.actions.setConfig(config);
      }
      
      // Additional initialization logic can be added here
      console.log('Panorama viewer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize panorama viewer:', error);
      panoramaViewer.actions.setError('Failed to initialize viewer');
      throw error;
    }
  };
  
  useViewerEvents({
    refs: panoramaViewer.refs,
    actions: panoramaViewer.actions,
    isLoading: panoramaViewer.state.isLoading,
    currentScene: panoramaViewer.state.currentScene,
    toggleHotspots: hotspotManager.toggleHotspots,
    initializeViewer,
  });
  
  // Context value
  const contextValue: PanoramaContextValue = {
    panoramaViewer,
    sceneManager,
    hotspotManager,
    performanceManager,
    navigation,
    initializeViewer,
  };
  
  return (
    <PanoramaContext.Provider value={contextValue}>
      {children}
    </PanoramaContext.Provider>
  );
}

// Hook to use the context
export function usePanoramaContext(): PanoramaContextValue {
  const context = useContext(PanoramaContext);
  
  if (!context) {
    throw new Error('usePanoramaContext must be used within a PanoramaProvider');
  }
  
  return context;
}

// Hook to use specific parts of the context
export function usePanoramaState() {
  const { panoramaViewer } = usePanoramaContext();
  return panoramaViewer.state;
}

export function usePanoramaActions() {
  const { panoramaViewer } = usePanoramaContext();
  return panoramaViewer.actions;
}

export function usePanoramaRefs() {
  const { panoramaViewer } = usePanoramaContext();
  return panoramaViewer.refs;
}

export function useSceneNavigation() {
  const { sceneManager, navigation } = usePanoramaContext();
  return { sceneManager, navigation };
}

export function useHotspotControls() {
  const { hotspotManager } = usePanoramaContext();
  return hotspotManager;
}

export function usePerformanceControls() {
  const { performanceManager } = usePanoramaContext();
  return performanceManager;
}