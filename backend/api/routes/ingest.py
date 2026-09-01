"""
Ingestion Control and Audit Feed REST API Routes.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from worker.data_fetcher import data_fetcher
from worker.ingestion_stream import ingestion_worker

router = APIRouter(prefix="/ingest", tags=["Ingestion"])


class ManualTriggerRequest(BaseModel):
    storm_id: Optional[str] = Field(None, description="Target storm ID (default: active storm)")
    custom_lat: Optional[float] = Field(None, description="Override center latitude")
    custom_lon: Optional[float] = Field(None, description="Override center longitude")
    custom_vmax: Optional[float] = Field(None, description="Override wind speed in knots")
    custom_pattern: Optional[str] = Field(None, description="Override cyclone pattern")


class SimulationControlRequest(BaseModel):
    poll_interval_seconds: Optional[int] = Field(None, description="Polling interval in seconds")
    inject_rapid_intensification: Optional[bool] = Field(False, description="Simulate rapid intensification")
    inject_wind_shear: Optional[bool] = Field(False, description="Simulate high vertical wind shear")


@router.post("/manual-trigger")
async def trigger_manual_ingest(req: ManualTriggerRequest) -> Dict[str, Any]:
    """
    Manually triggers satellite granule ingestion and runs full AI inference on demand.
    """
    target_storm_id = req.storm_id or list(data_fetcher.active_simulated_storms.keys())[0]
    storm = data_fetcher.get_storm(target_storm_id)
    if not storm:
        raise HTTPException(status_code=404, detail=f"Storm {target_storm_id} not found.")

    if req.custom_lat is not None:
        storm.current_lat = req.custom_lat
    if req.custom_lon is not None:
        storm.current_lon = req.custom_lon
    if req.custom_vmax is not None:
        storm.vmax_kts = req.custom_vmax
    if req.custom_pattern is not None:
        storm.pattern = req.custom_pattern

    granule = data_fetcher.generate_next_granule(target_storm_id)
    inference_result = await ingestion_worker.process_granule(granule)

    return {
        "status": "SUCCESS",
        "message": f"Manual satellite pass generated and processed for {storm.name}",
        "granule_id": granule["granule_id"],
        "inference_summary": {
            "category": inference_result["current_intensity"]["category"],
            "vmax_kts": inference_result["current_intensity"]["vmax_kts"],
            "turnaround_ms": inference_result["turnaround_ms"],
            "physical_confidence": inference_result["physics_guardrail"]["physical_confidence_score"]
        }
    }


@router.get("/logs")
def get_ingestion_logs(limit: int = 50) -> List[Dict[str, Any]]:
    """Returns recent continuous ingestion and audit logs."""
    return ingestion_worker.get_recent_audit_logs(limit=limit)


@router.post("/simulation-control")
def update_simulation_parameters(req: SimulationControlRequest) -> Dict[str, Any]:
    """Dynamically updates simulation and polling parameters."""
    if req.poll_interval_seconds is not None:
        ingestion_worker.poll_interval = max(3, req.poll_interval_seconds)

    if req.inject_rapid_intensification:
        # Boost wind speed by +35 kts on first active storm
        for storm in data_fetcher.active_simulated_storms.values():
            storm.vmax_kts = min(165.0, storm.vmax_kts + 35.0)
            storm.pattern = "Eye Pattern"
        ingestion_worker.record_audit_log(
            event_type="SIMULATION_OVERRIDE",
            message="Injected Rapid Intensification (+35 kts) across active storms.",
            level="WARNING"
        )

    if req.inject_wind_shear:
        for storm in data_fetcher.active_simulated_storms.values():
            storm.vmax_kts = max(30.0, storm.vmax_kts - 25.0)
            storm.pattern = "Shear Pattern"
        ingestion_worker.record_audit_log(
            event_type="SIMULATION_OVERRIDE",
            message="Injected strong Vertical Wind Shear (weakening convection).",
            level="INFO"
        )

    return {
        "status": "SUCCESS",
        "current_poll_interval_seconds": ingestion_worker.poll_interval,
        "message": "Simulation configuration updated."
    }

