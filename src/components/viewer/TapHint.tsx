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
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 24px;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.5s;
            pointer-events: none;
            z-index: 1000;
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
