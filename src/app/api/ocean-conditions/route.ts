import { NextResponse } from 'next/server';
import { aisManager } from '@/lib/aisManager';


interface BuoyData {
  stationId: string;
  name: string;
  latitude: number;
  longitude: number;
  waterTemp: number | null;
  windSpeed: number | null;
  waveHeight: number | null;
  timestamp: string | null;
}

const BUOY_STATIONS = [
  { id: '46026', name: 'San Francisco', lat: 37.759, lng: -122.839 },
  { id: '46247', name: 'San Francisco Offshore', lat: 37.747, lng: -122.658 },
  { id: '46042', name: 'Monterey', lat: 36.785, lng: -122.469 },
  { id: '46251', name: 'Santa Cruz', lat: 36.934, lng: -122.034 }
];

async function fetchBuoyStationData(stationId: string): Promise<Partial<BuoyData>> {
  const ndbcBaseUrl = process.env.NDBC_BASE_URL || 'https://www.ndbc.noaa.gov';
  const url = `${ndbcBaseUrl}/data/realtime2/${stationId}.txt`;
  
  try {
    const res = await fetch(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 WhaleWatch/1.0' },
      signal: AbortSignal.timeout(6000) 
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const text = await res.text();
    
    const lines = text.trim().split('\n');
    if (lines.length < 3) throw new Error('Empty or malformed buoy file');

    // Headers are in lines 0 and 1, actual data starts from line 2
    const headers = lines[0].replace('#', '').trim().split(/\s+/);
    const dataRow = lines[2].trim().split(/\s+/);

    const getVal = (colName: string): number | null => {
      const idx = headers.indexOf(colName);
      if (idx === -1 || idx >= dataRow.length) return null;
      const raw = dataRow[idx];
      if (raw === 'MM' || raw === '99.0' || raw === '999' || raw === '99.00') return null;
      const num = parseFloat(raw);
      return isNaN(num) ? null : num;
    };

    // Parse timestamp
    const year = getVal('YY') || getVal('YYYY');
    const month = getVal('MM');
    const day = getVal('DD');
    const hour = getVal('hh');
    const minute = getVal('mm');

    let timestamp: string | null = null;
    if (year && month && day && hour !== null && minute !== null) {
      timestamp = new Date(Date.UTC(year, month - 1, day, hour, minute)).toISOString();
    }

    return {
      waterTemp: getVal('WTMP'),
      windSpeed: getVal('WSPD'),
      waveHeight: getVal('WVHT'),
      timestamp
    };
  } catch (err) {
    console.error(`NDBC Station ${stationId} fetch failed:`, err);
    return {};
  }
}

export async function GET() {
  if (process.env.FORCE_DISABLE_EXTERNAL_APIS === 'true') {
    return NextResponse.json({ 
      status: 'error',
      message: 'NOAA data temporarily unavailable due to policy',
      buoys: [],
      connectedBuoysCount: 0,
      sstGrid: null,
      erddapStatus: 'unavailable',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // 1. Fetch buoy observations
    const buoyPromises = BUOY_STATIONS.map(async (station) => {
      let parsed: Partial<BuoyData> = {};
      try {
        parsed = await fetchBuoyStationData(station.id);
      } catch (err: any) {
        console.warn(`NDBC Station ${station.id} fetch failed:`, err.message || err);
      }
      return {
        stationId: station.id,
        name: station.name,
        latitude: station.lat,
        longitude: station.lng,
        waterTemp: parsed.waterTemp !== undefined ? parsed.waterTemp : null,
        windSpeed: parsed.windSpeed !== undefined ? parsed.windSpeed : null,
        waveHeight: parsed.waveHeight !== undefined ? parsed.waveHeight : null,
        timestamp: parsed.timestamp || new Date().toISOString()
      };
    });

    const buoys = await Promise.all(buoyPromises);
    const connectedBuoys = buoys.filter(b => b.waterTemp !== null || b.windSpeed !== null || b.waveHeight !== null);

    // 2. Fetch NOAA ERDDAP Sea Surface Temperature (SST) satellite grid data
    let sstGrid: any = null;
    let erddapStatus = 'unavailable';
    const erddapBaseUrl = process.env.NOAA_ERDDAP_BASE_URL || 'https://coastwatch.pfeg.noaa.gov/erddap';
    let endpointUsed = erddapBaseUrl;
    const datasetName = 'jplMURSST41';
    let recordsReturned = 0;
    let erddapError: string | null = null;

    const tryFetchERDDAP = async (baseUrl: string) => {
      const erddapUrl = `${baseUrl}/griddap/jplMURSST41.json?analysed_sst%5B%28last%29%5D%5B%2837.1%29:1:%2838.5%29%5D%5B%28-123.5%29:1:%28-122.0%29%5D`;
      const sstRes = await fetch(erddapUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0 WhaleWatch/1.0' },
        signal: AbortSignal.timeout(5000) 
      });
      if (!sstRes.ok) {
        throw new Error(`NOAA ERDDAP returned status ${sstRes.status}`);
      }
      return await sstRes.json();
    };

    try {
      sstGrid = await tryFetchERDDAP(erddapBaseUrl);
      erddapStatus = 'connected';
      endpointUsed = erddapBaseUrl;
      if (sstGrid && sstGrid.table && sstGrid.table.rows) {
        recordsReturned = sstGrid.table.rows.length;
      }
    } catch (primaryErr: any) {
      const primMessage = primaryErr.message || primaryErr.toString();
      console.warn(`Primary ERDDAP failed at ${erddapBaseUrl}: ${primMessage}. Trying secondary endpoint.`);
      
      const secondaryBaseUrl = 'https://upwell.pfeg.noaa.gov/erddap';
      try {
        sstGrid = await tryFetchERDDAP(secondaryBaseUrl);
        erddapStatus = 'connected';
        endpointUsed = secondaryBaseUrl;
        if (sstGrid && sstGrid.table && sstGrid.table.rows) {
          recordsReturned = sstGrid.table.rows.length;
        }
      } catch (secondaryErr: any) {
        const secMessage = secondaryErr.message || secondaryErr.toString();
        console.warn(`Secondary ERDDAP failed at ${secondaryBaseUrl}: ${secMessage}. Falling back to NDBC buoy WTMP SST grid representation.`);
        
        erddapStatus = 'fallback';
        endpointUsed = `${erddapBaseUrl} & ${secondaryBaseUrl} (Buoy WTMP Fallback)`;
        erddapError = `Primary error: ${primMessage}. Secondary error: ${secMessage}. Using buoy telemetry for local SST context.`;
        
        // Buoy WTMP fallback context
        const validTemps = buoys.filter(b => b.waterTemp !== null).map(b => b.waterTemp as number);
        if (validTemps.length > 0) {
          const avgTemp = validTemps.reduce((a, b) => a + b, 0) / validTemps.length;
          sstGrid = {
            table: {
              columnNames: ['time', 'latitude', 'longitude', 'analysed_sst'],
              columnTypes: ['String', 'float', 'float', 'float'],
              columnUnits: ['UTC', 'degrees_north', 'degrees_east', 'degree_C'],
              rows: [
                [new Date().toISOString(), 37.1, -123.5, avgTemp],
                [new Date().toISOString(), 37.8, -122.8, avgTemp],
                [new Date().toISOString(), 38.5, -122.0, avgTemp]
              ]
            },
            source: 'NOAA NDBC Buoy Water Temp Fallback',
            limitations: 'SST grid estimated from point buoy observations due to ERDDAP endpoint timeout.'
          };
          recordsReturned = sstGrid.table.rows.length;
        } else {
          sstGrid = null;
          erddapStatus = 'unavailable';
          recordsReturned = 0;
          erddapError = `All ERDDAP endpoints and NDBC buoy temps failed/unavailable.`;
        }
      }
    }

    return NextResponse.json({
      status: 'success',
      buoys,
      connectedBuoysCount: connectedBuoys.length,
      sstGrid,
      erddapStatus,
      endpointUsed,
      datasetName,
      recordsReturned,
      erddapError,
      vessels: aisManager.getVessels(),
      aisStatus: aisManager.getStatus(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Ocean conditions fetch error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'NOAA data temporarily unavailable',
      buoys: BUOY_STATIONS.map(s => ({
        stationId: s.id,
        name: s.name,
        latitude: s.lat,
        longitude: s.lng,
        waterTemp: null,
        windSpeed: null,
        waveHeight: null,
        timestamp: null
      })),
      erddapStatus: 'unavailable'
    });
  }
}
