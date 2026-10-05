import { NextResponse } from 'next/server';

export async function GET() {
  const isDisabled = process.env.FORCE_DISABLE_EXTERNAL_APIS === 'true';

  const baseConfig = {
    realDataOnly: process.env.REAL_DATA_ONLY || 'false',
    allowSampleData: process.env.ALLOW_SAMPLE_DATA || 'true',
    forceDisableExternalApis: process.env.FORCE_DISABLE_EXTERNAL_APIS || 'false',
    aisBboxMinLat: process.env.AIS_BBOX_MIN_LAT || '37.3',
    aisBboxMinLon: process.env.AIS_BBOX_MIN_LON || '-123.5',
    aisBboxMaxLat: process.env.AIS_BBOX_MAX_LAT || '38.3',
    aisBboxMaxLon: process.env.AIS_BBOX_MAX_LON || '-121.8',
    buildRevision: process.env.K_REVISION || 'local-dev',
    buildTimestamp: process.env.BUILD_TIMESTAMP || new Date().toISOString(),
    recommendedSafeSpeedKts: Number(process.env.RECOMMENDED_SAFE_SPEED_KTS || '10'),
    enableEstimatedFineCalculation: process.env.ENABLE_ESTIMATED_FINE_CALCULATION === 'true',
    estimatedFinePerViolation: Number(process.env.ESTIMATED_FINE_PER_VIOLATION || '500'),
    enforcementMode: process.env.ENFORCEMENT_MODE === 'true',
    secondaryAisProvider: process.env.SECONDARY_AIS_PROVIDER || '',
  };

  if (isDisabled) {
    return NextResponse.json({
      ...baseConfig,
      aisStreamKeyConfigured: false,
      googleEarthEngineConfigured: false,
      noaaErddapConfigured: false,
      noaaNdbcConfigured: false,
      whaleSafeConfigured: false,
      whaleAlertConfigured: false,
      mbariConfigured: false,
      farallonConfigured: false,
      datalasticKeyConfigured: false,
      marinetrafficKeyConfigured: false,
      vesselfinderKeyConfigured: false,
      secondaryAisEndpointConfigured: false,
    });
  }

  return NextResponse.json({
    ...baseConfig,
    aisStreamKeyConfigured: !!process.env.AISSTREAM_API_KEY,
    googleEarthEngineConfigured: !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT),
    noaaErddapConfigured: !!process.env.NOAA_ERDDAP_BASE_URL,
    noaaNdbcConfigured: !!process.env.NDBC_BASE_URL,
    whaleSafeConfigured: !!process.env.WHALE_SAFE_API_KEY_OR_ENDPOINT,
    whaleAlertConfigured: !!process.env.WHALE_ALERT_API_KEY_OR_ENDPOINT,
    mbariConfigured: !!process.env.MBARI_DATA_URL,
    farallonConfigured: !!process.env.FARALLON_DATA_URL,
    datalasticKeyConfigured: !!process.env.DATALASTIC_API_KEY,
    marinetrafficKeyConfigured: !!process.env.MARINETRAFFIC_API_KEY,
    vesselfinderKeyConfigured: !!process.env.VESSELFINDER_API_KEY,
    secondaryAisEndpointConfigured: !!process.env.SECONDARY_AIS_ENDPOINT,
  });
}
