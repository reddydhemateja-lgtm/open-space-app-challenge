# NASA Space Apps Challenge 2026: Harmonization of MODIS & VIIRS Hot Spots

A full-stack, scientifically-grounded web application designed to harmonize NASA MODIS (Terra & Aqua) and VIIRS (Suomi-NPP & NOAA-20/21) satellite active fire detections into a unified historical burning-activity calendar.

---

## 🛰️ 1. Scientific Overview & Problem Statement

Thermal anomaly detections from NASA's Earth Observing System cannot be naively added together to report "total fires":
- **Spatial Resolution Mismatch**: VIIRS 375m I-Band pixels cover **0.14 km²** at nadir, whereas MODIS pixels cover **1.0 km²** at nadir (a **7.14x area disparity**). For the same physical fire front, VIIRS routinely produces 3x to 8x more hot-spot detections than MODIS.
- **Coincident Overpass Double-Counting**: NASA Aqua (MODIS) and Suomi-NPP (VIIRS) cross the equator in the afternoon within **~15 minutes of each other (~13:30 local)**. Summing them counts the same fire perimeter multiple times.
- **Historical Distortions**: MODIS records date back to 2000/2002, while VIIRS began in late 2011. A naive sum creates a false historical explosion in burning activity in 2012+ that is purely an artifact of instrument resolution.

### Core Harmonization Solution:
1. **Spatio-Temporal Event Clustering**: Groups detections within a 1.2 km spatial tolerance (matching MODIS nadir scale) and diurnal observation epochs (Morning AM: ~10:30, Afternoon PM: ~13:30, Night: ~01:30) into cohesive **Harmonized Fire Cluster Events**.
2. **Harmonized Fire Pixel Equivalent (HFPE)**: Reconciles sub-pixel VIIRS detections with MODIS footprints using physical area equivalence rather than naive counts:
   $$\text{HFPE} = \max\left(\text{MODIS\_count}, \max(1.0, \text{VIIRS\_count} \times 0.18)\right)$$
3. **Fire Radiative Power (FRP) Conservation**: Reconciles co-observed thermal radiance (MW) to prevent energy tally duplication.
4. **Analytical Anomaly Baseline**: Compares daily FRP against a 14-day rolling historical baseline ($\mu \pm 2.0\sigma$). Flagged explicitly as an **empirical observation anomaly, never a predictive fire forecast**.

---

## 🏗️ 2. Project Architecture

```
open-space-app-challenge/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI entry point & CORS
│   │   ├── config.py                # Sensor physics & clustering parameters
│   │   ├── ingestion/
│   │   │   ├── __init__.py
│   │   │   ├── parser.py            # NASA FIRMS CSV parsing & validation
│   │   │   └── sample_data.py       # Reproducible demonstration benchmark data
│   │   ├── harmonization/
│   │   │   ├── __init__.py
│   │   │   ├── clustering.py        # Spatio-temporal event association engine
│   │   │   ├── metrics.py           # Cross-sensor comparison & ratio analytics
│   │   │   └── baseline.py          # 14-day rolling baseline & Z-score anomaly detector
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py           # Pydantic V2 data models
│   │   └── api/
│   │       ├── __init__.py
│   │       ├── health.py            # GET /api/health
│   │       ├── data.py              # Detections, clusters, metadata, and CSV upload
│   │       ├── calendar.py          # Daily & monthly burning calendar feeds
│   │       ├── comparison.py        # MODIS vs VIIRS sensor comparison
│   │       └── methodology.py       # Scientific documentation endpoint
│   ├── tests/
│   │   ├── test_health.py           # API endpoint integration tests
│   │   ├── test_ingestion.py        # FIRMS CSV parser tests
│   │   └── test_harmonization.py    # Double-counting avoidance verification
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Mission-control navigation & dataset status
│   │   │   ├── FilterBar.tsx        # Multi-factor date/sensor/confidence filters
│   │   │   ├── MapView.tsx          # Leaflet map with cluster & raw layers
│   │   │   ├── CalendarView.tsx     # Heatmap burning-activity calendar
│   │   │   ├── HistoricalTrends.tsx # Recharts time-series & naive vs harmonized curves
│   │   │   ├── SensorComparison.tsx # MODIS vs VIIRS visual footprint comparison
│   │   │   ├── UnusualActivityBadge.tsx # Statistical anomaly banner with disclaimers
│   │   │   ├── MethodologySection.tsx   # Detailed scientific guide
│   │   │   └── UploadModal.tsx      # NASA FIRMS CSV upload & sample generator
│   │   ├── services/
│   │   │   └── api.ts               # Typed API client
│   │   ├── App.tsx                  # Main application state orchestration
│   │   ├── index.css                # Tailwind CSS + Leaflet integration
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts               # Vite bundler with /api proxy
│   └── tailwind.config.js
└── README.md
```

