import { NextResponse } from 'next/server';
import { aisManager } from '@/lib/aisManager';

export async function GET() {
  try {
    const status = aisManager.getStatus();
    const validation = aisManager.getValidationDiagnostics();
    
    return NextResponse.json({
      providerStatus: status.status,
      rawFramesReceived: status.messagesReceivedSinceStartup,
      parsedMessages: status.vesselsParsedCount,
      validVessels: status.vesselsCount,
      rejectedCountsByReason: validation.rejectedReasons,
      latestRawTimestamp: validation.latestRawTimestamp,
      latestValidTimestamp: validation.latestValidTimestamp,
      activeBoundingBox: status.bbox,
      providerErrors: status.lastError ? [status.lastError] : (status.secondaryError ? [status.secondaryError] : [])
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      message: err.message || 'Internal server error'
    }, { status: 500 });
  }
}
