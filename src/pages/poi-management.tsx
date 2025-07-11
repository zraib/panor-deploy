import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '@/styles/Upload.module.css';
import { POIData } from '@/types/poi';
import POIFileManager, { exportPOI } from '@/components/poi/POIFileManager';

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sceneCount: number;
  hasConfig: boolean;
}

interface ProjectPOIs {
  projectId: string;
  projectName: string;
  pois: POIData[];
  sceneCount: number;
}

export default function POIManagement() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectPOIs, setProjectPOIs] = useState<ProjectPOIs[]>([]);
  const [referrerUrl, setReferrerUrl] = useState<string>('/');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [deletingPOI, setDeletingPOI] = useState<string | null>(null);
  const [useIndividualFiles, setUseIndividualFiles] = useState(false);
  const [fileManagerMessage, setFileManagerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Capture referrer information
    const referrer = document.referrer;
    const urlParams = new URLSearchParams(window.location.search);
    const fromProject = urlParams.get('from');
    const fromScene = urlParams.get('scene');

    if (fromProject && fromScene) {
      setReferrerUrl(`/${fromProject}?scene=${fromScene}`);
    } else if (fromProject) {
      setReferrerUrl(`/${fromProject}`);
    } else if (referrer && referrer.includes(window.location.origin)) {
      // If referrer is from the same origin, use it
      const referrerPath = referrer.replace(window.location.origin, '');
      setReferrerUrl(referrerPath || '/');
    }

    loadProjectsAndPOIs();
  }, []);

  const loadProjectsAndPOIs = async () => {
    setIsLoading(true);
    try {
      // Load all projects
      const projectsResponse = await fetch('/api/projects');
      if (!projectsResponse.ok) {
        throw new Error('Failed to load projects');
      }
      const projectsData = await projectsResponse.json();
      setProjects(projectsData.projects || []);

      // Load POIs for each project
      const allProjectPOIs: ProjectPOIs[] = [];
      for (const project of projectsData.projects || []) {
        try {
          // Try loading from individual files first
          const individualResponse = await fetch(
            `/api/poi/load-individual?projectId=${encodeURIComponent(project.id)}&useIndividual=${useIndividualFiles}`
          );
          
          if (individualResponse.ok) {
            const poisData = await individualResponse.json();
            if (poisData.pois && poisData.pois.length > 0) {
              allProjectPOIs.push({
                projectId: project.id,
                projectName: project.name,
                pois: poisData.pois,
                sceneCount: project.sceneCount,
              });
              setUseIndividualFiles(poisData.source === 'individual');
            }
          } else {
            // Fallback to main file
            const poisResponse = await fetch(
              `/api/poi/load?projectId=${encodeURIComponent(project.id)}`
            );
            if (poisResponse.ok) {
              const poisData = await poisResponse.json();
              if (poisData.pois && poisData.pois.length > 0) {
                allProjectPOIs.push({
                  projectId: project.id,
                  projectName: project.name,
                  pois: poisData.pois,
                  sceneCount: project.sceneCount,
                });
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to load POIs for project ${project.id}:`, error);
        }
      }
      setProjectPOIs(allProjectPOIs);

      const totalPOIs = allProjectPOIs.reduce(
        (sum, project) => sum + project.pois.length,
        0
      );
      setMessage(
        `✅ Loaded ${totalPOIs} POIs from ${allProjectPOIs.length} projects`
      );
    } catch (error) {
      console.error('Failed to load projects and POIs:', error);
      setMessage('❌ Failed to load POI data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePOI = async (projectId: string, poiId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this POI? This action cannot be undone.'
      )
    ) {
      return;
    }

    setDeletingPOI(poiId);
    try {
      const response = await fetch('/api/poi/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId, poiId, useIndividual: useIndividualFiles }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete POI');
      }

      // Refresh the POI data
      await loadProjectsAndPOIs();
      setMessage('✅ POI deleted successfully');
    } catch (error) {
      console.error('Failed to delete POI:', error);
      setMessage('❌ Failed to delete POI. Please try again.');
    } finally {
      setDeletingPOI(null);
    }
  };

  const toggleProjectDetails = (projectId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const handlePOIImported = (poi: POIData) => {
    // Refresh the POI data after import
    loadProjectsAndPOIs();
  };

  const handleExportPOI = async (poi: POIData, projectId: string) => {
    try {
      await exportPOI(projectId, poi.id, poi.name);
      setFileManagerMessage({ type: 'success', text: `POI "${poi.name}" exported successfully` });
    } catch (error) {
      setFileManagerMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to export POI' 
      });
    }
  };

  const handleFileManagerMessage = (type: 'success' | 'error', text: string) => {
    setFileManagerMessage({ type, text });
    setTimeout(() => setFileManagerMessage(null), 5000);
  };

  const handleExportAllPOIs = async (projectId: string, projectName: string) => {
    try {
      const response = await fetch(`/api/poi/export-all?projectId=${encodeURIComponent(projectId)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export POIs');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectId}-all-pois-export.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setFileManagerMessage({ 
        type: 'success', 
        text: `All POIs from "${projectName}" exported successfully` 
      });
    } catch (error) {
      setFileManagerMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to export all POIs' 
      });
    }
  };

  const filteredProjectPOIs = projectPOIs.filter(project => {
    if (selectedProject !== 'all' && project.projectId !== selectedProject) {
      return false;
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return project.pois.some(
        poi =>
          poi.name.toLowerCase().includes(searchLower) ||
          poi.description.toLowerCase().includes(searchLower) ||
          poi.type.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const totalPOIs = filteredProjectPOIs.reduce(
    (sum, project) => sum + project.pois.length,
    0
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'file':
        return '📎';
      case 'iframe':
        return '🌐';
      default:
        return '📍';
    }
  };

  return (
    <div className={styles.container}>
      {/* Logo */}
      <div className={styles.logoContainer}>
        <img
          src='/assets/svg/primezone-logo.svg'
          alt='PrimeZone Logo'
          className={styles.logo}
        />
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <button
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push(referrerUrl);
              }
            }}
            className={styles.backLink}
          >
            ← Back to Panorama Viewer
          </button>
          <h1 className={styles.title}>POI Management</h1>
        </div>

        {fileManagerMessage && (
          <div
            className={`${styles.message} ${
              fileManagerMessage.type === 'error'
                ? styles.messageError
                : styles.messageSuccess
            }`}
          >
            {fileManagerMessage.text}
          </div>
        )}

        {/* POI File Manager */}
        {selectedProject !== 'all' && (
          <POIFileManager
            projectId={selectedProject}
            onPOIImported={handlePOIImported}
            onError={(error) => handleFileManagerMessage('error', error)}
            onSuccess={(message) => handleFileManagerMessage('success', message)}
          />
        )}

        <div className={styles.form}>
          <div className={styles.label}>Point of Interest Management</div>
          <p className={styles.inputHint}>
            Manage and view all Points of Interest across your panorama
            projects. Filter by project, search by keywords, and perform bulk
            operations.
          </p>

          {/* Filters */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '32px',
            }}
          >
            <div>
              <label
                className={styles.label}
                style={{
                  fontSize: '1rem',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Filter by Project
              </label>
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className={styles.textInput}
              >
                <option value='all'>All Projects ({projectPOIs.length})</option>
                {projects.map(project => {
                  const projectPOICount =
                    projectPOIs.find(p => p.projectId === project.id)?.pois
                      .length || 0;
                  return (
                    <option key={project.id} value={project.id}>
                      {project.name} ({projectPOICount} POIs)
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label
                className={styles.label}
                style={{
                  fontSize: '1rem',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Search POIs
              </label>
              <input
                type='text'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder='Search by name, description, or type...'
                className={styles.textInput}
              />
            </div>
          </div>

          {/* Summary */}
          {!isLoading && (
            <div className={styles.fileSummary}>
              <h3 className={styles.summaryTitle}>POI Summary</h3>
              <div className={styles.summaryContent}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryIcon}></span>
                  <span className={styles.summaryText}>
                    {totalPOIs} POI{totalPOIs !== 1 ? 's' : ''} found
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryIcon}></span>
                  <span className={styles.summaryText}>
                    {filteredProjectPOIs.length} project
                    {filteredProjectPOIs.length !== 1 ? 's' : ''} with POIs
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '32px',
              marginBottom: '32px',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={loadProjectsAndPOIs}
              disabled={isLoading}
              className={styles.submitButton}
            >
              {isLoading ? '🔄 Loading...' : '🔄 Refresh POI Data'}
            </button>
          </div>
        </div>

        {/* POI List */}
        {isLoading ? (
          <div className={styles.form}>
            <div
              style={{ textAlign: 'center', padding: '40px', color: '#e2e8f0' }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔄</div>
              <div>Loading POI data...</div>
            </div>
          </div>
        ) : filteredProjectPOIs.length === 0 ? (
          <div className={styles.form}>
            <div
              style={{ textAlign: 'center', padding: '40px', color: '#e2e8f0' }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>📍</div>
              <div>No POIs found</div>
              <div
                style={{ fontSize: '0.9rem', marginTop: '8px', opacity: 0.7 }}
              >
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Create some POIs in your panorama projects'}
              </div>
            </div>
          </div>
        ) : (
          filteredProjectPOIs.map(project => (
            <div
              key={project.projectId}
              className={styles.form}
              style={{ marginBottom: '24px' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '16px 0',
                  borderBottom: '2px solid rgba(255, 255, 255, 0.15)',
                  marginBottom: '20px',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => toggleProjectDetails(project.projectId)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderBottomColor =
                    'rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderBottomColor =
                    'rgba(255, 255, 255, 0.15)';
                }}
              >
                <div>
                  <h3
                    style={{ margin: 0, color: '#e2e8f0', fontSize: '1.2rem' }}
                  >
                    {project.projectName}
                  </h3>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginTop: '4px',
                    }}
                  >
                    {project.pois.length} POI
                    {project.pois.length !== 1 ? 's' : ''} •{' '}
                    {project.sceneCount} scene
                    {project.sceneCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleExportAllPOIs(project.projectId, project.projectName);
                    }}
                    className={styles.backLink}
                    style={{ 
                      fontSize: '0.85rem', 
                      padding: '6px 12px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      borderColor: 'rgba(34, 197, 94, 0.4)',
                      color: '#22c55e'
                    }}
                    title={`Export all ${project.pois.length} POIs from this project`}
                  >
                    📦 Export All
                  </button>
                  <Link
                    href={`/${project.projectId}`}
                    className={styles.backLink}
                    style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                    onClick={e => e.stopPropagation()}
                  >
                    View Project
                  </Link>
                  <span style={{ color: '#e2e8f0', fontSize: '1.2rem' }}>
                    {showDetails[project.projectId] ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {showDetails[project.projectId] && (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {project.pois.map(poi => (
                    <div
                      key={poi.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        padding: '20px',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background =
                          'rgba(255, 255, 255, 0.12)';
                        e.currentTarget.style.borderColor =
                          'rgba(255, 255, 255, 0.25)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow =
                          '0 4px 16px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background =
                          'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor =
                          'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow =
                          '0 2px 8px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '12px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '8px',
                            }}
                          >
                            <span style={{ fontSize: '1.2rem' }}>
                              {getFileIcon(poi.type)}
                            </span>
                            <h4
                              style={{
                                margin: 0,
                                color: '#e2e8f0',
                                fontSize: '1rem',
                              }}
                            >
                              {poi.name}
                            </h4>
                            <span
                              style={{
                                background:
                                  poi.type === 'file'
                                    ? 'rgba(34, 197, 94, 0.2)'
                                    : 'rgba(59, 130, 246, 0.2)',
                                color:
                                  poi.type === 'file' ? '#10b981' : '#3b82f6',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                              }}
                            >
                              {poi.type.toUpperCase()}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: '0 0 8px 0',
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '0.9rem',
                            }}
                          >
                            {poi.description}
                          </p>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: 'rgba(255, 255, 255, 0.5)',
                            }}
                          >
                            <div>📍 Panorama: {poi.panoramaId}</div>
                            <div>📅 Created: {formatDate(poi.createdAt)}</div>
                            {poi.content && (
                              <div>🔗 Content: {poi.content}</div>
                            )}
                          </div>
                        </div>
                        <div
                            style={{
                              display: 'flex',
                              gap: '12px',
                              marginLeft: '16px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <Link
                              href={`/${project.projectId}?scene=${poi.panoramaId}`}
                              className={styles.backLink}
                              style={{
                                fontSize: '0.9rem',
                                padding: '10px 18px',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.transform =
                                  'translateY(-1px)';
                                e.currentTarget.style.boxShadow =
                                  '0 4px 12px rgba(16, 185, 129, 0.4)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow =
                                  '0 2px 6px rgba(16, 185, 129, 0.3)';
                              }}
                            >
                              👁️ View
                            </Link>
                            <button
                              onClick={() => handleExportPOI(poi, project.projectId)}
                              style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '10px 18px',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(59, 130, 246, 0.3)';
                              }}
                            >
                              📤 Export
                            </button>
                            <button
                              onClick={() =>
                                handleDeletePOI(project.projectId, poi.id)
                              }
                              disabled={deletingPOI === poi.id}
                              style={{
                                background:
                                  deletingPOI === poi.id
                                    ? 'rgba(107, 114, 128, 0.5)'
                                    : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '10px 18px',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                cursor:
                                  deletingPOI === poi.id
                                    ? 'not-allowed'
                                    : 'pointer',
                                opacity: deletingPOI === poi.id ? 0.6 : 1,
                                transition: 'all 0.2s ease',
                                boxShadow:
                                  deletingPOI === poi.id
                                    ? 'none'
                                    : '0 2px 6px rgba(239, 68, 68, 0.3)',
                              }}
                              onMouseEnter={e => {
                                if (deletingPOI !== poi.id) {
                                  e.currentTarget.style.transform =
                                    'translateY(-1px)';
                                  e.currentTarget.style.boxShadow =
                                    '0 4px 12px rgba(239, 68, 68, 0.4)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (deletingPOI !== poi.id) {
                                  e.currentTarget.style.transform =
                                    'translateY(0)';
                                  e.currentTarget.style.boxShadow =
                                    '0 2px 6px rgba(239, 68, 68, 0.3)';
                                }
                              }}
                            >
                              {deletingPOI === poi.id
                                ? '⏳ Deleting...'
                                : '🗑️ Delete'}
                            </button>
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* Message Display */}
        {message && (
          <div
            className={`${styles.message} ${
              message.includes('❌') || message.includes('Failed')
                ? styles.messageError
                : styles.messageSuccess
            }`}
          >
            {message}
          </div>
        )}

        {/* Instructions */}
        <div className={styles.instructions}>
          <h3 className={styles.instructionsTitle}>Instructions:</h3>
          <ol className={styles.instructionsList}>
            <li>Use the project filter to view POIs from specific projects</li>
            <li>Search for POIs by name, description, or type</li>
            <li>Click on project headers to expand/collapse POI details</li>
            <li>Use "View" to navigate to the POI in the panorama viewer</li>
            <li>
              Use "Delete" to permanently remove POIs (this cannot be undone)
            </li>
            <li>
              Click "View Project" to open the project in the panorama viewer
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
