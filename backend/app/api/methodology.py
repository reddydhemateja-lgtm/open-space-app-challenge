from fastapi import APIRouter
from ..config import SENSOR_SPECS

router = APIRouter(prefix="/api/methodology", tags=["Methodology"])

@router.get("")
def get_methodology():
    """
    Returns scientific methodology documentation explaining sensor characteristics,
    the mathematical necessity of harmonization, spatio-temporal clustering,
    avoidance of double counting, and uncertainty quantification.
    """
    return {
        "title": "NASA MODIS and VIIRS Hotspot Harmonization Methodology",
        "scientific_rationale": {
            "problem_statement": (
                "Thermal anomaly counts from MODIS and VIIRS cannot be naively summed together. "
                "Because VIIRS 375m pixels cover only ~0.14 km² at nadir compared to MODIS's 1.0 km² nadir footprint "
                "(a ~7.1x difference in spatial sampling area), VIIRS detects 3x to 8x more individual fire pixels "
                "for the exact same fire front. Simply combining counts introduces severe double counting during "
                "coincident overpasses and creates artificial historical spikes when VIIRS entered service in 2012."
            ),
            "sensor_physics": {
                "MODIS": {
                    "nominal_resolution": "1000m (1 km)",
                    "footprint_geometry": "Suffers from scan-angle bow-tie pixel expansion (1 km nadir grows up to 9 km² at swath edge).",
                    "channels": "Channel 21/22 (3.96 µm) high-range thermal and Channel 31 (11.0 µm) background.",
                    "confidence_scale": "0% to 100% continuous percentage based on background contrast and cloud proximity."
                },
                "VIIRS": {
                    "nominal_resolution": "375m (I-Band) and 750m (M-Band)",
                    "footprint_geometry": "Onboard 3:1 aggregation preserves near-constant 375m spatial resolution across 3,040 km swath.",
                    "channels": "I4 (3.74 µm) and I5 (11.45 µm) at 375m resolution.",
                    "confidence_scale": "Categorical flags: 'low' (often sun glint or marginal threshold), 'nominal' (standard detection), 'high' (strong thermal signature)."
                }
            },
            "harmonization_algorithm": {
                "step_1_standardization": (
                    "Standardize observation timestamps to UTC ISO 8601, map confidence values to uniform "
                    "continuous (0-1) and categorical (low, nominal, high) representations, and calculate instantaneous pixel ground footprint."
                ),
                "step_2_spatio_temporal_clustering": (
                    "Group detections within a 1.2 km spatial tolerance (matching MODIS nadir scale) and time-window epochs "
                    "(Morning AM: ~10:30, Afternoon PM: ~13:30, Night: ~01:30) to associate coincident sensor passes into unified fire cluster events."
                ),
                "step_3_harmonized_fire_pixel_equivalent": (
                    "Rather than summing detection counts, compute Harmonized Fire Pixel Equivalent (HFPE): "
                    "When both sensors detect the same thermal event (Coincident Overpass), HFPE = max(MODIS_count, VIIRS_count * 0.18). "
                    "This reconciles the sub-pixel resolution difference and preserves physical burned front scale."
                ),
                "step_4_frp_conservation": (
                    "Fire Radiative Power (FRP) in Megawatts is reconciled across co-observing sensors using mean front emission, "
                    "avoiding energy tally duplication."
                ),
                "step_5_analytical_anomaly_baseline": (
                    "Compute 14-day rolling mean and standard deviation of harmonized thermal emission. "
                    "Activity exceeding +2.0 standard deviations is flagged as an analytical baseline deviation. "
                    "This is strictly an observational statistic, not an ignition forecast or spread model."
                )
            },
            "scientific_disclaimers": [
                "Satellite hotspot detections reflect thermal anomalies, NOT field-verified wildfire boundaries or controlled burns.",
                "Thermal anomalies may originate from agricultural stubble burning, prescribed forestry burns, gas flares, or industrial sources.",
                "Cloud cover, heavy smoke, tree canopy, or solar glint can cause omission or false anomaly flags.",
                "Never use this platform for real-time life-safety or predictive evacuation decisions."
            ]
        }
    }

