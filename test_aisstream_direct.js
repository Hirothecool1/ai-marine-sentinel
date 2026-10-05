const WebSocket = require('ws');

const apiKey = process.env.AISSTREAM_API_KEY;

function testBox(name, minLat, minLon, maxLat, maxLon, durationMs) {
  return new Promise((resolve) => {
    console.log(`\n=============================================`);
    console.log(`Starting AISstream Direct Test for: ${name}`);
    console.log(`Bounding Box: [${minLat}, ${minLon}] to [${maxLat}, ${maxLon}]`);
    console.log(`Duration: ${durationMs / 1000} seconds`);
    console.log(`=============================================`);

    const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    let rawFramesCount = 0;
    let validPositionsCount = 0;
    let rejectedCount = 0;
    const rejections = {};
    const vessels = [];

    const timeout = setTimeout(() => {
      console.log(`[${name}] Time limit reached. Closing connection...`);
      ws.close();
    }, durationMs);

    ws.on('open', () => {
      console.log(`[${name}] WebSocket connection opened.`);
      const subscription = {
        APIKey: apiKey,
        BoundingBoxes: [
          [
            [minLat, minLon],
            [maxLat, maxLon]
          ]
        ]
      };
      ws.send(JSON.stringify(subscription));
      console.log(`[${name}] Subscription payload sent.`);
    });

    ws.on('message', (messageData) => {
      rawFramesCount++;
      try {
        const rawString = messageData.toString();
        const parsed = JSON.parse(rawString);
        
        // Count errors returned by the provider
        if (parsed.Error) {
          const errMsg = parsed.Error;
          rejectedCount++;
          rejections[errMsg] = (rejections[errMsg] || 0) + 1;
          return;
        }

        const metadata = parsed.MetaData;
        const messageType = parsed.MessageType;

        if (!metadata) {
          rejectedCount++;
          rejections['Missing MetaData'] = (rejections['Missing MetaData'] || 0) + 1;
          return;
        }

        const mmsi = metadata.MMSI;
        const lat = metadata.latitude;
        const lng = metadata.longitude;
        const shipName = (metadata.ShipName || '').trim();

        if (!mmsi) {
          rejectedCount++;
          rejections['Missing MMSI'] = (rejections['Missing MMSI'] || 0) + 1;
          return;
        }

        if (typeof lat !== 'number' || typeof lng !== 'number') {
          rejectedCount++;
          rejections['Invalid or Missing Coordinates'] = (rejections['Invalid or Missing Coordinates'] || 0) + 1;
          return;
        }

        // Validate coordinate bounds
        if (lat < minLat || lat > maxLat || lng < minLon || lng > maxLon) {
          rejectedCount++;
          rejections['Outside Bounding Box'] = (rejections['Outside Bounding Box'] || 0) + 1;
          return;
        }

        // Extract speed
        let speed = null;
        if (parsed.Message && parsed.Message[messageType]) {
          const inner = parsed.Message[messageType];
          if (typeof inner.Sog === 'number') {
            speed = inner.Sog;
          } else if (typeof inner.SpeedOverGround === 'number') {
            speed = inner.SpeedOverGround;
          }
        }

        if (speed !== null && (speed < 0 || speed > 120 || isNaN(speed))) {
          rejectedCount++;
          rejections['Invalid Speed'] = (rejections['Invalid Speed'] || 0) + 1;
          return;
        }

        // Extract heading/course
        let heading = null;
        if (parsed.Message && parsed.Message[messageType]) {
          const inner = parsed.Message[messageType];
          if (typeof inner.Cog === 'number') {
            heading = inner.Cog;
          } else if (typeof inner.CourseOverGround === 'number') {
            heading = inner.CourseOverGround;
          } else if (typeof inner.TrueHeading === 'number') {
            heading = inner.TrueHeading;
          }
        }

        validPositionsCount++;

        if (vessels.length < 5) {
          vessels.push({
            MMSI: mmsi,
            name: shipName || `MMSI ${mmsi}`,
            lat,
            lon: lng,
            speed: speed !== null ? speed : 'N/A',
            heading: heading !== null ? heading : 'N/A',
            timestamp: metadata.time_utc || new Date().toISOString(),
            messageType
          });
        }
      } catch (err) {
        rejectedCount++;
        rejections[`Parse Error: ${err.message}`] = (rejections[`Parse Error: ${err.message}`] || 0) + 1;
      }
    });

    ws.on('error', (err) => {
      console.error(`[${name}] WebSocket error:`, err.message || err);
    });

    ws.on('close', (code, reason) => {
      clearTimeout(timeout);
      console.log(`[${name}] WebSocket closed. Code: ${code}, Reason: ${reason.toString() || 'None'}`);
      console.log(`\n--- Results for ${name} ---`);
      console.log(`Raw frames received: ${rawFramesCount}`);
      console.log(`Valid position reports decoded: ${validPositionsCount}`);
      console.log(`Rejected records: ${rejectedCount}`);
      console.log(`Rejection Reasons:`, JSON.stringify(rejections, null, 2));
      console.log(`First 5 vessels:`, JSON.stringify(vessels, null, 2));
      resolve({ rawFramesCount, validPositionsCount, rejectedCount, rejections, vessels });
    });
  });
}

async function runAll() {
  // Test Normal Box (120 seconds)
  const normalResults = await testBox('Normal Box', 37.3, -123.5, 38.3, -121.8, 120000);
  
  // Test Wider Box (120 seconds)
  const widerResults = await testBox('Wider Box', 36.5, -124.5, 39.0, -121.0, 120000);
  
  console.log('\n=============================================');
  console.log('All tests completed.');
  console.log('=============================================');
}

runAll();
