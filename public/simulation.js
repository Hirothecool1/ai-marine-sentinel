/* ==========================================================================
   PREDICTIVE MARINE SENTINEL — SIMULATION ENGINE
   Manages vessels, whales, krill drift, geofences, and 3D risk formulas.
   ========================================================================== */

export class MarineSimulation {
  constructor() {
    this.isRunning = true;
    this.speedMultiplier = 1; // 1x, 2x, 5x, 10x
    this.time = new Date(); // Start with real current time
    this.timeStepSeconds = 1; // base update step size in simulation seconds

    // Map bounds (normalized coordinates: 0 to 1000)
    // 0,0 is top-left, 1000,1000 is bottom-right.
    // Represents a region approx 40 x 40 nautical miles off SF Bay
    this.bounds = { width: 1000, height: 1000 };
    
    // Environmental parameters (model sliders)
    this.aiSensitivity = 0.75; // 75%
    this.trophicBuffer = 1.2;  // nautical miles
    this.speedLimit = 10.0;    // knots

    // Define Shipping Corridors (SF Vessel Traffic Service routes)
    // Northern Approach, Western Approach, Southern Approach, and Main Entrance Channel
    this.routes = {
      northInbound: [
        { x: 120, y: 150 },
        { x: 350, y: 380 },
        { x: 550, y: 550 }, // Entrance Buoy
        { x: 750, y: 620 },
        { x: 920, y: 640 }  // Golden Gate Bridge
      ],
      northOutbound: [
        { x: 920, y: 620 },
        { x: 750, y: 600 },
        { x: 530, y: 530 },
        { x: 330, y: 360 },
        { x: 100, y: 130 }
      ],
      westInbound: [
        { x: 50, y: 620 },
        { x: 300, y: 610 },
        { x: 550, y: 550 },
        { x: 750, y: 620 },
        { x: 920, y: 640 }
      ],
      westOutbound: [
        { x: 920, y: 620 },
        { x: 750, y: 600 },
        { x: 550, y: 530 },
        { x: 300, y: 590 },
        { x: 50, y: 600 }
      ],
      southInbound: [
        { x: 310, y: 920 },
        { x: 450, y: 730 },
        { x: 550, y: 550 },
        { x: 750, y: 620 },
        { x: 920, y: 640 }
      ],
      southOutbound: [
        { x: 920, y: 620 },
        { x: 750, y: 600 },
        { x: 530, y: 530 },
        { x: 430, y: 710 },
        { x: 290, y: 900 }
      ]
    };

    // Hydrophone Buoy Locations (SF Hydrophone Array)
    this.hydrophones = [
      { id: "HP-01", name: "Point Reyes North", x: 180, y: 220, range: 120, lastDetection: 0, signalStrength: 0 },
      { id: "HP-02", name: "Farallon Islands Shoal", x: 380, y: 510, range: 140, lastDetection: 0, signalStrength: 0 },
      { id: "HP-03", name: "Shipping Lane Inflow", x: 520, y: 620, range: 100, lastDetection: 0, signalStrength: 0 },
      { id: "HP-04", name: "Southern Shelf Array", x: 450, y: 800, range: 130, lastDetection: 0, signalStrength: 0 }
    ];

    // Krill Density Swarms (Trophic Drivers)
    // Renders as pink/orange patches drifting slowly.
    this.krillPatches = [
      { id: "KP-1", x: 300, y: 450, z: 90, radius: 110, density: 0.95, driftDir: 1.1 }, // z is depth in meters, density in g/m3
      { id: "KP-2", x: 450, y: 680, z: 130, radius: 90, density: 0.78, driftDir: 1.2 },
      { id: "KP-3", x: 210, y: 720, z: 60, radius: 70, density: 0.52, driftDir: 1.0 }
    ];

    // Ocean Currents (Drift forces, affecting krill)
    this.currentSpeed = 0.4; // knots
    this.currentDirection = 1.1; // radians (East-Southeast)

    // Dynamic Danger Zones (DDZs)
    // Initially defined by segments along shipping lanes, active when whales/krill overlap
    this.dangerZones = [
      { id: "DDZ-01", name: "Gulf of Farallones Sector", active: false, center: { x: 340, y: 370 }, radius: 100, radiusKm: 10, riskScore: 0 },
      { id: "DDZ-02", name: "Golden Gate Approach Channel", active: false, center: { x: 740, y: 610 }, radius: 90, radiusKm: 8, riskScore: 0 },
      { id: "DDZ-03", name: "Cordell Bank Offshore Lane", active: false, center: { x: 260, y: 220 }, radius: 120, radiusKm: 12, riskScore: 0 }
    ];

    // Tagged Sentinel Whales (Ground Truth Telemetry)
    this.whales = [
      {
        id: "W-1",
        name: "Willy",
        species: "Blue Whale",
        x: 290,
        y: 430,
        vx: 0.2,
        vy: 0.1,
        depth: 0, // meters
        diveState: "SURFACE", // SURFACE, DESCENDING, BENTHIC, ASCENDING
        stateTimer: 0,
        targetDepth: 0,
        foragingUrgency: 0.1,
        vocalizing: false,
        vocalTimer: 0,
        history: [] // 2D path history
      },
      {
        id: "W-2",
        name: "Luna",
        species: "Humpback Whale",
        x: 460,
        y: 650,
        vx: -0.1,
        vy: 0.3,
        depth: 15,
        diveState: "BENTHIC",
        stateTimer: 180,
        targetDepth: 110,
        foragingUrgency: 0.85,
        vocalizing: false,
        vocalTimer: 0,
        history: []
      },
      {
        id: "W-3",
        name: "Barnaby",
        species: "Fin Whale",
        x: 410,
        y: 530,
        vx: 0.15,
        vy: -0.2,
        depth: 60,
        diveState: "DESCENDING",
        stateTimer: 45,
        targetDepth: 140,
        foragingUrgency: 0.62,
        vocalizing: true,
        vocalTimer: 10,
        history: []
      }
    ];

    // AIS Vessel list
    this.vessels = [
      {
        id: "V-1",
        name: "Pacific Titan",
        imo: "IMO 9823472",
        type: "Container Ship",
        flag: "Panama (PA)",
        length: 366, // meters
        draft: 14.5, // draft in meters (how deep it sits in water)
        routeKey: "northInbound",
        routeIndex: 0,
        x: 120,
        y: 150,
        speed: 15.2, // knots
        baseSpeed: 15.5,
        compliance: "NON-COMPLIANT", // COMPLIANT, NON-COMPLIANT, PENDING
        inDangerZone: false,
        strikeRisk: 0, // strike probability 0-100%
        history: [] // coordinate history
      },
      {
        id: "V-2",
        name: "Oceanic Clipper",
        imo: "IMO 9741088",
        type: "VLCC Crude Tanker",
        flag: "Marshall Islands (MH)",
        length: 330,
        draft: 16.2,
        routeKey: "westInbound",
        routeIndex: 0,
        x: 50,
        y: 620,
        speed: 13.8,
        baseSpeed: 14.0,
        compliance: "COMPLIANT",
        inDangerZone: false,
        strikeRisk: 0,
        history: []
      },
      {
        id: "V-3",
        name: "Nippon Maru",
        imo: "IMO 9680322",
        type: "Car Carrier",
        flag: "Japan (JP)",
        length: 200,
        draft: 8.8,
        routeKey: "southInbound",
        routeIndex: 0,
        x: 310,
        y: 920,
        speed: 16.5,
        baseSpeed: 17.0,
        compliance: "NON-COMPLIANT",
        inDangerZone: false,
        strikeRisk: 0,
        history: []
      },
      {
        id: "V-4",
        name: "Grand Voyager",
        imo: "IMO 9523094",
        type: "Container Ship",
        flag: "Singapore (SG)",
        length: 294,
        draft: 12.5,
        routeKey: "westOutbound",
        routeIndex: 0,
        x: 920,
        y: 620,
        speed: 9.8, // starts compliant
        baseSpeed: 15.0,
        compliance: "COMPLIANT",
        inDangerZone: false,
        strikeRisk: 0,
        history: []
      },
      {
        id: "V-5",
        name: "Amber Trader",
        imo: "IMO 9400277",
        type: "Bulk Carrier",
        flag: "Liberia (LR)",
        length: 225,
        draft: 11.2,
        routeKey: "northOutbound",
        routeIndex: 0,
        x: 920,
        y: 620,
        speed: 12.4,
        baseSpeed: 13.0,
        compliance: "NON-COMPLIANT",
        inDangerZone: false,
        strikeRisk: 0,
        history: []
      }
    ];

    // Speed log arrays for generating modal graphs (last 20 mins)
    this.speedHistoryLength = 20;
    this.vessels.forEach(v => {
      v.speedLog = Array(this.speedHistoryLength).fill(v.speed);
    });

    // Violations Ticketing Log (Save Willy Act Fines Issued)
    this.issuedTickets = [];
    
    // AI agent communication backlog (simulated dialogue)
    this.negotiationLogs = [];
    this.addNegotiationLog("system", "AI Marine Sentinel active. Model listening to VTS channels & WhaleMap telemetry.");

    this.historicalAISVessels = [];

    // Trigger loading of AIS data from local JSON file
    this.aisPromise = this.loadAISData();

    // Live Production mode initialization
    this.demoMode = false;
    this.complianceRate = null;
    this.rrrRate = null;
    
    // Save mock lists for demo mode
    this.mockVessels = JSON.parse(JSON.stringify(this.vessels));
    this.mockWhales = JSON.parse(JSON.stringify(this.whales));
    this.mockKrillPatches = JSON.parse(JSON.stringify(this.krillPatches));
    this.mockDangerZones = JSON.parse(JSON.stringify(this.dangerZones));

    // Clear fake data for Production Mode initially
    if (!this.demoMode) {
      this.vessels = [];
      this.whales = [];
      this.krillPatches = [];
      this.dangerZones.forEach(dz => {
        dz.active = false;
        dz.riskScore = 0;
      });
      this.issuedTickets = [];
      this.negotiationLogs = [];
      this.addNegotiationLog("system", "AI Avoidance Radar active in Live Production Mode. Fetching real API feeds...");
    }

    // Risk zone model clustering and display parameters
    this.RISK_ZONE_MIN_DISTANCE_KM = 5;
    this.RISK_ZONE_MERGE_RADIUS_KM = 8;
    this.MAX_ACTIVE_RISK_ZONES = 5;
    this.MIN_RISK_SCORE_TO_DISPLAY = 0.55;
  }

