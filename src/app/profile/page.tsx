'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Award, Star, Medal } from 'lucide-react';
import styles from './profile.module.css';

export default function ProfilePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profile')
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
        <p>Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.backLink}>← Home</Link>
          <h2>Gamification Profile</h2>
        </div>
      </header>

      <div className={`glass-panel ${styles.profileCard}`}>
        <div className={styles.avatar}>
          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=WhaleWatcher" alt="Avatar" />
        </div>
        <div className={styles.userInfo}>
          <h3>{data?.username || 'Anonymous Explorer'}</h3>
          <p className={styles.level}>Ocean Explorer Level {Math.floor((data?.points || 0) / 100) + 1}</p>
        </div>
        <div className={styles.pointsBadge}>
          <Star size={24} color="#f59e0b" fill="#f59e0b" />
          <span>{data?.points || 0} Points</span>
        </div>
      </div>

      <div className={styles.howItWorks}>
        <h3>How to earn points:</h3>
        <ul>
          <li><strong>Base Sighting:</strong> 50 points per approved photo upload</li>
          <li><strong>Whale Count:</strong> 10 bonus points for each whale counted by our AI</li>
          <li><strong>Rare Species:</strong> 100 bonus points for rare species (e.g., Blue Whale)</li>
        </ul>
      </div>

      <div className={styles.badgesSection}>
        <h3>Earned Badges</h3>
        <div className={styles.badgesGrid}>
          {data?.badges?.length > 0 ? (
            data.badges.map((badge: string, i: number) => (
              <div key={i} className={`glass-panel ${styles.badgeItem}`}>
                {badge.includes('First') ? <Medal size={40} color="var(--color-cyan)" /> : <Award size={40} color="var(--color-accent)" />}
                <span>{badge}</span>
              </div>
            ))
          ) : (
            <div className={styles.noBadges}>Upload your first sighting to earn badges!</div>
          )}
        </div>
      </div>
    </div>
  );
}
