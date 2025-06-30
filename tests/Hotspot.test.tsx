import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HotspotComponent as Hotspot } from '../src/components/Hotspot';

describe('HotspotComponent', () => {
  const mockData = {
    yaw: 0,
    pitch: 0,
    target: 'scene2',
    distance: 5,
  };

  const mockOnNavigate = jest.fn();

  it('renders without crashing', () => {
    render(
      <Hotspot
        visible={true}
        data={mockData}
        onNavigate={mockOnNavigate}
        style={{}}
      />
    );
    const hotspotElement = screen.getByTestId('hotspot');
    expect(hotspotElement).toBeInTheDocument();
  });

  it('is visible when the visible prop is true', () => {
    render(
      <Hotspot
        visible={true}
        data={mockData}
        onNavigate={mockOnNavigate}
        style={{}}
      />
    );
    const hotspotElement = screen.getByTestId('hotspot');
    expect(hotspotElement).toHaveClass('visible');
  });

  it('is hidden when the visible prop is false', () => {
    render(
      <Hotspot
        visible={false}
        data={mockData}
        onNavigate={mockOnNavigate}
        style={{}}
      />
    );
    const hotspotElement = screen.getByTestId('hotspot');
    expect(hotspotElement).not.toHaveClass('visible');
  });

  it('becomes visible on hover', () => {
    render(
      <Hotspot
        visible={false}
        data={mockData}
        onNavigate={mockOnNavigate}
        style={{}}
      />
    );
    const hotspotElement = screen.getByTestId('hotspot');
    fireEvent.mouseEnter(hotspotElement);
    expect(hotspotElement).toHaveClass('visible');
  });

  it('hides after hover', () => {
    render(
      <Hotspot
        visible={false}
        data={mockData}
        onNavigate={mockOnNavigate}
        style={{}}
      />
    );
    const hotspotElement = screen.getByTestId('hotspot');
    fireEvent.mouseEnter(hotspotElement);
    fireEvent.mouseLeave(hotspotElement);
    expect(hotspotElement).not.toHaveClass('visible');
  });

  it('calls onNavigate when clicked', () => {
    render(
      <Hotspot
        visible={true}
        data={mockData}
        onNavigate={mockOnNavigate}
        style={{}}
      />
    );
    const hotspotElement = screen.getByTestId('hotspot');
    fireEvent.click(hotspotElement);
    expect(mockOnNavigate).toHaveBeenCalledWith('scene2', 0);
  });
});