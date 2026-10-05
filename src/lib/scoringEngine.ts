import crypto from 'crypto';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface InputStates {
  geeAvailable: boolean;
  buoyAvailable: boolean;
  bathyAvailable: boolean;
  sightingsAvailable: boolean;
  acousticsAvailable: boolean;
  aisAvailable: boolean;
}

export interface ModelWeights {
  original: Record<string, number>;
  effective: Record<string, number>;
  completeness: number;
}

export interface CandidateZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  isStatic: boolean;
  
  // Normalized Inputs
  geeInput: number | null;
  buoyInput: number | null;
  bathyInput: number | null;
  seasonalInput: number;
  
  // Prey Suitability (P)
  preyProbability: number | null;
  preyWeights: ModelWeights;
  
  // Whale Likelihood (W)
  habitatInput: number | null;
  sightingInput: number | null;
  acousticInput: number | null;
  whaleLikelihood: number | null;
  whaleWeights: ModelWeights;
  
  // Collision Risk Inputs (R)
  vesselDensityInput: number | null;
  vesselSpeedRiskInput: number | null;
  routeOverlapInput: number | null;
  collisionRisk: number | null;
  collisionWeights: ModelWeights;
  
  // Final state
  riskScore: number | null; // integer percentage [0, 100]
  active: boolean;
  hasRealWhale: boolean;
  triggeringWhales: any[];
  eligibleVesselCount: number;
  complianceNumerator: number;
  complianceDenominator: number;
  complianceRate: number | null;
  safeSpeedKts: number;
  insufficientData: boolean;

  // Scientific Audit & Integrity Fields
  timestamp: string;
  completeness: number;
  availableSources: string[];
  unavailableSources: string[];
  vesselCount: number;
  speedRisk: number | null;
  routeOverlap: number | null;
  crossedReason: string;
  isEcologicalHotspot: boolean;
}

// 1. Geodesic distance calculation via Haversine formula
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 2. Renormalize weights helper
function renormalize(weights: Record<string, number>, available: Record<string, boolean>): ModelWeights {
  const original = { ...weights };
  const effective: Record<string, number> = {};
  
  let totalWeight = 0;
  let availableWeight = 0;
  
  for (const key in weights) {
    totalWeight += weights[key];
    if (available[key]) {
      availableWeight += weights[key];
    }
  }
  
  const completeness = totalWeight > 0 ? availableWeight / totalWeight : 0;
  
  if (completeness >= 0.50) {
    for (const key in weights) {
      if (available[key]) {
        effective[key] = Number((weights[key] / availableWeight).toFixed(4));
      } else {
        effective[key] = 0;
      }
    }
  } else {
    for (const key in weights) {
      effective[key] = 0;
    }
  }
  
  return { original, effective, completeness };
}

// 3. Static Shipping Lane Definitions
export const SHIPPING_LANES = [
  { id: "DDZ-01", name: "Gulf of Farallones Sector", lat: 37.80, lng: -122.95, radiusKm: 10 },
  { id: "DDZ-02", name: "Golden Gate Approach Channel", lat: 37.82, lng: -122.55, radiusKm: 8 },
  { id: "DDZ-03", name: "Cordell Bank Offshore Lane", lat: 38.15, lng: -123.25, radiusKm: 12 }
];

export class ScoringEngine {
  static MODEL_VERSION = 'v1.1.0';

