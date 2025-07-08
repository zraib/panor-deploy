'use client';

import { useState } from 'react';

export function usePanelState() {
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [hoveredPanel, setHoveredPanel] = useState<string | null>(null);
  const [pinnedPanel, setPinnedPanel] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handlePanelToggle = (panelId: string) => {
    if (pinnedPanel === panelId) {
      // If clicking on a pinned panel, unpin and close it
      setPinnedPanel(null);
      setExpandedPanel(null);
    } else {
      // Pin the panel and open it
      setPinnedPanel(panelId);
      setExpandedPanel(panelId);
    }
  };

  const handleMouseEnter = (panelId: string) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    // Only open on hover if no panel is pinned
    if (!pinnedPanel) {
      setExpandedPanel(panelId);
    }
  };

  const handleMouseLeave = () => {
    // Only close on mouse leave if no panel is pinned
    if (!pinnedPanel) {
      const timeout = setTimeout(() => {
        setExpandedPanel(null);
      }, 200); // 200ms delay
      setHoverTimeout(timeout);
    }
  };

  const closePanels = () => {
    setExpandedPanel(null);
    setPinnedPanel(null);
  };

  return {
    expandedPanel,
    hoveredPanel,
    pinnedPanel,
    handlePanelToggle,
    handleMouseEnter,
    handleMouseLeave,
    closePanels,
  };
}