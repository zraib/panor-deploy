'use client';

import React, { ReactElement } from 'react';
import styles from './ControlPanel.module.css';

interface ControlButtonProps {
  id: string;
  icon: ReactElement;
  expandedPanel: string | null;
  onToggle: (panelId: string) => void;
  onMouseEnter: (panelId: string) => void;
  onMouseLeave: () => void;
  children: ReactElement;
  className?: string;
  style?: React.CSSProperties;
}

export function ControlButton({
  id,
  icon,
  expandedPanel,
  onToggle,
  onMouseEnter,
  onMouseLeave,
  children,
  className = styles.iconButton,
  style,
}: ControlButtonProps): ReactElement {
  return (
    <div
      className={styles.controlItem}
      onMouseEnter={() => onMouseEnter(id)}
      onMouseLeave={onMouseLeave}
    >
      <button className={className} style={style} onClick={() => onToggle(id)}>
        {icon}
      </button>
      {expandedPanel === id && (
        <div
          onMouseLeave={onMouseLeave}
          className={styles.expandedPanelContainer}
        >
          {children}
        </div>
      )}
    </div>
  );
}