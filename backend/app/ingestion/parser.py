"""
NASA FIRMS CSV Ingestion and Standardization Engine.

Handles real NASA FIRMS formats for:
- MODIS C6.1 (Terra / Aqua)
- VIIRS 375m (Suomi-NPP, NOAA-20, NOAA-21)
Preserves original values, normalizes standard schema, and validates observational integrity.
"""
import io
import re
from datetime import datetime, timezone
from typing import List, Tuple, Dict, Any
import pandas as pd

from ..models.schemas import HarmonizedDetection

def format_acq_time(raw_time: Any) -> str:
    """Format raw FIRMS acquisition time (e.g. 45 -> '0045', 930 -> '0930', '1335' -> '1335')."""
    if pd.isna(raw_time):
        return "0000"
    s = str(raw_time).strip().replace(":", "")
    # Remove decimal if parsed as float (e.g. 1335.0)
    if "." in s:
        s = s.split(".")[0]
    s = s.zfill(4)
    if len(s) > 4:
        s = s[:4]
    return s

def parse_iso_datetime(date_str: str, time_str: str) -> str:
    """Construct standard UTC ISO 8601 timestamp YYYY-MM-DDTHH:MM:SSZ."""
    try:
        clean_date = str(date_str).strip()
        formatted_time = format_acq_time(time_str)
        hh = int(formatted_time[:2])
        mm = int(formatted_time[2:4])
        dt = datetime.strptime(clean_date, "%Y-%m-%d").replace(
            hour=min(23, max(0, hh)),
            minute=min(59, max(0, mm)),
            second=0,
            tzinfo=timezone.utc
        )
        return dt.isoformat()
    except Exception:
        return f"{date_str}T00:00:00Z"

def normalize_satellite_name(raw_sat: Any, instrument: str) -> str:
    """Standardize satellite platform name (e.g. 'T' -> 'Terra', 'N' -> 'Suomi-NPP')."""
    if pd.isna(raw_sat):
        return "Terra" if instrument.upper() == "MODIS" else "Suomi-NPP"
    s = str(raw_sat).strip().upper()
    if s in ["T", "TERRA"]:
        return "Terra"
    if s in ["A", "AQUA"]:
        return "Aqua"
    if s in ["N", "NPP", "SUOMI-NPP", "SNPP"]:
        return "Suomi-NPP"
    if s in ["1", "20", "NOAA-20", "JPSS-1", "N20"]:
        return "NOAA-20"
    if s in ["2", "21", "NOAA-21", "JPSS-2", "N21"]:
        return "NOAA-21"
    return str(raw_sat).strip()

def normalize_confidence(raw_conf: Any, instrument: str) -> Tuple[str, float, str]:
    """
    Standardize confidence value.
    Returns: (confidence_category: 'low'|'nominal'|'high', normalized_numeric: 0.0-1.0, original_str)
    """
    orig_str = str(raw_conf).strip() if not pd.isna(raw_conf) else "unknown"
    lower_str = orig_str.lower()

    if instrument.upper() == "MODIS":
        try:
            val = float(orig_str)
            norm = max(0.0, min(1.0, val / 100.0))
            if norm < 0.30:
                cat = "low"
            elif norm < 0.80:
                cat = "nominal"
            else:
                cat = "high"
            return cat, norm, orig_str
        except ValueError:
            pass

    # VIIRS or categorical mapping
    if lower_str in ["l", "low"]:
        return "low", 0.25, orig_str
    elif lower_str in ["n", "nominal"]:
        return "nominal", 0.65, orig_str
    elif lower_str in ["h", "high"]:
        return "high", 0.95, orig_str
    
    # Fallback attempt if numeric
    try:
        val = float(orig_str)
        norm = max(0.0, min(1.0, val / 100.0 if val > 1.0 else val))
        cat = "low" if norm < 0.30 else ("nominal" if norm < 0.80 else "high")
        return cat, norm, orig_str
    except ValueError:
        return "nominal", 0.50, orig_str

