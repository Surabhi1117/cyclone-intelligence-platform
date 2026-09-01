# Real-Time Multi-Source Tropical Cyclone AI Pipeline & Dynamic Dashboard

A production-ready, fully decoupled system for continuous tropical cyclone (TC) ingestion, AI-based multi-task identification, pattern classification, trajectory/intensity forecasting, and a modular high-density meteorological dashboard.

---

## 1. Architectural Highlights

```
[External Data Feeds] ──► [Continuous Ingestion Worker (Poll/Webhook)]
                                    │
                                    ▼ (New File Detected)
                         [Standardization & Tensor Cropper]
                                    │
                                    ▼ (Publish Task)
                         [Inference Engine (PyTorch FP16)]
                                    │
                                    ▼ (Physics Verification Guardrail)
                                    │
                                    ▼ (WebSocket / REST Push)
                         [Dynamic Frontend Dashboard (React/Tailwind)]
```

### Key Technical Safeguards
1. **Decoupled Ingestion & Event Stream:** UI widget customizations never touch modeling logic; data arrives via a centralized WebSocket stream (`/ws/live-feed`).
2. **Idempotent Ingestion:** Hash-based deduplication (`processed_files` SQLite log with SHA-256) discards redundant satellite granules before GPU execution.
3. **Physics Verification Guardrail:** Inferences passing through `physics.py` reject non-physical artifacts using Atkinson-Holliday wind-pressure relationships ($V_{max} = 6.7(1010 - P_{min})^{0.644}$) and kinematic acceleration bounds.
4. **Grad-CAM Attention Heatmap:** Direct explainability overlay highlighting storm eyewalls and spiral convective rainbands.

---

## 2. Directory Structure

```
tropical-cyclone-ai/
├── backend/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── storms.py          # Active storms, historical tracks, latest tensor inference
│   │   │   └── ingest.py          # Manual triggers, audit logs, simulation controls
│   │   ├── websocket.py           # Real-time WebSocket connection manager & broadcaster
│   │   └── main.py                # FastAPI entrypoint with background worker lifespan
│   ├── core/
│   │   ├── models/
│   │   │   ├── spatial_encoder.py       # Multi-spectral CNN + Spatial Attention + Grad-CAM
│   │   │   ├── temporal_transformer.py  # Sequence Transformer fusing 6D environmental vectors
│   │   │   └── cyclone_model.py         # Multi-task heads: Genesis, Pattern, Category, Track, Intensity
│   │   ├── physics.py             # Atkinson-Holliday WPR & Kinematic verification
│   │   └── inference_engine.py    # Production inference orchestrator (FP16 supported)
│   ├── worker/
│   │   ├── ingestion_stream.py    # Continuous watcher daemon & SQLite deduplication
│   │   ├── satellite_cropper.py   # 1000km x 1000km (128x128) multi-spectral cropper & colormaps
│   │   └── data_fetcher.py        # NOAA IBTrACS feed + High-Fidelity Synthetic Stream Generator
│   ├── config.py                  # Pydantic settings
│   ├── requirements.txt
│   ├── test_e2e.py                # Automated integration test suite
│   ├── run_worker.py              # Standalone worker runner
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── widgets/
│   │   │   │   ├── TrajectoryMap.jsx    # Widget A: Leaflet map, track cones, IR heatmap overlay
│   │   │   │   ├── SatelliteViewer.jsx  # Widget B: Multi-spectral channels & Grad-CAM blend
│   │   │   │   ├── TelemetryCard.jsx    # Widget C: Dual gauges, pattern breakdown, WPR check
│   │   │   │   ├── ForecastCharts.jsx   # Widget D: Dual-axis Recharts intensity & pressure
│   │   │   │   └── IngestionLog.jsx     # Widget E: Live audit feed & performance metrics
│   │   │   ├── layout/
│   │   │   │   ├── Header.jsx           # Live feed status, basin & storm selector, quick actions
│   │   │   │   └── DynamicGrid.jsx      # Pluggable modular CSS grid
│   │   │   └── ui/
│   │   │       ├── Badge.jsx
│   │   │       ├── Card.jsx
│   │   │       └── Modal.jsx
│   │   ├── context/
│   │   │   ├── DashboardContext.jsx     # Layout ordering, visibility, alert thresholds
│   │   │   └── WebSocketContext.jsx     # Resilient WebSocket connection & ping latency
│   │   ├── hooks/
│   │   │   └── useLiveCycloneData.js    # Single centralized data hook
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```

---

## 3. How to Run

### Method 1: Local Development

#### 1. Start the Backend API & Ingestion Worker
```bash
cd tropical-cyclone-ai/backend
pip install -r requirements.txt
python api/main.py
```
- API Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/api/health`
- WebSocket: `ws://localhost:8000/ws/live-feed`

#### 2. Start the Frontend Dashboard
```bash
cd tropical-cyclone-ai/frontend
npm install
npm run dev
```
- Open `http://localhost:5173` in your browser.

---

### Method 2: Docker Compose
```bash
cd tropical-cyclone-ai
docker-compose up --build
```
- Access Dashboard at `http://localhost:3000`
- Access Backend API at `http://localhost:8000`

---

## 4. Verification & Testing

Run the automated end-to-end verification script:
```bash
cd tropical-cyclone-ai/backend
python test_e2e.py
```
This tests:
1. Health and active storm retrieval across 5 ocean basins.
2. Latest spatial tensor metadata, multi-task inference, Grad-CAM extraction, and physics confidence scoring.
3. Live WebSocket streaming channel.
4. On-demand manual satellite pass triggers and instantaneous broadcast delivery.
5. Ingestion idempotency and audit logs.

