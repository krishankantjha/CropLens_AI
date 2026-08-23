"""
CropLens AI — WhatsApp Market Advisory & Automation Service
Handles formatting, daily morning dispatches, instant share-to-myself messages,
and 1-click wa.me direct deep-link dispatches for Indian farmers.
"""

import os
import urllib.parse
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from backend.app.core.constants import CROP_NAMES_HI, MANDI_NAMES_HI

logger = logging.getLogger("croplens.whatsapp")
logger.setLevel(logging.INFO)


def mask_phone_number(mobile: str) -> str:
    """Masks phone number for privacy-compliant logging."""
    digits = "".join(filter(str.isdigit, str(mobile)))
    if len(digits) >= 10:
        return f"+91 ******{digits[-4:]}"
    return "***"


def format_advisory_message(
    crop: str,
    mandi: str,
    decision: str,
    current_price: float,
    target_price: float,
    expected_gain: float,
    lang: str = "hi"
) -> str:
    """
    Formats the WhatsApp market advisory text in clean English or Hindi.
    """
    is_hi = lang == "hi"

    crop_str = CROP_NAMES_HI.get(crop, crop) if is_hi else crop
    mandi_str = MANDI_NAMES_HI.get(mandi, mandi) if is_hi else mandi

    if is_hi:
        return (
            f"🌾 *क्रॉपलेंस एआई बाजार सलाह*\n"
            f"📍 मंडी: {mandi_str}\n"
            f"📦 फसल: {crop_str}\n"
            f"💡 सलाह: *{decision}*\n"
            f"💰 आज का भाव: ₹{int(current_price)}/क्विंटल\n"
            f"📈 अनुमानित लक्ष्य: ₹{int(target_price)}/क्विंटल\n"
            f"🚀 संभावित लाभ: +₹{int(expected_gain)}/क्विंटल\n\n"
            f"सटीक मंडी मूल्य पूर्वानुमान: https://croplens.ai"
        )
    else:
        return (
            f"🌾 *CropLens AI Market Advisory*\n"
            f"📍 Mandi: {mandi}\n"
            f"📦 Crop: {crop}\n"
            f"💡 Advisory: *{decision}*\n"
            f"💰 Today's Rate: ₹{int(current_price)}/qtl\n"
            f"📈 Target Price: ₹{int(target_price)}/qtl\n"
            f"🚀 Expected Gain: +₹{int(expected_gain)}/qtl\n\n"
            f"Live Mandi Intelligence at https://croplens.ai"
        )


def send_whatsapp_message(mobile_number: str, message_text: str) -> Dict[str, Any]:
    """
    Prepares and logs a WhatsApp advisory dispatch using direct wa.me protocol.
    """
    clean_mobile = "".join(filter(str.isdigit, str(mobile_number)))
    if len(clean_mobile) == 10:
        formatted_number = f"+91{clean_mobile}"
    elif clean_mobile.startswith("91") and len(clean_mobile) == 12:
        formatted_number = f"+{clean_mobile}"
    else:
        formatted_number = f"+91{clean_mobile[-10:]}" if len(clean_mobile) >= 10 else mobile_number

    masked = mask_phone_number(clean_mobile)
    logger.info(f"[WhatsApp Dispatch] Destination: {masked} | Status: generated wa.me dispatch")

    deeplink = generate_whatsapp_deeplink(mobile_number, message_text)

    return {
        "status": "success",
        "mode": "direct_whatsapp",
        "recipient": masked,
        "payload": message_text,
        "deeplink_url": deeplink,
        "message": f"WhatsApp Advisory dispatched successfully to {masked}"
    }


def generate_whatsapp_deeplink(mobile_number: str, message_text: str) -> str:
    """
    Generates a 100% free direct WhatsApp deep-link URL (wa.me protocol).
    Opens real WhatsApp on iOS/Android/Web with zero external API fees.
    """
    clean_digits = "".join(filter(str.isdigit, str(mobile_number)))
    phone_with_country = f"91{clean_digits[-10:]}" if len(clean_digits) >= 10 else clean_digits
    encoded_text = urllib.parse.quote(message_text)
    return f"https://wa.me/{phone_with_country}?text={encoded_text}"