def parse_firms_csv(csv_content: str, filename: str = "uploaded.csv") -> Tuple[List[HarmonizedDetection], List[str]]:
    """
    Parse CSV content in NASA FIRMS format.
    Supports MODIS, VIIRS, or mixed feeds.
    Returns: (list_of_harmonized_detections, list_of_validation_warnings)
    """
    warnings: List[str] = []
    
    try:
        df = pd.read_csv(io.StringIO(csv_content))
    except Exception as e:
        raise ValueError(f"Failed to read CSV format: {str(e)}")

    if df.empty:
        raise ValueError("Uploaded CSV contains no records.")

    # Normalize column names: lower-case, stripped
    df.columns = [str(c).strip().lower() for c in df.columns]

    # Required columns check
    has_lat = any(c in df.columns for c in ["latitude", "lat"])
    has_lon = any(c in df.columns for c in ["longitude", "lon", "long"])
    has_date = any(c in df.columns for c in ["acq_date", "date"])

    if not (has_lat and has_lon and has_date):
        raise ValueError("CSV missing required spatial-temporal columns: latitude, longitude, acq_date.")

    lat_col = "latitude" if "latitude" in df.columns else "lat"
    lon_col = "longitude" if "longitude" in df.columns else ("lon" if "lon" in df.columns else "long")
    date_col = "acq_date" if "acq_date" in df.columns else "date"

    # Instrument detection
    has_instrument = "instrument" in df.columns
    has_bright_ti4 = "bright_ti4" in df.columns
    has_brightness = "brightness" in df.columns

    records: List[HarmonizedDetection] = []
    skipped_rows = 0

    for idx, row in df.iterrows():
        try:
            # Lat/Lon validation
            lat = float(row[lat_col])
            lon = float(row[lon_col])
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                skipped_rows += 1
                continue

            # Instrument / Sensor inference
            raw_inst = str(row["instrument"]).strip().upper() if has_instrument and not pd.isna(row["instrument"]) else ""
            if "VIIRS" in raw_inst or has_bright_ti4:
                sensor = "VIIRS"
            elif "MODIS" in raw_inst or has_brightness:
                sensor = "MODIS"
            else:
                # Infer from satellite or default to VIIRS
                sat_temp = str(row.get("satellite", "")).upper()
                if "TERRA" in sat_temp or "AQUA" in sat_temp or sat_temp in ["T", "A"]:
                    sensor = "MODIS"
                else:
                    sensor = "VIIRS"

            # Satellite platform
            satellite = normalize_satellite_name(row.get("satellite", None), sensor)

            # Brightness temperature (Kelvin)
            if sensor == "VIIRS" and has_bright_ti4 and not pd.isna(row.get("bright_ti4")):
                brightness = float(row["bright_ti4"])
            elif has_brightness and not pd.isna(row.get("brightness")):
                brightness = float(row["brightness"])
            elif "bright_ti4" in row and not pd.isna(row["bright_ti4"]):
                brightness = float(row["bright_ti4"])
            else:
                brightness = 310.0  # Default plausible ambient thermal anomaly baseline

            # Fire Radiative Power (MW)
            frp = 0.0
            if "frp" in row and not pd.isna(row["frp"]):
                try:
                    frp = max(0.0, float(row["frp"]))
                except (ValueError, TypeError):
                    frp = 0.0

            # Time and Datetime
            raw_date = str(row[date_col]).strip()
            raw_time = row.get("acq_time", "0000")
            formatted_time = format_acq_time(raw_time)
            iso_dt = parse_iso_datetime(raw_date, formatted_time)

            # Day / Night flag
            daynight = str(row.get("daynight", "D")).strip().upper()
            if daynight not in ["D", "N"]:
                daynight = "D"

            # Confidence
            raw_conf = row.get("confidence", "nominal" if sensor == "VIIRS" else "50")
            conf_cat, conf_norm, conf_orig = normalize_confidence(raw_conf, sensor)

            # Pixel dimensions (scan and track)
            scan = float(row.get("scan", 1.0 if sensor == "MODIS" else 0.375))
            track = float(row.get("track", 1.0 if sensor == "MODIS" else 0.375))
            pixel_area = round(scan * track, 3)

            rec_id = f"{sensor[:1]}_{idx}_{formatted_time}_{abs(round(lat, 3))}_{abs(round(lon, 3))}"

            record = HarmonizedDetection(
                id=rec_id,
                latitude=round(lat, 5),
                longitude=round(lon, 5),
                sensor=sensor,
                satellite=satellite,
                acq_datetime=iso_dt,
                acq_date=raw_date,
                acq_time=formatted_time,
                daynight=daynight,
                brightness_k=round(brightness, 1),
                frp_mw=round(frp, 1),
                confidence_category=conf_cat,
                confidence_normalized=round(conf_norm, 2),
                confidence_original=conf_orig,
                scan=round(scan, 2),
                track=round(track, 2),
                pixel_area_km2=pixel_area,
                cluster_id=None
            )
            records.append(record)

        except Exception as err:
            skipped_rows += 1
            continue

    if skipped_rows > 0:
        warnings.append(f"Skipped {skipped_rows} row(s) due to invalid coordinates or unparseable fields.")

    if not records:
        raise ValueError("No valid thermal anomaly records could be extracted from the file.")

    return records, warnings

