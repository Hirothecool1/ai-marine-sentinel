const { GoogleAuth } = require('google-auth-library');
const ee = require('@google/earthengine');
const fetch = require('node-fetch');

async function runDiagnostics() {
  console.log("=== 1. Application Default Credentials Check ===");
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/earthengine', 'https://www.googleapis.com/auth/cloud-platform']
  });

  const client = await auth.getClient();
  const projectId = await auth.getProjectId();
  const credentials = await auth.getCredentials();
  
  console.log("Detected Project ID:", projectId);
  console.log("Service Account / Credentials Client Email:", credentials.client_email || "Not a service account JSON");
  console.log("Credentials Type:", credentials.type || "Default Application Credentials");

  console.log("\n=== 2. Direct REST API Query: projects.getConfig ===");
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;

  const url = 'https://earthengine.googleapis.com/v1/projects/smart-diet-app-482519/config';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-Goog-User-Project': 'smart-diet-app-482519'
  };

  console.log("Request URL:", url);
  console.log("Request Headers (Sanitized):", {
    'Authorization': 'Bearer <REDACTED_ACCESS_TOKEN>',
    'X-Goog-User-Project': headers['X-Goog-User-Project']
  });

  const res = await fetch(url, { headers });
  const status = res.status;
  const body = await res.json();
  console.log("REST Response Status:", status);
  console.log("REST Response Body:", JSON.stringify(body, null, 2));

  console.log("\n=== 3. Earth Engine JavaScript Library Initialization ===");
  try {
    await new Promise((resolve, reject) => {
      ee.data.setAuthToken('', 'Bearer', token, 3600, [], () => {
        ee.initialize(
          null,
          null,
          () => {
            console.log("ee.initialize succeeded!");
            resolve();
          },
          (err) => {
            console.error("ee.initialize failed:", err);
            reject(err);
          },
          null,
          'smart-diet-app-482519'
        );
      }, false);
    });

    console.log("\n=== 4. Evaluate ee.Number(1) ===");
    const numResult = await new Promise((resolve, reject) => {
      ee.Number(1).evaluate((result, err) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    console.log("ee.Number(1) result:", numResult);

    console.log("\n=== 5. Retrieve NOAA/CDR/OISST/V2.1 latest image date ===");
    const imageDate = await new Promise((resolve, reject) => {
      const collection = ee.ImageCollection('NOAA/CDR/OISST/V2.1');
      const latestImage = collection.sort('system:time_start', false).first();
      latestImage.date().format('YYYY-MM-dd').evaluate((result, err) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    console.log("NOAA/CDR/OISST/V2.1 Latest Image Date:", imageDate);

  } catch (err) {
    console.error("Library Exception Caught during run:", err.message || err);
  }
}

runDiagnostics().catch(console.error);
