import logging
import json
import sys
import os
from datetime import datetime, timezone


class StructuredFormatter(logging.Formatter):
    """Outputs JSON-structured log lines with consistent fields for searchability."""

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "severity": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
        }
        for key in ("callerPhone", "userId", "requestId", "callSid", "action", "duration"):
            val = getattr(record, key, None)
            if val is not None:
                entry[key] = val
        if record.exc_info and record.exc_info[0]:
            entry["error"] = self.formatException(record.exc_info)
        return json.dumps(entry)


def setup_logging() -> logging.Logger:
    logger = logging.getLogger("voice_bridge")
    logger.setLevel(logging.DEBUG if os.getenv("DEBUG") else logging.INFO)

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(StructuredFormatter())
    logger.addHandler(console)

    if os.getenv("ENABLE_GCL", "").lower() in ("1", "true", "yes"):
        try:
            import google.cloud.logging as gcl

            client = gcl.Client()
            client.setup_logging(log_level=logging.INFO)
            logger.info("Google Cloud Logging attached")
        except Exception:
            logger.info("Google Cloud Logging init failed, continuing without it")
    else:
        logger.info("Google Cloud Logging disabled (set ENABLE_GCL=1 to enable)")

    return logger


log = setup_logging()
