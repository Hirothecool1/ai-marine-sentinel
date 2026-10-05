import { NextResponse } from 'next/server';
import { bigquery, storage, ai, bucketName, bqTableId } from '@/lib/gcp';
import exifr from 'exifr';

export async function GET() {
  if (process.env.FORCE_DISABLE_EXTERNAL_APIS === 'true') {
    return NextResponse.json({ sightings: [], ais: [] });
  }

  try {
    const bqTablePath = bqTableId.split('.'); // e.g., projectId.datasetId.tableId
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

    const query = `
      SELECT id, timestamp, latitude, longitude, image_url, species, whale_count, verification_status, source_type, confidence, approval_status
      FROM \`${projectId}.${datasetId}.${tableId}\`
      ORDER BY timestamp DESC
      LIMIT 100
    `;

    const [rows] = await bigquery.query({ query });

    // Load real AIS data
    let ships = [];
    try {
      const fs = require('fs');
      const path = require('path');
      const aisPath = path.join(process.cwd(), 'data', 'ais.json');
      if (fs.existsSync(aisPath)) {
        ships = JSON.parse(fs.readFileSync(aisPath, 'utf8'));
      }
    } catch (e) {
      console.error('Failed to load AIS data:', e);
    }

    return NextResponse.json({ sightings: rows, ais: ships });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch sightings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const timestamp = formData.get('timestamp') as string;

    if (!file) {
      return NextResponse.json({ error: 'Missing required file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Extract GPS coordinates from image EXIF metadata
    let latitude: number | null = null;
    let longitude: number | null = null;
    
    try {
      const gps = await exifr.gps(buffer);
      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        latitude = gps.latitude;
        longitude = gps.longitude;
      }
    } catch (exifError) {
      console.error('EXIF extraction failed:', exifError);
    }

    if (latitude === null || longitude === null) {
      return NextResponse.json({ 
        error: 'No GPS metadata found in the image. Please upload a photo with geotags/location enabled.' 
      }, { status: 400 });
    }

    // 2. Validate image via Vertex AI Gemini before uploading or saving
    let species = 'Unknown';
    let count = 1;
    let hasWhales = false;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Analyze this image. Identify if there are whales. If yes, what species are they? How many whales are visible? Return strictly a JSON object with keys: "species" (string), "count" (number), "hasWhales" (boolean).' },
              {
                inlineData: {
                  data: buffer.toString('base64'),
                  mimeType: file.type,
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
        }
      });

      const aiText = response.text;
      if (aiText) {
        const aiData = JSON.parse(aiText);
        hasWhales = !!aiData.hasWhales;
        if (hasWhales) {
          species = aiData.species || 'Unknown Whale';
          count = aiData.count || 1;
        }
      }
    } catch (aiError) {
      console.error('Vertex AI Error:', aiError);
      return NextResponse.json({ error: 'AI analysis failed during image validation' }, { status: 500 });
    }

    if (!hasWhales) {
      return NextResponse.json({ 
        error: 'Validation failed: The uploaded image does not appear to contain any whales.' 
      }, { status: 400 });
    }

    // 3. Upload to GCS now that validation has passed
    const fileName = `sightings/${Date.now()}-${file.name}`;
    const bucket = storage.bucket(bucketName.replace('gs://', ''));
    const gcsFile = bucket.file(fileName);
    
    await gcsFile.save(buffer, {
      contentType: file.type,
      resumable: false,
    });
    
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // 4. Insert into BigQuery using the extracted EXIF coordinates
    try {
      const bqTablePath = bqTableId.split('.');
      let projectId, datasetId, tableId;
      
      if (bqTablePath.length === 3) {
        projectId = bqTablePath[0];
        datasetId = bqTablePath[1];
        tableId = bqTablePath[2];
      } else {
        projectId = process.env.GOOGLE_CLOUD_PROJECT;
        datasetId = 'Whale_watch';
        tableId = 'whale-watch-bq';
      }

      const sightingId = `BQ-SIGHTING-${Date.now()}`;
      const query = `
        INSERT INTO \`${projectId}.${datasetId}.${tableId}\` 
        (timestamp, latitude, longitude, image_url, species, whale_count, user_id, created_at, id, verification_status, source_type, confidence, approval_status)
        VALUES 
        (TIMESTAMP('${new Date(timestamp || Date.now()).toISOString()}'), ${latitude}, ${longitude}, '${imageUrl}', '${species}', ${count}, 'anonymous', CURRENT_TIMESTAMP(), '${sightingId}', 'image_verified', 'user-reported', 0.90, 'approved')
      `;

      await bigquery.query({ query });
    } catch (bqError) {
      console.error('BigQuery Insert Error:', bqError);
      return NextResponse.json({ error: 'Failed to save to database', details: bqError }, { status: 500 });
    }

    return NextResponse.json({ success: true, species, count, imageUrl, latitude, longitude });

  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
