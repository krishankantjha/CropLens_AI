"""
Persistent NDVI Observation Model.

Stores daily or composite crop greenness index observations retrieved via
Sentinel Hub or Copernicus Data Space Ecosystem.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from backend.app.db.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class NdviData(Base):
    """
    Persistent table for satellite-derived NDVI observations per mandi.
    """
    __tablename__ = "ndvi_data"

    id = Column(Integer, primary_key=True, index=True)
    market = Column(String, nullable=False, index=True)
    ndvi_mean = Column(Float, nullable=False)
    date = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now)

    __table_args__ = (
        Index("uq_ndvi_data_market_date", "market", "date", unique=True),
    )
