"""
NASA MODIS & VIIRS Hotspot Harmonization API.
FastAPI Application Entrypoint.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import APP_NAME, VERSION, DESCRIPTION
from .api.health import router as health_router
from .api.data import router as data_router
from .api.calendar import router as calendar_router
from .api.comparison import router as comparison_router
from .api.methodology import router as methodology_router

app = FastAPI(
    title=APP_NAME,
    version=VERSION,
    description=DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for local Vite development and cross-origin clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(health_router)
app.include_router(data_router)
app.include_router(calendar_router)
app.include_router(comparison_router)
app.include_router(methodology_router)

@app.get("/")
def root():
    return {
        "message": f"Welcome to {APP_NAME}",
        "version": VERSION,
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)

