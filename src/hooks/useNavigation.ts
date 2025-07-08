import { useCallback } from 'react';
import { useRouter } from 'next/router';

// Navigation error types
export enum NavigationError {
  INVALID_PROJECT_ID = 'INVALID_PROJECT_ID',
  INVALID_SCENE_ID = 'INVALID_SCENE_ID',
  ROUTER_NOT_AVAILABLE = 'ROUTER_NOT_AVAILABLE',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
}

export class NavigationException extends Error {
  constructor(public type: NavigationError, message: string, public targetId?: string) {
    super(message);
    this.name = 'NavigationException';
  }
}

export interface UseNavigationReturn {
  navigateToProject: (projectId: string) => Promise<void>;
  navigateToScene: (projectId: string, sceneId: string) => Promise<void>;
  navigateBack: () => Promise<void>;
  getCurrentProject: () => string | null;
  getCurrentScene: () => string | null;
  isNavigating: boolean;
}

export function useNavigation(): UseNavigationReturn {
  const router = useRouter();

  // Navigate to a specific project
  const navigateToProject = useCallback(
    async (projectId: string): Promise<void> => {
      try {
        if (!projectId || typeof projectId !== 'string') {
          throw new NavigationException(
            NavigationError.INVALID_PROJECT_ID,
            'Project ID must be a non-empty string',
            projectId
          );
        }

        if (!router) {
          throw new NavigationException(
            NavigationError.ROUTER_NOT_AVAILABLE,
            'Router is not available for navigation',
            projectId
          );
        }

        console.log(`Navigating to project: ${projectId}`);
        console.log('Current router state:', {
          pathname: router.pathname,
          asPath: router.asPath,
          query: router.query,
        });

        const targetUrl = `/${projectId}`;
        console.log(`Target URL: ${targetUrl}`);

        // Use router.push with proper error handling
        const navigationPromise = router.push(targetUrl);
        
        // Add timeout for navigation
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Navigation timeout')), 10000)
        );

        await Promise.race([navigationPromise, timeoutPromise]);
        
        console.log(`Successfully navigated to project: ${projectId}`);
      } catch (error) {
        if (error instanceof NavigationException) {
          console.error(`Navigation Error [${error.type}]:`, error.message);
        } else {
          console.error('Unexpected navigation error:', error);
        }
        throw new NavigationException(
          NavigationError.NAVIGATION_FAILED,
          `Failed to navigate to project: ${error instanceof Error ? error.message : 'Unknown error'}`,
          projectId
        );
      }
    },
    [router]
  );

  // Navigate to a specific scene within a project
  const navigateToScene = useCallback(
    async (projectId: string, sceneId: string): Promise<void> => {
      try {
        if (!projectId || typeof projectId !== 'string') {
          throw new NavigationException(
            NavigationError.INVALID_PROJECT_ID,
            'Project ID must be a non-empty string',
            projectId
          );
        }

        if (!sceneId || typeof sceneId !== 'string') {
          throw new NavigationException(
            NavigationError.INVALID_SCENE_ID,
            'Scene ID must be a non-empty string',
            sceneId
          );
        }

        if (!router) {
          throw new NavigationException(
            NavigationError.ROUTER_NOT_AVAILABLE,
            'Router is not available for navigation',
            `${projectId}/${sceneId}`
          );
        }

        console.log(`Navigating to scene: ${sceneId} in project: ${projectId}`);
        
        const targetUrl = `/${projectId}/${sceneId}`;
        console.log(`Target URL: ${targetUrl}`);

        // Use router.push with proper error handling
        const navigationPromise = router.push(targetUrl);
        
        // Add timeout for navigation
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Navigation timeout')), 10000)
        );

        await Promise.race([navigationPromise, timeoutPromise]);
        
        console.log(`Successfully navigated to scene: ${sceneId}`);
      } catch (error) {
        if (error instanceof NavigationException) {
          console.error(`Navigation Error [${error.type}]:`, error.message);
        } else {
          console.error('Unexpected navigation error:', error);
        }
        throw new NavigationException(
          NavigationError.NAVIGATION_FAILED,
          `Failed to navigate to scene: ${error instanceof Error ? error.message : 'Unknown error'}`,
          `${projectId}/${sceneId}`
        );
      }
    },
    [router]
  );

  // Navigate back to previous page
  const navigateBack = useCallback(
    async (): Promise<void> => {
      try {
        if (!router) {
          throw new NavigationException(
            NavigationError.ROUTER_NOT_AVAILABLE,
            'Router is not available for navigation'
          );
        }

        console.log('Navigating back');
        
        // Use router.back() with fallback to home
        if (window.history.length > 1) {
          router.back();
        } else {
          await router.push('/');
        }
        
        console.log('Successfully navigated back');
      } catch (error) {
        console.error('Error navigating back:', error);
        throw new NavigationException(
          NavigationError.NAVIGATION_FAILED,
          `Failed to navigate back: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [router]
  );

  // Get current project ID from router
  const getCurrentProject = useCallback((): string | null => {
    try {
      if (!router || !router.query) {
        return null;
      }

      const { projectId } = router.query;
      return typeof projectId === 'string' ? projectId : null;
    } catch (error) {
      console.warn('Error getting current project:', error);
      return null;
    }
  }, [router]);

  // Get current scene ID from router
  const getCurrentScene = useCallback((): string | null => {
    try {
      if (!router || !router.query) {
        return null;
      }

      const { sceneId } = router.query;
      return typeof sceneId === 'string' ? sceneId : null;
    } catch (error) {
      console.warn('Error getting current scene:', error);
      return null;
    }
  }, [router]);

  // Check if navigation is in progress
  const isNavigating = router?.events ? false : false; // This could be enhanced with router events

  return {
    navigateToProject,
    navigateToScene,
    navigateBack,
    getCurrentProject,
    getCurrentScene,
    isNavigating,
  };
}