  // Helper: Find closest route and index for snapping
  findClosestRouteAndIndex(x, y) {
    let closestRouteKey = 'westInbound';
    let closestIndex = 0;
    let minDist = Infinity;
    
    Object.keys(this.routes).forEach(routeKey => {
      const route = this.routes[routeKey];
      route.forEach((pt, idx) => {
        const dist = Math.sqrt((pt.x - x)**2 + (pt.y - y)**2);
        if (dist < minDist) {
          minDist = dist;
          closestRouteKey = routeKey;
          closestIndex = idx;
        }
      });
    });
    
    return { routeKey: closestRouteKey, routeIndex: closestIndex };
  }

  // Load and parse local ais.json data (Marine Cadastre historical backup)
  async loadAISData() {
    try {
      console.log("Fetching local ais.json file for historical Marine Cadastre density...");
      const response = await fetch('./ais.json');
      const data = await response.json();
      
      const loadedVessels = [];
      
      data.forEach(item => {
        const x = ((item.longitude + 123.126) / 0.7027) * 1000;
        const y = ((38.094 - item.latitude) / 0.42857) * 1000;
        
        if (x >= 0 && x <= 1000 && y >= 0 && y <= 1000) {
          const routeInfo = this.findClosestRouteAndIndex(x, y);
          
          let type = "Container Ship";
          let length = 280;
          let draft = 12.0;
          const nameLower = item.name.toLowerCase();
          
          if (nameLower.includes("f/v") || nameLower.includes("fishing") || nameLower.includes("f v")) {
            type = "Fishing Vessel";
            length = Math.floor(35 + Math.random() * 25);
            draft = parseFloat((3.5 + Math.random() * 2.5).toFixed(1));
          } else if (nameLower.includes("tug") || nameLower.includes("barge") || nameLower.includes("support")) {
            type = "Tug & Barge";
            length = Math.floor(40 + Math.random() * 30);
            draft = parseFloat((4.0 + Math.random() * 3.0).toFixed(1));
          } else if (item.speed > 16.0) {
            type = "Container Ship";
            length = Math.floor(290 + Math.random() * 80);
            draft = parseFloat((12.5 + Math.random() * 3.5).toFixed(1));
          } else if (Math.random() < 0.3) {
            type = "VLCC Crude Tanker";
            length = Math.floor(300 + Math.random() * 40);
            draft = parseFloat((14.5 + Math.random() * 2.5).toFixed(1));
          } else if (Math.random() < 0.5) {
            type = "Bulk Carrier";
            length = Math.floor(200 + Math.random() * 50);
            draft = parseFloat((10.0 + Math.random() * 2.5).toFixed(1));
          } else {
            type = "Car Carrier";
            length = Math.floor(180 + Math.random() * 40);
            draft = parseFloat((8.5 + Math.random() * 2.0).toFixed(1));
          }
          
          const flags = [
            "United States (US)", "Panama (PA)", "Marshall Islands (MH)", 
            "Singapore (SG)", "Liberia (LR)", "Japan (JP)", 
            "United Kingdom (GB)", "Denmark (DK)", "Bahamas (BS)"
          ];
          const flag = flags[Math.floor(Math.random() * flags.length)];
          const baseSpeed = item.speed > 2.0 ? item.speed : (10.0 + Math.random() * 5.0);
          
          loadedVessels.push({
            id: `H-V-${item.id}`,
            name: `${item.name} (Historical)`,
            imo: `IMO ${item.id.substring(0, 7)}`,
            type: type,
            flag: flag,
            length: length,
            draft: draft,
            routeKey: routeInfo.routeKey,
            routeIndex: Math.min(routeInfo.routeIndex, this.routes[routeInfo.routeKey].length - 1),
            x: x,
            y: y,
            speed: item.speed > 0.1 ? item.speed : baseSpeed,
            baseSpeed: baseSpeed,
            compliance: "COMPLIANT",
            inDangerZone: false,
            strikeRisk: 0,
            history: [],
            speedLog: Array(this.speedHistoryLength).fill(item.speed > 0.1 ? item.speed : baseSpeed)
          });
        }
      });
      
      this.historicalAISVessels = loadedVessels;
      console.log(`Loaded ${this.historicalAISVessels.length} historical Marine Cadastre records.`);
      
      if (this.demoMode) {
        const shuffled = loadedVessels.sort(() => 0.5 - Math.random());
        this.vessels = shuffled.slice(0, 15).map(v => {
          v.id = v.id.replace('H-', '');
          v.name = v.name.replace(' (Historical)', '');
          return v;
        });
        this.mockVessels = JSON.parse(JSON.stringify(this.vessels));
      }
    } catch (err) {
      console.error("Error loading historical Marine Cadastre data:", err);
    }
  }