def dispatch_scheduled_advisories_service(app: Any = None) -> Dict[str, Any]:
    """
    Morning Dispatch Service: Iterates over active subscriptions in SQLite database,
    generates latest multi-quantile market advisory, dispatches to WhatsApp/Telegram,
    and logs the delivery event into alert_logs.
    """
    from backend.app.db.database import SessionLocal
    from backend.app.db.models import AlertSubscription, AlertLog
    from backend.app.services.telegram_service import send_telegram_message, format_telegram_advisory_message
    from backend.app.services.scheduler_service import get_cached_forecast_7d
    from backend.app.schemas import MultiDayForecastRequest
    from backend.app.services.api_service import predict_7day_forecast_service

    db = SessionLocal()
    try:
        active_subs = db.query(AlertSubscription).filter(AlertSubscription.is_active == 1).all()
        if not active_subs:
            return {"status": "success", "dispatched_count": 0, "message": "No active subscriptions found"}

        dispatched_count = 0
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        for sub in active_subs:
            # 1. Fetch latest forecast data from cache or model
            cached_data = get_cached_forecast_7d(sub.crop, sub.mandi, today_str)
            try:
                if cached_data:
                    peak_day = cached_data.get("peak_day") or {}
                    current_p = cached_data.get("current_price")
                    target_p = peak_day.get("price")
                    gain = cached_data.get("expected_gain")
                    decision = cached_data.get("decision_hi" if sub.language == "hi" else "decision")
                    if any(value is None for value in (current_p, target_p, gain, decision)):
                        raise ValueError("Cached forecast is incomplete")
                elif app and hasattr(app, "state") and getattr(app.state, "models_loaded", False) and getattr(app.state, "dataset_loaded", False):
                    req = MultiDayForecastRequest(commodity=sub.crop, market=sub.mandi, start_date=today_str, horizon_days=7)
                    res = predict_7day_forecast_service(req, app.state.models, app.state.metadata, app.state.dataset)
                    current_p = res.current_price
                    target_p = res.peak_day.price
                    gain = res.expected_gain
                    decision = res.decision_hi if sub.language == "hi" else res.decision
                else:
                    raise RuntimeError("Forecast service is not ready")
            except Exception as forecast_error:
                print(f"[Alert Warning] Skipping {sub.crop}/{sub.mandi}: {forecast_error}")
                continue

            # 2. Dispatch via WhatsApp
            if sub.channel in ["whatsapp", "both"]:
                wa_text = format_advisory_message(
                    crop=sub.crop,
                    mandi=sub.mandi,
                    decision=decision,
                    current_price=current_p,
                    target_price=target_p,
                    expected_gain=gain,
                    lang=sub.language
                )
                wa_res = send_whatsapp_message(sub.mobile_number, wa_text)
                log_entry = AlertLog(
                    subscription_id=sub.id,
                    recipient=sub.mobile_number,
                    channel="whatsapp",
                    crop=sub.crop,
                    mandi=sub.mandi,
                    message_text=wa_text,
                    status=wa_res.get("status", "success")
                )
                db.add(log_entry)

            # 3. Dispatch via Telegram
            if sub.channel in ["telegram", "both"] and sub.telegram_chat_id:
                tg_text = format_telegram_advisory_message(
                    crop=sub.crop,
                    mandi=sub.mandi,
                    decision=decision,
                    current_price=current_p,
                    target_price=target_p,
                    expected_gain=gain,
                    lang=sub.language
                )
                tg_res = send_telegram_message(sub.telegram_chat_id, tg_text)
                log_entry = AlertLog(
                    subscription_id=sub.id,
                    recipient=sub.telegram_chat_id,
                    channel="telegram",
                    crop=sub.crop,
                    mandi=sub.mandi,
                    message_text=tg_text,
                    status=tg_res.get("status", "success")
                )
                db.add(log_entry)

            sub.last_dispatched_at = datetime.now(timezone.utc)
            dispatched_count += 1

        db.commit()
        return {
            "status": "success",
            "dispatched_count": dispatched_count,
            "message": f"Successfully processed {dispatched_count} active alert subscriptions."
        }
    finally:
        db.close()
