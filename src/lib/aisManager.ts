import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

export interface AisVessel {
  id: string;
  name: string;
  imo: string;
  type: string;
  latitude: number;
  longitude: number;
  speed: number;
  lastUpdated: string;
  heading?: number;
}

class AisStreamManager {
  private ws: WebSocket | null = null;
  private vessels = new Map<number, AisVessel>();
  private status = 'disconnected';
  private lastError: string | null = null;
  private messagesReceived = 0;
  private backoffDelay = 1000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pruneInterval: NodeJS.Timeout | null = null;
  private subscriptionSent = false;
  private lastMessageTime: string | null = null;
  private lastConnectAttemptTime = 0;
  private messageTimestamps: number[] = [];
  private lastKnownVessels = new Map<number, AisVessel & { lastSeen: number }>();
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectCount = 0;

  // Secondary Provider isolated cache
  private secondaryVessels = new Map<number, AisVessel>();
  private lastSecondaryFetchTime = 0;
  private secondaryRecordsCount = 0;
  private secondaryError: string | null = null;
  private firstZeroFramesTime: number | null = Date.now();

  // Diagnostic tracking (Requirement 7)
  private openTimestamp: string | null = null;
  private attemptedConnection = false;
  private vesselsParsedCount = 0;
  private hasOpenFired = false;
  private hasClosedFired = false;
  private lastCloseCode: number | null = null;
  private lastCloseReason = '';

  // Validation instrumentation
  private rejectedReasons = {
    missingMmsi: 0,
    missingCoords: 0,
    invalidCoords: 0,
    outsideBBox: 0,
    staleTimestamp: 0,
    invalidSpeed: 0,
    parseError: 0,
    unsupportedMsgType: 0,
    duplicateOlderMmsi: 0,
    missingRequiredField: 0
  };
  private latestRawTimestamp: string | null = null;
  private latestValidTimestamp: string | null = null;

  constructor() {
    this.startPruning();
    this.connect();
    this.startSecondaryFetchLoop();
  }

  public getStatus() {
    let computedStatus = this.status;
    if (this.status === 'connected') {
      if (this.messagesReceived > 0) {
        computedStatus = 'receiving';
      } else {
        computedStatus = 'connected_waiting';
      }
    } else if (this.status === 'disconnected') {
      if (this.reconnectTimeout) {
        computedStatus = 'retrying';
      } else {
        computedStatus = 'connecting';
      }
    }

    const now = Date.now();
    // Clean up timestamps older than 5 minutes (300000ms)
    this.messageTimestamps = this.messageTimestamps.filter(t => t > now - 300000);
    const msgs30s = this.messageTimestamps.filter(t => t > now - 30000).length;
    const msgs2m = this.messageTimestamps.filter(t => t > now - 120000).length;
    const msgs5m = this.messageTimestamps.filter(t => t > now - 300000).length;

    // Prune expired last-known vessels
    const ttlMinutes = parseFloat(process.env.AIS_LAST_KNOWN_TTL_MINUTES || '30');
    const ttlMs = ttlMinutes * 60000;
    for (const [mmsi, v] of this.lastKnownVessels.entries()) {
      if (now - v.lastSeen > ttlMs) {
        this.lastKnownVessels.delete(mmsi);
      }
    }

    let socketStateStr = 'CLOSED';
    if (this.ws) {
      if (this.ws.readyState === WebSocket.CONNECTING) socketStateStr = 'CONNECTING';
      else if (this.ws.readyState === WebSocket.OPEN) socketStateStr = 'OPEN';
      else if (this.ws.readyState === WebSocket.CLOSING) socketStateStr = 'CLOSING';
    }

    return {
      status: computedStatus,
      rawStatus: this.status,
      socketState: socketStateStr,
      reconnectCount: this.reconnectCount,
      messagesReceivedSinceStartup: this.messagesReceived,
      lastError: this.lastError,
      messagesReceived: this.messagesReceived,
      messagesReceived30s: msgs30s,
      messagesReceived2m: msgs2m,
      messagesReceived5m: msgs5m,
      vesselsCount: this.vessels.size,
      subscriptionSent: this.subscriptionSent,
      lastMessageTime: this.lastMessageTime,
      openTimestamp: this.openTimestamp,
      attemptedConnection: this.attemptedConnection,
      vesselsParsedCount: this.vesselsParsedCount,
      hasOpenFired: this.hasOpenFired,
      hasClosedFired: this.hasClosedFired,
      lastCloseCode: this.lastCloseCode,
      lastCloseReason: this.lastCloseReason,
      firstZeroFramesTime: this.firstZeroFramesTime,
      lastSecondaryFetchTime: this.lastSecondaryFetchTime,
      secondaryRecordsCount: this.secondaryRecordsCount,
      secondaryError: this.secondaryError,
      retryState: {
        backoffDelay: this.backoffDelay,
        hasTimeout: !!this.reconnectTimeout
      },
      bbox: {
        minLat: process.env.AIS_BBOX_MIN_LAT || '37.3',
        minLon: process.env.AIS_BBOX_MIN_LON || '-123.5',
        maxLat: process.env.AIS_BBOX_MAX_LAT || '38.3',
        maxLon: process.env.AIS_BBOX_MAX_LON || '-121.8',
      }
    };
  }