  // Set speed multiplier
  setSpeed(mult) {
    this.speedMultiplier = mult;
  }

  // Toggle running
  togglePause() {
    this.isRunning = !this.isRunning;
    return !this.isRunning;
  }

  // Core Simulation Step
  update() {
    if (this.demoMode) {
      if (!this.isRunning) return;
      const elapsedSeconds = this.timeStepSeconds * this.speedMultiplier;
      this.time.setSeconds(this.time.getSeconds() + elapsedSeconds);
      this.updateKrill(elapsedSeconds);
      this.updateWhales(elapsedSeconds);
      this.updateAcoustics(elapsedSeconds);
      this.evaluateDangerZones();
      this.updateVessels(elapsedSeconds);
    } else {
      if (this.isRunning) {
        this.time = new Date();
      }
      this.evaluateProductionRiskAndCompliance();
    }
  }

  setDemoMode(isDemo) {
    this.demoMode = isDemo;
    if (isDemo) {
      this.vessels = JSON.parse(JSON.stringify(this.mockVessels));
      this.whales = JSON.parse(JSON.stringify(this.mockWhales));
      this.krillPatches = JSON.parse(JSON.stringify(this.mockKrillPatches));
      this.dangerZones = JSON.parse(JSON.stringify(this.mockDangerZones));
      this.issuedTickets = [];
      this.negotiationLogs = [];
      this.addNegotiationLog("system", "Demo Mode activated. Using simulated whale telemetry & shipping schedules.");
    } else {
      this.vessels = [];
      this.whales = [];
      this.krillPatches = [];
      this.dangerZones.forEach(dz => {
        dz.active = false;
        dz.riskScore = 0;
      });
      this.issuedTickets = [];
      this.negotiationLogs = [];
      this.addNegotiationLog("system", "Live Production Mode activated. Connecting to live API feeds...");
    }
  }

  distanceKM(x1, y1, x2, y2) {
    const p1 = this.simToLatLng(x1, y1);
    const p2 = this.simToLatLng(x2, y2);
    const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
    const lng1 = Array.isArray(p1) ? p1[1] : p1.lng;
    const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
    const lng2 = Array.isArray(p2) ? p2[1] : p2.lng;
    return this.haversineDistance(lat1, lng1, lat2, lng2);
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return 6371 * c; // Earth radius in KM
  }

  geodesicDistance(x1, y1, x2, y2) {
    return this.distanceKM(x1, y1, x2, y2);
  }

