"""
NASA FIRMS Demonstration Data Generator.

Provides scientifically realistic demonstration datasets explicitly labelled
as benchmark demonstration data based on NASA FIRMS observation dynamics.
Reflects realistic sensor geometry:
- Terra (MODIS 1km) AM overpasses (~10:30)
- Aqua (MODIS 1km) PM overpasses (~13:30)
- Suomi-NPP & NOAA-20 (VIIRS 375m) PM overpasses (~13:20 - 13:35)
- Clear resolution disparity: VIIRS detects 3-8x more pixels than MODIS for the same active fire perimeter.
"""
import math
import random
from typing import List, Dict, Any
from datetime import datetime, timedelta

from ..models.schemas import HarmonizedDetection, DatasetMetadata

# Seed for reproducible, consistent demonstration dataset
DEMO_RANDOM_SEED = 42

def generate_california_fire_season() -> List[HarmonizedDetection]:
    """
    Generate demonstration dataset representing Northern California fire season
    (July 15 - October 15).
    Features realistic fire growth, peak burning in August/September, and containment in October.
    """
    rng = random.Random(DEMO_RANDOM_SEED)
    records: List[HarmonizedDetection] = []

    # Epicenter: Northern California (Latitude 39.8 - 40.8, Longitude -121.8 - -120.8)
    base_lat = 40.15
    base_lon = -121.35

    start_date = datetime(2024, 7, 15)
    total_days = 92  # ~3 months

    record_counter = 0

    for day_idx in range(total_days):
        current_date = start_date + timedelta(days=day_idx)
        date_str = current_date.strftime("%Y-%m-%d")

        # Seasonal burning curve: low in July, extreme in August/early Sept, tapering in October
        # Peak around day 35-50 (late August)
        fire_season_progress = (day_idx - 40) / 18.0
        intensity_factor = math.exp(-0.5 * (fire_season_progress ** 2))
        
        # Add a couple of high-wind breakout events (e.g., day 38 and day 48)
        if day_idx in [36, 37, 38, 46, 47, 48]:
            intensity_factor = min(2.5, intensity_factor * 2.2)

        # Baseline count of active burning clusters
        num_clusters = int(intensity_factor * 8) + rng.randint(0, 2)
        if day_idx < 8:
            num_clusters = max(1, num_clusters // 2)

        for cluster_idx in range(num_clusters):
            # Cluster center drifts slightly as fire perimeter expands
            drift_lat = base_lat + (cluster_idx * 0.08) + rng.uniform(-0.06, 0.06)
            drift_lon = base_lon - (cluster_idx * 0.07) + rng.uniform(-0.06, 0.06)
            
            # Fire front intensity (MW)
            cluster_base_frp = 25.0 * (1.0 + intensity_factor * 3.5) + rng.uniform(5.0, 30.0)

            # 1. MORNING OVERPASS: Terra (MODIS 1km) ~10:30 AM
            if rng.random() > 0.25:
                terra_time = f"10{rng.randint(25, 35):02d}"
                modis_terra_conf = rng.randint(45, 95)
                conf_cat = "high" if modis_terra_conf >= 80 else ("nominal" if modis_terra_conf >= 30 else "low")
                record_counter += 1
                records.append(HarmonizedDetection(
                    id=f"DEMO_M_TERRA_{record_counter}",
                    latitude=round(drift_lat + rng.uniform(-0.005, 0.005), 5),
                    longitude=round(drift_lon + rng.uniform(-0.005, 0.005), 5),
                    sensor="MODIS",
                    satellite="Terra",
                    acq_datetime=f"{date_str}T{terra_time[:2]}:{terra_time[2:]}:00Z",
                    acq_date=date_str,
                    acq_time=terra_time,
                    daynight="D",
                    brightness_k=round(315.0 + (cluster_base_frp * 0.4) + rng.uniform(-5, 10), 1),
                    frp_mw=round(cluster_base_frp * rng.uniform(0.7, 1.2), 1),
                    confidence_category=conf_cat,
                    confidence_normalized=round(modis_terra_conf / 100.0, 2),
                    confidence_original=str(modis_terra_conf),
                    scan=1.1,
                    track=1.0,
                    pixel_area_km2=1.1,
                    cluster_id=None
                ))

            # 2. AFTERNOON COINCIDENT OVERPASS (~13:15 - 13:45):
            # Aqua (MODIS 1km) and Suomi-NPP / NOAA-20 (VIIRS 375m)
            # This is the scientific crux: VIIRS detects multiple 375m pixels across the exact same front
            aqua_time = f"13{rng.randint(25, 35):02d}"
            snpp_time = f"13{rng.randint(20, 38):02d}"
            
            # MODIS Aqua detection (1 or 2 1km pixels)
            num_aqua_pixels = 1 if intensity_factor < 0.8 else 2
            for aq_i in range(num_aqua_pixels):
                record_counter += 1
                modis_aqua_conf = rng.randint(55, 98)
                conf_cat = "high" if modis_aqua_conf >= 80 else ("nominal" if modis_aqua_conf >= 30 else "low")
                records.append(HarmonizedDetection(
                    id=f"DEMO_M_AQUA_{record_counter}",
                    latitude=round(drift_lat + (aq_i * 0.009) + rng.uniform(-0.004, 0.004), 5),
                    longitude=round(drift_lon + (aq_i * 0.009) + rng.uniform(-0.004, 0.004), 5),
                    sensor="MODIS",
                    satellite="Aqua",
                    acq_datetime=f"{date_str}T{aqua_time[:2]}:{aqua_time[2:]}:00Z",
                    acq_date=date_str,
                    acq_time=aqua_time,
                    daynight="D",
                    brightness_k=round(325.0 + (cluster_base_frp * 0.5) + rng.uniform(-5, 15), 1),
                    frp_mw=round((cluster_base_frp * 0.9 / num_aqua_pixels) + rng.uniform(2, 10), 1),
                    confidence_category=conf_cat,
                    confidence_normalized=round(modis_aqua_conf / 100.0, 2),
                    confidence_original=str(modis_aqua_conf),
                    scan=1.2,
                    track=1.1,
                    pixel_area_km2=1.32,
                    cluster_id=None
                ))

            # VIIRS 375m detections:
            # High-resolution resolves 4 to 9 sub-pixels along the burning front!
            num_viirs_pixels = max(3, int(num_aqua_pixels * rng.uniform(3.5, 6.0)))
            for vi_i in range(num_viirs_pixels):
                record_counter += 1
                viirs_conf_cat = "high" if rng.random() > 0.3 else "nominal"
                conf_norm = 0.95 if viirs_conf_cat == "high" else 0.65
                v_sat = "Suomi-NPP" if rng.random() > 0.45 else "NOAA-20"
                # Sub-pixel offset around drift_lat, drift_lon (within ~0.01 degrees = ~1km)
                sub_offset_lat = (vi_i % 3 - 1) * 0.0035 + rng.uniform(-0.001, 0.001)
                sub_offset_lon = (vi_i // 3 - 1) * 0.0035 + rng.uniform(-0.001, 0.001)

                records.append(HarmonizedDetection(
                    id=f"DEMO_V_{v_sat[:4]}_{record_counter}",
                    latitude=round(drift_lat + sub_offset_lat, 5),
                    longitude=round(drift_lon + sub_offset_lon, 5),
                    sensor="VIIRS",
                    satellite=v_sat,
                    acq_datetime=f"{date_str}T{snpp_time[:2]}:{snpp_time[2:]}:00Z",
                    acq_date=date_str,
                    acq_time=snpp_time,
                    daynight="D",
                    brightness_k=round(330.0 + (cluster_base_frp * 0.45) + rng.uniform(-8, 18), 1),
                    frp_mw=round((cluster_base_frp * 0.95 / num_viirs_pixels) + rng.uniform(0.5, 4.0), 1),
                    confidence_category=viirs_conf_cat,
                    confidence_normalized=conf_norm,
                    confidence_original=viirs_conf_cat,
                    scan=0.4,
                    track=0.38,
                    pixel_area_km2=0.15,
                    cluster_id=None
                ))

            # 3. NIGHTTIME OVERPASSES (~01:30 & ~22:30): cooler background, distinct detection sensitivity
            if rng.random() > 0.4:
                night_time = f"01{rng.randint(20, 40):02d}"
                # VIIRS night detection (often detects small active smoldering fronts that MODIS misses at night)
                for nv_i in range(rng.randint(1, 3)):
                    record_counter += 1
                    records.append(HarmonizedDetection(
                        id=f"DEMO_V_NIGHT_{record_counter}",
                        latitude=round(drift_lat + rng.uniform(-0.006, 0.006), 5),
                        longitude=round(drift_lon + rng.uniform(-0.006, 0.006), 5),
                        sensor="VIIRS",
                        satellite="Suomi-NPP",
                        acq_datetime=f"{date_str}T{night_time[:2]}:{night_time[2:]}:00Z",
                        acq_date=date_str,
                        acq_time=night_time,
                        daynight="N",
                        brightness_k=round(302.0 + (cluster_base_frp * 0.3) + rng.uniform(-5, 8), 1),
                        frp_mw=round((cluster_base_frp * 0.4) + rng.uniform(0.5, 3.0), 1),
                        confidence_category="nominal",
                        confidence_normalized=0.65,
                        confidence_original="nominal",
                        scan=0.4,
                        track=0.38,
                        pixel_area_km2=0.15,
                        cluster_id=None
                    ))

    return records

def get_california_demo_metadata() -> DatasetMetadata:
    return DatasetMetadata(
        dataset_name="NASA FIRMS Demonstration Benchmark: Northern California Fire Season",
        is_demonstration_data=True,
        total_raw_detections=0,
        total_harmonized_clusters=0,
        date_range_start="2024-07-15",
        date_range_end="2024-10-15",
        geographic_bounds={
            "min_lat": 39.7,
            "max_lat": 40.9,
            "min_lon": -122.2,
            "max_lon": -120.6
        },
        sensors_present=["MODIS", "VIIRS"],
        satellites_present=["Terra", "Aqua", "Suomi-NPP", "NOAA-20"],
        disclaimer=(
            "DEMONSTRATION BENCHMARK DATASET: Explicitly labelled for validation and methodology demonstration. "
            "Satellite observations denote thermal anomalies, not verified ground fire perimeters. "
            "Never use for real-time life-safety or predictive evacuation decisions."
        )
    )

