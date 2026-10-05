'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import styles from './map.module.css';

// Dynamically import MapComponent to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => <div className={styles.loadingMap}><Loader2 className="animate-spin" size={48} color="var(--color-cyan)" /></div>
});

export default function MapPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sightings')
      .then(res => res.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(e => setError("Failed to load data"));
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backLink}>← Back</Link>
          <h2>Live Map</h2>
        </div>
        <Link href="/upload" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
          Report Sighting
        </Link>
      </header>

      <div className={styles.stats}>
        <div className={`glass-panel ${styles.statCard}`}>
          <h3>{data?.sightings?.length || 0}</h3>
          <p>Recent Sightings</p>
        </div>
        <div className={`glass-panel ${styles.statCard}`}>
          <h3>{data?.ais?.length || 0}</h3>
          <p>Ships Tracked</p>
        </div>
      </div>

      <div className={`glass-panel ${styles.mapContainer}`}>
        {error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <MapComponent data={data} />
        )}
      </div>
    </div>
  );
}
