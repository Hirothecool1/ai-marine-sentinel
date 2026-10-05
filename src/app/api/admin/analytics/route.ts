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

    // 1. Total Sightings
    const [totalSightingsRes] = await bigquery.query(`SELECT COUNT(*) as count FROM ${tablePath}`);
    
    // 2. Sightings by Species
    const [speciesRes] = await bigquery.query(`
      SELECT species, COUNT(*) as count 
      FROM ${tablePath} 
      GROUP BY species 
      ORDER BY count DESC
    `);

    // 3. Recent Activity (last 10)
    const [recentRes] = await bigquery.query(`
      SELECT timestamp, species, whale_count, image_url 
      FROM ${tablePath} 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);

    return NextResponse.json({
      totalSightings: totalSightingsRes[0]?.count || 0,
      speciesDistribution: speciesRes,
      recentActivity: recentRes,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
