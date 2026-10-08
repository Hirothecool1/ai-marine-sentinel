/* ==========================================================================
   PREDICTIVE MARINE SENTINEL — 2D MARINE TACTICAL MAP (LEAFLET IMPLEMENTATION)
   Renders shipping channels, danger geofences, acoustics, and vessel paths.
   ========================================================================== */

export class Map2D {
  constructor(containerId, simulation) {
    this.sim = simulation;
    this.containerId = containerId;
    this.leafletFailed = false;
    
    // Config properties for UI compatibility
    this.minZoom = 9;
    this.maxZoom = 15;

    const container = document.getElementById(containerId);
    this.canvasWrapper = container ? container.parentElement : null;

    try {
      if (typeof L === 'undefined') {
        throw new Error('Leaflet library L is not defined on window');
      }

      // Initialize Leaflet Map
      // Center it around San Francisco Bay Approach coordinates
      this.map = L.map(containerId, {
        zoomControl: false,
        attributionControl: false
      }).setView([37.85, -122.55], 10);

      this.mapRendererStatus = 'loaded';
      this.baseMapTilesStatus = 'loaded';

      // Configure tile layer: Use CARTO with API key if configured, otherwise default to Esri World Dark Gray Canvas
      const cartoKey = (typeof window !== 'undefined' && (window.CARTO_API_KEY || (window.appConfig && window.appConfig.cartoApiKey))) || '';
      const cartoUrl = cartoKey 
        ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`
        : null;
      const esriUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
      
      const primaryTileUrl = cartoUrl || esriUrl;
      const attribution = cartoUrl
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ';

      const tileLayer = L.tileLayer(primaryTileUrl, {
        maxZoom: 16,
        attribution: attribution
      });
      
      tileLayer.on('tileerror', () => {
        this.baseMapTilesStatus = 'error';
        if (tileLayer.getUrl() !== esriUrl) {
          console.warn("[Map2D] CARTO tile layer error detected. Falling back to Esri Dark Gray Canvas basemap.");
          tileLayer.setUrl(esriUrl);
        }
      });
      
      tileLayer.addTo(this.map);
    } catch (e) {
      console.warn("[Map2D] Leaflet initialization failed. Activating SVG fallback map.", e);
      this.leafletFailed = true;
      this.mapRendererStatus = 'error';
      this.baseMapTilesStatus = 'error';
    }

    // Selection state
    this.selectedObjectId = null;
    this.selectedObjectType = null; // 'vessel' or 'whale'

    // Collections to manage active Leaflet layers
    this.layers = {
      routes: [],
      hydrophones: [],
      dangerZones: {},
      krillPatches: [],
      vessels: {},
      whales: {},
      historicalSightings: [],
      sstFronts: [],
      chlorophyllPlumes: [],
      buoys: {},
      bathymetry: null
    };

    this.bathymetryLines = [
      [
        [38.30, -123.35],
        [38.00, -123.15],
        [37.70, -123.00],
        [37.40, -122.75],
        [37.10, -122.50]
      ],
      [
        [38.30, -123.45],
        [38.00, -123.25],
        [37.70, -123.10],
        [37.40, -122.85],
        [37.10, -122.60]
      ]
    ];

    // Static mock data for additional layers
    this.mockHistoricalSightings = [
      { x: 300, y: 450, species: "Humpback Whale", date: "2026-05-10" },
      { x: 450, y: 600, species: "Blue Whale", date: "2026-05-12" },
      { x: 200, y: 300, species: "Fin Whale", date: "2026-05-14" },
      { x: 600, y: 500, species: "Gray Whale", date: "2026-05-18" },
      { x: 750, y: 400, species: "Humpback Whale", date: "2026-05-20" }
    ];

    this.mockSSTFronts = [
      { center: { x: 350, y: 700 }, radius: 150, temp: "14.2°C" },
      { center: { x: 650, y: 350 }, radius: 180, temp: "15.5°C" }
    ];

    this.mockChlorophyllPlumes = [
      { center: { x: 250, y: 550 }, radius: 130, density: "2.1 mg/m³" },
      { center: { x: 500, y: 450 }, radius: 200, density: "2.8 mg/m³" }
    ];

    // Initialize all static layers
    this.initStaticLayers();
  }

  getProvenancePopupHtml(title, source, sourceType, timestamp, confidence, status, inputsUsed, extraHtml = '') {
    return `
      <div style="font-family: var(--font-body, system-ui); color: #f8fafc; padding: 12px; max-width: 250px; font-size: 11px; line-height: 1.5;">
        <h4 style="margin: 0 0 8px 0; color: #38bdf8; font-size: 12px; font-weight: bold; border-bottom: 1px solid rgba(255, 255, 255, 0.15); padding-bottom: 4px; text-transform: uppercase;">${title}</h4>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div><strong style="color: #94a3b8;">Source:</strong> <span style="color: #e2e8f0;">${source}</span></div>
          <div><strong style="color: #94a3b8;">Source Type:</strong> <span style="color: #e2e8f0;">${sourceType}</span></div>
          <div><strong style="color: #94a3b8;">Timestamp:</strong> <span style="color: #e2e8f0;">${timestamp}</span></div>
          <div><strong style="color: #94a3b8;">Confidence:</strong> <span style="color: #e2e8f0;">${confidence}</span></div>
          <div><strong style="color: #94a3b8;">Status:</strong> <span style="color: #e2e8f0; font-weight: 600;">${status}</span></div>
          <div><strong style="color: #94a3b8;">Inputs Used:</strong> <span style="color: #e2e8f0;">${inputsUsed}</span></div>
          ${extraHtml}
        </div>
      </div>
    `;
  }

  // Projection conversions: Sim Space [0-1000] <=> Lat/Lng
  simToLatLng(x, y) {
    const a = 0.001155;
    const b = -0.000796;
    const c = -123.03278;
    const d = 0.000565;
    const e = -0.001424;
    const f = 38.21158;

    const lng = a * x + b * y + c;
    const lat = d * x + e * y + f;
    return [lat, lng];
  }

  getZoneLatLng(dz) {
    if (!dz) return [37.75, -122.8];
    const hasLatLng = typeof dz.lat === 'number' && typeof dz.lng === 'number' && !isNaN(dz.lat) && !isNaN(dz.lng);
    if (hasLatLng) {
      return [dz.lat, dz.lng];
    }
    if (dz.center && typeof dz.center.x === 'number' && typeof dz.center.y === 'number' && !isNaN(dz.center.x) && !isNaN(dz.center.y)) {
      return this.simToLatLng(dz.center.x, dz.center.y);
    }
    if (typeof dz.x === 'number' && typeof dz.y === 'number' && !isNaN(dz.x) && !isNaN(dz.y)) {
      return this.simToLatLng(dz.x, dz.y);
    }
    return [37.75, -122.8];
  }

  latLngToSim(lat, lng) {
    const a = 0.001155;
    const b = -0.000796;
    const c = -123.03278;
    const d = 0.000565;
    const e = -0.001424;
    const f = 38.21158;

    const det = a * e - b * d;
    const x = (e * (lng - c) - b * (lat - f)) / det;
    const y = (-d * (lng - c) + a * (lat - f)) / det;
    return { x, y };
  }

  // Zoom control direct integrations
  zoomIn() {
    if (!this.leafletFailed) this.map.zoomIn();
  }

  zoomOut() {
    if (!this.leafletFailed) this.map.zoomOut();
  }

  recenter() {
    if (!this.leafletFailed) this.map.setView([37.85, -122.55], 10);
  }

  recenterOnSim(x, y) {
    if (!this.leafletFailed) {
      const latLng = this.simToLatLng(x, y);
      this.map.setView(latLng, this.map.getZoom());
    }
  }

  resize() {
    if (!this.leafletFailed) this.map.invalidateSize();
  }

  initStaticLayers() {
    if (this.leafletFailed) return;
    // 1. Draw Shipping Routes once
    Object.keys(this.sim.routes).forEach(routeKey => {
      const routePoints = this.sim.routes[routeKey].map(pt => this.simToLatLng(pt.x, pt.y));
      const color = routeKey.toLowerCase().includes('inbound') ? '#3b82f6' : '#60a5fa';
      
      const polyline = L.polyline(routePoints, {
        color: color,
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.35
      }).addTo(this.map);
      
      this.layers.routes.push(polyline);
    });

    // 2. Draw Hydrophone Arrays once
    this.sim.hydrophones.forEach(hp => {
      const pos = this.simToLatLng(hp.x, hp.y);

      // Listening Range Area Circle
      const circle = L.circle(pos, {
        radius: hp.range * 37, // ~37 meters per unit scaling
        color: '#06b6d4',
        weight: 1,
        fillColor: '#06b6d4',
        fillOpacity: 0.04,
        dashArray: '3, 6'
      }).addTo(this.map);

      // Marker Dot
      const marker = L.circleMarker(pos, {
        radius: 6,
        color: '#06b6d4',
        fillColor: '#0f172a',
        fillOpacity: 1,
        weight: 2
      }).addTo(this.map);

      marker.bindTooltip(`<b>${hp.id}</b>: ${hp.name}<br><span style="font-size:9px;color:#06b6d4;">Acoustic Listener active</span>`, { direction: 'top' });
      
      this.layers.hydrophones.push({ marker, circle });
    });

    // 3. Draw Danger Zones (interactive toggling layer)
    this.sim.dangerZones.forEach(dz => {
      const pos = this.simToLatLng(dz.center.x, dz.center.y);
      
      const circle = L.circle(pos, {
        radius: dz.radius * 37,
        color: '#ef4444',
        weight: 1.5,
        fillColor: '#ef4444',
        fillOpacity: 0,
        dashArray: '4, 6'
      }).addTo(this.map);

      circle.bindTooltip(`<b>${dz.name}</b><br><span style="font-size:9px;color:#ef4444;">Whale Alert Zone</span>`, { direction: 'top' });
      
      this.layers.dangerZones[dz.id] = circle;
    });
  }

  // Main Loop Draw tick (called from app.js)
  draw() {
    if (this.leafletFailed) {
      this.drawFallbackSVG();
      return;
    }
    // Read layer toggles dynamically from sidebar checkboxes
    const showVessels = document.getElementById('layer-ais')?.checked !== false;
    const showRiskZones = document.getElementById('layer-risk-zones')?.checked !== false;
    const showShipping = document.getElementById('layer-shipping-lanes')?.checked !== false;
    const showUserReports = document.getElementById('layer-telemetry')?.checked !== false;
    const showLikelihood = document.getElementById('layer-likelihood')?.checked === true;
    const showEnvironmental = document.getElementById('layer-chlorophyll')?.checked === true;
    const showHistorical = document.getElementById('layer-sightings')?.checked === true;
    const showBathymetry = document.getElementById('layer-bathymetry')?.checked !== false;
    const showRawGrid = document.getElementById('layer-raw-grid')?.checked === true;
    const showCompliance = document.getElementById('layer-compliance')?.checked !== false;
    const showSST = showEnvironmental;

    // 1. Update/Render Vessels
    this.sim.vessels.forEach(v => {
      const pos = this.simToLatLng(v.x, v.y);
      const isFallback = v.sourceType === 'historical' || v.sourceType === 'last-known' || v.id.startsWith('HIST-') || v.id.startsWith('LK-');
      const isViolating = !isFallback && showCompliance && v.inDangerZone && v.speed > this.sim.speedLimit;
      
      let color = '#06b6d4'; // Cyan for normal live compliant vessels
      let fillOpacity = 1.0;
      let dashArray = null;
      
      if (isFallback) {
        color = '#3b82f6'; // Blue for fallback
        fillOpacity = 0.65;
        dashArray = '3, 4';
      } else if (isViolating) {
        color = '#ef4444'; // Red for violating live vessels
      }
      
      const weight = (this.selectedObjectId === v.id && this.selectedObjectType === 'vessel') ? 4 : 2;
      const radius = (this.selectedObjectId === v.id && this.selectedObjectType === 'vessel') ? 9 : 7;

      let marker = this.layers.vessels[v.id];
      const filter = window.app?.ui?.currentVesselFilter || 'all';
      const typeMatch = filter === 'all' || v.type === filter || (filter === 'Unknown' && v.type !== 'Cargo Vessel' && v.type !== 'Tanker' && v.type !== 'Passenger' && v.type !== 'Fishing' && v.type !== 'High-Speed');

      if (!showVessels || !typeMatch) {
        if (marker) {
          marker.remove();
          delete this.layers.vessels[v.id];
        }
        return;
      }

      if (!marker) {
        // Create new vessel circleMarker
        marker = L.circleMarker(pos, {
          radius: radius,
          color: color,
          fillColor: '#0f172a',
          fillOpacity: fillOpacity,
          weight: weight,
          dashArray: dashArray
        }).addTo(this.map);

        // Bind click events
        marker.on('click', () => {
          this.selectedObjectId = v.id;
          this.selectedObjectType = 'vessel';
          if (this.onSelectObject) {
            this.onSelectObject({ id: v.id, type: 'vessel', name: v.name, imo: v.imo, type_desc: v.type });
          }
        });

        this.layers.vessels[v.id] = marker;
      } else {
        // Update location and design
        marker.setLatLng(pos);
        marker.setStyle({
          color: color,
          radius: radius,
          weight: weight,
          fillOpacity: fillOpacity,
          dashArray: dashArray
        });
      }

      const activeDz = v.activeDangerZoneId ? this.sim.dangerZones.find(z => z.id === v.activeDangerZoneId) : null;
      let recSpeed = "normal operations / monitor";
      let complianceStatus = "Compliant";
      let isSpeeding = false;
      let zoneType = "None";

      if (v.inDangerZone && activeDz) {
        const riskScore = activeDz.riskScore || 0;
        if (activeDz.hasRealWhale || riskScore >= 55) {
          zoneType = isFallback ? "Est. Active Whale Alert" : "Active Whale Alert";
          recSpeed = "10 knots";
          isSpeeding = v.speed > 10.0;
        } else if (riskScore >= 35) {
          zoneType = isFallback ? "Est. Moderate Risk" : "Moderate Risk";
          recSpeed = "10–12 knots or Use extra caution";
          isSpeeding = v.speed > 12.0;
        } else {
          zoneType = isFallback ? "Est. Low Risk" : "Low Risk";
          recSpeed = "normal operations / monitor";
          isSpeeding = false;
        }
        if (isFallback) {
          complianceStatus = "N/A (Historical/Last-known)";
          isSpeeding = false;
        } else if (v.speed === undefined || v.speed === null || isNaN(v.speed)) {
          complianceStatus = "Unknown";
        } else {
          complianceStatus = isSpeeding ? "Over recommended speed" : "Compliant";
        }
      } else {
        complianceStatus = isFallback ? "N/A (Historical/Last-known)" : "Compliant";
      }

      const sourceName = v.sourceName || (v.id.startsWith('AIS-') ? 'AISstream.io' : 'Historical AIS — not live');
      const extraVesselHtml = `
        <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 6px; display: flex; flex-direction: column; gap: 4px;">
          <div><strong style="color: #94a3b8;">Source Provider:</strong> <span style="color: #e2e8f0;">${sourceName}</span></div>
          <div><strong style="color: #94a3b8;">MMSI:</strong> <span style="color: #e2e8f0;">${v.MMSI || v.id || 'N/A'}</span></div>
          <div><strong style="color: #94a3b8;">Vessel Name:</strong> <span style="color: #e2e8f0;">${v.name}</span></div>
          <div><strong style="color: #94a3b8;">Vessel Type:</strong> <span style="color: #e2e8f0;">${v.type || 'N/A'}</span></div>
          <div><strong style="color: #94a3b8;">Coords:</strong> <span style="color: #e2e8f0;">${pos[0].toFixed(5)}°N, ${Math.abs(pos[1]).toFixed(5)}°W</span></div>
          <div><strong style="color: #94a3b8;">Speed:</strong> <span style="color: #e2e8f0;">${v.speed !== undefined && v.speed !== null ? v.speed.toFixed(1) : 'N/A'} knots</span></div>
          <div><strong style="color: #94a3b8;">Heading:</strong> <span style="color: #e2e8f0;">${v.heading !== undefined && v.heading !== null ? v.heading + '°' : 'N/A'}</span></div>
          <div><strong style="color: #94a3b8;">Timestamp:</strong> <span style="color: #e2e8f0;">${v.receivedAt || new Date().toISOString()}</span></div>
          <div><strong style="color: #94a3b8;">Zone Status:</strong> <span style="color: #e2e8f0;">${v.inDangerZone ? 'Inside active risk zone' : 'Clear of risk zones'}</span></div>
          <div><strong style="color: #94a3b8;">Rec Speed:</strong> <span style="color: #fbbf24; font-weight: 600;">${recSpeed}</span></div>
          <div><strong style="color: #94a3b8;">Compliance:</strong> <span style="color: ${complianceStatus === 'Over recommended speed' ? '#f87171' : (complianceStatus.startsWith('N/A') || complianceStatus === 'Unknown' ? '#94a3b8' : '#34d399')}; font-weight: 600;">${complianceStatus}</span></div>
          ${isSpeeding ? `<div style="margin-top: 4px; padding: 4px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; border-radius: 4px; color: #f87171; font-weight: bold; text-align: center;">Potential compliance review</div>` : ''}
        </div>
      `;

      const sourceType = v.sourceType || (v.id.startsWith('AIS-') ? 'live' : 'historical');
      const isRealData = v.id.startsWith('AIS-') || v.id.startsWith('LK-') || v.id.startsWith('HIST-');
      const statusLabel = isRealData ? 'real' : 'sample';
      const inputUsed = isFallback ? 'Historical/Cached USCG VTS signal' : 'USCG VTS Transponder Signal';

      const popupHtml = this.getProvenancePopupHtml(
        `Vessel: ${v.name}`,
        sourceName,
        sourceType,
        new Date(v.lastUpdated || new Date()).toISOString(),
        isFallback ? "90% (Historical/Cached)" : "100% (GPS telemetry)",
        statusLabel,
        inputUsed,
        extraVesselHtml
      );
      marker.bindPopup(popupHtml, { className: 'custom-provenance-popup' });
      
      // Update Tooltip details dynamically
      let tooltipStatus = complianceStatus;
      if (isFallback) {
        tooltipStatus = sourceType === 'last-known' ? 'LAST-KNOWN AIS' : 'HISTORICAL AIS';
      } else {
        tooltipStatus = isViolating ? 'EXCESS SPEED' : 'COMPLIANT';
      }
      const tooltipColor = isFallback ? '#2563eb' : (isViolating ? '#ef4444' : '#10b981');
      const speedText = (v.speed !== undefined && v.speed !== null) ? `${v.speed.toFixed(1)} kts` : 'N/A';
      marker.bindTooltip(`<b>${v.name}</b><br>Speed: ${speedText}${showCompliance ? `<br><span style="color:${tooltipColor};font-weight:bold;">${tooltipStatus}</span>` : ''}`, { direction: 'right' });
    });

    // Clean up vessels that are no longer active in sim
    const activeVesselIds = new Set(this.sim.vessels.map(v => v.id));
    Object.keys(this.layers.vessels).forEach(id => {
      if (!activeVesselIds.has(id)) {
        this.layers.vessels[id].remove();
        delete this.layers.vessels[id];
      }
    });

    if (window.app && window.app.ui && window.app.ui.sourceManager) {
      const liveRenderedCount = Object.keys(this.layers.vessels).filter(id => id.startsWith('AIS-')).length;
      window.app.ui.sourceManager.sources.aisstream.renderedVesselsCount = liveRenderedCount;
    }

    // 2. Update/Render Whales
    this.sim.whales.forEach(w => {
      const pos = this.simToLatLng(w.x, w.y);
      const isSelected = (this.selectedObjectId === w.id && this.selectedObjectType === 'whale');
      
      let marker = this.layers.whales[w.id];
      if (!showUserReports) {
        if (marker) {
          marker.remove();
          delete this.layers.whales[w.id];
        }
        return;
      }

      if (!marker) {
        if (w.imageUrl) {
          // Custom Thumbnail DivIcon for image-based sightings
          const customIcon = L.divIcon({
            html: `<div class="custom-whale-icon-container ${isSelected ? 'selected' : ''}">
                     <div class="custom-whale-marker" style="border: 2.5px solid #ec4899; box-shadow: 0 0 10px rgba(236,72,153,0.5);">
                       <img src="${w.imageUrl}" alt="${w.name}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />
                       <div class="marker-pin" style="background:#ec4899;"></div>
                     </div>
                   </div>`,
            className: 'custom-whale-div-icon',
            iconSize: [36, 36],
            iconAnchor: [18, 36]
          });

          marker = L.marker(pos, { icon: customIcon }).addTo(this.map);
        } else {
          // Standard telemetry dot marker
          marker = L.circleMarker(pos, {
            radius: isSelected ? 8 : 5,
            color: '#ec4899',
            fillColor: '#ec4899',
            fillOpacity: 0.8,
            weight: isSelected ? 3 : 1
          }).addTo(this.map);
        }

        // Bind click events
        marker.on('click', () => {
          this.selectedObjectId = w.id;
          this.selectedObjectType = 'whale';
          if (this.onSelectObject) {
            this.onSelectObject({ id: w.id, type: 'whale', name: w.name, species: w.species });
          }
        });

        this.layers.whales[w.id] = marker;
      } else {
        // Update position
        marker.setLatLng(pos);
        
        // If image-based sighting, update icon styling for selection state dynamically
        if (w.imageUrl) {
          const customIcon = L.divIcon({
            html: `<div class="custom-whale-icon-container ${isSelected ? 'selected-whale' : ''}">
                     <div class="custom-whale-marker" style="border: 2.5px solid #ec4899; box-shadow: 0 0 10px rgba(236,72,153,0.5); transform: ${isSelected ? 'scale(1.2)' : 'none'}; transition: transform 0.2s;">
                       <img src="${w.imageUrl}" alt="${w.name}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />
                       <div class="marker-pin" style="background:#ec4899;"></div>
                     </div>
                   </div>`,
            className: 'custom-whale-div-icon',
            iconSize: [36, 36],
            iconAnchor: [18, 36]
          });
          marker.setIcon(customIcon);
        } else {
          marker.setStyle({
            radius: isSelected ? 8 : 5,
            weight: isSelected ? 3 : 1
          });
        }
      }

      const isBQ = w.id.startsWith('BQ-') || w.id.startsWith('BQ-SIGHTING-');
      const isImageReviewed = w.verificationStatus === 'verified' || w.imageUrl || isBQ;
      const displayLabel = isImageReviewed ? 'Recent user-reported whale area — image reviewed' : 'Recent user-reported whale area — unverified';
      
      const extraHtml = w.imageUrl ? `<div style="margin-top: 8px; border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);"><img src="${w.imageUrl}" style="width: 100%; max-height: 100px; object-fit: cover;" /></div>` : '';
      
      const whalePopupHtml = `
        <div class="provenance-popup">
          <h4 style="color: #ec4899; margin-top: 0; margin-bottom: 6px; font-size: 12px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
            ${displayLabel}
          </h4>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10px; color: #e2e8f0;">
            <div><strong>Species:</strong> <span>${w.species}</span></div>
            <div><strong>Location Coords:</strong> <span>${pos[0].toFixed(4)}&deg;N, ${Math.abs(pos[1]).toFixed(4)}&deg;W</span></div>
            <div><strong>Observation Time:</strong> <span>${new Date(w.timestamp || new Date()).toLocaleString()}</span></div>
            <div><strong>Verification Status:</strong> <span style="color: ${isImageReviewed ? '#10b981' : '#f59e0b'}; font-weight: bold;">${isImageReviewed ? 'Verified Report' : 'Unverified Sighting'}</span></div>
            ${extraHtml}
            <div style="margin-top: 6px; font-size: 8.5px; color: #f87171; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px; font-style: italic;">
              Image-reviewed user report — does not predict future movements or confirm exact scientific count.
            </div>
          </div>
        </div>
      `;
      marker.bindPopup(whalePopupHtml, { className: 'custom-provenance-popup' });
      marker.bindTooltip(`<b>${displayLabel}</b><br>Species: ${w.species}<br>Depth: ${w.depth.toFixed(0)}m`, { direction: 'top' });
    });

    // Clean up whales no longer in sim
    const activeWhaleIds = new Set(this.sim.whales.map(w => w.id));
    Object.keys(this.layers.whales).forEach(id => {
      if (!activeWhaleIds.has(id)) {
        this.layers.whales[id].remove();
        delete this.layers.whales[id];
      }
    });

    // 3. Update Danger Zone Geofence Visuals
    // Clean up old danger zones that are no longer present in simulation
    const currentDzIds = new Set(this.sim.dangerZones.map(dz => dz.id));
    Object.keys(this.layers.dangerZones).forEach(id => {
      if (!currentDzIds.has(id)) {
        this.layers.dangerZones[id].remove();
        delete this.layers.dangerZones[id];
      }
    });

    this.sim.dangerZones.forEach(dz => {
      let circle = this.layers.dangerZones[dz.id];
      const pos = this.getZoneLatLng(dz);
      const latVal = Array.isArray(pos) ? pos[0] : (pos ? pos.lat : NaN);
      const lngVal = Array.isArray(pos) ? pos[1] : (pos ? pos.lng : NaN);
      const isValid = typeof latVal === 'number' && typeof lngVal === 'number' && !isNaN(latVal) && !isNaN(lngVal);
      const validLatLng = isValid ? L.latLng(latVal, lngVal) : L.latLng(37.75, -122.8);

      const rawRadiusKm = (typeof dz.radiusKm === 'number' && !isNaN(dz.radiusKm)) ? dz.radiusKm : (dz.id === 'DDZ-01' ? 10 : (dz.id === 'DDZ-02' ? 8 : (dz.id === 'DDZ-03' ? 12 : 10)));
      const circleRadiusPx = rawRadiusKm * 1000;

      if (!circle) {
        circle = L.circle(validLatLng, {
          radius: circleRadiusPx,
          color: '#4b5563',
          weight: 1.0,
          fillColor: '#4b5563',
          fillOpacity: 0,
          dashArray: '5, 8'
        }).addTo(this.map);
        this.layers.dangerZones[dz.id] = circle;
      }

      if (circle) {
        circle.setLatLng(validLatLng);
        circle.setRadius(circleRadiusPx);

        const shouldDrawZone = dz.active || dz.isEcologicalHotspot || dz.isStatic;
        if (showRiskZones && shouldDrawZone) {
          if (!this.map.hasLayer(circle)) circle.addTo(this.map);
          
          let fillColor = '#4b5563';
          let borderColor = '#4b5563';
          let fillOpacity = 0;
          let weight = 1.0;
          let dashArray = '5, 8';
          let tooltipLabel = `${dz.name} (VTS Lane)`;

          if (dz.active) {
            fillColor = '#ef4444';
            borderColor = '#ef4444';
            fillOpacity = 0.10;
            weight = 2.5;
            dashArray = '5, 8';
            tooltipLabel = `Collision-Risk Warning Zone: <b>${dz.name}</b>`;
          } else if (dz.isEcologicalHotspot) {
            fillColor = '#a855f7';
            borderColor = '#a855f7';
            fillOpacity = 0.05;
            weight = 1.5;
            dashArray = '5, 8';
            tooltipLabel = `Elevated Ecological Suitability Area: <b>${dz.name}</b>`;
          }

          circle.setStyle({
            fillColor,
            color: borderColor,
            fillOpacity,
            weight,
            dashArray
          });

          circle.bindTooltip(tooltipLabel, { direction: 'top' });

          const riskIndex = dz.riskScore !== null ? (dz.riskScore / 100).toFixed(2) : '0.00';
          const completeness = dz.completeness !== undefined ? (dz.completeness * 100).toFixed(0) + '%' : '100%';
          const availableStr = Array.isArray(dz.availableSources) ? dz.availableSources.join(', ') : 'AIS, NOAA, GEE, Bathymetry';
          const unavailableStr = Array.isArray(dz.unavailableSources) ? dz.unavailableSources.join(', ') : 'None';
          const speedRiskVal = dz.speedRisk !== null && dz.speedRisk !== undefined ? dz.speedRisk.toFixed(2) : '0.00';
          const routeOverlapVal = dz.routeOverlap !== null && dz.routeOverlap !== undefined ? dz.routeOverlap.toFixed(2) : '0.00';
          const whaleLikelihoodVal = dz.whaleLikelihood !== null && dz.whaleLikelihood !== undefined ? dz.whaleLikelihood.toFixed(2) : '0.00';
          const crossedReasonText = dz.crossedReason || 'Cumulative metrics below thresholds';

          const zoneHtml = `
            <div class="provenance-popup">
              <h4 style="color: ${dz.active ? '#ef4444' : '#a855f7'}; margin-top: 0; margin-bottom: 6px; font-size: 11px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                ${dz.active ? 'Collision-Risk Warning Zone' : 'Elevated Ecological Suitability Area'}
              </h4>
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10px; color: #e2e8f0; line-height: 1.3;">
                <div><strong>Zone ID:</strong> <span class="monospace">${dz.id}</span></div>
                <div><strong>Center Coords:</strong> <span>${pos[0].toFixed(4)}&deg;N, ${Math.abs(pos[1]).toFixed(4)}&deg;W</span></div>
                <div><strong>Radius:</strong> <span>${dz.radiusKm} km</span></div>
                <div><strong>Calculation UTC:</strong> <span>${dz.timestamp || new Date().toISOString()}</span></div>
                <div style="border-top: 1px solid rgba(255,255,255,0.05); margin-top: 4px; padding-top: 4px;"></div>
                <div><strong>Collision-Risk Index:</strong> <span style="color: ${dz.active ? '#ef4444' : '#a855f7'}; font-weight: 600;">${riskIndex}</span></div>
                <div><strong>Data Completeness:</strong> <span>${completeness}</span></div>
                <div><strong>Whale Likelihood Index:</strong> <span>${whaleLikelihoodVal}</span></div>
                <div><strong>Vessel Count (Live):</strong> <span>${dz.vesselCount || 0}</span></div>
                <div><strong>Vessel Speed-Risk:</strong> <span>${speedRiskVal}</span></div>
                <div><strong>Route-Overlap Score:</strong> <span>${routeOverlapVal}</span></div>
                <div style="border-top: 1px solid rgba(255,255,255,0.05); margin-top: 4px; padding-top: 4px;"></div>
                <div><strong>Available Sources:</strong> <span style="color: #4ade80;">${availableStr}</span></div>
                <div><strong>Unavailable Feeds:</strong> <span style="color: #f87171;">${unavailableStr}</span></div>
                <div style="margin-top: 6px; padding: 4px; background: rgba(255,255,255,0.03); border-radius: 4px; border: 1px dashed rgba(255,255,255,0.08);">
                  <strong style="color: #fbbf24;">Trigger Reason:</strong> <span style="color: #cbd5e1; font-size: 9.5px;">${crossedReasonText}</span>
                </div>
              </div>
            </div>
          `;
          circle.bindPopup(zoneHtml, { className: 'custom-provenance-popup' });
        } else {
          if (this.map.hasLayer(circle)) this.map.removeLayer(circle);
        }
      }
    });

    // 4. Update GEE Environmental suitability proxy cells
    // Clear old patches first
    this.layers.krillPatches.forEach(c => c.remove());
    this.layers.krillPatches = [];

    if (this.sim.krillPatches) {
      this.sim.krillPatches.forEach(kp => {
        const density = kp.density;
        const pos = this.simToLatLng(kp.x, kp.y);
        
        let shouldDraw = false;
        let color = '#eab308'; // Yellow for moderate
        let fillOpacity = 0.15;
        let weight = 1;
        let label = "Moderate environmental suitability";

        if (density >= 0.70) {
          shouldDraw = showEnvironmental;
          color = '#ea580c'; // Orange for elevated
          fillOpacity = 0.30;
          weight = 1;
          label = "Elevated environmental suitability";
        } else if (density >= 0.55) {
          shouldDraw = showEnvironmental;
          color = '#eab308';
          fillOpacity = 0.15;
          weight = 1;
          label = "Moderate environmental suitability";
        }

        // If diagnostic raw grid toggle is checked, we draw ALL points as grid cells (with low opacity outline)
        if (showRawGrid && !shouldDraw) {
          shouldDraw = true;
          color = '#94a3b8';
          fillOpacity = 0.02;
          weight = 0.5;
          label = "Low environmental suitability (diagnostic grid)";
        }

        if (shouldDraw) {
          const cell = L.circle(pos, {
            radius: 1200, // Small discrete cells
            color: color,
            weight: weight,
            fillColor: color,
            fillOpacity: fillOpacity,
            dashArray: showRawGrid ? '2, 2' : null
          }).addTo(this.map);

          cell.bindTooltip(`Prey-Habitat Suitability Proxy: ${density.toFixed(3)}<br><span style="font-size:9px;color:${color};font-weight:bold;">${label}</span>`, { permanent: false });

          const obsDateStr = window.app?.ui?.geeImageDate ? new Date(window.app.ui.geeImageDate).toLocaleDateString() : 'Pending/Unavailable';

          const plumePopupHtml = `
            <div class="provenance-popup">
              <h4 style="color: ${color}; margin-top: 0; margin-bottom: 6px; font-size: 11px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                Environmental Prey-Habitat Suitability Proxy
              </h4>
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10px; color: #e2e8f0;">
                <div><strong>Category:</strong> <span style="color: ${color}; font-weight: bold;">${label}</span></div>
                <div><strong>Threshold Type:</strong> <i>Model display threshold (not biologically validated krill threshold)</i></div>
                <div><strong>Suitability Index:</strong> <span>${density.toFixed(3)}</span></div>
                <div><strong>Real SST Value:</strong> <span>${kp.sst !== undefined && kp.sst !== null ? kp.sst.toFixed(1) + '°C' : 'N/A'}</span></div>
                <div><strong>Image Date:</strong> <span>${obsDateStr}</span></div>
                <div><strong>Data Source:</strong> <span>NOAA OISST V2.1 via Google Earth Engine</span></div>
                <div style="margin-top: 6px; font-size: 8.5px; color: #f87171; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px; font-style: italic;">
                  Environmental proxy — not direct krill or whale detection.
                </div>
              </div>
            </div>
          `;
          cell.bindPopup(plumePopupHtml, { className: 'custom-provenance-popup' });
          this.layers.krillPatches.push(cell);
        }
      });
    }

    // 5. Toggle Acoustics Array Layers
    const showAcoustics = false;
    this.layers.hydrophones.forEach(hp => {
      if (showAcoustics) {
        if (!this.map.hasLayer(hp.marker)) hp.marker.addTo(this.map);
        if (!this.map.hasLayer(hp.circle)) hp.circle.addTo(this.map);
      } else {
        if (this.map.hasLayer(hp.marker)) this.map.removeLayer(hp.marker);
        if (this.map.hasLayer(hp.circle)) this.map.removeLayer(hp.circle);
      }
    });

    // 5b. Model-estimated whale likelihood areas
    if (!this.layers.likelihoods) {
      this.layers.likelihoods = [];
    }
    this.layers.likelihoods.forEach(c => c.remove());
    this.layers.likelihoods = [];

    if (showLikelihood && this.sim.dangerZones) {
      this.sim.dangerZones.forEach(dz => {
        if (dz.whaleLikelihood !== null && dz.whaleLikelihood !== undefined) {
          const pos = this.getZoneLatLng(dz);
          const latVal = Array.isArray(pos) ? pos[0] : (pos ? pos.lat : NaN);
          const lngVal = Array.isArray(pos) ? pos[1] : (pos ? pos.lng : NaN);
          const isValid = typeof latVal === 'number' && typeof lngVal === 'number' && !isNaN(latVal) && !isNaN(lngVal);
          const validLatLng = isValid ? L.latLng(latVal, lngVal) : L.latLng(37.75, -122.8);

          const circle = L.circle(validLatLng, {
            radius: dz.radiusKm * 1000 * 0.8,
            color: '#4f46e5', // blue/purple
            weight: 1.5,
            fillColor: '#4f46e5',
            fillOpacity: 0.05,
            dashArray: '3, 6'
          }).addTo(this.map);

          circle.bindTooltip(`Model-Estimated Whale Likelihood Area<br>Relative Likelihood Index: ${dz.whaleLikelihood.toFixed(2)}`, { permanent: false });

          const likelihoodPopupHtml = `
            <div class="provenance-popup">
              <h4 style="color: #a78bfa; margin-top: 0; margin-bottom: 6px; font-size: 11px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                Model-Estimated Whale-Likelihood Area
              </h4>
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10px; color: #e2e8f0;">
                <div><strong>Category:</strong> <span>Model-estimated whale-likelihood area</span></div>
                <div><strong>Heuristic Likelihood Score:</strong> <span style="color: #a78bfa; font-weight: bold;">${dz.whaleLikelihood.toFixed(3)}</span></div>
                <div><strong>Source Method:</strong> <span>Weighted heuristic suitability formula</span></div>
                <div><strong>Inputs Fused:</strong> <span>GEE OISST SST proxy + bathymetry edge slope</span></div>
                <div style="margin-top: 6px; font-size: 8.5px; color: #f87171; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px; font-style: italic;">
                  Relative model estimate — not a confirmed whale sighting location.
                </div>
              </div>
            </div>
          `;
          circle.bindPopup(likelihoodPopupHtml, { className: 'custom-provenance-popup' });
          this.layers.likelihoods.push(circle);
        }
      });
    }

    // 6. Toggle Historical Sightings Layers (with Zoom Aggregation)
    this.layers.historicalSightings.forEach(m => m.remove());
    this.layers.historicalSightings = [];

    if (showHistorical) {
      const zoom = this.map.getZoom();
      if (zoom < 12) {
        // Render aggregated density contours
        const centers = [
          { lat: 37.95, lng: -123.10, radiusKm: 12, name: "Cordell Bank Historical Sector" },
          { lat: 37.75, lng: -122.95, radiusKm: 15, name: "Gulf of Farallones Historical Sector" }
        ];

        centers.forEach(c => {
          const circle = L.circle([c.lat, c.lng], {
            radius: c.radiusKm * 1000,
            color: '#8b5cf6', // Purple
            weight: 1.5,
            fillColor: '#8b5cf6',
            fillOpacity: 0.06,
            dashArray: '4, 6'
          }).addTo(this.map);

          circle.bindTooltip(`Historical Sighting Bin: <b>${c.name}</b><br><span style="font-size:9px;color:#a78bfa;">Aggregated historical whale context</span>`, { permanent: false });

          const popupHtml = `
            <div class="provenance-popup">
              <h4 style="color: #a78bfa; margin-top: 0; margin-bottom: 6px; font-size: 11px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                Historical Whale-Use Context
              </h4>
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10px; color: #e2e8f0;">
                <div><strong>Category:</strong> <span>Historical whale-use context (Aggregated Density)</span></div>
                <div><strong>Spatial Bin Center:</strong> <span>${c.name}</span></div>
                <div><strong>Data Source:</strong> <span>OBIS-SEAMAP Historical Archive</span></div>
                <div><strong>Temporal Range:</strong> <span>Aggregated Multi-Year Observations</span></div>
                <div style="margin-top: 6px; font-size: 8.5px; color: #f87171; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px; font-style: italic;">
                  Historical context only — not a live or predicted current whale detection.
                </div>
              </div>
            </div>
          `;
          circle.bindPopup(popupHtml, { className: 'custom-provenance-popup' });
          this.layers.historicalSightings.push(circle);
        });
      } else {
        // Render individual historical records
        this.mockHistoricalSightings.forEach(hs => {
          const pos = this.simToLatLng(hs.x, hs.y);
          const marker = L.circleMarker(pos, {
            radius: 5,
            color: '#a78bfa', // Muted purple
            fillColor: '#a78bfa',
            fillOpacity: 0.35,
            weight: 1.2
          }).addTo(this.map);

          marker.bindTooltip(`Historical Sighting: <b>${hs.species}</b><br>Observed: ${hs.date}<br>Source: OBIS-SEAMAP`, { permanent: false });
          
          const histPopupHtml = `
            <div class="provenance-popup">
              <h4 style="color: #a78bfa; margin-top: 0; margin-bottom: 6px; font-size: 11px; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                Historical Whale-Use Context
              </h4>
              <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10px; color: #e2e8f0;">
                <div><strong>Category:</strong> <span>Historical whale-use context (Individual Record)</span></div>
                <div><strong>Species:</strong> <span>${hs.species}</span></div>
                <div><strong>Observation Date:</strong> <span>${hs.date}</span></div>
                <div><strong>Data Source:</strong> <span>OBIS-SEAMAP Database</span></div>
                <div style="margin-top: 6px; font-size: 8.5px; color: #f87171; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px; font-style: italic;">
                  Historical archive record — not a live or predicted current whale detection.
                </div>
              </div>
            </div>
          `;
          marker.bindPopup(histPopupHtml, { className: 'custom-provenance-popup' });
          this.layers.historicalSightings.push(marker);
        });
      }
    }

    // 6b. Toggle Shipping Lanes
    this.layers.routes.forEach(lane => {
      if (showShipping) {
        if (!this.map.hasLayer(lane)) lane.addTo(this.map);
      } else {
        if (this.map.hasLayer(lane)) this.map.removeLayer(lane);
      }
    });

    // 7. Toggle NOAA Real-time Buoys Grid & SST
    // Clean up buoy markers first
    Object.keys(this.layers.buoys).forEach(id => this.layers.buoys[id].remove());
    this.layers.buoys = {};

    if (showSST && this.sim.noaaBuoys) {
      this.sim.noaaBuoys.forEach(b => {
        if (b.latitude === undefined || b.latitude === null || b.longitude === undefined || b.longitude === null) {
          return;
        }
        const pos = [b.latitude, b.longitude];
        
        const buoyTempText = (b.waterTemp !== undefined && b.waterTemp !== null) ? `${b.waterTemp.toFixed(1)}°C` : 'N/A';
        const buoyWindText = (b.windSpeed !== undefined && b.windSpeed !== null) ? `${b.windSpeed.toFixed(1)} m/s` : 'N/A';
        const buoyWaveText = (b.waveHeight !== undefined && b.waveHeight !== null) ? `${b.waveHeight.toFixed(1)} m` : 'N/A';

        const marker = L.circleMarker(pos, {
          radius: 8,
          color: '#ef4444',
          fillColor: '#0f172a',
          fillOpacity: 1,
          weight: 2
        }).addTo(this.map);
        
        marker.bindTooltip(`<b>NOAA Buoy ${b.stationId} (${b.name})</b><br>Sea Temp: ${buoyTempText}<br>Wind Speed: ${buoyWindText}<br>Wave Height: ${buoyWaveText}`, { direction: 'top' });
        
        const buoyPopupHtml = this.getProvenancePopupHtml(
          `NOAA Buoy ${b.stationId} (${b.name})`,
          "NOAA NDBC Buoy Network",
          "near-real-time",
          b.timestamp ? new Date(b.timestamp).toISOString() : new Date().toISOString(),
          "High (Sensor Observations)",
          "real",
          "Buoy Thermistor + Anemometer + Pressure Sensors"
        );
        marker.bindPopup(buoyPopupHtml, { className: 'custom-provenance-popup' });

        this.layers.buoys[b.stationId] = marker;
      });
    }

    // 8. Toggle Bathymetry Contours
    if (!this.layers.bathymetry) {
      this.layers.bathymetry = [];
      this.bathymetryLines.forEach((coords, idx) => {
        const polyline = L.polyline(coords, {
          color: '#06b6d4',
          weight: 1.5,
          dashArray: '5, 10',
          opacity: 0.4
        });
        polyline.bindTooltip(`NOAA Seafloor Contour: ${idx === 0 ? '100m' : '200m'} Depth (Static data)`, { permanent: false });
        
        const bathyPopupHtml = this.getProvenancePopupHtml(
          `Bathymetric Contour (${idx === 0 ? '100m' : '200m'} depth)`,
          "NOAA Geophysical Data Center",
          "historical/static",
          "Static Database",
          "High",
          "historical/static",
          "Multibeam Sonar bathymetry survey records"
        );
        polyline.bindPopup(bathyPopupHtml, { className: 'custom-provenance-popup' });

        this.layers.bathymetry.push(polyline);
      });
    }
    
    this.layers.bathymetry.forEach(line => {
      if (showBathymetry) {
        if (!this.map.hasLayer(line)) line.addTo(this.map);
      } else {
        if (this.map.hasLayer(line)) this.map.removeLayer(line);
      }
    });
  }

  drawFallbackSVG() {
    if (!this.canvasWrapper) return;
    
    let svg = document.getElementById('map-svg-fallback');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('id', 'map-svg-fallback');
      svg.setAttribute('style', 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 900; background: #070b13; border-radius: 12px;');
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '20');
      text.setAttribute('y', '30');
      text.setAttribute('fill', '#ef4444');
      text.setAttribute('font-family', 'monospace');
      text.setAttribute('font-size', '12px');
      text.setAttribute('font-weight', 'bold');
      text.textContent = 'SVG FALLBACK MAP ACTIVE (Leaflet Failed)';
      svg.appendChild(text);
      
      const bboxText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      bboxText.setAttribute('x', '20');
      bboxText.setAttribute('y', '50');
      bboxText.setAttribute('fill', '#94a3b8');
      bboxText.setAttribute('font-family', 'monospace');
      bboxText.setAttribute('font-size', '10px');
      bboxText.textContent = 'BBox: Lat 37.3 to 38.3 | Lon -123.5 to -121.8';
      svg.appendChild(bboxText);

      this.canvasWrapper.appendChild(svg);
    }
    
    const elements = svg.querySelectorAll('.vessel-dot, .vessel-label, .whale-dot');
    elements.forEach(c => c.remove());
    
    const minLat = 37.3;
    const maxLat = 38.3;
    const minLon = -123.5;
    const maxLon = -121.8;
    
    const rect = svg.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;
    
    const showVessels = document.getElementById('layer-ais')?.checked !== false;
    const showWhales = document.getElementById('layer-telemetry')?.checked !== false;

    if (showVessels) {
      let liveCount = 0;
      this.sim.vessels.forEach(v => {
        const latLng = this.simToLatLng(v.x, v.y);
        const lat = latLng[0];
        const lng = latLng[1];
        
        if (lat < minLat || lat > maxLat || lng < minLon || lng > maxLon) return;
        
        const pctX = (lng - minLon) / (maxLon - minLon);
        const pctY = (maxLat - lat) / (maxLat - minLat);
        
        const cx = pctX * width;
        const cy = pctY * height;
        
        const isViolating = v.inDangerZone && v.speed > this.sim.speedLimit;
        const color = isViolating ? '#ef4444' : '#3b82f6';
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'vessel-dot');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', '6');
        circle.setAttribute('fill', '#0f172a');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', '2');
        svg.appendChild(circle);
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('class', 'vessel-label');
        label.setAttribute('x', cx + 8);
        label.setAttribute('y', cy + 4);
        label.setAttribute('fill', '#e2e8f0');
        label.setAttribute('font-family', 'sans-serif');
        label.setAttribute('font-size', '9px');
        const speedText = (v.speed !== undefined && v.speed !== null) ? `${v.speed.toFixed(1)} kt` : 'N/A';
        label.textContent = `${v.name} (${speedText})`;
        svg.appendChild(label);

        if (v.id.startsWith('AIS-')) {
          liveCount++;
        }
      });

      if (window.app && window.app.ui && window.app.ui.sourceManager) {
        window.app.ui.sourceManager.sources.aisstream.renderedVesselsCount = liveCount;
      }
    }
    
    if (showWhales) {
      this.sim.whales.forEach(w => {
        const latLng = this.simToLatLng(w.x, w.y);
        const lat = latLng[0];
        const lng = latLng[1];
        
        if (lat < minLat || lat > maxLat || lng < minLon || lng > maxLon) return;
        
        const pctX = (lng - minLon) / (maxLon - minLon);
        const pctY = (maxLat - lat) / (maxLat - minLat);
        
        const cx = pctX * width;
        const cy = pctY * height;
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('class', 'whale-dot');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', '5');
        circle.setAttribute('fill', '#ec4899');
        svg.appendChild(circle);
      });
    }
  }
}
