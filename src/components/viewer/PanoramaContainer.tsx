import React, { MouseEvent } from 'react';

interface PanoramaContainerProps {
  panoRef: React.RefObject<HTMLDivElement>;
  onPanoClick: (e: MouseEvent<HTMLDivElement>) => void;
}

const PanoramaContainer: React.FC<PanoramaContainerProps> = React.memo(({ panoRef, onPanoClick }) => {
  return (
    <>
      <div
        ref={panoRef}
        id="pano"
        className="panorama-container"
        onClick={onPanoClick}
        onMouseDown={e => ((e.currentTarget as HTMLElement).style.cursor = 'grabbing')}
        onMouseUp={e => ((e.currentTarget as HTMLElement).style.cursor = 'grab')}
      />
      
      {/* Empty center div for potential future use */}
      <div className="center-overlay" />
      
      <style jsx>{`
        .panorama-container {
          position: absolute;
          width: 100%;
          height: 100%;
          cursor: grab;
        }
        
        .center-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 14px;
          font-weight: 500;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
          z-index: 1600;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the ref object itself changes (which should be rare)
  // Function props are assumed to be stable (memoized in parent)
  return prevProps.panoRef === nextProps.panoRef && prevProps.onPanoClick === nextProps.onPanoClick;
});

export default PanoramaContainer;