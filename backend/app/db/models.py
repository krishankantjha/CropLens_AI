"""
SQLAlchemy User Database Models for CropLens AI.
Stores user profile, credentials, role (farmer vs trader), and saved preferences.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Index

from sqlalchemy.orm import relationship
from backend.app.db.database import Base


def utc_now() -> datetime:
    """Returns current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class User(Base):
    """
    User account model storing authentication details and mandi preferences.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    mobile_number = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=True, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="farmer", nullable=False)  # "farmer" or "trader"
    home_mandi = Column(String, default="Azadpur", nullable=False)
    preferred_commodity = Column(String, default="Tomato", nullable=False)
    language = Column(String, default="en", nullable=False)  # "en", "hi", "mr", "kn", etc.
    created_at = Column(DateTime, default=utc_now, nullable=False)

    subscriptions = relationship("AlertSubscription", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        """Helper method to convert User model instance to JSON dictionary."""
        return {
            "id": self.id,
            "mobile_number": self.mobile_number,
            "full_name": self.full_name,
            "email": self.email,
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
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    mobile_number = Column(String, nullable=False, index=True)
    telegram_chat_id = Column(String, nullable=True)
    channel = Column(String, default="whatsapp", nullable=False)  # "whatsapp", "telegram", "both"
    crop = Column(String, default="Potato", nullable=False)
    mandi = Column(String, default="Agra", nullable=False)
    delivery_time = Column(String, default="07:00 AM", nullable=False)
    language = Column(String, default="hi", nullable=False)
    is_active = Column(Integer, default=1, nullable=False)  # 1 = active, 0 = paused
    created_at = Column(DateTime, default=utc_now, nullable=False)
    last_dispatched_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="subscriptions")
    logs = relationship("AlertLog", back_populates="subscription", cascade="all, delete-orphan")

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
    subscription_id = Column(Integer, ForeignKey("alert_subscriptions.id", ondelete="SET NULL"), nullable=True, index=True)
    recipient = Column(String, nullable=False)
    channel = Column(String, nullable=False)  # "whatsapp", "telegram"
    crop = Column(String, nullable=False)
    mandi = Column(String, nullable=False)
    message_text = Column(String, nullable=False)
    status = Column(String, default="success", nullable=False)
    dispatched_at = Column(DateTime, default=utc_now, nullable=False)

    subscription = relationship("AlertSubscription", back_populates="logs")

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


class MarketData(Base):
    """
    Live market data ingested from Agmarknet.
    """
    __tablename__ = "market_data"

    id = Column(Integer, primary_key=True, index=True)
    commodity = Column(String, nullable=False, index=True)
    market = Column(String, nullable=False, index=True)
    modal_price = Column(Float, nullable=False)
    arrivals_in_qtl = Column(Float, nullable=False)
    date = Column(String, nullable=False, index=True)
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    variety = Column(String, nullable=True)
    grade = Column(String, nullable=True)
    min_price = Column(Float, nullable=True)
    max_price = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    __table_args__ = (
        Index(
            "uq_market_data_commodity_market_date",
            "commodity", "market", "date",
            unique=True,
        ),
    )


class WeatherData(Base):
    """
    Live weather data ingested from NASA POWER.
    """
    __tablename__ = "weather_data"

    id = Column(Integer, primary_key=True, index=True)
    market = Column(String, nullable=False, index=True)
    temp_max = Column(Float, nullable=False)
    temp_min = Column(Float, nullable=False)
    rainfall_mm = Column(Float, nullable=False)
    solar_radiation = Column(Float, nullable=True)
    date = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now)

    __table_args__ = (
        Index("uq_weather_data_market_date", "market", "date", unique=True),
    )
