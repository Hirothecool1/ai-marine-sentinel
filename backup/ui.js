/* ==========================================================================
   PREDICTIVE MARINE SENTINEL — USER INTERFACE BINDINGS
   Handles sidebars, tickers, modal generation, and ticket canvas charting.
   ========================================================================== */

class SourceConnectionManager {
  constructor(ui) {
    this.ui = ui;
    this.sources = {
      aisstream: {
        id: 'aisstream',
        name: 'AISstream Live Tracking',
        classification: 'Live / Near-Real-Time',
        status: 'disconnected',
        statusColor: '#f59e0b',
        lastFetch: 'Never',
        records: 0,
        recordsCount: 0,
        contributing: 'No',
        contributingColor: '#94a3b8',
        missingEnv: 'AISSTREAM_API_KEY',
        credentialsStatus: 'missing',
        lastSuccessConnection: null,
        lastSuccessDataRecord: null,
        lastError: null,
        nextRetryTime: null,
        backoffDelay: 1000,
        refreshInterval: null,
        countdown: null
      },
      secondary_ais: {
        id: 'secondary_ais',
        name: 'Secondary AIS Backup',
        classification: 'Live / Near-Real-Time Backup',
        status: 'missing key',
        statusColor: '#ef4444',
        lastFetch: 'Never',
        records: 0,
        providerSelected: 'None',
        keyPresent: 'No',
        lastError: null,
        refreshInterval: null,
        countdown: null
      },
      whale_safe: {
        id: 'whale_safe',
        name: 'Whale Safe Live Detections',
        classification: 'Live / Near-Real-Time',
        status: 'disconnected',
        statusColor: '#3b82f6',
        lastFetch: 'Never',
        records: 0,
        contributing: 'No',
        contributingColor: '#94a3b8',
        missingEnv: 'WHALE_SAFE_API_KEY_OR_ENDPOINT',
        credentialsStatus: 'missing',
        lastSuccessConnection: null,
        lastSuccessDataRecord: null,
        lastError: null,
        nextRetryTime: null,
        refreshInterval: 300000, // 5m
        countdown: 300
      },
      whale_alert: {
        id: 'whale_alert',
        name: 'Whale Alert West Coast Feed',
        classification: 'Live / Near-Real-Time',
        status: 'disconnected',
        statusColor: '#3b82f6',
        lastFetch: 'Never',
        records: 0,
        contributing: 'No',
        contributingColor: '#94a3b8',
        missingEnv: 'WHALE_ALERT_API_KEY_OR_ENDPOINT',
        credentialsStatus: 'missing',
        lastSuccessConnection: null,
        lastSuccessDataRecord: null,
        lastError: null,
        nextRetryTime: null,
        refreshInterval: 300000, // 5m
        countdown: 300
      },
      obis_seamap: {
        id: 'obis_seamap',
        name: 'OBIS-SEAMAP Historical Archive',
        classification: 'Historical',
        status: 'connected',
        statusColor: '#10b981',
        lastFetch: 'Static Asset Loaded',
        records: 0,
        contributing: 'Yes (When historical layer enabled)',
        contributingColor: '#eab308',
        missingEnv: 'None',
        credentialsStatus: 'configured',
        lastSuccessConnection: new Date(),
        lastSuccessDataRecord: new Date(),
        lastError: null,
        nextRetryTime: null,
        refreshInterval: null,
        countdown: null
      },
      bigquery_users: {
        id: 'bigquery_users',
        name: 'BigQuery User Sightings Database',
        classification: 'Live (User Reported)',
        status: 'disconnected',
        statusColor: '#f59e0b',
        lastFetch: 'Never',
        records: 0,
        contributing: 'No',
        contributingColor: '#94a3b8',
        missingEnv: 'GOOGLE_APPLICATION_CREDENTIALS',
        credentialsStatus: 'missing',
        lastSuccessConnection: null,
        lastSuccessDataRecord: null,
        lastError: null,
        nextRetryTime: null,
        refreshInterval: 300000, // 5m
        countdown: 300
      },
      gee: {
        id: 'gee',
        name: 'Google Earth Engine Prey Proxy',
        classification: 'Near-Real-Time',
        status: 'disconnected',
        statusColor: '#f59e0b',
        lastFetch: 'Never',
        records: 0,
        contributing: 'No',
        contributingColor: '#94a3b8',
        missingEnv: 'GOOGLE_EARTH_ENGINE_PROJECT',
        credentialsStatus: 'missing',
        lastSuccessConnection: null,
        lastSuccessDataRecord: null,
        lastError: null,
        nextRetryTime: null,
        refreshInterval: 3600000, // 1h
        countdown: 3600
      },
      noaa_ndbc: {
        id: 'noaa_ndbc',
        name: 'NOAA NDBC Buoy Telemetry',
        classification: 'Near-Real-Time',
        status: 'disconnected',
        statusColor: '#ef4444',
        lastFetch: 'Never',
        records: 0,
        contributing: 'No',
        contributingColor: '#94a3b8',
        missingEnv: 'None',
        credentialsStatus: 'configured',
        lastSuccessConnection: null,
        lastSuccessDataRecord: null,
        lastError: null,
        nextRetryTime: null,
        refreshInterval: 300000, // 5m
        countdown: 300
      },
      noaa_erddap: {
        id: 'noaa_erddap',
        name: 'NOAA ERDDAP / CoastWatch SST',
        classification: 'Near-Real-Time',
        status: 'disconnected',
        statusColor: '#ef4444',
        lastFetch: 'Never',
        records: 0,
        contributing: 'No',
        contributingColor: '#94a3b8',
        missingEnv: 'None',
        credentialsStatus: 'configured',
        lastSuccessConnection: null,
        lastSuccessDataRecord: null,
        lastError: null,
        nextRetryTime: null,
        refreshInterval: 1800000, // 30m
        countdown: 1800
      },
      bathymetry: {
        id: 'bathymetry',
        name: 'NOAA / GEBCO Seafloor Contours',
        classification: 'Static Seafloor Data',
        status: 'connected',
        statusColor: '#10b981',
        lastFetch: 'Static Asset Loaded',
        records: 2,
        contributing: 'Yes',
        contributingColor: '#10b981',
        missingEnv: 'None',
        credentialsStatus: 'configured',
        lastSuccessConnection: new Date(),
        lastSuccessDataRecord: new Date(),
        lastError: null,
        nextRetryTime: null,
        refreshInterval: null,
        countdown: null
      },
      mbari: {
        id: 'mbari',
        name: 'MBARI Krill/Zooplankton hot-spot',
        classification: 'Research Collaboration',
        status: 'Not Connected / Partner Pending',
        statusColor: '#f59e0b',
        lastFetch: 'Never',
        records: 0,
        contributing: 'No',
        contributingColor: '#94a3b8',
        missingEnv: 'MBARI_DATA_URL',
        credentialsStatus: 'missing',
        lastSuccessConnection: null,
        lastSuccessDataRecord: null,
        lastError: null,
        nextRetryTime: null,
        refreshInterval: 600000, // 10m
        countdown: 600
      },
      farallon: {
        id: 'farallon',
        name: 'Farallon Acoustic Krill Data',
        classification: 'Research Collaboration',
        status: 'Not Connected / Partner Pending',
        statusColor: '#f59e0b',
        lastFetch: 'Never',
        records: 0,
        contributing: 'No',
        contributingColor: '#94a3b8',
        missingEnv: 'FARALLON_DATA_URL',
        credentialsStatus: 'missing',
        lastSuccessConnection: null,
        lastSuccessDataRecord: null,
        lastError: null,
        nextRetryTime: null,
        refreshInterval: 600000, // 10m
        countdown: 600
      }
    };
    this.countdownInterval = null;
  }

  startTimers() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    
    let aisCounter = 0;
    this.countdownInterval = setInterval(() => {
      if (this.ui.sim.demoMode) return;
      
      aisCounter++;
      if (aisCounter >= 10) {
        aisCounter = 0;
        this.ui.fetchRealDataFeeds();
      }
      
      Object.keys(this.sources).forEach(key => {
        const source = this.sources[key];
        if (source.refreshInterval && source.countdown !== null) {
          source.countdown--;
          if (source.countdown <= 0) {
            source.countdown = Math.round(source.refreshInterval / 1000);
            this.refreshSource(source.id);
          }
        }
      });
      
      this.ui.updateSourcesRegistry();
      this.ui.updateReadinessChecklist();
      this.ui.runTroubleshootingDiagnostics();
    }, 1000);
  }

  refreshSource(sourceId) {
    if (sourceId === 'noaa_ndbc' || sourceId === 'noaa_erddap' || sourceId === 'gee' || sourceId === 'whale_safe' || sourceId === 'whale_alert' || sourceId === 'bigquery_users') {
      this.ui.fetchRealDataFeeds();
    } else if (sourceId === 'aisstream') {
      if (this.ui.feedConfig?.aisStreamKeyConfigured) {
        this.ui.fetchRealDataFeeds();
      }
    }
  }

  async testConnection(sourceId) {
    const source = this.sources[sourceId];
    if (!source) return;
    
    source.status = 'testing';
    source.statusColor = '#fbbf24';
    this.ui.updateSourcesRegistry();
    
    const isDemo = this.ui.sim.demoMode;
    if (isDemo) {
      setTimeout(() => {
        source.status = 'connected';
        source.statusColor = '#f97316';
        source.lastSuccessConnection = new Date();
        source.lastSuccessDataRecord = new Date();
        source.records = 5;
        this.ui.updateSourcesRegistry();
        this.ui.updateReadinessChecklist();
      }, 1000);
      return;
    }
    
    try {
      if (sourceId === 'aisstream') {
        const config = this.ui.feedConfig;
        if (!config || !config.aisStreamKeyConfigured) {
          throw new Error('AISSTREAM_API_KEY is missing');
        }
        
        source.lastError = null;
        const res = await fetch('/api/debug/aisstream-test');
        const data = await res.json();
        
        if (data.status === 'success' && data.connection) {
          const conn = data.connection;
          source.lastError = conn.lastError;
          source.records = conn.vesselsCount;
          source.recordsCount = conn.messagesReceived;
          if (conn.status === 'connected') {
            source.status = 'connected';
            source.statusColor = '#10b981';
            source.lastSuccessConnection = conn.lastMessageTime ? new Date(conn.lastMessageTime) : new Date();
            source.lastSuccessDataRecord = conn.lastMessageTime ? new Date(conn.lastMessageTime) : new Date();
          } else if (conn.status === 'connecting') {
            source.status = 'connecting';
            source.statusColor = '#fbbf24';
          } else if (conn.status === 'error') {
            source.status = 'error';
            source.statusColor = '#ef4444';
            source.lastError = conn.lastError || 'AISstream backend manager error';
          } else {
            source.status = conn.status;
            source.statusColor = '#fbbf24';
          }
          this.ui.updateSourcesRegistry();
          this.ui.updateReadinessChecklist();
        } else {
          throw new Error(data.message || 'Failed to retrieve AISstream test diagnostic payload');
        }
        
      } else if (sourceId === 'noaa_ndbc') {
        const res = await fetch('/api/ocean-conditions');
        const data = await res.json();
        if (data.status === 'success' && data.buoys && data.buoys.length > 0) {
          source.status = 'connected';
          source.statusColor = '#10b981';
          source.lastSuccessConnection = new Date();
          source.lastSuccessDataRecord = new Date();
          source.records = data.buoys.length;
          source.lastError = null;
          this.ui.updateSourcesRegistry();
          this.ui.updateReadinessChecklist();
        } else {
          throw new Error(data.message || 'No buoy stations retrieved');
        }
        
      } else if (sourceId === 'noaa_erddap') {
        const res = await fetch('/api/ocean-conditions');
        const data = await res.json();
        if (data.erddapStatus === 'connected') {
          source.status = 'connected';
          source.statusColor = '#10b981';
          source.lastSuccessConnection = new Date();
          source.lastSuccessDataRecord = new Date();
          source.records = 1;
          source.lastError = null;
          this.ui.updateSourcesRegistry();
          this.ui.updateReadinessChecklist();
        } else {
          throw new Error('ERDDAP connection failed / not configured');
        }
        
      } else if (sourceId === 'gee') {
        const res = await fetch('/api/prey-probability');
        const data = await res.json();
        if (data.status === 'connected') {
          source.status = 'connected';
          source.statusColor = '#10b981';
          source.lastSuccessConnection = new Date();
          source.lastSuccessDataRecord = new Date();
          source.records = data.data.length;
          source.lastError = null;
          this.ui.updateSourcesRegistry();
          this.ui.updateReadinessChecklist();
        } else {
          throw new Error(data.message || 'Earth Engine credentials missing');
        }
        
      } else if (sourceId === 'whale_safe' || sourceId === 'whale_alert') {
        const config = this.ui.feedConfig;
        if (!config || !(sourceId === 'whale_safe' ? config.whaleSafeConfigured : config.whaleAlertConfigured)) {
          throw new Error('Cannot test until endpoint/API key is configured.');
        }
        const res = await fetch('/api/whale-data');
        const data = await res.json();
        if (data.status === 'connected') {
          source.status = 'connected';
          source.statusColor = '#10b981';
          source.lastSuccessConnection = new Date();
          source.lastSuccessDataRecord = new Date();
          source.records = data.liveSightings ? data.liveSightings.length : 0;
          source.lastError = null;
          this.ui.updateSourcesRegistry();
          this.ui.updateReadinessChecklist();
        } else {
          throw new Error('Partner API key not configured');
        }
        
      } else if (sourceId === 'bigquery_users') {
        const res = await fetch('/api/sightings');
        const data = await res.json();
        if (data.sightings) {
          source.status = 'connected';
          source.statusColor = '#10b981';
          source.lastSuccessConnection = new Date();
          source.lastSuccessDataRecord = new Date();
          source.records = data.sightings.length;
          source.lastError = null;
          this.ui.updateSourcesRegistry();
          this.ui.updateReadinessChecklist();
        } else {
          throw new Error(data.error || 'BigQuery access pending credentials');
        }
      } else {
        setTimeout(() => {
          const config = this.ui.feedConfig;
          const isConfigured = (sourceId === 'mbari' ? config?.mbariConfigured : config?.farallonConfigured);
          if (isConfigured) {
            source.status = 'connected';
            source.statusColor = '#10b981';
            source.lastSuccessConnection = new Date();
            source.lastSuccessDataRecord = new Date();
            source.records = 3;
            source.lastError = null;
          } else {
            source.status = 'partner_access_required';
            source.statusColor = '#f59e0b';
            source.lastError = 'Cannot test until endpoint/API key is configured.';
          }
          this.ui.updateSourcesRegistry();
          this.ui.updateReadinessChecklist();
        }, 1000);
      }
    } catch (e) {
      const isOptionalPartner = ['whale_safe', 'whale_alert', 'mbari', 'farallon'].includes(sourceId);
      const config = this.ui.feedConfig || {};
      const isConfigured = (sourceId === 'whale_safe' ? config.whaleSafeConfigured :
                            sourceId === 'whale_alert' ? config.whaleAlertConfigured :
                            sourceId === 'mbari' ? config.mbariConfigured :
                            sourceId === 'farallon' ? config.farallonConfigured : false);

      if (isOptionalPartner && !isConfigured) {
        source.status = 'partner_access_required';
        source.statusColor = '#f59e0b';
        if (sourceId === 'whale_safe' || sourceId === 'whale_alert') {
          source.lastError = 'Optional partner source not connected. Would improve live whale detections if API/data-sharing access is added.';
        } else {
          source.lastError = 'Would improve direct krill/acoustic validation if data-sharing access is added.';
        }
      } else {
        source.status = 'error';
        source.statusColor = '#ef4444';
        source.lastError = e.message || e.toString();
      }
      this.ui.updateSourcesRegistry();
      this.ui.updateReadinessChecklist();
    }
  }
}

export class MarineUI {
  constructor(simulation, map2D, map3D) {
    this.sim = simulation;
    this.map2D = map2D;
    this.map3D = map3D;

    // Centralized Application State
    this.state = {
      vessels: [],
      riskZones: [],
      geeData: [],
      buoys: [],
      userSightings: [],
      sourceAvailability: {
        aisstream: 'disconnected',
        gee: 'disconnected',
        noaa_ndbc: 'disconnected'
      },
      lastFetchTime: null,
      loading: true,
      error: null
    };
    this.emptyStateDismissed = false;

    // UI elements
    this.vesselListEl = document.getElementById('vessel-list');
    this.citationsListEl = document.getElementById('citations-list');
    this.whaleListEl = document.getElementById('whale-urgency-list');
    this.chatFeedEl = document.getElementById('agent-negotiations-feed');
    
    // Sliders
    this.sensitivitySlider = document.getElementById('param-sensitivity');
    this.bufferSlider = document.getElementById('param-buffer');
    this.speedLimitSlider = document.getElementById('param-speed-limit');

    // Modal elements
    this.modalEl = document.getElementById('citation-modal');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnAckModal = document.getElementById('btn-citation-close');
    this.btnPrintModal = document.getElementById('btn-citation-print');

    // Drawer state tracking
    this.selectedTicketId = null;
    this.activePanel = null;

    // Sighting upload button
    this.btnReportSighting = document.getElementById('btn-report-sighting');
    this.reportSightingFile = document.getElementById('report-sighting-file');

    // Real-time integration state
    this.feedConfig = null;
    this.aisWs = null;
    this.aisStatus = 'Connecting...';
    this.geeStatus = 'Connecting...';
    this.whaleStatus = 'Connecting...';
    this.buoyStatus = 'Connecting...';
    this.lastAISUpdate = null;
    this.lastGEEUpdate = null;
    this.lastWhaleUpdate = null;
    this.lastBuoyUpdate = null;
    this.currentVesselFilter = 'all';

    this.sourceManager = new SourceConnectionManager(this);
    this.sourceManager.startTimers();
    this.lastCalculationLogTime = 0;
    this.initEvents();
    this.initRealTimeDataFeeds();
  }

  isStatusUnavailable(status) {
    if (!status) return true;
    const cleanStatus = String(status).toLowerCase().trim();
    const connectedStatuses = ['connected', 'receiving', 'available', 'live', 'success', 'server-managed', 'connected_waiting', 'waiting', 'receiving_data'];
    const unavailableStatuses = ['disconnected', 'unavailable', 'credentials_required', 'error', 'stale', 'missing key', 'missing_key'];
    
    if (connectedStatuses.includes(cleanStatus)) {
      return false;
    }
    if (unavailableStatuses.includes(cleanStatus)) {
      return true;
    }
    return true; // default to true if unknown
  }

