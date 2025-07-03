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
      {/* Logo */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1100,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '12px 16px',
        borderRadius: '14px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)'
      }}>
        <img 
          src="/assets/svg/primezone-logo.svg" 
          alt="PrimeZone Logo" 
          style={{
            height: '60px',
            width: 'auto'
          }}
        />
      </div>

      <header style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '220px',
        zIndex: 1100,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '16px 20px',
        borderRadius: '14px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
        marginBottom: '10px'
      }}>
        <Link 
          href="/upload" 
          style={{
            color: '#fff',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: '0.9',
            transition: 'opacity 0.2s ease',
            whiteSpace: 'nowrap',
            lineHeight: '1.2'
          }}
        >
          📁 Upload Panoramas
        </Link>
      </header>
      <PanoramaViewer />
    </div>
  );
}
