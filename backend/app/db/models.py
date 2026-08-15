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


class AlertSubscription(Base):
    """
    Alert Subscription model storing daily advisory preferences for WhatsApp and Telegram.
    """
    __tablename__ = "alert_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    mobile_number = Column(String, nullable=False, index=True)
    telegram_chat_id = Column(String, nullable=True)
    channel = Column(String, default="whatsapp", nullable=False)  # "whatsapp", "telegram", "both"
    crop = Column(String, default="Potato", nullable=False)
    mandi = Column(String, default="Agra", nullable=False)
    delivery_time = Column(String, default="07:00 AM", nullable=False)
    language = Column(String, default="hi", nullable=False)
    is_active = Column(Integer, default=1, nullable=False)  # 1 = active, 0 = paused
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_dispatched_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "mobile_number": self.mobile_number,
            "telegram_chat_id": self.telegram_chat_id,
            "channel": self.channel,
            "crop": self.crop,
            "mandi": self.mandi,
            "delivery_time": self.delivery_time,
            "language": self.language,
            "is_active": bool(self.is_active),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_dispatched_at": self.last_dispatched_at.isoformat() if self.last_dispatched_at else None,
        }


class AlertLog(Base):
    """
    Historical log of alert dispatches.
    """
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, nullable=True)
    recipient = Column(String, nullable=False)
    channel = Column(String, nullable=False)  # "whatsapp", "telegram"
    crop = Column(String, nullable=False)
    mandi = Column(String, nullable=False)
    message_text = Column(String, nullable=False)
    status = Column(String, default="success", nullable=False)
    dispatched_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "subscription_id": self.subscription_id,
            "recipient": self.recipient,
            "channel": self.channel,
            "crop": self.crop,
            "mandi": self.mandi,
            "message_text": self.message_text,
            "status": self.status,
            "dispatched_at": self.dispatched_at.isoformat() if self.dispatched_at else None,
        }
