from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Query, HTTPException

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

    def set_dataset(self, raw_dets: List[HarmonizedDetection], filename: str, is_demo: bool = False):
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

        self.metadata = DatasetMetadata(
            dataset_name=f"User Dataset: {filename}",
            is_demonstration_data=is_demo,
            total_raw_detections=len(self.detections),
            total_harmonized_clusters=len(self.clusters),
            date_range_start=dates[0] if dates else "",
            date_range_end=dates[-1] if dates else "",
            geographic_bounds=bounds,
            sensors_present=sensors,
            satellites_present=sats,
            disclaimer=(
                "USER UPLOADED OBSERVATION DATA: Satellite observations denote thermal anomalies. "
                "Confidence values and cluster perimeters represent statistical estimations. "
                "Never use for life safety or real-time predictive fire perimeters."
            )
        )

# Global singleton state
state = DatasetState()

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
