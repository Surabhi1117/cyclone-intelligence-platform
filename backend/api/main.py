"""
Main FastAPI Application Entrypoint.
Sets up CORS, lifespan background worker daemon, REST routers, and WebSocket live feed.
"""

import sys
import asyncio
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import settings
from api.websocket import ws_manager, handle_worker_event
from api.routes.storms import router as storms_router
from api.routes.ingest import router as ingest_router
from api.routes.benchmark import router as benchmark_router
from api.routes.bulletin import router as bulletin_router
from worker.ingestion_stream import ingestion_worker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("cyclone_ai_gateway")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager to launch and teardown the continuous ingestion worker daemon."""
    logger.info("Initializing Tropical Cyclone AI Gateway...")
    # Register WebSocket broadcast listener on worker events
    ingestion_worker.add_event_listener(handle_worker_event)
    
    # Launch continuous ingestion background task
    worker_task = asyncio.create_task(ingestion_worker.run_loop())
    logger.info("Background Ingestion Worker task started.")

    yield

    logger.info("Shutting down Ingestion Worker...")
    ingestion_worker.stop()
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    logger.info("Ingestion Worker cleanly stopped.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Real-Time Multi-Source Tropical Cyclone AI Pipeline & Dynamic Streaming Gateway",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST Routers
app.include_router(storms_router, prefix=settings.API_PREFIX)
app.include_router(ingest_router, prefix=settings.API_PREFIX)
app.include_router(benchmark_router, prefix=settings.API_PREFIX)
app.include_router(bulletin_router, prefix=settings.API_PREFIX)


@app.get("/")
def root_status():
    return {
        "system": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "OPERATIONAL",
        "api_docs": "/docs",
        "websocket_endpoint": "/ws/live-feed",
        "active_basins": settings.SUPPORTED_BASINS
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "worker_running": ingestion_worker.is_running,
        "poll_interval_sec": ingestion_worker.poll_interval,
        "active_ws_connections": len(ws_manager.active_connections)
    }


@app.websocket("/ws/live-feed")
async def websocket_live_feed(websocket: WebSocket):
    """
    Live streaming WebSocket endpoint. Pushes real-time satellite pass detections,
    completed inferences, and storm intensification alerts directly to UI clients.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive receive loop (handles incoming ping/commands from client)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket client loop exception: {e}")
        ws_manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

