import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
// @ts-ignore
import ee from '@google/earthengine';
import { bigquery, bqTableId } from '@/lib/gcp';
import { ScoringEngine } from '@/lib/scoringEngine';
import { aisManager } from '@/lib/aisManager';

const bqTablePath = bqTableId.split('.');
const bqProjectId = bqTablePath.length === 3 ? bqTablePath[0] : (process.env.GOOGLE_CLOUD_PROJECT || 'smart-diet-app-482519');
const bqDatasetId = bqTablePath.length === 3 ? bqTablePath[1] : 'Whale_watch';
const bqTableReal = bqTablePath.length === 3 ? bqTablePath[2] : 'whale-watch-bq';

const OBIS_HISTORICAL_SIGHTINGS = [
  { id: 'OBIS-01', latitude: 37.810, longitude: -123.080, species: 'Humpback Whale', date: '2026-05-10', source: 'OBIS-SEAMAP', sourceType: 'historical' },
  { id: 'OBIS-02', latitude: 37.695, longitude: -122.955, species: 'Blue Whale', date: '2026-05-12', source: 'OBIS-SEAMAP', sourceType: 'historical' },
  { id: 'OBIS-03', latitude: 37.980, longitude: -123.180, species: 'Fin Whale', date: '2026-05-14', source: 'OBIS-SEAMAP', sourceType: 'historical' },
  { id: 'OBIS-04', latitude: 37.525, longitude: -122.785, species: 'Gray Whale', date: '2026-05-18', source: 'OBIS-SEAMAP', sourceType: 'historical' },
  { id: 'OBIS-05', latitude: 37.610, longitude: -122.610, species: 'Humpback Whale', date: '2026-05-20', source: 'OBIS-SEAMAP', sourceType: 'historical' }
];

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

export async function GET() {
  try {
    const startTimestamp = new Date().toISOString();
    let geeStatus = 'disconnected';
    let geeData: any[] = [];

    // 1. GEE Hotspots
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
      }
    }

    // 2. Buoy SST
    const buoys = await fetchNDBCBuoy();
    const buoyStatus = buoys[0] && !buoys[0].error ? 'connected' : 'disconnected';

    // 3. Sightings from BigQuery
    let userSightings: any[] = [];
    try {
      const q = `
        SELECT id, timestamp, latitude, longitude, species, verification_status as status
        FROM \`${bqProjectId}.${bqDatasetId}.${bqTableReal}\`
        ORDER BY timestamp DESC
        LIMIT 100
      `;
      const [rows] = await bigquery.query({ query: q });
      userSightings = rows;
    } catch (err) {
      console.warn('[Risk Zones Debug] Sightings query failed:', err);
    }

    // 4. AIS Vessels
    const vessels = aisManager.getVessels();

    // 5. Evaluate Calculations
    const { dangerZones } = ScoringEngine.evaluate(
      vessels,
      geeData,
      buoys,
      userSightings,
      OBIS_HISTORICAL_SIGHTINGS
    );

    const zoneInputsMapped = dangerZones.map(z => {
      const expiresAt = new Date(new Date(z.timestamp || startTimestamp).getTime() + 12 * 3600000).toISOString();
      return {
        zoneId: z.id,
        name: z.name,
        lat: z.lat,
        lon: z.lng,
        radiusMeters: z.radiusKm * 1000,
        finalRisk: z.collisionRisk,
        whaleLikelihood: z.whaleLikelihood,
        vesselDensityScore: z.vesselDensityInput,
        speedRiskScore: z.vesselSpeedRiskInput,
        routeOverlapScore: z.routeOverlapInput,
        sourceCompleteness: z.completeness,
        originalWeights: z.collisionWeights?.original || null,
        effectiveWeights: z.collisionWeights?.effective || null,
        liveVesselsInsideOrApproaching: z.vesselCount,
        reasonActivated: z.crossedReason,
        expiresAt: expiresAt,
        active: z.active
      };
    });

    return NextResponse.json({
      modelVersion: ScoringEngine.MODEL_VERSION,
      generatedAt: startTimestamp,
      environmentalSourceState: geeStatus,
      buoySourceState: buoyStatus,
      aisSourceState: aisManager.getStatus().status,
      numberOfCandidateCells: dangerZones.length,
      numberOfActiveZones: dangerZones.filter(z => z.active).length,
      zoneInputs: zoneInputsMapped,
      rejectedCandidateReasons: {}
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      message: err.message || 'Internal server error'
    }, { status: 500 });
  }
}
