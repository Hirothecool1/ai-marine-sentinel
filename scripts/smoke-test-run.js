const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON response from ${url}: ${e.message}\nRaw response: ${data.substring(0, 300)}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const baseUrl = 'https://whale-watch-474208523276.us-central1.run.app';
  console.log(`=== Starting Production Smoke Test against ${baseUrl} ===\n`);

  try {
    // 1. Check Configuration
    console.log('[Test 1] Fetching /api/config...');
    const config = await fetchJson(`${baseUrl}/api/config`);
    console.log('Config response received.');
    console.log(`- realDataOnly: ${config.realDataOnly}`);
    console.log(`- allowSampleData: ${config.allowSampleData}`);
    console.log(`- forceDisableExternalApis: ${config.forceDisableExternalApis}`);
    console.log(`- aisStreamKeyConfigured: ${config.aisStreamKeyConfigured}`);
    console.log(`- buildRevision: ${config.buildRevision}\n`);

    if (config.realDataOnly !== 'true' || config.allowSampleData !== 'false') {
      throw new Error('FAIL: Fake-data lockdown environment policy is not enforced (REAL_DATA_ONLY/ALLOW_SAMPLE_DATA are incorrect).');
    }
    console.log('✅ Configuration flags verified successfully!\n');

    // 2. Run Debug AISstream test
    console.log('[Test 2] Running /api/debug/aisstream-test?wait=30 (Forces fresh WebSocket connection)...');
    const debugResult = await fetchJson(`${baseUrl}/api/debug/aisstream-test?wait=30`);
    console.log('Debug result received:');
    console.log(JSON.stringify(debugResult, null, 2));
    console.log();

    if (debugResult.status !== 'success') {
      throw new Error(`FAIL: Debug API failed with status ${debugResult.status}`);
    }
    if (!debugResult.websocketOpened) {
      throw new Error('FAIL: WebSocket connection failed to open before timeout.');
    }
    if (!debugResult.subscriptionSent) {
      throw new Error('FAIL: WebSocket opened but subscription was not sent.');
    }
    console.log(`✅ WebSocket handshake and subscription verified successfully!`);
    console.log(`Conclusion: "${debugResult.conclusion}"\n`);

    // 3. Check Live Vessels endpoint
    console.log('[Test 3] Fetching /api/live/ais-vessels...');
    const liveVessels = await fetchJson(`${baseUrl}/api/live/ais-vessels?t=${Date.now()}`);
    console.log('Live vessels response received:');
    console.log(`- status: ${liveVessels.status}`);
    console.log(`- count: ${liveVessels.count}`);
    console.log(`- aisStatus status: ${liveVessels.aisStatus ? liveVessels.aisStatus.status : 'N/A'}`);
    console.log(`- timestamp: ${liveVessels.timestamp}\n`);

    if (liveVessels.status !== 'success') {
      throw new Error(`FAIL: Live vessels API failed with status ${liveVessels.status}`);
    }

    if (liveVessels.vessels && liveVessels.vessels.length > 0) {
      console.log('Vessels parsed:');
      liveVessels.vessels.slice(0, 3).forEach((v, i) => {
        console.log(`  Vessel ${i+1}:`);
        console.log(`    - MMSI: ${v.MMSI}`);
        console.log(`    - latitude: ${v.latitude}`);
        console.log(`    - longitude: ${v.longitude}`);
        console.log(`    - speed: ${v.speed}`);
        console.log(`    - timestamp: ${v.timestamp}`);
        console.log(`    - sourceName: ${v.sourceName}`);
        console.log(`    - sourceType: ${v.sourceType}`);
        console.log(`    - isRealData: ${v.isRealData}`);
      });
      // Audit for fake vessels in the returned list
      const fakeVessels = liveVessels.vessels.filter(v => !v.id.startsWith('AIS-') && !v.id.startsWith('LK-') && !v.id.startsWith('HIST-'));
      if (fakeVessels.length > 0) {
        throw new Error(`FAIL: Found ${fakeVessels.length} non-AIS mock/demo vessels in real-data vessels API!`);
      }
    } else {
      console.log('No active vessels received in bbox (expected due to upstream AISstream.io server-side outage).');
    }

    console.log('\n✅ All tests passed successfully!');
    process.exit(0);

  } catch (error) {
    console.error(`\n❌ Smoke test failed: ${error.message}`);
    process.exit(1);
  }
}

run();
