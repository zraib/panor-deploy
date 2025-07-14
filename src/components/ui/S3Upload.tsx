'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { FaUpload, FaFile } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styles from './S3Upload.module.css';

interface S3UploadProps {
  onUploadSuccess: (fileName: string) => void;
}

const S3Upload: React.FC<S3UploadProps> = ({ onUploadSuccess }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setIsUploading(true);
      setUploadedFile(file);
      const formData = new FormData();
      formData.append('file', file);

      try {
        await axios.post('/api/s3-upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        toast.success('File uploaded successfully');
        onUploadSuccess(file.name);
      } catch (error) {
        toast.error('Error uploading file');
      } finally {
        setIsUploading(false);
      }
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`${styles.dropzone} ${
        isDragActive ? styles.dropzoneActive : ''
      } ${isUploading ? styles.dropzoneDisabled : ''}`}
    >
      <input {...getInputProps()} disabled={isUploading} />
      <FaUpload className={styles.uploadIcon} size={24} />
      {uploadedFile ? (
        <div className={styles.selectedFileInfo}>
          <p className={styles.selectedFileName}>{uploadedFile.name}</p>
        </div>
      ) : (
        <div>
          <p className={styles.dropzoneText}>
            {isDragActive
              ? 'Drop the file here'
              : 'Drag & drop a file here, or click to select'}
          </p>
        </div>
      )}
    </div>
  );
};

export default S3Upload;