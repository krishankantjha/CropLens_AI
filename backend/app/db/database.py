"""
SQLite Database Connection and Session Engine for CropLens AI.
Provides SQLAlchemy SessionLocal dependency for FastAPI route endpoints.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Set SQLite database path inside backend/app/croplens.db
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATABASE_PATH = os.path.join(BASE_DIR, "croplens.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Create SQLite engine with check_same_thread=False for FastAPI concurrency
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI Dependency for database session injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
