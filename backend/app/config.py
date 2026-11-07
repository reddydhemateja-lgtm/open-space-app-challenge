"""
Application configuration and NASA satellite sensor specifications.
"""
from typing import Dict, Any

APP_NAME = "NASA MODIS & VIIRS Hotspot Harmonization Platform"
VERSION = "1.0.0"
DESCRIPTION = "Full-stack scientific dashboard harmonizing NASA MODIS and VIIRS satellite active-fire detections into a unified historical burning-activity calendar."

# Sensor Physical & Detection Characteristics
SENSOR_SPECS: Dict[str, Dict[str, Any]] = {
    "MODIS": {
        "satellites": ["Terra", "Aqua"],
        "nominal_resolution_m": 1000,
        "nadir_pixel_area_km2": 1.0,
        "edge_pixel_area_km2": 9.0,  # Bow-tie pixel expansion effect
        "typical_overpasses_local": ["10:30 (Terra AM)", "13:30 (Aqua PM)", "22:30 (Terra PM)", "01:30 (Aqua AM)"],
        "confidence_type": "continuous_percentage (0 - 100%)",
        "detection_bands": "Channels 21/22 (4 µm) and 31 (11 µm)",
        "minimum_detectable_frp_mw": 5.0,
        "description": "Moderate Resolution Imaging Spectroradiometer on NASA Earth Observing System (EOS) satellites."
    },
    "VIIRS": {
        "satellites": ["Suomi-NPP", "NOAA-20", "NOAA-21"],
        "nominal_resolution_m": 375,  # I-Band active fire
        "nadir_pixel_area_km2": 0.14,
        "edge_pixel_area_km2": 0.35,  # Constrained pixel growth due to onboard 3:1 aggregation
        "typical_overpasses_local": ["13:30 (S-NPP PM)", "13:20 (NOAA-20 PM)", "01:30 (S-NPP AM)", "01:20 (NOAA-20 AM)"],
        "confidence_type": "categorical ('low', 'nominal', 'high')",
        "detection_bands": "I4 (3.74 µm) and I5 (11.45 µm) at 375 m",
        "minimum_detectable_frp_mw": 0.5,
        "description": "Visible Infrared Imaging Radiometer Suite with higher spatial resolution and constrained edge distortion."
    }
}

# Harmonization Grid & Spatio-Temporal Clustering Defaults
DEFAULT_SPATIAL_CLUSTER_RADIUS_KM = 1.2  # Matches MODIS nadir footprint (~1.0 - 1.2 km)
DEFAULT_TEMPORAL_WINDOW_HOURS = 3.0       # Coincident overpass grouping window
ANOMALY_Z_SCORE_THRESHOLD = 2.0           # Analytical anomaly deviation threshold (standard deviations)
ANOMALY_BASELINE_WINDOW_DAYS = 14         # Moving window for historical baseline

