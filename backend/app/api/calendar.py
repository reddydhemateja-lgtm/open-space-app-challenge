from typing import List, Optional
from fastapi import APIRouter

from ..models.schemas import CalendarDaySummary, MonthlySummary, AnomalySummary
from ..harmonization.baseline import compute_daily_calendar_and_anomalies, compute_monthly_summaries
from .data import state

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])

@router.get("/daily", response_model=List[CalendarDaySummary])
def get_daily_calendar(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Returns daily burning-activity calendar time-series with harmonized equivalents,
    raw sensor counts, FRP totals, and analytical baseline anomaly indicators.
    """
    daily = compute_daily_calendar_and_anomalies(state.clusters)

    if start_date and isinstance(start_date, str):
        daily = [d for d in daily if d.date >= start_date]
    if end_date and isinstance(end_date, str):
        daily = [d for d in daily if d.date <= end_date]

    return daily

@router.get("/monthly", response_model=List[MonthlySummary])
def get_monthly_summary():
    """
    Returns monthly aggregated burning activity summary, including VIIRS:MODIS ratios
    and count of unusual activity days.
    """
    daily = compute_daily_calendar_and_anomalies(state.clusters)
    return compute_monthly_summaries(daily)

@router.get("/anomalies", response_model=List[AnomalySummary])
def get_anomalies():
    """
    Returns all detected unusual thermal activity days based on statistical baseline deviation.
    Explicitly labeled as an analytical flag, not a fire prediction or spread forecast.
    """
    daily = compute_daily_calendar_and_anomalies(state.clusters)
    anomalies: List[AnomalySummary] = []

    for d in daily:
        if d.is_unusual_activity:
            anomalies.append(AnomalySummary(
                date=d.date,
                z_score=d.z_score,
                observed_frp_mw=d.total_frp_mw,
                baseline_mean_frp_mw=d.baseline_mean_frp,
                baseline_std_frp_mw=d.baseline_std_frp,
                harmonized_clusters=d.harmonized_clusters_count,
                flag_type="Analytical Baseline Deviation (+2.0σ Threshold)",
                scientific_disclaimer=(
                    "Analytical statistical flag: Indicates that observed satellite Fire Radiative Power (MW) "
                    "exceeded the 14-day rolling historical baseline mean by more than 2.0 standard deviations. "
                    "This is an analytical observation flag, NOT a fire prediction or risk model."
                )
            ))

    return anomalies
