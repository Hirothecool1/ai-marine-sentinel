const fs = require('fs');
const readline = require('readline');

async function processAIS() {
  const fileStream = fs.createReadStream('./AIS_177844679681874701_517-1778446797174.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const vessels = new Map();
  let isHeader = true;
  
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    
    // MMSI,BaseDateTime,LAT,LON,SOG,COG,Heading,VesselName,IMO,CallSign,VesselType,Status,Length,Width,Draft,Cargo,TransceiverClass
    const parts = line.split(',');
    if (parts.length < 10) continue;
    
    const mmsi = parts[0];
    const timestamp = new Date(parts[1]).getTime();
    const lat = parseFloat(parts[2]);
    const lon = parseFloat(parts[3]);
    const speed = parseFloat(parts[4]);
    const name = parts[7] || `Unknown Vessel (${mmsi})`;
    
    // Only keep the most recent position
    const existing = vessels.get(mmsi);
    if (!existing || existing.timestamp < timestamp) {
      vessels.set(mmsi, {
        id: mmsi,
        name: name,
        latitude: lat,
        longitude: lon,
        speed: speed,
        timestamp: timestamp
      });
    }
  }

  // Convert to array and take a sample if too large, or just take top 200 to keep the frontend fast
  const vesselArray = Array.from(vessels.values())
    .sort((a, b) => b.timestamp - a.timestamp) // newest first
    .slice(0, 200); 

  if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
  }
  
  fs.writeFileSync('./data/ais.json', JSON.stringify(vesselArray, null, 2));
  console.log(`Processed and saved ${vesselArray.length} vessels.`);
}

processAIS();
