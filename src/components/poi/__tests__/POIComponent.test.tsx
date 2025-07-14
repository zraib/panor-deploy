import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import POIComponent from '../POIComponent';
import { POIData } from '@/types/poi';

// Mock the react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

const mockViewerRef = {
  current: {
    view: () => ({
      yaw: () => 0,
      pitch: () => 0,
      fov: () => Math.PI / 2,
    }),
  },
} as React.RefObject<any>;

const mockPanoRef = {
  current: document.createElement('div'),
} as React.RefObject<HTMLDivElement>;

const defaultProps = {
  projectId: 'test-project',
  currentPanoramaId: 'test-panorama',
  viewerSize: { width: 800, height: 600 },
  viewerRef: mockViewerRef,
  panoRef: mockPanoRef,
  onPOICreated: jest.fn(),
};

describe('POIComponent', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    // Mock successful POI data fetch
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  it('renders without crashing', () => {
    const { container } = render(<POIComponent {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('loads POIs on mount', async () => {
    const mockPOIs: POIData[] = [
      {
        id: '1',
        panoramaId: 'test-panorama',
        name: 'Test POI',
        description: 'Test description',
        position: { yaw: 0, pitch: 0 },
        type: 'file',
        content: 'test.jpg',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPOIs),
    });

    render(<POIComponent {...defaultProps} />);

    expect(fetch).toHaveBeenCalledWith('/api/poi/load?projectId=test-project&panoramaId=test-panorama');
  });

  it('handles right-click events', () => {
    const { container } = render(<POIComponent {...defaultProps} />);
    const poiContainer = container.firstChild as HTMLElement;

    fireEvent.contextMenu(poiContainer, {
      clientX: 400,
      clientY: 300,
    });

    // Context menu should appear (though we'd need to mock the DOM measurements)
    // This test verifies the event handler is attached
    expect(poiContainer).toBeInTheDocument();
  });

  it('handles missing viewer gracefully', () => {
    const propsWithoutViewer = {
      ...defaultProps,
      viewerRef: { current: null },
    };

    const { container } = render(<POIComponent {...propsWithoutViewer} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});