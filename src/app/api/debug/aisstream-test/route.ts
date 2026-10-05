import { NextResponse } from 'next/server';
import { aisManager } from '@/lib/aisManager';
import WebSocket from 'ws';

async function testBoundingBox(apiKey: string, bbox: number[][]): Promise<{ success: boolean; messagesReceived: number; error: string | null }> {
  return new Promise((resolve) => {
    let ws: WebSocket | null = null;
    let messages = 0;
    let completed = false;
    
    const timeout = setTimeout(() => {
      if (!completed) {
        completed = true;
        cleanup();
        resolve({ success: true, messagesReceived: messages, error: null });
      }
    }, 4000); // Test each box for 4 seconds to fit in a reasonable request timeout window

    function cleanup() {
      if (ws) {
        try {
          ws.removeAllListeners();
          ws.terminate();
        } catch (e) {}
      }
    }

    try {
      ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
      ws.on('open', () => {
        const subscription = {
          APIKey: apiKey,
          BoundingBoxes: [bbox]
        };
        ws?.send(JSON.stringify(subscription));
      });
      ws.on('message', () => {
        messages++;
      });
      ws.on('error', (err) => {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          cleanup();
          resolve({ success: false, messagesReceived: messages, error: err.message });
        }
      });
      ws.on('close', () => {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          resolve({ success: true, messagesReceived: messages, error: 'Closed prematurely' });
        }
      });
    } catch (e: any) {
      if (!completed) {
        completed = true;
        clearTimeout(timeout);
        resolve({ success: false, messagesReceived: 0, error: e.message });
      }
    }
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const waitSeconds = parseInt(searchParams.get('wait') || '30', 10);

    const isKeyConfigured = !!process.env.AISSTREAM_API_KEY;
    const apiKey = (process.env.AISSTREAM_API_KEY || '').trim();

    console.log(`[AISstream Test] Clearing cache, resetting diagnostics, forcing connection, and waiting ${waitSeconds}s...`);
    
    // Clear state, reset diagnostic counts, & trigger forceConnect
    aisManager.clearVessels();
    aisManager.resetDiagnostics();
    aisManager.forceConnect(true);

    // Active polling loop keeping request open to capture socket progress
    const start = Date.now();
    while ((Date.now() - start) < (waitSeconds * 1000)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      // Break early if we already have vessels successfully parsed and stored
      const status = aisManager.getStatus();
      if (status.vesselsCount > 0) {
        console.log(`[AISstream Test] Success! Captured ${status.vesselsCount} vessels early after ${(Date.now() - start) / 1000}s.`);
        break;
      }
    }

    const status = aisManager.getStatus();

    // Run secondary bounding boxes diagnostic tests if key is configured
    let sfBoxDiag: { success: boolean; messagesReceived: number; error: string | null } = { success: false, messagesReceived: 0, error: 'Not run' };
    let norCalBoxDiag: { success: boolean; messagesReceived: number; error: string | null } = { success: false, messagesReceived: 0, error: 'Not run' };
    let laBoxDiag: { success: boolean; messagesReceived: number; error: string | null } = { success: false, messagesReceived: 0, error: 'Not run' };
    let globalBBoxDiag: { success: boolean; messagesReceived: number; error: string | null } = { success: false, messagesReceived: 0, error: 'Not run' };

    if (isKeyConfigured) {
      console.log('[AISstream Test] Starting sequential bounding boxes diagnostics...');
      sfBoxDiag = await testBoundingBox(apiKey, [[37.3, -123.5], [38.3, -121.8]]);
      norCalBoxDiag = await testBoundingBox(apiKey, [[36.8, -124.5], [39.0, -121.0]]);
      laBoxDiag = await testBoundingBox(apiKey, [[33.4, -119.0], [34.3, -117.5]]);
      globalBBoxDiag = await testBoundingBox(apiKey, [[32.0, -126.0], [42.0, -116.0]]);
    }

    // Determine conclusion
    let conclusion = 'unknown connection state';
    if (!isKeyConfigured || status.status === 'missing_key') {
      conclusion = 'missing API key';
    } else if (status.lastCloseCode === 1006 || (status.hasClosedFired && !status.hasOpenFired) || status.lastError?.includes('APIKey') || status.lastError?.includes('Unauthorized')) {
      conclusion = 'New AISstream key appears invalid or rejected by AISstream';
    } else if (status.hasClosedFired && !status.hasOpenFired) {
      conclusion = 'WebSocket connection failed before subscription';
    } else if (!status.hasOpenFired && status.lastError) {
      conclusion = 'WebSocket blocked';
    } else if (status.hasOpenFired && !status.subscriptionSent) {
      conclusion = 'subscription failed';
    } else if (status.hasOpenFired && status.subscriptionSent && status.messagesReceived === 0) {
      conclusion = 'AISstream connected but upstream feed returned zero live AIS frames. Trying backup real-data sources.';
    } else if (status.messagesReceived > 0 && status.vesselsParsedCount === 0) {
      conclusion = 'messages received but parser failed';
    } else if (status.vesselsParsedCount > 0 && status.vesselsCount === 0) {
      conclusion = 'messages parsed but not stored';
    } else if (status.vesselsCount > 0) {
      conclusion = 'active vessels ready';
    }

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      keyPresent: isKeyConfigured,
      attemptedConnection: status.attemptedConnection,
      websocketOpened: status.hasOpenFired,
      openTimestamp: status.openTimestamp,
      subscriptionSent: status.subscriptionSent,
      subscriptionPayloadValid: isKeyConfigured,
      boundingBoxUsed: status.bbox,
      messagesReceived: status.messagesReceived,
      messagesReceived30s: status.messagesReceived30s,
      messagesReceived2m: status.messagesReceived2m,
      messagesReceived5m: status.messagesReceived5m,
      vesselsParsed: status.vesselsParsedCount,
      activeStoreCount: status.vesselsCount,
      lastError: status.lastError,
      retryState: status.retryState,
      conclusion: conclusion,
      boundingBoxDiagnostics: {
        sfBox: {
          bbox: [[37.3, -123.5], [38.3, -121.8]],
          receivedMessages: sfBoxDiag.messagesReceived,
          status: sfBoxDiag.messagesReceived > 0 ? 'active' : (sfBoxDiag.success ? 'empty' : 'failed'),
          error: sfBoxDiag.error
        },
        norCalBox: {
          bbox: [[36.8, -124.5], [39.0, -121.0]],
          receivedMessages: norCalBoxDiag.messagesReceived,
          status: norCalBoxDiag.messagesReceived > 0 ? 'active' : (norCalBoxDiag.success ? 'empty' : 'failed'),
          error: norCalBoxDiag.error
        },
        laBox: {
          bbox: [[33.4, -119.0], [34.3, -117.5]],
          receivedMessages: laBoxDiag.messagesReceived,
          status: laBoxDiag.messagesReceived > 0 ? 'active' : (laBoxDiag.success ? 'empty' : 'failed'),
          error: laBoxDiag.error
        },
        usWestCoast: {
          bbox: [[32.0, -126.0], [42.0, -116.0]],
          receivedMessages: globalBBoxDiag.messagesReceived,
          status: globalBBoxDiag.messagesReceived > 0 ? 'active' : (globalBBoxDiag.success ? 'empty' : 'failed'),
          error: globalBBoxDiag.error
        }
      }
    });
  } catch (error: any) {
    console.error('[AISstream Test] Error in route:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Internal server error during debug test',
      conclusion: 'error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
