const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

const bqTableId = process.env.BIGQUERY_TABLE || 'platinum-banner-303105.Whale_watch.whale-watch-bq';
const bqTablePath = bqTableId.split('.');
const projectId = bqTablePath.length === 3 ? bqTablePath[0] : process.env.GOOGLE_CLOUD_PROJECT;
const datasetId = bqTablePath.length === 3 ? bqTablePath[1] : bqTablePath[0];
const tableId = bqTablePath.length === 3 ? bqTablePath[2] : bqTablePath[1];

const bigquery = new BigQuery({
  projectId: projectId,
});

async function seed() {
  try {
    const dataset = bigquery.dataset(datasetId);
    const [datasetExists] = await dataset.exists();
    if (!datasetExists) {
      await dataset.create();
    }

    const table = dataset.table(tableId);
    const [tableExists] = await table.exists();
    
    if (tableExists) {
      await table.delete();
      console.log('Deleted old table to reset schema.');
    }

    const schema = 'timestamp:TIMESTAMP, latitude:FLOAT, longitude:FLOAT, image_url:STRING, species:STRING, whale_count:INTEGER, user_id:STRING, created_at:TIMESTAMP, id:STRING, verification_status:STRING, source_type:STRING, confidence:FLOAT, approval_status:STRING';

    await table.create({ schema: schema });
    console.log('Created new table with correct schema. Waiting 5 seconds for propagation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const query = `
      INSERT INTO \`${projectId}.${datasetId}.${tableId}\` 
      (timestamp, latitude, longitude, image_url, species, whale_count, user_id, created_at, id, verification_status, source_type, confidence, approval_status)
      VALUES 
      (CURRENT_TIMESTAMP(), 37.8199, -122.4783, 'https://images.unsplash.com/photo-1568430462989-44163eb1752f', 'Humpback Whale', 2, 'anonymous', CURRENT_TIMESTAMP(), 'BQ-SIGHTING-MOCK-1', 'image_verified', 'user-reported', 0.90, 'approved'),
      (TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR), 37.6961, -123.0014, 'https://images.unsplash.com/photo-1598059048924-f7b538740d04', 'Blue Whale', 1, 'anonymous', CURRENT_TIMESTAMP(), 'BQ-SIGHTING-MOCK-2', 'image_verified', 'user-reported', 0.90, 'approved'),
      (TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 HOUR), 37.4916, -122.5033, 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0', 'Gray Whale', 3, 'anonymous', CURRENT_TIMESTAMP(), 'BQ-SIGHTING-MOCK-3', 'image_verified', 'user-reported', 0.90, 'approved')
    `;

    await bigquery.query(query);
    console.log('Successfully seeded Bay Area sightings via query.');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

seed();