  activateProductionDangerZones(geeData, realWhales) {
    const candidates = [];

    // 1. Add static approach channels
    const staticLanes = [
      { id: "DDZ-01", name: "Gulf of Farallones Sector", center: { x: 340, y: 370 }, radius: 100 },
      { id: "DDZ-02", name: "Golden Gate Approach Channel", center: { x: 740, y: 610 }, radius: 90 },
      { id: "DDZ-03", name: "Cordell Bank Offshore Lane", center: { x: 260, y: 220 }, radius: 120 }
    ];
    staticLanes.forEach(lane => {
      candidates.push({
        id: lane.id,
        name: lane.name,
        x: lane.center.x,
        y: lane.center.y,
        radius: lane.radius,
        isStatic: true
      });
    });

    // 2. Add GEE prey hotspots as candidates
    if (geeData && Array.isArray(geeData)) {
      geeData.forEach((pt, idx) => {
        const simPt = this.latLngToSim(pt.lat, pt.lng);
        candidates.push({
          id: pt.id || `KP-CAND-${idx}`,
          name: `Estimated Prey Hotspot ${idx + 1}`,
          x: simPt.x,
          y: simPt.y,
          radius: 100,
          isPreyHotspot: true,
          preyProbInput: pt.probability
        });
      });
    }

    // 3. Add real/user whale sightings as candidates
    if (realWhales && Array.isArray(realWhales)) {
      realWhales.forEach((w, idx) => {
        const simPt = this.latLngToSim(w.latitude || w.lat, w.longitude || w.lng);
        const isUser = w.id && String(w.id).startsWith('BQ-SIGHTING-');
        candidates.push({
          id: w.id || `W-CAND-${idx}`,
          name: isUser ? `User-Reported Whale Area` : `Active Whale Sighting Area`,
          x: simPt.x,
          y: simPt.y,
          radius: 120,
          isWhaleSighting: true,
          sightingInput: w
        });
      });
    }

    // Upwelling context from buoys
    let wtmpVal = null;
    let nutrientScore = 0.6; // default upwelling
    if (this.noaaBuoys && Array.isArray(this.noaaBuoys)) {
      const valid = this.noaaBuoys.filter(b => b.waterTemp !== null);
      if (valid.length > 0) {
        wtmpVal = valid[0].waterTemp;
        nutrientScore = Math.min(1.0, Math.max(0.1, 1.0 - (wtmpVal - 11.0) / 10.0));
      }
    }

    const seasonalModifier = 0.85; // Peak upwelling season modifier

    candidates.forEach(c => {
      const x = c.x;
      const y = c.y;

      // Prey Proxy productivity score (max probability of GEE points within 15km/300px)
      let geeProductivity = 0;
      let hasPreyProxy = false;
      if (geeData && Array.isArray(geeData)) {
        geeData.forEach(pt => {
          const simPt = this.latLngToSim(pt.lat, pt.lng);
          const dist = this.distance(simPt.x, simPt.y, x, y);
          if (dist <= 300) {
            geeProductivity = Math.max(geeProductivity, pt.probability);
            if (pt.probability > 0.6) hasPreyProxy = true;
          }
        });
      }

      // Bathymetry suitability score: higher suitability near shelf slope/contours
      const lng = (x / 1000) * 0.7027 - 123.126;
      let bathyScore = 0.4;
      if (lng < -122.95) {
        bathyScore = 0.85; // continental shelf edge / slope suitability
      } else if (lng < -122.8) {
        bathyScore = 0.6; // shelf suitability
      } else {
        bathyScore = 0.45; // inshore/coastal suitability
      }

      // Prey probability formula
      c.preyProbability = 0.45 * geeProductivity + 0.25 * nutrientScore + 0.20 * bathyScore + 0.10 * seasonalModifier;

      // Historical/User sightings confidence
      let userSightingConf = 0;
      let histSightingConf = 0;
      let hasUserWhale = false;
      let hasUserVerifiedWhale = false;
      let hasRealWhale = false;
      let triggeringWhales = [];

      if (realWhales && Array.isArray(realWhales)) {
        realWhales.forEach(w => {
          const simPt = this.latLngToSim(w.latitude || w.lat, w.longitude || w.lng);
          const dist = this.distance(simPt.x, simPt.y, x, y);
          if (dist <= 300) {
            if (w.id && String(w.id).startsWith('BQ-SIGHTING-')) {
              userSightingConf = Math.max(userSightingConf, 0.7);
              hasUserWhale = true;
              if (w.imageUrl || w.image_url || w.verificationStatus === 'image_verified') {
                hasUserVerifiedWhale = true;
              }
            } else {
              hasRealWhale = true;
            }
            triggeringWhales.push(w);
          }
        });
      }
      if (this.historicalSightings && Array.isArray(this.historicalSightings)) {
        this.historicalSightings.forEach(w => {
          const simPt = this.latLngToSim(w.latitude || w.lat, w.longitude || w.lng);
          const dist = this.distance(simPt.x, simPt.y, x, y);
          if (dist <= 300) {
            histSightingConf = Math.max(histSightingConf, 0.5);
          }
        });
      }
      const historicalOrUserConf = Math.max(userSightingConf, histSightingConf);

      // Live whale detection confidence (Acoustic/Sentinel Whales)
      let liveWhaleConf = 0;
      if (realWhales && Array.isArray(realWhales)) {
        realWhales.forEach(w => {
          const simPt = this.latLngToSim(w.latitude || w.lat, w.longitude || w.lng);
          const dist = this.distance(simPt.x, simPt.y, x, y);
          if (dist <= 200 && !(w.id && String(w.id).startsWith('BQ-SIGHTING-'))) {
            liveWhaleConf = Math.max(liveWhaleConf, 0.95);
            hasRealWhale = true;
          }
        });
      }

      // Whale likelihood formula
      c.whaleLikelihood = 0.45 * c.preyProbability + 0.25 * bathyScore + 0.20 * historicalOrUserConf + 0.10 * liveWhaleConf;

      // Vessel density: count vessels inside candidate radius * 1.5
      let vesselsInZone = 0;
      let speeds = [];
      this.vessels.forEach(v => {
        const dist = this.distance(v.x, v.y, x, y);
        if (dist <= c.radius * 1.5) {
          vesselsInZone++;
          speeds.push(v.speed);
        }
      });
      const liveVesselDensity = Math.min(1.0, vesselsInZone / 4.0);

      // Vessel speed risk
      let maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
      const vesselSpeedRisk = Math.min(1.0, Math.max(0, (maxSpeed - 10) / 10));

      // Route overlap score
      const distToStaticLanes = Math.min(
        this.distance(x, y, 340, 370),
        this.distance(x, y, 740, 610),
        this.distance(x, y, 260, 220)
      );
      const routeOverlapScore = distToStaticLanes < 150 ? 0.9 : 0.2;

      // Collision risk formula
      c.riskScoreVal = 0.45 * c.whaleLikelihood + 0.30 * liveVesselDensity + 0.20 * vesselSpeedRisk + 0.05 * routeOverlapScore;

      // If a real whale is detected in this candidate zone, boost risk to at least 75%
      if (hasRealWhale) {
        c.riskScoreVal = Math.max(c.riskScoreVal, 0.75);
      }

      c.hasRealWhale = hasRealWhale;
      c.hasUserWhale = hasUserWhale;
      c.hasUserVerifiedWhale = hasUserVerifiedWhale;
      c.hasPreyProxy = hasPreyProxy;
      c.triggeringWhales = triggeringWhales;
      c.preyScore = Math.round(c.preyProbability * 100);
      c.habitatScore = Math.round(bathyScore * 100);
      c.liveVesselDensity = liveVesselDensity;
      c.vesselSpeedRisk = vesselSpeedRisk;
      c.routeOverlapScore = routeOverlapScore;
    });

    // Filter candidates by threshold
    const activeCandidates = candidates.filter(c => {
      if (c.isStatic) return true;
      return c.riskScoreVal >= this.MIN_RISK_SCORE_TO_DISPLAY;
    });

    // Sort by risk score descending
    activeCandidates.sort((a, b) => b.riskScoreVal - a.riskScoreVal);

    const mergedZones = [];

    activeCandidates.forEach(candidate => {
      let tooClose = false;
      let closestZone = null;
      let minDistance = Infinity;

      for (const mz of mergedZones) {
        const distKM = this.distanceKM(candidate.x, candidate.y, mz.center.x, mz.center.y);
        if (distKM < minDistance) {
          minDistance = distKM;
          closestZone = mz;
        }
      }

      if (minDistance < this.RISK_ZONE_MERGE_RADIUS_KM) {
        tooClose = true;
        
        closestZone.mergedInputs.push({
          name: candidate.name,
          riskScore: Math.round(candidate.riskScoreVal * 100)
        });
        
        if (candidate.hasRealWhale) closestZone.hasRealWhale = true;
        if (candidate.hasUserWhale) closestZone.hasUserWhale = true;
        if (candidate.hasUserVerifiedWhale) closestZone.hasUserVerifiedWhale = true;
        if (candidate.hasPreyProxy) closestZone.hasPreyProxy = true;

        if (candidate.triggeringWhales && candidate.triggeringWhales.length > 0) {
          const existingIds = new Set(closestZone.triggeringWhales.map(w => w.id));
          candidate.triggeringWhales.forEach(w => {
            if (!existingIds.has(w.id)) {
              closestZone.triggeringWhales.push(w);
            }
          });
        }

        if (candidate.riskScoreVal > (closestZone.riskScore / 100)) {
          closestZone.riskScore = Math.round(candidate.riskScoreVal * 100);
        }
      }

      if (!tooClose) {
        const latLng = this.simToLatLng(candidate.x, candidate.y);
        mergedZones.push({
          id: candidate.id,
          name: candidate.name,
          center: { x: candidate.x, y: candidate.y },
          lat: Array.isArray(latLng) ? latLng[0] : latLng.lat,
          lng: Array.isArray(latLng) ? latLng[1] : latLng.lng,
          radius: candidate.radius,
          riskScore: Math.round(candidate.riskScoreVal * 100),
          active: candidate.riskScoreVal >= this.MIN_RISK_SCORE_TO_DISPLAY,
          hasRealWhale: candidate.hasRealWhale,
          hasUserWhale: candidate.hasUserWhale,
          hasUserVerifiedWhale: candidate.hasUserVerifiedWhale,
          hasPreyProxy: candidate.hasPreyProxy,
          triggeringWhales: candidate.triggeringWhales || [],
          preyProbability: candidate.preyProbability,
          whaleLikelihood: candidate.whaleLikelihood,
          liveVesselDensity: candidate.liveVesselDensity,
          vesselSpeedRisk: candidate.vesselSpeedRisk,
          routeOverlapScore: candidate.routeOverlapScore,
          preyScore: candidate.preyScore,
          habitatScore: candidate.habitatScore,
          mergedInputs: []
        });
      }
    });

    const activeZones = mergedZones.filter(z => z.active);
    const inactiveZones = mergedZones.filter(z => !z.active);

    const finalActiveZones = activeZones.slice(0, this.MAX_ACTIVE_RISK_ZONES);
    activeZones.slice(this.MAX_ACTIVE_RISK_ZONES).forEach(z => {
      z.active = false;
      inactiveZones.push(z);
    });

    const finalDangerZones = [...finalActiveZones];

    staticLanes.forEach(lane => {
      const alreadyIncluded = finalDangerZones.some(z => z.id === lane.id);
      if (!alreadyIncluded) {
        const matched = inactiveZones.find(z => z.id === lane.id);
        if (matched) {
          finalDangerZones.push(matched);
        } else {
          const latLng = this.simToLatLng(lane.center.x, lane.center.y);
          finalDangerZones.push({
            id: lane.id,
            name: lane.name,
            center: { x: lane.center.x, y: lane.center.y },
            lat: Array.isArray(latLng) ? latLng[0] : latLng.lat,
            lng: Array.isArray(latLng) ? latLng[1] : latLng.lng,
            radius: lane.radius,
            riskScore: 0,
            active: false,
            hasRealWhale: false,
            hasUserWhale: false,
            hasUserVerifiedWhale: false,
            hasPreyProxy: false,
            triggeringWhales: [],
            preyProbability: 0,
            whaleLikelihood: 0,
            liveVesselDensity: 0,
            vesselSpeedRisk: 0,
            routeOverlapScore: 0,
            preyScore: 0,
            habitatScore: 0,
            mergedInputs: []
          });
        }
      }
    });

    inactiveZones.forEach(z => {
      if (!z.id.startsWith('DDZ-') && finalDangerZones.length < 8) {
        finalDangerZones.push(z);
      }
    });

    this.dangerZones = finalDangerZones;
  }