  static evaluate(
    vessels: any[],
    geePreyHotspots: any[],
    buoys: any[],
    userSightings: any[],
    historicalSightings: any[]
  ): { dangerZones: CandidateZone[]; updatedVessels: any[] } {
    const candidates: CandidateZone[] = [];

    // Upwelling context from buoys
    let buoyAvailable = false;
    let nutrientScore: number | null = null;
    const activeBuoy = buoys.find(b => b.stationId === '46026' && b.waterTemp !== null);
    
    if (activeBuoy) {
      const wtmpVal = activeBuoy.waterTemp;
      // Exclude values that represent extreme physical outliers
      if (wtmpVal >= 0 && wtmpVal <= 35) {
        buoyAvailable = true;
        // Upwelling nutrient score: peaks at cold upwelling water (11C or below) and drops in warm water
        nutrientScore = Math.min(1.0, Math.max(0.1, 1.0 - (wtmpVal - 11.0) / 10.0));
      }
    }

    const seasonalModifier = 0.85; // Constant upwelling season modifier (defined model assumption)

    // Generate Candidate Zones around shipping lanes, prey hotspots, and sightings
    const pointsOfInterest: { id: string; name: string; lat: number; lng: number; radiusKm: number; isStatic: boolean }[] = [];

    // A. Add Static lanes
    SHIPPING_LANES.forEach(lane => {
      pointsOfInterest.push({
        id: lane.id,
        name: lane.name,
        lat: lane.lat,
        lng: lane.lng,
        radiusKm: lane.radiusKm,
        isStatic: true
      });
    });

    // B. GEE prey hotspots are used as an environmental proxy layer and not added as individual collision-risk zones.
    const geeAvailable = geePreyHotspots.length > 0;

    // C. Add Sighting points (12 hours limit)
    const activeSightings = userSightings.filter(s => {
      const reportTime = new Date(s.timestamp || s.created_at).getTime();
      const ageHours = (Date.now() - reportTime) / (1000 * 3600);
      return ageHours <= 12 && s.latitude && s.longitude;
    });

    activeSightings.forEach((s, idx) => {
      pointsOfInterest.push({
        id: s.id || `USER-SIGHT-CAND-${idx}`,
        name: s.status === 'verified' ? `User-Reported Whale Area (Verified)` : `User-Reported Whale Area`,
        lat: s.latitude,
        lng: s.longitude,
        radiusKm: 12,
        isStatic: false
      });
    });

    // Evaluate each candidate
    pointsOfInterest.forEach((poi, idx) => {
      const lat = poi.lat;
      const lng = poi.lng;

      // 1. Bathymetry slope lookup
      let bathyAvailable = false;
      let bathyScore: number | null = null;
      // SF shelf bounding box check
      if (lat >= 37.1 && lat <= 38.5 && lng >= -123.5 && lng <= -122.0) {
        bathyAvailable = true;
        if (lng < -122.95) {
          bathyScore = 0.85; // shelf edge/slope
        } else if (lng < -122.8) {
          bathyScore = 0.60; // shelf
        } else {
          bathyScore = 0.45; // coastal
        }
      }

      // 2. GEE Prey index calculation (max probability of GEE points within 15 km)
      let geeProductivity: number | null = null;
      if (geeAvailable) {
        let maxProb = 0;
        geePreyHotspots.forEach(pt => {
          const dist = haversineDistance(pt.lat, pt.lng, lat, lng);
          if (dist <= 15) {
            maxProb = Math.max(maxProb, pt.probability);
          }
        });
        geeProductivity = maxProb;
      }

      // Prey Suitability (P) Renormalization
      const preyWeightsDef = { gee: 0.45, buoy: 0.25, bathy: 0.20, seasonal: 0.10 };
      const preyAvailable = {
        gee: geeAvailable && geeProductivity !== null,
        buoy: buoyAvailable && nutrientScore !== null,
        bathy: bathyAvailable && bathyScore !== null,
        seasonal: true
      };
      
      const preyWeights = renormalize(preyWeightsDef, preyAvailable);
      let preyProbability: number | null = null;
      
      if (preyWeights.completeness >= 0.50) {
        preyProbability = 
          (preyWeights.effective.gee * (geeProductivity || 0)) +
          (preyWeights.effective.buoy * (nutrientScore || 0)) +
          (preyWeights.effective.bathy * (bathyScore || 0)) +
          (preyWeights.effective.seasonal * seasonalModifier);
      }

      // 3. Sightings database confidence (verified user reports 0.70; OBIS historical 0.50 within 15km)
      let userConf = 0;
      let histConf = 0;
      let hasRealWhale = false;
      const triggeringWhales: any[] = [];

      activeSightings.forEach(w => {
        const dist = haversineDistance(w.latitude, w.longitude, lat, lng);
        if (dist <= 15) {
          hasRealWhale = true;
          triggeringWhales.push(w);
          userConf = Math.max(userConf, w.status === 'verified' ? 0.70 : 0.40);
        }
      });

      historicalSightings.forEach(h => {
        const dist = haversineDistance(h.latitude || h.lat, h.longitude || h.lng, lat, lng);
        if (dist <= 15) {
          histConf = Math.max(histConf, 0.50);
        }
      });

      const maxSightConf = Math.max(userConf, histConf);
      const sightingsAvailable = true; // Sighting lookups are static/BQ checked

      // Whale Likelihood (W) Renormalization
      const whaleWeightsDef = { prey: 0.45, habitat: 0.25, sightings: 0.20, acoustics: 0.10 };
      const whaleAvailable = {
        prey: preyProbability !== null,
        habitat: bathyAvailable && bathyScore !== null,
        sightings: sightingsAvailable,
        acoustics: false // Acoustics unavailable in current feed
      };

      const whaleWeights = renormalize(whaleWeightsDef, whaleAvailable);
      let whaleLikelihood: number | null = null;
      
      if (whaleWeights.completeness >= 0.50) {
        whaleLikelihood =
          (whaleWeights.effective.prey * (preyProbability || 0)) +
          (whaleWeights.effective.habitat * (bathyScore || 0)) +
          (whaleWeights.effective.sightings * maxSightConf) +
          (whaleWeights.effective.acoustics * 0.0); // acoustics = 0
      }

      // 4. Vessel density (vessels within 1.5x zone radius)
      let vesselsInZoneCount = 0;
      let speedSum = 0;
      let vesselsWithSpeedCount = 0;

      vessels.forEach(v => {
        if (v.latitude && v.longitude) {
          const dist = haversineDistance(v.latitude, v.longitude, lat, lng);
          if (dist <= poi.radiusKm * 1.5) {
            vesselsInZoneCount++;
            if (v.speed !== null && v.speed !== undefined && !isNaN(v.speed)) {
              speedSum += v.speed;
              vesselsWithSpeedCount++;
            }
          }
        }
      });

      const liveVesselDensity = Math.min(1.0, vesselsInZoneCount / 4.0);
      const avgSpeed = vesselsWithSpeedCount > 0 ? speedSum / vesselsWithSpeedCount : null;
      const vesselSpeedRisk = avgSpeed !== null ? Math.min(1.0, Math.max(0.0, (avgSpeed - 10.0) / 10.0)) : null;

      // 5. Route overlap (geodesic distance to lane centers)
      let minLaneDist = Infinity;
      SHIPPING_LANES.forEach(lane => {
        const d = haversineDistance(lane.lat, lane.lng, lat, lng);
        if (d < minLaneDist) minLaneDist = d;
      });
      // within 8km of shipping lane
      const routeOverlapScore = minLaneDist <= 8.0 ? 0.90 : 0.20;

      // Collision Risk (R) Renormalization
      const collisionWeightsDef = { whale: 0.45, density: 0.30, speedRisk: 0.20, route: 0.05 };
      const collisionAvailable = {
        whale: whaleLikelihood !== null,
        density: true, // AIS densities always calculated
        speedRisk: vesselSpeedRisk !== null,
        route: true
      };

      const collisionWeights = renormalize(collisionWeightsDef, collisionAvailable);
      let collisionRisk: number | null = null;
      let insufficientData = false;

      if (collisionWeights.completeness >= 0.50) {
        collisionRisk =
          (collisionWeights.effective.whale * (whaleLikelihood || 0)) +
          (collisionWeights.effective.density * liveVesselDensity) +
          (collisionWeights.effective.speedRisk * (vesselSpeedRisk || 0)) +
          (collisionWeights.effective.route * routeOverlapScore);
          
        if (hasRealWhale) {
          collisionRisk = Math.max(collisionRisk, 0.75);
        }
      } else {
        insufficientData = true;
      }

      const riskScore = collisionRisk !== null ? Math.round(collisionRisk * 100) : null;

      let liveVesselsCount = 0;
      vessels.forEach(v => {
        if (v.latitude && v.longitude) {
          const dist = haversineDistance(v.latitude, v.longitude, lat, lng);
          if (dist <= poi.radiusKm * 1.5) {
            const isFallback = v.sourceType === 'historical' || v.sourceType === 'last-known' || v.id.startsWith('HIST-') || v.id.startsWith('LK-');
            if (!isFallback) {
              liveVesselsCount++;
            }
          }
        }
      });

      const isEcologicalHotspot = riskScore !== null && riskScore >= 55;
      const active = isEcologicalHotspot && liveVesselsCount > 0;
      
      let displayName = poi.name;
      if (active) {
        displayName = `${poi.name} (Collision-Risk Zone)`;
      } else if (isEcologicalHotspot) {
        displayName = `${poi.name} (Elevated Ecological Suitability)`;
      }

      const availableSources: string[] = [];
      const unavailableSources: string[] = [];

      if (geeAvailable) availableSources.push("Google Earth Engine (NOAA OISST)");
      else unavailableSources.push("Google Earth Engine (NOAA OISST)");

      if (buoyAvailable) availableSources.push("NOAA NDBC Buoy 46026");
      else unavailableSources.push("NOAA NDBC Buoy 46026");

      availableSources.push("BigQuery Sighting Database");
      availableSources.push("USCG Vessel Traffic Service (VTS)");

      unavailableSources.push("Whale Safe / Whale Alert Live Feeds");
      unavailableSources.push("MBARI Acoustics Array");

      let crossedReason = "N/A";
      if (isEcologicalHotspot) {
        if (hasRealWhale) {
          crossedReason = "Recent user-reported whale sighting within 12h safety buffer.";
        } else {
          const triggers = [];
          if (preyProbability !== null && preyProbability >= 0.50) triggers.push("elevated prey-habitat suitability proxy");
          if (whaleLikelihood !== null && whaleLikelihood >= 0.50) triggers.push("high whale likelihood index");
          if (liveVesselDensity >= 0.50) triggers.push("high vessel traffic density");
          if (vesselSpeedRisk !== null && vesselSpeedRisk >= 0.50) triggers.push("average vessel speeds exceeding 10 knots");
          if (routeOverlapScore >= 0.80) triggers.push("shipping lane approach overlap");

          if (triggers.length > 0) {
            crossedReason = "Heuristic thresholds crossed: " + triggers.join(", ") + ".";
          } else {
            crossedReason = "Combined cumulative risk model parameters exceeded 0.55 threshold.";
          }
        }
      }

      candidates.push({
        id: poi.id,
        name: displayName,
        lat,
        lng,
        radiusKm: poi.radiusKm,
        isStatic: poi.isStatic,
        geeInput: geeProductivity,
        buoyInput: nutrientScore,
        bathyInput: bathyScore,
        seasonalInput: seasonalModifier,
        preyProbability,
        preyWeights,
        habitatInput: bathyScore,
        sightingInput: maxSightConf,
        acousticInput: 0,
        whaleLikelihood,
        whaleWeights,
        vesselDensityInput: liveVesselDensity,
        vesselSpeedRiskInput: vesselSpeedRisk,
        routeOverlapInput: routeOverlapScore,
        collisionRisk,
        collisionWeights,
        riskScore,
        active,
        hasRealWhale,
        triggeringWhales,
        eligibleVesselCount: 0, // updated in compliance evaluate
        complianceNumerator: 0,
        complianceDenominator: 0,
        complianceRate: null,
        safeSpeedKts: 10,
        insufficientData,

        // Scientific Audit & Integrity Fields
        timestamp: new Date().toISOString(),
        completeness: collisionWeights.completeness,
        availableSources,
        unavailableSources,
        vesselCount: liveVesselsCount,
        speedRisk: vesselSpeedRisk,
        routeOverlap: routeOverlapScore,
        crossedReason,
        isEcologicalHotspot
      });
    });

    // 5. Cluster & Merge Zones (merge if centers <= 8km)
    const mergedZones: CandidateZone[] = [];
    const sorted = candidates.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

    sorted.forEach(c => {
      let merged = false;
      for (const m of mergedZones) {
        const d = haversineDistance(c.lat, c.lng, m.lat, m.lng);
        if (d <= 8.0) {
          // Merge
          m.hasRealWhale = m.hasRealWhale || c.hasRealWhale;
          m.triggeringWhales = Array.from(new Set([...m.triggeringWhales, ...c.triggeringWhales]));
          m.riskScore = Math.max(m.riskScore || 0, c.riskScore || 0);
          m.active = m.active || c.active;
          merged = true;
          break;
        }
      }
      if (!merged) {
        mergedZones.push(c);
      }
    });

    // Limit active zones to 5
    let activeCount = 0;
    mergedZones.forEach(z => {
      if (z.active) {
        activeCount++;
        if (activeCount > 5) {
          z.active = false;
        }
      }
    });

    // 6. Evaluate Vessels inside Danger Zones
    const updatedVessels = vessels.map(v => {
      let insideZone = false;
      let activeDangerZone: CandidateZone | null = null;

      for (const dz of mergedZones) {
        if (dz.active && v.latitude && v.longitude) {
          const dist = haversineDistance(v.latitude, v.longitude, dz.lat, dz.lng);
          if (dist <= dz.radiusKm) {
            insideZone = true;
            activeDangerZone = dz;
          }
        }
      }

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
          v.compliance = v.speed > 10.0 ? "NON-COMPLIANT" : "COMPLIANT";
        }
      } else {
        v.compliance = isFallback ? "PENDING" : (hasValidSpeed ? "COMPLIANT" : "UNKNOWN");
      }

      // Strike risk factor calculation
      let maxRisk = 0;
      if (insideZone && activeDangerZone && hasValidSpeed) {
        // Distance proximity factor
        const dist = haversineDistance(v.latitude, v.longitude, activeDangerZone.lat, activeDangerZone.lng);
        const proximityScore = Math.max(0, 1.0 - (dist / activeDangerZone.radiusKm));
        // Vertical depth overlap constant (70%)
        const verticalOverlap = 0.70;
        // Speed factor
        const speedFactor = Math.pow(v.speed / 10.0, 2.5);
        maxRisk = Math.min(99, Math.round(proximityScore * verticalOverlap * speedFactor * 100));
      }
      v.strikeRisk = maxRisk;

      return v;
    });

    // 7. Recalculate compliance aggregates per zone
    mergedZones.forEach(z => {
      const zoneVessels = updatedVessels.filter(v => {
        const isFallback = v.sourceType === 'historical' || v.sourceType === 'last-known' || v.id.startsWith('HIST-') || v.id.startsWith('LK-');
        const hasValidSpeed = v.speed !== null && v.speed !== undefined && !isNaN(v.speed);
        return !isFallback && v.inDangerZone && v.activeDangerZoneId === z.id && hasValidSpeed;
      });

      const compliant = zoneVessels.filter(v => v.compliance === "COMPLIANT");
      z.eligibleVesselCount = zoneVessels.length;
      z.complianceNumerator = compliant.length;
      z.complianceDenominator = zoneVessels.length;
      z.complianceRate = zoneVessels.length > 0 ? Math.round((compliant.length / zoneVessels.length) * 100) : null;
      z.safeSpeedKts = 10.0;
    });

    return { dangerZones: mergedZones, updatedVessels };
  }
}
