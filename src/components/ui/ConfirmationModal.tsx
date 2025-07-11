'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const modalContent = (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <FaExclamationTriangle 
              className={`${styles.warningIcon} ${styles[variant]}`} 
              size={20} 
            />
            <h3 className={styles.modalTitle}>{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className={styles.closeButton}
            title="Close"
          >
            <FaTimes size={16} />
          </button>
        </div>
        
        <div className={styles.modalContent}>
          <p className={styles.modalMessage}>{message}</p>
        </div>
        
        <div className={styles.modalActions}>
          <button
            onClick={onCancel}
            className={styles.cancelButton}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`${styles.confirmButton} ${styles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  // Render the modal at the document body level using a portal
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
};

export default ConfirmationModal;