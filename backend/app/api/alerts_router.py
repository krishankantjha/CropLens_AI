from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request, status, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import AlertSubscription, AlertLog
from backend.app.services.whatsapp_service import (
    send_whatsapp_message,
    format_advisory_message,
    generate_whatsapp_deeplink,
    dispatch_scheduled_advisories_service
)
from backend.app.services.telegram_service import (
    send_telegram_message,
    format_telegram_advisory_message,
    get_telegram_bot_status
)

alerts_router = APIRouter(prefix="/alerts", tags=["WhatsApp & Market Alerts"])


class SendWhatsappAdvisoryRequest(BaseModel):
    mobile_number: str = Field(..., json_schema_extra={"example": "9876543210"})
    crop: str = Field(default="Potato", json_schema_extra={"example": "Potato"})
    mandi: str = Field(default="Agra", json_schema_extra={"example": "Agra"})
    decision: str = Field(default="HOLD FOR 5 DAYS", json_schema_extra={"example": "HOLD FOR 5 DAYS"})
    current_price: float = Field(default=1650.0, json_schema_extra={"example": 1650.0})
    target_price: float = Field(default=1780.0, json_schema_extra={"example": 1780.0})
    expected_gain: float = Field(default=130.0, json_schema_extra={"example": 130.0})
    lang: str = Field(default="hi", json_schema_extra={"example": "hi"})


class TestWhatsappRequest(BaseModel):
    mobile_number: str = Field(..., json_schema_extra={"example": "9876543210"})
    crop: str = Field(default="Potato", json_schema_extra={"example": "Potato"})
    mandi: str = Field(default="Agra", json_schema_extra={"example": "Agra"})
    lang: str = Field(default="hi", json_schema_extra={"example": "hi"})


class SubscribeAlertRequest(BaseModel):
    mobile_number: str = Field(..., json_schema_extra={"example": "9876543210"})
    telegram_chat_id: Optional[str] = Field(default=None, json_schema_extra={"example": "123456789"})
    channel: str = Field(default="whatsapp", json_schema_extra={"example": "whatsapp"})  # "whatsapp", "telegram", "both"
    crop: str = Field(default="Potato", json_schema_extra={"example": "Potato"})
    mandi: str = Field(default="Agra", json_schema_extra={"example": "Agra"})
    delivery_time: str = Field(default="07:00 AM", json_schema_extra={"example": "07:00 AM"})
    language: str = Field(default="hi", json_schema_extra={"example": "hi"})


class TestTelegramRequest(BaseModel):
    chat_id: str = Field(..., json_schema_extra={"example": "123456789"})
    crop: str = Field(default="Potato", json_schema_extra={"example": "Potato"})
    mandi: str = Field(default="Agra", json_schema_extra={"example": "Agra"})
    lang: str = Field(default="hi", json_schema_extra={"example": "hi"})


@alerts_router.post("/send-whatsapp", status_code=status.HTTP_200_OK)
def send_whatsapp_advisory_endpoint(req: SendWhatsappAdvisoryRequest) -> Dict[str, Any]:
    """
    Automated Direct WhatsApp Dispatcher Endpoint.
    Formats advisory and returns live dispatch details + 1-click wa.me deep-link URL.
    """
    if not req.mobile_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number is required for WhatsApp dispatches."
        )

    formatted_msg = format_advisory_message(
        crop=req.crop,
        mandi=req.mandi,
        decision=req.decision,
        current_price=req.current_price,
        target_price=req.target_price,
        expected_gain=req.expected_gain,
        lang=req.lang
    )

    result = send_whatsapp_message(req.mobile_number, formatted_msg)
    result["deeplink_url"] = generate_whatsapp_deeplink(req.mobile_number, formatted_msg)
    return result


@alerts_router.post("/test-whatsapp", status_code=status.HTTP_200_OK)
def test_whatsapp_endpoint(req: TestWhatsappRequest) -> Dict[str, Any]:
    """
    Instant Test Trigger Endpoint ([⚡ Send Test WhatsApp Alert Now]).
    Immediately returns formatted test advisory and direct wa.me URL within 2 seconds.
    """
    formatted_msg = format_advisory_message(
        crop=req.crop,
        mandi=req.mandi,
        decision="HOLD FOR 5 DAYS",
        current_price=1650.0,
        target_price=1780.0,
        expected_gain=130.0,
        lang=req.lang
    )

    result = send_whatsapp_message(req.mobile_number, formatted_msg)
    result["test_triggered"] = True
    result["deeplink_url"] = generate_whatsapp_deeplink(req.mobile_number, formatted_msg)
    return result


