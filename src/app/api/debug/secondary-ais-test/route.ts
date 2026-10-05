import { NextResponse } from 'next/server';
import { AisVessel } from '@/lib/aisManager';

async function fetchSecondaryAISVessels(
  provider: string,
  apiKey: string,
  endpoint: string | undefined
): Promise<{ data: any; status: number; endpointUsed: string; areaUsed: string }> {
  const minLat = process.env.AIS_BBOX_MIN_LAT || '37.3';
  const minLon = process.env.AIS_BBOX_MIN_LON || '-123.5';
  const maxLat = process.env.AIS_BBOX_MAX_LAT || '38.3';
  const maxLon = process.env.AIS_BBOX_MAX_LON || '-121.8';

  let url = '';
  let areaUsed = `BBox [${minLat}, ${minLon}] to [${maxLat}, ${maxLon}]`;
  if (provider === 'datalastic') {
    url = `https://api.datalastic.com/api/v0/vessel_inradius?api-key=${apiKey}&lat=37.8&lon=-122.65&radius=40`;
    areaUsed = `Center: 37.8, -122.65, Radius: 40 NM`;
  } else if (provider === 'marinetraffic') {
    url = `https://services.marinetraffic.com/api/exportvessels/v:8/${apiKey}/MINLAT:${minLat}/MAXLAT:${maxLat}/MINLON:${minLon}/MAXLON:${maxLon}/protocol:json`;
  } else if (provider === 'vesselfinder') {
    url = `https://api.vesselfinder.com/vessels?userkey=${apiKey}&minlat=${minLat}&minlon=${minLon}&maxlat=${maxLat}&maxlon=${maxLon}`;
  } else if (provider === 'endpoint' && endpoint) {
    url = endpoint;
    areaUsed = `Custom Endpoint: ${endpoint}`;
  } else {
    throw new Error(`Unsupported secondary provider: ${provider}`);
  }

  const endpointUsedForReport = url
    .replace(apiKey, 'REDACTED_API_KEY')
    .replace(apiKey.replace(/-/g, ''), 'REDACTED_API_KEY');

  console.log(`[Secondary AIS Test] Querying URL: ${endpointUsedForReport}`);
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Secondary AIS request failed with status: ${res.status}`);
  }
  
  const data = await res.json();
  return {
    data,
    status: res.status,
    endpointUsed: endpointUsedForReport,
    areaUsed
  };
}

function parseSecondaryVessels(data: any): AisVessel[] {
  let rawList: any[] = [];
  if (data && data.data && Array.isArray(data.data.vessels)) {
    rawList = data.data.vessels;
  } else if (Array.isArray(data)) {
    rawList = data;
  } else if (data && Array.isArray(data.data)) {
    rawList = data.data;
  } else if (data && Array.isArray(data.vessels)) {
    rawList = data.vessels;
  } else if (data) {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) {
        rawList = data[key];
        break;
      }
    }
  }

  return rawList.map((item: any, idx: number) => {
    const mmsi = item.mmsi || item.MMSI || item.mmsi_number || `SEC-${idx}`;
    const lat = Number(item.lat || item.latitude || item.LATITUDE || 0);
    const lon = Number(item.lon || item.lng || item.longitude || item.LONGITUDE || 0);
    const speed = Number(item.speed || item.sog || item.Sog || item.speed_over_ground || 10.0);
    const name = (item.name || item.shipname || item.ship_name || item.vessel_name || `MMSI ${mmsi}`).trim();
    const type = item.type || item.vessel_type || item.ship_type || 'Cargo Vessel';
    const heading = item.heading !== undefined ? Number(item.heading) : (item.course !== undefined ? Number(item.course) : 0);

    return {
      id: `AIS-${mmsi}`,
      name,
      imo: `MMSI: ${mmsi}`,
      type,
      latitude: lat,
      longitude: lon,
      speed,
      lastUpdated: new Date().toISOString(),
      heading
    };
  });
}

export async function GET() {
  const provider = process.env.SECONDARY_AIS_PROVIDER || '';
  const datalasticKeyPresent = !!process.env.DATALASTIC_API_KEY;
  
  let apiKey = '';
  if (provider === 'datalastic') apiKey = process.env.DATALASTIC_API_KEY || '';
  else if (provider === 'marinetraffic') apiKey = process.env.MARINETRAFFIC_API_KEY || '';
  else if (provider === 'vesselfinder') apiKey = process.env.VESSELFINDER_API_KEY || '';
  else if (provider === 'endpoint') apiKey = 'DUMMY';

  if (!provider) {
    return NextResponse.json({
      status: 'error',
      secondaryProvider: 'None',
      datalasticKeyPresent: datalasticKeyPresent ? 'yes' : 'no',
      requestAttempted: false,
      endpointUsed: 'None',
      areaUsed: 'None',
      httpStatus: 0,
      recordsReturned: 0,
      vesselsParsed: 0,
      samples: [],
      lastSafeError: 'SECONDARY_AIS_PROVIDER environment variable is not defined.',
      conclusion: 'Secondary provider not configured.'
    });
  }

  if (!apiKey) {
    return NextResponse.json({
      status: 'error',
      secondaryProvider: provider,
      datalasticKeyPresent: datalasticKeyPresent ? 'yes' : 'no',
      requestAttempted: false,
      endpointUsed: 'None',
      areaUsed: 'None',
      httpStatus: 0,
      recordsReturned: 0,
      vesselsParsed: 0,
      samples: [],
      lastSafeError: `API key for secondary provider '${provider}' is not configured in environment variables.`,
      conclusion: 'API Key missing for configured provider.'
    });
  }

  try {
    console.log(`[Secondary AIS Test] Executing query for provider ${provider}...`);
    const { data, status: httpStatus, endpointUsed, areaUsed } = await fetchSecondaryAISVessels(
      provider,
      apiKey,
      process.env.SECONDARY_AIS_ENDPOINT
    );
    
    const parsed = parseSecondaryVessels(data);
    
    // Extract raw records count safely
    let recordsReturned = 0;
    if (data && data.data && Array.isArray(data.data.vessels)) {
      recordsReturned = data.data.vessels.length;
    } else if (Array.isArray(data)) {
      recordsReturned = data.length;
    } else if (data && Array.isArray(data.data)) {
      recordsReturned = data.data.length;
    } else if (data && Array.isArray(data.vessels)) {
      recordsReturned = data.vessels.length;
    }

    const samples = parsed.slice(0, 5).map(v => ({
      mmsi: v.imo.replace('MMSI: ', ''),
      name: v.name,
      latitude: v.latitude,
      longitude: v.longitude,
      speed: v.speed,
      heading: v.heading
    }));

    return NextResponse.json({
      status: 'success',
      secondaryProvider: provider,
      datalasticKeyPresent: datalasticKeyPresent ? 'yes' : 'no',
      requestAttempted: true,
      endpointUsed,
      areaUsed,
      httpStatus,
      recordsReturned,
      vesselsParsed: parsed.length,
      samples,
      lastSafeError: null,
      conclusion: `Successfully fetched and parsed ${parsed.length} vessels from ${provider}.`
    });
  } catch (error: any) {
    console.error('[Secondary AIS Test] Error during run:', error);
    return NextResponse.json({
      status: 'error',
      secondaryProvider: provider,
      datalasticKeyPresent: datalasticKeyPresent ? 'yes' : 'no',
      requestAttempted: true,
      endpointUsed: provider === 'datalastic' 
        ? `https://api.datalastic.com/api/v0/vessel_inradius?api-key=REDACTED&lat=37.8&lon=-122.65&radius=40`
        : 'Unknown',
      areaUsed: provider === 'datalastic' ? 'Center: 37.8, -122.65, Radius: 40 NM' : 'Unknown',
      httpStatus: 500,
      recordsReturned: 0,
      vesselsParsed: 0,
      samples: [],
      lastSafeError: error.message || 'Internal server error during secondary test',
      conclusion: `Failed to fetch from secondary provider: ${error.message}`
    });
  }
}
