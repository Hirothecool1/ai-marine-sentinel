import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
// @ts-ignore
import ee from '@google/earthengine';
import { bigquery, bqTableId } from '@/lib/gcp';
import { ScoringEngine, haversineDistance } from '@/lib/scoringEngine';
import { aisManager } from '@/lib/aisManager';
import crypto from 'crypto';

const bqTablePath = bqTableId.split('.');
const bqProjectId = bqTablePath.length === 3 ? bqTablePath[0] : (process.env.GOOGLE_CLOUD_PROJECT || 'smart-diet-app-482519');
const bqDatasetId = bqTablePath.length === 3 ? bqTablePath[1] : 'Whale_watch';
const predictionsTableId = 'whale-watch-predictions';

const OBIS_HISTORICAL_SIGHTINGS = [
  { id: 'OBIS-01', latitude: 37.810, longitude: -123.080, species: 'Humpback Whale', date: '2026-05-10', source: 'OBIS-SEAMAP', sourceType: 'historical' },
  { id: 'OBIS-02', latitude: 37.695, longitude: -122.955, species: 'Blue Whale', date: '2026-05-12', source: 'OBIS-SEAMAP', sourceType: 'historical' },
  { id: 'OBIS-03', latitude: 37.980, longitude: -123.180, species: 'Fin Whale', date: '2026-05-14', source: 'OBIS-SEAMAP', sourceType: 'historical' },
  { id: 'OBIS-04', latitude: 37.525, longitude: -122.785, species: 'Gray Whale', date: '2026-05-18', source: 'OBIS-SEAMAP', sourceType: 'historical' },
  { id: 'OBIS-05', latitude: 37.610, longitude: -122.610, species: 'Humpback Whale', date: '2026-05-20', source: 'OBIS-SEAMAP', sourceType: 'historical' }
];

async function ensurePredictionsTable() {
  const schema = [
    { name: 'prediction_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'model_version', type: 'STRING', mode: 'NULLABLE' },
    { name: 'zone_id', type: 'STRING', mode: 'NULLABLE' },
    { name: 'zone_geometry', type: 'STRING', mode: 'NULLABLE' },
    { name: 'raw_inputs', type: 'STRING', mode: 'NULLABLE' },
    { name: 'normalized_inputs', type: 'STRING', mode: 'NULLABLE' },
    { name: 'weights', type: 'STRING', mode: 'NULLABLE' },
    { name: 'final_indices', type: 'STRING', mode: 'NULLABLE' },
    { name: 'source_timestamps', type: 'STRING', mode: 'NULLABLE' },
    { name: 'source_availability', type: 'STRING', mode: 'NULLABLE' },
    { name: 'confidence_label', type: 'STRING', mode: 'NULLABLE' },
    { name: 'recommended_speed', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'eligible_vessel_count', type: 'INTEGER', mode: 'NULLABLE' },
    { name: 'compliance_numerator', type: 'INTEGER', mode: 'NULLABLE' },
    { name: 'compliance_denominator', type: 'INTEGER', mode: 'NULLABLE' },
    { name: 'error_state', type: 'STRING', mode: 'NULLABLE' }
  ];

  const dataset = bigquery.dataset(bqDatasetId, { projectId: bqProjectId });
  const table = dataset.table(predictionsTableId);
  const [exists] = await table.exists();
  if (!exists) {
    console.log(`[BigQuery Log] Creating table ${predictionsTableId}...`);
    await table.create({ schema });
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  return table;
}

// Scrape NDBC station 46026
async function fetchNDBCBuoy(): Promise<any[]> {
  const ndbcBaseUrl = process.env.NDBC_BASE_URL || 'https://www.ndbc.noaa.gov';
  const url = `${ndbcBaseUrl}/data/realtime2/46026.txt`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`Buoy status ${res.status}`);
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 3) throw new Error('Malformed buoy data');
    const headers = lines[0].replace('#', '').trim().split(/\s+/);
    const dataRow = lines[2].trim().split(/\s+/);

    const getVal = (colName: string): number | null => {
      const idx = headers.indexOf(colName);
      if (idx === -1 || idx >= dataRow.length) return null;
      const raw = dataRow[idx];
      if (raw === 'MM' || raw === '99.0' || raw === '999') return null;
      const val = parseFloat(raw);
      return isNaN(val) ? null : val;
    };

    const temp = getVal('WTMP');
    return [{
      stationId: '46026',
      name: 'San Francisco',
      latitude: 37.759,
      longitude: -122.839,
      waterTemp: temp
    }];
  } catch (err: any) {
    console.warn('[Evaluate API] Buoy fetch failed, treating as unavailable:', err.message || err);
    return [{
      stationId: '46026',
      name: 'San Francisco',
      latitude: 37.759,
      longitude: -122.839,
      waterTemp: null,
      error: true
    }];
  }
}

