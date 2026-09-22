"""
CropLens AI — WhatsApp Market Advisory & Automation Service
Handles formatting, daily morning dispatches, instant share-to-myself messages,
and 1-click wa.me direct deep-link dispatches for Indian farmers.
"""

import re
import urllib.parse
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")

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


def parse_delivery_time(value: str) -> Optional[Tuple[int, int]]:
    """Parse stored delivery times such as ``07:30`` or ``07:00 AM``."""
    if not value:
        return None
    cleaned = value.strip().upper()

    match_24h = re.fullmatch(r"(\d{1,2}):(\d{2})", cleaned)
    if match_24h:
        hour = int(match_24h.group(1))
        minute = int(match_24h.group(2))
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return hour, minute
        return None

    match_12h = re.fullmatch(r"(\d{1,2}):(\d{2})\s*(AM|PM)", cleaned)
    if match_12h:
        hour = int(match_12h.group(1)) % 12
        minute = int(match_12h.group(2))
        if match_12h.group(3) == "PM":
            hour += 12
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return hour, minute
    return None


def normalize_delivery_time(value: str) -> str:
    """Store alert delivery times in canonical 24-hour ``HH:MM`` format."""
    parsed = parse_delivery_time(value)
    if parsed is None:
        return value.strip()
    hour, minute = parsed
    return f"{hour:02d}:{minute:02d}"


def subscription_due_now(sub: Any, now_ist: datetime) -> bool:
    """Return True when a subscription should receive its daily wa.me advisory."""
    parsed = parse_delivery_time(getattr(sub, "delivery_time", ""))
    if parsed is None:
        return False

    hour, minute = parsed
    if now_ist.hour != hour or now_ist.minute != minute:
        return False

    last_dispatched_at = getattr(sub, "last_dispatched_at", None)
    if last_dispatched_at is None:
        return True

    if last_dispatched_at.tzinfo is None:
        last_dispatched_at = last_dispatched_at.replace(tzinfo=timezone.utc)
    last_ist = last_dispatched_at.astimezone(IST)
    return not (
        last_ist.date() == now_ist.date()
        and last_ist.hour == hour
        and last_ist.minute == minute
    )


def generate_whatsapp_deeplink(mobile_number: str, message_text: str) -> str:
    """
    Generates a 100% free direct WhatsApp deep-link URL (wa.me protocol).
    Opens real WhatsApp on iOS/Android/Web with zero external API fees.
    """
    clean_digits = "".join(filter(str.isdigit, str(mobile_number)))
    phone_with_country = f"91{clean_digits[-10:]}" if len(clean_digits) >= 10 else clean_digits
    encoded_text = urllib.parse.quote(message_text)
    return f"https://wa.me/{phone_with_country}?text={encoded_text}"


def dispatch_scheduled_advisories_service(
    app: Any = None,
    *,
    respect_delivery_time: bool = True,
) -> Dict[str, Any]:
    """
    Dispatch Service: Iterates over active subscriptions in SQLite database,
    generates latest multi-quantile market advisory, dispatches to WhatsApp,
    and logs the delivery event into alert_logs.
    """
    from backend.app.db.database import SessionLocal
    from backend.app.db.models import AlertSubscription, AlertLog
    from backend.app.services.scheduler_service import get_cached_forecast_7d, dataset_watermark
    from backend.app.schemas import MultiDayForecastRequest
    from backend.app.services.api_service import predict_7day_forecast_service, enrich_forecast_with_net_profit

    db = SessionLocal()
    try:
        active_subs = db.query(AlertSubscription).filter(AlertSubscription.is_active == 1).all()
        if not active_subs:
            return {"status": "success", "dispatched_count": 0, "message": "No active subscriptions found"}

        dispatched_count = 0
        skipped_not_due = 0
        now_ist = datetime.now(IST)
        today_str = now_ist.strftime("%Y-%m-%d")

        for sub in active_subs:
            if respect_delivery_time and not subscription_due_now(sub, now_ist):
                skipped_not_due += 1
                continue

            # 1. Fetch latest forecast data from cache or model
            cached_data = get_cached_forecast_7d(
                sub.crop,
                sub.mandi,
                today_str,
                horizon_days=7,
                model_version=getattr(getattr(app, "state", None), "model_version", "unknown"),
                data_watermark=dataset_watermark(getattr(getattr(app, "state", None), "dataset", None)),
            )
            try:
                if cached_data:
                    from backend.app.schemas import MultiDayForecastResponse
                    base = MultiDayForecastResponse(**{k: v for k, v in cached_data.items() if k != "net_profit_advisory"})
                    res = enrich_forecast_with_net_profit(base)
                    current_p = res.current_price
                    net = res.net_profit_advisory
                    if net:
                        target_p = net.optimal_price_per_qtl
                        gain = net.net_advantage_vs_peak_rs if net.overrides_peak_price_advice else res.expected_gain
                        decision = net.decision_hi if sub.language == "hi" else net.decision
                    else:
                        peak_day = res.peak_day
                        target_p = peak_day.price
                        gain = res.expected_gain
                        decision = res.decision_hi if sub.language == "hi" else res.decision
                    if any(value is None for value in (current_p, target_p, gain, decision)):
                        raise ValueError("Cached forecast is incomplete")
                elif app and hasattr(app, "state") and getattr(app.state, "models_loaded", False) and getattr(app.state, "dataset_loaded", False):
                    req = MultiDayForecastRequest(commodity=sub.crop, market=sub.mandi, start_date=today_str, horizon_days=7)
                    base = predict_7day_forecast_service(req, app.state.models, app.state.metadata, app.state.dataset)
                    res = enrich_forecast_with_net_profit(base)
                    current_p = res.current_price
                    net = res.net_profit_advisory
                    if net:
                        target_p = net.optimal_price_per_qtl
                        gain = net.net_advantage_vs_peak_rs if net.overrides_peak_price_advice else res.expected_gain
                        decision = net.decision_hi if sub.language == "hi" else net.decision
                    else:
                        target_p = res.peak_day.price
                        gain = res.expected_gain
                        decision = res.decision_hi if sub.language == "hi" else res.decision
                else:
                    raise RuntimeError("Forecast service is not ready")
            except Exception as forecast_error:
                print(f"[Alert Warning] Skipping {sub.crop}/{sub.mandi}: {forecast_error}")
                continue

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

            sub.last_dispatched_at = datetime.now(timezone.utc)
            dispatched_count += 1

        db.commit()
        return {
            "status": "success",
            "dispatched_count": dispatched_count,
            "skipped_not_due": skipped_not_due,
            "checked_at_ist": now_ist.strftime("%Y-%m-%d %H:%M"),
            "message": f"Successfully processed {dispatched_count} active alert subscriptions.",
        }
    finally:
        db.close()
