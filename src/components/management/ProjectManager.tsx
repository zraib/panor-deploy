'use client';

import { useState, useEffect } from 'react';
import styles from './ProjectManager.module.css';

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sceneCount: number;
  hasConfig: boolean;
}

interface ProjectManagerProps {
  currentProject?: string;
  onProjectSelect: (projectId: string) => void;
  onProjectCreate: () => void;
}

export default function ProjectManager({
  currentProject,
  onProjectSelect,
  onProjectCreate,
}: ProjectManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      const data = await response.json();
      setProjects(data.projects);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      setCreating(true);
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectName: newProjectName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const data = await response.json();
      setProjects(prev => [data.project, ...prev]);
      setNewProjectName('');
      setShowCreateForm(false);
      onProjectCreate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRequest = (project: Project) => {
    setProjectToDelete(project);
    setShowConfirmModal(true);
  };

  const confirmDeletion = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id);
    }
    setShowConfirmModal(false);
    setProjectToDelete(null);
  };

  const cancelDeletion = () => {
    setShowConfirmModal(false);
    setProjectToDelete(null);
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

      // If we deleted the current project, clear selection
      if (currentProject === projectId) {
        onProjectSelect('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <>
      {showConfirmModal && projectToDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Confirm Deletion</h2>
            <p className={styles.modalMessage}>
              Are you sure you want to delete the project "<strong>{projectToDelete.name}</strong>"? This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button onClick={cancelDeletion} className={`${styles.modalButton} ${styles.cancelButton}`}>
                Cancel
              </button>
              <button onClick={confirmDeletion} className={`${styles.modalButton} ${styles.confirmButton}`}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Projects</h3>
        <button
          className={styles.createButton}
          onClick={() => setShowCreateForm(true)}
          title='Create new project'
        >
          +
        </button>
      </div>

      {showCreateForm && (
        <div className={styles.createForm}>
          <input
            type='text'
            placeholder='Project name'
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && createProject()}
            className={styles.createInput}
            autoFocus
          />
          <div className={styles.createActions}>
            <button
              onClick={createProject}
              disabled={creating || !newProjectName.trim()}
              className={styles.createConfirm}
            >
              {creating ? '...' : '✓'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewProjectName('');
              }}
              className={styles.createCancel}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={loadProjects} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading projects...</div>
      ) : (
        <div className={styles.projectList}>
          {projects.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No projects yet</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className={styles.emptyCreateButton}
              >
                Create your first project
              </button>
            </div>
          ) : (
            projects.map(project => (
              <div
                key={project.id}
                className={`${styles.projectItem} ${
                  currentProject === project.id ? styles.active : ''
                }`}
              >
                <div
                  className={styles.projectInfo}
                  onClick={() => onProjectSelect(project.id)}
                >
                  <div className={styles.projectName}>{project.name}</div>
                  <div className={styles.projectMeta}>
                    <span className={styles.sceneCount}>
                      {project.sceneCount} scenes
                    </span>
                    <span className={styles.projectDate}>
                      {formatDate(project.updatedAt)}
                    </span>
                  </div>
                  {!project.hasConfig && (
                    <div className={styles.noConfig}>No config</div>
                  )}
                </div>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteRequest(project)}
                  disabled={deleting === project.id}
                  title='Delete project'
                >
                  {deleting === project.id ? '...' : '🗑️'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className={styles.footer}>
        <button onClick={loadProjects} className={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>
    </div>
  </>
  );
}
