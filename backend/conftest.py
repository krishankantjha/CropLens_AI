"""Pytest configuration for the backend module.

The integration suite must exercise the same Alembic migration path used by
application startup, but it must never connect to a developer or production
database.  The environment is configured before test modules import the app's
 database engine.
"""

import os
import sys
import tempfile

# Insert the parent directory (project root) into sys.path so
# ``backend.app...`` imports work from both the repository root and backend/.
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BACKEND_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Always isolate integration tests from any developer-provided database URL.
# The application lifespan will create and migrate this database through
# Alembic when TestClient enters its context.
TEST_DB_PATH = os.path.join(
    tempfile.gettempdir(),
    f"croplens_pytest_{os.getpid()}.sqlite3",
)
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("SMS_PROVIDER", "local")
