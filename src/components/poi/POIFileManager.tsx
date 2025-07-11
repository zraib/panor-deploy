import React, { useState, useRef } from 'react';
import { POIData } from '@/types/poi';
import styles from '@/styles/Upload.module.css';

interface POIFileManagerProps {
  projectId: string;
  onPOIImported?: (poi: POIData) => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

interface ImportOptions {
  overwrite: boolean;
  generateNewId: boolean;
}

export default function POIFileManager({ 
  projectId, 
  onPOIImported, 
  onError, 
  onSuccess 
}: POIFileManagerProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    overwrite: false,
    generateNewId: false
  });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportPOI = async (poiId: string, poiName: string) => {
    try {
      const response = await fetch(
        `/api/poi/export-single?projectId=${encodeURIComponent(projectId)}&poiId=${encodeURIComponent(poiId)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export POI');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `poi-${poiName.replace(/[^a-zA-Z0-9]/g, '_')}-${poiId.substring(0, 8)}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);;
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onSuccess?.(`POI "${poiName}" exported successfully`);
    } catch (error) {
      console.error('Export error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to export POI');
    }
  };

  const handleImportPOI = async (file: File) => {
    setIsImporting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('overwrite', importOptions.overwrite.toString());
      formData.append('generateNewId', importOptions.generateNewId.toString());

      const response = await fetch('/api/poi/import-single', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // POI already exists
          const confirmOverwrite = window.confirm(
            `POI "${result.existingPOI?.name || 'Unknown'}" already exists. Do you want to overwrite it?`
          );
          
          if (confirmOverwrite) {
            // Retry with overwrite enabled
            formData.set('overwrite', 'true');
            const retryResponse = await fetch('/api/poi/import-single', {
              method: 'POST',
              body: formData,
            });
            
            const retryResult = await retryResponse.json();
            if (!retryResponse.ok) {
              throw new Error(retryResult.error || 'Failed to import POI');
            }
            
            onPOIImported?.(retryResult.poi);
            onSuccess?.(retryResult.message || 'POI imported successfully');
            return;
          } else {
            onError?.('Import cancelled by user');
            return;
          }
        }
        throw new Error(result.error || 'Failed to import POI');
      }

      onPOIImported?.(result.poi);
      onSuccess?.(result.message || 'POI imported successfully');
    } catch (error) {
      console.error('Import error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to import POI');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImportPOI(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleImportPOI(files[0]);
    }
  };

  return (
    <div className={styles.poiFileManager}>
      <div className={styles.section}>
        <h3>POI File Management</h3>
        <p>Import and export individual POI files with their attachments.</p>
      </div>

      {/* Import Section */}
      <div className={styles.section}>
        <h4>Import POI</h4>
        
        {/* Import Options */}
        <div className={styles.importOptions}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={importOptions.generateNewId}
              onChange={(e) => setImportOptions(prev => ({ 
                ...prev, 
                generateNewId: e.target.checked 
              }))}
            />
            Generate new ID (prevents conflicts)
          </label>
          
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={importOptions.overwrite}
              onChange={(e) => setImportOptions(prev => ({ 
                ...prev, 
                overwrite: e.target.checked 
              }))}
            />
            Overwrite existing POIs
          </label>
        </div>

        {/* File Drop Zone */}
        <div 
          className={`${styles.dropZone} ${dragActive ? styles.dragActive : ''}`}
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.zip"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          {isImporting ? (
            <div className={styles.importing}>
              <div className={styles.spinner}></div>
              <p>Importing POI...</p>
            </div>
          ) : (
            <div className={styles.dropContent}>
              <div className={styles.uploadIcon}>📁</div>
              <p>Drop POI files here or click to browse</p>
              <p className={styles.supportedFormats}>
                Supported formats: .json, .zip
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Export Instructions */}
      <div className={styles.section}>
        <h4>Export POI</h4>
        <p>
          To export a POI, use the export button in the POI management table or 
          the POI context menu in the viewer.
        </p>
        <div className={styles.exportInfo}>
          <h5>Export Formats:</h5>
          <ul>
            <li><strong>JSON:</strong> For iframe POIs (lightweight)</li>
            <li><strong>ZIP:</strong> For file POIs with attachments</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Export function for use in other components
export const exportPOI = async (projectId: string, poiId: string, poiName: string) => {
  try {
    const response = await fetch(
      `/api/poi/export-single?projectId=${encodeURIComponent(projectId)}&poiId=${encodeURIComponent(poiId)}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to export POI');
    }

    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `poi-${poiName.replace(/[^a-zA-Z0-9]/g, '_')}-${poiId.substring(0, 8)}`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);;
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return true;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};