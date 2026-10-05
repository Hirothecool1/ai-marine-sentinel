async function verifyDangerZone() {
  const url = 'https://whale-watch-474208523276.us-central1.run.app';
  console.log("Querying production evaluate-risk API...");
  try {
    const riskRes = await fetch(`${url}/api/evaluate-risk`, { method: 'POST' });
    const riskData = await riskRes.json();
    console.log("Risk Status:", riskData.status);
    console.log("Danger Zones Count:", riskData.dangerZones ? riskData.dangerZones.length : 0);
  } catch (err) {
    console.error("Failed to query risk:", err);
  }

  console.log("\nQuerying production live vessels API...");
  try {
    const aisRes = await fetch(`${url}/api/live/ais-vessels`);
    const aisData = await aisRes.json();
    console.log("AIS Vessels count:", aisData.count);
    console.log("AIS Status:", JSON.stringify(aisData.aisStatus, null, 2));
  } catch (err) {
    console.error("Failed to query live vessels:", err);
  }

  console.log("\nQuerying production aisstream-test debug API...");
  try {
    const debugRes = await fetch(`${url}/api/debug/aisstream-test?wait=5`);
    const debugData = await debugRes.json();
    console.log("AISstream Test Conclusion:", debugData.conclusion);
    console.log("AISstream Bounding Box Diagnostics:", JSON.stringify(debugData.boundingBoxDiagnostics, null, 2));
    console.log("AISstream Status:", JSON.stringify(debugData, null, 2));
  } catch (err) {
    console.error("Failed to query aisstream-test debug:", err);
  }

  console.log("\nQuerying production ocean-conditions API...");
  try {
    const condRes = await fetch(`${url}/api/ocean-conditions`);
    const condData = await condRes.json();
    console.log("Ocean Conditions Status:", condData.status);
    console.log("Connected Buoys Count:", condData.connectedBuoysCount);
    console.log("ERDDAP Status:", condData.erddapStatus);
  } catch (err) {
    console.error("Failed to query ocean conditions:", err);
  }
}
verifyDangerZone();