---

## ⚡ 3. Quick Start & Execution

### Prerequisites
- **Python**: 3.10+ (Tested on Python 3.14.5)
- **Node.js**: 18+ (Tested on Node 24 / npm 11)

### 3.1 Backend Setup (FastAPI)

1. Open a terminal and navigate to the project directory:
   ```bash
   cd "open space app challenge"
   ```

2. (Optional) Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Run the backend unit tests to verify full functionality:
   ```bash
   python -m unittest discover -s backend/tests
   ```
   *Expected output: `Ran 16 tests in ~0.05s. OK`*

5. Start the FastAPI development server:
   ```bash
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - API Health: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
   - Interactive Swagger API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 3.2 Frontend Setup (React + Vite + Tailwind CSS)

1. Open a separate terminal and navigate to `frontend`:
   ```bash
   cd "open space app challenge/frontend"
   ```

2. Install frontend dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Build the production bundle or start the Vite development server:
   ```bash
   # Development server with live hot-reload & /api proxy to port 8000:
   npm run dev
   ```
   - Frontend Dashboard: [http://localhost:5173](http://localhost:5173)

---

## 🧪 4. Testing & Verification

### Running Automated Backend Tests
```bash
python -m unittest discover -s backend/tests -v
```

The test suite validates:
- **Health & Metadata Endpoints**: Verifies correct API versioning and supported sensor specifications.
- **FIRMS CSV Ingestion**: Tests parsing for both MODIS (C6.1) and VIIRS (375m), confidence normalization, acquisition time padding, and rejection of malformed geographic coordinates.
- **Scientific Harmonization Engine**: Explicitly asserts that coincident detections covering the same fire front are clustered into a single event whose Harmonized Fire Pixel Equivalent (HFPE) is strictly less than the naive sum ($HFPE < N_{MODIS} + N_{VIIRS}$).
- **Anomaly Detection**: Tests rolling 14-day baseline computation and flags high-Z-score ($Z \ge 2.0$) thermal spikes with required scientific notices.

---

## 📁 5. Testing with Custom NASA FIRMS Datasets

1. In the web dashboard, click the **"Upload CSV"** button in the top-right header.
2. You can upload any official CSV downloaded from [NASA FIRMS (Fire Information for Resource Management System)](https://firms.modaps.eosdis.nasa.gov/).
3. Alternatively, click **"Download Sample FIRMS CSV"** directly in the modal to test coincident MODIS + VIIRS observations.
4. Click **"Reset Demo"** at any time to return to the California Fire Season demonstration benchmark.

---

## 🛡️ 6. Scientific Ethics & Disclaimers

- **Thermal Anomalies Only**: Satellite observations denote thermal infrared anomalies. Detections do not differentiate between wildfires, controlled agricultural burns, or industrial flares.
- **Retrospective Analytical Flags, Not Predictions**: All anomaly indicators represent empirical deviations from historical moving averages. **This platform does not model fire spread or predict ignition events.**
- **Life Safety Notice**: Never use satellite thermal hotspot feeds for real-time life safety, emergency management, or evacuation decisions.

