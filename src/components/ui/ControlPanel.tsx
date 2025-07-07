'use client';

import React, { useState, ReactElement, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './ControlPanel.module.css';
import { SceneData } from '@/types/scenes';

interface ControlButtonProps {
  id: string;
  icon: ReactElement;
  expandedPanel: string | null;
  onToggle: (panelId: string) => void;
  onMouseEnter: (panelId: string) => void;
  onMouseLeave: () => void;
  children: ReactElement;
  className?: string;
  style?: React.CSSProperties;
}

function ControlButton({
  id,
  icon,
  expandedPanel,
  onToggle,
  onMouseEnter,
  onMouseLeave,
  children,
  className = styles.iconButton,
  style,
}: ControlButtonProps): ReactElement {
  return (
    <div
      className={styles.controlItem}
      onMouseEnter={() => onMouseEnter(id)}
      onMouseLeave={onMouseLeave}
    >
      <button className={className} style={style} onClick={() => onToggle(id)}>
        {icon}
      </button>
      {expandedPanel === id && (
        <div
          onMouseLeave={onMouseLeave}
          className={styles.expandedPanelContainer}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface PerformanceStats {
  loadedScenes: number;
  memoryUsage: string;
  avgLoadTime: number;
}

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sceneCount: number;
  hasConfig: boolean;
}

interface ControlPanelProps {
  // Floor Selector props
  scenes?: SceneData[];
  currentScene?: SceneData | null;
  onFloorChange?: (sceneId: string) => void;

  // Performance Monitor props
  performanceStats?: PerformanceStats;
  totalScenes?: number;
  onOptimize?: () => void;
}

export default function ControlPanel({
  scenes = [],
  currentScene,
  onFloorChange,
  performanceStats,
  totalScenes = 0,
  onOptimize,
}: ControlPanelProps): ReactElement {
  const router = useRouter();
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [hoveredPanel, setHoveredPanel] = useState<string | null>(null);

  // Project management state
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const currentProject = router.query.projectId as string;
  const [floors, setFloors] = useState<number[]>([]);

  // Floor Selector logic
  React.useEffect(() => {
    if (scenes.length > 0) {
      const uniqueFloors = [...new Set(scenes.map(s => s.floor))].sort(
        (a, b) => a - b
      );
      setFloors(uniqueFloors);
    }
  }, [scenes]);

  // Project management functions
  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      const data = await response.json();
      setProjects(data.projects);
      setProjectsError(null);
    } catch (err: any) {
      setProjectsError(err.message);
    } finally {
      setProjectsLoading(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (
      !confirm(
        `Are you sure you want to delete project "${projectId}"? This action cannot be undone.`
      )
    ) {
      return;
    }

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

  const handleProjectSelect = (projectId: string) => {
    router.push(`/${projectId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handlePanelToggle = (panelId: string) => {
    setExpandedPanel(expandedPanel === panelId ? null : panelId);
  };

  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (panelId: string) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setExpandedPanel(panelId);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setExpandedPanel(null);
    }, 200); // 200ms delay
    setHoverTimeout(timeout);
  };

  const getFloorLabel = (floor: number): string => {
    if (floor === 0) return 'Ground Floor';
    if (floor > 0) return `Level ${floor}`;
    return `Basement ${Math.abs(floor)}`;
  };

  const handleFloorClick = (floor: number) => {
    if (!onFloorChange) return;

    const floorScenes = scenes.filter(s => s.floor === floor);
    if (!floorScenes.length) return;

    if (!currentScene) {
      onFloorChange(floorScenes[0].id);
      return;
    }

    let closest = floorScenes[0];
    let minDist = Infinity;

    floorScenes.forEach(scene => {
      const dx = scene.position.x - currentScene.position.x;
      const dy = scene.position.y - currentScene.position.y;
      const dz = scene.position.z - currentScene.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < minDist) {
        minDist = dist;
        closest = scene;
      }
    });

    onFloorChange(closest.id);
    setExpandedPanel(null); // Close panel after selection
  };

  const getPerformanceLevel = () => {
    if (!performanceStats) return { level: 'unknown', color: '#666' };
    const loadRatio = performanceStats.loadedScenes / totalScenes;
    if (loadRatio < 0.05) return { level: 'excellent', color: '#4CAF50' };
    if (loadRatio < 0.1) return { level: 'good', color: '#8BC34A' };
    if (loadRatio < 0.2) return { level: 'fair', color: '#FF9800' };
    return { level: 'poor', color: '#F44336' };
  };

  const performance = getPerformanceLevel();

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div className={styles.controlPanel}>
      {/* Projects */}
      <ControlButton
        id='projects'
        expandedPanel={expandedPanel}
        onToggle={handlePanelToggle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        icon={
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
        }
      >
        <div className={styles.expandedPanel}>
          <div
            className={styles.header}
            onClick={() => handlePanelToggle('projects')}
          >
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
              onClick={() => setExpandedPanel(null)}
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
                {projects.map(project => (
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
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      if (currentProject !== project.id) {
                        e.currentTarget.style.background =
                          'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor =
                          'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (currentProject !== project.id) {
                        e.currentTarget.style.background =
                          'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor =
                          'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateX(0px)';
                      }
                    }}
                    onClick={() => handleProjectSelect(project.id)}
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
                        {formatDate(project.updatedAt)} • {project.sceneCount}{' '}
                        scenes
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Link
                        href={`/upload?project=${encodeURIComponent(project.id)}`}
                        onClick={e => {
                          e.stopPropagation();
                          setExpandedPanel(null);
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
                          cursor:
                            deleting === project.id ? 'not-allowed' : 'pointer',
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
      </ControlButton>

      {/* Floor Selector */}
      {scenes.length > 0 && (
        <ControlButton
          id='floors'
          expandedPanel={expandedPanel}
          onToggle={handlePanelToggle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          icon={
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M4 20H10V14H16V8H20'
                stroke='white'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          }
        >
          <div className={styles.expandedPanel}>
            <div
              className={styles.header}
              onClick={() => handlePanelToggle('floors')}
            >
              <div className={styles.icon}>
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M3 7V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V7'
                    stroke='white'
                    strokeWidth='2'
                    fill='none'
                  />
                  <path
                    d='M21 7L12 2L3 7'
                    stroke='white'
                    strokeWidth='2'
                    fill='none'
                  />
                  <path
                    d='M9 21V12H15V21'
                    stroke='white'
                    strokeWidth='2'
                    fill='none'
                  />
                </svg>
              </div>
              <span className={styles.text}>
                Floor:{' '}
                {currentScene ? getFloorLabel(currentScene.floor) : 'None'}
              </span>
            </div>
            <div className={styles.content}>
              <div className={styles.floorButtons}>
                {floors.map(floor => (
                  <button
                    key={floor}
                    className={`${styles.floorButton} ${currentScene?.floor === floor ? styles.active : ''}`}
                    onClick={() => handleFloorClick(floor)}
                  >
                    {getFloorLabel(floor)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ControlButton>
      )}

      {/* Performance Monitor */}
      {performanceStats && (
        <ControlButton
          id='performance'
          expandedPanel={expandedPanel}
          onToggle={handlePanelToggle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          icon={
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M3 12H6L9 3L15 21L18 12H21'
                stroke='white'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          }
        >
          <div className={styles.expandedPanel}>
            <div
              className={styles.header}
              onClick={() => handlePanelToggle('performance')}
            >
              <div className={styles.icon}>
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    d='M3 3V21H21'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M9 9L12 6L16 10L20 6'
                    stroke='white'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>
              <span className={styles.text}>Performance</span>
            </div>
            <div className={styles.content}>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <label>Loaded Scenes</label>
                  <span>
                    {performanceStats.loadedScenes} / {totalScenes}
                  </span>
                  <div className={styles.bar}>
                    <div
                      className={styles.fill}
                      style={{
                        width: `${(performanceStats.loadedScenes / totalScenes) * 100}%`,
                        backgroundColor: performance.color,
                      }}
                    />
                  </div>
                </div>
                <div className={styles.stat}>
                  <label>Memory Usage</label>
                  <span>{performanceStats.memoryUsage}</span>
                </div>
                <div className={styles.stat}>
                  <label>Avg Load Time</label>
                  <span>{performanceStats.avgLoadTime}ms</span>
                </div>
              </div>
              {onOptimize && (
                <button
                  className={styles.optimizeButton}
                  onClick={() => {
                    onOptimize && onOptimize();
                    setExpandedPanel(null);
                  }}
                >
                  Optimize Performance
                </button>
              )}
            </div>
          </div>
        </ControlButton>
      )}
    </div>
  );
}