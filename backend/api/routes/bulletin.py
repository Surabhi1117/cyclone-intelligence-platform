"""
Meteorological Early Warning Advisory Bulletin Generator API Route.
Generates structured WMO/IMD standard emergency advisory bulletins and risk reports.
"""

import datetime
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from worker.data_fetcher import data_fetcher
from worker.ingestion_stream import ingestion_worker

router = APIRouter(prefix="/bulletin", tags=["Early Warning & Bulletins"])


class BulletinRequest(BaseModel):
    storm_id: str
    issuing_agency: str = "Regional Specialized Meteorological Centre (RSMC / AI Early Warning Unit)"
    bulletin_number: int = 14


@router.post("/generate")
def generate_cyclone_bulletin(req: BulletinRequest) -> Dict[str, Any]:
    """Generates comprehensive emergency warning bulletin for disaster management authorities."""
    storm = data_fetcher.get_storm(req.storm_id)
    if not storm:
        raise HTTPException(status_code=404, detail=f"Storm {req.storm_id} not found.")

    latest = ingestion_worker.get_latest_inference(req.storm_id)
    now_utc = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    vmax = storm.vmax_kts
    pmin = storm.pmin_hpa
    cat = storm._get_category(vmax)
    
    # Calculate radius of maximum wind and gale-force wind extent
    rmax_km = max(18.0, min(65.0, (180.0 - vmax) * 0.45))
    gale_radius_km = max(80.0, min(320.0, (vmax * 2.2)))
    storm_surge_m = max(0.5, min(7.5, ((vmax - 34.0) / 18.0) * 0.95))

    # Coastal alert level
    if vmax >= 115:
        alert_color = "RED ALERT (EXTREME THREAT)"
        urgency = "IMMEDIATE EVACUATION RECOMMENDED FOR COASTAL LOW-LYING AREAS WITHIN 150 KM."
    elif vmax >= 64:
        alert_color = "ORANGE ALERT (SEVERE THREAT)"
        urgency = "PREPARE SHELTERS AND SUSPEND ALL FISHING / MARITIME OPERATIONS."
    else:
        alert_color = "YELLOW ALERT (WATCH / ADVISORY)"
        urgency = "MONITOR SATELLITE UPDATES; CAUTION ADVISED ALONG COASTAL BELT."

    bulletin_text = f"""
========================================================================================
             TROPICAL CYCLONE ADVISORY BULLETIN NO. {req.bulletin_number:02d}
             ISSUED BY: {req.issuing_agency.upper()}
========================================================================================
TIME OF ISSUE: {now_utc}
TARGET SYSTEM: {cat.upper()} '{storm.name}'
CURRENT OCEAN BASIN: {storm.basin.upper()}

1. SYNOPTIC OBSERVATIONS & AI ESTIMATIONS:
   - CENTER POSITION: {storm.current_lat:.2f}°N, {storm.current_lon:.2f}°E
   - MAXIMUM SUSTAINED SURFACE WIND (1-MIN): {vmax:.1f} KNOTS ({vmax * 1.852:.1f} KM/H)
   - ESTIMATED MINIMUM CENTRAL PRESSURE: {pmin:.1f} HPA
   - SYSTEM CATEGORY: {cat}
   - PATTERN ARCHETYPE: {storm.pattern}
   - ESTIMATED RADIUS OF MAXIMUM WIND (RMAX): {rmax_km:.1f} KM
   - EXTENT OF 34-KT (GALE FORCE) WINDS: RADIUS UP TO {gale_radius_km:.1f} KM

2. METEOROLOGICAL HAZARDS & INLAND IMPACT:
   - STORM SURGE INUNDATION: PEAK SURGE OF {storm_surge_m:.2f} METERS ABOVE ASTRONOMICAL TIDE
   - EXPECTED LANDFALL SECTOR: WITHIN LAT {storm.current_lat + 1.2:.1f}°N, LON {storm.current_lon + 1.5:.1f}°E
   - PEAK GUST POTENTIAL: {vmax * 1.25:.1f} KNOTS ({vmax * 1.852 * 1.25:.1f} KM/H)

3. ACTIONABLE DISASTER MANAGEMENT ADVISORY:
   - STATUS: {alert_color}
   - DIRECTIVE: {urgency}
   - FISHERMEN WARNING: TOTAL SUSPENSION OF OFFSHORE OPERATIONS OVER CENTRAL AND ADJACENT BASIN SECTORS.
   - PORT SIGNALS: HOIST LOCAL CAUTIONARY SIGNAL / DANGER SIGNAL LEVEL 8.
========================================================================================
"""

    return {
        "storm_id": storm.storm_id,
        "storm_name": storm.name,
        "basin": storm.basin,
        "timestamp_utc": now_utc,
        "bulletin_number": req.bulletin_number,
        "category": cat,
        "alert_level": alert_color,
        "urgency_directive": urgency,
        "telemetry": {
            "vmax_kts": round(vmax, 1),
            "vmax_kmh": round(vmax * 1.852, 1),
            "pmin_hpa": round(pmin, 1),
            "lat": round(storm.current_lat, 2),
            "lon": round(storm.current_lon, 2),
            "rmax_km": round(rmax_km, 1),
            "gale_radius_km": round(gale_radius_km, 1),
            "expected_storm_surge_meters": round(storm_surge_m, 2)
        },
        "forecast_horizons": latest.get("forecast_track", []) if latest else [],
        "formatted_text": bulletin_text.strip()
    }

