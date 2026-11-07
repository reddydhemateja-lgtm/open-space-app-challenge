"""
Scientific Spatial-Temporal Harmonization and Clustering Engine.

Solves the core scientific challenge:
Harmonizes MODIS (1km) and VIIRS (375m) detections to prevent artificial double counting,
calculate Harmonized Fire Pixel Equivalents (HFPE), and identify coincident observations.
"""
import math
from typing import List, Dict, Tuple
from collections import defaultdict
import numpy as np

from ..models.schemas import HarmonizedDetection, HarmonizedCluster
from ..config import DEFAULT_SPATIAL_CLUSTER_RADIUS_KM

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute great-circle distance between two geographic coordinates in kilometers."""
    r = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c

def cluster_detections(detections: List[HarmonizedDetection],
                       spatial_tolerance_km: float = DEFAULT_SPATIAL_CLUSTER_RADIUS_KM) -> Tuple[List[HarmonizedCluster], List[HarmonizedDetection]]:
    """
    Cluster thermal anomaly detections by date, observation time-window, and geographic proximity.
    Generates harmonized cluster events and assigns cluster_id to each detection.
    """
    if not detections:
        return [], []

    # 1. Group by acq_date and coarse time block (Morning: 06-12, Afternoon: 12-18, Night: 18-06)
    # This prevents grouping morning Terra detections with afternoon Aqua/VIIRS passes into the same instantaneous fire snapshot
    time_blocks: Dict[Tuple[str, str], List[HarmonizedDetection]] = defaultdict(list)

    for det in detections:
        try:
            hh = int(det.acq_time[:2])
            if 6 <= hh < 12:
                epoch = "AM_MORNING"
            elif 12 <= hh < 18:
                epoch = "PM_AFTERNOON"
            else:
                epoch = "NIGHT"
        except Exception:
            epoch = "UNKNOWN"
        time_blocks[(det.acq_date, epoch)].append(det)

    clusters: List[HarmonizedCluster] = []
    updated_detections: List[HarmonizedDetection] = []
    cluster_seq = 0

    # Grid cell size in degrees roughly corresponding to spatial_tolerance_km (~0.012 deg ~= 1.3 km)
    grid_deg = spatial_tolerance_km / 111.0

    for (date_str, epoch), group in time_blocks.items():
        # Spatial grid grouping for fast spatial clustering
        spatial_buckets: Dict[Tuple[int, int], List[HarmonizedDetection]] = defaultdict(list)
        for d in group:
            bx = int(math.floor(d.latitude / grid_deg))
            by = int(math.floor(d.longitude / grid_deg))
            spatial_buckets[(bx, by)].append(d)

        # Merge neighboring cells within spatial_tolerance_km
        visited = set()
        bucket_keys = list(spatial_buckets.keys())

        for b_key in bucket_keys:
            if b_key in visited:
                continue
            
            # Seed a new cluster
            current_cluster_members: List[HarmonizedDetection] = []
            queue = [b_key]
            visited.add(b_key)

            while queue:
                curr_k = queue.pop(0)
                current_cluster_members.extend(spatial_buckets[curr_k])

                cx, cy = curr_k
                # Inspect 8 adjacent neighbors
                for dx in [-1, 0, 1]:
                    for dy in [-1, 0, 1]:
                        neighbor = (cx + dx, cy + dy)
                        if neighbor in spatial_buckets and neighbor not in visited:
                            # Verify if any point is within spatial tolerance
                            pts_curr = spatial_buckets[curr_k]
                            pts_neigh = spatial_buckets[neighbor]
                            # Distance check between representative points
                            min_d = min(
                                haversine_distance_km(p1.latitude, p1.longitude, p2.latitude, p2.longitude)
                                for p1 in pts_curr[:3] for p2 in pts_neigh[:3]
                            )
                            if min_d <= spatial_tolerance_km * 1.5:
                                visited.add(neighbor)
                                queue.append(neighbor)

            cluster_seq += 1
            cid = f"HC_{date_str}_{epoch[:2]}_{cluster_seq:04d}"

            # Compute cluster metrics
            modis_dets = [d for d in current_cluster_members if d.sensor == "MODIS"]
            viirs_dets = [d for d in current_cluster_members if d.sensor == "VIIRS"]
            m_count = len(modis_dets)
            v_count = len(viirs_dets)
            total_raw = m_count + v_count

            # Assign cluster_id to detections
            for d in current_cluster_members:
                d.cluster_id = cid
                updated_detections.append(d)

            # Centroid
            mean_lat = round(float(np.mean([d.latitude for d in current_cluster_members])), 5)
            mean_lon = round(float(np.mean([d.longitude for d in current_cluster_members])), 5)

            # Harmonization Logic (Avoid double counting!):
            # VIIRS has ~7x smaller pixel area than MODIS (0.14 km2 vs 1.0 km2).
            # If both observed the fire simultaneously (coincident overlap):
            # Instead of adding m_count + v_count, we calculate Harmonized Fire Pixel Equivalent (HFPE).
            if m_count > 0 and v_count > 0:
                overlap_status = "COINCIDENT_OVERLAP"
                # Coincident overpass: scale VIIRS detections to 1km equivalent and take reconciled footprint
                viirs_equivalent = max(1.0, v_count * 0.18)
                hfpe = round(max(float(m_count), viirs_equivalent), 2)
                # Reconciled FRP: cross-sensor average of total energy released
                total_frp = round((sum(d.frp_mw for d in modis_dets) + sum(d.frp_mw for d in viirs_dets)) / 2.0, 1)
                # Coincident observation gives higher certainty (lower uncertainty score)
                uncertainty = 0.20
            elif m_count > 0 and v_count == 0:
                overlap_status = "MODIS_ONLY"
                hfpe = round(float(m_count), 2)
                total_frp = round(sum(d.frp_mw for d in modis_dets), 1)
                uncertainty = 0.40
            else:
                overlap_status = "VIIRS_ONLY"
                # Scale VIIRS 375m pixels into 1km equivalent area
                hfpe = round(max(0.4, min(float(v_count), 0.8 + (v_count - 1) * 0.18)), 2)
                total_frp = round(sum(d.frp_mw for d in viirs_dets), 1)
                uncertainty = 0.30

            max_frp = round(float(max(d.frp_mw for d in current_cluster_members)), 1)
            mean_bright = round(float(np.mean([d.brightness_k for d in current_cluster_members])), 1)

            # Dominant confidence category
            conf_counts = defaultdict(int)
            for d in current_cluster_members:
                conf_counts[d.confidence_category] += 1
            dominant_conf = max(conf_counts.items(), key=lambda x: x[1])[0]

            sats = sorted(list(set(d.satellite for d in current_cluster_members)))

            cluster = HarmonizedCluster(
                cluster_id=cid,
                centroid_lat=mean_lat,
                centroid_lon=mean_lon,
                acq_date=date_str,
                time_window=epoch,
                modis_count=m_count,
                viirs_count=v_count,
                total_raw_detections=total_raw,
                harmonized_fire_pixel_equivalent=hfpe,
                total_frp_mw=total_frp,
                max_frp_mw=max_frp,
                mean_brightness_k=mean_bright,
                overlap_status=overlap_status,
                dominant_confidence=dominant_conf,
                uncertainty_score=uncertainty,
                satellites_present=sats
            )
            clusters.append(cluster)

    return clusters, updated_detections

