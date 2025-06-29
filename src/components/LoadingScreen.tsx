'use client';

import { ReactElement } from 'react';
import styles from './LoadingScreen.module.css';

interface LoadingScreenProps {
  error?: string | null;
}

export default function LoadingScreen({ error }: LoadingScreenProps): ReactElement {
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <div className={styles.errorTitle}>Failed to initialize panorama viewer</div>
          <div className={styles.errorMessage}>{error}</div>

          {error.includes('WebGL') && (
            <div className={styles.helpSection}>
              <div className={styles.helpTitle}>To fix this issue:</div>
              <ul className={styles.helpList}>
                <li>Enable hardware acceleration in your browser</li>
                <li>Update your graphics drivers</li>
                <li>Try a different browser (Chrome, Firefox, Edge)</li>
                <li>
                  Check if WebGL is enabled at{' '}
                  <a href="https://get.webgl.org/" target="_blank" rel="noopener noreferrer">
                    get.webgl.org
                  </a>
                </li>
              </ul>
              <div className={styles.browserInfo}>
                Browser: {typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}
              </div>
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
