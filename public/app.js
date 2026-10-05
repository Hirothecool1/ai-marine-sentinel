/* ==========================================================================
   PREDICTIVE MARINE SENTINEL — APP ORCHESTRATOR
   Entry point linking simulation loop, UI controllers, and map canvases.
   ========================================================================== */

import { MarineSimulation } from './simulation.js?v=1.2.1';
import { Map2D } from './map2d.js?v=1.2.1';
import { Map3D } from './map3d.js?v=1.2.1';
import { MarineUI } from './ui.js?v=1.2.1';

class MarineApp {
  constructor() {
    console.log("Initializing Predictive Marine Sentinel Application...");

    // 1. Initialize Core Simulation Engine
    this.sim = new MarineSimulation();

    // Wait for the local AIS data to load from ais.json before starting visual map layers and UI bindings
    this.sim.aisPromise.then(() => {
      console.log("AIS telemetry data loaded. Starting visual maps and UI orchestration...");

      // 2. Initialize Visual Maps
      this.map2D = new Map2D('canvas-2d', this.sim);
      this.map3D = new Map3D('canvas-3d', this.sim);

      // Recenter camera on the tactical area
      this.map2D.recenter();

      // 3. Initialize UI Binding controllers
      this.ui = new MarineUI(this.sim, this.map2D, this.map3D);

      // Bind speed control buttons from index.html
      this.initClockControls();

      // Initialize Lucide icons
      lucide.createIcons();

      // 4. Start Render & Simulation loops
      this.lastTime = performance.now();
      this.lastTickTime = 0;
      this.loop = (now) => {
        this.tick(now);
        requestAnimationFrame(this.loop);
      };
      requestAnimationFrame(this.loop);

      // Fallback interval for headless browsers / background tabs
      setInterval(() => {
        this.tick(performance.now());
      }, 500);

      // Initial console greet
      this.sim.addNegotiationLog("system", "U.S. Coast Guard Vessel Traffic Service (VTS) San Francisco - Cetacean Desk connected.");
    });
  }

  // Hook speed-multiplier and pause buttons to the simulation state
  initClockControls() {
    const speedButtons = document.querySelectorAll('.btn-speed');
    const pauseBtn = document.getElementById('btn-pause-toggle');

    // Speed multiplier buttons (1x, 2x, 5x, 10x)
    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const speed = parseInt(btn.getAttribute('data-speed'));
        this.sim.setSpeed(speed);

        // Resume if paused
        if (!this.sim.isRunning) {
          this.sim.isRunning = true;
          if (pauseBtn) {
            pauseBtn.classList.remove('paused');
            const pauseIcon = document.getElementById('pause-icon');
            if (pauseIcon) {
              pauseIcon.setAttribute('data-lucide', 'pause');
              lucide.createIcons();
            }
          }
        }
      });
    });

    // Pause/Play Toggle Button
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        const isPaused = this.sim.togglePause();
        const pauseIcon = document.getElementById('pause-icon');
        if (pauseIcon) {
          if (isPaused) {
            pauseBtn.classList.add('paused');
            pauseIcon.setAttribute('data-lucide', 'play');
          } else {
            pauseBtn.classList.remove('paused');
            pauseIcon.setAttribute('data-lucide', 'pause');
          }
          lucide.createIcons(); // refresh icon layout
        }
      });
    }
  }

  // Consolidated Main Loop Tick
  tick(now) {
    if (this.lastTickTime && (now - this.lastTickTime < 100)) {
      return; // Prevent duplicate execution
    }
    this.lastTickTime = now;

    const delta = now - this.lastTime;
    this.lastTime = now;

    // A. Update Physics Simulation
    // (Simulation internally scales delta based on its speedMultiplier)
    this.sim.update();

    // B. Draw Interactive Maps
    this.map2D.draw();
    this.map3D.draw();

    // C. Update Dashboard UI (Counters, progress sliders, list details)
    this.ui.update();
  }
}

// Instantiate App once page fully loaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new MarineApp();
  initIndependentClock();
});

function initIndependentClock() {
  function updateClock() {
    try {
      const timeEl = document.getElementById('sim-time');
      const dateEl = document.getElementById('sim-date');
      const now = new Date();
      if (timeEl) {
        timeEl.innerText = now.toTimeString().split(' ')[0];
      }
      if (dateEl) {
        const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        dateEl.innerText = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
      }
    } catch (err) {
      console.error("Independent clock update failed:", err);
    }
  }
  updateClock();
  setInterval(updateClock, 1000);
}
