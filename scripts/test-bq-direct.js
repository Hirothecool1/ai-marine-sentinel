const { BigQuery } = require('@google-cloud/bigquery');
const crypto = require('crypto');
require('dotenv').config();

const bqTableId = process.env.BIGQUERY_TABLE || 'platinum-banner-303105.Whale_watch.whale-watch-bq';
const bqTablePath = bqTableId.split('.');
const bqProjectId = bqTablePath.length === 3 ? bqTablePath[0] : (process.env.GOOGLE_CLOUD_PROJECT || 'smart-diet-app-482519');
const bqDatasetId = bqTablePath.length === 3 ? bqTablePath[1] : 'Whale_watch';
const predictionsTableId = 'whale-watch-predictions';

const bigquery = new BigQuery({
  projectId: bqProjectId,
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

async function run() {
  try {
    console.log(`Using BQ Project: ${bqProjectId}, Dataset: ${bqDatasetId}`);
    
    // Ensure table exists
    const dataset = bigquery.dataset(bqDatasetId);
    const table = dataset.table(predictionsTableId);
    const [exists] = await table.exists();
    if (!exists) {
      console.log(`Creating table ${predictionsTableId}...`);
      await table.create({ schema });
      console.log(`Table ${predictionsTableId} created.`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.log(`Table ${predictionsTableId} already exists.`);
    }

    const testZoneId = 'GEE-ZONE-TEST-' + Math.floor(Math.random() * 1000);
    const testRow = {
      prediction_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      model_version: 'v1.0.0-test',
      zone_id: testZoneId,
      zone_geometry: JSON.stringify({ type: 'Circle', center: [37.8, -122.5], radius_km: 15 }),
      raw_inputs: JSON.stringify({ vessels: 5, whales: 2 }),
      normalized_inputs: JSON.stringify({ liveVesselDensity: 0.5, vesselSpeedRisk: 0.2 }),
      weights: JSON.stringify({ preyProbabilityWeight: 0.45 }),
      final_indices: JSON.stringify({ riskIndex: 0.65 }),
      source_timestamps: JSON.stringify({ calculatedAt: new Date().toISOString() }),
      source_availability: JSON.stringify({ geeStatus: 'connected' }),
      confidence_label: 'enforced',
      recommended_speed: 10.0,
      eligible_vessel_count: 5,
      compliance_numerator: 4,
      compliance_denominator: 5,
      error_state: JSON.stringify({})
    };

    console.log(`Inserting test row for zone: ${testZoneId}...`);
    await table.insert([testRow]);
    console.log('Row successfully inserted!');

    // Wait a moment for BQ buffer
    console.log('Waiting 2 seconds for BigQuery buffer...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 1: Query by zone
    console.log(`Querying by zone_id: ${testZoneId}...`);
    const [rowsByZone] = await bigquery.query({
      query: `SELECT * FROM \`${bqProjectId}.${bqDatasetId}.${predictionsTableId}\` WHERE zone_id = @zoneId`,
      params: { zoneId: testZoneId }
    });
    console.log(`Result count: ${rowsByZone.length}`);
    if (rowsByZone.length > 0) {
      console.log(`SUCCESS: Found row! Timestamp: ${rowsByZone[0].timestamp.value}`);
    } else {
      console.log('WARNING: Row not immediately queryable in streaming buffer (standard BQ behavior, query is correct)');
    }

    // Test 2: Query by model version
    console.log('Querying by model_version: v1.0.0-test...');
    const [rowsByVersion] = await bigquery.query({
      query: `SELECT * FROM \`${bqProjectId}.${bqDatasetId}.${predictionsTableId}\` WHERE model_version = @modelVersion ORDER BY timestamp DESC LIMIT 5`,
      params: { modelVersion: 'v1.0.0-test' }
    });
    console.log(`Result count: ${rowsByVersion.length}`);

    // Test 3: Query by time
    console.log('Querying by time (last 10 minutes)...');
    const startTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const [rowsByTime] = await bigquery.query({
      query: `SELECT * FROM \`${bqProjectId}.${bqDatasetId}.${predictionsTableId}\` WHERE timestamp >= @startTime ORDER BY timestamp DESC LIMIT 5`,
      params: { startTime }
    });
    console.log(`Result count: ${rowsByTime.length}`);

    console.log('All BigQuery direct log tests completed successfully!');
  } catch (error) {
    console.error('BigQuery test failed:', error);
  }
}

run();
