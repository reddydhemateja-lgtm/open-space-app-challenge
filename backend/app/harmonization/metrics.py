"""
Sensor Cross-Comparison and Scientific Metrics Engine.

Analyzes differences between MODIS (1km) and VIIRS (375m) across:
- Detection count multiplier (typically VIIRS detects 3x to 8x more hot spot pixels)
- Fire Radiative Power (FRP) characteristics
- Resolution area disparity (1.0 km2 vs 0.14 km2)
- Diurnal cycle observation overlap
- Confidence distribution
"""
from typing import List, Dict
from collections import defaultdict
import numpy as np

from ..models.schemas import HarmonizedDetection, HarmonizedCluster, SensorComparisonSummary

def compute_sensor_comparison(detections: List[HarmonizedDetection],
                              clusters: List[HarmonizedCluster]) -> SensorComparisonSummary:
    """
    Generate comprehensive comparison metrics between MODIS and VIIRS detections.
    """
    modis_dets = [d for d in detections if d.sensor == "MODIS"]
    viirs_dets = [d for d in detections if d.sensor == "VIIRS"]

    m_total = len(modis_dets)
    v_total = len(viirs_dets)

    det_ratio = round(v_total / m_total, 2) if m_total > 0 else float(v_total)

    m_frp_total = round(float(sum(d.frp_mw for d in modis_dets)), 1)
    v_frp_total = round(float(sum(d.frp_mw for d in viirs_dets)), 1)

    frp_ratio = round(v_frp_total / m_frp_total, 2) if m_frp_total > 0 else float(v_frp_total)

    m_mean_frp = round(float(np.mean([d.frp_mw for d in modis_dets])), 1) if modis_dets else 0.0
    v_mean_frp = round(float(np.mean([d.frp_mw for d in viirs_dets])), 1) if viirs_dets else 0.0

    # Cluster overlap statistics
    coincident_clusters = sum(1 for c in clusters if c.overlap_status == "COINCIDENT_OVERLAP")
    modis_only_clusters = sum(1 for c in clusters if c.overlap_status == "MODIS_ONLY")
    viirs_only_clusters = sum(1 for c in clusters if c.overlap_status == "VIIRS_ONLY")
    tot_clusters = len(clusters)

    overlap_pct = round((coincident_clusters / tot_clusters * 100.0), 1) if tot_clusters > 0 else 0.0

    # Confidence distribution by sensor
    conf_dist: Dict[str, Dict[str, int]] = {
        "MODIS": {"low": 0, "nominal": 0, "high": 0},
        "VIIRS": {"low": 0, "nominal": 0, "high": 0}
    }
    for d in detections:
        sensor_key = "MODIS" if d.sensor == "MODIS" else "VIIRS"
        cat = d.confidence_category
        if cat in conf_dist[sensor_key]:
            conf_dist[sensor_key][cat] += 1

    # Diurnal distribution (Day vs Night)
    diurnal_dist: Dict[str, Dict[str, int]] = {
        "MODIS": {"Day": 0, "Night": 0},
        "VIIRS": {"Day": 0, "Night": 0}
    }
    for d in detections:
        sensor_key = "MODIS" if d.sensor == "MODIS" else "VIIRS"
        dn_key = "Day" if d.daynight == "D" else "Night"
        diurnal_dist[sensor_key][dn_key] += 1

    # Scientific insights explaining the physics and harmonization
    insights = [
        (
            f"Spatial Resolution Footprint: VIIRS 375m pixels occupy ~0.14 km² at nadir, "
            f"whereas MODIS 1km pixels occupy ~1.0 km² at nadir (a 7.1x area difference). "
            f"Consequently, VIIRS resolves active fire fronts into {det_ratio:.1f}x more detections."
        ),
        (
            f"Bow-Tie Distortion & Scan Edge: MODIS pixel area expands by up to 9x towards scan edges, "
            f"whereas VIIRS limits pixel growth through onboard pixel aggregation (3:1 nadir aggregation), "
            f"maintaining crisp spatial resolution across its entire 3,040 km swath."
        ),
        (
            f"Coincident Overpass Cross-Validation: {overlap_pct:.1f}% of identified fire clusters were "
            f"co-observed by both MODIS (Terra/Aqua) and VIIRS (S-NPP/NOAA-20), confirming physical burning "
            f"without artificially doubling detection tallies."
        ),
        (
            f"Energy Conservation: VIIRS records {v_frp_total:,.1f} MW total FRP compared to MODIS {m_frp_total:,.1f} MW. "
            f"Because VIIRS detects smaller and cooler sub-pixel fires (minimum FRP ~0.5 MW vs MODIS ~5.0 MW), "
            f"its detections include low-intensity flanks missed by coarser sensors."
        )
    ]

    return SensorComparisonSummary(
        modis_total_detections=m_total,
        viirs_total_detections=v_total,
        detection_ratio_viirs_to_modis=det_ratio,
        modis_total_frp_mw=m_frp_total,
        viirs_total_frp_mw=v_frp_total,
        frp_ratio_viirs_to_modis=frp_ratio,
        modis_mean_frp_per_detection=m_mean_frp,
        viirs_mean_frp_per_detection=v_mean_frp,
        coincident_clusters_count=coincident_clusters,
        coincident_overlap_percentage=overlap_pct,
        modis_only_clusters=modis_only_clusters,
        viirs_only_clusters=viirs_only_clusters,
        resolution_ratio_area=7.14,
        scientific_insights=insights,
        confidence_distribution=conf_dist,
        diurnal_distribution=diurnal_dist
    )

