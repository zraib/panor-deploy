'use client';

import dynamic from 'next/dynamic';
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
  return <PanoramaViewer />;
}
