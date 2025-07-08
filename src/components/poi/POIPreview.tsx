'use client';

import React, { useState } from 'react';
import { POIPreviewProps } from '@/types/poi';
import { getFileCategory } from './utils';
import { FaTimes, FaFile, FaImage, FaVideo, FaFilePdf, FaExternalLinkAlt } from 'react-icons/fa';

const POIPreview: React.FC<POIPreviewProps> = ({ poi, projectId, onClose }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const getContentPath = () => {
    if (poi.type === 'iframe') {
      return poi.content;
    }
    return `/${projectId}/data/poi/attachments/${poi.content}`;
  };

  const renderFileIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <FaImage className="text-blue-500" size={24} />;
      case 'video':
        return <FaVideo className="text-green-500" size={24} />;
      case 'pdf':
        return <FaFilePdf className="text-red-500" size={24} />;
      default:
        return <FaFile className="text-gray-500" size={24} />;
    }
  };

  const renderContent = () => {
    if (poi.type === 'iframe') {
      return (
        <div className="relative w-full h-96">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          <iframe
            src={poi.content}
            className="w-full h-full border-0 rounded-lg"
            title={poi.name}
            onLoad={handleImageLoad}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
          <a
            href={poi.content}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
            title="Open in new tab"
          >
            <FaExternalLinkAlt className="text-gray-600" size={12} />
          </a>
        </div>
      );
    }

    // File content
    const contentPath = getContentPath();
    const fileExtension = poi.content.split('.').pop()?.toLowerCase() || '';
    const mimeType = getMimeType(fileExtension);
    const category = getFileCategory(mimeType);

    if (category === 'image') {
      return (
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          {imageError ? (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
              <FaImage className="text-gray-400 mb-2" size={48} />
              <p className="text-gray-500">Failed to load image</p>
              <a
                href={contentPath}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-blue-600 hover:text-blue-800 underline"
              >
                Open file directly
              </a>
            </div>
          ) : (
            <img
              src={contentPath}
              alt={poi.name}
              className="w-full max-h-96 object-contain rounded-lg"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </div>
      );
    }

    if (category === 'video') {
      return (
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          <video
            src={contentPath}
            controls
            className="w-full max-h-96 rounded-lg"
            onLoadedData={handleImageLoad}
            onError={handleImageError}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // For PDFs and other files, show download link
    return (
      <div className="flex flex-col items-center justify-center h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        {renderFileIcon(category)}
        <p className="mt-2 text-sm text-gray-600">{poi.content}</p>
        <a
          href={contentPath}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          Open File
        </a>
      </div>
    );
  };

  const getMimeType = (extension: string): string => {
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      mp4: 'video/mp4',
      webm: 'video/webm'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{poi.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Position: Yaw {poi.position.yaw.toFixed(2)}°, Pitch {poi.position.pitch.toFixed(2)}°
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-4">
          {poi.description && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{poi.description}</p>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Content</h3>
            {renderContent()}
          </div>

          <div className="text-xs text-gray-500 border-t pt-3">
            <p>Created: {new Date(poi.createdAt).toLocaleString()}</p>
            {poi.updatedAt !== poi.createdAt && (
              <p>Updated: {new Date(poi.updatedAt).toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default POIPreview;