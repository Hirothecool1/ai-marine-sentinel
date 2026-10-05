/* ==========================================================================
   PREDICTIVE MARINE SENTINEL — 3D VERTICAL COLUMN PROFILE
   Renders water column, sea surface, vessel hulls, whale depth, and krill.
   ========================================================================== */

export class Map3D {
  constructor(canvasId, simulation) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.sim = simulation;

    // Selected object for tracking
    this.trackingVesselId = "V-1"; // default tracking Pacific Titan
    this.trackingWhaleId = "W-2";  // default tracking Humpback Luna

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  setTracking(type, id) {
    if (type === 'vessel') {
      this.trackingVesselId = id;
    } else if (type === 'whale') {
      this.trackingWhaleId = id;
    }
  }

  // Draw 3D vertical slice
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const margin = { top: 35, right: 40, bottom: 25, left: 55 };
    const width = this.canvas.width - margin.left - margin.right;
    const height = this.canvas.height - margin.top - margin.bottom;

    // 1. Draw Water Column Background (Vertical Blue gradient)
    const waterGrad = this.ctx.createLinearGradient(margin.left, margin.top, margin.left, margin.top + height);
    waterGrad.addColorStop(0, '#0a152d');   // Shallow sunlight zone
    waterGrad.addColorStop(0.5, '#050a18'); // Twilight mesopelagic zone
    waterGrad.addColorStop(1, '#020409');   // Bathypelagic dark zone
    
    this.ctx.fillStyle = waterGrad;
    this.ctx.fillRect(margin.left, margin.top, width, height);

    // 2. Draw Depth Grid & Axis Labels
    this.drawDepthGrid(margin, width, height);

    // 3. Draw Krill Density Swarms (Trophic Layers)
    if (document.getElementById('layer-krill')?.checked || document.getElementById('layer-chlorophyll')?.checked) {
      this.drawVerticalKrill(margin, width, height);
    }

    // 4. Draw Selected Whale Dive Trajectory
    if (document.getElementById('layer-telemetry')?.checked) {
      this.drawWhaleTrajectory(margin, width, height);
    }

    // 5. Draw Selected Vessel Keel / Hull Draft
    if (document.getElementById('layer-ais')?.checked) {
      this.drawVesselKeel(margin, width, height);
    }

    // 6. Draw Bathymetric Seabed Contour (bottom boundary)
    this.drawSeabed(margin, width, height);

