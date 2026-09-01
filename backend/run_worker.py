"""
Standalone Runner for Continuous Ingestion Worker.
"""

import sys
import asyncio
import logging
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from worker.ingestion_stream import ingestion_worker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("worker_runner")


async def main():
    logger.info("Starting Tropical Cyclone Ingestion Worker daemon...")
    try:
        await ingestion_worker.run_loop()
    except KeyboardInterrupt:
        logger.info("Worker interrupted by user. Shutting down...")
        ingestion_worker.stop()


if __name__ == "__main__":
    asyncio.run(main())

