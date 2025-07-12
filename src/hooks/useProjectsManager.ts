'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useNavigation } from './useNavigation';

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sceneCount: number;
  hasConfig: boolean;
  firstSceneId?: string;
  poiCount: number;
  floorCount: number;
}

export function useProjectsManager() {
  const router = useRouter();
  const navigation = useNavigation();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  
  const currentProject = router.query.projectId as string;

  const loadProjects = async () => {
    try {
      console.log('📂 Loading projects...');
      setProjectsLoading(true);
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      const data = await response.json();
      console.log('📂 Projects loaded:', data.projects);
      setProjects(data.projects);
      setProjectsError(null);
    } catch (err: any) {
      console.error('❌ Failed to load projects:', err);
      setProjectsError(err.message);
    } finally {
      setProjectsLoading(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      setDeleting(projectId);
      const response = await fetch(
        `/api/projects?projectId=${encodeURIComponent(projectId)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }

      setProjects(prev => prev.filter(p => p.id !== projectId));

      // If we deleted the current project, go to home
      if (currentProject === projectId) {
        router.push('/');
      }
    } catch (err: any) {
      setProjectsError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleProjectSelect = async (projectId: string, onPanelClose: () => void) => {
    try {
      console.log('🔍 handleProjectSelect called with projectId:', projectId);
      console.log('🔍 Current router state:', {
        pathname: router.pathname,
        query: router.query,
        asPath: router.asPath
      });
      
      if (isNavigating) {
        console.log('⏳ Navigation already in progress, ignoring click');
        return;
      }
      
      setIsNavigating(true);
      onPanelClose(); // Close the panel
      console.log('🔍 Panel closed');
      
      console.log('🔍 Attempting navigation with full page reload...');
      // Force full page navigation to ensure immediate rendering
      window.location.href = `/${projectId}`;
      console.log('✅ Navigation initiated!');
      
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      // Set error state instead of using alert
      setProjectsError(`Failed to navigate to project ${projectId}. Please try again.`);
      setIsNavigating(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return {
    projects,
    projectsLoading,
    projectsError,
    deleting,
    isNavigating,
    currentProject,
    loadProjects,
    deleteProject,
    handleProjectSelect,
  };
}