    // 7. Draw Thermocline indicators (SST Front marker)
    if (document.getElementById('layer-sst')?.checked) {
      this.drawThermocline(margin, width, height);
    }
  }

  // Draw depth grid lines
  drawDepthGrid(margin, width, height) {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    this.ctx.font = '9px var(--font-mono)';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';

    const maxDepth = 200; // max depth represented is 200 meters

    // Draw depth markers every 50 meters
    for (let depth = 0; depth <= maxDepth; depth += 50) {
      const y = margin.top + (depth / maxDepth) * height;

      this.ctx.beginPath();
      this.ctx.moveTo(margin.left, y);
      this.ctx.lineTo(margin.left + width, y);
      this.ctx.stroke();

      this.ctx.fillText(`${depth}m`, margin.left - 8, y);
    }

    // X-Axis range marker labels
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText("0.0 NM (Coastal)", margin.left, margin.top + height + 6);
    this.ctx.fillText("10.0 NM", margin.left + width * 0.33, margin.top + height + 6);
    this.ctx.fillText("20.0 NM", margin.left + width * 0.66, margin.top + height + 6);
    this.ctx.fillText("30.0 NM (Offshore)", margin.left + width, margin.top + height + 6);
  }

  // Draw Seabed Contour (Bathymetric layout)
  drawSeabed(margin, width, height) {
    this.ctx.fillStyle = '#0f172a'; // Deep slate
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 1.5;

    this.ctx.beginPath();
    this.ctx.moveTo(margin.left, margin.top + height);

    // Draw an organic seabed slope (getting deeper offshore)
    // SF shelf is shallow near the coast and drops off around the Farallones
    const pointsCount = 40;
    for (let i = 0; i <= pointsCount; i++) {
      const pct = i / pointsCount;
      const x = margin.left + pct * width;
      
      // Seabed profile math: starts shallow (55m), slopes down to 180m offshore
      const baseDepthPct = 0.25 + pct * 0.55;
      const noise = Math.sin(pct * 12) * 0.03 + Math.cos(pct * 25) * 0.01;
      const yDepthPct = Math.min(0.95, baseDepthPct + noise);
      
      this.ctx.lineTo(x, margin.top + yDepthPct * height);
    }

    this.ctx.lineTo(margin.left + width, margin.top + height);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Floating text label
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.font = 'italic 8px var(--font-body)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText("CONTINENTAL SHELF BATHYMETRIC PROFILE", margin.left + width / 2, margin.top + height - 20);
  }

  // Draw Krill Density Profile
  drawVerticalKrill(margin, width, height) {
    const t = this.sim.time.getTime() * 0.001;

    this.sim.krillPatches.forEach(kp => {
      // Map horizontal X coord into 3D profile
      // Assume map X axis maps to horizontal distance
      const pctX = kp.x / 1000;
      const x = margin.left + pctX * width;
      
      const pctDepth = kp.z / 200; // max depth
      const y = margin.top + pctDepth * height;

      const rX = kp.radius * 1.5 * (width / 1000);
      const rY = kp.radius * 0.3 * (height / 200); // flat pancake shape

      // Gradient for krill density column slice
      const grad = this.ctx.createRadialGradient(x, y, 0, x, y, rX);
      grad.addColorStop(0, 'rgba(249, 115, 22, 0.3)'); // Orange krill density
      grad.addColorStop(0.6, 'rgba(236, 72, 153, 0.15)');
      grad.addColorStop(1, 'rgba(236, 72, 153, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      // Draw ellipse shape representing flattened trophic patches
      this.ctx.ellipse(x, y, rX, rY, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Density labels
      this.ctx.fillStyle = 'rgba(249, 115, 22, 0.5)';
      this.ctx.font = '8px var(--font-mono)';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${kp.density.toFixed(2)} g/m³`, x, y - rY - 3);
    });
  }

  // Draw Selected Whale Dive Profile
  drawWhaleTrajectory(margin, width, height) {
    const targetWhale = this.sim.whales.find(w => w.id === this.trackingWhaleId) || this.sim.whales[0];
    if (!targetWhale) return;

    const maxDepth = 200;
    
    // Map whale coordinates to 3D column
    const pctX = targetWhale.x / 1000;
    const x = margin.left + pctX * width;
    
    const pctY = targetWhale.depth / maxDepth;
    const y = margin.top + pctY * height;

    // Draw historical dive profile path (Dotted pink path)
    const t = this.sim.time.getTime() * 0.001;
    this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([3, 5]);

    this.ctx.beginPath();
    // Simulate a standard historical dive trajectory line trailing left of current location
    for (let i = 0; i < 20; i++) {
      const histPctX = Math.max(0, pctX - (i * 0.02));
      const hx = margin.left + histPctX * width;
      
      // Calculate depth profile sine wave to simulate dive history visual
      const cycleTime = t - (i * 12);
      const waveDepth = 80 + Math.sin(cycleTime * 0.012) * 70;
      const hy = margin.top + (Math.max(0, Math.min(maxDepth, waveDepth)) / maxDepth) * height;

      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(hx, hy);
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]); // reset

    // Draw Whale indicator bubble (circular photo thumbnail if user-submitted)
    if (targetWhale.imageUrl) {
      this.ctx.save();
      this.ctx.beginPath();
      const size = 18;
      this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      this.ctx.clip();
      
      if (!targetWhale.imgNode) {
        targetWhale.imgNode = new Image();
        targetWhale.imgNode.src = targetWhale.imageUrl;
      }
      try {
        this.ctx.drawImage(targetWhale.imgNode, x - size / 2, y - size / 2, size, size);
      } catch (e) {}
      
      this.ctx.restore();
      
      this.ctx.strokeStyle = 'var(--color-pink)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      this.ctx.stroke();
    } else {
      this.ctx.fillStyle = 'var(--color-pink)';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 7, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    }

    // Floating name and depth tag
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 9px var(--font-header)';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${targetWhale.name} (${targetWhale.species})`, x + 12, y - 2);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '8px var(--font-mono)';
    this.ctx.fillText(`Depth: ${targetWhale.depth.toFixed(1)}m [${targetWhale.diveState}]`, x + 12, y + 8);
    
    // Pulse sonar ripple if vocalizing
    if (targetWhale.vocalizing) {
      const pulseSize = (t * 15) % 25;
      this.ctx.strokeStyle = `rgba(236, 72, 153, ${1 - (pulseSize/25)})`;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  // Draw Vessel Hull keel draft
  drawVesselKeel(margin, width, height) {
    const targetVessel = this.sim.vessels.find(v => v.id === this.trackingVesselId) || this.sim.vessels[0];
    if (!targetVessel) return;

    const maxDepth = 200;

    // Map vessel horizontal coordinates
    const pctX = targetVessel.x / 1000;
    const x = margin.left + pctX * width;
    const ySurface = margin.top; // surface is 0m

    // Keel draft in screen pixels
    const pctDraft = targetVessel.draft / maxDepth;
    const keelDepthY = margin.top + pctDraft * height;

    const isViolating = targetVessel.inDangerZone && targetVessel.speed > this.sim.speedLimit;
    const color = isViolating ? 'var(--color-red)' : 'var(--color-blue)';

    // 1. Draw Vessel Hull (drawn as a stylized cargo vessel section)
    const hullHalfWidth = 18;
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    // Start at deck line left
    this.ctx.moveTo(x - hullHalfWidth, ySurface);
    // Draw hull curving down to keel draft depth
    this.ctx.lineTo(x - hullHalfWidth + 3, keelDepthY - 2);
    this.ctx.quadraticCurveTo(x, keelDepthY + 2, x + hullHalfWidth - 3, keelDepthY - 2);
    this.ctx.lineTo(x + hullHalfWidth, ySurface);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // 2. Draw Vertical Strike Risk Zone (Glowing red box connecting Keel to Whale if in range)
    const targetWhale = this.sim.whales.find(w => w.id === this.trackingWhaleId) || this.sim.whales[0];
    if (targetWhale) {
      const dist2D = Math.abs(targetVessel.x - targetWhale.x);
      
      // If ship is horizontally near the whale, highlight the vertical collision column
      if (dist2D < 120) {
        const whaleY = margin.top + (targetWhale.depth / maxDepth) * height;

        // Visual warning corridor between keel draft and whale depth
        const gradCol = this.ctx.createLinearGradient(x, keelDepthY, x, whaleY);
        gradCol.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
        gradCol.addColorStop(1, 'rgba(239, 68, 68, 0.05)');

        this.ctx.fillStyle = gradCol;
        this.ctx.fillRect(x - 22, keelDepthY, 44, whaleY - keelDepthY);

        // Border hazard lines
        this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 3]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x - 22, keelDepthY);
        this.ctx.lineTo(x - 22, whaleY);
        this.ctx.moveTo(x + 22, keelDepthY);
        this.ctx.lineTo(x + 22, whaleY);
        this.ctx.stroke();
        this.ctx.setLineDash([]); // reset

        // Draw Risk Score Badge
        const badgeY = keelDepthY + (whaleY - keelDepthY)/2;
        this.ctx.fillStyle = 'var(--color-red)';
        this.ctx.font = 'bold 9px var(--font-header)';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`VERTICAL RISK: ${targetVessel.strikeRisk}%`, x, badgeY);
      }
    }

    // Name tag & draft labels
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 9px var(--font-header)';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(targetVessel.name, x - hullHalfWidth - 6, ySurface + 10);

    this.ctx.fillStyle = 'var(--text-secondary)';
    this.ctx.font = '8px var(--font-mono)';
    this.ctx.fillText(`DRAFT: ${targetVessel.draft.toFixed(1)}m`, x - hullHalfWidth - 6, ySurface + 20);
    this.ctx.fillText(`SPEED: ${targetVessel.speed.toFixed(1)} kts`, x - hullHalfWidth - 6, ySurface + 30);
  }

  // Draw oceanographic thermocline line (SST variations at depth)
  drawThermocline(margin, width, height) {
    this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);

    // Draw the thermocline layer boundary (e.g. at 45m depth)
    const thermoclineDepth = 45;
    const y = margin.top + (thermoclineDepth / 200) * height;

    this.ctx.beginPath();
    this.ctx.moveTo(margin.left, y);
    this.ctx.lineTo(margin.left + width, y);
    this.ctx.stroke();
    this.ctx.setLineDash([]); // reset

    this.ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
    this.ctx.font = 'italic 7px var(--font-mono)';
    this.ctx.textAlign = 'right';
    this.ctx.fillText("THERMOCLINE FRONT (12°C BOUNDARY)", margin.left + width - 10, y - 4);
  }
}
