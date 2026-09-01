"""
Application configuration for Tropical Cyclone AI Pipeline.
Uses pydantic-settings for robust environment variable management.
"""

from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Tropical Cyclone AI Pipeline"
    APP_VERSION: str = "2.4.0"
    DEBUG: bool = True
    API_PREFIX: str = "/api"

    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    # Storage Paths
    BASE_DIR: Path = Path(__file__).resolve().parent
    DATA_DIR: Path = BASE_DIR / "data"
    DB_PATH: Path = DATA_DIR / "cyclone_storage.db"
    SATELLITE_CACHE_DIR: Path = DATA_DIR / "satellite_cache"
    MODEL_WEIGHTS_PATH: Path = BASE_DIR / "core" / "weights" / "cyclone_ai_weights.pt"

    # Continuous Ingestion Worker Settings
    INGESTION_POLL_INTERVAL_SECONDS: int = 15  # Simulated 15s cadence for live UI demonstration
    ENABLE_SYNTHETIC_FALLBACK: bool = True
    MAX_AUDIT_LOGS_KEPT: int = 500

    # Cyclone Model Hyperparameters
    DEVICE: str = "cpu"  # Will auto-detect cuda if available
    USE_FP16: bool = False  # Set true on CUDA devices
    IMAGE_SIZE: int = 128
    PHYSICAL_BOX_KM: float = 1000.0  # 1000 km x 1000 km standardized bounding box
    SEQUENCE_LENGTH: int = 4  # T=4 timesteps (e.g. t-18h, t-12h, t-6h, t-0h)
    CHANNELS: int = 3  # TIR 10.8µm, WV 6.7µm, Microwave 89GHz
    ENV_FEATURES_DIM: int = 6  # SST, VWS, Vorticity, Divergence, RH700, OHC

    # Active Monitoring Basins
    SUPPORTED_BASINS: List[str] = [
        "North Indian Ocean",
        "Western North Pacific",
        "North Atlantic",
        "South Indian Ocean",
        "Eastern Pacific"
    ]

    # Physics Verification Thresholds
    MAX_TRANSLATION_SPEED_KMH: float = 65.0
    MAX_24H_INTENSIFICATION_KTS: float = 80.0
    ATKINSON_HOLLIDAY_TOLERANCE_HPA: float = 22.0

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.SATELLITE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
(settings.BASE_DIR / "core" / "weights").mkdir(parents=True, exist_ok=True)

