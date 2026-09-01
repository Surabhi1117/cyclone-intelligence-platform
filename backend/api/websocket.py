"""
WebSocket Connection Manager and Live Streaming Hub.
Broadcasts real-time events (NEW_SATELLITE_PASS, INFERENCE_COMPLETE, STORM_INTENSIFICATION_ALERT)
to connected frontend clients.
"""

import json
import asyncio
import logging
from typing import List, Dict, Any, Set
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages active WebSocket connections, heartbeats, and pub/sub message broadcasting.
    """
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")
        
        # Send initial handshake welcome
        await websocket.send_json({
            "event_type": "CONNECTED",
            "message": "Connected to Tropical Cyclone AI Live Feed Gateway",
            "active_clients": len(self.active_connections)
        })

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Broadcasts a structured event payload to all connected clients."""
        if not self.active_connections:
            return

        payload = {
            "event_type": event_type,
            "data": data
        }
        
        dead_connections = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(payload)
            except Exception as e:
                logger.warning(f"Failed to send to client: {e}. Marking for removal.")
                dead_connections.add(connection)

        for dead in dead_connections:
            self.disconnect(dead)


ws_manager = ConnectionManager()


async def handle_worker_event(event_type: str, data: Dict[str, Any]):
    """Bridge function that passes ingestion worker events directly to the WebSocket manager."""
    await ws_manager.broadcast(event_type, data)

