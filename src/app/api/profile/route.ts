import { NextResponse } from 'next/server';
import { bigquery, bqTableId } from '@/lib/gcp';

export async function GET() {
  try {
    const bqTablePath = bqTableId.split('.');
    let projectId, datasetId, tableId;
    
    if (bqTablePath.length === 3) {
      projectId = bqTablePath[0];
      datasetId = bqTablePath[1];
      tableId = bqTablePath[2];
    } else {
      datasetId = 'Whale_watch';
      tableId = 'whale-watch-bq';
      projectId = process.env.GOOGLE_CLOUD_PROJECT;
    }

    const tablePath = `\`${projectId}.${datasetId}.${tableId}\``;

    // Get all sightings for the "anonymous" user to calculate points
    // In a real app, we would filter by user_id
    const query = `
      SELECT species, whale_count
      FROM ${tablePath}
    `;

    const [rows] = await bigquery.query({ query });

    let points = 0;
    const badges: string[] = [];

    // Calculate points: 50 points base per sighting + 10 points per whale
    rows.forEach((row: any) => {
      points += 50;
      if (row.whale_count) {
        points += (row.whale_count * 10);
      }
      // Bonus points for specific species
      if (row.species?.toLowerCase().includes('blue')) {
        points += 100;
        if (!badges.includes('Rare Spotter')) badges.push('Rare Spotter');
      }
    });

    if (rows.length >= 1) badges.push('First Sighting');
    if (rows.length >= 5) badges.push('Ocean Guardian');
    if (points > 1000) badges.push('Master Tracker');

    return NextResponse.json({
      username: 'Anonymous Explorer',
      points: points,
      badges: badges,
      totalSightings: rows.length
    });
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
