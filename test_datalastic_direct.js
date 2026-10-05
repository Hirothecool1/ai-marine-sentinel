const apiKey = process.env.DATALASTIC_API_KEY;

async function testDatalastic() {
  console.log("=============================================");
  console.log("Starting Datalastic Direct Test");
  console.log("=============================================");
  
  // SF Bay center: lat 37.8, lon -122.65, radius 40 NM
  const url = `https://api.datalastic.com/api/v0/vessel_inradius?api-key=${apiKey}&lat=37.8&lon=-122.65&radius=40`;
  
  try {
    const res = await fetch(url);
    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    
    const data = await res.json();
    
    if (!res.ok) {
      console.error("API Error Body:", JSON.stringify(data, null, 2));
      return;
    }
    
    let rawList = [];
    if (data && data.data && Array.isArray(data.data.vessels)) {
      rawList = data.data.vessels;
    } else if (Array.isArray(data)) {
      rawList = data;
    } else if (data && Array.isArray(data.data)) {
      rawList = data.data;
    } else if (data && Array.isArray(data.vessels)) {
      rawList = data.vessels;
    }
    
    console.log(`Vessel records returned by provider: ${rawList.length}`);
    
    if (rawList.length > 0) {
      console.log(`Sample raw vessel object:`, JSON.stringify(rawList[0], null, 2));
      
      const minLat = 37.3;
      const maxLat = 38.3;
      const minLon = -123.5;
      const maxLon = -121.8;
      
      let insideBBoxCount = 0;
      let hasSpeedCount = 0;
      let oldestTimestamp = null;
      let newestTimestamp = null;
      
      rawList.forEach((v, idx) => {
        const lat = Number(v.lat || v.latitude);
        const lon = Number(v.lon || v.longitude);
        const speed = v.speed !== undefined ? Number(v.speed) : (v.sog !== undefined ? Number(v.sog) : null);
        const tsStr = v.last_position_epoch ? new Date(v.last_position_epoch * 1000).toISOString() : (v.lastUpdated || v.timestamp);
        
        if (!isNaN(lat) && !isNaN(lon) && lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
          insideBBoxCount++;
        }
        if (speed !== null && !isNaN(speed)) {
          hasSpeedCount++;
        }
        
        if (tsStr) {
          const t = new Date(tsStr).getTime();
          if (!isNaN(t)) {
            if (!oldestTimestamp || t < oldestTimestamp) oldestTimestamp = t;
            if (!newestTimestamp || t > newestTimestamp) newestTimestamp = t;
          }
        }
      });
      
      console.log(`Vessels inside standard Bounding Box (${minLat}, ${minLon} to ${maxLat}, ${maxLon}): ${insideBBoxCount}`);
      console.log(`Vessels with speed fields: ${hasSpeedCount}`);
      console.log(`Oldest timestamp: ${oldestTimestamp ? new Date(oldestTimestamp).toISOString() : 'N/A'}`);
      console.log(`Newest timestamp: ${newestTimestamp ? new Date(newestTimestamp).toISOString() : 'N/A'}`);
      console.log(`Current server time: ${new Date().toISOString()}`);
    } else {
      console.warn("No vessels returned in radius.");
    }
  } catch (err) {
    console.error("Datalastic fetch error:", err);
  }
}

testDatalastic();