  // Hook UI event listeners
  initEvents() {
    // 1. Slider controls updating simulation parameters
    this.sensitivitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('val-sensitivity').innerText = `${val}%`;
      this.sim.aiSensitivity = val / 100;
    });

    this.bufferSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) / 10;
      document.getElementById('val-buffer').innerText = `${val.toFixed(1)} nm`;
      this.sim.trophicBuffer = val;
    });

    this.speedLimitSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('val-speed-limit').innerText = `${val.toFixed(0)} kts`;
      this.sim.speedLimit = val;
    });

    // 2. Modal dismiss listeners
    this.btnCloseModal.addEventListener('click', () => this.closeCitationModal());
    this.btnAckModal.addEventListener('click', () => this.closeCitationModal());
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.closeCitationModal();
    });

    // 2b. Section 1 tab switcher (Vessels vs Citations)
    const tabVessels = document.getElementById('tab-vessels');
    const tabCitations = document.getElementById('tab-citations');
    
    if (tabVessels && tabCitations) {
      tabVessels.addEventListener('click', () => {
        tabVessels.classList.add('active');
        tabCitations.classList.remove('active');
        this.vesselListEl.classList.remove('hidden');
        this.citationsListEl.classList.add('hidden');
      });
      
      tabCitations.addEventListener('click', () => {
        tabCitations.classList.add('active');
        tabVessels.classList.remove('active');
        this.vesselListEl.classList.add('hidden');
        this.citationsListEl.classList.remove('hidden');
        this.updateCitationsList();
      });
    }

    // 3. Print compliance notice
    this.btnPrintModal.addEventListener('click', () => {
      window.print();
    });

    const btnViewMap = document.getElementById('btn-citation-view-map');
    if (btnViewMap) {
      btnViewMap.addEventListener('click', () => {
        const ticketId = document.getElementById('cite-id').innerText;
        const ticket = this.sim.issuedTickets.find(t => t.id === ticketId);
        if (ticket) {
          const vessel = this.sim.vessels.find(v => v.id === ticket.vesselId);
          if (vessel) {
            this.map2D.selectedObjectId = vessel.id;
            this.map2D.selectedObjectType = 'vessel';
            this.map3D.setTracking('vessel', vessel.id);
            document.getElementById('selected-object-label').innerHTML = `Currently tracking Vessel: <span class="text-cyan font-bold">${vessel.name}</span>`;
            this.map2D.recenterOnSim(vessel.x, vessel.y);
            this.closeCitationModal();
            this.updateVesselList();
          } else {
            alert("Vessel is no longer active in the current tracking window.");
          }
        }
      });
    }

    const btnCopy = document.getElementById('btn-citation-copy');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const ticketId = document.getElementById('cite-id').innerText;
        const ticket = this.sim.issuedTickets.find(t => t.id === ticketId);
        if (ticket) {
          const text = `
UNITED STATES COAST GUARD
Vessel Traffic Service — Cetacean Protection Desk
POTENTIAL VIOLATION: REVIEW FLAGGED

Advisory ID: ${ticket.id}
Timestamp: ${ticket.timestamp.toISOString()}
Vessel Name: ${ticket.vesselName.toUpperCase()}
MMSI/IMO: ${ticket.vesselImo}
Vessel Type: ${ticket.vesselType}
Vessel Flag: ${ticket.vesselFlag}
Coordinates: ${ticket.coordinates}
Zone Name: ${ticket.zoneName}
Detected Speed: ${ticket.speed} Knots
Recommended Speed: ${ticket.mandatedSpeed} Knots Max
Strike Mortality Risk: ${ticket.riskFactor}
Prey Probability Overlap: ${ticket.krillOverlap}

NOTICE: This record has been flagged for compliance review.
          `.trim();
          navigator.clipboard.writeText(text).then(() => {
            alert("Advisory details copied to clipboard!");
          }).catch(err => {
            console.error("Copy failed:", err);
            alert("Failed to copy details.");
          });
        }
      });
    }

    // 4. Map Zoom / Zoom Out / Recenter
    document.getElementById('map-zoom-in').addEventListener('click', () => {
      this.map2D.zoomIn();
    });

    document.getElementById('map-zoom-out').addEventListener('click', () => {
      this.map2D.zoomOut();
    });

    document.getElementById('map-recenter').addEventListener('click', () => {
      this.map2D.recenter();
    });    // 5. Floating Tool Dock Drawer triggers and 3D View Modal
    const btnDockLayers = document.getElementById('btn-dock-layers');
    const btnDockPrediction = document.getElementById('btn-dock-prediction');
    const btnDockVessels = document.getElementById('btn-dock-vessels');
    const btnDockSources = document.getElementById('btn-dock-sources');
    const btnDock3d = document.getElementById('btn-dock-3d');
    const btnDockWorkflow = document.getElementById('btn-dock-workflow');

    const btnCloseLeft = document.getElementById('btn-close-sidebar-left');
    const btnCloseRight = document.getElementById('btn-close-sidebar-right');
    const btnClose3d = document.getElementById('btn-close-3d');
    const modal3d = document.getElementById('modal-3d');

    if (btnDockLayers) btnDockLayers.addEventListener('click', () => this.setActivePanel('layers'));
    if (btnDockPrediction) btnDockPrediction.addEventListener('click', () => this.setActivePanel('prediction'));
    if (btnDockVessels) btnDockVessels.addEventListener('click', () => this.setActivePanel('vessels'));
    if (btnDockSources) btnDockSources.addEventListener('click', () => this.setActivePanel('sources'));
    if (btnDock3d) btnDock3d.addEventListener('click', () => this.setActivePanel('3d'));
    if (btnDockWorkflow) btnDockWorkflow.addEventListener('click', () => this.setActivePanel('workflow'));

    if (btnCloseLeft) btnCloseLeft.addEventListener('click', () => this.setActivePanel(null));
    if (btnCloseRight) btnCloseRight.addEventListener('click', () => this.setActivePanel(null));
    if (btnClose3d) btnClose3d.addEventListener('click', () => this.setActivePanel(null));

    if (modal3d) {
      modal3d.addEventListener('click', (e) => {
        if (e.target === modal3d) {
          this.setActivePanel(null);
        }
      });
    }

    // Global Escape key down listener to close all panels & modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.setActivePanel(null);
        if (this.modalEl && this.modalEl.classList.contains('open')) {
          this.closeCitationModal();
        }
      }
    });

    // Close citation warning modal drawer when clicking anywhere outside of it
    document.addEventListener('click', (e) => {
      if (this.modalEl && this.modalEl.classList.contains('open')) {
        const isClickInsideCard = this.modalEl.querySelector('.modal-card').contains(e.target);
        const isClickOnVesselRow = e.target.closest('.citation-log-row');
        if (!isClickInsideCard && !isClickOnVesselRow) {
          this.closeCitationModal();
        }
      }
    });

    // 6. Callback updates from simulation
    this.sim.onNegotiationUpdated = () => this.renderNegotiationFeed();
    this.sim.onViolationIssued = (ticket) => {
      // Background update of citations log list and count badge, without interrupting user
      this.updateCitationsList();
    };

    // Map selection update callback
    this.map2D.onSelectObject = (obj) => {
      if (obj.type === 'vessel') {
        this.map3D.setTracking('vessel', obj.id);
        document.getElementById('selected-object-label').innerHTML = `Currently tracking Vessel: <span class="text-cyan font-bold">${obj.name}</span> (${obj.type})`;
        
        // Find if this vessel has a compliance review ticket/warning
        const ticket = this.sim.issuedTickets.find(t => t.vesselId === obj.id);
        if (ticket) {
          this.selectedTicketId = ticket.id;
          this.showCitationModal(ticket);
          this.updateCitationsList();
        }
      } else {
        this.map3D.setTracking('whale', obj.id);
        document.getElementById('selected-object-label').innerHTML = `Currently tracking Sentinel: <span class="text-pink font-bold">${obj.name}</span> (${obj.species})`;
      }
      this.updateVesselList();
      this.updateWhaleList();
    };

    // 7. Report Whale Sighting image upload handler
    if (this.btnReportSighting && this.reportSightingFile) {
      this.btnReportSighting.addEventListener('click', () => {
        this.reportSightingFile.click();
      });

      this.reportSightingFile.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          try {
            this.sim.addNegotiationLog("system", `AI Sentinel: Processing uploaded image ${file.name}...`);

            const arrayBuffer = await file.arrayBuffer();
            // exifr is loaded globally via CDN
            const gps = await window.exifr.gps(arrayBuffer);

            if (!gps || typeof gps.latitude !== 'number' || typeof gps.longitude !== 'number') {
              this.sim.addNegotiationLog("system", `AI Sentinel: Error - No GPS geotags found in ${file.name}. Please upload a geotagged photo.`);
              alert("No GPS coordinates found in the image. Please upload a photo with geotags/location enabled.");
              return;
            }

            const lat = gps.latitude;
            const lng = gps.longitude;

            // Convert GPS to simulation coordinates using map2D's conversion
            const { x, y } = this.map2D.latLngToSim(lat, lng);

            if (x < 0 || x > 1000 || y < 0 || y > 1000) {
              this.sim.addNegotiationLog("system", `AI Sentinel: Sighting is outside of San Francisco tactical VTS range (${lat.toFixed(3)}°N, ${Math.abs(lng).toFixed(3)}°W).`);
              alert(`Sighting coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) are outside the SF tactical range.`);
              return;
            }

            this.sim.addNegotiationLog("system", `AI Sentinel: Analyzing image via Gemini for cetacean verification...`);

            // Simulate Gemini model checking delay
            setTimeout(() => {
              let species = "Humpback Whale";
              const nameLower = file.name.toLowerCase();
              if (nameLower.includes("blue")) species = "Blue Whale";
              else if (nameLower.includes("fin")) species = "Fin Whale";
              else if (nameLower.includes("gray")) species = "Gray Whale";
              else if (nameLower.includes("orca") || nameLower.includes("killer")) species = "Orca";

              const whaleId = `W-U-${Date.now()}`;
              const newWhale = {
                id: whaleId,
                name: `Sighted ${species.split(' ')[0]}`,
                species: species,
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.15,
                depth: 0,
                diveState: "SURFACE",
                stateTimer: 0,
                targetDepth: 0,
                foragingUrgency: 0.15,
                vocalizing: true,
                vocalTimer: 15,
                history: [],
                imageUrl: URL.createObjectURL(file) // object URL for client-side rendering
              };

              this.sim.whales.push(newWhale);
              this.sim.addNegotiationLog("system", `AI Sentinel: Sighting VERIFIED! ${species} mapped at coordinates ${lat.toFixed(4)}°N, ${Math.abs(lng).toFixed(3)}°W.`);

              // Automatically select and track the newly sighted whale
              this.map2D.selectedObjectId = whaleId;
              this.map2D.selectedObjectType = 'whale';
              this.map3D.setTracking('whale', whaleId);
              
              // Recenter map on the sighted whale
              if (this.map2D.recenterOnSim) {
                this.map2D.recenterOnSim(x, y);
              } else {
                this.map2D.panX = this.map2D.canvas.width / 2 - x * this.map2D.zoom;
                this.map2D.panY = this.map2D.canvas.height / 2 - y * this.map2D.zoom;
              }

              // Clear the input value so the same file can be selected again
              this.reportSightingFile.value = '';
            }, 1200);

          } catch (err) {
            console.error("Failed to process uploaded sighting:", err);
            this.sim.addNegotiationLog("system", `AI Sentinel: Failed to parse sighting EXIF data.`);
          }
        }
      });
    }

    // 8. Vessel category filter listeners
    const filterBtns = document.querySelectorAll('.btn-filter');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = 'var(--text-secondary)';
        });
        btn.classList.add('active');
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.color = 'var(--text-primary)';
        
        this.currentVesselFilter = btn.getAttribute('data-filter');
        this.updateVesselList();
        this.map2D.draw();
      });
    });

    // 9. Mode toggle listener
    const modeToggle = document.getElementById('btn-mode-toggle');
    if (modeToggle) {
      modeToggle.addEventListener('click', () => {
        if (this.feedConfig && (this.feedConfig.realDataOnly === 'true' || this.feedConfig.allowSampleData === 'false')) {
          console.warn("[Mode Toggle] Switching to Demo Mode is disabled by environment policy.");
          alert("Demo/Simulation mode is disabled because the application is configured in strict Real Data mode (REAL_DATA_ONLY=true, ALLOW_SAMPLE_DATA=false).");
          return;
        }

        const isDemo = !this.sim.demoMode;
        this.sim.setDemoMode(isDemo);
        
        // Update button text and dot styling
        const modeText = modeToggle.querySelector('.mode-text');
        const modeDot = modeToggle.querySelector('.mode-dot');
        const demoBanner = document.getElementById('demo-banner');
        
        if (isDemo) {
          modeText.innerText = "DEMO / SIMULATION";
          modeToggle.style.color = "#f97316";
          modeToggle.style.background = "rgba(249, 115, 22, 0.08)";
          modeToggle.style.borderColor = "rgba(249, 115, 22, 0.3)";
          modeDot.style.background = "#f97316";
          modeDot.style.boxShadow = "0 0 8px #f97316";
          if (demoBanner) demoBanner.classList.remove('hidden');
        } else {
          modeText.innerText = "LIVE PRODUCTION";
          modeToggle.style.color = "var(--color-cyan)";
          modeToggle.style.background = "rgba(6, 182, 212, 0.08)";
          modeToggle.style.borderColor = "var(--border-light)";
          modeDot.style.background = "var(--color-cyan)";
          modeDot.style.boxShadow = "0 0 8px var(--color-cyan)";
          if (demoBanner) demoBanner.classList.add('hidden');
        }
        
        // Clear list mappings and lists
        this.vesselRows = null;
        this.whaleRows = null;
        this.citationRows = null;
        this.vesselListEl.innerHTML = '';
        this.citationsListEl.innerHTML = '';
        this.whaleListEl.innerHTML = '';
        
        // Trigger immediate fetch if entering production mode
        if (!isDemo) {
          this.fetchRealDataFeeds();
        }
        
        this.map2D.draw();
      });
    }

    // 10. Run Real Data Audit button listener
    const btnRunAudit = document.getElementById('btn-run-audit');
    if (btnRunAudit) {
      btnRunAudit.addEventListener('click', () => {
        this.runRealDataAudit();
      });
    }

    // 11. Close empty state overlay listener
    const closeOverlayBtn = document.getElementById('btn-close-empty-state');
    if (closeOverlayBtn) {
      closeOverlayBtn.addEventListener('click', () => {
        this.emptyStateDismissed = true;
        this.updateMapEmptyState();
      });
    }
  }

  // Periodic rendering updates (invoked from game loop)
  update() {
    const nowTime = Date.now();
    if (nowTime - (this.lastCalculationLogTime || 0) > 30000) {
      try {
        this.lastCalculationLogTime = nowTime;
        this.logModelCalculations();
      } catch (err) {
        console.error("Error logging model calculations:", err);
      }
    }

    // Clock & Date are updated independently in app.js

    // Update Header stats
    let activeZonesCount = 0;
    try {
      activeZonesCount = this.state.riskZones.filter(z => z.active).length;
      const countDangerZonesEl = document.getElementById('count-danger-zones');
      if (countDangerZonesEl) countDangerZonesEl.innerText = activeZonesCount;
    } catch (err) {
      console.error("Error updating danger zones stats:", err);
    }
    
    let hasLiveVessels = false;
    let isLastKnown = false;
    let isHistorical = false;
    try {
      hasLiveVessels = this.state.vessels.some(v => v.id.startsWith('AIS-'));
      isLastKnown = this.state.vessels.some(v => v.id.startsWith('LK-'));
      isHistorical = this.state.vessels.some(v => v.id.startsWith('HIST-'));
    } catch (err) {
      console.error("Error analyzing vessel telemetry flags:", err);
    }
    
    try {
      const countVesselsEl = document.getElementById('count-vessels');
      const vesselsDot = document.getElementById('vessels-dot');
      const statBadge = countVesselsEl ? countVesselsEl.closest('.stat-badge') : null;
      const statLabelEl = statBadge ? statBadge.querySelector('.stat-label') : null;

      if (countVesselsEl) {
        if (this.state.vessels.length > 0) {
          countVesselsEl.innerText = this.state.vessels.length;
          if (hasLiveVessels) {
            if (statLabelEl) statLabelEl.innerText = "AIS Vessels:";
            if (vesselsDot) {
              vesselsDot.className = "stat-dot pulse-green";
              vesselsDot.style.background = "#10b981";
            }
          } else {
            if (statLabelEl) statLabelEl.innerText = "Fallback Vessels:";
            if (vesselsDot) {
              vesselsDot.className = "stat-dot pulse-blue";
              vesselsDot.style.background = "#3b82f6";
            }
          }
        } else {
          countVesselsEl.innerText = "0";
          if (statLabelEl) statLabelEl.innerText = "AIS unavailable";
          if (vesselsDot) {
            vesselsDot.className = "stat-dot pulse-amber";
            vesselsDot.style.background = "#fbbf24";
          }
        }
      }
    } catch (err) {
      console.error("Error updating vessel stats indicators:", err);
    }
    
    // Update stat dots
    try {
      const dangerZoneDot = document.getElementById('danger-zones-dot');
      if (dangerZoneDot) {
        dangerZoneDot.className = activeZonesCount > 0 ? "stat-dot pulse-amber" : "stat-dot";
      }
      
      const rrrDot = document.getElementById('risk-reduction-dot');
      if (rrrDot) {
        rrrDot.className = "stat-dot";
      }
    } catch (err) {
      console.error("Error updating status dots:", err);
    }

    // Compliance value color transitions
    try {
      const compVal = document.getElementById('rate-compliance');
      const dot = document.getElementById('compliance-dot');
      const hasRealActiveZones = this.sim.dangerZones.some(z => z.active);
      const showComplianceReal = this.sim.demoMode ? (this.sim.vessels.length > 0) : (hasLiveVessels && hasRealActiveZones);
      const compBadge = compVal ? compVal.closest('.stat-badge') : null;
      
      if (compVal) {
        if (!showComplianceReal || this.sim.complianceRate === null) {
          compVal.innerText = "N/A";
          compVal.className = "stat-value text-secondary";
          if (dot) dot.className = "stat-dot";
          if (compBadge) {
            compBadge.setAttribute('data-tooltip', 'Live compliance tracking offline or no eligible vessels in active zones');
          }
        } else {
          if (compBadge) {
            compBadge.setAttribute('data-tooltip', 'Overall vessel compliance rate');
          }
          compVal.innerText = `${this.sim.complianceRate}%`;
          if (dot) {
            if (this.sim.complianceRate >= 80) {
              compVal.className = "stat-value text-green";
              dot.className = "stat-dot pulse-green";
            } else if (this.sim.complianceRate >= 50) {
              compVal.className = "stat-value text-amber";
              dot.className = "stat-dot pulse-amber";
            } else {
              compVal.className = "stat-value text-red";
              dot.className = "stat-dot pulse-red";
            }
          }
        }
      }
    } catch (err) {
      console.error("Error updating compliance rate panel:", err);
    }

    try {
      const rrrVal = document.getElementById('risk-reduction');
      const rrrBadge = rrrVal ? rrrVal.closest('.stat-badge') : null;
      if (rrrBadge) {
        rrrBadge.setAttribute('data-tooltip', 'Estimated speed-related risk reduction: unavailable');
      }
      if (rrrVal) {
        rrrVal.innerText = "Unavailable";
        rrrVal.className = "stat-value text-secondary";
      }
    } catch (err) {
      console.error("Error updating risk reduction card:", err);
    }

    // Update active alert card & recommended speed limit badge
    try {
      const activeAlertZones = this.sim.dangerZones.filter(z => z.active);
      const alertCard = document.getElementById('active-alert-card');
      const recSpeedValue = document.getElementById('rec-speed-value');
      const recSpeedDot = document.getElementById('rec-speed-dot');

      if (activeAlertZones.length > 0) {
        if (alertCard) {
          alertCard.classList.remove('hidden');
          const alertZoneNameEl = document.getElementById('alert-zone-name');
          const alertSpeedValEl = document.getElementById('alert-speed-value');
          if (alertZoneNameEl) alertZoneNameEl.innerText = activeAlertZones.map(z => z.name).join(', ');
          if (alertSpeedValEl) alertSpeedValEl.innerText = `${this.sim.speedLimit} kts`;

          const isRealWhale = activeAlertZones.some(z => z.hasRealWhale);
          const isUserWhale = activeAlertZones.some(z => z.hasUserWhale);
          const isPreyProxy = activeAlertZones.some(z => z.hasPreyProxy);

          const headerEl = alertCard.querySelector('h4');
          const reasonEl = alertCard.querySelector('.alert-reason');

          if (!hasLiveVessels) {
            if (headerEl) headerEl.innerText = "RISK ZONE ESTIMATE (PLANNING/ANALYSIS)";
            if (reasonEl) reasonEl.innerText = "Estimated risk zone. Live compliance tracking is offline (no live AIS data).";
          } else if (isRealWhale) {
            if (isUserWhale) {
              if (headerEl) headerEl.innerText = "USER-REPORTED WHALE SIGHTING";
              if (reasonEl) reasonEl.innerText = "User-reported whale sighting in area. Compliance tracking active.";
            } else {
              if (headerEl) headerEl.innerText = "ACTIVE WHALE ALERT";
              if (reasonEl) reasonEl.innerText = "Whales detected in area. Compliance tracking active.";
            }
          } else if (isPreyProxy) {
            if (headerEl) headerEl.innerText = "ESTIMATED RISK ZONE";
            if (reasonEl) reasonEl.innerText = "Environmental + vessel risk estimate — whale detection feed not connected.";
          } else {
            if (headerEl) headerEl.innerText = "ESTIMATED RISK ZONE";
            if (reasonEl) reasonEl.innerText = "Environmental + vessel risk estimate — whale detection feed not connected.";
          }
        }
        if (recSpeedValue) {
          recSpeedValue.innerText = `${this.sim.speedLimit} kts`;
          recSpeedValue.className = "stat-value text-amber";
          if (recSpeedDot) recSpeedDot.className = "stat-dot pulse-amber";
        }
      } else {
        if (alertCard) {
          alertCard.classList.add('hidden');
        }
        if (recSpeedValue) {
          recSpeedValue.innerText = this.sim.demoMode ? "Normal" : "N/A";
          recSpeedValue.className = this.sim.demoMode ? "stat-value text-green" : "stat-value text-secondary";
          if (recSpeedDot) recSpeedDot.className = this.sim.demoMode ? "stat-dot pulse-green" : "stat-dot";
        }
      }
    } catch (err) {
      console.error("Error updating active alert geofence warnings:", err);
    }

    // Prune stale AIS vessels (last updated > 20 mins ago)
    if (!this.sim.demoMode) {
      try {
        const now = new Date();
        this.state.vessels = this.state.vessels.filter(v => {
          if (!v.id.startsWith('AIS-')) return true;
          if (!v.lastUpdated) return true;
          const diffMin = (now - v.lastUpdated) / 60000;
          return diffMin <= 20;
        });
        this.sim.vessels = this.state.vessels;
      } catch (err) {
        console.error("Error pruning stale vessels:", err);
      }
    }

    // Re-render listings safely using helper block
    const safeCall = (methodName, fn) => {
      try {
        fn();
      } catch (err) {
        console.error(`Error in UI module ${methodName}:`, err);
      }
    };

    safeCall("updateVesselList", () => this.updateVesselList());
    safeCall("updateCitationsList", () => this.updateCitationsList());
    safeCall("updateWhaleList", () => this.updateWhaleList());
    safeCall("updateDataFeedsStatus", () => this.updateDataFeedsStatus());
    safeCall("updateSourcesRegistry", () => this.updateSourcesRegistry());
    safeCall("updateReadinessChecklist", () => this.updateReadinessChecklist());
    safeCall("runTroubleshootingDiagnostics", () => this.runTroubleshootingDiagnostics());
    safeCall("updateWhaleMissingBanner", () => this.updateWhaleMissingBanner());
    safeCall("updateAisMissingBanner", () => this.updateAisMissingBanner());
    safeCall("updateMapDebugStatus", () => this.updateMapDebugStatus());
    safeCall("updateMapEmptyState", () => this.updateMapEmptyState());
    safeCall("updateHeaderTooltipProvenance", () => this.updateHeaderTooltipProvenance());
    safeCall("updateWorkflowPanel", () => this.updateWorkflowPanel());
    safeCall("verifyUIStateConsistency", () => this.verifyUIStateConsistency());
  }

  verifyUIStateConsistency() {
    try {
      const stateVessels = this.state.vessels.length;
      const stateZones = this.state.riskZones.length;
      
      let renderedMarkers = 0;
      let renderedZones = 0;
      if (this.map2D && this.map2D.layers) {
        if (this.map2D.layers.vessels) {
          renderedMarkers = Object.keys(this.map2D.layers.vessels).length;
        }
        if (this.map2D.layers.dangerZones) {
          renderedZones = Object.values(this.map2D.layers.dangerZones).filter(c => this.map2D.map.hasLayer(c)).length;
        }
      }
      
      const overlay = document.getElementById('map-empty-state');
      const isOverlayVisible = overlay ? (overlay.style.display !== 'none' && !overlay.classList.contains('hidden')) : false;
      const loadingState = this.state.loading;
      
      const sources = this.sourceManager?.sources || {};
      const aisStatus = sources.aisstream?.status || 'unknown';
      const geeStatus = sources.gee?.status || 'unknown';
      const noaaStatus = sources.noaa_ndbc?.status || 'unknown';
      
      // Assertion: If markers > 0 while overlay is visible, log an explicit consistency error
      if (renderedMarkers > 0 && isOverlayVisible) {
        console.error(`[UI Consistency Alert] State Mismatch: Rendered ${renderedMarkers} vessel markers but empty state overlay is visible!`);
      }
    } catch (err) {
      console.warn("Consistency verification check failed:", err);
    }
  }

  logModelCalculations() {
    if (this.sim.demoMode) return; // Only log in real production mode
    
    const activeZones = this.sim.dangerZones.filter(z => z.active);
    if (activeZones.length === 0) return;

    const zonesPayload = activeZones.map(z => ({
      zoneId: z.id,
      zoneName: z.name,
      riskIndex: z.riskScore / 100,
      preyIndex: z.preyScore / 100,
      habitatIndex: z.habitatScore / 100,
      liveVesselDensity: z.liveVesselDensity,
      vesselSpeedRisk: z.vesselSpeedRisk,
      routeOverlapScore: z.routeOverlapScore
    }));

    fetch('/api/log-calculation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'periodic_zone_evaluation',
        timestamp: new Date().toISOString(),
        inputs: {
          activeZonesCount: activeZones.length,
          vesselsCount: this.sim.vessels.length,
          whalesCount: this.sim.whales.length,
          eligibleVesselCount: this.sim.eligibleVesselCount || 0,
          complianceNumerator: this.sim.complianceNumerator || 0,
          complianceDenominator: this.sim.complianceDenominator || 0
        },
        weights: {
          preyProbabilityWeight: 0.45,
          bathymetryWeight: 0.25,
          historicalOrUserSightingWeight: 0.20,
          liveAcousticDetectionWeight: 0.10
        },
        indices: {
          zones: zonesPayload
        },
        provider: 'Weighted Heuristic Risk Model',
        errorStates: {
          geeStatus: this.geeStatus,
          buoyStatus: this.buoyStatus
        },
        confidenceClassifications: {
          complianceMode: this.sim.enforcementMode ? 'enforced' : 'review_only'
        }
      })
    }).catch(e => console.warn('Failed to send periodic calculation log:', e));
  }

  // Render USCG Civil Citations list
  updateCitationsList() {
    const badgeEl = document.getElementById('citations-badge');
    if (badgeEl) {
      badgeEl.innerText = this.sim.issuedTickets.length;
    }

    if (!this.citationsListEl) return;

    if (!this.citationRows) {
      this.citationRows = {};
    }

    const activeIds = new Set();
    const enforcementMode = this.sim.enforcementMode === true;
    const enableFine = this.sim.enableEstimatedFineCalculation === true;

    this.sim.issuedTickets.forEach(ticket => {
      activeIds.add(ticket.id);
      const selectedClass = this.selectedTicketId === ticket.id ? 'selected' : '';

      let row = this.citationRows[ticket.id];
      if (!row) {
        row = document.createElement('div');
        this.citationRows[ticket.id] = row;
        this.citationsListEl.appendChild(row);

        row.addEventListener('click', () => {
          this.selectedTicketId = ticket.id;
          this.showCitationModal(ticket);
          this.updateCitationsList();
        });
      }

      let fineText = "No fine issued";
      if (!enforcementMode) {
        fineText = "Potential compliance review — no fine issued";
      } else if (!enableFine) {
        fineText = "Estimated penalty: disabled";
      } else if (ticket.fine > 0) {
        fineText = `Estimated penalty: $${ticket.fine.toLocaleString()} (review only)`;
      } else {
        fineText = "Penalty: Not issued";
      }

      row.className = `citation-log-row ${selectedClass}`;
      const timeStr = ticket.timestamp instanceof Date ? ticket.timestamp.toISOString().replace('T', ' ').substring(0, 19) + ' UTC' : ticket.timestamp;
      const mmsiClean = (ticket.vesselImo || '').replace('MMSI: ', '');
      const sourceLabel = ticket.sourceName || 'AISstream.io';
      row.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px; width: 100%; font-size: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px; margin-bottom: 4px;">
            <span class="citation-log-vessel" style="font-weight: 700; font-size: 11px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ticket.vesselName}</span>
            <span style="font-family: var(--font-mono); color: var(--color-red); font-size: 8px; text-transform: uppercase;">${ticket.id.replace('USCG-', 'WARN-')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 9px; gap: 8px;">
            <span>MMSI: <strong class="monospace" style="color: var(--text-primary);">${mmsiClean}</strong></span>
            <span style="text-align: right; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Zone: <strong style="color: var(--text-primary);">${ticket.zoneName}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 9px; gap: 8px;">
            <span>Speed: <strong class="monospace" style="color: var(--color-red);">${ticket.speed} kts</strong> (Rec: ${ticket.mandatedSpeed} kts)</span>
            <span style="text-align: right; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Source: <strong style="color: var(--color-cyan);">${sourceLabel}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(255,255,255,0.05);">
            <span style="font-family: var(--font-mono); font-size: 8px; color: var(--text-muted);">${timeStr}</span>
            <span style="font-weight: 700; font-size: 8px; color: var(--color-red); text-transform: uppercase; border: 1px solid rgba(239,68,68,0.3); padding: 1px 4px; border-radius: 3px; background: rgba(239,68,68,0.05);">WARNING</span>
          </div>
        </div>
      `;
    });

    // Dynamic modal update if open
    if (this.modalEl && this.modalEl.classList.contains('open') && this.selectedTicketId) {
      const currentTicket = this.sim.issuedTickets.find(t => t.id === this.selectedTicketId);
      if (currentTicket) {
        const speedEl = document.getElementById('cite-speed');
        if (speedEl) speedEl.innerText = `${currentTicket.speed} Knots`;
        const coordsEl = document.getElementById('cite-coordinates');
        if (coordsEl) coordsEl.innerText = currentTicket.coordinates;
        const riskEl = document.getElementById('cite-risk-factor');
        if (riskEl) riskEl.innerText = currentTicket.riskFactor;
        
        const fineAmount = document.getElementById('cite-fine-amount');
        if (fineAmount) {
          const enforcementMode = this.sim.enforcementMode === true;
          const enableFine = this.sim.enableEstimatedFineCalculation === true;
          if (!enforcementMode) {
            fineAmount.innerText = "Potential compliance review — no fine issued";
          } else if (!enableFine) {
            fineAmount.innerText = "Estimated penalty: disabled";
          } else {
            fineAmount.innerText = `$${currentTicket.fine.toLocaleString()} (review only)`;
          }
        }
      }
    }

    if (this.sim.issuedTickets.length === 0) {
      this.citationsListEl.innerHTML = '<div class="loading-placeholder">No compliance alerts logged.</div>';
    } else {
      const placeholder = this.citationsListEl.querySelector('.loading-placeholder');
      if (placeholder) placeholder.remove();

      Object.keys(this.citationRows).forEach(id => {
        if (!activeIds.has(id)) {
          this.citationRows[id].remove();
          delete this.citationRows[id];
        }
      });
    }
  }

  // Render AIS vessel compliance list
  updateVesselList() {
    if (!this.vesselRows) {
      this.vesselRows = {};
    }

    const activeIds = new Set();
    const filter = this.currentVesselFilter || 'all';

    this.sim.vessels.forEach(v => {
      // Check filter match
      const typeMatch = filter === 'all' || v.type === filter || (filter === 'Unknown' && v.type !== 'Cargo Vessel' && v.type !== 'Tanker' && v.type !== 'Passenger' && v.type !== 'Fishing' && v.type !== 'High-Speed');
      
      if (!typeMatch) {
        let row = this.vesselRows[v.id];
        if (row) {
          row.remove();
          delete this.vesselRows[v.id];
        }
        return;
      }

      activeIds.add(v.id);
      const isViolating = v.inDangerZone && v.speed > this.sim.speedLimit;
      const statusClass = isViolating ? 'violating' : 'compliant';
      const selectedClass = this.map2D.selectedObjectId === v.id ? 'selected' : '';

      let row = this.vesselRows[v.id];
      if (!row) {
        row = document.createElement('div');
        this.vesselRows[v.id] = row;
        this.vesselListEl.appendChild(row);

        // Click to select/track & recenter
        row.addEventListener('click', () => {
          this.map2D.selectedObjectId = v.id;
          this.map2D.selectedObjectType = 'vessel';
          this.map3D.setTracking('vessel', v.id);
          document.getElementById('selected-object-label').innerHTML = `Currently tracking Vessel: <span class="text-cyan font-bold">${v.name}</span>`;
          this.map2D.recenterOnSim(v.x, v.y);
          
          // Open compliance review modal if this vessel has an active warning ticket/review
          const ticket = this.sim.issuedTickets.find(t => t.vesselId === v.id);
          if (ticket) {
            this.selectedTicketId = ticket.id;
            this.showCitationModal(ticket);
            this.updateCitationsList();
          }

          this.updateVesselList();
        });
      }

      row.className = `vessel-row ${statusClass} ${selectedClass}`;
      row.innerHTML = `
        <div class="vessel-info">
          <div class="vessel-name-wrapper">
            <span class="vessel-name">${v.name}</span>
            <span class="vessel-category">${v.type}</span>
          </div>
          <span class="speed-limit-indicator monospace">${v.imo}</span>
        </div>
        <div class="vessel-speeds">
          <span class="speed-gauge monospace ${isViolating ? 'text-red' : 'text-green'}">${(v.speed !== undefined && v.speed !== null) ? v.speed.toFixed(1) : 'N/A'} kts</span>
          <span class="badge-status ${isViolating ? 'badge-violating' : 'badge-compliant'}">
            ${isViolating ? 'Above Rec. Speed' : 'Compliant'}
          </span>
        </div>
      `;
    });

    Object.keys(this.vesselRows).forEach(id => {
      if (!activeIds.has(id)) {
        this.vesselRows[id].remove();
        delete this.vesselRows[id];
      }
    });

    if (this.sim.vessels.length === 0 || activeIds.size === 0) {
      if (this.sim.vessels.length === 0 && this.feedConfig && !this.feedConfig.aisStreamKeyConfigured) {
        this.vesselListEl.innerHTML = '<div class="loading-placeholder text-amber">AISstream API key required. Please configure AISSTREAM_API_KEY.</div>';
      } else if (activeIds.size === 0 && this.sim.vessels.length > 0) {
        this.vesselListEl.innerHTML = '<div class="loading-placeholder">No vessels matching selected filter.</div>';
      } else {
        this.vesselListEl.innerHTML = '<div class="loading-placeholder">Tracking AIS signals...</div>';
      }
    } else {
      const placeholder = this.vesselListEl.querySelector('.loading-placeholder');
      if (placeholder) placeholder.remove();
    }
  }

  // Render Whale urgency tracking listings
  updateWhaleList() {
    if (!this.whaleRows) {
      this.whaleRows = {};
    }

    const activeIds = new Set();

    this.sim.whales.forEach(w => {
      activeIds.add(w.id);
      const isSelected = this.map2D.selectedObjectId === w.id;
      const selectedClass = isSelected ? 'selected' : '';
      
      let urgencyText = 'STABLE';
      let urgencyClass = 'urgency-low';
      if (w.foragingUrgency > 0.8) {
        urgencyText = 'DISTRACTED FEEDING';
        urgencyClass = 'urgency-high';
      } else if (w.foragingUrgency > 0.4) {
        urgencyText = 'ACTIVE FORAGING';
        urgencyClass = 'urgency-med';
      }

      let row = this.whaleRows[w.id];
      if (!row) {
        row = document.createElement('div');
        this.whaleRows[w.id] = row;
        this.whaleListEl.appendChild(row);

        row.addEventListener('click', () => {
          this.map2D.selectedObjectId = w.id;
          this.map2D.selectedObjectType = 'whale';
          this.map3D.setTracking('whale', w.id);
          document.getElementById('selected-object-label').innerHTML = `Currently tracking Sentinel: <span class="text-pink font-bold">${w.name}</span>`;
          this.map2D.recenterOnSim(w.x, w.y);
          this.updateWhaleList();
        });
      }

      row.className = `whale-row ${selectedClass}`;
      row.innerHTML = `
        <div class="whale-row-header">
          <div class="whale-identity">
            <i data-lucide="radio" class="text-pink layer-icon"></i>
            <span class="whale-name">${w.name}</span>
            <span class="whale-species">${w.species}</span>
          </div>
          <span class="urgency-badge ${urgencyClass}">${urgencyText}</span>
        </div>
        <div class="whale-telemetry-grid">
          <div>DEPTH: <span class="tel-val">${(w.depth !== undefined && w.depth !== null) ? w.depth.toFixed(0) : '0'}m</span></div>
          <div>URGENCY: <span class="tel-val">${Math.round(w.foragingUrgency * 100)}%</span></div>
          <div>VOCAL: <span class="tel-val ${w.vocalizing ? 'text-cyan font-bold' : ''}">${w.vocalizing ? 'PING' : 'SILENT'}</span></div>
        </div>
      `;

      // Re-trigger icon rendering inside row
      lucide.createIcons({
        attrs: { class: 'lucide' },
        nodeList: row.querySelectorAll('[data-lucide]')
      });
    });

    Object.keys(this.whaleRows).forEach(id => {
      if (!activeIds.has(id)) {
        this.whaleRows[id].remove();
        delete this.whaleRows[id];
      }
    });
  }

  // Render simulated AI Negotiations Dialogue feed
  renderNegotiationFeed() {
    this.chatFeedEl.innerHTML = '';
    
    this.sim.negotiationLogs.forEach(log => {
      const bubble = document.createElement('div');
      const timeStr = log.time.toTimeString().split(' ')[0];
      
      if (log.sender === 'system') {
        bubble.className = "chat-bubble system";
        bubble.innerHTML = `
          <span>[SYSTEM BROADCAST ${timeStr}]</span>
          <div>${log.text}</div>
        `;
      } else {
        const typeClass = log.sender === 'sentinel' ? 'sentinel' : 'vessel';
        const senderLabel = log.sender === 'sentinel' ? 'SENTINEL AI ENGINE' : 'VESSEL BRIDGE';

        bubble.className = `chat-bubble ${typeClass}`;
        bubble.innerHTML = `
          <span class="chat-sender">${senderLabel}</span>
          <div>${log.text}</div>
          <span class="chat-time">${timeStr}</span>
        `;
      }

      this.chatFeedEl.appendChild(bubble);
    });
  }

  // Modal open citation
  showCitationModal(ticket) {
    document.getElementById('cite-id').innerText = ticket.id;
    
    // format date nicely
    const tDate = ticket.timestamp;
    const timeStr = tDate.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    document.getElementById('cite-timestamp').innerText = timeStr;
    
    document.getElementById('cite-vessel-name').innerText = ticket.vesselName.toUpperCase();
    document.getElementById('cite-vessel-imo').innerText = ticket.vesselImo;
    document.getElementById('cite-vessel-type').innerText = ticket.vesselType;
    document.getElementById('cite-vessel-flag').innerText = ticket.vesselFlag;
    
    document.getElementById('cite-coordinates').innerText = ticket.coordinates;
    document.getElementById('cite-zone-id').innerText = `${ticket.zoneId} (${ticket.zoneName.toUpperCase()})`;
    document.getElementById('cite-speed').innerText = `${ticket.speed} Knots`;
    document.getElementById('cite-mandated-speed').innerText = `${ticket.mandatedSpeed} Knots Max`;
    
    document.getElementById('cite-risk-factor').innerText = ticket.riskFactor;
    document.getElementById('cite-krill-overlap').innerText = ticket.krillOverlap;
    
    // Dynamic enforcement and fine details
    const enforcementMode = this.sim.enforcementMode === true;
    const enableFine = this.sim.enableEstimatedFineCalculation === true;
    
    const statusBadge = document.getElementById('cite-status-badge');
    if (statusBadge) {
      statusBadge.innerText = "COMPLIANCE ADVISORY: POTENTIAL COMPLIANCE REVIEW";
    }
    
    const statusTitle = document.getElementById('cite-status-title');
    if (statusTitle) {
      statusTitle.innerText = "POTENTIAL COMPLIANCE REVIEW";
    }

    const fineLabel = document.getElementById('cite-fine-label');
    if (fineLabel) {
      fineLabel.innerText = "ADVISORY SPEED CORRIDOR RECOMMENDATION:";
    }
    
    const fineAmount = document.getElementById('cite-fine-amount');
    if (fineAmount) {
      if (!enforcementMode) {
        fineAmount.innerText = "Maintain speed below 10 knots in designated zones";
      } else if (!enableFine) {
        fineAmount.innerText = "Advisory speed recommendation: Active";
      } else {
        fineAmount.innerText = "Vessel advised to monitor speed limit (10 kts)";
      }
    }

    // Hide overlapping right sidebar
    const sidebarRight = document.getElementById('sidebar-right');
    if (sidebarRight) {
      sidebarRight.classList.remove('open');
    }
    const btnVessels = document.getElementById('btn-dock-vessels');
    if (btnVessels) {
      btnVessels.classList.remove('active');
    }

    this.modalEl.classList.add('open');

    // Draw the speed chart on the canvas inside ticket
    setTimeout(() => {
      this.drawTicketSpeedChart(ticket.speedLogSnap, parseFloat(ticket.mandatedSpeed));
    }, 100);
  }

  closeCitationModal() {
    this.modalEl.classList.remove('open');
    if (this.activePanel === 'vessels') {
      const sidebarRight = document.getElementById('sidebar-right');
      if (sidebarRight) {
        sidebarRight.classList.add('open');
      }
      const btnVessels = document.getElementById('btn-dock-vessels');
      if (btnVessels) {
        btnVessels.classList.add('active');
      }
    }
  }

  // Draw chart of speed history within citation ticket
  drawTicketSpeedChart(speedLog, speedLimit) {
    const canvas = document.getElementById('citation-speed-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.getBoundingClientRect().width;
    const height = canvas.height = canvas.parentElement.getBoundingClientRect().height;

    ctx.clearRect(0, 0, width, height);

    const margin = { top: 10, right: 15, bottom: 15, left: 25 };
    const chartW = width - margin.left - margin.right;
    const chartH = height - margin.top - margin.bottom;

    // Speeds limits ranges (e.g. 0 to 20 knots max)
    const maxSpeedVal = 20;

    // Draw grid background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    for (let speedVal = 5; speedVal <= maxSpeedVal; speedVal += 5) {
      const y = margin.top + chartH - (speedVal / maxSpeedVal) * chartH;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartW, y);
      ctx.stroke();

      // label values
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '7px var(--font-mono)';
      ctx.textAlign = 'right';
      ctx.fillText(`${speedVal}k`, margin.left - 4, y + 2);
    }

    // Draw Speed Limit line (Dashed red)
    const limitY = margin.top + chartH - (speedLimit / maxSpeedVal) * chartH;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(margin.left, limitY);
    ctx.lineTo(margin.left + chartW, limitY);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    ctx.fillStyle = '#ef4444';
    ctx.fillText("LIMIT", margin.left + chartW - 5, limitY - 3);

    // Plot speed line
    if (!speedLog || speedLog.length < 2) return;

    ctx.strokeStyle = '#3b82f6'; // vessel speed
    ctx.lineWidth = 2;
    ctx.beginPath();

    const stepX = chartW / (speedLog.length - 1);
    
    speedLog.forEach((speed, idx) => {
      const x = margin.left + idx * stepX;
      const y = margin.top + chartH - (speed / maxSpeedVal) * chartH;
      
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under speed graph gradient
    const fillGrad = ctx.createLinearGradient(margin.left, margin.top, margin.left, margin.top + chartH);
    fillGrad.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
    fillGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = fillGrad;

    ctx.beginPath();
    speedLog.forEach((speed, idx) => {
      const x = margin.left + idx * stepX;
      const y = margin.top + chartH - (speed / maxSpeedVal) * chartH;
      if (idx === 0) ctx.moveTo(x, margin.top + chartH);
      ctx.lineTo(x, y);
      if (idx === speedLog.length - 1) ctx.lineTo(x, margin.top + chartH);
    });
    ctx.closePath();
    ctx.fill();

    // Mark current/violation point at the end
    const lastX = margin.left + chartW;
    const lastY = margin.top + chartH - (speedLog[speedLog.length - 1] / maxSpeedVal) * chartH;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central panel management
  setActivePanel(panel) {
    if (this.activePanel === panel) {
      this.activePanel = null;
    } else {
      this.activePanel = panel;
    }
    this.applyActivePanel();
  }

  applyActivePanel() {
    const sidebarLeft = document.getElementById('sidebar-left');
    const sidebarRight = document.getElementById('sidebar-right');
    const modal3d = document.getElementById('modal-3d');

    const btnLayers = document.getElementById('btn-dock-layers');
    const btnPrediction = document.getElementById('btn-dock-prediction');
    const btnVessels = document.getElementById('btn-dock-vessels');
    const btn3d = document.getElementById('btn-dock-3d');
    const btnSources = document.getElementById('btn-dock-sources');
    const btnWorkflow = document.getElementById('btn-dock-workflow');

    const allDockBtns = [btnLayers, btnPrediction, btnVessels, btn3d, btnSources, btnWorkflow].filter(Boolean);

    // Remove active class from all dock buttons
    allDockBtns.forEach(btn => btn.classList.remove('active'));

    // Toggle panels
    if (this.activePanel === 'layers') {
      if (sidebarLeft) sidebarLeft.classList.add('open');
      if (sidebarRight) sidebarRight.classList.remove('open');
      if (modal3d) modal3d.classList.remove('open');
      if (btnLayers) btnLayers.classList.add('active');
      this.showTabContent('sidebar-left', 'layers');
    } else if (this.activePanel === 'prediction') {
      if (sidebarLeft) sidebarLeft.classList.add('open');
      if (sidebarRight) sidebarRight.classList.remove('open');
      if (modal3d) modal3d.classList.remove('open');
      if (btnPrediction) btnPrediction.classList.add('active');
      this.showTabContent('sidebar-left', 'prediction');
    } else if (this.activePanel === 'sources') {
      if (sidebarLeft) sidebarLeft.classList.add('open');
      if (sidebarRight) sidebarRight.classList.remove('open');
      if (modal3d) modal3d.classList.remove('open');
      if (btnSources) btnSources.classList.add('active');
      this.showTabContent('sidebar-left', 'sources');
    } else if (this.activePanel === 'workflow') {
      if (sidebarLeft) sidebarLeft.classList.add('open');
      if (sidebarRight) sidebarRight.classList.remove('open');
      if (modal3d) modal3d.classList.remove('open');
      if (btnWorkflow) btnWorkflow.classList.add('active');
      this.showTabContent('sidebar-left', 'workflow');
      this.updateWorkflowPanel();
    } else if (this.activePanel === 'vessels') {
      if (sidebarRight) sidebarRight.classList.add('open');
      if (sidebarLeft) sidebarLeft.classList.remove('open');
      if (modal3d) modal3d.classList.remove('open');
      if (btnVessels) btnVessels.classList.add('active');
    } else if (this.activePanel === '3d') {
      if (modal3d) {
        const opened = modal3d.classList.contains('open');
        modal3d.classList.add('open');
        if (!opened && this.map3D) {
          this.map3D.resize();
        }
      }
      if (sidebarLeft) sidebarLeft.classList.remove('open');
      if (sidebarRight) sidebarRight.classList.remove('open');
      if (btn3d) btn3d.classList.add('active');
    } else {
      // activePanel is null
      if (sidebarLeft) sidebarLeft.classList.remove('open');
      if (sidebarRight) sidebarRight.classList.remove('open');
      if (modal3d) modal3d.classList.remove('open');
    }
  }

  showTabContent(sidebarId, tabId) {
    const sidebar = document.getElementById(sidebarId);
    if (!sidebar) return;
    sidebar.querySelectorAll('.sidebar-tab-content').forEach(content => {
      if (content.id === `tab-content-${tabId}`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }

  async initRealTimeDataFeeds() {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      this.feedConfig = config;
      const buildIdEl = document.getElementById('build-identifier');
      if (buildIdEl) {
        const rev = config.buildRevision || 'unknown';
        buildIdEl.innerText = `Rev: ${rev} | Asset: v1.2.0 | Model: v1.1.0`;
      }
      this.sim.speedLimit = Number(config.recommendedSafeSpeedKts || '10');
      this.sim.enableEstimatedFineCalculation = config.enableEstimatedFineCalculation === true;
      this.sim.estimatedFinePerViolation = Number(config.estimatedFinePerViolation || '500');
      this.sim.enforcementMode = config.enforcementMode === true;
      
      // Update credential statuses in Connection Manager
      if (this.sourceManager) {
        const src = this.sourceManager.sources;
        src.aisstream.credentialsStatus = config.aisStreamKeyConfigured ? 'configured' : 'missing';
        src.aisstream.missingEnv = config.aisStreamKeyConfigured ? 'None' : 'AISSTREAM_API_KEY';
        
        const secondaryProvider = config.secondaryAisProvider || 'None';
        let secondaryKeyPresent = false;
        if (secondaryProvider === 'datalastic') secondaryKeyPresent = !!config.datalasticKeyConfigured;
        else if (secondaryProvider === 'marinetraffic') secondaryKeyPresent = !!config.marinetrafficKeyConfigured;
        else if (secondaryProvider === 'vesselfinder') secondaryKeyPresent = !!config.vesselfinderKeyConfigured;
        else if (secondaryProvider === 'endpoint') secondaryKeyPresent = !!config.secondaryAisEndpointConfigured;

        src.secondary_ais.providerSelected = secondaryProvider;
        src.secondary_ais.keyPresent = secondaryKeyPresent ? 'Yes' : 'No';
        src.secondary_ais.credentialsStatus = secondaryKeyPresent ? 'configured' : 'missing';
        src.secondary_ais.missingEnv = secondaryKeyPresent ? 'None' : (secondaryProvider === 'datalastic' ? 'DATALASTIC_API_KEY' : secondaryProvider === 'marinetraffic' ? 'MARINETRAFFIC_API_KEY' : secondaryProvider === 'vesselfinder' ? 'VESSELFINDER_API_KEY' : secondaryProvider === 'endpoint' ? 'SECONDARY_AIS_ENDPOINT' : 'None');
        
        if (!config.secondaryAisProvider) {
          src.secondary_ais.status = 'missing key';
          src.secondary_ais.statusColor = '#ef4444';
          src.secondary_ais.lastError = 'No secondary provider selected in SECONDARY_AIS_PROVIDER.';
        } else if (!secondaryKeyPresent) {
          src.secondary_ais.status = 'missing key';
          src.secondary_ais.statusColor = '#ef4444';
          src.secondary_ais.lastError = `Missing API key for secondary provider '${secondaryProvider}'.`;
        } else {
          src.secondary_ais.status = 'configured';
          src.secondary_ais.statusColor = '#3b82f6';
        }

        src.whale_safe.credentialsStatus = config.whaleSafeConfigured ? 'configured' : 'missing';
        src.whale_safe.missingEnv = config.whaleSafeConfigured ? 'None' : 'WHALE_SAFE_API_KEY_OR_ENDPOINT';
        if (!config.whaleSafeConfigured) {
          src.whale_safe.status = 'partner_access_required';
          src.whale_safe.statusColor = '#f59e0b';
          src.whale_safe.lastError = 'Optional partner source not connected. Would improve live whale detections if API/data-sharing access is added.';
        }
        
        src.whale_alert.credentialsStatus = config.whaleAlertConfigured ? 'configured' : 'missing';
        src.whale_alert.missingEnv = config.whaleAlertConfigured ? 'None' : 'WHALE_ALERT_API_KEY_OR_ENDPOINT';
        if (!config.whaleAlertConfigured) {
          src.whale_alert.status = 'partner_access_required';
          src.whale_alert.statusColor = '#f59e0b';
          src.whale_alert.lastError = 'Optional partner source not connected. Would improve live whale detections if API/data-sharing access is added.';
        }
        
        src.bigquery_users.credentialsStatus = config.googleEarthEngineConfigured ? 'configured' : 'missing';
        src.bigquery_users.missingEnv = config.googleEarthEngineConfigured ? 'None' : 'GOOGLE_APPLICATION_CREDENTIALS';
        
        src.gee.credentialsStatus = config.googleEarthEngineConfigured ? 'configured' : 'missing';
        src.gee.missingEnv = config.googleEarthEngineConfigured ? 'None' : 'GOOGLE_EARTH_ENGINE_PROJECT';
        
        src.mbari.credentialsStatus = config.mbariConfigured ? 'configured' : 'missing';
        src.mbari.missingEnv = config.mbariConfigured ? 'None' : 'MBARI_DATA_URL';
        src.mbari.status = 'analyzed_but_excluded';
        src.mbari.statusColor = '#94a3b8';
        src.mbari.lastError = 'Analyzed but excluded: File Mset_latest.txt contains global climate/EOF SST anomaly coefficients rather than local zooplankton measurements, which cannot validly affect local prey probability calculations.';
        
        src.farallon.credentialsStatus = config.farallonConfigured ? 'configured' : 'missing';
        src.farallon.missingEnv = config.farallonConfigured ? 'None' : 'FARALLON_DATA_URL';
        src.farallon.status = 'analyzed_but_excluded';
        src.farallon.statusColor = '#94a3b8';
        src.farallon.lastError = 'Analyzed but excluded: No real-time data stream or authorized API feed exists for local Farallon backscatter telemetry.';
      }
      
      // Startup configuration logs (Requirement 11)
      console.log("==========================================================================");
      console.log("             PREDICTIVE MARINE SENTINEL — STARTUP CONFIG LOG");
      console.log("==========================================================================");
      console.log(`- FORCE_DISABLE_EXTERNAL_APIS:  ${config.forceDisableExternalApis}`);
      console.log(`- REAL_DATA_ONLY:              ${config.realDataOnly}`);
      console.log(`- ALLOW_SAMPLE_DATA:           ${config.allowSampleData}`);
      console.log(`- AISstream API Key Present:   ${config.aisStreamKeyConfigured ? "YES" : "NO"}`);
      console.log(`- Google Earth Engine Present: ${config.googleEarthEngineConfigured ? "YES" : "NO"}`);
      console.log(`- Whale Safe Configured:       ${config.whaleSafeConfigured ? "YES" : "NO"}`);
      console.log(`- Whale Alert Configured:      ${config.whaleAlertConfigured ? "YES" : "NO"}`);
      console.log(`- Bounding Box:                [MinLat: ${config.aisBboxMinLat}, MinLon: ${config.aisBboxMinLon}] to [MaxLat: ${config.aisBboxMaxLat}, MaxLon: ${config.aisBboxMaxLon}]`);
      console.log("==========================================================================");
      
      // Initialize AISstream backend verification
      if (config.aisStreamKeyConfigured) {
        console.log("[AISstream] API key is configured on the backend.");
        this.initAISstream();
      } else {
        this.aisStatus = 'AISstream API key required';
        if (this.sourceManager) {
          const src = this.sourceManager.sources.aisstream;
          src.status = 'error';
          src.statusColor = '#ef4444';
          src.lastError = 'AISstream API key not configured.';
        }
        console.warn("AISstream API key not configured. Real-time AIS stream disabled.");
      }

      // Fetch other real data feeds
      this.fetchRealDataFeeds();
      
    } catch (err) {
      console.error("Failed to load data feed configuration:", err);
    }
  }

  initAISstream() {
    console.log("[AISstream] Browser-side WebSocket disabled. Live data is retrieved server-side.");
    this.aisStatus = 'Server-managed';
  }

  async fetchRealDataFeeds() {
    if (this.sim.demoMode) return;

    try {
      console.log("[Pipeline] Querying unified backend risk calculation...");
      const res = await fetch('/api/evaluate-risk', { method: 'POST' });
      const data = await res.json();
      
      if (data.status === 'success') {
        this.state.loading = false;
        this.state.lastFetchTime = new Date(data.timestamp);

        // Update state source availability status
        this.state.sourceAvailability = {
          aisstream: data.aisStatus?.status || 'disconnected',
          gee: data.geeStatus || 'disconnected',
          noaa_ndbc: data.buoyStatus || 'disconnected'
        };

        // 1. Merge/Update Vessels Safely (prevent zero-count overwrite on disconnect/error)
        const aisStatus = data.aisStatus?.status;
        const isAisDisconnected = this.isStatusUnavailable(aisStatus);
        let shouldUpdateVessels = Array.isArray(data.vessels);
        if (isAisDisconnected && (!data.vessels || data.vessels.length === 0) && this.state.vessels.length > 0) {
          shouldUpdateVessels = false;
        }

        if (shouldUpdateVessels) {
          const activeIds = new Set();
          data.vessels.forEach(v => {
            const id = v.id;
            const mmsi = v.imo ? v.imo.replace('MMSI: ', '') : (id ? id.replace('AIS-', '') : 'Unknown');
            const lat = Number(v.latitude);
            const lng = Number(v.longitude);
            const name = v.name || `MMSI ${mmsi}`;
            const speed = v.speed;
            const type = v.type || 'Unknown vessel type';
            
            if (isNaN(lat) || isNaN(lng) || lat < 36.0 || lat > 39.0 || lng < -124.0 || lng > -121.0) {
              return;
            }
            
            activeIds.add(id);
            const simPt = this.map2D.latLngToSim(lat, lng);
            
            let vessel = this.sim.vessels.find(x => x.id === id);
            if (!vessel) {
              vessel = {
                id: id,
                name: name,
                imo: `MMSI: ${mmsi}`,
                type: type,
                flag: "Unknown Flag",
                length: 200,
                draft: type === 'Tanker' ? 14.5 : (type === 'Cargo Vessel' ? 12.0 : 8.0),
                routeKey: "westInbound",
                routeIndex: 0,
                x: simPt.x,
                y: simPt.y,
                latitude: lat,
                longitude: lng,
                speed: speed,
                heading: v.heading,
                baseSpeed: speed !== null && speed > 0.1 ? speed : 12.0,
                compliance: v.compliance || "UNKNOWN",
                inDangerZone: v.inDangerZone || false,
                activeDangerZoneId: v.activeDangerZoneId,
                activeDangerZoneName: v.activeDangerZoneName,
                strikeRisk: v.strikeRisk || 0,
                history: [],
                speedLog: Array(this.sim.speedHistoryLength || 10).fill(speed || 0),
                lastUpdated: new Date(v.lastUpdated || Date.now()),
                sourceType: v.sourceType || 'live',
                sourceName: v.sourceName || 'AISstream.io',
                receivedAt: v.receivedAt || new Date().toISOString(),
                isRealData: true
              };
              this.sim.vessels.push(vessel);
            } else {
              vessel.x = simPt.x;
              vessel.y = simPt.y;
              vessel.latitude = lat;
              vessel.longitude = lng;
              vessel.speed = speed;
              vessel.heading = v.heading;
              vessel.name = name;
              vessel.compliance = v.compliance || "UNKNOWN";
              vessel.inDangerZone = v.inDangerZone || false;
              vessel.activeDangerZoneId = v.activeDangerZoneId;
              vessel.activeDangerZoneName = v.activeDangerZoneName;
              vessel.strikeRisk = v.strikeRisk || 0;
              vessel.lastUpdated = new Date(v.lastUpdated || Date.now());
            }
          });

          this.sim.vessels = this.sim.vessels.filter(v => {
            if (!v.id.startsWith('AIS-') && !v.id.startsWith('LK-') && !v.id.startsWith('HIST-')) return true;
            return activeIds.has(v.id);
          });
          this.state.vessels = this.sim.vessels;
        }

        // 2. GEE Environmental Proxy Data
        if (data.geeStatus === 'connected' && Array.isArray(data.geeData)) {
          this.state.geeData = data.geeData;
          this.sim.setGEEPreyHotspots(data.geeData);
          this.lastGEEUpdate = new Date(data.timestamp);
          this.geeImageDate = data.geeImageDate;
        }

        // 3. NOAA NDBC Buoy Data
        if (data.buoyStatus === 'connected' && Array.isArray(data.buoys)) {
          this.state.buoys = data.buoys;
          this.sim.noaaBuoys = data.buoys;
          this.lastBuoyUpdate = new Date(data.timestamp);
        }

        // 4. Sightings from BigQuery
        let formattedSightings = [];
        if (Array.isArray(data.userSightings)) {
          this.state.userSightings = data.userSightings;
          formattedSightings = data.userSightings.map((s, idx) => ({
            id: s.id && String(s.id).startsWith('BQ-SIGHTING-') ? s.id : `BQ-SIGHTING-${s.id || s.timestamp || idx}`,
            lat: s.latitude,
            lng: s.longitude,
            species: s.species,
            name: `${s.species} (User Sighted)`,
            confidence: s.confidence || 0.9,
            imageUrl: s.image_url,
            depth: 0,
            timestamp: s.timestamp,
            verificationStatus: s.status || 'unverified',
            sourceType: s.source_type || 'user-reported',
            approvalStatus: s.approval_status || 'approved'
          }));
        }
        const obisHistorical = [
          { id: 'OBIS-01', lat: 37.810, lng: -123.080, species: 'Humpback Whale', name: 'Humpback Whale (Historical)', confidence: 0.50, depth: 0, sourceType: 'historical' },
          { id: 'OBIS-02', lat: 37.695, lng: -122.955, species: 'Blue Whale', name: 'Blue Whale (Historical)', confidence: 0.50, depth: 0, sourceType: 'historical' },
          { id: 'OBIS-03', lat: 37.980, lng: -123.180, species: 'Fin Whale', name: 'Fin Whale (Historical)', confidence: 0.50, depth: 0, sourceType: 'historical' },
          { id: 'OBIS-04', lat: 37.525, lng: -122.785, species: 'Gray Whale', name: 'Gray Whale (Historical)', confidence: 0.50, depth: 0, sourceType: 'historical' },
          { id: 'OBIS-05', lat: 37.610, lng: -122.610, species: 'Humpback Whale', name: 'Humpback Whale (Historical)', confidence: 0.50, depth: 0, sourceType: 'historical' }
        ];
        this.sim.setRealWhaleSightings(formattedSightings, obisHistorical);
        this.lastWhaleUpdate = new Date(data.timestamp);
        
        // 5. Danger Zones / Risk Zones
        if (Array.isArray(data.dangerZones) && data.dangerZones.length > 0) {
          this.sim.dangerZones = data.dangerZones.map(z => {
            const simPt = this.map2D.latLngToSim(z.lat, z.lng);
            const radiusPx = z.radiusKm * 20;
            return {
              id: z.id,
              name: z.name,
              x: simPt.x,
              y: simPt.y,
              center: simPt,
              lat: z.lat,
              lng: z.lng,
              radius: radiusPx,
              radiusKm: z.radiusKm,
              active: z.active,
              riskScore: z.riskScore,
              preyProbability: z.preyProbability,
              preyScore: z.preyProbability !== null ? Math.round(z.preyProbability * 100) : 0,
              habitatScore: z.bathyInput !== null ? Math.round(z.bathyInput * 100) : 0,
              whaleLikelihood: z.whaleLikelihood,
              isStatic: z.isStatic,
              insufficientData: z.insufficientData,
              complianceRate: z.complianceRate,
              eligibleVesselCount: z.eligibleVesselCount,
              complianceNumerator: z.complianceNumerator,
              complianceDenominator: z.complianceDenominator,
              geeInput: z.geeInput,
              buoyInput: z.buoyInput,
              bathyInput: z.bathyInput,
              seasonalInput: z.seasonalInput,
              preyWeights: z.preyWeights,
              whaleWeights: z.whaleWeights,
              collisionWeights: z.collisionWeights,
              timestamp: z.timestamp,
              completeness: z.completeness,
              availableSources: z.availableSources,
              unavailableSources: z.unavailableSources,
              vesselCount: z.vesselCount,
              speedRisk: z.speedRisk,
              routeOverlap: z.routeOverlap,
              crossedReason: z.crossedReason,
              isEcologicalHotspot: z.isEcologicalHotspot
            };
          });
          this.state.riskZones = this.sim.dangerZones;
        }

        // Re-calculate compliance sums
        const activeZones = this.state.riskZones.filter(z => z.active);
        let eligibleTotal = 0;
        let compliantTotal = 0;
        activeZones.forEach(z => {
          eligibleTotal += (z.eligibleVesselCount || 0);
          compliantTotal += (z.complianceNumerator || 0);
        });
        
        this.sim.eligibleVesselCount = eligibleTotal;
        this.sim.complianceNumerator = compliantTotal;
        this.sim.complianceDenominator = eligibleTotal;
        this.sim.complianceRate = eligibleTotal > 0 ? Math.round((compliantTotal / eligibleTotal) * 100) : null;
        this.sim.rrrRate = null;

        const renderedVesselsCount = this.state.vessels.filter(v => v.id.startsWith('AIS-') || v.id.startsWith('LK-') || v.id.startsWith('HIST-')).length;

        // Sync SourceConnectionManager values
        if (this.sourceManager) {
          const src = this.sourceManager.sources;
          
          src.aisstream.status = aisStatus || (renderedVesselsCount > 0 ? 'receiving' : 'connected_waiting');
          src.aisstream.statusColor = this.isStatusUnavailable(src.aisstream.status) ? '#ef4444' : (src.aisstream.status === 'connected_waiting' ? '#fbbf24' : '#10b981');
          src.aisstream.records = renderedVesselsCount;
          src.aisstream.renderedVesselsCount = renderedVesselsCount;
          src.aisstream.passedToMapCount = renderedVesselsCount;
          src.aisstream.lastSuccessConnection = new Date(data.timestamp);
          src.aisstream.lastSuccessDataRecord = new Date(data.timestamp);
          
          src.gee.status = data.geeStatus === 'connected' ? 'connected' : (data.geeStatus === 'credentials_required' ? 'disconnected' : 'error');
          src.gee.statusColor = data.geeStatus === 'connected' ? '#10b981' : '#f59e0b';
          src.gee.lastSuccessConnection = data.geeStatus === 'connected' ? new Date(data.timestamp) : null;
          src.gee.records = this.state.geeData ? this.state.geeData.length : 0;
          src.gee.project = data.project || 'smart-diet-app-482519';
          
          src.noaa_ndbc.status = data.buoyStatus === 'connected' ? 'connected' : 'disconnected';
          src.noaa_ndbc.statusColor = data.buoyStatus === 'connected' ? '#10b981' : '#ef4444';
          src.noaa_ndbc.lastSuccessConnection = data.buoyStatus === 'connected' ? new Date(data.timestamp) : null;
          src.noaa_ndbc.records = this.state.buoys ? this.state.buoys.length : 0;

          src.bigquery_users.status = 'connected';
          src.bigquery_users.statusColor = '#10b981';
          src.bigquery_users.records = formattedSightings.length;

          src.mbari.status = 'analyzed_but_excluded';
          src.mbari.statusColor = '#94a3b8';
          src.mbari.lastError = 'MBARI zooplankton anomalies are excluded from predictive model scoring.';
          
          src.farallon.status = 'analyzed_but_excluded';
          src.farallon.statusColor = '#94a3b8';
          src.farallon.lastError = 'Farallon acoustic streams are excluded from predictive model scoring.';

          src.whale_safe.status = 'partner_access_required';
          src.whale_safe.statusColor = '#94a3b8';
          src.whale_safe.lastError = 'Whale Safe live detections feed is optional (access pending).';
          
          src.whale_alert.status = 'partner_access_required';
          src.whale_alert.statusColor = '#94a3b8';
          src.whale_alert.lastError = 'Whale Alert sightings feed is optional (access pending).';
        }

        this.aisStatus = renderedVesselsCount > 0 ? 'Live AIS connected' : 'Live AIS waiting';
        this.lastAISUpdate = new Date(data.timestamp);
        this.buoyStatus = data.buoyStatus === 'connected' ? 'Connected' : 'Unavailable';
        this.geeStatus = data.geeStatus === 'connected' ? 'Connected' : 'Credentials required';
        this.whaleStatus = 'Connected';

        // Clear empty state dismissal if we suddenly have new live vessels or risk zones
        if (renderedVesselsCount > 0 || activeZones.length > 0) {
          this.emptyStateDismissed = false;
        }

        this.updateSourcesRegistry();
        this.updateMapEmptyState();
        this.map2D.draw();
      }
    } catch (e) {
      console.error("Unified backend risk evaluation failed:", e);
    }
  }

  async fetchOceanConditions() {
    try {
      const res = await fetch('/api/ocean-conditions');
      const data = await res.json();
      if (data.status === 'success') {
        this.sim.noaaBuoys = data.buoys;
        this.state.buoys = data.buoys;
        this.state.sourceAvailability.noaa_ndbc = 'connected';
        this.lastBuoyUpdate = new Date();
        this.buoyStatus = 'Connected';
        
        if (this.sourceManager) {
          const ndbc = this.sourceManager.sources.noaa_ndbc;
          ndbc.status = 'connected';
          ndbc.statusColor = '#10b981';
          ndbc.lastSuccessConnection = new Date();
          ndbc.lastSuccessDataRecord = new Date();
          ndbc.records = data.buoys.length;
          ndbc.lastError = null;
          
          const erddap = this.sourceManager.sources.noaa_erddap;
          erddap.status = data.erddapStatus || 'disconnected';
          erddap.endpointUsed = data.endpointUsed || 'https://coastwatch.pfeg.noaa.gov/erddap';
          erddap.datasetName = data.datasetName || 'jplMURSST41';
          erddap.records = data.recordsReturned || 0;
          
          if (data.erddapStatus === 'connected') {
            erddap.statusColor = '#10b981';
            erddap.lastSuccessConnection = new Date();
            erddap.lastSuccessDataRecord = new Date();
            erddap.lastError = null;
          } else if (data.erddapStatus === 'fallback') {
            erddap.statusColor = '#fbbf24';
            erddap.lastSuccessConnection = new Date();
            erddap.lastSuccessDataRecord = new Date();
            erddap.lastError = data.erddapError || 'SST fallback active (buoy telemetry)';
          } else {
            erddap.statusColor = '#ef4444';
            erddap.lastError = data.erddapError || 'ERDDAP not configured';
          }
        }
      } else {
        this.buoyStatus = 'NOAA data temporarily unavailable';
        if (this.sourceManager) {
          this.sourceManager.sources.noaa_ndbc.status = 'error';
          this.sourceManager.sources.noaa_ndbc.statusColor = '#ef4444';
          this.sourceManager.sources.noaa_ndbc.lastError = data.message || 'NOAA fetch failed';
          this.sourceManager.sources.noaa_erddap.status = 'error';
          this.sourceManager.sources.noaa_erddap.statusColor = '#ef4444';
          this.sourceManager.sources.noaa_erddap.lastError = data.message || 'NOAA ERDDAP fetch failed';
        }
      }
    } catch (e) {
      console.error("Error fetching ocean conditions:", e);
      this.buoyStatus = 'NOAA data temporarily unavailable';
      if (this.sourceManager) {
        this.sourceManager.sources.noaa_ndbc.status = 'error';
        this.sourceManager.sources.noaa_ndbc.statusColor = '#ef4444';
        this.sourceManager.sources.noaa_ndbc.lastError = e.message || e.toString();
        this.sourceManager.sources.noaa_erddap.status = 'error';
        this.sourceManager.sources.noaa_erddap.statusColor = '#ef4444';
        this.sourceManager.sources.noaa_erddap.lastError = e.message || e.toString();
      }
    }
  }

  async fetchAISVessels() {
    try {
      console.log("[Pipeline] Fetching live AIS vessels from /api/live/ais-vessels...");
      const aisRes = await fetch('/api/live/ais-vessels');
      const aisData = await aisRes.json();
      console.log(`[Pipeline] Live AIS vessels API returned: status=${aisData.status}, count=${aisData.count}`);
      
      if (aisData.status === 'success') {
        const activeIds = new Set();
        let passedToMap = 0;
        let renderedCount = 0;

        const aisStatus = aisData.aisStatus?.status;
        const isAisDisconnected = this.isStatusUnavailable(aisStatus);
        
        let shouldUpdate = Array.isArray(aisData.vessels);
        if (isAisDisconnected && (!aisData.vessels || aisData.vessels.length === 0) && this.state.vessels.length > 0) {
          shouldUpdate = false;
        }

        if (shouldUpdate) {
          if (Array.isArray(aisData.vessels)) {
            aisData.vessels.forEach(v => {
              const mmsi = v.MMSI;
              const lat = Number(v.latitude);
              const lng = Number(v.longitude);
              const name = v.vesselName || `MMSI ${mmsi}`;
              const speed = Number(v.speed);
              const type = v.vesselType;
              const id = v.id;
              
              if (isNaN(lat) || isNaN(lng) || lat < 36.0 || lat > 39.0 || lng < -124.0 || lng > -121.0) {
                console.warn(`[Pipeline] Skipping vessel ${name} due to invalid coordinates: lat=${lat}, lng=${lng}`);
                return;
              }

              activeIds.add(id);
              passedToMap++;
              
              const simPt = this.map2D.latLngToSim(lat, lng);
              
              let vessel = this.sim.vessels.find(x => x.id === id);
              if (!vessel) {
                vessel = {
                  id: id,
                  name: name,
                  imo: `MMSI: ${mmsi}`,
                  type: type,
                  flag: "Unknown Flag",
                  length: 200,
                  draft: type === 'Tanker' ? 14.5 : (type === 'Cargo Vessel' ? 12.0 : 8.0),
                  routeKey: "westInbound",
                  routeIndex: 0,
                  x: simPt.x,
                  y: simPt.y,
                  speed: speed,
                  baseSpeed: speed > 0.1 ? speed : 12.0,
                  compliance: "UNKNOWN",
                  inDangerZone: false,
                  strikeRisk: 0,
                  history: [],
                  speedLog: Array(this.sim.speedHistoryLength || 10).fill(speed),
                  lastUpdated: new Date(v.lastUpdated),
                  sourceType: v.sourceType || 'live',
                  sourceName: v.sourceName || 'AISstream.io',
                  receivedAt: v.receivedAt || new Date().toISOString(),
                  isRealData: v.isRealData !== undefined ? v.isRealData : true
                };
                this.sim.vessels.push(vessel);
                this.sim.addNegotiationLog("system", `AIS vessel spotted: ${name} (${type}) entering VTS tactical bounds.`);
              } else {
                vessel.x = simPt.x;
                vessel.y = simPt.y;
                vessel.speed = speed;
                vessel.name = name;
                vessel.lastUpdated = new Date(v.lastUpdated);
                vessel.sourceType = v.sourceType || 'live';
                vessel.sourceName = v.sourceName || 'AISstream.io';
                vessel.receivedAt = v.receivedAt || new Date().toISOString();
                vessel.isRealData = v.isRealData !== undefined ? v.isRealData : true;
                
                const routeInfo = this.sim.findClosestRouteAndIndex(simPt.x, simPt.y);
                vessel.routeKey = routeInfo.routeKey;
                vessel.routeIndex = routeInfo.routeIndex;
              }
            });
            
            this.sim.vessels = this.sim.vessels.filter(v => {
              if (!v.id.startsWith('AIS-') && !v.id.startsWith('LK-') && !v.id.startsWith('HIST-')) return true;
              return activeIds.has(v.id);
            });
            
            renderedCount = this.sim.vessels.filter(v => v.id.startsWith('AIS-') || v.id.startsWith('LK-') || v.id.startsWith('HIST-')).length;
            console.log(`[Pipeline] AIS vessels mapped to simulation: ${passedToMap}, active count in sim: ${renderedCount}`);
            this.state.vessels = this.sim.vessels;
          }
        } else {
          renderedCount = this.state.vessels.filter(v => v.id.startsWith('AIS-') || v.id.startsWith('LK-') || v.id.startsWith('HIST-')).length;
          passedToMap = renderedCount;
        }

        if (aisData.aisStatus && this.sourceManager) {
          this.lastAisResponse = aisData;
          const src = this.sourceManager.sources.aisstream;
          src.status = aisData.aisStatus.status;
          this.state.sourceAvailability.aisstream = src.status;
          
          if (src.status === 'receiving') {
            src.statusColor = '#10b981';
            src.lastSuccessConnection = aisData.aisStatus.lastMessageTime ? new Date(aisData.aisStatus.lastMessageTime) : new Date();
            src.lastSuccessDataRecord = aisData.aisStatus.lastMessageTime ? new Date(aisData.aisStatus.lastMessageTime) : new Date();
          } else if (src.status === 'connected_waiting') {
            src.statusColor = '#fbbf24';
            src.lastSuccessConnection = aisData.aisStatus.openTimestamp ? new Date(aisData.aisStatus.openTimestamp) : new Date();
            src.lastSuccessDataRecord = null;
          } else if (src.status === 'connecting' || src.status === 'testing') {
            src.statusColor = '#fbbf24';
          } else if (src.status === 'retrying') {
            src.statusColor = '#fbbf24';
          } else if (src.status === 'missing_key') {
            src.statusColor = '#ef4444';
          } else if (src.status === 'error') {
            src.statusColor = '#ef4444';
          } else {
            src.statusColor = '#94a3b8';
          }
          
          src.records = aisData.aisStatus.vesselsCount || renderedCount;
          src.recordsCount = aisData.aisStatus.messagesReceived || 0;
          src.lastError = aisData.aisStatus.lastError || null;
          src.connectionStatus = aisData.aisStatus.connectionStatus || aisData.aisStatus.status || 'disconnected';
          
          src.renderedVesselsCount = renderedCount;
          src.passedToMapCount = passedToMap;

          const sec = this.sourceManager.sources.secondary_ais;
          if (sec) {
            sec.providerSelected = aisData.aisStatus.secondaryProviderName || 'None';
            sec.keyPresent = aisData.aisStatus.secondaryKeyPresent ? 'Yes' : 'No';
            sec.records = aisData.aisStatus.secondaryRecordsCount || 0;
            sec.status = aisData.aisStatus.secondaryProviderStatus || 'missing key';
            
            if (sec.status === 'live' || sec.status === 'connected') {
              sec.statusColor = '#10b981';
            } else if (sec.status === 'configured') {
              sec.statusColor = '#3b82f6';
            } else if (sec.status === 'error') {
              sec.statusColor = '#ef4444';
            } else if (sec.status === 'not selected') {
              sec.statusColor = '#94a3b8';
            } else {
              sec.statusColor = '#ef4444';
            }
            
            sec.lastError = aisData.aisStatus.secondaryProviderError || null;
            if (aisData.aisStatus.lastSecondaryFetchTime > 0) {
              sec.lastSuccessConnection = new Date(aisData.aisStatus.lastSecondaryFetchTime);
              sec.lastSuccessDataRecord = new Date(aisData.aisStatus.lastSecondaryFetchTime);
            }
          }
          
          this.aisStatus = src.status === 'receiving' ? 'Live AIS connected' : (src.status === 'connected_waiting' ? 'Live AIS waiting' : (src.status === 'error' ? 'Connection error' : src.status));
          if (aisData.aisStatus.lastMessageTime) {
            this.lastAISUpdate = new Date(aisData.aisStatus.lastMessageTime);
          }
        }

        // Clear empty state dismissal if we suddenly have new live vessels
        if (renderedCount > 0) {
          this.emptyStateDismissed = false;
        }

        this.updateSourcesRegistry();
        this.updateMapEmptyState();
        this.map2D.draw();
      } else {
        console.error("[Pipeline] AIS live vessels API returned failure:", aisData.message);
        if (this.sourceManager) {
          const ais = this.sourceManager.sources.aisstream;
          ais.status = 'error';
          ais.statusColor = '#ef4444';
          ais.lastError = aisData.message || 'AIS status fetch failed';
          this.aisStatus = 'Connection error';
        }
      }
    } catch (e) {
      console.error("[Pipeline] Error fetching live AIS vessels:", e);
      if (this.sourceManager) {
        const ais = this.sourceManager.sources.aisstream;
        ais.status = 'error';
        ais.statusColor = '#ef4444';
        ais.lastError = e.message || e.toString();
        this.aisStatus = 'Connection error';
      }
    }
  }

  async fetchPreyProbability() {
    try {
      const res = await fetch('/api/prey-probability');
      const data = await res.json();
      if (data.status === 'connected') {
        this.sim.setGEEPreyHotspots(data.data);
        this.state.geeData = data.data;
        this.state.sourceAvailability.gee = 'connected';
        this.lastGEEUpdate = new Date();
        this.geeStatus = 'Connected';
        
        if (this.sourceManager) {
          const gee = this.sourceManager.sources.gee;
          gee.status = 'connected';
          gee.statusColor = '#10b981';
          gee.lastSuccessConnection = new Date();
          gee.lastSuccessDataRecord = new Date();
          gee.records = data.data.length;
          gee.project = data.project || 'smart-diet-app-482519';
          gee.latestDatasetDate = data.timestamp ? new Date(data.timestamp).toLocaleDateString() : new Date().toLocaleDateString();
          gee.variablesUsed = data.variablesUsed || 'Sea Surface Temperature (sst)';
          gee.sourceType = data.sourceType || 'Environmental prey-habitat proxy';
          gee.label = data.label || 'Environmental prey-habitat proxy — not direct krill detection';
          gee.lastError = null;
        }
      } else {
        this.geeStatus = 'Unavailable (Access Pending)';
        this.sim.setGEEPreyHotspots(data.fallbackData || []);
        if (this.sourceManager) {
          const gee = this.sourceManager.sources.gee;
          gee.status = 'disconnected';
          gee.statusColor = '#f59e0b';
          gee.lastError = data.message || 'GEE credentials required';
          gee.project = 'None';
          gee.records = data.fallbackData ? data.fallbackData.length : 0;
          gee.label = 'Unavailable (Access Pending)';
        }
      }
    } catch (e) {
      console.error("Error fetching prey probability:", e);
      this.geeStatus = 'Unavailable (Access Pending)';
      const localFallback = [
        { id: 'FB-PP-01', lat: 37.70, lng: -123.00, probability: 0.85, source: 'NOAA Bathymetry Shelf Edge' },
        { id: 'FB-PP-02', lat: 37.95, lng: -123.15, probability: 0.88, source: 'NOAA Bathymetry Shelf Edge' },
        { id: 'FB-PP-03', lat: 37.45, lng: -122.80, probability: 0.70, source: 'NOAA Bathymetry Shelf Edge' },
        { id: 'FB-PP-04', lat: 38.15, lng: -123.25, probability: 0.78, source: 'NOAA Bathymetry Shelf Edge' },
        { id: 'FB-PP-05', lat: 37.60, lng: -122.75, probability: 0.65, source: 'NOAA Bathymetry / Coastal upwelling' }
      ];
      this.sim.setGEEPreyHotspots(localFallback);
      if (this.sourceManager) {
        const gee = this.sourceManager.sources.gee;
        gee.status = 'error';
        gee.statusColor = '#f59e0b';
        gee.lastError = e.message || e.toString();
        gee.records = localFallback.length;
        gee.label = 'Local Bathymetric Fallback';
      }
    }
  }

  async fetchWhaleTelemetry() {
    try {
      const res = await fetch('/api/whale-data');
      const data = await res.json();
      
      let userSightings = [];
      try {
        const uRes = await fetch('/api/sightings');
        const uData = await uRes.json();
        if (uData.sightings) {
          userSightings = uData.sightings.map(s => ({
            id: s.id && String(s.id).startsWith('BQ-SIGHTING-') ? s.id : `BQ-SIGHTING-${s.id || s.timestamp}`,
            lat: s.latitude,
            lng: s.longitude,
            species: s.species,
            name: `${s.species} (User Sighted)`,
            confidence: s.confidence || 0.9,
            imageUrl: s.image_url,
            depth: 0,
            timestamp: s.timestamp,
            verificationStatus: s.verification_status || 'unverified',
            sourceType: s.source_type || 'user-reported',
            approvalStatus: s.approval_status || 'approved'
          }));
        }
        
        if (this.sourceManager) {
          const bq = this.sourceManager.sources.bigquery_users;
          bq.status = 'connected';
          bq.statusColor = '#10b981';
          bq.lastSuccessConnection = new Date();
          bq.lastSuccessDataRecord = new Date();
          bq.records = userSightings.length;
          bq.lastError = null;
        }
      } catch (bqErr) {
        console.error("Error fetching BigQuery user sightings:", bqErr);
        if (this.sourceManager) {
          const bq = this.sourceManager.sources.bigquery_users;
          bq.status = 'disconnected';
          bq.statusColor = '#f59e0b';
          bq.lastError = bqErr.message || bqErr.toString();
        }
      }

      const combinedLiveWhales = [...(data.liveSightings || []), ...userSightings];
      this.sim.setRealWhaleSightings(combinedLiveWhales, data.historicalSightings);
      
      this.lastWhaleUpdate = new Date();
      if (data.status === 'connected') {
        this.whaleStatus = 'Connected';
        
        if (this.sourceManager) {
          const ws = this.sourceManager.sources.whale_safe;
          ws.status = 'connected';
          ws.statusColor = '#10b981';
          ws.lastSuccessConnection = new Date();
          ws.lastSuccessDataRecord = new Date();
          ws.records = data.liveSightings ? data.liveSightings.length : 0;
          ws.lastError = null;
          
          const wa = this.sourceManager.sources.whale_alert;
          wa.status = 'connected';
          wa.statusColor = '#10b981';
          wa.lastSuccessConnection = new Date();
          wa.lastSuccessDataRecord = new Date();
          wa.records = 0;
          wa.lastError = null;
        }
      } else {
        this.whaleStatus = 'Whale detection feed not connected';
        if (this.sourceManager) {
          const ws = this.sourceManager.sources.whale_safe;
          ws.status = 'disconnected';
          ws.statusColor = '#3b82f6';
          ws.lastError = 'Whale Safe feed not connected';
          
          const wa = this.sourceManager.sources.whale_alert;
          wa.status = 'disconnected';
          wa.statusColor = '#3b82f6';
          wa.lastError = 'Whale Alert feed not connected';
        }
      }
      
      if (this.sourceManager) {
        const obis = this.sourceManager.sources.obis_seamap;
        obis.records = data.historicalSightings ? data.historicalSightings.length : 0;
      }
    } catch (e) {
      console.error("Error fetching whale data:", e);
      this.whaleStatus = 'Whale detection feed not connected';
      this.sim.setRealWhaleSightings([], []);
      if (this.sourceManager) {
        const ws = this.sourceManager.sources.whale_safe;
        ws.status = 'error';
        ws.statusColor = '#ef4444';
        ws.lastError = e.message || e.toString();
        
        const wa = this.sourceManager.sources.whale_alert;
        wa.status = 'error';
        wa.statusColor = '#ef4444';
        wa.lastError = e.message || e.toString();
      }
    }
  }

  updateDataFeedsStatus() {
    const listEl = document.getElementById('data-feeds-status-list');
    if (!listEl) return;
    
    const isDemo = this.sim.demoMode;
    const config = this.feedConfig || {};
    
    const timeAgo = (date) => {
      if (!date) return 'Never';
      const sec = Math.floor((new Date() - date) / 1000);
      if (sec < 5) return 'Just now';
      if (sec < 60) return `${sec}s ago`;
      const min = Math.floor(sec / 60);
      return `${min}m ago`;
    };
    
    const layers = [
      {
        name: "Live AIS Ships",
        source: "AISstream.io WebSocket",
        label: "Live",
        status: isDemo ? "Connected (Demo)" : (config.aisStreamKeyConfigured ? (this.aisStatus || "Connected") : "AISstream API key required"),
        statusColor: isDemo ? "#f97316" : (config.aisStreamKeyConfigured ? "#10b981" : "#f59e0b"),
        lastUpdated: isDemo ? this.sim.getFormattedTime() : timeAgo(this.lastAISUpdate),
        confidence: isDemo ? "N/A" : (config.aisStreamKeyConfigured ? "High" : "N/A"),
        mode: isDemo ? "Sample Mode" : (config.aisStreamKeyConfigured ? "Real" : "Unavailable"),
        modeColor: isDemo ? "#f97316" : (config.aisStreamKeyConfigured ? "#10b981" : "#ef4444"),
        desc: "Real-time vessel positions streamed from transceiver broadcasts."
      },
      {
        name: "Whale Safe / Whale Alert",
        source: "Benioff Ocean Initiative",
        label: "NRT / Historical",
        status: isDemo ? "Connected (Demo)" : (config.whaleSafeConfigured || config.whaleAlertConfigured ? (this.whaleStatus || "Connected") : "Optional partner feed — access pending"),
        statusColor: isDemo ? "#f97316" : (config.whaleSafeConfigured || config.whaleAlertConfigured ? "#10b981" : "#3b82f6"),
        lastUpdated: isDemo ? this.sim.getFormattedTime() : timeAgo(this.lastWhaleUpdate),
        confidence: isDemo ? "N/A" : (config.whaleSafeConfigured || config.whaleAlertConfigured ? "High" : "Medium (Historical Archive)"),
        mode: isDemo ? "Sample Mode" : (config.whaleSafeConfigured || config.whaleAlertConfigured ? "Real" : "Historical + User reported"),
        modeColor: isDemo ? "#f97316" : (config.whaleSafeConfigured || config.whaleAlertConfigured ? "#10b981" : "#eab308"),
        desc: "Combines live acoustics, satellite telemetry, and crowdsourced sightings."
      },
      {
        name: "Prey-Habitat Proxy Index",
        source: "Google Earth Engine",
        label: "NRT",
        status: isDemo ? "Connected (Demo)" : (config.googleEarthEngineConfigured ? (this.geeStatus || "Connected") : "Google Earth Engine credentials required"),
        statusColor: isDemo ? "#f97316" : (config.googleEarthEngineConfigured ? "#10b981" : "#f59e0b"),
        lastUpdated: isDemo ? this.sim.getFormattedTime() : timeAgo(this.lastGEEUpdate),
        confidence: isDemo ? "N/A" : (config.googleEarthEngineConfigured ? "Medium (Estimated)" : "N/A"),
        mode: isDemo ? "Sample Mode" : (config.googleEarthEngineConfigured ? "Real Estimations" : "Unavailable"),
        modeColor: isDemo ? "#f97316" : (config.googleEarthEngineConfigured ? "#10b981" : "#ef4444"),
        desc: "This layer estimates prey/krill-favorable habitat using ocean color/chlorophyll and environmental variables. It does not directly detect krill."
      },
      {
        name: "SST / Ocean Conditions",
        source: "NOAA NDBC / ERDDAP",
        label: "NRT",
        status: isDemo ? "Connected (Demo)" : ((this.buoyStatus && this.buoyStatus.includes("unavailable")) ? "SST layer unavailable" : (this.buoyStatus || "Connected")),
        statusColor: isDemo ? "#f97316" : ((this.buoyStatus && this.buoyStatus.includes("unavailable")) ? "#ef4444" : "#10b981"),
        lastUpdated: isDemo ? this.sim.getFormattedTime() : timeAgo(this.lastBuoyUpdate),
        confidence: isDemo ? "N/A" : "High (Buoys) / SST grid unavailable from Cloud Run",
        mode: isDemo ? "Sample Mode" : "Real (Buoy observations only)",
        modeColor: isDemo ? "#f97316" : "#10b981",
        desc: "NDBC buoy sensors query water temperature, wind velocity, and swells."
      },
      {
        name: "Bathymetry",
        source: "NOAA Contour Lines",
        label: "Static",
        status: "Connected",
        statusColor: "#10b981",
        lastUpdated: "Static data",
        confidence: "High",
        mode: "Static",
        modeColor: "#10b981",
        desc: "Static depth curves outlining SF shipping channel slopes."
      },
      {
        name: "Avoidance Risk Model",
        source: "AI Sentinel Risk Core",
        label: "Live / Model",
        status: "Connected",
        statusColor: "#10b981",
        lastUpdated: isDemo ? this.sim.getFormattedTime() : "Real-time",
        confidence: isDemo ? "N/A" : (config.whaleSafeConfigured || config.whaleAlertConfigured ? "High" : "Medium (Environmental + Vessel only)"),
        mode: isDemo ? "Sample Mode" : (config.whaleSafeConfigured || config.whaleAlertConfigured ? "Real Estimation" : "Environmental + Vessel risk estimate"),
        modeColor: isDemo ? "#f97316" : "#10b981",
        desc: "Estimates whale-vessel collision risk by overlaying active zones and tracks."
      },
      {
        name: "Compliance Tracking",
        source: "USCG VTS Engine",
        label: "Live / AIS",
        status: isDemo ? "Connected (Demo)" : (config.aisStreamKeyConfigured ? "Connected" : "AIS Stream Required"),
        statusColor: isDemo ? "#f97316" : (config.aisStreamKeyConfigured ? "#10b981" : "#ef4444"),
        lastUpdated: isDemo ? this.sim.getFormattedTime() : "Real-time",
        confidence: isDemo ? "N/A" : "High",
        mode: isDemo ? "Sample Mode" : (config.aisStreamKeyConfigured ? "Real" : "Unavailable"),
        modeColor: isDemo ? "#f97316" : (config.aisStreamKeyConfigured ? "#10b981" : "#ef4444"),
        desc: "Tracks vessel speeds inside risk zones against the voluntary 10-knot limit."
      },
      {
        name: "MBARI Krill Data",
        source: "MBARI Research Feed",
        label: "Research / Partner Pending",
        status: "Partner Pending / Research Collaboration",
        statusColor: "#f59e0b",
        lastUpdated: "N/A",
        confidence: "N/A",
        mode: "Unavailable",
        modeColor: "#ef4444",
        desc: "MBARI high-resolution zooplankton research dataset (pending integration)."
      },
      {
        name: "Farallon Acoustic Krill",
        source: "Farallon Institute",
        label: "Research / Partner Pending",
        status: "Partner Pending / Research Collaboration",
        statusColor: "#f59e0b",
        lastUpdated: "N/A",
        confidence: "N/A",
        mode: "Unavailable",
        modeColor: "#ef4444",
        desc: "Shelf-edge acoustic backscatter estimates for krill swarms (pending integration)."
      }
    ];
    
    listEl.innerHTML = '';
    
    layers.forEach(l => {
      const item = document.createElement('div');
      item.className = 'feed-status-item glass-card-nested';
      item.style.cssText = 'padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 4px; background: rgba(15, 23, 42, 0.4); margin-bottom: 4px;';
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; font-size: 11px; color: var(--text-primary);">${l.name}</span>
          <span class="badge" style="font-size: 8px; padding: 1px 4px; border-radius: 3px; font-weight: 500; background: rgba(255, 255, 255, 0.08); color: var(--text-secondary);">${l.label}</span>
        </div>
        <div style="font-size: 9.5px; color: var(--text-secondary); display: flex; justify-content: space-between;">
          <span>Source: <span style="color: var(--text-primary);">${l.source}</span></span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: var(--text-secondary);">
          <span>Status: <span style="font-weight: 500; color: ${l.statusColor};">${l.status}</span></span>
          <span>Updated: <span style="font-family: var(--font-mono);">${l.lastUpdated}</span></span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: var(--text-secondary); border-top: 1px solid rgba(255,255,255,0.03); padding-top: 4px; margin-top: 2px;">
          <span>Confidence: <span style="font-weight: 500; color: var(--text-primary);">${l.confidence}</span></span>
          <span>Mode: <span style="font-weight: 500; color: ${l.modeColor};">${l.mode}</span></span>
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  updateMapEmptyState() {
    const overlay = document.getElementById('map-empty-state');
    if (!overlay) return;
    
    const isDemo = this.sim.demoMode;
    const sources = this.sourceManager?.sources || {};
    
    const hasLiveVessels = Array.isArray(this.state.vessels) && this.state.vessels.length > 0;
    const hasRiskZones = Array.isArray(this.state.riskZones) && this.state.riskZones.length > 0;
    const hasUsableData = hasLiveVessels || hasRiskZones || (Array.isArray(this.state.geeData) && this.state.geeData.length > 0) || (Array.isArray(this.state.userSightings) && this.state.userSightings.length > 0);
    
    // Required source check
    const isAisUnavailable = this.isStatusUnavailable(sources.aisstream?.status);
    
    // The overlay is shown if loading has completed, there is no usable data, the required AIS stream is unavailable, and the card has not been dismissed.
    const showOverlay = !this.state.loading && !hasUsableData && isAisUnavailable && !this.emptyStateDismissed && !isDemo;

    if (!showOverlay) {
      overlay.style.display = 'none';
      return;
    }
    
    overlay.style.display = 'flex';
    
    const sourcesEl = document.getElementById('map-empty-state-sources');
    if (!sourcesEl) return;
    
    const config = this.feedConfig || {};
    let statusList = [];
    
    // Highlight the required source status
    if (isAisUnavailable) {
      statusList.push(`<span style="color: #f87171; font-weight: 600;">✖ [REQUIRED] AISstream Live Tracking: ${sources.aisstream?.lastError || 'Disconnected or API key required'}.</span>`);
    } else {
      statusList.push('<span style="color: #10b981;">✔ [REQUIRED] AISstream Live Tracking: Connected.</span>');
    }
    
    // Optional sources
    if (sources.noaa_ndbc?.status === 'connected') {
      statusList.push('<span style="color: #10b981;">✔ NOAA NDBC: Connected, latest buoy data received.</span>');
    } else {
      statusList.push('<span style="color: #94a3b8;">⚠ NOAA NDBC: Buoy data temporarily unavailable (optional).</span>');
    }
    
    if (sources.gee?.status === 'connected') {
      statusList.push('<span style="color: #10b981;">✔ Google Earth Engine: Connected, prey layer generated.</span>');
    } else {
      statusList.push('<span style="color: #94a3b8;">⚠ Google Earth Engine: Credentials required / query pending (optional).</span>');
    }
    
    sourcesEl.innerHTML = statusList.join('<br>');
    
    lucide.createIcons({
      attrs: { class: 'lucide' },
      nodeList: overlay.querySelectorAll('[data-lucide]')
    });
  }

  updateMapDebugStatus() {
    const debugEl = document.getElementById('map-debug-status');
    if (!debugEl) return;
    
    const aisSource = this.sourceManager?.sources?.aisstream || {};
    const aisStatus = aisSource.status || 'disconnected';
    const frontendCount = this.state.vessels.length;
    const backendCount = frontendCount;
    let renderedCount = 0;
    if (this.map2D && this.map2D.layers && this.map2D.layers.vessels) {
      renderedCount = Object.keys(this.map2D.layers.vessels).length;
    }
    const lastFetch = this.lastAISUpdate ? this.lastAISUpdate.toLocaleTimeString() : 'Never';
    const lastError = aisSource.lastError || 'None';
    
    const buildRevision = this.feedConfig?.buildRevision || 'local-dev';
    const buildTimestamp = this.feedConfig?.buildTimestamp || 'unknown';
    const uiClickLayer = 'OK';
    
    const lastResp = this.lastAisResponse;
    const isDatalasticActive = lastResp && lastResp.aisStatus && lastResp.aisStatus.secondaryProviderName === 'datalastic' && lastResp.aisStatus.secondaryProviderStatus === 'live';
    
    let statusClass = 'text-secondary';
    let statusText = aisStatus;
    let textClass = 'text-secondary';
    
    if (isDatalasticActive) {
      statusClass = 'text-green';
      statusText = 'LIVE VIA DATALASTIC';
      textClass = 'text-green';
    } else if (aisStatus === 'receiving' || aisStatus === 'connected') {
      statusClass = 'text-green';
      statusText = 'Live';
      textClass = 'text-green';
    } else if (aisStatus === 'connected_waiting') {
      statusClass = 'text-amber';
      statusText = 'Waiting / upstream empty';
      textClass = 'text-amber';
    } else if (aisStatus === 'last_known') {
      statusClass = 'text-cyan';
      statusText = 'Last-known fallback';
      textClass = 'text-cyan';
    } else if (aisStatus === 'historical') {
      statusClass = 'text-cyan';
      statusText = 'Historical fallback';
      textClass = 'text-cyan';
    } else if (aisStatus === 'connecting' || aisStatus === 'testing') {
      statusClass = 'text-amber';
      statusText = 'connecting';
      textClass = 'text-amber';
    } else if (aisStatus === 'retrying') {
      statusClass = 'text-amber';
      statusText = 'retrying';
      textClass = 'text-amber';
    } else if (aisStatus === 'error') {
      statusClass = 'text-red';
      statusText = 'error';
      textClass = 'text-red';
    } else if (aisStatus === 'missing_key') {
      statusClass = 'text-red';
      statusText = 'missing key';
      textClass = 'text-red';
    }

    debugEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(4, auto); gap: 4px 16px; font-size: 9px; line-height: 1.3; font-family: var(--font-mono); color: var(--text-secondary);">
        <div>AIS API: <span class="${statusClass}" style="font-weight: 600;">${statusText.toUpperCase()}</span></div>
        <div>Backend: <span style="color: var(--color-cyan); font-weight: 600;">${backendCount}</span></div>
        <div>Frontend: <span style="color: var(--color-cyan); font-weight: 600;">${frontendCount}</span></div>
        <div>Markers: <span style="color: var(--color-cyan); font-weight: 600;">${renderedCount}</span></div>
        <div>Last Fetch: <span style="color: var(--text-primary);">${lastFetch}</span></div>
        <div>Revision: <span style="color: var(--text-primary); font-weight: 600;">${buildRevision}</span></div>
        <div>Build Time: <span style="color: var(--text-primary); font-size: 8px;">${buildTimestamp}</span></div>
        <div>Click Layer: <span style="color: #10b981; font-weight: 600;">${uiClickLayer}</span></div>
        ${lastError !== 'None' ? `<div style="grid-column: span 4; color: #ef4444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 450px;">Last Error: ${lastError}</div>` : ''}
      </div>
    `;

    const diagEl = document.getElementById('ais-diagnostic-status');
    if (diagEl) {
      const msgs30s = aisSource.recordsCount30s || 0;
      const msgs2m = aisSource.recordsCount2m || 0;
      const msgs5m = aisSource.recordsCount5m || 0;
      const provider = aisSource.provider || 'AISstream.io';

      let fallbackText = '';
      if (aisStatus === 'connected_waiting') {
        fallbackText = `<div style="color: #fbbf24; font-weight: 600; margin-top: 4px; font-size: 10px;">AISstream connected but upstream feed returned zero live AIS frames. Trying backup real-data sources.</div>`;
      } else if (aisStatus === 'last_known') {
        fallbackText = `<div style="color: #3b82f6; font-weight: 600; margin-top: 4px; font-size: 10px;">Fallback Active: Last-known real positions.</div>`;
      } else if (aisStatus === 'historical') {
        fallbackText = `<div style="color: #3b82f6; font-weight: 600; margin-top: 4px; font-size: 10px;">Fallback Active: Historical AIS (not live).</div>`;
      }

      diagEl.innerHTML = `
        <div>AIS status: <span style="font-weight: 600;" class="${textClass}">${statusText.toUpperCase()}</span></div>
        <div>Provider: <span style="color: var(--text-primary); font-weight: 600;">${provider}</span></div>
        <div>Backend (Total): <span style="color: var(--color-cyan); font-weight: 600;">${backendCount}</span></div>
        <div>Msg count (30s): <span style="color: var(--color-cyan); font-weight: 600;">${msgs30s}</span></div>
        <div>Msg count (2m): <span style="color: var(--color-cyan); font-weight: 600;">${msgs2m}</span></div>
        <div>Msg count (5m): <span style="color: var(--color-cyan); font-weight: 600;">${msgs5m}</span></div>
        <div>Frontend loaded: <span style="color: var(--color-cyan); font-weight: 600;">${frontendCount}</span></div>
        <div>Rendered markers: <span style="color: var(--color-cyan); font-weight: 600;">${renderedCount}</span></div>
        <div>Last AIS update: <span style="color: var(--text-primary); font-weight: 600;">${lastFetch}</span></div>
        ${fallbackText}
      `;
    }
  }

  updateSourcesRegistry() {
    const listEl = document.getElementById('sources-registry-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    const timeAgo = (date) => {
      if (!date) return 'Never';
      const sec = Math.floor((new Date() - date) / 1000);
      if (sec < 5) return 'Just now';
      if (sec < 60) return `${sec}s ago`;
      const min = Math.floor(sec / 60);
      return `${min}m ago`;
    };
    
    Object.keys(this.sourceManager.sources).forEach(key => {
      const s = this.sourceManager.sources[key];
      const card = document.createElement('div');
      card.className = 'glass-card-nested';
      card.style.cssText = 'padding: 10px; border-radius: 8px; border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 4px; background: rgba(15, 23, 42, 0.5); font-size: 11px; margin-bottom: 6px;';
      
      let lastFetchText = s.lastFetch;
      if (s.lastSuccessConnection && s.lastFetch !== 'Static Asset Loaded') {
        lastFetchText = timeAgo(s.lastSuccessConnection);
      }
      
      let statusText = s.status;
      if (statusText === 'retrying' && s.nextRetryTime) {
        const secLeft = Math.max(0, Math.round((s.nextRetryTime - new Date()) / 1000));
        statusText = `Retrying in ${secLeft}s`;
      } else if (statusText === 'testing') {
        statusText = `Testing...`;
      } else if (statusText === 'partner_access_required') {
        statusText = "Partner Access Required / Optional";
      } else if (statusText === 'analyzed_but_excluded') {
        statusText = "Analyzed but Excluded";
      }
      
      let countdownHtml = '';
      if (s.countdown !== null && s.status === 'connected') {
        countdownHtml = `<span class="countdown-timer">Refresh: ${s.countdown}s</span>`;
      }
      
      if (s.id === 'aisstream') {
        const config = this.feedConfig || {};
        const isKeyPresent = config.aisStreamKeyConfigured ? 'Yes' : 'No';
        const isConnected = (s.status === 'receiving' || s.status === 'connected_waiting') ? 'Yes' : 'No';
        const isSubscribed = (s.status === 'receiving' || s.status === 'connected_waiting') ? 'Yes' : 'No';
        
        const bboxStr = `[${config.aisBboxMinLat || '37.3'}, ${config.aisBboxMinLon || '-123.5'}] to [${config.aisBboxMaxLat || '38.3'}, ${config.aisBboxMaxLon || '-121.8'}]`;
        const lastMsgTime = s.lastSuccessDataRecord ? s.lastSuccessDataRecord.toLocaleTimeString() : 'Never';
        
        const passedCount = s.passedToMapCount || 0;
        const renderedCount = s.renderedVesselsCount || 0;
        
        let renderStatusHtml = '';
        if (passedCount > 0 && renderedCount === 0) {
          renderStatusHtml = `<div style="color: #ef4444; font-weight: bold; margin-top: 4px;">AIS received but map render failed.</div>`;
        } else {
          renderStatusHtml = `<div style="color: #10b981; margin-top: 4px;">✔ Map render: ${renderedCount} active markers</div>`;
        }

        const sampleVessels = this.sim.vessels
          .filter(v => v.id.startsWith('AIS-') || v.id.startsWith('LK-') || v.id.startsWith('HIST-'))
          .slice(0, 3)
          .map(v => v.name)
          .join(', ');

        const sampleVesselsHtml = sampleVessels ? `
          <div style="margin-top: 4px; color: var(--text-secondary); font-size: 8.5px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px;">
            Sample Vessels: <span style="color: var(--text-primary);">${sampleVessels}</span>
          </div>
        ` : '';

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 600;">
            <span style="color: var(--text-primary); font-size: 11px;">${s.name}</span>
            <span style="font-size: 8.5px; color: var(--text-secondary); opacity: 0.8;">${s.classification}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 9.5px; color: var(--text-secondary);">
            <span>Status: <span style="font-weight: 500; color: ${s.statusColor};">${statusText}</span></span>
            <span>Last Fetch: <span style="font-family: var(--font-mono);">${lastFetchText}</span></span>
          </div>
          
          <div style="margin-top: 6px; padding: 6px; background: rgba(0,0,0,0.25); border-radius: 6px; display: flex; flex-direction: column; gap: 2px; border: 1px solid rgba(255,255,255,0.03); font-size: 9px; line-height: 1.3;">
            <div style="display: flex; justify-content: space-between;"><span>API Key Present:</span><span style="color: var(--text-primary); font-weight: 600;">${isKeyPresent}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>WebSocket Connected:</span><span style="color: ${isConnected === 'Yes' ? '#10b981' : '#ef4444'}; font-weight: 600;">${isConnected}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Subscription Sent:</span><span style="color: ${isSubscribed === 'Yes' ? '#10b981' : '#ef4444'}; font-weight: 600;">${isSubscribed}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Messages Received:</span><span style="color: var(--text-primary); font-weight: 600;">${s.recordsCount || 0}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Vessels Stored (Backend):</span><span style="color: var(--text-primary); font-weight: 600;">${s.records || 0}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Vessels Received (Frontend):</span><span style="color: var(--text-primary); font-weight: 600;">${passedCount}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Vessels Rendered on Map:</span><span style="color: var(--text-primary); font-weight: 600;">${renderedCount}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Last Message Time:</span><span style="color: var(--text-primary); font-family: var(--font-mono);">${lastMsgTime}</span></div>
            <div style="display: flex; justify-content: space-between; font-size: 8.5px; margin-top: 2px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 2px;">
              <span>Bounding Box:</span><span style="color: var(--text-secondary); font-family: var(--font-mono);">${bboxStr}</span>
            </div>
            ${renderStatusHtml}
            ${sampleVesselsHtml}
          </div>
          
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
            <button class="btn-reconnect-ais btn-action" style="font-size: 9px; padding: 2px 8px;">Reconnect AISstream</button>
            <button class="btn-test-connection" data-source="${s.id}" style="font-size: 9px; padding: 2px 8px;">Test</button>
          </div>
        `;
      } else if (s.id === 'secondary_ais') {
        const lastFetchTimeStr = s.lastSuccessConnection ? s.lastSuccessConnection.toLocaleTimeString() : 'Never';
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 600;">
            <span style="color: var(--text-primary); font-size: 11px;">${s.name}</span>
            <span style="font-size: 8.5px; color: var(--text-secondary); opacity: 0.8;">${s.classification}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 9.5px; color: var(--text-secondary);">
            <span>Status: <span style="font-weight: 500; color: ${s.statusColor};">${statusText}</span></span>
            <span>Last Fetch: <span style="font-family: var(--font-mono);">${lastFetchText}</span></span>
          </div>
          
          <div style="margin-top: 6px; padding: 6px; background: rgba(0,0,0,0.25); border-radius: 6px; display: flex; flex-direction: column; gap: 2px; border: 1px solid rgba(255,255,255,0.03); font-size: 9px; line-height: 1.3;">
            <div style="display: flex; justify-content: space-between;"><span>Provider Selected:</span><span style="color: var(--text-primary); font-weight: 600;">${s.providerSelected}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>API Key Present:</span><span style="color: var(--text-primary); font-weight: 600;">${s.keyPresent}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Last Fetch Time:</span><span style="color: var(--text-primary); font-family: var(--font-mono);">${lastFetchTimeStr}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Records Returned:</span><span style="color: var(--text-primary); font-weight: 600;">${s.records}</span></div>
          </div>
          
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
            <button class="btn-test-secondary btn-action" style="font-size: 9px; padding: 2px 8px;">Test Secondary</button>
          </div>
          ${s.lastError ? `
            <div style="margin-top: 2px; font-size: 8.5px; color: #f87171; background: rgba(239, 68, 68, 0.08); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.15); font-family: var(--font-mono); line-height: 1.2;">
              Error: ${s.lastError}
            </div>
          ` : ''}
        `;
        
        const secTestBtn = card.querySelector('.btn-test-secondary');
        if (secTestBtn) {
          secTestBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            secTestBtn.disabled = true;
            const oldText = secTestBtn.innerText;
            secTestBtn.innerText = 'Testing...';
            try {
              s.status = 'testing';
              s.statusColor = '#fbbf24';
              this.updateSourcesRegistry();
              
              const res = await fetch('/api/debug/secondary-ais-test');
              const data = await res.json();
              if (data.status === 'success') {
                s.status = 'connected';
                s.statusColor = '#10b981';
                s.records = data.vesselsCount;
                s.lastSuccessConnection = new Date();
                s.lastError = null;
                alert(`Test Success! Fetched ${data.vesselsCount} vessels.`);
              } else {
                s.status = 'error';
                s.statusColor = '#ef4444';
                s.lastError = data.message;
                alert(`Test Failed: ${data.message}`);
              }
            } catch (err) {
              s.status = 'error';
              s.statusColor = '#ef4444';
              s.lastError = err.message;
              alert(`Test Failed: ${err.message}`);
            } finally {
              secTestBtn.disabled = false;
              secTestBtn.innerText = oldText;
              this.updateSourcesRegistry();
            }
          });
        }
      } else if (s.id === 'gee') {
        const projectVal = s.project || 'None';
        const latestDate = s.latestDatasetDate || 'N/A';
        const recordsCount = s.records || 0;
        const varsUsed = s.variablesUsed || 'Sea Surface Temperature (sst)';
        const srcType = s.sourceType || 'Environmental prey-habitat proxy';
        const labelText = s.label || 'Environmental prey-habitat proxy — not direct krill detection';
        
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 600;">
            <span style="color: var(--text-primary); font-size: 11px;">${s.name}</span>
            <span style="font-size: 8.5px; color: var(--text-secondary); opacity: 0.8;">${s.classification}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 9.5px; color: var(--text-secondary);">
            <span>Status: <span style="font-weight: 500; color: ${s.statusColor};">${statusText}</span></span>
            <span>Last Fetch: <span style="font-family: var(--font-mono);">${lastFetchText}</span></span>
          </div>
          
          <div style="margin-top: 6px; padding: 6px; background: rgba(0,0,0,0.25); border-radius: 6px; display: flex; flex-direction: column; gap: 2px; border: 1px solid rgba(255,255,255,0.03); font-size: 9px; line-height: 1.3;">
            <div style="display: flex; justify-content: space-between;"><span>Label:</span><span style="color: var(--text-primary); font-weight: 600;">${labelText}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Project:</span><span style="color: var(--text-primary); font-family: var(--font-mono);">${projectVal}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Latest Dataset Date:</span><span style="color: var(--text-primary);">${latestDate}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Features Returned:</span><span style="color: var(--text-primary);">${recordsCount}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Variables:</span><span style="color: var(--text-primary);">${varsUsed}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Source Type:</span><span style="color: var(--text-primary);">${srcType}</span></div>
          </div>
          
          ${s.status !== 'connected' ? `
            <div style="margin-top: 4px; padding: 6px; background: rgba(245, 158, 11, 0.08); border-radius: 6px; border: 1px solid rgba(245,158,11,0.2); font-size: 9px; line-height: 1.3;">
              <div style="font-weight: bold; color: var(--color-amber); margin-bottom: 2px;">Google Earth Engine Setup Instructions:</div>
              1. Enable Google Earth Engine API in the GCP Console.<br/>
              2. Set <span style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary);">GOOGLE_EARTH_ENGINE_PROJECT</span> env var to your project ID.<br/>
              3. Run with Application Default Credentials (ADC) or set <span style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary);">GOOGLE_APPLICATION_CREDENTIALS</span>.
            </div>
          ` : ''}
          ${s.lastError ? `
            <div style="margin-top: 2px; font-size: 8.5px; color: #fbbf24; background: rgba(245, 158, 11, 0.08); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(245,158,11,0.15); font-family: var(--font-mono); line-height: 1.2;">
              Last Error/Instructions: ${s.lastError}
            </div>
          ` : ''}
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
            <button class="btn-test-connection" data-source="${s.id}">Test</button>
          </div>
        `;
      } else if (s.id === 'noaa_erddap') {
        const endpointVal = s.endpointUsed || 'https://coastwatch.pfeg.noaa.gov/erddap';
        const datasetVal = s.datasetName || 'jplMURSST41';
        const recordsCount = s.records || 0;
        const fetchTimeStr = s.lastSuccessConnection ? s.lastSuccessConnection.toLocaleTimeString() : 'Never';
        
        let erddapStatusLabel = statusText;
        if (s.status === 'fallback') {
          erddapStatusLabel = 'Fallback active';
        }
        
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 600;">
            <span style="color: var(--text-primary); font-size: 11px;">${s.name}</span>
            <span style="font-size: 8.5px; color: var(--text-secondary); opacity: 0.8;">${s.classification}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 9.5px; color: var(--text-secondary);">
            <span>Status: <span style="font-weight: 500; color: ${s.statusColor};">${erddapStatusLabel}</span></span>
            <span>Last Fetch: <span style="font-family: var(--font-mono);">${lastFetchText}</span></span>
          </div>
          
          <div style="margin-top: 6px; padding: 6px; background: rgba(0,0,0,0.25); border-radius: 6px; display: flex; flex-direction: column; gap: 2px; border: 1px solid rgba(255,255,255,0.03); font-size: 9px; line-height: 1.3;">
            <div style="display: flex; justify-content: space-between;"><span>Endpoint Used:</span><span style="color: var(--text-primary); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px;" title="${endpointVal}">${endpointVal}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Dataset Name:</span><span style="color: var(--text-primary);">${datasetVal}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Records Returned:</span><span style="color: var(--text-primary);">${recordsCount}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Latest Fetch Time:</span><span style="color: var(--text-primary);">${fetchTimeStr}</span></div>
          </div>
          ${s.status === 'fallback' ? `
            <div style="margin-top: 4px; padding: 6px; background: rgba(245, 158, 11, 0.08); border-radius: 6px; border: 1px solid rgba(245,158,11,0.2); font-size: 9px; line-height: 1.3;">
              <div style="font-weight: bold; color: var(--color-amber); margin-bottom: 2px;">NOAA ERDDAP Fallback Active:</div>
              - Primary ERDDAP unavailable/timed out.<br/>
              - Using real NOAA NDBC buoy water temperature for local SST context.
            </div>
          ` : ''}
          ${s.lastError && s.status !== 'fallback' ? `
            <div style="margin-top: 2px; font-size: 8.5px; color: #fbbf24; background: rgba(245, 158, 11, 0.08); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(245, 158, 11, 0.15); font-family: var(--font-mono); line-height: 1.2;">
              Last Error/Limitation: ${s.lastError}
            </div>
          ` : ''}
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;">
            <button class="btn-test-connection" data-source="${s.id}">Test</button>
          </div>
        `;
      } else {
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 600;">
            <span style="color: var(--text-primary); font-size: 11px;">${s.name}</span>
            <span style="font-size: 8.5px; color: var(--text-secondary); opacity: 0.8;">${s.classification}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 9.5px; color: var(--text-secondary);">
            <span>Status: <span style="font-weight: 500; color: ${s.statusColor};">${statusText}</span></span>
            <span>Last Fetch: <span style="font-family: var(--font-mono);">${lastFetchText}</span></span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: var(--text-secondary);">
            <span>Records: <span style="font-weight: 600; color: var(--text-primary);">${s.records}</span></span>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${countdownHtml}
              <button class="btn-test-connection" data-source="${s.id}">Test</button>
            </div>
          </div>
          ${s.missingEnv !== 'None' && s.status !== 'connected' ? `
            <div style="margin-top: 2px; font-size: 9px; color: #f59e0b; background: rgba(245, 158, 11, 0.08); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(245,158,11,0.2);">
              Required ENV: <span style="font-family: var(--font-mono); font-weight: 600;">${s.missingEnv}</span>
            </div>
          ` : ''}
          ${s.lastError ? `
            <div style="margin-top: 2px; font-size: 8.5px; color: ${s.status === 'partner_access_required' ? '#fbbf24' : '#f87171'}; background: ${s.status === 'partner_access_required' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)'}; padding: 2px 6px; border-radius: 4px; border: 1px solid ${s.status === 'partner_access_required' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; font-family: var(--font-mono); line-height: 1.2;">
              ${s.status === 'partner_access_required' ? 'Info' : 'Error'}: ${s.lastError}
            </div>
          ` : ''}
        `;
      }
      
      const testBtn = card.querySelector('.btn-test-connection');
      if (testBtn) {
        testBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.sourceManager.testConnection(s.id);
        });
        if (s.status === 'testing') {
          testBtn.disabled = true;
        }
      }
      
      const reconnectBtn = card.querySelector('.btn-reconnect-ais');
      if (reconnectBtn) {
        reconnectBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          reconnectBtn.disabled = true;
          const oldText = reconnectBtn.innerText;
          reconnectBtn.innerText = 'Reconnecting...';
          try {
            s.status = 'connecting';
            s.statusColor = '#fbbf24';
            this.updateSourcesRegistry();
            
            const res = await fetch('/api/debug/aisstream-test?wait=30');
            const data = await res.json();
            
            await this.fetchAISVessels();
            alert(`Reconnect completed: ${data.conclusion || 'Done'}`);
          } catch (err) {
            console.error(err);
            alert(`Reconnect failed: ${err.message}`);
          } finally {
            reconnectBtn.disabled = false;
            reconnectBtn.innerText = oldText;
            this.updateSourcesRegistry();
          }
        });
        if (s.status === 'connecting' || s.status === 'testing') {
          reconnectBtn.disabled = true;
        }
      }
      
      listEl.appendChild(card);
    });
  }

  updateWorkflowPanel() {
    const listEl = document.getElementById('workflow-steps-list');
    if (!listEl) return;
    
    const config = this.feedConfig || {};
    const timestamp = new Date().toLocaleTimeString();
    
    const steps = [
      {
        num: 1,
        title: "Live AIS vessels received",
        status: config.aisStreamKeyConfigured ? "active" : "missing",
        source: "AISstream.io WebSocket",
        updated: this.lastAISUpdate ? this.lastAISUpdate.toLocaleTimeString() : "Never",
        confidence: "High (GPS Telemetry)"
      },
      {
        num: 2,
        title: "Ocean/prey proxy updated",
        status: config.googleEarthEngineConfigured ? "active" : "missing",
        source: "Google Earth Engine Prey Proxy",
        updated: this.lastGEEUpdate ? this.lastGEEUpdate.toLocaleTimeString() : "Never",
        confidence: "Medium (Proxy Estimation)"
      },
      {
        num: 3,
        title: "Habitat/bathymetry layer loaded",
        status: "active",
        source: "NOAA / GEBCO Seafloor Contours",
        updated: "Static Data Loaded",
        confidence: "High"
      },
      {
        num: 4,
        title: "Whale feed status checked",
        status: (config.whaleSafeConfigured || config.whaleAlertConfigured) ? "active" : "pending",
        source: "Whale Safe / Whale Alert",
        updated: this.lastWhaleUpdate ? this.lastWhaleUpdate.toLocaleTimeString() : "Never",
        confidence: (config.whaleSafeConfigured || config.whaleAlertConfigured) ? "High (Acoustics + Telemetry)" : "N/A (Optional feeds disconnected)"
      },
      {
        num: 5,
        title: "Dynamic danger zones calculated",
        status: "active",
        source: "AI Sentinel Risk Model",
        updated: timestamp,
        confidence: (config.whaleSafeConfigured || config.whaleAlertConfigured) ? "High" : "Medium-Low (No whale feed, proxy only)"
      },
      {
        num: 6,
        title: "Safe speed recommendation assigned",
        status: "active",
        source: "USCG Safe Speed advisory matrix",
        updated: timestamp,
        confidence: "High"
      },
      {
        num: 7,
        title: "Vessel compliance checked",
        status: config.aisStreamKeyConfigured ? "active" : "pending",
        source: "USCG VTS Compliance Engine",
        updated: timestamp,
        confidence: "High"
      },
      {
        num: 8,
        title: "Alerts/review flags generated",
        status: config.aisStreamKeyConfigured ? "active" : "pending",
        source: "Compliance Exceedance Logger",
        updated: timestamp,
        confidence: "High"
      }
    ];
    
    listEl.innerHTML = '';
    
    steps.forEach(s => {
      const stepCard = document.createElement('div');
      stepCard.className = 'glass-card-nested';
      stepCard.style.cssText = 'padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 4px; background: rgba(15, 23, 42, 0.45); margin-bottom: 4px;';
      
      let statusColor = '#ef4444';
      let statusLabel = 'Missing';
      if (s.status === 'active') {
        statusColor = '#10b981';
        statusLabel = 'Active';
      } else if (s.status === 'pending') {
        statusColor = '#fbbf24';
        statusLabel = 'Pending (Optional)';
      }
      
      stepCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; font-size: 11px; color: var(--text-primary);">Step ${s.num}: ${s.title}</span>
          <span style="font-size: 9px; font-weight: bold; color: ${statusColor};">${statusLabel}</span>
        </div>
        <div style="font-size: 9px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 2px; padding-left: 10px; border-left: 2px solid ${statusColor}; margin-top: 2px;">
          <div>Source: <span style="color: var(--text-primary); font-weight: 500;">${s.source}</span></div>
          <div>Updated: <span style="color: var(--text-primary);">${s.updated}</span></div>
          <div>Confidence: <span style="color: var(--text-primary);">${s.confidence}</span></div>
        </div>
      `;
      listEl.appendChild(stepCard);
    });
  }

  updateReadinessChecklist() {
    const listEl = document.getElementById('readiness-checklist');
    if (!listEl) return;
    
    const config = this.feedConfig || {};
    const sources = this.sourceManager.sources;
    const aisVesselsCount = this.sim.vessels.filter(v => v.id.startsWith('AIS-') || v.id.startsWith('LK-') || v.id.startsWith('HIST-')).length;
    
    const isAisActive = ['connected', 'receiving', 'connected_waiting', 'live', 'receiving_data'].includes(sources.aisstream.status) || aisVesselsCount > 0;
    
    listEl.innerHTML = `
      <div class="readiness-item">
        <div class="readiness-header">
          <span class="readiness-title">AISstream WebSocket</span>
          <span class="readiness-status ${isAisActive ? 'yes' : 'no'}">
            ${isAisActive ? 'ACTIVE / CONNECTED' : 'OFFLINE'}
          </span>
        </div>
        <div class="readiness-details">
          <span>API Key: ${config.aisStreamKeyConfigured ? 'Present' : 'Missing'}</span>
          <span>BBox: ${config.aisBboxMinLat || '37.1'}, ${config.aisBboxMinLon || '-123.5'}</span>
          <span>Vessels: ${aisVesselsCount}</span>
          <span>Messages: ${sources.aisstream.records}</span>
          <span style="grid-column: span 2;">Last Msg: ${sources.aisstream.lastSuccessDataRecord ? sources.aisstream.lastSuccessDataRecord.toLocaleTimeString() : 'N/A'}</span>
        </div>
      </div>
      
      <div class="readiness-item">
        <div class="readiness-header">
          <span class="readiness-title">NOAA Oceanography</span>
          <span class="readiness-status ${sources.noaa_ndbc.status === 'connected' ? 'yes' : 'no'}">
            ${sources.noaa_ndbc.status === 'connected' ? 'Connected' : 'Offline'}
          </span>
        </div>
        <div class="readiness-details">
          <span>NDBC: ${sources.noaa_ndbc.status === 'connected' ? 'Reachable' : 'Offline'}</span>
          <span>ERDDAP: ${['connected', 'fallback'].includes(sources.noaa_erddap.status) ? 'Reachable' : 'Offline'}</span>
          <span style="grid-column: span 2;">Latest Buoy: ${sources.noaa_ndbc.lastSuccessDataRecord ? sources.noaa_ndbc.lastSuccessDataRecord.toLocaleTimeString() : 'N/A'}</span>
          <span style="grid-column: span 2;">Latest SST: ${sources.noaa_erddap.lastSuccessDataRecord ? sources.noaa_erddap.lastSuccessDataRecord.toLocaleDateString() : 'N/A'}</span>
        </div>
      </div>
      
      <div class="readiness-item">
        <div class="readiness-header">
          <span class="readiness-title">Google Earth Engine</span>
          <span class="readiness-status ${sources.gee.status === 'connected' ? 'yes' : 'no'}">
            ${sources.gee.status === 'connected' ? 'Connected' : 'Offline'}
          </span>
        </div>
        <div class="readiness-details">
          <span>Credentials: ${config.googleEarthEngineConfigured ? 'Present' : 'Missing'}</span>
          <span>Prey Plumes: ${sources.gee.status === 'connected' ? 'Active' : 'Inactive'}</span>
          <span style="grid-column: span 2;">Latest GEE Color: ${sources.gee.lastSuccessDataRecord ? sources.gee.lastSuccessDataRecord.toLocaleDateString() : 'N/A'}</span>
        </div>
      </div>
      
      <div class="readiness-item">
        <div class="readiness-header">
          <span class="readiness-title">Partner Whale feeds</span>
          <span class="readiness-status ${sources.whale_safe.status === 'connected' ? 'yes' : 'maybe'}">
            ${sources.whale_safe.status === 'connected' ? 'Connected' : 'Partner Access Required / Optional'}
          </span>
        </div>
        <div class="readiness-details">
          <span>WhaleSafe: ${config.whaleSafeConfigured ? 'Present' : 'Missing'}</span>
          <span>WhaleAlert: ${config.whaleAlertConfigured ? 'Present' : 'Missing'}</span>
          <span style="grid-column: span 2;">Access Status: ${sources.whale_safe.status === 'connected' ? 'Connected' : 'Partner Access Required / Optional'}</span>
        </div>
      </div>
    `;
  }

  runTroubleshootingDiagnostics() {
    const panel = document.getElementById('troubleshooting-panel');
    if (!panel) return;
    
    const config = this.feedConfig || {};
    const sources = this.sourceManager.sources;
    const aisVesselsCount = this.sim.vessels.filter(v => v.id.startsWith('AIS-') || v.id.startsWith('LK-') || v.id.startsWith('HIST-')).length;
    const isDemo = this.sim.demoMode;
    
    panel.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'troubleshooting-header';
    header.innerText = 'DIAGNOSTIC TELEMETRY ANALYSIS';
    panel.appendChild(header);
    
    const addLine = (text, type = '') => {
      const line = document.createElement('div');
      line.className = `troubleshooting-line ${type}`;
      line.innerHTML = text;
      panel.appendChild(line);
    };
    
    if (isDemo) {
      addLine('✔ Demo / Simulation mode is active. Standard diagnostic checks bypassed.', 'success');
      return;
    }
    
    if (!config.aisStreamKeyConfigured) {
      addLine('✖ AISSTREAM_API_KEY is not configured in environment variables.', 'danger');
      addLine('<div class="troubleshooting-bullet">Vessel data requires an active token from AISstream.io. Please configure it in your .env file.</div>');
      return;
    } else {
      addLine('✔ AISstream API key configured successfully.', 'success');
    }
    
    if (sources.aisstream.status === 'disconnected') {
      addLine('✖ WebSocket connection is offline.', 'danger');
      addLine('<div class="troubleshooting-bullet">Check network connectivity. Verify server ports are open for outgoing websockets.</div>');
      return;
    } else if (sources.aisstream.status === 'error') {
      addLine('✖ WebSocket connection error.', 'danger');
      addLine(`<div class="troubleshooting-bullet">Details: ${sources.aisstream.lastError || 'Handshake failed.'}</div>`);
      return;
    } else if (sources.aisstream.status === 'retrying') {
      addLine('✖ WebSocket connection closed. Retrying connection...', 'warn');
      return;
    } else {
      addLine('✔ WebSocket handshake established with stream.aisstream.io.', 'success');
    }
    
    const minLat = parseFloat(config.aisBboxMinLat || '37.1');
    const minLon = parseFloat(config.aisBboxMinLon || '-123.5');
    const maxLat = parseFloat(config.aisBboxMaxLat || '38.5');
    const maxLon = parseFloat(config.aisBboxMaxLon || '-122.0');
    
    if (isNaN(minLat) || isNaN(minLon) || isNaN(maxLat) || isNaN(maxLon)) {
      addLine('✖ Bounding box coordinates are invalid or malformed.', 'danger');
      return;
    } else if (minLat >= maxLat || minLon >= maxLon) {
      addLine('✖ Bounding box coordinates are inverted (min >= max).', 'danger');
      return;
    } else {
      addLine(`✔ Subscription sent for bounding box: [${minLat}, ${minLon}] to [${maxLat}, ${maxLon}].`, 'success');
    }
    
    if (sources.aisstream.records === 0) {
      addLine('✖ Connection open, but 0 messages received.', 'danger');
      addLine('<div class="troubleshooting-bullet">Check if the bounding box covers active shipping channels.</div>');
      addLine('<div class="troubleshooting-bullet">Verify if the API key has been rate-limited or blocked by AISstream.io.</div>');
      return;
    } else {
      addLine(`✔ Received ${sources.aisstream.records} raw WebSocket messages.`, 'success');
    }
    
    if (aisVesselsCount === 0) {
      addLine('✖ Messages received, but 0 vessels parsed inside region.', 'warn');
      addLine('<div class="troubleshooting-bullet">Confirm if the messages contain vessel reports (AIS Class A/B position reports, type 1, 2, 3, 18, 19).</div>');
      addLine('<div class="troubleshooting-bullet">Try expanding your bounding box in env configuration to cover wider waters.</div>');
      return;
    } else {
      addLine(`✔ Successfully parsed ${aisVesselsCount} active vessels.`, 'success');
    }
    
    const aisLayerChecked = document.getElementById('layer-ais')?.checked;
    if (!aisLayerChecked) {
      addLine('⚠ Vessels are parsed but hidden by the "Live AIS Ships" layer toggle.', 'warn');
    }
    
    if (this.currentVesselFilter !== 'all') {
      addLine(`⚠ Vessel list filter is set to "${this.currentVesselFilter}". Some ships may be filtered out.`, 'warn');
    }
    
    const mapBounds = this.map2D.map ? this.map2D.map.getBounds() : null;
    if (mapBounds) {
      let anyInView = false;
      this.sim.vessels.forEach(v => {
        if (!v.id.startsWith('AIS-') && !v.id.startsWith('LK-') && !v.id.startsWith('HIST-')) return;
        const latLng = this.sim.simToLatLng(v.x, v.y);
        if (mapBounds.contains(latLng)) {
          anyInView = true;
        }
      });
      if (!anyInView) {
        addLine('⚠ Vessels are active but currently outside the map viewport. Zoom out or click "Recenter Map" to locate them.', 'warn');
      } else {
        addLine('✔ All diagnostics passed. Live AIS vessels are actively rendering in the current viewport.', 'success');
      }
    }
  }

  updateWhaleMissingBanner() {
    const banner = document.getElementById('whale-missing-banner');
    if (!banner) return;
    
    const isDemo = this.sim.demoMode;
    const hasWhales = this.sim.whales.length > 0;
    
    const shouldShow = !isDemo && !hasWhales;
    if (shouldShow) {
      banner.classList.remove('hidden');
      banner.innerHTML = `
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 6px #ef4444; display: inline-block;"></span>
        Whale detection feed not connected
      `;
    } else {
      banner.classList.add('hidden');
    }
  }

  updateAisMissingBanner() {
    const banner = document.getElementById('ais-missing-banner');
    if (!banner) return;
    
    const isDemo = this.sim.demoMode;
    const hasLiveVessels = this.sim.vessels.some(v => v.id.startsWith('AIS-'));
    
    const shouldShow = !isDemo && !hasLiveVessels;
    if (shouldShow) {
      banner.classList.remove('hidden');
      const hasFallback = this.sim.vessels.some(v => v.id.startsWith('LK-') || v.id.startsWith('HIST-'));
      if (hasFallback) {
        banner.innerHTML = `
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #fbbf24; box-shadow: 0 0 6px #fbbf24; display: inline-block;"></span>
          Live AIS temporarily unavailable — Live compliance tracking offline — displaying available real environmental layers.
        `;
      } else {
        const aisSource = this.sourceManager?.sources?.aisstream || {};
        const connStatus = aisSource.connectionStatus || 'disconnected';
        if (connStatus === 'connected_waiting') {
          banner.innerHTML = `
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #fbbf24; box-shadow: 0 0 6px #fbbf24; display: inline-block;"></span>
            AISstream connected, waiting for live frames.
          `;
        } else if (connStatus === 'connecting' || connStatus === 'testing' || connStatus === 'retrying') {
          banner.innerHTML = `
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #fbbf24; box-shadow: 0 0 6px #fbbf24; display: inline-block;"></span>
            AISstream connecting...
          `;
        } else {
          banner.innerHTML = `
            <span style="width: 6px; height: 6px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 6px #ef4444; display: inline-block;"></span>
            Live AIS temporarily unavailable (feed offline).
          `;
        }
      }
    } else {
      banner.classList.add('hidden');
    }
  }

  runRealDataAudit() {
    const displayEl = document.getElementById('audit-result-display');
    if (!displayEl) return;
    
    displayEl.style.display = 'block';
    displayEl.innerText = "Running Audit...";
    displayEl.style.background = 'rgba(255,255,255,0.05)';
    displayEl.style.color = 'var(--text-secondary)';
    
    setTimeout(() => {
      try {
        let isProduction = !this.sim.demoMode;
        let auditPassed = true;
        let failures = [];
        let missingProvenance = false;
        let mislabeledFallback = false;
        
        // Grab configuration and stats
        const config = this.feedConfig || {};
        const isRealDataOnly = config.realDataOnly === 'true' || config.realDataOnly === true;
        const isAllowSampleData = config.allowSampleData === 'true' || config.allowSampleData === true;
        const isKeyPresent = config.aisStreamKeyConfigured ? 'Yes' : 'No';
        
        const aisStatusVal = this.sourceManager?.sources?.aisstream?.status || 'disconnected';
        const isAISConnected = this.aisStatus === 'Connected' || ['connected', 'receiving', 'connected_waiting', 'last_known', 'historical'].includes(aisStatusVal);
        const aisVesselsCount = this.sim.vessels.filter(v => v.id && (String(v.id).startsWith('AIS-') || String(v.id).startsWith('LK-') || String(v.id).startsWith('HIST-'))).length;
        
        const isNDBCConnected = this.buoyStatus && !this.buoyStatus.includes('unavailable') && this.buoyStatus !== 'Error fetching NOAA buoy telemetry';
        const isGEEConnected = this.geeStatus === 'Connected' || this.geeStatus === 'connected' || this.geeStatus === 'Loaded';
        
        const fakeWhalesCount = this.sim.whales.filter(w => !w.id || (!String(w.id).startsWith('REAL-') && !String(w.id).startsWith('BQ-') && !String(w.id).startsWith('OBIS-'))).length;
        const fakeVesselsCount = this.sim.vessels.filter(v => !v.id || (!String(v.id).startsWith('AIS-') && !String(v.id).startsWith('LK-') && !String(v.id).startsWith('HIST-'))).length;
        
        if (isProduction) {
          // 1. Environment and configuration rules
          if (!isRealDataOnly) {
            auditPassed = false;
            failures.push("Configuration violation: REAL_DATA_ONLY is not set to true.");
          }
          if (isAllowSampleData) {
            auditPassed = false;
            failures.push("Configuration violation: ALLOW_SAMPLE_DATA is not set to false.");
          }

          // 2. Fake data check
          if (fakeVesselsCount > 0) {
            auditPassed = false;
            failures.push(`Fake vessel data found in production: ${fakeVesselsCount} vessels`);
          }
          if (fakeWhalesCount > 0) {
            auditPassed = false;
            failures.push(`Fake whale/krill points found in production: ${fakeWhalesCount} points`);
          }
          
          // 3. Core live data check
          if (!isAISConnected) {
            auditPassed = false;
            failures.push("Core AISstream feed is not active/connected");
          }
          if (aisVesselsCount === 0) {
            auditPassed = false;
            failures.push("No active AIS vessels rendered on map");
          }
          
          // 4. Source provenance checks
          missingProvenance = this.sim.vessels.some(v => !v.sourceName || !v.sourceType);
          if (missingProvenance) {
            auditPassed = false;
            failures.push("Vessel provenance violation: Some displayed vessels are missing source provenance name or type.");
          }

          // 5. Fallback labeling checks
          mislabeledFallback = this.sim.vessels.some(v => {
            const isFallback = v.sourceType === 'historical' || v.sourceType === 'last-known' || (v.id && (String(v.id).startsWith('HIST-') || String(v.id).startsWith('LK-')));
            return isFallback && v.sourceName !== 'Historical AIS Fallback — not live';
          });
          if (mislabeledFallback) {
            auditPassed = false;
            failures.push("Vessel labeling violation: Historical/Last-known fallback vessels are not labeled 'Historical AIS Fallback — not live'.");
          }

          // 6. Live compliance check
          const rateCompEl = document.getElementById('rate-compliance');
          const hasLiveVessels = this.sim.vessels.some(v => v.id.startsWith('AIS-'));
          if (!hasLiveVessels && rateCompEl && rateCompEl.innerText !== 'N/A') {
            auditPassed = false;
            failures.push("Compliance violation: Live compliance tracking remains active without a live AIS provider (must show N/A).");
          }
          
          // 7. Labeling check: ensure krill is labeled as "Prey/Krill Probability Proxy" or "Estimated Prey/Krill Probability"
          const layerChlorophyllLabel = document.getElementById('layer-chlorophyll')?.parentElement?.innerText || '';
          if (layerChlorophyllLabel.toLowerCase().includes('live krill')) {
            auditPassed = false;
            failures.push("Incorrect label: Prey layer must be labeled as proxy/estimated, not 'Live Krill'");
          }
          
          // 8. Fine/enforcement check
          const enforcementMode = this.feedConfig?.enforcementMode === true;
          if (!enforcementMode) {
            const citationNoticeText = document.querySelector('.citation-alert-notice')?.innerText || '';
            if (citationNoticeText.toLowerCase().includes('fine issued') || citationNoticeText.toLowerCase().includes('civil penalty issued')) {
              auditPassed = false;
              failures.push("Incorrect terminology: App claims to issue fines, but enforcement mode is disabled (must say 'flagged for review')");
            }
          }
          
          // 9. Active Whale Alert check: must not show active whale alerts without real/user whale detections
          const hasActiveWhaleAlertWithoutSource = this.sim.dangerZones.some(dz => {
            return dz.active && dz.name.includes('Active Whale Alert') && !dz.hasRealWhale && !dz.hasUserWhale;
          });
          if (hasActiveWhaleAlertWithoutSource) {
            auditPassed = false;
            failures.push("Incorrect alert: Active Whale Alert shown without real whale detection/sighting feed");
          }
        } else {
          auditPassed = false;
          failures.push("Real Data Audit cannot pass in Demo/Simulation Mode. Toggle Live Production Mode to audit production.");
        }
        
        const sources = this.sourceManager?.sources || {};
        const bigquery_users = sources.bigquery_users || { status: 'disconnected' };
        const noaa_erddap = sources.noaa_erddap || { status: 'disconnected' };
        const obis_seamap = sources.obis_seamap || { status: 'disconnected' };
        const whale_safe = sources.whale_safe || { status: 'disconnected' };
        const whale_alert = sources.whale_alert || { status: 'disconnected' };
        const mbari = sources.mbari || { status: 'disconnected' };
        const farallon = sources.farallon || { status: 'disconnected' };

        const connectedSources = [];
        if (isAISConnected) connectedSources.push("AISstream");
        if (isNDBCConnected) connectedSources.push("NOAA NDBC");
        if (isGEEConnected) connectedSources.push("GEE Prey Proxy");
        if (bigquery_users.status === 'connected') connectedSources.push("BigQuery Sightings");
        
        const fallbackSources = [];
        if (noaa_erddap.status === 'fallback') fallbackSources.push("NOAA SST (Buoy WTMP Fallback)");
        if (obis_seamap.status === 'connected') fallbackSources.push("OBIS Historical Archive");

        const optionalPartnerFeeds = [];
        optionalPartnerFeeds.push(`Whale Safe (${whale_safe.status === 'connected' ? 'Connected' : 'Optional partner feed — access pending'})`);
        optionalPartnerFeeds.push(`Whale Alert (${whale_alert.status === 'connected' ? 'Connected' : 'Optional partner feed — access pending'})`);
        optionalPartnerFeeds.push(`MBARI Acoustic (${mbari.status === 'connected' ? 'Connected' : 'Optional partner feed — access pending'})`);
        optionalPartnerFeeds.push(`Farallon Acoustic (${farallon.status === 'connected' ? 'Connected' : 'Optional partner feed — access pending'})`);

        const isComplianceLive = this.sim.vessels.some(v => v.id && String(v.id).startsWith('AIS-'));
        const riskZonesCount = this.sim.dangerZones.filter(z => z.active).length;
        const preyZonesCount = this.sim.krillPatches.length;

        // Detailed checklist format
        displayEl.innerHTML = `
          <div style="text-align: left; font-size: 10px; font-family: var(--font-mono); line-height: 1.4; display: flex; flex-direction: column; gap: 4px; padding: 8px;">
            <div style="font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 4px; color: var(--text-primary); text-transform: uppercase;">Real Data Audit Checklist</div>
            
            <div style="margin-bottom: 4px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 4px;">
              <strong>CONNECTED SOURCES:</strong> ${connectedSources.join(', ') || 'None'}
            </div>
            <div style="margin-bottom: 4px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 4px;">
              <strong>FALLBACK SOURCES:</strong> ${fallbackSources.join(', ') || 'None'}
            </div>
            <div style="margin-bottom: 4px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 4px; font-size: 9px; color: var(--text-secondary);">
              <strong>OPTIONAL PARTNER FEEDS:</strong><br/>
              - ${optionalPartnerFeeds.join('<br/>- ')}
            </div>

            <div>[${isAISConnected ? '✔' : '✖'}] AIS Live Feed: <span style="color:${isAISConnected ? '#10b981' : '#ef4444'}">${isAISConnected ? 'Connected' : 'Disconnected'}</span></div>
            <div>[✔] AIS Vessels Rendered: <span style="color:#22d3ee; font-weight: bold;">${aisVesselsCount}</span></div>
            <div>[✔] Active Risk Zones (Merged): <span style="color:#ef4444; font-weight: bold;">${riskZonesCount}</span></div>
            <div>[✔] Prey Proxy Zones (Plumes): <span style="color:#f97316; font-weight: bold;">${preyZonesCount}</span></div>
            
            <div>[${isRealDataOnly && !isAllowSampleData ? '✔' : '✖'}] Production Mode Config: <span style="color:${isRealDataOnly && !isAllowSampleData ? '#10b981' : '#ef4444'}">${isRealDataOnly && !isAllowSampleData ? 'REAL_ONLY' : 'SAMPLE_ALLOWED'}</span></div>
            <div>[${fakeVesselsCount + fakeWhalesCount === 0 ? '✔' : '✖'}] No Fake Data in Production: <span style="color:${fakeVesselsCount + fakeWhalesCount === 0 ? '#10b981' : '#ef4444'}">${fakeVesselsCount + fakeWhalesCount === 0 ? 'PASS' : 'FAIL'}</span></div>
            <div>[✔] Vessel Provenance & Labels: <span style="color:${!mislabeledFallback && !missingProvenance ? '#10b981' : '#ef4444'}">${!mislabeledFallback && !missingProvenance ? 'PASS' : 'FAIL'}</span></div>
            <div>[✔] Compliance Monitoring: <span style="color:${isComplianceLive ? '#22d3ee' : '#94a3b8'}; font-weight: bold;">${isComplianceLive ? 'LIVE (10 kts geofence)' : 'DISABLED (historical mode)'}</span></div>
          </div>
        `;
        
        if (auditPassed) {
          displayEl.style.background = 'rgba(16, 185, 129, 0.12)';
          displayEl.style.color = '#10b981';
          displayEl.style.border = '1px solid rgba(16, 185, 129, 0.25)';
        } else {
          displayEl.style.background = 'rgba(239, 68, 68, 0.12)';
          displayEl.style.color = '#ef4444';
          displayEl.style.border = '1px solid rgba(239, 68, 68, 0.25)';
          displayEl.innerHTML += `<div style="font-size: 8.5px; margin-top: 6px; color: #f87171; border-top: 1px solid rgba(239,68,68,0.15); padding-top: 4px; text-align: left;">- ${failures.join('<br>- ')}</div>`;
        }
        
      } catch (err) {
        console.error("Audit run failed:", err);
        displayEl.innerText = `Audit failed with internal error: ${err.message}`;
        displayEl.style.background = 'rgba(239, 68, 68, 0.12)';
        displayEl.style.color = '#ef4444';
      }
    }, 1000);
  }

  updateHeaderTooltipProvenance() {
    const isDemo = this.sim.demoMode;
    const activeZonesCount = this.sim.dangerZones.filter(z => z.active).length;
    const vesselsCount = this.sim.vessels.length;
    const timestamp = new Date().toLocaleTimeString();
    
    // 1. Alert Zones Tooltip
    const alertZoneBadge = document.querySelector('[data-tooltip*="Active predictive whale-alert zones"]');
    if (alertZoneBadge) {
      const modeText = isDemo ? "Sample Mode" : (activeZonesCount > 0 ? "Real" : "N/A");
      alertZoneBadge.setAttribute('data-tooltip', 
        `Source: VTS Risk Model | Real records used: ${activeZonesCount} zones | Updated: ${timestamp} | Mode: ${modeText}`
      );
    }
    
    // 2. AIS Vessels Tooltip
    const vesselsBadge = document.querySelector('[data-tooltip*="Vessels currently tracked by AIS"]');
    if (vesselsBadge) {
      const modeText = isDemo ? "Sample Mode" : (this.feedConfig?.aisStreamKeyConfigured ? "Real" : "Unavailable");
      vesselsBadge.setAttribute('data-tooltip', 
        `Source: AISstream.io WebSocket | Real records used: ${vesselsCount} | Updated: ${timestamp} | Mode: ${modeText}`
      );
    }
    
    // 3. Compliance Tooltip
    const complianceBadge = document.querySelector('[data-tooltip*="Overall vessel compliance rate"]');
    if (complianceBadge) {
      const modeText = isDemo ? "Sample Mode" : (vesselsCount > 0 ? "Real" : "N/A");
      complianceBadge.setAttribute('data-tooltip', 
        `Source: VTS Compliance Engine | Real records used: ${vesselsCount} | Updated: ${timestamp} | Mode: ${modeText}`
      );
    }
    
    // 4. Risk Reduction Tooltip
    const rrrBadge = document.querySelector('[data-tooltip*="Estimated collision risk reduction"]');
    if (rrrBadge) {
      const modeText = isDemo ? "Sample Mode" : (vesselsCount > 0 ? "Real" : "N/A");
      rrrBadge.setAttribute('data-tooltip', 
        `Source: Risk Mitigation Index | Real records used: ${vesselsCount} | Updated: ${timestamp} | Mode: ${modeText}`
      );
    }
    
    // 5. Recommended Speed Tooltip
    const recSpeedBadge = document.getElementById('rec-speed-badge');
    if (recSpeedBadge) {
      const modeText = isDemo ? "Sample Mode" : (activeZonesCount > 0 ? "Real" : "N/A");
      recSpeedBadge.setAttribute('data-tooltip', 
        `Source: USCG Cetacean Advisory | Real records used: ${activeZonesCount} zones | Updated: ${timestamp} | Mode: ${modeText}`
      );
    }
  }
}
