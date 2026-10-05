const { GoogleAuth } = require('google-auth-library');
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

    console.log('Access token fetched successfully.');

    // Query collection listImages
    const geeApiUrl = `https://earthengine.googleapis.com/v1alpha/projects/${geeProject}/assets/NOAA/CDR/OISST/V2.1:listImages?pageSize=3`;
    console.log('Fetching:', geeApiUrl);
    const geeRes = await fetch(geeApiUrl, {
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', geeRes.status);
    const text = await geeRes.text();
    console.log('Response:', text);
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