export async function POST() {
  const startTimestamp = new Date().toISOString();
  let geeStatus = 'disconnected';
  let geeError: string | null = null;
  let geeData: any[] = [];
  let geeImageDate = new Date().toISOString();
  
  // 1. GEE Hotspots Retrieval
  let geeProject = process.env.GOOGLE_EARTH_ENGINE_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (process.env.FORCE_DISABLE_EXTERNAL_APIS !== 'true') {
    try {
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/earthengine', 'https://www.googleapis.com/auth/cloud-platform']
      });
      if (!geeProject) geeProject = await auth.getProjectId();
      const client = await auth.getClient();
      const token = await client.getAccessToken();
 
      if (token && token.token) {
        await new Promise<void>((resolve, reject) => {
          ee.data.setAuthToken('', 'Bearer', token.token, 3600, [], () => {
            ee.initialize(null, null, () => resolve(), (err: any) => reject(err), null, geeProject);
          }, false);
        });
 
        const region = ee.Geometry.Rectangle([-123.5, 37.1, -122.0, 38.5]);
        const collection = ee.ImageCollection('NOAA/CDR/OISST/V2_1')
          .filterBounds(region)
          .sort('system:time_start', false);
 
        const latestImage = ee.Image(collection.first());
        
        const getInfo = (eeObject: any): Promise<any> => {
          return new Promise((resolve, reject) => {
            eeObject.getInfo((data: any, err: any) => {
              if (err) reject(err);
              else resolve(data);
            });
          });
        };
 
        const imageInfo = await getInfo(latestImage);
        if (imageInfo) {
          const obsTime = imageInfo.properties['system:time_start'] || Date.now();
          geeImageDate = new Date(obsTime).toISOString();

          const sampled = latestImage.select('sst').sample({
            region: region,
            scale: 15000,
            geometries: true
          });
          const sampledInfo = await getInfo(sampled);
          geeData = (sampledInfo?.features || []).map((feat: any, idx: number) => {
            const coords = feat.geometry.coordinates;
            let sst = feat.properties.sst;
            if (sst !== undefined && sst !== null && sst > 100) {
              sst = sst * 0.01;
            }
            const suitability = sst !== undefined && sst !== null ? Math.max(0, 1.0 - Math.abs(sst - 12.0) / 4.0) : 0.0;
            return {
              id: `GEE-PT-${idx}`,
              lat: coords[1],
              lng: coords[0],
              probability: Number(suitability.toFixed(3)),
              sst: sst !== undefined && sst !== null ? Number(sst.toFixed(1)) : null
            };
          });
          geeStatus = 'connected';
        }
      }
    } catch (err: any) {
      geeStatus = 'credentials_required';
      geeError = err.message || String(err);
    }
  }

  // 2. Buoy SST
  const buoys = await fetchNDBCBuoy();
  const buoyStatus = buoys[0] && !buoys[0].error ? 'connected' : 'disconnected';

  // 3. Query sightings from BigQuery
  let userSightings: any[] = [];
  try {
    const bqProjectIdReal = bqTablePath.length === 3 ? bqTablePath[0] : (process.env.GOOGLE_CLOUD_PROJECT || 'smart-diet-app-482519');
    const bqDatasetIdReal = bqTablePath.length === 3 ? bqTablePath[1] : 'Whale_watch';
    const bqTableReal = bqTablePath.length === 3 ? bqTablePath[2] : 'whale-watch-bq';
    const q = `
      SELECT id, timestamp, latitude, longitude, species, verification_status as status
      FROM \`${bqProjectIdReal}.${bqDatasetIdReal}.${bqTableReal}\`
      ORDER BY timestamp DESC
      LIMIT 100
    `;
    const [rows] = await bigquery.query({ query: q });
    userSightings = rows;
  } catch (err) {
    console.warn('[Evaluate API] Sightings query failed:', err);
  }

  // 4. AIS vessels
  const vessels = aisManager.getVessels();

  // 5. Evaluate calculations in scoring engine
  const { dangerZones, updatedVessels } = ScoringEngine.evaluate(
    vessels,
    geeData,
    buoys,
    userSightings,
    OBIS_HISTORICAL_SIGHTINGS
  );

  // 6. Log dynamic evaluations to BigQuery
  try {
    const table = await ensurePredictionsTable();
    const rowsToInsert = dangerZones.map(z => ({
      prediction_id: crypto.randomUUID(),
      timestamp: startTimestamp,
      model_version: ScoringEngine.MODEL_VERSION,
      zone_id: z.id,
      zone_geometry: JSON.stringify({ type: 'Point', coordinates: [z.lng, z.lat] }),
      raw_inputs: JSON.stringify({
        geeAvailable: geeStatus === 'connected',
        buoyAvailable: buoyStatus === 'connected',
        vesselsCount: z.eligibleVesselCount,
        hasRealWhale: z.hasRealWhale
      }),
      normalized_inputs: JSON.stringify({
        geeInput: z.geeInput,
        buoyInput: z.buoyInput,
        bathyInput: z.bathyInput,
        seasonalInput: z.seasonalInput,
        vesselDensityInput: z.vesselDensityInput,
        vesselSpeedRiskInput: z.vesselSpeedRiskInput,
        routeOverlapInput: z.routeOverlapInput
      }),
      weights: JSON.stringify({
        preyWeights: z.preyWeights,
        whaleWeights: z.whaleWeights,
        collisionWeights: z.collisionWeights
      }),
      final_indices: JSON.stringify({
        preyProbability: z.preyProbability,
        whaleLikelihood: z.whaleLikelihood,
        collisionRisk: z.collisionRisk,
        riskScore: z.riskScore
      }),
      source_timestamps: JSON.stringify({ calculatedAt: startTimestamp }),
      source_availability: JSON.stringify({
        geeStatus: geeStatus,
        buoyStatus: buoyStatus,
        mbariStatus: 'analyzed_but_excluded',
        farallonStatus: 'analyzed_but_excluded'
      }),
      confidence_label: z.insufficientData ? 'insufficient_data' : (z.hasRealWhale ? 'verified_sighting' : 'model_estimate'),
      recommended_speed: 10.0,
      eligible_vessel_count: z.eligibleVesselCount,
      compliance_numerator: z.complianceNumerator,
      compliance_denominator: z.complianceDenominator,
      error_state: geeError ? JSON.stringify({ geeError }) : null
    }));

    if (rowsToInsert.length > 0) {
      await table.insert(rowsToInsert);
    }
  } catch (err) {
    console.error('[Evaluate API] Failed to log calculations to BigQuery:', err);
  }

  return NextResponse.json({
    status: 'success',
    dangerZones,
    vessels: updatedVessels,
    geeStatus,
    geeImageDate,
    buoyStatus,
    geeData,
    buoys,
    userSightings,
    aisStatus: aisManager.getStatus(),
    timestamp: startTimestamp
  });
}
