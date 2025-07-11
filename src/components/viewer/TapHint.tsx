import React from 'react';

interface TapHintProps {
  show: boolean;
}

const TapHint: React.FC<TapHintProps> = React.memo(
  ({ show }) => {
    if (!show) return null;

    return (
      <>
        <div className='tap-hint show'>Tap anywhere to show navigation</div>
        <style jsx>{`
          .tap-hint {
            position: absolute;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.4);
            color: var(--text-primary);
            padding: 12px 24px;
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.5s;
            pointer-events: none;
            z-index: 1000;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          }

          .tap-hint.show {
            opacity: 1;
            animation: fadeInOut 3s ease-in-out;
          }
        `}</style>
      </>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.show === nextProps.show;
  }
);

export default TapHint;
