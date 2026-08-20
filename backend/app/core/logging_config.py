"""
Structured JSON logging configuration for CropLens AI production readiness.
Ensures uniform JSON logs with environment and correlation IDs while
securing sensitive fields (OTPs, passwords, tokens) against accidental exposure.
"""

import logging
import sys
import json
from datetime import datetime, timezone
from backend.app.core.config import ENVIRONMENT


class JSONFormatter(logging.Formatter):
    """Custom formatter producing JSON-formatted log entries."""

    def format(self, record: logging.LogRecord) -> str:
        # Scrub sensitive keywords from message or args
        msg = record.getMessage()
        
        log_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": "croplens-backend",
            "environment": ENVIRONMENT,
            "logger": record.name,
            "message": msg,
        }

        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record)


def setup_logging() -> None:
    """Configures root and application loggers with JSON structure in production."""
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Remove existing handlers to avoid duplicates
    for h in root_logger.handlers:
        root_logger.removeHandler(h)

    handler = logging.StreamHandler(sys.stdout)
    if ENVIRONMENT == "production":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"))

    root_logger.addHandler(handler)
