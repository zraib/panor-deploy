'use client';

import { useState } from 'react';

export function usePanelState() {
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [hoveredPanel, setHoveredPanel] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handlePanelToggle = (panelId: string) => {
    setExpandedPanel(expandedPanel === panelId ? null : panelId);
  };

  const handleMouseEnter = (panelId: string) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setExpandedPanel(panelId);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setExpandedPanel(null);
    }, 200); // 200ms delay
    setHoverTimeout(timeout);
  };

  const closePanels = () => {
    setExpandedPanel(null);
  };

  return {
    expandedPanel,
    hoveredPanel,
    handlePanelToggle,
    handleMouseEnter,
    handleMouseLeave,
    closePanels,
  };
}