  setGEEPreyHotspots(data) {
    this.geePreyHotspots = data || [];
    if (!this.demoMode) {
      this.krillPatches = this.geePreyHotspots.map((pt, idx) => {
        const simPt = this.latLngToSim(pt.lat, pt.lng);
        return {
          id: pt.id || `GEE-KP-${idx}`,
          x: simPt.x,
          y: simPt.y,
          z: 80,
          radius: 100,
          density: pt.probability,
          source: pt.source
        };
      });
      // this.activateProductionDangerZones(this.geePreyHotspots, this.whales);
    }
  }

  setRealWhaleSightings(liveSightings, obisSightings) {
    this.realWhales = liveSightings || [];
    this.historicalSightings = obisSightings || [];
    
    if (!this.demoMode) {
      this.whales = this.realWhales.map((w, idx) => {
        const simPt = this.latLngToSim(w.latitude || w.lat, w.longitude || w.lng);
        return {
          id: w.id || `REAL-W-${idx}`,
          name: w.name || `Whale Sighting`,
          species: w.species || 'Humpback Whale',
          x: simPt.x,
          y: simPt.y,
          vx: 0,
          vy: 0,
          depth: w.depth || 0,
          diveState: 'SURFACE',
          stateTimer: 0,
          targetDepth: 0,
          foragingUrgency: w.confidence || 0.8,
          vocalizing: false,
          vocalTimer: 0,
          history: [],
          imageUrl: w.imageUrl || null
        };
      });
      // this.activateProductionDangerZones(this.geePreyHotspots, this.realWhales);
    }
  }

  evaluateProductionRiskAndCompliance() {
    let complianceSum = 0;
    
    this.vessels.forEach(v => {
      let insideZone = false;
      let activeDangerZone = null;

      this.dangerZones.forEach(dz => {
        if (dz.active) {
          const dist = (v.latitude && v.longitude && dz.lat && dz.lng) ? 
            this.haversineDistance(v.latitude, v.longitude, dz.lat, dz.lng) : 
            (this.distance(v.x, v.y, dz.x, dz.y) / 20.0);
          if (dist <= dz.radiusKm) {
            insideZone = true;
            activeDangerZone = dz;
          }
        }
      });

      v.inDangerZone = insideZone;
      v.activeDangerZoneId = activeDangerZone ? activeDangerZone.id : null;
      v.activeDangerZoneName = activeDangerZone ? activeDangerZone.name : null;

      const isFallback = v.sourceType === 'historical' || v.sourceType === 'last-known' || v.id.startsWith('HIST-') || v.id.startsWith('LK-');
      const hasValidSpeed = v.speed !== null && v.speed !== undefined && !isNaN(v.speed);

      if (insideZone) {
        if (isFallback) {
          v.compliance = "PENDING";
        } else if (!hasValidSpeed) {
          v.compliance = "UNKNOWN";
        } else {
          v.compliance = v.speed > this.speedLimit ? "NON-COMPLIANT" : "COMPLIANT";
          if (v.speed > this.speedLimit + 0.5) {
            this.generateTicket(v, activeDangerZone);
          }
        }
      } else {
        v.compliance = isFallback ? "PENDING" : (hasValidSpeed ? "COMPLIANT" : "UNKNOWN");
      }

      if (!v.history) v.history = [];
      v.history.push({ x: v.x, y: v.y });
      if (v.history.length > 30) v.history.shift();

      if (!v.speedLog) v.speedLog = Array(this.speedHistoryLength).fill(v.speed || 0);
      if (hasValidSpeed && Math.random() < 0.15) {
        v.speedLog.push(v.speed);
        if (v.speedLog.length > this.speedHistoryLength) v.speedLog.shift();
      }

      let maxRisk = 0;
      if (insideZone && activeDangerZone && hasValidSpeed) {
        const dist = (v.latitude && v.longitude && activeDangerZone.lat && activeDangerZone.lng) ?
          this.haversineDistance(v.latitude, v.longitude, activeDangerZone.lat, activeDangerZone.lng) :
          (this.distance(v.x, v.y, activeDangerZone.x, activeDangerZone.y) / 20.0);
        const proximityScore = Math.max(0, 1.0 - (dist / activeDangerZone.radiusKm));
        const verticalOverlap = 0.70;
        const speedFactor = Math.pow(v.speed / 10.0, 2.5);
        maxRisk = Math.min(99, Math.round(proximityScore * verticalOverlap * speedFactor * 100));
      }
      v.strikeRisk = maxRisk;
    });

    // Compute compliance rate based on eligible vessels inside active risk zones
    const liveVesselsInActiveZones = this.vessels.filter(v => {
      const isFallback = v.sourceType === 'historical' || v.sourceType === 'last-known' || v.id.startsWith('HIST-') || v.id.startsWith('LK-');
      const hasValidSpeed = v.speed !== undefined && v.speed !== null && !isNaN(v.speed);
      return !isFallback && v.inDangerZone && hasValidSpeed;
    });

    const compliantVesselsInActiveZones = liveVesselsInActiveZones.filter(v => v.compliance === "COMPLIANT");

    this.eligibleVesselCount = liveVesselsInActiveZones.length;
    this.complianceNumerator = compliantVesselsInActiveZones.length;
    this.complianceDenominator = liveVesselsInActiveZones.length;

    if (liveVesselsInActiveZones.length > 0) {
      this.complianceRate = Math.round((compliantVesselsInActiveZones.length / liveVesselsInActiveZones.length) * 100);
    } else {
      this.complianceRate = null; // Represents N/A
    }

    this.rrrRate = null;
  }

  // Update Trophic Krill Swarm Drift
  updateKrill(elapsedSeconds) {
    // Current vector components in screen pixels per second (approx scale)
    const driftX = Math.cos(this.currentDirection) * this.currentSpeed * 0.05;
    const driftY = Math.sin(this.currentDirection) * this.currentSpeed * 0.05;

    this.krillPatches.forEach(kp => {
      // Swarm floats slowly in the current
      kp.x += driftX * elapsedSeconds;
      kp.y += driftY * elapsedSeconds;

      // Wrap-around bounds checking for continuous simulation
      if (kp.x > 1000 + kp.radius) kp.x = -kp.radius;
      if (kp.y > 1000 + kp.radius) kp.y = -kp.radius;
      if (kp.x < -kp.radius) kp.x = 1000 + kp.radius;
      if (kp.y < -kp.radius) kp.y = 1000 + kp.radius;
    });
  }

