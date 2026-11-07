from typing import Optional, List, Dict, Any
import os
import urllib.request
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, Body

from ..models.schemas import (
    HarmonizedDetection,
    HarmonizedCluster,
    DatasetMetadata,
    UploadResponse
)
from ..ingestion.parser import parse_firms_csv
from ..ingestion.sample_data import generate_california_fire_season, get_california_demo_metadata
from ..harmonization.clustering import cluster_detections
from ..harmonization.baseline import compute_daily_calendar_and_anomalies

router = APIRouter(prefix="/api/data", tags=["Data"])

# In-memory application state
class DatasetState:
    def __init__(self):
        self.reset_to_demo()

    def reset_to_demo(self):
        raw_dets = generate_california_fire_season()
        self.clusters, self.detections = cluster_detections(raw_dets)
        self.metadata = get_california_demo_metadata()
        self.metadata.total_raw_detections = len(self.detections)
        self.metadata.total_harmonized_clusters = len(self.clusters)

        # Compute min/max coordinates
        if self.detections:
            self.metadata.geographic_bounds = {
                "min_lat": min(d.latitude for d in self.detections),
                "max_lat": max(d.latitude for d in self.detections),
                "min_lon": min(d.longitude for d in self.detections),
                "max_lon": max(d.longitude for d in self.detections),
            }
            dates = sorted(list(set(d.acq_date for d in self.detections)))
            self.metadata.date_range_start = dates[0]
            self.metadata.date_range_end = dates[-1]

    def set_dataset(self, raw_dets: List[HarmonizedDetection], filename: str, is_demo: bool = False, custom_title: Optional[str] = None):
        self.clusters, self.detections = cluster_detections(raw_dets)
        dates = sorted(list(set(d.acq_date for d in self.detections))) if self.detections else []
        sensors = sorted(list(set(d.sensor for d in self.detections))) if self.detections else []
        sats = sorted(list(set(d.satellite for d in self.detections))) if self.detections else []

        bounds = {
            "min_lat": min((d.latitude for d in self.detections), default=0.0),
            "max_lat": max((d.latitude for d in self.detections), default=0.0),
            "min_lon": min((d.longitude for d in self.detections), default=0.0),
            "max_lon": max((d.longitude for d in self.detections), default=0.0),
        }

        dataset_title = custom_title or f"User Dataset: {filename}"

        self.metadata = DatasetMetadata(
            dataset_name=dataset_title,
            is_demonstration_data=is_demo,
            total_raw_detections=len(self.detections),
            total_harmonized_clusters=len(self.clusters),
            date_range_start=dates[0] if dates else "",
            date_range_end=dates[-1] if dates else "",
            geographic_bounds=bounds,
            sensors_present=sensors,
            satellites_present=sats,
            disclaimer=(
                "REAL NASA FIRMS OBSERVATION DATA: Satellite observations denote thermal anomalies. "
                "Confidence values and cluster perimeters represent statistical estimations. "
                "Never use for life safety or real-time predictive fire perimeters."
            )
        )

# Global singleton state
state = DatasetState()

@router.get("/presets")
def get_presets():
    """List available real NASA datasets and demo benchmarks."""
    return [
        {
            "id": "demo_california",
            "name": "Demonstration Benchmark: California Fire Season",
            "type": "demonstration",
            "description": "Multi-month benchmark with synthetic thermal dynamics and simulated overpasses."
        },
        {
            "id": "nasa_dixie",
            "name": "Real NASA FIRMS: Northern California Dixie Fire (August 2021)",
            "type": "real_nasa",
            "description": "Actual NASA FIRMS observations covering the historic peak of the Dixie Fire with coincident MODIS (Aqua/Terra) and VIIRS (S-NPP/NOAA-20)."
        },
        {
            "id": "nasa_canada",
            "name": "Real NASA FIRMS: Canadian Boreal Wildfire Outbreak (June 2023)",
            "type": "real_nasa",
            "description": "Actual NASA FIRMS observations of the extreme Canadian boreal forest fires across Quebec and Ontario."
        }
    ]

@router.post("/load-preset/{preset_id}")
def load_preset(preset_id: str):
    """Load an authentic real NASA FIRMS dataset or reset to demo."""
    if preset_id == "demo_california":
        state.reset_to_demo()
        return {"success": True, "message": "Loaded California demo benchmark", "metadata": state.metadata}

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    file_map = {
        "nasa_dixie": ("real_nasa_california_dixie.csv", "Real NASA FIRMS: Northern California Dixie Fire (August 2021)"),
        "nasa_canada": ("real_nasa_canada_boreal.csv", "Real NASA FIRMS: Canadian Boreal Wildfire Outbreak (June 2023)")
    }

    if preset_id not in file_map:
        raise HTTPException(status_code=404, detail="Preset dataset not found.")

    fname, title = file_map[preset_id]
    csv_path = os.path.join(base_dir, "data", fname)

    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail=f"Dataset file {fname} not found on server.")

    with open(csv_path, "r", encoding="utf-8") as f:
        content = f.read()

    parsed_dets, warnings = parse_firms_csv(content, filename=fname)
    state.set_dataset(parsed_dets, filename=fname, is_demo=False, custom_title=title)

    return {
        "success": True,
        "message": f"Successfully loaded real NASA FIRMS dataset: {title}",
        "records_count": len(parsed_dets),
        "clusters_count": len(state.clusters),
        "warnings": warnings,
        "metadata": state.metadata
    }

