'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { POIModalProps, POIFormData, POIPosition } from '@/types/poi';
import { validateFileType, formatFileSize } from './utils';
import { FaTimes, FaUpload, FaFile, FaLink, FaMapPin } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styles from './POIModal.module.css';

const POIModal: React.FC<POIModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  pendingPosition,
  editingPOI,
}) => {
  const [formData, setFormData] = useState<POIFormData>({
    name: '',
    description: '',
    type: 'file',
    content: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storedPosition, setStoredPosition] = useState<POIPosition | null>(
    null
  );

  // Store the pending position when modal opens or pre-fill form when editing
  useEffect(() => {
    if (isOpen) {
      if (editingPOI) {
        // Pre-fill form for editing
        setFormData({
          name: editingPOI.name,
          description: editingPOI.description,
          type: editingPOI.type,
          content: editingPOI.content,
        });
        setStoredPosition(editingPOI.position);
      } else if (pendingPosition && !storedPosition) {
        console.log('Modal position lock:', pendingPosition);
        setStoredPosition(pendingPosition);
      }
    }
  }, [isOpen, pendingPosition, storedPosition, editingPOI]);

  // Clear stored position and form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStoredPosition(null);
      setFormData({
        name: '',
        description: '',
        type: 'file',
        content: '',
      });
      setSelectedFile(null);
    }
  }, [isOpen]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (!validateFileType(file)) {
        toast.error(
          'Invalid file type. Please upload images (JPG, PNG, GIF), PDFs, or videos (MP4, WebM).'
        );
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast.error('File size must be less than 10MB.');
        return;
      }

      setSelectedFile(file);
      setFormData(prev => ({ ...prev, content: file.name }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf'],
      'video/*': ['.mp4', '.webm'],
    },
    multiple: false,
  });

  const handleInputChange = (field: keyof POIFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeChange = (type: 'file' | 'iframe') => {
    setFormData(prev => ({ ...prev, type, content: '' }));
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter a name for the POI.');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a description for the POI.');
      return;
    }

    if (formData.type === 'file' && !selectedFile && !editingPOI) {
      toast.error('Please select a file to upload.');
      return;
    }

    if (formData.type === 'iframe' && !formData.content.trim()) {
      toast.error('Please enter a URL or iframe code for the iframe content.');
      return;
    }

    if (formData.type === 'iframe' && !isValidUrlOrIframe(formData.content)) {
      toast.error('Please enter a valid URL or iframe HTML code.');
      return;
    }

    // Add strict position validation
    if (!storedPosition) {
      toast.error('POI position missing - please right-click again');
      return;
    }

    // Enhanced position tracking with debug logs
    console.log('Modal received position:', {
      propPosition: pendingPosition,
      storedPosition: storedPosition,
    });

    setIsSubmitting(true);

    try {
      const submitData: POIFormData = {
        ...formData,
        file: selectedFile || undefined,
        position: storedPosition,
      };

      // Add POI ID for editing
      if (editingPOI) {
        (submitData as any).id = editingPOI.id;
      }

      console.log('Submitting POI data:', submitData);
      await onSubmit(submitData);

      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'file',
        content: '',
      });
      setSelectedFile(null);

      toast.success(
        editingPOI ? 'POI updated successfully!' : 'POI created successfully!'
      );
      // Note: Modal will be closed by parent component after successful save
    } catch (error) {
      console.error(
        `Error ${editingPOI ? 'updating' : 'creating'} POI:`,
        error
      );
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
      toast.error(
        `Failed to ${editingPOI ? 'update' : 'create'} POI: ${errorMessage}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const isValidUrlOrIframe = (string: string) => {
    // Check if it's a valid URL
    if (isValidUrl(string)) {
      return true;
    }
    
    // Check if it's iframe HTML code
    const trimmed = string.trim();
    if (trimmed.toLowerCase().startsWith('<iframe') && trimmed.toLowerCase().includes('</iframe>')) {
      return true;
    }
    
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <FaMapPin className={styles.headerIcon} />
            <h2 className={styles.headerTitle}>
              {editingPOI ? 'Edit POI' : 'Create POI'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            disabled={isSubmitting}
          >
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor='name' className={styles.label}>
              Name *
            </label>
            <input
              type='text'
              id='name'
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              className={styles.input}
              placeholder='Enter POI name'
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor='description' className={styles.label}>
              Description *
            </label>
            <textarea
              id='description'
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              rows={3}
              className={styles.textarea}
              placeholder='Enter POI description'
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Content Type *</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input
                  type='radio'
                  name='type'
                  value='file'
                  checked={formData.type === 'file'}
                  onChange={() => handleTypeChange('file')}
                  className={styles.radioInput}
                  disabled={isSubmitting}
                />
                <FaFile />
                File Upload
              </label>
              <label className={styles.radioOption}>
                <input
                  type='radio'
                  name='type'
                  value='iframe'
                  checked={formData.type === 'iframe'}
                  onChange={() => handleTypeChange('iframe')}
                  className={styles.radioInput}
                  disabled={isSubmitting}
                />
                <FaLink />
                URL/Iframe
              </label>
            </div>
          </div>

          {formData.type === 'file' && (
            <div className={styles.fileUploadSection}>
              <label className={styles.label}>
                File Upload {editingPOI ? '' : '*'}
              </label>

              {/* Show existing file info when editing */}
              {editingPOI && editingPOI.type === 'file' && !selectedFile && (
                <div className={styles.existingFileInfo}>
                  <div className={styles.existingFileContent}>
                    <FaFile className={styles.existingFileIcon} />
                    <div>
                      <p className={styles.existingFileName}>
                        Current file: {editingPOI.content}
                      </p>
                      <p className={styles.existingFileNote}>
                        Click below to replace with a new file (optional)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div
                {...getRootProps()}
                className={`${styles.dropzone} ${
                  isDragActive ? styles.dropzoneActive : ''
                } ${isSubmitting ? styles.dropzoneDisabled : ''}`}
              >
                <input {...getInputProps()} disabled={isSubmitting} />
                <FaUpload className={styles.uploadIcon} size={24} />
                {selectedFile ? (
                  <div className={styles.selectedFileInfo}>
                    <p className={styles.selectedFileName}>
                      {selectedFile.name}
                    </p>
                    <p className={styles.selectedFileSize}>
                      {formatFileSize(selectedFile.size)}
                    </p>
                    {editingPOI && (
                      <p className={styles.replaceFileNote}>
                        This will replace the current file
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className={styles.dropzoneText}>
                      {isDragActive
                        ? 'Drop the file here'
                        : editingPOI
                          ? 'Drag & drop a new file here, or click to select'
                          : 'Drag & drop a file here, or click to select'}
                    </p>
                    <p className={styles.dropzoneSubtext}>
                      Supports: Images, PDFs, Videos (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {formData.type === 'iframe' && (
            <div className={styles.formGroup}>
              <label htmlFor='url' className={styles.label}>
                URL or Iframe Code *
              </label>
              <textarea
                id='url'
                value={formData.content}
                onChange={e => handleInputChange('content', e.target.value)}
                className={styles.textarea}
                placeholder='https://example.com or <iframe src="..." width="..." height="..."></iframe>'
                rows={4}
                required
                disabled={isSubmitting}
              />
              <p className={styles.inputHint}>
                Enter a URL or paste iframe HTML code
              </p>
            </div>
          )}

          <div className={styles.formActions}>
            <button
              type='button'
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type='submit'
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? editingPOI
                  ? 'Updating...'
                  : 'Creating...'
                : editingPOI
                  ? 'Update POI'
                  : 'Create POI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default POIModal;
