import { NextResponse } from 'next/server';
import { aisManager, AisVessel } from '@/lib/aisManager';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const rawVessels = aisManager.getVessels();
    let status = aisManager.getStatus();
    
    // Only force connection if it is currently disconnected, retrying, in an error state, or missing the key
    if (status.status === 'disconnected' || status.status === 'error' || status.status === 'retrying' || status.status === 'missing_key') {
      console.log(`[API Live Vessels] WebSocket status is ${status.status}. Forcing connection...`);
      aisManager.forceConnect(false);
    }
    
    // If we have 0 cached vessels, wait briefly (up to 6 seconds) for incoming messages
    if (rawVessels.length === 0 && status.status !== 'missing_key') {
      console.log(`[API Live Vessels] 0 cached vessels. Waiting up to 6 seconds for incoming messages...`);
      for (let i = 0; i < 12; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const currentVessels = aisManager.getVessels();
        status = aisManager.getStatus();
        if (currentVessels.length > 0) {
          console.log(`[API Live Vessels] Received ${currentVessels.length} vessels after ${i * 0.5 + 0.5}s.`);
          break;
        }
      }
    }

    const secondaryProvider = process.env.SECONDARY_AIS_PROVIDER || '';
    let secondaryKeyPresent = false;
    if (secondaryProvider === 'datalastic') secondaryKeyPresent = !!process.env.DATALASTIC_API_KEY;
    else if (secondaryProvider === 'marinetraffic') secondaryKeyPresent = !!process.env.MARINETRAFFIC_API_KEY;
    else if (secondaryProvider === 'vesselfinder') secondaryKeyPresent = !!process.env.VESSELFINDER_API_KEY;
    else if (secondaryProvider === 'endpoint') secondaryKeyPresent = !!process.env.SECONDARY_AIS_ENDPOINT;

    // Refresh status
    status = aisManager.getStatus();
    const resolvedVessels = aisManager.getVessels();

    const usedSecondary = status.lastSecondaryFetchTime > 0 && resolvedVessels.some((v: any) => v.id.startsWith('AIS-') && !v.id.includes('LK-') && !v.id.includes('HIST-') && status.messagesReceived === 0);
    
    let finalStatus = status.status;
    if (usedSecondary) {
      finalStatus = 'receiving';
    } else if (resolvedVessels.some((v: any) => v.id.startsWith('LK-'))) {
      finalStatus = 'last_known';
    } else if (resolvedVessels.some((v: any) => v.id.startsWith('HIST-'))) {
      finalStatus = 'historical';
    } else if (resolvedVessels.length === 0 && status.status !== 'missing_key') {
      finalStatus = 'connected_waiting';
    }

    const mappedVessels = resolvedVessels.map((v: any) => {
      const mmsi = v.imo ? v.imo.replace('MMSI: ', '') : (v.MMSI || v.id.replace('AIS-', '').replace('HIST-', '').replace('LK-', ''));
      const isFallback = v.sourceType === 'historical' || v.sourceType === 'last-known' || v.id.startsWith('HIST-') || v.id.startsWith('LK-');
      
      let providerLabel = 'Live AIS Source: AISstream.io';
      if (v.id.startsWith('HIST-') || v.sourceType === 'historical') {
        providerLabel = 'Historical AIS Fallback — not live';
      } else if (v.id.startsWith('LK-') || v.sourceType === 'last-known') {
        providerLabel = 'Historical AIS Fallback — not live';
      } else if (v.sourceName) {
        providerLabel = v.sourceName;
      } else if (usedSecondary) {
        providerLabel = `Live AIS Source: ${secondaryProvider.charAt(0).toUpperCase() + secondaryProvider.slice(1)}`;
      }

      return {
        id: v.id,
        mmsi: mmsi,
        MMSI: mmsi,
        name: v.name || v.vesselName,
        vesselName: v.name || v.vesselName,
        vesselType: v.type || v.vesselType || 'Cargo Vessel',
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        speed: Number(v.speed),
        heading: v.heading !== undefined ? Number(v.heading) : 0,
        course: v.heading !== undefined ? Number(v.heading) : 0,
        lastUpdated: v.lastUpdated,
        timestamp: v.lastUpdated,
        sourceName: providerLabel,
        sourceType: v.sourceType || (isFallback ? (v.id.startsWith('HIST-') ? 'historical' : 'last-known') : 'live'),
        isRealData: true,
        receivedAt: v.receivedAt || new Date().toISOString()
      };
    });

    return NextResponse.json({
      status: 'success',
      count: mappedVessels.length,
      vessels: mappedVessels,
      aisStatus: {
        ...status,
        connectionStatus: status.status,
        status: finalStatus,
        secondaryProviderConfigured: !!secondaryProvider,
        secondaryProviderName: secondaryProvider,
        secondaryProviderError: status.secondaryError,
        secondaryProviderStatus: usedSecondary ? 'live' : (secondaryKeyPresent ? 'configured' : 'missing key'),
        secondaryKeyPresent: secondaryKeyPresent,
        lastSecondaryFetchTime: status.lastSecondaryFetchTime,
        secondaryRecordsCount: status.secondaryRecordsCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[API Live Vessels] Fetch error:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Failed to fetch live AIS vessels',
      vessels: [],
      aisStatus: null,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
