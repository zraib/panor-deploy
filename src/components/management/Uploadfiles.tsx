'use client';

import { ReactElement } from 'react';
import Link from 'next/link';
import styles from './UploadFiles.module.css';

export default function UploadFiles(): ReactElement {
  return (
    <Link href='/upload' className={styles.container}>
      <div className={styles.icon}>
        <svg
          width='16'
          height='16'
          viewBox='0 0 24 24'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path
            d='M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z'
            stroke='white'
            strokeWidth='2'
            fill='none'
          />
          <path d='M14 2V8H20' stroke='white' strokeWidth='2' fill='none' />
          <path
            d='M12 18V12'
            stroke='white'
            strokeWidth='2'
            strokeLinecap='round'
          />
          <path
            d='M9 15L12 12L15 15'
            stroke='white'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </div>
      <span className={styles.text}>Upload Files</span>
    </Link>
  );
}