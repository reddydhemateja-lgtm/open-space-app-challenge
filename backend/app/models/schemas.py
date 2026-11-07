from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class HarmonizedDetection(BaseModel):
    id: str
    latitude: float
    longitude: float
    sensor: str  # "MODIS" or "VIIRS"
    satellite: str  # e.g., "Terra", "Aqua", "Suomi-NPP", "NOAA-20"
    acq_datetime: str  # ISO 8601 UTC string
    acq_date: str  # YYYY-MM-DD
    acq_time: str  # HHMM
    daynight: str  # "D" or "N"
    brightness_k: float  # Brightness temperature in Kelvin
    frp_mw: float  # Fire Radiative Power in Megawatts
    confidence_category: str  # "low", "nominal", "high"
    confidence_normalized: float  # 0.0 to 1.0 scale
    confidence_original: str  # Original value preserved
    scan: float
    track: float
    pixel_area_km2: float
    cluster_id: Optional[str] = None

class HarmonizedCluster(BaseModel):
    cluster_id: str
    centroid_lat: float
    centroid_lon: float
    acq_date: str
    time_window: str
    modis_count: int
    viirs_count: int
    total_raw_detections: int
    harmonized_fire_pixel_equivalent: float
    total_frp_mw: float
    max_frp_mw: float
    mean_brightness_k: float
    overlap_status: str  # "MODIS_ONLY", "VIIRS_ONLY", "COINCIDENT_OVERLAP"
    dominant_confidence: str  # "low", "nominal", "high"
    uncertainty_score: float  # 0.0 (high certainty) to 1.0 (higher uncertainty)
    satellites_present: List[str]

class CalendarDaySummary(BaseModel):
    date: str  # YYYY-MM-DD
    harmonized_fire_pixel_equivalent: float
    harmonized_clusters_count: int
    raw_modis_count: int
    raw_viirs_count: int
    total_raw_detections: int
    total_frp_mw: float
    coincident_clusters_count: int
    activity_level: str  # "none", "low", "moderate", "elevated", "extreme"
    is_unusual_activity: bool
    z_score: float
    analytical_flag: Optional[str] = None
    baseline_mean_frp: float
    baseline_std_frp: float

class MonthlySummary(BaseModel):
    year_month: str  # YYYY-MM
    month_name: str
    days_with_activity: int
    total_harmonized_equivalent: float
    total_clusters: int
    total_frp_mw: float
    modis_count: int
    viirs_count: int
    viirs_to_modis_ratio: float
    unusual_days_count: int

class SensorComparisonSummary(BaseModel):
    modis_total_detections: int
    viirs_total_detections: int
    detection_ratio_viirs_to_modis: float
    modis_total_frp_mw: float
    viirs_total_frp_mw: float
    frp_ratio_viirs_to_modis: float
    modis_mean_frp_per_detection: float
    viirs_mean_frp_per_detection: float
    coincident_clusters_count: int
    coincident_overlap_percentage: float
    modis_only_clusters: int
    viirs_only_clusters: int
    resolution_ratio_area: float
    scientific_insights: List[str]
    confidence_distribution: Dict[str, Dict[str, int]]
    diurnal_distribution: Dict[str, Dict[str, int]]

class AnomalySummary(BaseModel):
    date: str
    z_score: float
    observed_frp_mw: float
    baseline_mean_frp_mw: float
    baseline_std_frp_mw: float
    harmonized_clusters: int
    flag_type: str
    scientific_disclaimer: str

class DatasetMetadata(BaseModel):
    dataset_name: str
    is_demonstration_data: bool
    total_raw_detections: int
    total_harmonized_clusters: int
    date_range_start: str
    date_range_end: str
    geographic_bounds: Dict[str, float]
    sensors_present: List[str]
    satellites_present: List[str]
    disclaimer: str

class UploadResponse(BaseModel):
    success: bool
    message: str
    records_parsed: int
    records_harmonized: int
    warnings: List[str]
    metadata: DatasetMetadata

