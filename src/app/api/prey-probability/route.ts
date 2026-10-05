import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
// @ts-ignore
import ee from '@google/earthengine';

export async function GET() {
  let geeProject = process.env.GOOGLE_EARTH_ENGINE_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  
  if (process.env.FORCE_DISABLE_EXTERNAL_APIS === 'true') {
    return NextResponse.json({
      status: 'credentials_required',
      message: 'Google Earth Engine credentials disabled by policy',
      project: geeProject || 'None',
      data: [],
      fallbackData: [],
      timestamp: new Date().toISOString()
    });
  }

  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/earthengine', 'https://www.googleapis.com/auth/cloud-platform']
    });

    if (!geeProject) {
      geeProject = await auth.getProjectId();
    }

    if (!geeProject) {
      throw new Error('GOOGLE_EARTH_ENGINE_PROJECT environment variable is missing and could not be detected from ADC');
    }

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    if (!token || !token.token) {
      throw new Error('Google Application Default Credentials (ADC) failed to fetch access token');
    }

    // Authenticate and initialize the Google Earth Engine library
    await new Promise<void>((resolve, reject) => {
      ee.data.setAuthToken('', 'Bearer', token.token, 3600, [], () => {
        ee.initialize(null, null, () => {
          resolve();
        }, (err: any) => {
          reject(err);
        }, null, geeProject);
      }, false);
    });

    // Query Earth Engine: NOAA OISST daily collection
    // Bounding box for SF Bay and offshore study area: [-123.5, 37.1, -122.0, 38.5]
    const region = ee.Geometry.Rectangle([-123.5, 37.1, -122.0, 38.5]);
    const collection = ee.ImageCollection('NOAA/CDR/OISST/V2_1')
      .filterBounds(region)
      .sort('system:time_start', false);

    const latestImage = ee.Image(collection.first());

    // Wrap getInfo in a promise
    const getInfo = (eeObject: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        eeObject.getInfo((data: any, err: any) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    };

    const imageInfo = await getInfo(latestImage);
    if (!imageInfo) {
      throw new Error('No images found in NOAA OISST V2.1 collection');
    }

    const observationTimestamp = imageInfo.properties['system:time_start'] || Date.now();
    const observationTime = new Date(observationTimestamp).toISOString();

    // Sample points in the SF Bay study area at 15km resolution (15000 meters)
    const sampled = latestImage.select('sst').sample({
      region: region,
      scale: 15000,
      geometries: true
    });

    const sampledInfo = await getInfo(sampled);
    const dataPoints = (sampledInfo?.features || []).map((feat: any, idx: number) => {
      const coords = feat.geometry.coordinates;
      let sst = feat.properties.sst; // Celsius
      if (sst !== undefined && sst !== null && sst > 100) {
        sst = sst * 0.01;
      }
      // Normalization: suitability peaks at 12°C, drops to 0 at 8°C and 16°C
      const suitability = sst !== undefined && sst !== null ? Math.max(0, 1.0 - Math.abs(sst - 12.0) / 4.0) : 0.0;
      return {
        id: `GEE-PT-${idx}`,
        lat: coords[1],
        lng: coords[0],
        probability: Number(suitability.toFixed(3)),
        sst: sst !== undefined && sst !== null ? Number(sst.toFixed(1)) : null,
        source: 'Google Earth Engine (NOAA OISST V2_1)'
      };
    });

    return NextResponse.json({
      status: 'connected',
      project: geeProject,
      data: dataPoints,
      timestamp: observationTime,
      variablesUsed: 'Sea Surface Temperature (sst)',
      sourceType: 'near-real-time proxy',
      label: 'Environmental prey-habitat proxy — not direct krill detection',
      assetId: imageInfo.id,
      collectionId: 'NOAA/CDR/OISST/V2_1',
      band: 'sst',
      units: 'Celsius (°C)',
      spatialResolution: '15km grid',
      qualityControl: 'sampled across shelf bounding box with null filters',
      imageDate: observationTime
    });

  } catch (error: any) {
    console.warn('[Prey Proxy API] Google Earth Engine connection failed:', error.message || error);
    
    return NextResponse.json({
      status: 'credentials_required',
      message: `Google Earth Engine connection failed: ${error.message || error}. Action Required: The Google Cloud project smart-diet-app-482519 must be registered for Earth Engine noncommercial use. Visit https://console.cloud.google.com/earth-engine/configuration?project=smart-diet-app-482519 using your Google account to complete the registration wizard.`,
      project: geeProject || 'None',
      data: [],
      fallbackData: [], // Bathymetry coordinates must NOT be returned as prey/plankton hotspots
      timestamp: new Date().toISOString()
    });
  }
}
