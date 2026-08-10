"""
SQLAlchemy User Database Models for CropLens AI.
Stores user profile, credentials, role (farmer vs trader), and saved preferences.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from backend.app.db.database import Base


class User(Base):
    """
    User account model storing authentication details and mandi preferences.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    mobile_number = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="farmer", nullable=False)  # "farmer" or "trader"
    home_mandi = Column(String, default="Azadpur", nullable=False)
    preferred_commodity = Column(String, default="Tomato", nullable=False)
    language = Column(String, default="en", nullable=False)  # "en", "hi", "mr", "kn", etc.
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        """Helper method to convert User model instance to JSON dictionary."""
        return {
            "id": self.id,
            "mobile_number": self.mobile_number,
            "full_name": self.full_name,
            "role": self.role,
            "home_mandi": self.home_mandi,
            "preferred_commodity": self.preferred_commodity,
            "language": self.language,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
