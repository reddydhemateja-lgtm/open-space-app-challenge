from fastapi import APIRouter

from ..models.schemas import SensorComparisonSummary
from ..harmonization.metrics import compute_sensor_comparison
from .data import state

router = APIRouter(prefix="/api/comparison", tags=["Sensor Comparison"])

@router.get("", response_model=SensorComparisonSummary)
def get_sensor_comparison():
    """
    Returns comparative breakdown between MODIS and VIIRS:
    - Detection count ratios and resolution scaling
    - Total and mean Fire Radiative Power (MW)
    - Coincident overlap vs sensor-exclusive clusters
    - Diurnal (Day/Night) and Confidence category distributions
    - Scientific explanations of sensor physics
    """
    return compute_sensor_comparison(state.detections, state.clusters)

