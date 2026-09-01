"""
Continuous Ingestion Stream Watcher & Event-Driven Processor.
Maintains SQLite idempotency logs, polls active cyclone feeds, runs standardized
cropping, executes AI inference, and pushes real-time events to connected WebSocket clients.
"""

import os
import json
import time
import asyncio
import sqlite3
import datetime
import logging
from typing import Dict, Any, List, Optional, Callable

from .data_fetcher import data_fetcher
from core.inference_engine import inference_engine
from config import settings

logger = logging.getLogger(__name__)


class IngestionWorker:
    """
    Continuous Ingestion Watcher with SQLite Deduplication and Pub/Sub Event Dispatcher.
    """
    def __init__(self):
        self.db_path = settings.DB_PATH
        self.is_running = False
        self.poll_interval = settings.INGESTION_POLL_INTERVAL_SECONDS
        self._event_listeners: List[Callable[[str, Dict[str, Any]], Any]] = []
        self._latest_inference_cache: Dict[str, Dict[str, Any]] = {}
        self._init_db()

    def _init_db(self):
        """Initializes SQLite schema for idempotency checkpointing and audit logs."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 1. Idempotent Processed Files Checkpoint
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS processed_files (
                file_hash TEXT PRIMARY KEY,
                granule_id TEXT NOT NULL,
                storm_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                status TEXT NOT NULL,
                processing_time_ms REAL,
                created_at TEXT NOT NULL
            )
        """)

        # 2. Historical Inference Archive
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inference_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                storm_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                vmax_kts REAL,
                pmin_hpa REAL,
                category TEXT,
                pattern TEXT,
                genesis_score REAL,
                physical_confidence REAL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        # 3. Live Audit Feed Logs
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                details_json TEXT
            )
        """)

        conn.commit()
        conn.close()
        logger.info(f"Initialized SQLite database at {self.db_path}")

    def add_event_listener(self, listener: Callable[[str, Dict[str, Any]], Any]):
        """Registers a callback for event broadcasting (e.g. WebSocket hub)."""
        self._event_listeners.append(listener)

    async def _emit_event(self, event_type: str, data: Dict[str, Any]):
        """Dispatches an event asynchronously to all registered listeners."""
        for listener in self._event_listeners:
            try:
                res = listener(event_type, data)
                if asyncio.iscoroutine(res):
                    await res
            except Exception as e:
                logger.error(f"Error in event listener for {event_type}: {e}")

    def is_file_processed(self, file_hash: str) -> bool:
        """Checks if a satellite granule hash has already been processed."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM processed_files WHERE file_hash = ?", (file_hash,))
        result = cursor.fetchone()
        conn.close()
        return result is not None

    def record_processed_file(
        self,
        file_hash: str,
        granule_id: str,
        storm_id: str,
        timestamp: str,
        status: str,
        processing_time_ms: float
    ):
        """Records a completed granule in the idempotency log."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO processed_files
            (file_hash, granule_id, storm_id, timestamp, status, processing_time_ms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            file_hash,
            granule_id,
            storm_id,
            timestamp,
            status,
            processing_time_ms,
            datetime.datetime.utcnow().isoformat() + "Z"
        ))
        conn.commit()
        conn.close()

    def record_audit_log(self, event_type: str, message: str, level: str = "INFO", details: Optional[Dict[str, Any]] = None):
        """Records an entry in the live audit log table."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO audit_logs (timestamp, event_type, level, message, details_json)
            VALUES (?, ?, ?, ?, ?)
        """, (
            datetime.datetime.utcnow().isoformat() + "Z",
            event_type,
            level,
            message,
            json.dumps(details or {})
        ))
        conn.commit()
        conn.close()

    def get_recent_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent audit log events for the UI."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, timestamp, event_type, level, message, details_json
            FROM audit_logs
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        logs = []
        for r in rows:
            logs.append({
                "id": r["id"],
                "timestamp": r["timestamp"],
                "event_type": r["event_type"],
                "level": r["level"],
                "message": r["message"],
                "details": json.loads(r["details_json"]) if r["details_json"] else {}
            })
        conn.close()
        return logs

    def get_latest_inference(self, storm_id: str) -> Optional[Dict[str, Any]]:
        """Gets the most up-to-date inference payload for a storm."""
        return self._latest_inference_cache.get(storm_id)

    async def process_granule(self, granule_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Processes a single satellite granule through the full pipeline:
        Deduplication -> Normalization -> Inference -> Physics Check -> Storage -> WebSocket Broadcast.
        """
        start_t = time.perf_counter()
        file_hash = granule_data["file_hash"]
        granule_id = granule_data["granule_id"]
        storm_id = granule_data["storm_id"]

        # Step 1: Idempotency check
        if self.is_file_processed(file_hash):
            logger.debug(f"Idempotency Check: Granule {granule_id} ({file_hash[:12]}...) already processed. Skipping.")
            return None

        # Emit Ingestion Pass Event
        await self._emit_event("NEW_SATELLITE_PASS", {
            "storm_id": storm_id,
            "granule_id": granule_id,
            "file_hash": file_hash,
            "timestamp": granule_data["timestamp"],
            "center": {
                "lat": granule_data["center_lat"],
                "lon": granule_data["center_lon"]
            }
        })

        self.record_audit_log(
            event_type="NEW_SATELLITE_PASS",
            message=f"Ingested multi-spectral granule for {granule_data['storm_name']} ({granule_id})",
            level="INFO",
            details={"granule_id": granule_id, "file_hash": file_hash[:16]}
        )

        # Step 2: Run AI Model Inference with Physics Verification
        inference_result = inference_engine.run_inference(
            storm_id=storm_id,
            storm_name=granule_data["storm_name"],
            basin=granule_data["basin"],
            current_lat=granule_data["center_lat"],
            current_lon=granule_data["center_lon"],
            satellite_tensor_np=granule_data["satellite_tensor"],
            env_vector_np=granule_data["env_vector"],
            current_vmax_kts=granule_data["current_vmax"],
            current_pmin_hpa=granule_data["current_pmin"],
            timestamp_iso=granule_data["timestamp"]
        )

        # Attach image previews & track history
        inference_result["previews"] = granule_data.get("previews", {})
        inference_result["history"] = granule_data.get("history", [])

        # Step 3: Cache and Persist
        self._latest_inference_cache[storm_id] = inference_result
        total_time_ms = round((time.perf_counter() - start_t) * 1000.0, 2)
        
        self.record_processed_file(
            file_hash=file_hash,
            granule_id=granule_id,
            storm_id=storm_id,
            timestamp=granule_data["timestamp"],
            status="SUCCESS",
            processing_time_ms=total_time_ms
        )

        # Save into SQLite history
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO inference_history
            (storm_id, timestamp, vmax_kts, pmin_hpa, category, pattern, genesis_score, physical_confidence, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            storm_id,
            granule_data["timestamp"],
            inference_result["current_intensity"]["vmax_kts"],
            inference_result["current_intensity"]["pmin_hpa"],
            inference_result["current_intensity"]["category"],
            inference_result["pattern_classification"]["predicted_pattern"],
            inference_result["current_intensity"]["genesis_score"],
            inference_result["physics_guardrail"]["physical_confidence_score"],
            json.dumps(inference_result),
            datetime.datetime.utcnow().isoformat() + "Z"
        ))
        conn.commit()
        conn.close()

        # Step 4: Emit WebSocket Events
        await self._emit_event("INFERENCE_COMPLETE", inference_result)

        self.record_audit_log(
            event_type="INFERENCE_COMPLETE",
            message=f"Inference complete for {granule_data['storm_name']}: {inference_result['current_intensity']['category']} ({inference_result['current_intensity']['vmax_kts']} kts) in {total_time_ms}ms",
            level="SUCCESS",
            details={
                "turnaround_ms": total_time_ms,
                "category": inference_result["current_intensity"]["category"],
                "vmax": inference_result["current_intensity"]["vmax_kts"]
            }
        )

        # Intensification Alert if applicable
        if inference_result.get("is_rapid_intensification_alert", False):
            await self._emit_event("STORM_INTENSIFICATION_ALERT", {
                "storm_id": storm_id,
                "storm_name": granule_data["storm_name"],
                "alert_level": "WARNING",
                "message": f"Rapid Intensification detected for {granule_data['storm_name']}. Predicted wind increase >= 30 kts over 24h.",
                "timestamp": granule_data["timestamp"]
            })
            self.record_audit_log(
                event_type="STORM_INTENSIFICATION_ALERT",
                message=f"RAPID INTENSIFICATION ALERT triggered for {granule_data['storm_name']}",
                level="WARNING",
                details={"storm_id": storm_id}
            )

        return inference_result

    async def run_loop(self):
        """Continuous ingestion watcher polling loop."""
        self.is_running = True
        logger.info("Continuous Ingestion Worker loop started.")
        self.record_audit_log("WORKER_START", "Continuous Ingestion Worker daemon initialized.", level="INFO")

        # Initial warm-up pass for all active storms
        for storm_id in data_fetcher.active_simulated_storms.keys():
            try:
                granule = data_fetcher.generate_next_granule(storm_id)
                await self.process_granule(granule)
            except Exception as e:
                logger.error(f"Error during warmup pass for {storm_id}: {e}")

        # Continuous round-robin watcher loop
        while self.is_running:
            try:
                for storm_id in list(data_fetcher.active_simulated_storms.keys()):
                    if not self.is_running:
                        break
                    granule = data_fetcher.generate_next_granule(storm_id)
                    await self.process_granule(granule)
                    # Pause between storms
                    await asyncio.sleep(self.poll_interval / max(1, len(data_fetcher.active_simulated_storms)))
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected exception in ingestion loop: {e}")
                await asyncio.sleep(3.0)

        logger.info("Ingestion loop terminated.")

    def stop(self):
        """Stops the ingestion loop."""
        self.is_running = False


# Global Ingestion Worker instance
ingestion_worker = IngestionWorker()

