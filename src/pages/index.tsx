'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ReactElement } from 'react';

// Dynamically import PanoramaViewer to avoid SSR issues with Marzipano
const PanoramaViewer = dynamic(() => import('@/components/PanoramaViewer'), {
  ssr: false,
  loading: (): ReactElement => (
    <div id="loading">
      <div className="loader"></div>
      <div>Loading panoramas...</div>
    </div>
  ),
});

export default function Home(): ReactElement {
  return (
    <div>
      <header style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '10px 15px',
        borderRadius: '5px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <Link 
          href="/upload" 
          style={{
            color: '#0070f3',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          📁 Upload New Panoramas
        </Link>
      </header>
      <PanoramaViewer />
    </div>
  );
}
