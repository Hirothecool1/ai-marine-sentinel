const fetch = require('node-fetch');

async function runEval() {
  console.log("Starting production evaluation polling...");
  const samples = [];
  const durationMin = 5;
  const intervalSec = 15;
  const totalSamples = (durationMin * 60) / intervalSec;

  const startUtc = new Date().toISOString();

  for (let i = 0; i < totalSamples; i++) {
    try {
      const res = await fetch('https://whale-watch-474208523276.us-central1.run.app/api/live/ais-vessels');
      const data = await res.json();
      const status = data.aisStatus || {};
      
      const sample = {
        timestamp: new Date().toISOString(),
        vesselsCount: data.vessels ? data.vessels.length : 0,
        messagesReceived: status.messagesReceived || 0,
        reconnectCount: status.reconnectCount || 0,
        status: status.status || 'unknown'
      };
      
      samples.push(sample);
      console.log(`Sample ${i + 1}/${totalSamples}: Vessels = ${sample.vesselsCount}, Messages = ${sample.messagesReceived}, Status = ${sample.status}`);
    } catch (err) {
      console.error(`Sample ${i + 1} failed:`, err.message);
    }
    await new Promise(resolve => setTimeout(resolve, intervalSec * 1000));
  }

  const endUtc = new Date().toISOString();

  console.log("\n=== EVALUATION REPORT ===");
  console.log("Start UTC:", startUtc);
  console.log("End UTC:", endUtc);
  console.log("Total Samples:", samples.length);
  
  if (samples.length > 0) {
    const finalSample = samples[samples.length - 1];
    console.log("Final Vessels Count:", finalSample.vesselsCount);
    console.log("Total Messages Received:", finalSample.messagesReceived);
    console.log("Reconnects:", finalSample.reconnectCount);
    
    const statusCounts = samples.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});
    console.log("Status Counts:", statusCounts);
  }
}

runEval().catch(console.error);
