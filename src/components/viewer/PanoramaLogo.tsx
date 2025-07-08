import React from 'react';

const PanoramaLogo: React.FC = React.memo(() => {
  return (
    <div className="panorama-logo">
      <img
        src="/assets/svg/primezone-logo.svg"
        alt="PrimeZone Logo"
        className="logo-image"
      />
      <style jsx>{`
        .panorama-logo {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 1200;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 10px;
          border-radius: 14px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        }
        
        .logo-image {
          height: 60px;
          width: auto;
          display: block;
        }
      `}</style>
    </div>
  );
});

export default PanoramaLogo;