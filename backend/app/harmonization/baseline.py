"""
Statistical Baseline and Analytical Unusual-Activity Indicator Engine.

Computes:
1. Daily aggregated harmonized activity metrics.
2. Historical baseline (rolling mean and standard deviation of FRP and cluster counts).
3. Statistical Z-score anomaly indicators.
4. Scientific disclaimers explicitly framing alerts as analytical flags, never predictions.
"""
from typing import List, Dict
from datetime import datetime
import pandas as pd
import numpy as np

from ..models.schemas import HarmonizedCluster, CalendarDaySummary, MonthlySummary
from ..config import ANOMALY_Z_SCORE_THRESHOLD, ANOMALY_BASELINE_WINDOW_DAYS

def compute_daily_calendar_and_anomalies(clusters: List[HarmonizedCluster]) -> List[CalendarDaySummary]:
    """
    Aggregate harmonized clusters into daily calendar records with statistical anomaly analysis.
    """
    if not clusters:
        return []

    # Convert clusters to a DataFrame for time series operations
    data = []
    for c in clusters:
        data.append({
            "date": c.acq_date,
            "hfpe": c.harmonized_fire_pixel_equivalent,
            "modis_count": c.modis_count,
            "viirs_count": c.viirs_count,
            "raw_total": c.total_raw_detections,
            "frp_mw": c.total_frp_mw,
            "is_coincident": 1 if c.overlap_status == "COINCIDENT_OVERLAP" else 0
        })

    df = pd.DataFrame(data)
    
    # Group by date
    daily_grouped = df.groupby("date").agg(
        hfpe_sum=("hfpe", "sum"),
        clusters_count=("hfpe", "count"),
        modis_sum=("modis_count", "sum"),
        viirs_sum=("viirs_count", "sum"),
        raw_sum=("raw_total", "sum"),
        frp_sum=("frp_mw", "sum"),
        coincident_sum=("is_coincident", "sum")
    ).reset_index()

    daily_grouped["date_dt"] = pd.to_datetime(daily_grouped["date"])
    daily_grouped = daily_grouped.sort_values("date_dt").reset_index(drop=True)

    # Compute rolling baseline over historical window (e.g. 14 days)
    # Using min_periods=3 so early days establish an initial baseline
    rolling_frp_mean = daily_grouped["frp_sum"].rolling(window=ANOMALY_BASELINE_WINDOW_DAYS, min_periods=3).mean()
    rolling_frp_std = daily_grouped["frp_sum"].rolling(window=ANOMALY_BASELINE_WINDOW_DAYS, min_periods=3).std().fillna(1.0)
    
    # Ensure minimum std to avoid zero-division
    rolling_frp_std = rolling_frp_std.apply(lambda x: max(float(x), 5.0))

    summaries: List[CalendarDaySummary] = []

    for i, row in daily_grouped.iterrows():
        b_mean = float(rolling_frp_mean.iloc[i]) if not pd.isna(rolling_frp_mean.iloc[i]) else float(row["frp_sum"])
        b_std = float(rolling_frp_std.iloc[i]) if not pd.isna(rolling_frp_std.iloc[i]) else 10.0

        frp_val = float(row["frp_sum"])
        z_score = round(float((frp_val - b_mean) / b_std), 2)

        # Categorize activity level based on harmonized equivalent
        equiv = float(row["hfpe_sum"])
        if equiv == 0:
            act_level = "none"
        elif equiv < 5.0:
            act_level = "low"
        elif equiv < 20.0:
            act_level = "moderate"
        elif equiv < 60.0:
            act_level = "elevated"
        else:
            act_level = "extreme"

        is_unusual = bool(z_score >= ANOMALY_Z_SCORE_THRESHOLD and frp_val > 30.0)
        
        flag_text = None
        if is_unusual:
            flag_text = (
                f"Elevated Thermal Anomaly (+{z_score:.1f}σ vs 14-day baseline). "
                f"Analytical indicator based on statistical deviation from baseline; not a prediction."
            )

        summaries.append(CalendarDaySummary(
            date=str(row["date"]),
            harmonized_fire_pixel_equivalent=round(equiv, 2),
            harmonized_clusters_count=int(row["clusters_count"]),
            raw_modis_count=int(row["modis_sum"]),
            raw_viirs_count=int(row["viirs_sum"]),
            total_raw_detections=int(row["raw_sum"]),
            total_frp_mw=round(frp_val, 1),
            coincident_clusters_count=int(row["coincident_sum"]),
            activity_level=act_level,
            is_unusual_activity=is_unusual,
            z_score=z_score,
            analytical_flag=flag_text,
            baseline_mean_frp=round(b_mean, 1),
            baseline_std_frp=round(b_std, 1)
        ))

    return summaries

def compute_monthly_summaries(daily_summaries: List[CalendarDaySummary]) -> List[MonthlySummary]:
    """Aggregate daily summaries into monthly trends."""
    if not daily_summaries:
        return []

    month_buckets: Dict[str, List[CalendarDaySummary]] = {}
    for d in daily_summaries:
        ym = d.date[:7]  # YYYY-MM
        if ym not in month_buckets:
            month_buckets[ym] = []
        month_buckets[ym].append(d)

    months: List[MonthlySummary] = []
    for ym in sorted(month_buckets.keys()):
        days = month_buckets[ym]
        try:
            m_dt = datetime.strptime(ym, "%Y-%m")
            m_name = m_dt.strftime("%B %Y")
        except Exception:
            m_name = ym

        active_days = sum(1 for d in days if d.harmonized_clusters_count > 0)
        tot_hfpe = sum(d.harmonized_fire_pixel_equivalent for d in days)
        tot_clusters = sum(d.harmonized_clusters_count for d in days)
        tot_frp = sum(d.total_frp_mw for d in days)
        tot_modis = sum(d.raw_modis_count for d in days)
        tot_viirs = sum(d.raw_viirs_count for d in days)
        unusual_days = sum(1 for d in days if d.is_unusual_activity)
        
        ratio = round(tot_viirs / tot_modis, 2) if tot_modis > 0 else float(tot_viirs)

        months.append(MonthlySummary(
            year_month=ym,
            month_name=m_name,
            days_with_activity=active_days,
            total_harmonized_equivalent=round(tot_hfpe, 2),
            total_clusters=tot_clusters,
            total_frp_mw=round(tot_frp, 1),
            modis_count=tot_modis,
            viirs_count=tot_viirs,
            viirs_to_modis_ratio=ratio,
            unusual_days_count=unusual_days
        ))

    return months

