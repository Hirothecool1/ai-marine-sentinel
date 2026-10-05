'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, TrendingUp, BarChart3, Database } from 'lucide-react';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="animate-spin" size={48} color="var(--color-cyan)" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backLink}>← Back to Site</Link>
          <h2>Admin Dashboard</h2>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={`glass-panel ${styles.statCard}`}>
          <Database size={32} color="var(--color-cyan)" />
          <div className={styles.statInfo}>
            <h3>Total Sightings</h3>
            <p className={styles.statValue}>{data?.totalSightings || 0}</p>
          </div>
        </div>
        <div className={`glass-panel ${styles.statCard}`}>
          <BarChart3 size={32} color="var(--color-teal)" />
          <div className={styles.statInfo}>
            <h3>Species Identified</h3>
            <p className={styles.statValue}>{data?.speciesDistribution?.length || 0}</p>
          </div>
        </div>
        <div className={`glass-panel ${styles.statCard}`}>
          <TrendingUp size={32} color="var(--color-accent)" />
          <div className={styles.statInfo}>
            <h3>Active Users</h3>
            <p className={styles.statValue}>---</p>
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={`glass-panel ${styles.panel}`}>
          <h3>Species Distribution</h3>
          <ul className={styles.speciesList}>
            {data?.speciesDistribution?.map((s: any, i: number) => (
              <li key={i}>
                <span>{s.species}</span>
                <span className={styles.badge}>{s.count}</span>
              </li>
            ))}
            {(!data?.speciesDistribution || data.speciesDistribution.length === 0) && (
              <li className={styles.empty}>No data available</li>
            )}
          </ul>
        </div>

        <div className={`glass-panel ${styles.panel}`}>
          <h3>Recent Sightings (Data Feed)</h3>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Species</th>
                  <th>Count</th>
                  <th>Image</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentActivity?.map((row: any, i: number) => (
                  <tr key={i}>
                    <td>{new Date(row.timestamp.value || row.timestamp).toLocaleString()}</td>
                    <td>{row.species}</td>
                    <td>{row.whale_count}</td>
                    <td>
                      <a href={row.image_url} target="_blank" rel="noreferrer" className={styles.link}>View</a>
                    </td>
                  </tr>
                ))}
                {(!data?.recentActivity || data.recentActivity.length === 0) && (
                  <tr>
                    <td colSpan={4} className={styles.empty}>No recent sightings</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
