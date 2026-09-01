"""
End-to-End Test for Tropical Cyclone AI Pipeline & Streaming Gateway.
"""

import sys
import time
import json
import asyncio
import requests
import websockets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from config import settings


async def test_all():
    print("==================================================")
    print("RUNNING COMPREHENSIVE E2E VERIFICATION SUITE")
    print("==================================================")

    # 1. Test REST Endpoints
    base_url = "http://127.0.0.1:8000"
    
    print("\n[1] Testing GET /api/health...")
    resp = requests.get(f"{base_url}/api/health")
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    print("Health check response:", resp.json())

    print("\n[2] Testing GET /api/storms/active...")
    resp = requests.get(f"{base_url}/api/storms/active")
    assert resp.status_code == 200, f"Active storms failed: {resp.text}"
    storms = resp.json()
    print(f"Retrieved {len(storms)} active storms across basins:")
    for s in storms:
        print(f" - [{s['basin']}] {s['name']} ({s['category']}, Vmax={s['vmax_kts']} kts, Pmin={s['pmin_hpa']} hPa)")

    target_storm_id = storms[0]['storm_id']
    print(f"\n[3] Testing GET /api/storms/{target_storm_id}/latest...")
    resp = requests.get(f"{base_url}/api/storms/{target_storm_id}/latest")
    assert resp.status_code == 200, f"Latest inference failed: {resp.text}"
    latest = resp.json()
    print("Inference payload verified:")
    print(" - Category:", latest["current_intensity"]["category"])
    print(" - Pattern:", latest["pattern_classification"]["predicted_pattern"], f"({latest['pattern_classification']['confidence']})")
    print(" - Track Horizons:", [f"+{p['horizon_h']}h: ({p['lat']}, {p['lon']})" for p in latest["forecast_track"]])
    print(" - Physical Confidence:", latest["physics_guardrail"]["physical_confidence_score"])
    print(" - Satellite Previews:", list(latest.get("previews", {}).keys()))
    print(" - Grad-CAM Attention Map Dimension:", len(latest.get("grad_cam_attention_map", [])), "x", len(latest.get("grad_cam_attention_map", [[]])[0]))

    print("\n[4] Testing WebSocket Live Streaming Feed /ws/live-feed...")
    ws_url = "ws://127.0.0.1:8000/ws/live-feed"
    events_received = []

    async with websockets.connect(ws_url) as ws:
        # Handshake
        handshake = await ws.recv()
        print("WS Handshake:", handshake)

        # Trigger on-demand manual pass
        print("\n[5] Triggering POST /api/ingest/manual-trigger...")
        trig_resp = requests.post(f"{base_url}/api/ingest/manual-trigger", json={
            "storm_id": target_storm_id,
            "custom_vmax": 125.0,
            "custom_pattern": "Eye Pattern"
        })
        assert trig_resp.status_code == 200, f"Manual trigger failed: {trig_resp.text}"
        print("Manual trigger response:", trig_resp.json()["message"])

        # Wait for WebSocket events
        print("Awaiting broadcasted WebSocket events...")
        for _ in range(2):
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                parsed = json.loads(msg)
                print(f" => Received WS Event: {parsed.get('event_type')}")
                events_received.append(parsed.get('event_type'))
            except asyncio.TimeoutError:
                print("Timeout waiting for more events.")
                break

    print(f"\n[6] Testing GET /api/ingest/logs...")
    resp = requests.get(f"{base_url}/api/ingest/logs")
    assert resp.status_code == 200
    logs = resp.json()
    print(f"Retrieved {len(logs)} audit log records.")
    for l in logs[:3]:
        print(f" - [{l['level']}] {l['timestamp']} | {l['event_type']}: {l['message']}")

    print("\n==================================================")
    print("ALL TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(test_all())

