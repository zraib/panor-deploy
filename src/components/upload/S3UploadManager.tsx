import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import styles from './S3UploadManager.module.css';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  url?: string;
  error?: string;
}

interface S3UploadManagerProps {
  projectId: string;
  onUploadComplete?: (results: any) => void;
  onUploadProgress?: (progress: number) => void;
  maxFiles?: number;
  acceptedFileTypes?: string[];
}

const S3UploadManager: React.FC<S3UploadManagerProps> = ({
  projectId,
  onUploadComplete,
  onUploadProgress,
  maxFiles = 100,
  acceptedFileTypes = [
    'image/jpeg',
    'image/png',
    'text/csv',
    'application/json',
    'application/pdf',
    'video/mp4',
    'video/webm'
  ]
}) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: 'pending',
      progress: 0
    }));

    setUploadFiles(prev => {
      const combined = [...prev, ...newFiles];
      return combined.slice(0, maxFiles); // Limit total files
    });
  }, [maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles,
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleUploadFiles = async () => {
    if (uploadFiles.length === 0 || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Group files by type for better organization
      const fileGroups = {
        panoramas: uploadFiles.filter(f => 
          f.file.type.startsWith('image/') && 
          (f.file.name.toLowerCase().includes('pano') || f.file.name.toLowerCase().includes('panorama'))
        ),
        csv: uploadFiles.filter(f => f.file.name.toLowerCase().endsWith('.csv')),
        config: uploadFiles.filter(f => f.file.name.toLowerCase().endsWith('.json')),
        poi: uploadFiles.filter(f => 
          !f.file.name.toLowerCase().includes('pano') && 
          !f.file.name.toLowerCase().endsWith('.csv') && 
          !f.file.name.toLowerCase().endsWith('.json')
        )
      };

      let completedUploads = 0;
      const totalFiles = uploadFiles.length;
      const results: any[] = [];

      // Upload files in batches by type
      for (const [fileType, files] of Object.entries(fileGroups)) {
        if (files.length === 0) continue;

        const formData = new FormData();
        formData.append('projectId', projectId);

        files.forEach((uploadFile, index) => {
          formData.append(`file`, uploadFile.file);
          // Update status to uploading
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
          ));
        });

        try {
          const response = await axios.post('/api/s3-batch-upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const fileProgress = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                
                // Update individual file progress
                files.forEach(uploadFile => {
                  setUploadFiles(prev => prev.map(f => 
                    f.id === uploadFile.id ? { ...f, progress: fileProgress } : f
                  ));
                });
              }
            },
          });

          // Update file statuses based on response
          if (response.data.results) {
            Object.values(response.data.results).flat().forEach((result: any) => {
              const uploadFile = files.find(f => f.file.name === result.filename);
              if (uploadFile) {
                setUploadFiles(prev => prev.map(f => 
                  f.id === uploadFile.id ? {
                    ...f,
                    status: 'success',
                    progress: 100,
                    url: result.url
                  } : f
                ));
                completedUploads++;
              }
            });
          }

          // Handle errors
          if (response.data.errors) {
            response.data.errors.forEach((error: any) => {
              const uploadFile = files.find(f => f.file.name === error.filename);
              if (uploadFile) {
                setUploadFiles(prev => prev.map(f => 
                  f.id === uploadFile.id ? {
                    ...f,
                    status: 'error',
                    error: error.error
                  } : f
                ));
              }
            });
          }

          results.push(response.data);

        } catch (error) {
          console.error(`Failed to upload ${fileType} files:`, error);
          
          // Mark all files in this group as failed
          files.forEach(uploadFile => {
            setUploadFiles(prev => prev.map(f => 
              f.id === uploadFile.id ? {
                ...f,
                status: 'error',
                error: 'Upload failed'
              } : f
            ));
          });
        }

        // Update overall progress
        const overallProgress = Math.round((completedUploads / totalFiles) * 100);
        setUploadProgress(overallProgress);
        onUploadProgress?.(overallProgress);
      }

      // Check if we have CSV and panorama files to generate config
      const hasCSV = results.some(r => r.summary?.csv > 0);
      const hasPanoramas = results.some(r => r.summary?.panoramas > 0);

      if (hasCSV && hasPanoramas) {
        try {
          const configResponse = await axios.post('/api/generate-config', {
            projectId
          });
          
          if (configResponse.data.success) {
            results.push({
              type: 'config-generation',
              ...configResponse.data
            });
          }
        } catch (configError) {
          console.error('Config generation failed:', configError);
        }
      }

      onUploadComplete?.({
        success: true,
        results,
        totalFiles,
        completedUploads
      });

    } catch (error) {
      console.error('Upload process failed:', error);
      onUploadComplete?.({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getFileTypeIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.name.endsWith('.csv')) return '📊';
    if (file.name.endsWith('.json')) return '⚙️';
    if (file.type === 'application/pdf') return '📄';
    if (file.type.startsWith('video/')) return '🎥';
    return '📁';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'uploading': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <div className={styles.container}>
      <div 
        {...getRootProps()} 
        className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
      >
        <input {...getInputProps()} />
        <div className={styles.dropzoneContent}>
          <div className={styles.uploadIcon}>📁</div>
          <p className={styles.dropzoneText}>
            {isDragActive
              ? 'Drop the files here...'
              : 'Drag & drop files here, or click to select files'
            }
          </p>
          <p className={styles.dropzoneSubtext}>
            Supports: Images (JPG, PNG), CSV, JSON, PDF, Videos (MP4, WebM)
          </p>
        </div>
      </div>

      {uploadFiles.length > 0 && (
        <div className={styles.fileList}>
          <div className={styles.fileListHeader}>
            <h3>Selected Files ({uploadFiles.length})</h3>
            <button 
              onClick={handleUploadFiles}
              disabled={isUploading}
              className={styles.uploadButton}
            >
              {isUploading ? 'Uploading...' : 'Upload All Files'}
            </button>
          </div>

          {isUploading && (
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${uploadProgress}%` }}
              />
              <span className={styles.progressText}>{uploadProgress}%</span>
            </div>
          )}

          <div className={styles.files}>
            {uploadFiles.map((uploadFile) => (
              <div key={uploadFile.id} className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  <span className={styles.fileIcon}>
                    {getFileTypeIcon(uploadFile.file)}
                  </span>
                  <div className={styles.fileDetails}>
                    <div className={styles.fileName}>{uploadFile.file.name}</div>
                    <div className={styles.fileSize}>
                      {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>

                <div className={styles.fileStatus}>
                  <div 
                    className={styles.statusIndicator}
                    style={{ backgroundColor: getStatusColor(uploadFile.status) }}
                  />
                  <span className={styles.statusText}>
                    {uploadFile.status === 'uploading' 
                      ? `${uploadFile.progress}%` 
                      : uploadFile.status
                    }
                  </span>
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <div className={styles.errorText}>{uploadFile.error}</div>
                  )}
                </div>

                {uploadFile.status === 'pending' && (
                  <button 
                    onClick={() => removeFile(uploadFile.id)}
                    className={styles.removeButton}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default S3UploadManager;