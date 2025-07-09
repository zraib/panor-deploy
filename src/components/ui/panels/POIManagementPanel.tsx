'use client';

import React, { useState, useEffect } from 'react';
import styles from '../ControlPanel.module.css';
import { POIData } from '@/types/poi';

interface POIManagementPanelProps {
  projectId: string;
  currentPanoramaId: string;
  onPanelClose: () => void;
  onPOIEdit?: (poi: POIData) => void;
  onPOIDelete?: (poiId: string) => void;
}

export function POIManagementPanel({
  projectId,
  currentPanoramaId,
  onPanelClose,
  onPOIEdit,
  onPOIDelete,
}: POIManagementPanelProps) {
  const [pois, setPois] = useState<POIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load POIs for current panorama
  const loadPOIs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/poi/load?projectId=${encodeURIComponent(projectId)}&panoramaId=${encodeURIComponent(currentPanoramaId)}`
      );

      if (response.ok) {
        const data = await response.json();
        setPois(data.pois || []);
      } else if (response.status === 404) {
        // No POIs found, start with empty array
        setPois([]);
      } else {
        throw new Error('Failed to load POIs');
      }
    } catch (err) {
      console.error('Error loading POIs:', err);
      setError('Failed to load POIs');
      setPois([]);
    } finally {
      setLoading(false);
    }
  };

  // Delete POI
  const handleDeletePOI = async (poiId: string) => {
    try {
      const response = await fetch('/api/poi/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          panoramaId: currentPanoramaId,
          poiId,
        }),
      });

      if (response.ok) {
        setPois(prev => prev.filter(poi => poi.id !== poiId));
        if (onPOIDelete) {
          onPOIDelete(poiId);
        }
      } else {
        throw new Error('Failed to delete POI');
      }
    } catch (err) {
      console.error('Error deleting POI:', err);
      setError('Failed to delete POI');
    }
  };

  // Handle POI edit
  const handleEditPOI = (poi: POIData) => {
    if (onPOIEdit) {
      onPOIEdit(poi);
    }
    onPanelClose();
  };

  // Load POIs when component mounts or panorama changes
  useEffect(() => {
    if (projectId && currentPanoramaId) {
      loadPOIs();
    }
  }, [projectId, currentPanoramaId]);

  // Get POI type icon
  const getPOITypeIcon = (type: string) => {
    switch (type) {
      case 'file':
        return (
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none'>
            <path
              d='M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z'
              stroke='currentColor'
              strokeWidth='2'
              fill='none'
            />
            <path
              d='M14 2V8H20'
              stroke='currentColor'
              strokeWidth='2'
              fill='none'
            />
          </svg>
        );
      case 'iframe':
        return (
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none'>
            <circle
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='2'
              fill='none'
            />
            <path d='M2 12H22' stroke='currentColor' strokeWidth='2' />
            <path
              d='M12 2C14.5 4.5 16 8.5 16 12S14.5 19.5 12 22C9.5 19.5 8 15.5 8 12S9.5 4.5 12 2Z'
              stroke='currentColor'
              strokeWidth='2'
              fill='none'
            />
          </svg>
        );
      default:
        return (
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none'>
            <path
              d='M21 10C21 17 12 23 12 23S3 17 3 10C3 5.03 7.03 1 12 1S21 5.03 21 10Z'
              stroke='currentColor'
              strokeWidth='2'
              fill='none'
            />
            <circle
              cx='12'
              cy='10'
              r='3'
              stroke='currentColor'
              strokeWidth='2'
              fill='none'
            />
          </svg>
        );
    }
  };

  return (
    <div className={styles.expandedPanel}>
      <div className={styles.header}>
        <div className={styles.icon}>
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none'>
            <path
              d='M21 10C21 17 12 23 12 23S3 17 3 10C3 5.03 7.03 1 12 1S21 5.03 21 10Z'
              stroke='currentColor'
              strokeWidth='2'
              fill='none'
            />
            <circle
              cx='12'
              cy='10'
              r='3'
              stroke='currentColor'
              strokeWidth='2'
              fill='none'
            />
          </svg>
        </div>
        <div className={styles.text}>POI Management</div>
      </div>

      <div className={styles.content}>
        <p className={styles.description}>
          Manage Points of Interest for the current panorama. Right-click on the
          panorama to create new POIs.
        </p>

        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '20px',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            Loading POIs...
          </div>
        )}

        {error && (
          <div style={{ color: '#ff6b6b', padding: '10px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {pois.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                No POIs found for this panorama.
                <br />
                Right-click on the panorama to create one.
              </div>
            ) : (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {pois.map(poi => (
                  <div
                    key={poi.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {getPOITypeIcon(poi.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: '500',
                          color: 'white',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {poi.name}
                      </div>
                      {poi.description && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {poi.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleEditPOI(poi)}
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
                        title='Edit POI'
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
                        onClick={() => handleDeletePOI(poi.id)}
                        style={{
                          background: 'rgba(255, 107, 107, 0.2)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px',
                          cursor: 'pointer',
                          color: '#ff6b6b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title='Delete POI'
                      >
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
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={loadPOIs}
              className={styles.actionButton}
              style={{ marginTop: '12px' }}
            >
              Refresh POIs
            </button>
          </>
        )}
      </div>
    </div>
  );
}
