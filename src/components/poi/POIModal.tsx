'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { POIModalProps, POIFormData, POIPosition } from '@/types/poi';
import { validateFileType, formatFileSize } from './utils';
import { FaTimes, FaUpload, FaFile, FaLink, FaMapPin } from 'react-icons/fa';
import { toast } from 'react-toastify';

const POIModal: React.FC<POIModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  pendingPosition,
  editingPOI
}) => {
  const [formData, setFormData] = useState<POIFormData>({
    name: '',
    description: '',
    type: 'file',
    content: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storedPosition, setStoredPosition] = useState<POIPosition | null>(null);
  
  // Store the pending position when modal opens or pre-fill form when editing
  useEffect(() => {
    if (isOpen) {
      if (editingPOI) {
        // Pre-fill form for editing
        setFormData({
          name: editingPOI.name,
          description: editingPOI.description,
          type: editingPOI.type,
          content: editingPOI.content
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
        content: ''
      });
      setSelectedFile(null);
    }
  }, [isOpen]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (!validateFileType(file)) {
        toast.error('Invalid file type. Please upload images (JPG, PNG, GIF), PDFs, or videos (MP4, WebM).');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
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
      'video/*': ['.mp4', '.webm']
    },
    multiple: false
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
    
    if (formData.type === 'file' && !selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }
    
    if (formData.type === 'iframe' && !formData.content.trim()) {
      toast.error('Please enter a URL for the iframe content.');
      return;
    }
    
    if (formData.type === 'iframe' && !isValidUrl(formData.content)) {
      toast.error('Please enter a valid URL.');
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
      storedPosition: storedPosition
    });
    
    setIsSubmitting(true);
    
    try {
      const submitData: POIFormData = {
        ...formData,
        file: selectedFile || undefined,
        position: storedPosition
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
        content: ''
      });
      setSelectedFile(null);
      
      toast.success(editingPOI ? 'POI updated successfully!' : 'POI created successfully!');
      // Note: Modal will be closed by parent component after successful save
    } catch (error) {
      console.error(`Error ${editingPOI ? 'updating' : 'creating'} POI:`, error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(`Failed to ${editingPOI ? 'update' : 'create'} POI: ${error.message}`);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FaMapPin className="text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">{editingPOI ? 'Edit POI' : 'Create POI'}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <FaTimes size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {storedPosition && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
              <strong>Position:</strong> Yaw: {storedPosition.yaw.toFixed(2)}°, Pitch: {storedPosition.pitch.toFixed(2)}°
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              placeholder="Enter POI name"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 bg-white"
              placeholder="Enter POI description"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Type *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="file"
                  checked={formData.type === 'file'}
                  onChange={() => handleTypeChange('file')}
                  className="mr-2"
                  disabled={isSubmitting}
                />
                <FaFile className="mr-1" />
                File Upload
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="iframe"
                  checked={formData.type === 'iframe'}
                  onChange={() => handleTypeChange('iframe')}
                  className="mr-2"
                  disabled={isSubmitting}
                />
                <FaLink className="mr-1" />
                URL/Iframe
              </label>
            </div>
          </div>

          {formData.type === 'file' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Upload *
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} disabled={isSubmitting} />
                <FaUpload className="mx-auto mb-2 text-gray-400" size={24} />
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">
                      {isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to select'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports: Images, PDFs, Videos (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {formData.type === 'iframe' && (
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                URL *
              </label>
              <input
                type="url"
                id="url"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                placeholder="https://example.com"
                required
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create POI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default POIModal;