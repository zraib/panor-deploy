'use client';

import React, { useEffect, useRef } from 'react';
import { POIContextMenuProps } from '@/types/poi';
import { FaMapPin, FaTimes } from 'react-icons/fa';

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
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[180px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -10px)'
      }}
    >
      <div className="py-2">
        <button
          onClick={handleCreatePOI}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
        >
          <FaMapPin className="text-blue-500" />
          Create POI
        </button>
        
        <div className="border-t border-gray-100 my-1" />
        
        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 flex items-center gap-2 transition-colors"
        >
          <FaTimes className="text-gray-400" />
          Cancel
        </button>
      </div>
    </div>
  );
};

export default POIContextMenu;