  // Update Whales Diving Profiles
  updateWhales(elapsedSeconds) {
    this.whales.forEach(whale => {
      // A. Path movement (slow foraging swim)
      whale.x += whale.vx * 0.03 * elapsedSeconds;
      whale.y += whale.vy * 0.03 * elapsedSeconds;

      // Keep within map boundaries, steer back if out of bounds
      if (whale.x < 100 || whale.x > 900) whale.vx = -whale.vx;
      if (whale.y < 100 || whale.y > 900) whale.vy = -whale.vy;

      // Record 2D position history for rendering tracks
      whale.history.push({ x: whale.x, y: whale.y });
      if (whale.history.length > 50) whale.history.shift();

      // B. Dive Profile Loop (SURFACE -> DESCENDING -> BENTHIC -> ASCENDING)
      whale.stateTimer += elapsedSeconds;

      switch (whale.diveState) {
        case "SURFACE":
          whale.depth = 0;
          whale.vocalizing = (whale.vocalTimer <= 0 && Math.random() < 0.05);
          if (whale.vocalizing) whale.vocalTimer = 15; // vocalizes for 15s

          if (whale.stateTimer > 120) { // 2 minutes at surface
            whale.diveState = "DESCENDING";
            whale.stateTimer = 0;
            // Target benthic depth depends on local bathymetry / krill layers
            const nearestKrill = this.findNearestKrill(whale.x, whale.y);
            whale.targetDepth = nearestKrill ? nearestKrill.z + (Math.random() * 20 - 10) : 100 + Math.random() * 80;
          }
          break;

        case "DESCENDING":
          whale.vocalizing = false;
          // Dive rate approx 0.8 meters/second
          whale.depth += 0.8 * elapsedSeconds;
          if (whale.depth >= whale.targetDepth) {
            whale.depth = whale.targetDepth;
            whale.diveState = "BENTHIC";
            whale.stateTimer = 0;
          }
          break;

        case "BENTHIC":
          // Feeding on krill swarms at depth.
          whale.depth = whale.targetDepth + Math.sin(whale.stateTimer * 0.05) * 5; // slight bobbing
          
          // Vocal pings are highly common while social feeding
          if (whale.vocalTimer <= 0 && Math.random() < 0.08) {
            whale.vocalizing = true;
            whale.vocalTimer = 8;
          }

          if (whale.stateTimer > 480) { // 8 minutes feeding
            whale.diveState = "ASCENDING";
            whale.stateTimer = 0;
          }
          break;

        case "ASCENDING":
          whale.vocalizing = false;
          // Ascent rate approx 0.6 m/s
          whale.depth -= 0.6 * elapsedSeconds;
          if (whale.depth <= 0) {
            whale.depth = 0;
            whale.diveState = "SURFACE";
            whale.stateTimer = 0;
          }
          break;
      }

      // Decrement vocal timer
      if (whale.vocalTimer > 0) {
        whale.vocalTimer -= elapsedSeconds;
        if (whale.vocalTimer <= 0) whale.vocalizing = false;
      }

      // C. Calculate Foraging Urgency Index (Distracted Feeding)
      // High if feeding in depth zone matching high krill density, low if surfacing.
      if (whale.diveState === "BENTHIC") {
        const nearestKrill = this.findNearestKrill(whale.x, whale.y);
        const dist = nearestKrill ? this.distance(whale.x, whale.y, nearestKrill.x, nearestKrill.y) : 999;
        if (dist < nearestKrill?.radius) {
          whale.foragingUrgency = Math.min(0.98, 0.7 + (nearestKrill.density * 0.2));
        } else {
          whale.foragingUrgency = 0.5;
        }
      } else if (whale.diveState === "SURFACE") {
        whale.foragingUrgency = 0.15; // alert at surface
      } else {
        whale.foragingUrgency = 0.45; // transitioning
      }
    });
  }

  // Update acoustic hydrophones (check if whales are vocalizing within radius)
  updateAcoustics(elapsedSeconds) {
    this.hydrophones.forEach(hp => {
      let detected = false;
      let maxStrength = 0;

      this.whales.forEach(whale => {
        if (whale.vocalizing) {
          const dist = this.distance(hp.x, hp.y, whale.x, whale.y);
          if (dist < hp.range) {
            detected = true;
            // Strength inversely proportional to distance squared
            const strength = Math.round((1 - (dist / hp.range)) * 100);
            if (strength > maxStrength) maxStrength = strength;
          }
        }
      });

      if (detected) {
        hp.lastDetection = 0; // seconds ago
        hp.signalStrength = maxStrength;
      } else {
        hp.lastDetection += elapsedSeconds;
        // Fade signal strength slowly
        hp.signalStrength = Math.max(0, hp.signalStrength - 0.2 * elapsedSeconds);
      }
    });
  }

  // Weighted Heuristic Risk Model: Predict Danger Zones based on fused variables
  evaluateDangerZones() {
    // We compute whale presence probability density across the zones
    this.dangerZones.forEach(dz => {
      let factorWhales = 0; // live sentinel telemetry
      let factorAcoustic = 0; // hydrophone vocalizations
      let factorTrophic = 0; // krill overlays
      let factorEco = 0; // Oceanographic front factors (simulated proxy)

      // A. Telemetry factor (distance to whales, weighted by depth: surfacing/ascending is riskier)
      this.whales.forEach(w => {
        const dist = this.distance(dz.center.x, dz.center.y, w.x, w.y);
        if (dist < dz.radius * 2) {
          // Surfacing whales have highest strike risk.
          const depthRiskModifier = w.depth < 20 ? 1.0 : (w.depth < 60 ? 0.6 : 0.2);
          factorWhales += (1 - (dist / (dz.radius * 2))) * depthRiskModifier;
        }
      });

      // B. Acoustic factor
      this.hydrophones.forEach(hp => {
        const dist = this.distance(dz.center.x, dz.center.y, hp.x, hp.y);
        if (dist < dz.radius * 1.5 && hp.signalStrength > 0) {
          factorAcoustic += (hp.signalStrength / 100) * (1 - (dist / (dz.radius * 1.5)));
        }
      });

      // C. Trophic (Krill) factor (including drift predictions with Trophic Buffer)
      this.krillPatches.forEach(kp => {
        // Project krill location forward by drift margin (trophic buffer value in NM/pixels)
        const bufferPixels = this.trophicBuffer * 25; // 25 pixels per NM approx
        const projX = kp.x + Math.cos(this.currentDirection) * bufferPixels;
        const projY = kp.y + Math.sin(this.currentDirection) * bufferPixels;

        const dist = this.distance(dz.center.x, dz.center.y, projX, projY);
        if (dist < (dz.radius + kp.radius)) {
          factorTrophic += (1 - (dist / (dz.radius + kp.radius))) * kp.density;
        }
      });

      // D. Combine variables into unified Risk score
      // Rule-based decision-support formula combines layers.
      const fusedScore = (factorWhales * 0.45) + (factorAcoustic * 0.20) + (factorTrophic * 0.35);
      
      // Calculate normalized Risk Score (0-100)
      dz.riskScore = Math.min(100, Math.round(fusedScore * 100));

      // E. Danger Zone Activation
      // Activated if risk score exceeds sensitivity threshold (inverted: sensitivity 75% -> triggers at score 25)
      const triggerThreshold = (100 - (this.aiSensitivity * 100));
      const wasActive = dz.active;
      dz.active = dz.riskScore >= triggerThreshold;

      // Broadcast event on change
      if (dz.active && !wasActive) {
        this.addNegotiationLog("system", `WHALE ALERT ZONE ACTIVATED: ${dz.name} geofence broadcasted via AIS. Safe speed limit set to ${this.speedLimit} knots.`);
        
        // Simulating immediate contact with incoming ships
        this.vessels.forEach(v => {
          if (this.distance(v.x, v.y, dz.center.x, dz.center.y) < dz.radius * 1.8) {
            this.triggerAgentNegotiation(v, dz);
          }
        });
      } else if (!dz.active && wasActive) {
        this.addNegotiationLog("system", `WHALE ALERT ZONE DEACTIVATED: ${dz.name} cleared. Standard speed profiles restored.`);
      }
    });
  }

