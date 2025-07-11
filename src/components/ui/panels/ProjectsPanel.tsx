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
      <div className={styles.projectsContent}>
        {/* Create Project Button */}
        <button
          className={styles.actionButton}
          onClick={() => {
            console.log('🔄 Create New Project clicked');
            onPanelClose();
            console.log('🔄 Panel closed, navigating to upload...');
            // Force full page navigation to ensure immediate rendering
            window.location.href = '/upload';
          }}
          style={{ marginBottom: '16px' }}
        >
          + Create New Project
        </button>

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onPanelClose();
                      // Force full page navigation to ensure immediate rendering
                      window.location.href = `/upload?project=${encodeURIComponent(project.id)}`;
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px',
                      cursor: 'pointer',
                      color: 'rgba(255, 255, 255, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title='Edit project'
                  >
                    <svg
                      width='12'
                      height='12'
                      viewBox='0 0 24 24'
                      fill='none'
                    >
                      <path
                        d='M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                      <path
                        d='M18.5 2.50023C18.8978 2.1024 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.1024 21.5 2.50023C21.8978 2.89805 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.1024 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteProject(project.id);
                    }}
                    disabled={deleting === project.id}
                    style={{
                      background: 'rgba(255, 107, 107, 0.2)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px',
                      cursor: deleting === project.id ? 'not-allowed' : 'pointer',
                      color: '#ff6b6b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: deleting === project.id ? 0.5 : 1,
                    }}
                    title='Delete project'
                  >
                    {deleting === project.id ? (
                      <div style={{ width: '12px', height: '12px', fontSize: '10px' }}>...</div>
                    ) : (
                      <svg
                        width='12'
                        height='12'
                        viewBox='0 0 24 24'
                        fill='none'
                      >
                        <path
                          d='M3 6H5H21'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                        <path
                          d='M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    )}
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