const WebSocket = require('ws');
const { execSync } = require('child_process');

function getApiKey() {
  try {
    const cmd = 'source ../setup_env.sh && gcloud run services describe whale-watch --region us-central1 --format=json';
    const output = execSync(cmd, { shell: '/bin/zsh' }).toString();
    const startIdx = output.indexOf('{');
    if (startIdx === -1) {
      throw new Error('No JSON output found in gcloud command: ' + output);
    }
    const jsonStr = output.substring(startIdx).trim();
    const data = JSON.parse(jsonStr);
    const envs = data.spec.template.spec.containers[0].env || [];
    const apiKeyEnv = envs.find(e => e.name === 'AISSTREAM_API_KEY');
    return apiKeyEnv ? apiKeyEnv.value : null;
  } catch (err) {
    console.error('Error fetching API key:', err.message);
    process.exit(1);
  }
}

const apiKey = getApiKey();
if (!apiKey) {
  console.error('API key is empty or missing from Cloud Run deployment.');
  process.exit(1);
}

console.log('Fetched API key successfully (redacted length:', apiKey.length, ')');

const minLat = 37.3;
const minLon = -123.5;
const maxLat = 38.3;
const maxLon = -121.8;

console.log(`Connecting to stream.aisstream.io with Ping/Pong tracking...`);

const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

let opened = false;
let messageCount = 0;
let errorCount = 0;
let closeCount = 0;
let pingCount = 0;
let pongCount = 0;

let pingInterval;

ws.on('open', () => {
  opened = true;
  console.log('WebSocket connection opened.');
  
  const subscription = {
    APIKey: apiKey,
    BoundingBoxes: [
      [
        [-90, -180],
        [90, 180]
      ]
    ],
    FilterMessageTypes: ["PositionReport"]
  };
  ws.send(JSON.stringify(subscription));
  console.log('Subscription sent.');

  // Set interval to send ping every 3 seconds
  pingInterval = setInterval(() => {
    try {
      ws.ping();
      pingCount++;
      console.log(`Sent ping #${pingCount}`);
    } catch (e) {
      console.error('Failed to send ping:', e.message);
    }
  }, 3000);
});

ws.on('pong', () => {
  pongCount++;
  console.log(`Received pong #${pongCount}`);
});

ws.on('message', (data) => {
  messageCount++;
  console.log(`Received message #${messageCount}:`, data.toString().substring(0, 300));
});

ws.on('error', (err) => {
  errorCount++;
  console.error('WebSocket error:', err.message || err);
});

ws.on('close', (code, reason) => {
  closeCount++;
  console.log(`WebSocket closed. Code: ${code}, Reason: ${reason}`);
  if (pingInterval) clearInterval(pingInterval);
});

setTimeout(() => {
  console.log('\n--- Summary ---');
  console.log('Opened:', opened);
  console.log('Pings Sent:', pingCount);
  console.log('Pongs Received:', pongCount);
  console.log('Message Count:', messageCount);
  console.log('Error Count:', errorCount);
  console.log('Close Count:', closeCount);
  
  if (pingInterval) clearInterval(pingInterval);
  ws.terminate();
  process.exit(0);
}, 20000);