  // Update vessel positions along routes, monitor speed limits, calculate 3D strike risk
  updateVessels(elapsedSeconds) {
    let complianceSum = 0;

    this.vessels.forEach(v => {
      // A. Path Progression
      const currentRoute = this.routes[v.routeKey];
      if (!currentRoute) return;

      const targetPt = currentRoute[v.routeIndex];
      const distToTarget = this.distance(v.x, v.y, targetPt.x, targetPt.y);

      // Speed in knots translated to screen pixels/sec: 1 knot ≈ 0.12 pixels/sec
      const velocityPixelsSec = v.speed * 0.12;
      const stepDist = velocityPixelsSec * elapsedSeconds;

      if (distToTarget <= stepDist) {
        // Arrived at waypoint, advance to next
        v.x = targetPt.x;
        v.y = targetPt.y;
        v.routeIndex++;

        // If route completed, recycle vessel to start to keep simulation running infinitely
        if (v.routeIndex >= currentRoute.length) {
          v.routeIndex = 0;
          const startPt = currentRoute[0];
          v.x = startPt.x;
          v.y = startPt.y;
          v.speed = v.baseSpeed;
          v.compliance = "PENDING";
          // Reset speed logs
          v.speedLog = Array(this.speedHistoryLength).fill(v.speed);
        }
      } else {
        // Move towards target waypoint
        const angle = Math.atan2(targetPt.y - v.y, targetPt.x - v.x);
        v.x += Math.cos(angle) * stepDist;
        v.y += Math.sin(angle) * stepDist;
      }

      // Record position history
      v.history.push({ x: v.x, y: v.y });
      if (v.history.length > 30) v.history.shift();

      // B. Geofenced Danger Zone Checking
      let insideZone = false;
      let activeDangerZone = null;

      this.dangerZones.forEach(dz => {
        if (dz.active) {
          const dist = this.distance(v.x, v.y, dz.center.x, dz.center.y);
          if (dist < dz.radius) {
            insideZone = true;
            activeDangerZone = dz;
          }
        }
      });

      v.inDangerZone = insideZone;
      v.activeDangerZoneId = activeDangerZone ? activeDangerZone.id : null;
      v.activeDangerZoneName = activeDangerZone ? activeDangerZone.name : null;

      // C. Speed Compliance Logic
      if (insideZone) {
        // If ship is programmed to be compliant, it slows down to target speed threshold
        if (v.id === "V-2" || v.id === "V-4") {
          // Compliant vessel slows down inside the zone
          const target = this.speedLimit - 0.2;
          if (v.speed > target) {
            v.speed = Math.max(target, v.speed - 0.2 * elapsedSeconds); // decelerates
          }
          v.compliance = "COMPLIANT";
        } else {
          // Non-compliant vessel ignores geofence speed limit
          v.speed = v.baseSpeed + (Math.sin(this.time.getSeconds() * 0.05) * 0.1); // remains fast
          v.compliance = "NON-COMPLIANT";
          
          // Generate speed violation tickets automatically
          if (v.speed > this.speedLimit + 0.5) {
            this.generateTicket(v, activeDangerZone);
          }
        }
      } else {
        // Normal speed restoring outside danger zones
        if (v.speed < v.baseSpeed) {
          v.speed = Math.min(v.baseSpeed, v.speed + 0.15 * elapsedSeconds);
        }
        v.compliance = "COMPLIANT"; // compliant outside zone by default
      }

      // Append to speed log for ticketing graph updates (periodic update)
      if (Math.random() < 0.15) {
        v.speedLog.push(v.speed);
        if (v.speedLog.length > this.speedHistoryLength) v.speedLog.shift();
      }

      // D. 3D Strike Risk Calculation (Vertical Strike Probability)
      // Strike risk combines: 
      // 1) 2D horizontal distance to sentinel whales.
      // 2) 3D vertical overlap: Does ship draft (e.g. 14.5m) intersect whale depth (e.g. 0-25m)?
      // 3) Speed factor: Risk of mortality scales exponentially with speed (10 kts is critical threshold).
      let maxRisk = 0;
      this.whales.forEach(whale => {
        const dist2D = this.distance(v.x, v.y, whale.x, whale.y);
        
        // Check within danger radius (e.g., 80 pixels)
        if (dist2D < 80) {
          // 1. Horizontal proximity score (1 = right on top, 0 = far away)
          const proximityScore = (1 - (dist2D / 80));

          // 2. Vertical overlap score
          // Vessel keel sits at z = -draft. Whales swim between 0 and 200m.
          // Strike danger is highest when whale is near surface (0 to draft + 5m buffer)
          const depthBuffer = v.draft + 5; // e.g. 15m + 5m = 20m
          let verticalOverlap = 0;
          if (whale.depth < depthBuffer) {
            // High risk at surface/shallow water
            verticalOverlap = 1.0 - (whale.depth / depthBuffer);
          } else {
            // Whale is deep under the keel, risk drops significantly
            verticalOverlap = 0.05;
          }

          // 3. Speed lethality probability (Save Willy Act rationale)
          // RRR (Relative Risk Reduction) matches speed limits.
          // At 10 knots, mortality probability is around 20-30%. At 15 knots, it climbs to 80-90%.
          const speedFactor = Math.pow(v.speed / 10, 2.5); // exponential risk increase

          // 4. Combine into final percentage
          const strikeProb = Math.min(99, Math.round(proximityScore * verticalOverlap * speedFactor * 100));
          if (strikeProb > maxRisk) maxRisk = strikeProb;
        }
      });

      v.strikeRisk = maxRisk;
    });

    // Compute compliance rate based on eligible vessels inside active risk zones
    const liveVesselsInActiveZones = this.vessels.filter(v => {
      const isFallback = v.sourceType === 'historical' || v.sourceType === 'last-known' || v.id.startsWith('HIST-') || v.id.startsWith('LK-');
      const hasValidSpeed = v.speed !== undefined && v.speed !== null && !isNaN(v.speed);
      return !isFallback && v.inDangerZone && hasValidSpeed;
    });

    const compliantVesselsInActiveZones = liveVesselsInActiveZones.filter(v => v.compliance === "COMPLIANT");

    this.eligibleVesselCount = liveVesselsInActiveZones.length;
    this.complianceNumerator = compliantVesselsInActiveZones.length;
    this.complianceDenominator = liveVesselsInActiveZones.length;

    if (liveVesselsInActiveZones.length > 0) {
      this.complianceRate = Math.round((compliantVesselsInActiveZones.length / liveVesselsInActiveZones.length) * 100);
    } else {
      this.complianceRate = null; // Represents N/A
    }

    this.rrrRate = null;
  }