@alerts_router.post("/subscribe", status_code=status.HTTP_200_OK)
def subscribe_alert_endpoint(req: SubscribeAlertRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Saves or updates a farmer's daily alert subscription for WhatsApp and/or Telegram in SQLite.
    """
    clean_mobile = "".join(filter(str.isdigit, req.mobile_number))[-10:]
    # Check if active subscription already exists for this mobile number
    existing = db.query(AlertSubscription).filter(
        AlertSubscription.mobile_number == clean_mobile,
        AlertSubscription.crop == req.crop,
        AlertSubscription.mandi == req.mandi
    ).first()

    if existing:
        existing.telegram_chat_id = req.telegram_chat_id or existing.telegram_chat_id
        existing.channel = req.channel
        existing.delivery_time = req.delivery_time
        existing.language = req.language
        existing.is_active = 1
        db.commit()
        return {
            "status": "success",
            "subscription_id": existing.id,
            "action": "updated",
            "subscription": existing.to_dict(),
            "message": f"Updated {req.channel.capitalize()} advisory subscription for {req.crop} ({req.mandi}) at {req.delivery_time}."
        }

    new_sub = AlertSubscription(
        mobile_number=clean_mobile,
        telegram_chat_id=req.telegram_chat_id,
        channel=req.channel,
        crop=req.crop,
        mandi=req.mandi,
        delivery_time=req.delivery_time,
        language=req.language,
        is_active=1
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    return {
        "status": "success",
        "subscription_id": new_sub.id,
        "action": "created",
        "subscription": new_sub.to_dict(),
        "message": f"Daily {req.channel.capitalize()} advisory activated for {req.crop} ({req.mandi}) at {req.delivery_time}."
    }


@alerts_router.get("/subscriptions", status_code=status.HTTP_200_OK)
def list_subscriptions_endpoint(mobile_number: Optional[str] = None, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Lists registered active alert subscriptions for a specific verified mobile number."""
    if not mobile_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number query parameter is required to view alert subscriptions."
        )
    clean_mobile = "".join(filter(str.isdigit, mobile_number))[-10:]
    subs = db.query(AlertSubscription).filter(
        AlertSubscription.mobile_number == clean_mobile
    ).order_by(AlertSubscription.created_at.desc()).all()
    return {
        "status": "success",
        "total_count": len(subs),
        "subscriptions": [s.to_dict() for s in subs]
    }


@alerts_router.delete("/subscriptions/{subscription_id}", status_code=status.HTTP_200_OK)
def delete_subscription_endpoint(
    subscription_id: int,
    mobile_number: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Deactivates/deletes an alert subscription with optional ownership verification."""
    query = db.query(AlertSubscription).filter(AlertSubscription.id == subscription_id)
    if mobile_number:
        clean_mobile = "".join(filter(str.isdigit, mobile_number))[-10:]
        query = query.filter(AlertSubscription.mobile_number == clean_mobile)
    sub = query.first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found or access denied")
    db.delete(sub)
    db.commit()
    return {"status": "success", "message": f"Subscription {subscription_id} removed successfully"}


@alerts_router.post("/telegram/test", status_code=status.HTTP_200_OK)
def test_telegram_endpoint(req: TestTelegramRequest) -> Dict[str, Any]:
    """
    Pushes an instant test alert to farmer's Telegram Chat ID with zero cost.
    """
    msg = format_telegram_advisory_message(
        crop=req.crop,
        mandi=req.mandi,
        decision="HOLD FOR 5 DAYS",
        current_price=1650.0,
        target_price=1780.0,
        expected_gain=130.0,
        lang=req.lang
    )
    result = send_telegram_message(req.chat_id, msg)
    return result


@alerts_router.get("/telegram/status", status_code=status.HTTP_200_OK)
def telegram_status_endpoint() -> Dict[str, Any]:
    """Returns Telegram alert bot status."""
    return get_telegram_bot_status()


@alerts_router.post("/dispatch-now", status_code=status.HTTP_200_OK)
def dispatch_now_endpoint(request: Request) -> Dict[str, Any]:
    """
    On-demand manual trigger to execute morning market alert dispatches across all active subscriptions.
    """
    return dispatch_scheduled_advisories_service(request.app)


@alerts_router.get("/logs", status_code=status.HTTP_200_OK)
def get_alert_logs_endpoint(limit: int = 50, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Returns recent alert dispatch history logs."""
    logs = db.query(AlertLog).order_by(AlertLog.dispatched_at.desc()).limit(limit).all()
    return {
        "status": "success",
        "total_logs": len(logs),
        "logs": [l.to_dict() for l in logs]
    }
