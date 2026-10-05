const { GoogleAuth } = require('google-auth-library');
const ee = require('@google/earthengine');
require('dotenv').config();

async function run() {
  let geeProject = process.env.GOOGLE_EARTH_ENGINE_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  console.log('Project ID:', geeProject);
  
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/earthengine', 'https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    if (!token || !token.token) {
      throw new Error('Failed to fetch access token');
    }

    console.log('Access token fetched.');

    ee.data.setAuthToken('', 'Bearer', token.token, 3600, [], () => {
      console.log('Token set. Initializing ee...');
      ee.initialize(null, null, () => {
        console.log('ee initialized successfully!');
        
        // Let's query NOAA OISST daily collection and get the latest image's mean value
        const collection = ee.ImageCollection('NOAA/CDR/OISST/V2.1')
          .filterBounds(ee.Geometry.Point([-122.8, 37.8]))
          .sort('system:time_start', false);
        
        const latestImage = ee.Image(collection.first());
        
        latestImage.getInfo((info, err) => {
          if (err) {
            console.error('getInfo error:', err);
            return;
          }
          console.log('Latest OISST Image ID:', info.id);
          console.log('Bands:', info.bands);
          console.log('Properties:', info.properties);
          
          // Let's sample a small grid of values in the SF Bay
          // Bounding box for SF Bay and offshore study area: [-123.5, 37.1, -122.0, 38.5]
          const region = ee.Geometry.Rectangle([-123.5, 37.1, -122.0, 38.5]);
          
          // Let's sample the image at 10km scale (10000m)
          const sampled = latestImage.select('sst').sample({
            region: region,
            scale: 10000,
            geometries: true
          });
          
          sampled.getInfo((featuresInfo, featErr) => {
            if (featErr) {
              console.error('sample error:', featErr);
              return;
            }
            console.log('Sampled features count:', featuresInfo.features.length);
            if (featuresInfo.features.length > 0) {
              console.log('Sample feature:', JSON.stringify(featuresInfo.features[0]));
            }
          });
        });
      }, (initErr) => {
        console.error('ee.initialize error:', initErr);
      }, null, geeProject);
    }, false);
  } catch (error) {
    console.error('Outer error:', error);
  }
}

run();
