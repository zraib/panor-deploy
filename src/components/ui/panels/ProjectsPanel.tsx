'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../ControlPanel.module.css';
import { useProjectsManager } from '../../../hooks/useProjectsManager';
import { useNavigation } from '../../../hooks/useNavigation';

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sceneCount: number;
  hasConfig: boolean;
}

interface ProjectsPanelProps {
  onPanelClose: () => void;
}

export function ProjectsPanel({ onPanelClose }: ProjectsPanelProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const {
    projects,
    projectsLoading,
    projectsError,
    deleting,
    isNavigating,
    loadProjects,
    deleteProject,
    handleProjectSelect,
  } = useProjectsManager();

  const currentProject = router.query.projectId as string;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.expandedPanel}>
      <div className={styles.header}>
        <div className={styles.icon}>
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M22 19C22 19.6 21.6 20 21 20H3C2.4 20 2 19.6 2 19V5C2 4.4 2.4 4 3 4H7L9 6H21C21.6 6 22 6.4 22 7V19Z'
              stroke='white'
              strokeWidth='2'
              fill='none'
            />
          </svg>
        </div>
        <span className={styles.text}>Projects</span>
      </div>
      <div className={styles.content}>
        {/* Create Project Button */}
        <Link
          href='/upload'
          className={styles.actionButton}
          onClick={onPanelClose}
          style={{ marginBottom: '16px' }}
        >
          + Create New Project
        </Link>

        {/* Error Display */}
        {projectsError && (
          <div
            style={{
              padding: '8px 12px',
              background: 'rgba(244, 67, 54, 0.2)',
              border: '1px solid rgba(244, 67, 54, 0.4)',
              borderRadius: '6px',
              color: '#ffcdd2',
              fontSize: '12px',
              marginBottom: '12px',
            }}
          >
            {projectsError}
            <button
              onClick={loadProjects}
              style={{
                marginLeft: '8px',
                padding: '2px 6px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Projects List */}
        {projectsLoading ? (
          <div
            style={{
              padding: '12px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '13px',
            }}
          >
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div
            style={{
              padding: '12px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '13px',
            }}
          >
            No projects yet
          </div>
        ) : (
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {projects.map((project: Project) => (
              <div
                key={project.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  marginBottom: '6px',
                  background:
                    currentProject === project.id
                      ? 'rgba(33, 150, 243, 0.3)'
                      : 'rgba(255, 255, 255, 0.05)',
                  border:
                    currentProject === project.id
                      ? '1px solid rgba(33, 150, 243, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  cursor: isNavigating ? 'wait' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isNavigating ? 0.7 : 1,
                  pointerEvents: isNavigating ? 'none' : 'auto',
                }}
                onMouseEnter={e => {
                  if (currentProject !== project.id && !isNavigating) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }
                }}
                onMouseLeave={e => {
                  if (currentProject !== project.id && !isNavigating) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateX(0px)';
                  }
                }}
                onClick={(e) => {
                  if (isNavigating) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  handleProjectSelect(project.id, onPanelClose);
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'white',
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {project.name}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.6)',
                    }}
                  >
                    {formatDate(project.updatedAt)} • {project.sceneCount} scenes
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Link
                    href={`/upload?project=${encodeURIComponent(project.id)}`}
                    onClick={e => {
                      e.stopPropagation();
                      onPanelClose();
                    }}
                    style={{
                      padding: '4px 6px',
                      background: 'rgba(76, 175, 80, 0.8)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title='Edit project'
                  >
                    ✏️
                  </Link>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                    disabled={deleting === project.id}
                    style={{
                      padding: '4px 6px',
                      background: 'rgba(244, 67, 54, 0.8)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      fontSize: '11px',
                      cursor: deleting === project.id ? 'not-allowed' : 'pointer',
                      opacity: deleting === project.id ? 0.5 : 1,
                    }}
                    title='Delete project'
                  >
                    {deleting === project.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}