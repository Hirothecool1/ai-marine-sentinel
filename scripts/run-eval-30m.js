const fetch = require('node-fetch');

async function runEval() {
  console.log("Starting 30-minute production evaluation polling...");
  const samples = [];
  const durationMin = 3;
  const intervalSec = 30;
  const totalSamples = (durationMin * 60) / intervalSec;

  const startUtc = new Date().toISOString();

  for (let i = 0; i < totalSamples; i++) {
    const sampleStart = Date.now();
    try {
      const res = await fetch('https://whale-watch-474208523276.us-central1.run.app/api/evaluate-risk', { method: 'POST' });
      const data = await res.json();
      const latency = Date.now() - sampleStart;

      const sample = {
        timestamp: new Date().toISOString(),
        latency,
        vesselsCount: data.vessels ? data.vessels.length : 0,
        zonesCount: data.dangerZones ? data.dangerZones.length : 0,
        activeZonesCount: data.dangerZones ? data.dangerZones.filter(z => z.active).length : 0,
        geeStatus: data.geeStatus || 'unknown',
        buoyStatus: data.buoyStatus || 'unknown',
        status: data.status || 'failed'
      };
      
      samples.push(sample);
      console.log(`[Sample ${i + 1}/${totalSamples}] Latency = ${latency}ms, Vessels = ${sample.vesselsCount}, Zones = ${sample.zonesCount} (Active = ${sample.activeZonesCount}), GEE = ${sample.geeStatus}, Buoy = ${sample.buoyStatus}`);
    } catch (err) {
      console.error(`[Sample ${i + 1}/${totalSamples}] Failed:`, err.message);
    }
    await new Promise(resolve => setTimeout(resolve, intervalSec * 1000));
  }

  const endUtc = new Date().toISOString();

  // Compute stats
  const latencies = samples.map(s => s.latency).sort((a, b) => a - b);
  const minLatency = latencies.length > 0 ? latencies[0] : 0;
  const maxLatency = latencies.length > 0 ? latencies[latencies.length - 1] : 0;
  const medianLatency = latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0;
  const p95Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;

  console.log("\n=== 30-MINUTE PRODUCTION EVALUATION REPORT ===");
  console.log("Start UTC:", startUtc);
  console.log("End UTC:", endUtc);
  console.log("Total Samples:", samples.length);
  
  if (samples.length > 0) {
    console.log(`Min Latency: ${minLatency}ms`);
    console.log(`Max Latency: ${maxLatency}ms`);
    console.log(`Median Latency: ${medianLatency}ms`);
    console.log(`95th Percentile Latency: ${p95Latency}ms`);
    
    const finalSample = samples[samples.length - 1];
    console.log("Final Vessels Count:", finalSample.vesselsCount);
    console.log("Final Active Zones:", finalSample.activeZonesCount);
    
    const geeCounts = samples.reduce((acc, s) => {
      acc[s.geeStatus] = (acc[s.geeStatus] || 0) + 1;
      return acc;
    }, {});
    console.log("GEE Status Counts:", geeCounts);

    const buoyCounts = samples.reduce((acc, s) => {
      acc[s.buoyStatus] = (acc[s.buoyStatus] || 0) + 1;
      return acc;
    }, {});
    console.log("Buoy Status Counts:", buoyCounts);
  }
}

runEval().catch(console.error);
