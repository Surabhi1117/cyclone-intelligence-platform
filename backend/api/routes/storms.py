"""
Storm Tracking and AI Inference REST API Routes.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query

from worker.data_fetcher import data_fetcher
from worker.ingestion_stream import ingestion_worker

router = APIRouter(prefix="/storms", tags=["Storms"])


@router.get("/active")
def get_active_storms(basin: Optional[str] = Query(None, description="Filter by basin name")) -> List[Dict[str, Any]]:
    """Returns list of all active monitored cyclones, optionally filtered by ocean basin."""
    storms = data_fetcher.get_all_active_storms()
    if basin and basin != "All Basins":
        storms = [s for s in storms if s["basin"].lower() == basin.lower()]
    return storms


@router.get("/{storm_id}/history")
def get_storm_history(storm_id: str) -> Dict[str, Any]:
    """Returns historical trajectory and past observations for a given storm."""
    storm = data_fetcher.get_storm(storm_id)
    if not storm:
        raise HTTPException(status_code=404, detail=f"Storm {storm_id} not found.")

    return {
        "storm_id": storm.storm_id,
        "storm_name": storm.name,
        "basin": storm.basin,
        "history": storm.history
    }


@router.get("/{storm_id}/latest")
async def get_storm_latest(storm_id: str) -> Dict[str, Any]:
    """
    Returns the latest complete AI inference payload including pattern classification,
    track forecast cones, intensity curves, satellite previews, Grad-CAM attention heatmap,
    and physical consistency validation.
    """
    latest = ingestion_worker.get_latest_inference(storm_id)
    if not latest:
        # If cache is not yet populated for this storm, trigger on-demand generation
        storm = data_fetcher.get_storm(storm_id)
        if not storm:
            raise HTTPException(status_code=404, detail=f"Storm {storm_id} not found.")
        granule = data_fetcher.generate_next_granule(storm_id)
        latest = await ingestion_worker.process_granule(granule)
        
    return latest


@router.get("/{storm_id}/telemetry")
def get_storm_telemetry(storm_id: str) -> Dict[str, Any]:
    """Returns real-time environmental and physical telemetry for the storm."""
    latest = ingestion_worker.get_latest_inference(storm_id)
    if not latest:
        raise HTTPException(status_code=404, detail=f"No telemetry found for storm {storm_id}.")
    
    return {
        "storm_id": storm_id,
        "current_intensity": latest["current_intensity"],
        "environmental_telemetry": latest["environmental_telemetry"],
        "physics_guardrail": latest["physics_guardrail"],
        "pattern_classification": latest["pattern_classification"]
    }

