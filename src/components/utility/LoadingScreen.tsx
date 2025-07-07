'use client';

import { ReactElement } from 'react';
import styles from './LoadingScreen.module.css';

interface LoadingScreenProps {
  error?: string | null;
  onRetry?: () => void;
}

export default function LoadingScreen({
  error,
  onRetry,
}: LoadingScreenProps): ReactElement {
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <div className={styles.errorTitle}>
            Failed to initialize panorama viewer
          </div>
          <div className={styles.errorMessage}>{error}</div>

          {error.includes('WebGL') && (
            <div className={styles.helpSection}>
              <div className={styles.helpTitle}>To fix this issue:</div>
              <ul className={styles.helpList}>
                <li><strong>Update your graphics drivers</strong> (most important)</li>
                <li>Enable hardware acceleration in your browser settings</li>
                <li>Restart your browser completely</li>
                <li>Try a different browser (Chrome, Firefox, Edge)</li>
                <li>Check for laptop overheating or power issues</li>
                <li>
                  Test WebGL at{' '}
                  <a
                    href='https://get.webgl.org/'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    get.webgl.org
                  </a>
                </li>
              </ul>
              <div className={styles.browserInfo}>
                Browser:{' '}
                {typeof navigator !== 'undefined'
                  ? navigator.userAgent
                  : 'Unknown'}
              </div>
              {error.includes('Diagnostics:') && (
                <details className={styles.diagnostics}>
                  <summary>Technical Details</summary>
                  <pre className={styles.diagnosticsContent}>
                    {error.split('Diagnostics: ')[1] || 'No diagnostics available'}
                  </pre>
                </details>
               )}
               {onRetry && (
                 <button 
                   onClick={onRetry}
                   className={styles.retryButton}
                   type="button"
                 >
                   Try Again
                 </button>
               )}
             </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.loader}></div>
      <div className={styles.text}>Loading panoramas...</div>
    </div>
  );
}