@router.post("/fetch-firms-api")
def fetch_from_nasa_firms_api(
    map_key: str = Body(..., embed=True),
    country_code: str = Body("USA", embed=True),
    day_range: int = Body(1, embed=True)
):
    """
    Query the official live NASA FIRMS API using user's MAP_KEY.
    Fetches real-time observations from MODIS (Terra/Aqua) and VIIRS (S-NPP/NOAA-20/NOAA-21).
    """
    clean_key = map_key.strip()
    if not clean_key or len(clean_key) < 16:
        raise HTTPException(status_code=400, detail="Invalid NASA FIRMS MAP_KEY. Keys are 32-character strings obtained free from firms.modaps.eosdis.nasa.gov.")

    # Fetch MODIS NRT and VIIRS SNPP NRT
    all_dets = []
    warnings = []

    sources = ["MODIS_NRT", "VIIRS_SNPP_NRT"]
    for src in sources:
        url = f"https://firms.modaps.eosdis.nasa.gov/api/country/csv/{clean_key}/{src}/{country_code}/{day_range}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NASA-SpaceApps-Harmonizer/1.0"})
            with urllib.request.urlopen(req, timeout=15) as response:
                csv_text = response.read().decode("utf-8")
                if "Invalid Map Key" in csv_text or "Transaction Limit" in csv_text:
                    raise HTTPException(status_code=400, detail=f"NASA FIRMS API error: {csv_text[:120]}")
                dets, warns = parse_firms_csv(csv_text, filename=f"NASA_FIRMS_{src}.csv")
                all_dets.extend(dets)
                warnings.extend(warns)
        except Exception as e:
            warnings.append(f"Failed to fetch {src}: {str(e)}")

    if not all_dets:
        raise HTTPException(status_code=400, detail="No active thermal records returned by NASA FIRMS API for this area/date range.")

    title = f"Live NASA FIRMS API Feed: {country_code} ({len(all_dets)} detections)"
    state.set_dataset(all_dets, filename=f"live_{country_code}.csv", is_demo=False, custom_title=title)

    return {
        "success": True,
        "message": f"Successfully ingested live NASA satellite observations from space!",
        "records_count": len(all_dets),
        "clusters_count": len(state.clusters),
        "warnings": warnings,
        "metadata": state.metadata
    }

@router.get("/metadata", response_model=DatasetMetadata)
def get_metadata():
    """Retrieve metadata and spatial bounds for current active dataset."""
    return state.metadata

@router.get("/detections")
def get_detections(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sensor: Optional[str] = None,
    confidence: Optional[str] = None,
    daynight: Optional[str] = None,
    limit: int = 2500
):
    """
    Query raw harmonized detections with filters.
    """
    filtered = state.detections

    if start_date and isinstance(start_date, str):
        filtered = [d for d in filtered if d.acq_date >= start_date]
    if end_date and isinstance(end_date, str):
        filtered = [d for d in filtered if d.acq_date <= end_date]
    if sensor and isinstance(sensor, str) and sensor.upper() != "ALL":
        filtered = [d for d in filtered if d.sensor.upper() == sensor.upper()]
    if confidence and isinstance(confidence, str) and confidence.lower() != "all":
        filtered = [d for d in filtered if d.confidence_category.lower() == confidence.lower()]
    if daynight and isinstance(daynight, str) and daynight.upper() != "ALL":
        filtered = [d for d in filtered if d.daynight == daynight.upper()]

    total_matching = len(filtered)
    returned_items = [d.model_dump() for d in filtered[:limit]]

    return {
        "total_count": total_matching,
        "returned_count": len(returned_items),
        "detections": returned_items
    }

@router.get("/clusters")
def get_clusters(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    overlap_status: Optional[str] = None,
    min_frp: Optional[float] = 0.0
):
    """
    Query harmonized fire cluster events.
    """
    filtered = state.clusters

    if start_date and isinstance(start_date, str):
        filtered = [c for c in filtered if c.acq_date >= start_date]
    if end_date and isinstance(end_date, str):
        filtered = [c for c in filtered if c.acq_date <= end_date]
    if overlap_status and isinstance(overlap_status, str) and overlap_status.upper() != "ALL":
        filtered = [c for c in filtered if c.overlap_status.upper() == overlap_status.upper()]
    if min_frp and isinstance(min_frp, (int, float)) and min_frp > 0:
        filtered = [c for c in filtered if c.total_frp_mw >= min_frp]

    return {
        "total_clusters": len(filtered),
        "clusters": [c.model_dump() for c in filtered]
    }

@router.post("/upload", response_model=UploadResponse)
async def upload_csv(file: UploadFile = File(...)):
    """
    Upload and harmonize user-provided NASA FIRMS CSV.
    Validates structure, harmonizes sensors, and generates cluster events.
    """
    if not (file.filename.endswith(".csv") or file.filename.endswith(".txt")):
        raise HTTPException(status_code=400, detail="Only CSV files (.csv or .txt) in NASA FIRMS format are supported.")

    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8", errors="replace")
        
        parsed_dets, warnings = parse_firms_csv(content_str, filename=file.filename)
        
        # Harmonize dataset
        state.set_dataset(parsed_dets, filename=file.filename, is_demo=False)

        return UploadResponse(
            success=True,
            message=f"Successfully ingested and harmonized {len(state.detections)} detections into {len(state.clusters)} clusters.",
            records_parsed=len(parsed_dets),
            records_harmonized=len(state.clusters),
            warnings=warnings,
            metadata=state.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process CSV file: {str(e)}")

@router.post("/reset")
def reset_dataset():
    """Reset the application back to the standard California benchmark demonstration dataset."""
    state.reset_to_demo()
    return {
        "success": True,
        "message": "Dataset reset to NASA FIRMS demonstration benchmark.",
        "metadata": state.metadata
    }