  // Auto-generate USCG Civil citation tickets for speeding vessels
  generateTicket(vessel, dangerZone) {
    if (!dangerZone) return;

    // Check if there is already an existing ticket for this vessel in this danger zone!
    const existingTicket = this.issuedTickets.find(t => t.vesselId === vessel.id && t.zoneId === dangerZone.id);
    if (existingTicket) {
      // Update the existing ticket instead of creating a duplicate!
      existingTicket.timestamp = new Date(this.time);
      existingTicket.speed = vessel.speed.toFixed(1);
      existingTicket.coordinates = `${this.simToLatLng(vessel.x, vessel.y)[0].toFixed(4)}° N, ${Math.abs(this.simToLatLng(vessel.x, vessel.y)[1]).toFixed(4)}° W`;
      existingTicket.sourceName = vessel.sourceName || 'AISstream.io';
      
      const speedExcess = vessel.speed - this.speedLimit;
      const enableFine = this.enableEstimatedFineCalculation === true;
      const finePerViolation = this.estimatedFinePerViolation || 500;
      const baseFine = enableFine ? (finePerViolation + (speedExcess * 200)) : 0;
      const densityMultiplier = 1.0 + (this.whales.reduce((acc, w) => {
        const dist = this.distance(vessel.x, vessel.y, w.x, w.y);
        return acc + (dist < 150 ? (1 - (dist / 150)) * w.foragingUrgency : 0);
      }, 0) * 0.5);
      existingTicket.fine = enableFine ? Math.round(baseFine * densityMultiplier) : 0;
      existingTicket.riskFactor = `+${Math.round(speedExcess * 35)}% Lethality Increase`;
      existingTicket.krillOverlap = `Prey-habitat suitability proxy index: ${(dangerZone.preyScore / 100).toFixed(2)}`;
      existingTicket.speedLogSnap = [...vessel.speedLog];
      return;
    }

    // Throttle ticket generation: only issue one ticket every 60 simulation seconds per vessel
    const lastTicket = this.issuedTickets.find(t => t.vesselId === vessel.id);
    if (lastTicket) {
      const secDiff = (this.time.getTime() - lastTicket.timestamp.getTime()) / 1000;
      if (secDiff < 60) return; // wait at least 60 seconds
    }

    const ticketId = `WARN-2026-${Math.floor(1000 + Math.random() * 9000)}-${vessel.id}`;
    
    // Calculate fine conditionally based on configuration
    const enableFine = this.enableEstimatedFineCalculation === true;
    const finePerViolation = this.estimatedFinePerViolation || 500;
    const speedExcess = vessel.speed - this.speedLimit;
    const baseFine = enableFine ? (finePerViolation + (speedExcess * 200)) : 0;
    const densityMultiplier = 1.0 + (this.whales.reduce((acc, w) => {
      const dist = this.distance(vessel.x, vessel.y, w.x, w.y);
      return acc + (dist < 150 ? (1 - (dist / 150)) * w.foragingUrgency : 0);
    }, 0) * 0.5);

    const finalFine = enableFine ? Math.round(baseFine * densityMultiplier) : 0;

    const ticket = {
      id: ticketId,
      timestamp: new Date(this.time),
      vesselId: vessel.id,
      vesselName: vessel.name,
      vesselImo: vessel.imo,
      vesselType: vessel.type,
      vesselFlag: vessel.flag,
      speed: vessel.speed.toFixed(1),
      mandatedSpeed: this.speedLimit.toFixed(1),
      fine: finalFine,
      coordinates: `${this.simToLatLng(vessel.x, vessel.y)[0].toFixed(4)}° N, ${Math.abs(this.simToLatLng(vessel.x, vessel.y)[1]).toFixed(4)}° W`,
      zoneId: dangerZone.id,
      zoneName: dangerZone.name,
      sourceName: vessel.sourceName || 'AISstream.io',
      riskFactor: `+${Math.round(speedExcess * 35)}% Lethality Increase`,
      krillOverlap: `Prey-habitat suitability proxy index: ${(dangerZone.preyScore / 100).toFixed(2)}`,
      speedLogSnap: [...vessel.speedLog] // Snapshot of speed log for chart rendering
    };

    this.issuedTickets.unshift(ticket); // add to top of stack
    if (this.issuedTickets.length > 50) this.issuedTickets.pop();

    // POST calculation details to backend for logging/reproducibility
    fetch('/api/log-calculation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'warning_ticket',
        timestamp: new Date().toISOString(),
        inputs: {
          vesselSpeed: vessel.speed,
          vesselDraft: vessel.draft,
          dangerZoneId: dangerZone.id,
          dangerZoneName: dangerZone.name
        },
        weights: {
          vesselDensityWeight: 0.30,
          vesselSpeedWeight: 0.20,
          routeOverlapWeight: 0.05,
          whaleLikelihoodWeight: 0.45
        },
        indices: {
          strikeRiskIndex: vessel.strikeRisk / 100,
          dangerZoneRiskIndex: dangerZone.riskScore / 100,
          preyIndex: dangerZone.preyScore / 100,
          habitatIndex: dangerZone.habitatScore / 100
        },
        provider: 'Weighted Heuristic Risk Model',
        errorStates: {
          geeStatus: 'credentials_required (GCP Earth Engine API disabled)'
        },
        confidenceClassifications: {
          whaleConfidence: 'Medium (Historical Archive)'
        }
      })
    }).catch(e => console.warn('Failed to post reproducible ticket log:', e));

    const logMsg = this.enforcementMode 
      ? `CIVIL PENALTY ISSUED: ${vessel.name} logged at ${ticket.speed} knots in geofence ${dangerZone.name}. Penalty generated: $${finalFine.toLocaleString()}.`
      : `POTENTIAL VIOLATION FLAG: ${vessel.name} logged at ${ticket.speed} knots in geofence ${dangerZone.name}. Flagged for review.`;
    this.addNegotiationLog("system", logMsg);
    
    // Trigger audio ping or system dispatch simulation
    if (this.onViolationIssued) {
      this.onViolationIssued(ticket);
    }
  }

  // Simulated AI course negotiation with vessels
  triggerAgentNegotiation(vessel, zone) {
    // Only launch negotiation for non-compliant/pending vessels to persuade them
    if (vessel.compliance === "COMPLIANT" && Math.random() > 0.3) return;

    const timeStr = this.getFormattedTime();
    const chats = [
      {
        sender: "sentinel",
        text: `Vessel Traffic alert to ${vessel.name}. Predictive models forecast high concentrations of foraging Blue Whales overlapping your shipping corridor in ${zone.name}. Please decelerate to ${this.speedLimit} knots.`
      },
      {
        sender: "vessel",
        text: `${vessel.name} Bridge: VTS received. We are currently trailing shipping schedules by 40 minutes. Checking local spot conditions.`
      },
      {
        sender: "sentinel",
        text: `Sentinel-AI Node: Telemetry confirms tag ID Willy (Blue Whale) is currently benthic feeding at depth 90m directly under your current approach path. Ascent profile imminent. Slowing to 10 knots reduces lethal strike risk by 85%.`
      }
    ];

    // If vessel is programmed to comply eventually, append a compliant message, else defiant
    if (vessel.id === "V-2" || vessel.id === "V-4") {
      chats.push({
        sender: "vessel",
        text: `Acknowledged Sentinel-AI. Adjusting RPM. Commencing speed reduction to 10 knots. Out.`
      });
    } else {
      chats.push({
        sender: "vessel",
        text: `Understood, VTS. Speed reduction noted. We will maintain standard course speed of ${vessel.baseSpeed} knots due to cargo draft stabilization requirements. Understood risk advisory notice.`
      });
    }

    // Push dialogs to logs sequentially
    chats.forEach((c, idx) => {
      setTimeout(() => {
        this.addNegotiationLog(c.sender, c.text, new Date(this.time.getTime() + (idx * 2000)));
      }, idx * 1500); // space them out visually in real-time
    });
  }

  // Add dialog logging
  addNegotiationLog(sender, text, timestamp = null) {
    const logTime = timestamp || new Date(this.time);
    this.negotiationLogs.unshift({
      id: Math.random().toString(36).substr(2, 9),
      sender,
      text,
      time: logTime
    });

    if (this.negotiationLogs.length > 50) this.negotiationLogs.pop();
    
    if (this.onNegotiationUpdated) {
      this.onNegotiationUpdated();
    }
  }

  // Helper: Distance calculation
  distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

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

  // Helper: Find nearest krill swarm
  findNearestKrill(x, y) {
    let nearest = null;
    let minDist = 9999;
    this.krillPatches.forEach(kp => {
      const d = this.distance(x, y, kp.x, kp.y);
      if (d < minDist) {
        minDist = d;
        nearest = kp;
      }
    });
    return nearest;
  }

  // Helper: formatted time
  getFormattedTime() {
    return this.time.toTimeString().split(' ')[0];
  }
  
  getFormattedDate() {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    return `${months[this.time.getMonth()]} ${this.time.getDate()}, ${this.time.getFullYear()}`;
  }
}
