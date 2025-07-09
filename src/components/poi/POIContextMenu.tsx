'use client';

import React, { useEffect, useRef } from 'react';
import { POIContextMenuProps } from '@/types/poi';
import { FaMapPin, FaTimes } from 'react-icons/fa';
import styles from './POIContextMenu.module.css';

const POIContextMenu: React.FC<POIContextMenuProps> = ({
  position,
  onCreatePOI,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleCreatePOI = () => {
    onCreatePOI();
    // Don't call onClose() immediately - let the parent component handle closing
    // after the modal has captured the position
  };

  return (
    <div
      ref={menuRef}
      className={styles.contextMenu}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <div className={styles.menuContent}>
        <button
          onClick={handleCreatePOI}
          className={`${styles.menuItem} ${styles.createButton}`}
        >
          <FaMapPin className={styles.createIcon} />
          Create POI
        </button>
        
        <div className={styles.divider} />
        
        <button
          onClick={onClose}
          className={`${styles.menuItem} ${styles.cancelButton}`}
        >
          <FaTimes className={styles.cancelIcon} />
          Cancel
        </button>
      </div>
    </div>
  );
};

export default POIContextMenu;