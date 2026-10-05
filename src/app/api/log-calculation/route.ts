import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';
import crypto from 'crypto';

const bqTableId = process.env.BIGQUERY_TABLE || 'platinum-banner-303105.Whale_watch.whale-watch-bq';
const bqTablePath = bqTableId.split('.');
const bqProjectId = bqTablePath.length === 3 ? bqTablePath[0] : (process.env.GOOGLE_CLOUD_PROJECT || 'smart-diet-app-482519');
const bqDatasetId = bqTablePath.length === 3 ? bqTablePath[1] : 'Whale_watch';
const predictionsTableId = 'whale-watch-predictions';

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'smart-diet-app-482519',
});

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

async function ensurePredictionsTable() {
  const dataset = bigquery.dataset(bqDatasetId, { projectId: bqProjectId });
  const table = dataset.table(predictionsTableId);
  const [exists] = await table.exists();
  if (!exists) {
    console.log(`[BigQuery Log] Creating table ${predictionsTableId}...`);
    await table.create({ schema });
    console.log(`[BigQuery Log] Table ${predictionsTableId} created.`);
    // Wait briefly for propagation
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  return table;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { timestamp, type, inputs, weights, indices, provider, errorStates, confidenceClassifications } = body;
    
    // Log to standard output / Cloud Logging secondary audit trail
    console.log('[MODEL_REPRODUCIBILITY_LOG]', JSON.stringify(body));

    const table = await ensurePredictionsTable();
    const rowsToInsert: any[] = [];
    const formattedTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    if (type === 'periodic_zone_evaluation' && indices?.zones && Array.isArray(indices.zones)) {
      indices.zones.forEach((z: any) => {
        rowsToInsert.push({
          prediction_id: crypto.randomUUID(),
          timestamp: formattedTimestamp,
          model_version: 'v1.1.0',
          zone_id: z.zoneId || 'unknown',
          zone_geometry: JSON.stringify(z.geometry || { type: 'Circle', center: [z.lat || 0, z.lng || 0], radius_km: 15 }),
          raw_inputs: JSON.stringify({
            activeZonesCount: inputs?.activeZonesCount || 0,
            vesselsCount: inputs?.vesselsCount || 0,
            whalesCount: inputs?.whalesCount || 0
          }),
          normalized_inputs: JSON.stringify({
            liveVesselDensity: z.liveVesselDensity || 0,
            vesselSpeedRisk: z.vesselSpeedRisk || 0,
            routeOverlapScore: z.routeOverlapScore || 0
          }),
          weights: JSON.stringify(weights || {}),
          final_indices: JSON.stringify({
            riskIndex: z.riskIndex || 0,
            preyIndex: z.preyIndex || 0,
            habitatIndex: z.habitatIndex || 0
          }),
          source_timestamps: JSON.stringify({ calculatedAt: formattedTimestamp }),
          source_availability: JSON.stringify({
            geeStatus: errorStates?.geeStatus || 'unknown',
            buoyStatus: errorStates?.buoyStatus || 'unknown'
          }),
          confidence_label: confidenceClassifications?.complianceMode || 'N/A',
          recommended_speed: 10.0,
          eligible_vessel_count: inputs?.eligibleVesselCount || 0,
          compliance_numerator: inputs?.complianceNumerator || 0,
          compliance_denominator: inputs?.complianceDenominator || 0,
          error_state: JSON.stringify(errorStates || {})
        });
      });
    } else if (type === 'warning_ticket') {
      rowsToInsert.push({
        prediction_id: crypto.randomUUID(),
        timestamp: formattedTimestamp,
        model_version: 'v1.1.0',
        zone_id: inputs?.dangerZoneId || 'unknown',
        zone_geometry: JSON.stringify({ name: inputs?.dangerZoneName || 'unknown' }),
        raw_inputs: JSON.stringify({
          vesselSpeed: inputs?.vesselSpeed || 0,
          vesselDraft: inputs?.vesselDraft || 0
        }),
        normalized_inputs: JSON.stringify({
          strikeRiskIndex: indices?.strikeRiskIndex || 0,
          dangerZoneRiskIndex: indices?.dangerZoneRiskIndex || 0
        }),
        weights: JSON.stringify(weights || {}),
        final_indices: JSON.stringify(indices || {}),
        source_timestamps: JSON.stringify({ calculatedAt: formattedTimestamp }),
        source_availability: JSON.stringify({
          geeStatus: errorStates?.geeStatus || 'unknown'
        }),
        confidence_label: confidenceClassifications?.whaleConfidence || 'N/A',
        recommended_speed: 10.0,
        eligible_vessel_count: null,
        compliance_numerator: null,
        compliance_denominator: null,
        error_state: JSON.stringify(errorStates || {})
      });
    } else {
      // Fallback row for generic evaluation
      rowsToInsert.push({
        prediction_id: crypto.randomUUID(),
        timestamp: formattedTimestamp,
        model_version: 'v1.1.0',
        zone_id: 'system',
        zone_geometry: JSON.stringify({}),
        raw_inputs: JSON.stringify(inputs || {}),
        normalized_inputs: JSON.stringify({}),
        weights: JSON.stringify(weights || {}),
        final_indices: JSON.stringify(indices || {}),
        source_timestamps: JSON.stringify({}),
        source_availability: JSON.stringify(errorStates || {}),
        confidence_label: 'N/A',
        recommended_speed: 10.0,
        eligible_vessel_count: null,
        compliance_numerator: null,
        compliance_denominator: null,
        error_state: JSON.stringify(errorStates || {})
      });
    }

    if (rowsToInsert.length > 0) {
      await table.insert(rowsToInsert);
      console.log(`[BigQuery Log] Inserted ${rowsToInsert.length} prediction log row(s).`);
    }

    return NextResponse.json({ success: true, count: rowsToInsert.length });
  } catch (error: any) {
    console.error('[BigQuery Log] Failed to log calculations:', error.message || error);
    return NextResponse.json({ error: 'Failed to write logs to BigQuery', details: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zoneId');
    const modelVersion = searchParams.get('modelVersion');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    await ensurePredictionsTable();

    let query = `SELECT * FROM \`${bqProjectId}.${bqDatasetId}.${predictionsTableId}\``;
    const conditions: string[] = [];
    const queryParams: any = {};

    if (zoneId) {
      conditions.push(`zone_id = @zoneId`);
      queryParams.zoneId = zoneId;
    }
    if (modelVersion) {
      conditions.push(`model_version = @modelVersion`);
      queryParams.modelVersion = modelVersion;
    }
    if (startTime) {
      conditions.push(`timestamp >= @startTime`);
      queryParams.startTime = startTime;
    }
    if (endTime) {
      conditions.push(`timestamp <= @endTime`);
      queryParams.endTime = endTime;
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY timestamp DESC LIMIT 20`;

    const options = {
      query: query,
      params: queryParams,
    };

    const [rows] = await bigquery.query(options);
    return NextResponse.json({ success: true, logs: rows });
  } catch (error: any) {
    console.error('[BigQuery Log] Failed to retrieve logs:', error.message || error);
    return NextResponse.json({ error: 'Failed to retrieve logs from BigQuery', details: error.message }, { status: 500 });
  }
}
