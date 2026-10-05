const { GoogleAuth } = require('google-auth-library');
const ee = require('@google/earthengine');

async function testGee() {
  console.log("Starting Earth Engine diagnostic test...");
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/earthengine', 'https://www.googleapis.com/auth/cloud-platform']
    });
    const projectId = await auth.getProjectId();
    console.log("Project ID detected:", projectId);

    const client = await auth.getClient();
    const token = await client.getAccessToken();
    console.log("Access token retrieved successfully.");

    await new Promise((resolve, reject) => {
      ee.data.setAuthToken('', 'Bearer', token.token, 3600, [], () => {
        console.log("setAuthToken complete. Initializing Earth Engine...");
        ee.initialize(null, null, () => {
          console.log("Earth Engine initialized successfully.");
          resolve();
        }, (err) => {
          reject(new Error("ee.initialize failed: " + err));
        }, null, projectId);
      }, false);
    });

    // Test 1: evaluate ee.Number(1)
    console.log("Evaluating ee.Number(1)...");
    const num = ee.Number(1);
    num.evaluate((val, err) => {
      if (err) {
        console.error("Number evaluation failed:", err);
      } else {
        console.log("Number evaluation success:", val);
      }
    });

    // Test 2: Access collection
    console.log("Accessing collection NOAA/CDR/OISST/V2_1...");
    const coll = ee.ImageCollection('NOAA/CDR/OISST/V2_1');
    const firstImg = coll.first();
    firstImg.getInfo((info, err) => {
      if (err) {
        console.error("Failed to load collection first image:", err);
      } else {
        console.log("Collection first image loaded successfully! ID:", info.id);
        console.log("Properties (system:time_start):", new Date(info.properties['system:time_start']).toISOString());
      }
    });

  } catch (err) {
    console.error("Test failed with error:", err.message || err);
  }
}

testGee();
