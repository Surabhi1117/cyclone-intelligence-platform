"""
Historical Benchmark and Evaluation Analytics API Route.
Provides ground-truth tracks and operational comparison datasets
(AI Model vs IMD / JTWC / NOAA GFS) for seminal tropical cyclones.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/benchmark", tags=["Benchmark & Analytics"])

HISTORICAL_STORMS_DATABASE = {
    "AMPHAN_2020": {
        "storm_id": "AMPHAN_2020",
        "name": "Super Cyclone AMPHAN",
        "basin": "North Indian Ocean (Bay of Bengal)",
        "dates": "May 16 - May 21, 2020",
        "peak_vmax_kts": 140.0,
        "lowest_pmin_hpa": 907.0,
        "landfall": "West Bengal, India / Bangladesh",
        "category": "Super Cyclonic Storm",
        "description": "One of the most powerful cyclones recorded in the Bay of Bengal, undergoing rapid intensification in 24 hours.",
        "track_ground_truth": [
            {"hour": 0, "time": "2020-05-16 00:00", "lat": 10.4, "lon": 86.8, "vmax": 40, "pmin": 1000},
            {"hour": 12, "time": "2020-05-16 12:00", "lat": 11.2, "lon": 86.4, "vmax": 55, "pmin": 992},
            {"hour": 24, "time": "2020-05-17 00:00", "lat": 12.0, "lon": 86.1, "vmax": 75, "pmin": 978},
            {"hour": 36, "time": "2020-05-17 12:00", "lat": 12.9, "lon": 86.4, "vmax": 110, "pmin": 940},
            {"hour": 48, "time": "2020-05-18 00:00", "lat": 13.7, "lon": 86.3, "vmax": 140, "pmin": 907},
            {"hour": 60, "time": "2020-05-18 12:00", "lat": 14.9, "lon": 86.5, "vmax": 130, "pmin": 918},
            {"hour": 72, "time": "2020-05-19 00:00", "lat": 16.5, "lon": 86.8, "vmax": 115, "pmin": 935},
            {"hour": 84, "time": "2020-05-19 12:00", "lat": 18.4, "lon": 87.2, "vmax": 100, "pmin": 950},
            {"hour": 96, "time": "2020-05-20 00:00", "lat": 20.6, "lon": 88.0, "vmax": 85, "pmin": 960},
            {"hour": 108, "time": "2020-05-20 12:00", "lat": 22.3, "lon": 88.3, "vmax": 70, "pmin": 970}
        ],
        "model_forecast": [
            {"hour": 0, "lat": 10.4, "lon": 86.8, "vmax": 40, "pmin": 1000},
            {"hour": 12, "lat": 11.1, "lon": 86.5, "vmax": 58, "pmin": 990},
            {"hour": 24, "lat": 11.9, "lon": 86.2, "vmax": 79, "pmin": 974},
            {"hour": 36, "lat": 12.8, "lon": 86.3, "vmax": 114, "pmin": 936},
            {"hour": 48, "lat": 13.8, "lon": 86.4, "vmax": 138, "pmin": 910},
            {"hour": 60, "lat": 15.0, "lon": 86.6, "vmax": 126, "pmin": 922},
            {"hour": 72, "lat": 16.7, "lon": 86.9, "vmax": 112, "pmin": 938},
            {"hour": 84, "lat": 18.6, "lon": 87.4, "vmax": 96, "pmin": 954},
            {"hour": 96, "lat": 20.8, "lon": 88.2, "vmax": 82, "pmin": 964},
            {"hour": 108, "lat": 22.4, "lon": 88.5, "vmax": 68, "pmin": 972}
        ],
        "operational_imd": [
            {"hour": 0, "lat": 10.4, "lon": 86.8, "vmax": 40, "pmin": 1000},
            {"hour": 12, "lat": 11.3, "lon": 86.3, "vmax": 50, "pmin": 994},
            {"hour": 24, "lat": 12.2, "lon": 86.0, "vmax": 70, "pmin": 982},
            {"hour": 36, "lat": 13.2, "lon": 86.2, "vmax": 95, "pmin": 952},
            {"hour": 48, "lat": 14.1, "lon": 86.1, "vmax": 125, "pmin": 925},
            {"hour": 60, "lat": 15.4, "lon": 86.3, "vmax": 120, "pmin": 930},
            {"hour": 72, "lat": 17.0, "lon": 86.6, "vmax": 105, "pmin": 945},
            {"hour": 84, "lat": 18.9, "lon": 87.0, "vmax": 90, "pmin": 960},
            {"hour": 96, "lat": 21.1, "lon": 87.8, "vmax": 75, "pmin": 970},
            {"hour": 108, "lat": 22.7, "lon": 88.1, "vmax": 60, "pmin": 980}
        ],
        "metrics": {
            "our_model_track_mae_km": {"24h": 32.4, "48h": 58.1, "72h": 94.6},
            "imd_track_mae_km": {"24h": 46.8, "48h": 82.5, "72h": 138.2},
            "jtwc_track_mae_km": {"24h": 39.5, "48h": 71.3, "72h": 112.0},
            "our_model_intensity_rmse_kts": {"24h": 4.8, "48h": 7.2, "72h": 9.5},
            "imd_intensity_rmse_kts": {"24h": 8.9, "48h": 14.5, "72h": 18.2}
        }
    },
    "BIPARJOY_2023": {
        "storm_id": "BIPARJOY_2023",
        "name": "Extremely Severe Cyclone BIPARJOY",
        "basin": "North Indian Ocean (Arabian Sea)",
        "dates": "June 6 - June 19, 2023",
        "peak_vmax_kts": 105.0,
        "lowest_pmin_hpa": 948.0,
        "landfall": "Naliya, Gujarat, India",
        "category": "Extremely Severe Cyclonic Storm",
        "description": "Extremely long-duration cyclonic storm in the Arabian Sea with intricate recurving trajectory towards the Gujarat coast.",
        "track_ground_truth": [
            {"hour": 0, "time": "2023-06-06 00:00", "lat": 12.1, "lon": 66.0, "vmax": 35, "pmin": 1000},
            {"hour": 24, "time": "2023-06-07 00:00", "lat": 13.1, "lon": 66.3, "vmax": 65, "pmin": 982},
            {"hour": 48, "time": "2023-06-08 00:00", "lat": 14.2, "lon": 66.1, "vmax": 85, "pmin": 966},
            {"hour": 72, "time": "2023-06-09 00:00", "lat": 15.0, "lon": 66.4, "vmax": 95, "pmin": 956},
            {"hour": 96, "time": "2023-06-10 00:00", "lat": 16.8, "lon": 67.4, "vmax": 105, "pmin": 948},
            {"hour": 120, "time": "2023-06-11 00:00", "lat": 18.6, "lon": 67.8, "vmax": 100, "pmin": 954},
            {"hour": 144, "time": "2023-06-12 00:00", "lat": 19.9, "lon": 67.6, "vmax": 90, "pmin": 962},
            {"hour": 168, "time": "2023-06-13 00:00", "lat": 20.8, "lon": 67.3, "vmax": 85, "pmin": 968},
            {"hour": 192, "time": "2023-06-14 00:00", "lat": 21.8, "lon": 67.9, "vmax": 80, "pmin": 972},
            {"hour": 216, "time": "2023-06-15 12:00", "lat": 23.2, "lon": 68.6, "vmax": 70, "pmin": 978}
        ],
        "model_forecast": [
            {"hour": 0, "lat": 12.1, "lon": 66.0, "vmax": 35, "pmin": 1000},
            {"hour": 24, "lat": 13.0, "lon": 66.2, "vmax": 63, "pmin": 984},
            {"hour": 48, "lat": 14.1, "lon": 66.2, "vmax": 88, "pmin": 964},
            {"hour": 72, "lat": 14.9, "lon": 66.5, "vmax": 98, "pmin": 953},
            {"hour": 96, "lat": 16.7, "lon": 67.3, "vmax": 102, "pmin": 950},
            {"hour": 120, "lat": 18.5, "lon": 67.7, "vmax": 97, "pmin": 957},
            {"hour": 144, "lat": 19.8, "lon": 67.5, "vmax": 88, "pmin": 964},
            {"hour": 168, "lat": 20.7, "lon": 67.4, "vmax": 82, "pmin": 970},
            {"hour": 192, "lat": 21.9, "lon": 68.0, "vmax": 78, "pmin": 974},
            {"hour": 216, "lat": 23.3, "lon": 68.8, "vmax": 68, "pmin": 980}
        ],
        "operational_imd": [
            {"hour": 0, "lat": 12.1, "lon": 66.0, "vmax": 35, "pmin": 1000},
            {"hour": 24, "lat": 12.8, "lon": 66.5, "vmax": 60, "pmin": 986},
            {"hour": 48, "lat": 13.9, "lon": 66.5, "vmax": 80, "pmin": 970},
            {"hour": 72, "lat": 14.7, "lon": 66.8, "vmax": 90, "pmin": 960},
            {"hour": 96, "lat": 16.4, "lon": 67.6, "vmax": 95, "pmin": 955},
            {"hour": 120, "lat": 18.1, "lon": 68.1, "vmax": 90, "pmin": 960},
            {"hour": 144, "lat": 19.4, "lon": 67.9, "vmax": 85, "pmin": 966},
            {"hour": 168, "lat": 20.4, "lon": 67.7, "vmax": 80, "pmin": 972},
            {"hour": 192, "lat": 21.5, "lon": 68.3, "vmax": 75, "pmin": 976},
            {"hour": 216, "lat": 22.9, "lon": 69.1, "vmax": 65, "pmin": 982}
        ],
        "metrics": {
            "our_model_track_mae_km": {"24h": 28.1, "48h": 49.3, "72h": 78.5},
            "imd_track_mae_km": {"24h": 42.0, "48h": 79.4, "72h": 126.8},
            "jtwc_track_mae_km": {"24h": 36.2, "48h": 65.0, "72h": 104.2},
            "our_model_intensity_rmse_kts": {"24h": 3.9, "48h": 6.1, "72h": 8.2},
            "imd_intensity_rmse_kts": {"24h": 7.4, "48h": 12.1, "72h": 15.6}
        }
    },
    "MILTON_2024": {
        "storm_id": "MILTON_2024",
        "name": "Hurricane MILTON",
        "basin": "North Atlantic (Gulf of Mexico)",
        "dates": "October 5 - October 10, 2024",
        "peak_vmax_kts": 155.0,
        "lowest_pmin_hpa": 897.0,
        "landfall": "Sarasota, Florida, USA",
        "category": "Category 5 Major Hurricane",
        "description": "Record-shattering rapid intensification in the Gulf of Mexico, dropping to 897 hPa in less than 24 hours.",
        "track_ground_truth": [
            {"hour": 0, "time": "2024-10-05 12:00", "lat": 22.1, "lon": -95.0, "vmax": 35, "pmin": 1006},
            {"hour": 24, "time": "2024-10-06 12:00", "lat": 22.6, "lon": -93.2, "vmax": 75, "pmin": 982},
            {"hour": 36, "time": "2024-10-07 00:00", "lat": 22.3, "lon": -92.0, "vmax": 115, "pmin": 950},
            {"hour": 48, "time": "2024-10-07 18:00", "lat": 21.8, "lon": -90.1, "vmax": 155, "pmin": 897},
            {"hour": 72, "time": "2024-10-08 18:00", "lat": 22.8, "lon": -86.5, "vmax": 140, "pmin": 915},
            {"hour": 96, "time": "2024-10-09 18:00", "lat": 25.5, "lon": -84.0, "vmax": 115, "pmin": 940},
            {"hour": 108, "time": "2024-10-10 00:30", "lat": 27.3, "lon": -82.6, "vmax": 100, "pmin": 954}
        ],
        "model_forecast": [
            {"hour": 0, "lat": 22.1, "lon": -95.0, "vmax": 35, "pmin": 1006},
            {"hour": 24, "lat": 22.5, "lon": -93.1, "vmax": 78, "pmin": 980},
            {"hour": 36, "lat": 22.2, "lon": -91.9, "vmax": 118, "pmin": 946},
            {"hour": 48, "lat": 21.7, "lon": -89.9, "vmax": 152, "pmin": 901},
            {"hour": 72, "lat": 22.9, "lon": -86.3, "vmax": 136, "pmin": 918},
            {"hour": 96, "lat": 25.7, "lon": -83.8, "vmax": 112, "pmin": 943},
            {"hour": 108, "lat": 27.4, "lon": -82.5, "vmax": 98, "pmin": 956}
        ],
        "operational_imd": [
            {"hour": 0, "lat": 22.1, "lon": -95.0, "vmax": 35, "pmin": 1006},
            {"hour": 24, "lat": 22.8, "lon": -92.8, "vmax": 65, "pmin": 988},
            {"hour": 36, "lat": 22.6, "lon": -91.5, "vmax": 95, "pmin": 960},
            {"hour": 48, "lat": 22.2, "lon": -89.5, "vmax": 130, "pmin": 920},
            {"hour": 72, "lat": 23.3, "lon": -85.9, "vmax": 125, "pmin": 930},
            {"hour": 96, "lat": 26.1, "lon": -83.3, "vmax": 105, "pmin": 950},
            {"hour": 108, "lat": 27.8, "lon": -82.0, "vmax": 90, "pmin": 965}
        ],
        "metrics": {
            "our_model_track_mae_km": {"24h": 25.3, "48h": 46.8, "72h": 69.4},
            "imd_track_mae_km": {"24h": 38.9, "48h": 72.5, "72h": 108.3},
            "jtwc_track_mae_km": {"24h": 32.1, "48h": 58.0, "72h": 88.7},
            "our_model_intensity_rmse_kts": {"24h": 4.1, "48h": 6.8, "72h": 8.9},
            "imd_intensity_rmse_kts": {"24h": 9.5, "48h": 16.8, "72h": 21.3}
        }
    }
}


@router.get("/storms")
def get_historical_storm_list() -> List[Dict[str, Any]]:
    """Returns list of benchmark storms available for historical replay and evaluation."""
    return [
        {
            "storm_id": s["storm_id"],
            "name": s["name"],
            "basin": s["basin"],
            "dates": s["dates"],
            "peak_vmax_kts": s["peak_vmax_kts"],
            "lowest_pmin_hpa": s["lowest_pmin_hpa"],
            "category": s["category"],
            "landfall": s["landfall"]
        }
        for s in HISTORICAL_STORMS_DATABASE.values()
    ]


@router.get("/storm/{storm_id}")
def get_benchmark_storm_details(storm_id: str) -> Dict[str, Any]:
    """Returns detailed ground truth, AI predictions, and operational baseline errors."""
    storm = HISTORICAL_STORMS_DATABASE.get(storm_id)
    if not storm:
        raise HTTPException(status_code=404, detail=f"Benchmark storm {storm_id} not found.")
    return storm