  public getVessels(): AisVessel[] {
    return this.getResolvedVessels();
  }

  public getValidationDiagnostics() {
    return {
      rejectedReasons: this.rejectedReasons,
      latestRawTimestamp: this.latestRawTimestamp,
      latestValidTimestamp: this.latestValidTimestamp
    };
  }

  public getSecondaryVessels(): AisVessel[] {
    return Array.from(this.secondaryVessels.values());
  }

  public getLastKnownVessels(): Array<AisVessel & { ageMins: number }> {
    const now = Date.now();
    const ttlMinutes = parseFloat(process.env.AIS_LAST_KNOWN_TTL_MINUTES || '30');
    const ttlMs = ttlMinutes * 60000;
    const list: Array<AisVessel & { ageMins: number }> = [];

    for (const [mmsi, v] of this.lastKnownVessels.entries()) {
      const ageMs = now - v.lastSeen;
      if (ageMs <= ttlMs) {
        const ageMins = Math.round(ageMs / 60000);
        list.push({
          id: v.id,
          name: v.name,
          imo: v.imo,
          type: v.type,
          latitude: v.latitude,
          longitude: v.longitude,
          speed: v.speed,
          lastUpdated: v.lastUpdated,
          ageMins
        });
      } else {
        this.lastKnownVessels.delete(mmsi);
      }
    }
    return list;
  }

  public setSecondaryVessels(vesselsList: AisVessel[]) {
    this.secondaryVessels.clear();
    vesselsList.forEach(v => {
      const mmsi = Number(v.imo.replace('MMSI: ', ''));
      if (!isNaN(mmsi)) {
        this.secondaryVessels.set(mmsi, v);
        this.lastKnownVessels.set(mmsi, { ...v, lastSeen: Date.now() });
      }
    });
    this.secondaryRecordsCount = vesselsList.length;
    this.lastSecondaryFetchTime = Date.now();
  }

  public setSecondaryError(err: string | null) {
    this.secondaryError = err;
  }

  public clearVessels() {
    this.vessels.clear();
    this.messagesReceived = 0;
    this.vesselsParsedCount = 0;
    this.firstZeroFramesTime = Date.now();
  }

  public resetDiagnostics() {
    this.messagesReceived = 0;
    this.vesselsParsedCount = 0;
    this.attemptedConnection = false;
    this.hasOpenFired = false;
    this.hasClosedFired = false;
    this.lastCloseCode = null;
    this.lastCloseReason = '';
    this.messageTimestamps = [];
    this.firstZeroFramesTime = Date.now();
  }

