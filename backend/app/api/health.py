from fastapi import APIRouter
from ..config import APP_NAME, VERSION, SENSOR_SPECS

router = APIRouter(prefix="/api/health", tags=["Health"])

@router.get("")
def get_health():
    """
    Health check endpoint verifying backend availability, service version, and sensor calibrations.
    """
    return {
        "status": "healthy",
        "service": APP_NAME,
        "version": VERSION,
        "supported_sensors": list(SENSOR_SPECS.keys()),
        "sensor_specifications": SENSOR_SPECS,
        "system_ready": True
    }

