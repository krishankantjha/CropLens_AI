from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request, status, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import AlertSubscription, AlertLog, User
from backend.app.api.auth_router import get_current_user, verify_csrf
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
from backend.app.schemas import MultiDayForecastRequest
from backend.app.services.api_service import predict_7day_forecast_service

def _get_dynamic_advisory_values(
    request: Request,
    crop: str,
    mandi: str,
    lang: str,
) -> Dict[str, Any]:
    """Generate advisory values from the loaded forecast service without fallbacks."""
    app_state = request.app.state
    if not getattr(app_state, "models_loaded", False) or not getattr(app_state, "dataset_loaded", False):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Forecast data is currently unavailable for this crop and mandi.",
        )

    try:
        forecast_request = MultiDayForecastRequest(
            commodity=crop,
            market=mandi,
            horizon_days=7,
        )
        forecast = predict_7day_forecast_service(
            forecast_request,
            app_state.models,
            app_state.metadata,
            app_state.dataset,
        )
        peak_day = forecast.peak_day
        current_price = forecast.current_price
        target_price = peak_day.price if peak_day else None
        expected_gain = forecast.expected_gain
        decision = forecast.decision_hi if lang == "hi" else forecast.decision
        if any(value is None for value in (current_price, target_price, expected_gain, decision)):
            raise ValueError("Forecast response is incomplete")
        return {
            "decision": decision,
            "current_price": current_price,
            "target_price": target_price,
            "expected_gain": expected_gain,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="A dynamic advisory could not be generated because forecast data is unavailable for this crop and mandi.",
        ) from exc


alerts_router = APIRouter(
    prefix="/alerts",
    tags=["WhatsApp & Market Alerts"],
    dependencies=[Depends(get_current_user)],
)


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
def send_whatsapp_advisory_endpoint(
    req: SendWhatsappAdvisoryRequest,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Automated Direct WhatsApp Dispatcher Endpoint.
    Formats advisory and returns live dispatch details + 1-click wa.me deep-link URL.
    """
    requested_mobile = "".join(filter(str.isdigit, req.mobile_number))[-10:]
    if requested_mobile != current_user.mobile_number:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only send alerts to your verified mobile number.")
    if not requested_mobile:
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
def test_whatsapp_endpoint(
    req: TestWhatsappRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Forecast-backed test trigger endpoint for WhatsApp delivery.
    Generates the advisory from the selected crop and mandi before returning the direct wa.me URL.
    """
    requested_mobile = "".join(filter(str.isdigit, req.mobile_number))[-10:]
    if requested_mobile != current_user.mobile_number:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only send alerts to your verified mobile number.")

    advisory = _get_dynamic_advisory_values(request, req.crop, req.mandi, req.lang)
    formatted_msg = format_advisory_message(
        crop=req.crop,
        mandi=req.mandi,
        decision=advisory["decision"],
        current_price=advisory["current_price"],
        target_price=advisory["target_price"],
        expected_gain=advisory["expected_gain"],
        lang=req.lang
    )

    result = send_whatsapp_message(req.mobile_number, formatted_msg)
    result["test_triggered"] = True
    result["deeplink_url"] = generate_whatsapp_deeplink(req.mobile_number, formatted_msg)
    return result


@alerts_router.post("/subscribe", status_code=status.HTTP_200_OK)
def subscribe_alert_endpoint(
    req: SubscribeAlertRequest,
    current_user: User = Depends(get_current_user),
    _: None = Depends(verify_csrf),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Saves or updates a farmer's daily alert subscription for WhatsApp and/or Telegram in SQLite.
    """
    clean_mobile = "".join(filter(str.isdigit, req.mobile_number))[-10:]
    if clean_mobile != current_user.mobile_number:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only manage subscriptions for your verified mobile number.")
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
def list_subscriptions_endpoint(
    mobile_number: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Lists registered active alert subscriptions for a specific verified mobile number."""
    if not mobile_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number query parameter is required to view alert subscriptions."
        )
    clean_mobile = "".join(filter(str.isdigit, mobile_number))[-10:]
    if clean_mobile != current_user.mobile_number:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only view subscriptions for your verified mobile number.")
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
    current_user: User = Depends(get_current_user),
    _: None = Depends(verify_csrf),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Deactivates/deletes an alert subscription with optional ownership verification."""
    query = db.query(AlertSubscription).filter(
        AlertSubscription.id == subscription_id,
        AlertSubscription.mobile_number == current_user.mobile_number,
    )
    if mobile_number:
        clean_mobile = "".join(filter(str.isdigit, mobile_number))[-10:]
        if clean_mobile != current_user.mobile_number:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only manage subscriptions for your verified mobile number.")
    sub = query.first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found or access denied")
    db.delete(sub)
    db.commit()
    return {"status": "success", "message": f"Subscription {subscription_id} removed successfully"}


@alerts_router.post("/telegram/test", status_code=status.HTTP_200_OK)
def test_telegram_endpoint(
    req: TestTelegramRequest,
    request: Request,
) -> Dict[str, Any]:
    """
    Pushes an instant test alert to farmer's Telegram Chat ID with zero cost.
    """
    advisory = _get_dynamic_advisory_values(request, req.crop, req.mandi, req.lang)
    msg = format_telegram_advisory_message(
        crop=req.crop,
        mandi=req.mandi,
        decision=advisory["decision"],
        current_price=advisory["current_price"],
        target_price=advisory["target_price"],
        expected_gain=advisory["expected_gain"],
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
def get_alert_logs_endpoint(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Returns recent alert dispatch history logs."""
    logs = db.query(AlertLog).order_by(AlertLog.dispatched_at.desc()).limit(limit).all()
    return {
        "status": "success",
        "total_logs": len(logs),
        "logs": [l.to_dict() for l in logs]
    }
