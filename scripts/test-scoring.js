// Unit test script for backend scoring and geospatial math
const { ScoringEngine, haversineDistance } = require('../src/lib/scoringEngine');

function runTests() {
  console.log("=== RUNNING UNIT TESTS FOR SCORING ENGINE ===");
  let failed = false;

  const assert = (condition, msg) => {
    if (!condition) {
      console.error(`❌ FAIL: ${msg}`);
      failed = true;
    } else {
      console.log(`✅ PASS: ${msg}`);
    }
  };

  // Test 1: Haversine distance calculations
  const ggLat = 37.82, ggLng = -122.55; // Golden Gate
  const buoyLat = 37.759, buoyLng = -122.840; // Buoy 46026
  
  const dist = haversineDistance(ggLat, ggLng, buoyLat, buoyLng);
  // Expected distance ~26.4 km
  assert(Math.abs(dist - 26.4) < 1.0, `Haversine distance gg to buoy should be approx 26.4 km. Computed: ${dist.toFixed(2)} km`);

  // Test 2: Weight Renormalization when GEE is offline
  // Prey formula: 0.45E + 0.25N + 0.20B + 0.10M
  // If E (GEE) is offline (null), the remaining weights sum to 0.55.
  // Effective weights should be: buoy=0.25/0.55, bathy=0.20/0.55, seasonal=0.10/0.55.
  const vessels = [];
  const geePreyHotspots = []; // GEE is offline
  const buoys = [{ stationId: '46026', waterTemp: 12.0 }]; // N = 1.0 - (12-11)/10 = 0.90
  const userSightings = [];
  const historicalSightings = [];

  const { dangerZones } = ScoringEngine.evaluate(vessels, geePreyHotspots, buoys, userSightings, historicalSightings);
  
  assert(dangerZones.length > 0, "Should generate candidate zones");
  if (dangerZones.length > 0) {
    const z = dangerZones[0];
    assert(z.geeInput === null, "GEE input should be null/missing");
    assert(Math.abs(z.preyWeights.completeness - 0.55) < 0.001, `Prey data completeness should be approx 0.55. Got: ${z.preyWeights.completeness}`);
    assert(Math.abs(z.preyWeights.effective.buoy - 0.25 / 0.55) < 0.001, "Effective buoy weight should be scaled");
    assert(z.insufficientData === false, "Zone should have sufficient data completeness");
  }

  // Test 3: Insufficient Data Completeness
  // If both GEE and Buoy are offline, available weights sum to 0.20 (bathy) + 0.10 (seasonal) = 0.30.
  // Since 0.30 < 0.50, the zone should report insufficient data.
  const buoysOffline = [{ stationId: '46026', waterTemp: null }]; // Buoy is offline
  const resultOffline = ScoringEngine.evaluate(vessels, geePreyHotspots, buoysOffline, userSightings, historicalSightings);
  
  if (resultOffline.dangerZones.length > 0) {
    const z = resultOffline.dangerZones[0];
    assert(z.insufficientData === true, "Should report insufficient data when completeness < 50%");
    assert(z.riskScore === null, "Risk score should be null under insufficient data");
    assert(z.active === false, "Zone should be inactive under insufficient data");
  }

  if (failed) {
    console.error("Some tests failed!");
    process.exit(1);
  } else {
    console.log("All unit tests passed successfully!");
  }
}

runTests();