  public forceConnect(manual = false) {
    console.log(`[AISstreamManager] Force connect called. Manual: ${manual}`);
    if (manual) {
      this.backoffDelay = 1000;
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      this.connect(true);
      return;
    }

    const now = Date.now();
    if (this.ws && (this.status === 'connected' || this.status === 'connecting')) {
      return;
    }

    if (now - this.lastConnectAttemptTime < this.backoffDelay) {
      console.log(`[AISstreamManager] Ignoring forceConnect request. Backoff active: ${this.backoffDelay}ms`);
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.connect(false);
  }

  public connect(manual = false) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    let apiKey = process.env.AISSTREAM_API_KEY;
    if (apiKey) apiKey = apiKey.trim();
    if (!apiKey) {
      this.status = 'missing_key';
      this.lastError = 'AISSTREAM_API_KEY missing. Create your own key from AISstream.io and add it to the deployment environment.';
      console.warn('[AISstreamManager] Missing AISSTREAM_API_KEY. WebSocket connection disabled.');
      return;
    }

    const now = Date.now();
    if (!manual && (now - this.lastConnectAttemptTime < this.backoffDelay)) {
      console.log(`[AISstreamManager] Reconnect attempt throttled. Remaining backoff: ${this.backoffDelay - (now - this.lastConnectAttemptTime)}ms`);
      return;
    }

    if (this.attemptedConnection) {
      this.reconnectCount++;
    }
    this.lastConnectAttemptTime = now;
    const minLat = parseFloat(process.env.AIS_BBOX_MIN_LAT || '37.3');
    const minLon = parseFloat(process.env.AIS_BBOX_MIN_LON || '-123.5');
    const maxLat = parseFloat(process.env.AIS_BBOX_MAX_LAT || '38.3');
    const maxLon = parseFloat(process.env.AIS_BBOX_MAX_LON || '-121.8');

    console.log(`[AISstreamManager] Connecting to stream.aisstream.io for BBox [${minLat}, ${minLon}] to [${maxLat}, ${maxLon}]...`);
    this.status = 'connecting';
    this.attemptedConnection = true;
    this.hasOpenFired = false;
    this.hasClosedFired = false;
    this.lastCloseCode = null;
    this.lastCloseReason = '';
    this.lastError = null;

    try {
      if (this.ws) {
        try {
          if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
          }
          this.ws.removeAllListeners();
          this.ws.on('error', () => {}); // no-op for any trailing errors
          this.ws.terminate();
        } catch (e) {}
        this.ws = null;
      }

      this.ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

      this.ws.on('open', () => {
        this.status = 'connected';
        this.backoffDelay = 1000; // Reset backoff
        this.lastError = null;
        this.hasOpenFired = true;
        this.openTimestamp = new Date().toISOString();
        console.log('[AISstreamManager] WebSocket connection opened.');

        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.ping();
            } catch (err) {
              console.error('[AISstreamManager] Failed to send ping:', err);
            }
          }
        }, 10000);

        // Send subscription message
        const subscription = {
          APIKey: apiKey,
          BoundingBoxes: [
            [
              [minLat, minLon],
              [maxLat, maxLon]
            ]
          ]
        };
        this.ws?.send(JSON.stringify(subscription));
        this.subscriptionSent = true;
        console.log('[AISstreamManager] Subscription sent.');
      });

      this.ws.on('message', (messageData: WebSocket.Data) => {
        this.messagesReceived++;
        this.firstZeroFramesTime = null;
        this.messageTimestamps.push(Date.now());
        if (this.messagesReceived === 1) {
          console.log('[AISstreamManager] First message received from stream.');
        }
        this.lastMessageTime = new Date().toISOString();

        try {
          const rawString = messageData.toString();
          const parsed = JSON.parse(rawString);
          
          if (parsed.MetaData && parsed.MetaData.time_utc) {
            this.latestRawTimestamp = parsed.MetaData.time_utc;
          }

          const metadata = parsed.MetaData;
          if (!metadata) {
            this.rejectedReasons.missingRequiredField++;
            return;
          }

          const mmsi = metadata.MMSI;
          if (!mmsi) {
            this.rejectedReasons.missingMmsi++;
            return;
          }

          const lat = metadata.latitude;
          const lng = metadata.longitude;
          if (lat === undefined || lng === undefined) {
            this.rejectedReasons.missingCoords++;
            return;
          }
          if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
            this.rejectedReasons.invalidCoords++;
            return;
          }

          const minLat = parseFloat(process.env.AIS_BBOX_MIN_LAT || '37.3');
          const minLon = parseFloat(process.env.AIS_BBOX_MIN_LON || '-123.5');
          const maxLat = parseFloat(process.env.AIS_BBOX_MAX_LAT || '38.3');
          const maxLon = parseFloat(process.env.AIS_BBOX_MAX_LON || '-121.8');
          if (lat < minLat || lat > maxLat || lng < minLon || lng > maxLon) {
            this.rejectedReasons.outsideBBox++;
            return;
          }

          // Check stale timestamp (e.g. > 12 hours)
          if (metadata.time_utc) {
            const msgMs = new Date(metadata.time_utc).getTime();
            if (!isNaN(msgMs) && Date.now() - msgMs > 12 * 3600000) {
              this.rejectedReasons.staleTimestamp++;
              return;
            }
          }

          let speed: number | null = null;
          const messageType = parsed.MessageType;
          
          // Check supported message types
          const supportedTypes = ['PositionReport', 'MessageType1', 'MessageType2', 'MessageType3', 'MessageType18', 'MessageType19'];
          if (messageType && !supportedTypes.includes(messageType) && !messageType.startsWith('MessageType')) {
            this.rejectedReasons.unsupportedMsgType++;
          }

          if (parsed.Message && parsed.Message[messageType]) {
            const inner = parsed.Message[messageType];
            if (typeof inner.Sog === 'number') {
              speed = inner.Sog;
            } else if (typeof inner.SpeedOverGround === 'number') {
              speed = inner.SpeedOverGround;
            }
          }

          if (speed !== null && (speed < 0 || speed > 120 || isNaN(speed))) {
            this.rejectedReasons.invalidSpeed++;
            console.warn(`[AISstreamManager] Rejecting message for vessel MMSI ${mmsi} due to impossible speed: ${speed}`);
            return;
          }

          let heading: number | null = null;
          if (parsed.Message && parsed.Message[messageType]) {
            const inner = parsed.Message[messageType];
            if (typeof inner.Cog === 'number') {
              heading = inner.Cog;
            } else if (typeof inner.CourseOverGround === 'number') {
              heading = inner.CourseOverGround;
            } else if (typeof inner.TrueHeading === 'number') {
              heading = inner.TrueHeading;
            }
          }
          if (heading !== null && (heading < 0 || heading > 360 || heading === 511 || isNaN(heading))) {
            heading = null;
          }

          const name = metadata.ShipName ? metadata.ShipName.trim() : `MMSI ${mmsi}`;
          let type = 'Cargo Vessel'; // Default
          const nameLower = name.toLowerCase();
          if (nameLower.includes('tug') || nameLower.includes('barge')) {
            type = 'Tug & Barge';
          } else if (nameLower.includes('tanker') || nameLower.includes('lpg')) {
            type = 'Tanker';
          } else if (nameLower.includes('yacht') || nameLower.includes('passenger') || nameLower.includes('cruise')) {
            type = 'Passenger';
          } else if (nameLower.includes('fishing') || nameLower.includes('f/v')) {
            type = 'Fishing';
          } else if (speed !== null && speed > 22.0) {
            type = 'High-Speed';
          } else if (nameLower.includes('cargo') || nameLower.includes('container')) {
            type = 'Cargo Vessel';
          }

          // Check duplicate older MMSI
          const existing = this.vessels.get(Number(mmsi));
          if (existing) {
            const existingTime = new Date(existing.lastUpdated).getTime();
            const newTime = metadata.time_utc ? new Date(metadata.time_utc).getTime() : Date.now();
            if (newTime < existingTime) {
              this.rejectedReasons.duplicateOlderMmsi++;
              return;
            }
          }

          this.vesselsParsedCount++;
          this.latestValidTimestamp = new Date().toISOString();
          const vessel: AisVessel = {
            id: `AIS-${mmsi}`,
            name,
            imo: `MMSI: ${mmsi}`,
            type,
            latitude: lat,
            longitude: lng,
            speed: speed as any,
            heading: heading as any,
            lastUpdated: new Date().toISOString(),
          };
          this.vessels.set(Number(mmsi), vessel);
          this.lastKnownVessels.set(Number(mmsi), { ...vessel, lastSeen: Date.now() });
        } catch (err) {
          this.rejectedReasons.parseError++;
          console.error('[AISstreamManager] Error parsing message:', err);
        }
      });

      this.ws.on('error', (err) => {
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        console.error('[AISstreamManager] WebSocket error:', err);
        this.status = 'error';
        this.lastError = err.message || 'WebSocket error';
      });

      this.ws.on('close', (code, reason) => {
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        this.status = 'disconnected';
        this.subscriptionSent = false;
        this.hasClosedFired = true;
        this.lastCloseCode = code;
        this.lastCloseReason = reason.toString();
        console.log(`[AISstreamManager] WebSocket closed (Code: ${code}, Reason: ${reason}). Scheduling reconnect...`);
        this.scheduleReconnect();
      });

    } catch (e: any) {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      this.status = 'error';
      this.lastError = e.message || 'Connection initialisation error';
      this.lastCloseCode = 9999;
      this.lastCloseReason = e.message || 'Initialization error';
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.status = 'retrying';
    
    console.log(`[AISstreamManager] Reconnecting in ${this.backoffDelay}ms...`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.backoffDelay = Math.min(60000, this.backoffDelay * 2); // Exponential backoff up to 60s
      this.connect();
    }, this.backoffDelay);
  }

  private startPruning() {
    if (this.pruneInterval) clearInterval(this.pruneInterval);
    
    this.pruneInterval = setInterval(() => {
      const now = Date.now();
      for (const [mmsi, vessel] of this.vessels.entries()) {
        const lastUpdate = new Date(vessel.lastUpdated).getTime();
        const diffMins = (now - lastUpdate) / 60000;
        if (diffMins > 20) {
          console.log(`[AISstreamManager] Pruning stale vessel: ${vessel.name} (MMSI: ${mmsi})`);
          this.vessels.delete(mmsi);
        }
      }
    }, 60000); // Check every minute
  }
  private async fetchSecondaryAISVessels(provider: string, apiKey: string, endpoint: string | undefined): Promise<any> {
    const minLat = process.env.AIS_BBOX_MIN_LAT || '37.3';
    const minLon = process.env.AIS_BBOX_MIN_LON || '-123.5';
    const maxLat = process.env.AIS_BBOX_MAX_LAT || '38.3';
    const maxLon = process.env.AIS_BBOX_MAX_LON || '-121.8';

    let url = '';
    if (provider === 'datalastic') {
      url = `https://api.datalastic.com/api/v0/vessel_inradius?api-key=${apiKey}&lat=37.8&lon=-122.65&radius=40`;
    } else if (provider === 'marinetraffic') {
      url = `https://services.marinetraffic.com/api/exportvessels/v:8/${apiKey}/MINLAT:${minLat}/MAXLAT:${maxLat}/MINLON:${minLon}/MAXLON:${maxLon}/protocol:json`;
    } else if (provider === 'vesselfinder') {
      url = `https://api.vesselfinder.com/vessels?userkey=${apiKey}&minlat=${minLat}&minlon=${minLon}&maxlat=${maxLat}&maxlon=${maxLon}`;
    } else if (provider === 'endpoint' && endpoint) {
      url = endpoint;
    } else {
      throw new Error(`Unsupported secondary provider: ${provider}`);
    }

    console.log(`[AISstreamManager Background] Querying URL: ${url.replace(apiKey, 'REDACTED')}`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Secondary AIS request failed with status: ${res.status}`);
    }
    return await res.json();
  }

  private parseSecondaryVessels(data: any): AisVessel[] {
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
      const mmsi = item.mmsi || item.MMSI || item.mmsi_number;
      if (!mmsi) {
        this.rejectedReasons.missingMmsi++;
        return null;
      }
      const lat = Number(item.lat || item.latitude || item.LATITUDE);
      const lon = Number(item.lon || item.longitude || item.LONGITUDE);
      if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
        this.rejectedReasons.invalidCoords++;
        return null;
      }

      // Outside bounding box
      const minLat = 37.3;
      const maxLat = 38.3;
      const minLon = -123.5;
      const maxLon = -121.8;
      if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) {
        this.rejectedReasons.outsideBBox++;
        return null;
      }

      const speed = item.speed !== undefined ? Number(item.speed) : (item.sog !== undefined ? Number(item.sog) : null);
      if (speed !== null && (speed < 0 || speed > 120 || isNaN(speed))) {
        this.rejectedReasons.invalidSpeed++;
        return null;
      }

      const name = (item.name || item.shipname || item.ship_name || item.vessel_name || `MMSI ${mmsi}`).trim();
      const type = item.type || item.vessel_type || item.ship_type || 'Cargo Vessel';
      const heading = item.heading !== undefined ? Number(item.heading) : (item.course !== undefined ? Number(item.course) : 0);

      this.vesselsParsedCount++;
      return {
        id: `AIS-${mmsi}`,
        name,
        imo: `MMSI: ${mmsi}`,
        type,
        latitude: lat,
        longitude: lon,
        speed: speed || 10.0,
        lastUpdated: new Date().toISOString(),
        heading
      };
    }).filter(Boolean) as AisVessel[];
  }

  private getHistoricalVesselsFallback(): AisVessel[] {
    try {
      const filePath = path.join(process.cwd(), 'public', 'ais.json');
      if (fs.existsSync(filePath)) {
        const dataStr = fs.readFileSync(filePath, 'utf8');
        const rawData = JSON.parse(dataStr);
        return rawData.slice(0, 10).map((v: any) => {
          const mmsi = String(v.id).substring(0, 9);
          return {
            id: `HIST-${v.id}`,
            name: `${v.name} (Historical)`,
            imo: `MMSI: ${mmsi}`,
            type: 'Cargo Vessel',
            latitude: Number(v.latitude),
            longitude: Number(v.longitude),
            speed: Number(v.speed || 12.0),
            heading: 0,
            lastUpdated: new Date().toISOString()
          };
        });
      }
    } catch (err) {
      console.error('[AISstreamManager Fallback] Failed to load historical fallback:', err);
    }
    return [];
  }

  public getResolvedVessels(): AisVessel[] {
    const now = Date.now();
    const isWaitingTooLong = this.firstZeroFramesTime ? (now - this.firstZeroFramesTime >= 120000) : false;

    // 1. If we have live WebSocket vessels, return them
    if (this.vessels.size > 0) {
      return Array.from(this.vessels.values());
    }

    // 2. If we are in the waiting period (zero frames for < 2 minutes), return empty array (do not fallback yet)
    if (!isWaitingTooLong && this.status !== 'missing_key') {
      return [];
    }

    // 3. If zero frames for >= 2 mins, and we have secondary provider (e.g. Datalastic) vessels, return them
    if (this.secondaryVessels.size > 0) {
      return Array.from(this.secondaryVessels.values());
    }

    // 4. Fallback 1: Last-Known Cache
    const lastKnown = this.getLastKnownVessels();
    if (lastKnown.length > 0) {
      return lastKnown.map(v => ({
        ...v,
        id: v.id.startsWith('LK-') ? v.id : `LK-${v.id}`,
        sourceType: 'last-known' as any
      }));
    }

    // 5. Fallback 2: Historical ais.json
    return this.getHistoricalVesselsFallback();
  }

  private startSecondaryFetchLoop() {
    setInterval(async () => {
      try {
        const now = Date.now();
        const secondaryProvider = process.env.SECONDARY_AIS_PROVIDER;
        if (!secondaryProvider) return;

        // Check if we have zero live WebSocket messages for >= 2 minutes
        const isWaitingTooLong = this.firstZeroFramesTime ? (now - this.firstZeroFramesTime >= 120000) : false;
        if (!isWaitingTooLong) {
          // If WebSocket is active, clear secondary vessels to free memory
          if (this.secondaryVessels.size > 0) {
            this.secondaryVessels.clear();
            this.secondaryRecordsCount = 0;
          }
          return;
        }

        // Rate limit: fetch at most once every 60 seconds
        const cacheAge = now - this.lastSecondaryFetchTime;
        if (cacheAge < 60000 && this.lastSecondaryFetchTime > 0) {
          return;
        }

        let apiKey = '';
        if (secondaryProvider === 'datalastic') apiKey = process.env.DATALASTIC_API_KEY || '';
        else if (secondaryProvider === 'marinetraffic') apiKey = process.env.MARINETRAFFIC_API_KEY || '';
        else if (secondaryProvider === 'vesselfinder') apiKey = process.env.VESSELFINDER_API_KEY || '';
        else if (secondaryProvider === 'endpoint') apiKey = 'DUMMY';

        if (!apiKey) {
          this.secondaryError = `Secondary API Key not configured for ${secondaryProvider}`;
          return;
        }

        const rawData = await this.fetchSecondaryAISVessels(secondaryProvider, apiKey, process.env.SECONDARY_AIS_ENDPOINT);
        const parsed = this.parseSecondaryVessels(rawData);
        this.setSecondaryVessels(parsed);
        this.secondaryError = null;
      } catch (err: any) {
        console.error('[AISstreamManager Background] Secondary fetch error:', err.message || err);
        this.secondaryError = err.message || String(err);
      }
    }, 10000); // Check status every 10 seconds
  }
}

// Global singleton registry for Hot-Reloading in Next.js development
const globalAis = globalThis as any;
if (!globalAis.aisManager) {
  globalAis.aisManager = new AisStreamManager();
}

export const aisManager = globalAis.aisManager;
