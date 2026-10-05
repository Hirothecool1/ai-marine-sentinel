const WebSocket = require('ws');
const http = require('http');

async function main() {
  const url = 'https://whale-watch-474208523276.us-central1.run.app';
  console.log(`Starting smoke test against: ${url}`);
  
  // 1. Get WebSocket debugger URL
  const getJson = () => new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
  
  let targets;
  try {
    targets = await getJson();
  } catch (err) {
    console.error("Failed to connect to local Chrome on port 9222. Make sure Chrome is running with remote debugging.");
    process.exit(1);
  }
  
  const target = targets.find(t => t.type === 'page') || targets[0];
  if (!target) {
    console.error("No active page target found in Chrome.");
    process.exit(1);
  }
  
  const wsUrl = target.webSocketDebuggerUrl;
  console.log(`Connecting to CDP: ${wsUrl}`);
  const ws = new WebSocket(wsUrl);
  
  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = id++;
    const payload = JSON.stringify({ id: msgId, method, params });
    
    const handler = (data) => {
      const res = JSON.parse(data);
      if (res.id === msgId) {
        ws.off('message', handler);
        if (res.error) reject(res.error);
        else resolve(res.result);
      }
    };
    ws.on('message', handler);
    ws.send(payload);
  });
  
  ws.on('open', async () => {
    try {
      console.log("Connected. Enabling Page and Runtime domains...");
      await send('Page.enable');
      await send('Runtime.enable');
      
      // Track console logs and errors
      const consoleErrors = [];
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data);
          if (msg.method === 'Runtime.consoleAPICalled') {
            const type = msg.params.type;
            const text = msg.params.args.map(a => a.value !== undefined ? a.value : (a.description || JSON.stringify(a))).join(' ');
            console.log(`[Browser Console ${type.toUpperCase()}] ${text}`);
            if (type === 'error') {
              consoleErrors.push(text);
            }
          } else if (msg.method === 'Runtime.exceptionThrown') {
            const details = msg.params.exceptionDetails;
            const text = `Uncaught Exception: ${details.exception ? (details.exception.description || details.exception.value) : details.text} at line ${details.lineNumber}:${details.columnNumber}`;
            console.log(`[Browser Exception] ${text}`);
            consoleErrors.push(text);
          }
        } catch (e) {}
      });
      
      console.log(`Navigating to ${url}...`);
      await send('Page.navigate', { url });
      
      // Helper to evaluate code
      const evaluate = async (expression) => {
        const res = await send('Runtime.evaluate', { expression, returnByValue: true });
        return res.result.value;
      };

      // Wait for load and initialization
      console.log("Waiting for map and real data feeds to initialize and load vessels...");
      let countVessels = 0;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1000));
        try {
          const vesselsLen = await evaluate("window.app.sim.vessels.length");
          countVessels = vesselsLen || 0;
          if (countVessels > 0) {
            console.log(`Vessels detected after ${i + 1} seconds!`);
            break;
          }
        } catch (e) {
          // Page might still be loading
        }
      }
      
      console.log("Running page checks...");
      
      // Check title
      const title = await evaluate('document.title');
      console.log(`Page title: "${title}"`);
      
      console.log(`Frontend AIS Vessels count: ${countVessels}`);
      
      // Check overlay display status
      const overlayDisplay = await evaluate("document.getElementById('map-empty-state').style.display");
      console.log(`Empty state overlay display: "${overlayDisplay}"`);
      
      // Check active vessels in app simulation
      const simVesselsLength = await evaluate("window.app.sim.vessels.length");
      console.log(`Sim vessels length: ${simVesselsLength}`);
      
      // Check map markers
      const leafletFailed = await evaluate("window.app.map2D.leafletFailed");
      console.log(`Leaflet failed flag: ${leafletFailed}`);
      
      let markersCount = 0;
      if (leafletFailed) {
        markersCount = await evaluate("document.getElementById('map-svg-fallback') ? document.getElementById('map-svg-fallback').querySelectorAll('.vessel-dot').length : 0");
      } else {
        markersCount = await evaluate("Object.keys(window.app.map2D.layers.vessels).length");
      }
      console.log(`Rendered markers count: ${markersCount}`);
      
      // Test sidebar button click
      console.log("Simulating click on Sources dock button...");
      await evaluate("document.getElementById('btn-dock-sources').click()");
      await new Promise(r => setTimeout(r, 1000));
      const leftSidebarOpen = await evaluate("document.getElementById('sidebar-left').classList.contains('open')");
      const activePanel = await evaluate("window.app.ui.activePanel");
      console.log(`Left sidebar open: ${leftSidebarOpen}, Active panel state: "${activePanel}"`);
      
      // Check for any fake/sample data
      const mockVesselsInSim = await evaluate("window.app.sim.vessels.filter(v => !v.id.startsWith('AIS-') && !v.id.startsWith('HIST-') && !v.id.startsWith('LK-')).length");
      console.log(`Mock vessels in sim: ${mockVesselsInSim}`);
      
      // Check Console Errors
      console.log(`Detected console errors during load: ${consoleErrors.length}`);
      consoleErrors.forEach(err => console.log(`  - ${err}`));
      
      // PASS/FAIL criteria
      let success = true;
      if (consoleErrors.length > 0) {
        console.error("FAIL: Page loaded with console errors.");
        success = false;
      }
      if (countVessels <= 0) {
        console.error("FAIL: Frontend displays AIS count = 0.");
        success = false;
      }
      if (overlayDisplay !== 'none') {
        console.error("FAIL: Empty overlay is not hidden.");
        success = false;
      }
      if (!leftSidebarOpen || activePanel !== 'sources') {
        console.error("FAIL: Sidebar button not clickable or Sources panel failed to open.");
        success = false;
      }
      if (markersCount <= 0) {
        console.error("FAIL: Rendered markers count = 0.");
        success = false;
      }
      if (mockVesselsInSim > 0) {
        console.error("FAIL: Fake/mock vessels are loaded in production mode.");
        success = false;
      }
      
      if (success) {
        console.log("SUCCESS: Public production smoke test passed!");
        process.exit(0);
      } else {
        process.exit(1);
      }
      
    } catch (err) {
      console.error("Error running evaluation:", err);
      process.exit(1);
    }
  });
}

main().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
