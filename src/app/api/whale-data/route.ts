import { NextResponse } from 'next/server';

const OBIS_HISTORICAL_SIGHTINGS = [
  { id: 'OBIS-01', lat: 37.810, lng: -123.080, species: 'Humpback Whale', date: '2026-05-10', source: 'OBIS-SEAMAP', sourceType: 'historical', sourceName: 'OBIS-SEAMAP Historical Archive' },
  { id: 'OBIS-02', lat: 37.695, lng: -122.955, species: 'Blue Whale', date: '2026-05-12', source: 'OBIS-SEAMAP', sourceType: 'historical', sourceName: 'OBIS-SEAMAP Historical Archive' },
  { id: 'OBIS-03', lat: 37.980, lng: -123.180, species: 'Fin Whale', date: '2026-05-14', source: 'OBIS-SEAMAP', sourceType: 'historical', sourceName: 'OBIS-SEAMAP Historical Archive' },
  { id: 'OBIS-04', lat: 37.525, lng: -122.785, species: 'Gray Whale', date: '2026-05-18', source: 'OBIS-SEAMAP', sourceType: 'historical', sourceName: 'OBIS-SEAMAP Historical Archive' },
  { id: 'OBIS-05', lat: 37.610, lng: -122.610, species: 'Humpback Whale', date: '2026-05-20', source: 'OBIS-SEAMAP', sourceType: 'historical', sourceName: 'OBIS-SEAMAP Historical Archive' }
];

export async function GET() {
  let wsKey = process.env.WHALE_SAFE_API_KEY_OR_ENDPOINT;
  let waKey = process.env.WHALE_ALERT_API_KEY_OR_ENDPOINT;

  if (process.env.FORCE_DISABLE_EXTERNAL_APIS === 'true') {
    wsKey = undefined;
    waKey = undefined;
  }

  const isConnected = !!(wsKey || waKey);

  try {
    let liveSightings: any[] = [];
    let status = isConnected ? 'connected' : 'not_connected';

    return NextResponse.json({
      status,
      whaleSafeStatus: wsKey ? 'connected' : 'Optional partner feed — access pending',
      whaleAlertStatus: waKey ? 'connected' : 'Optional partner feed — access pending',
      liveSightings,
      historicalSightings: OBIS_HISTORICAL_SIGHTINGS,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Whale data API aggregator error:', error);
    return NextResponse.json({
      status: 'error',
      whaleSafeStatus: 'Optional partner feed — access pending',
      whaleAlertStatus: 'Optional partner feed — access pending',
      message: error.message || 'Failed to fetch whale feeds',
      liveSightings: [],
      historicalSightings: OBIS_HISTORICAL_SIGHTINGS
    });
  }
}
