"""Twilio Verify and Programmable SMS integration for SMS OTP delivery."""

from __future__ import annotations

import logging
from typing import Final

import requests

from backend.app.core.config import (
    TWILIO_API_KEY_SECRET,
    TWILIO_API_KEY_SID,
    TWILIO_PHONE_NUMBER,
    TWILIO_VERIFY_SERVICE_SID,
)

logger = logging.getLogger(__name__)
TWILIO_VERIFY_BASE_URL: Final[str] = "https://verify.twilio.com/v2/Services"
TWILIO_MESSAGES_BASE_URL: Final[str] = "https://api.twilio.com/2010-04-01/Accounts"
TWILIO_REQUEST_TIMEOUT_SECONDS: Final[int] = 20


class TwilioProviderError(RuntimeError):
    """Raised when Twilio cannot start or verify an OTP request."""


def is_verify_configured() -> bool:
    """True if Twilio Verify v2 service (VA...) is configured."""
    return bool(TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET and TWILIO_VERIFY_SERVICE_SID)


def is_sms_configured() -> bool:
    """True if standard Twilio Programmable SMS (phone number) is configured."""
    return bool(TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET and TWILIO_PHONE_NUMBER)


def _service_url(path: str = "") -> str:
    if not is_verify_configured():
        raise TwilioProviderError("Twilio Verify is not configured")
    return f"{TWILIO_VERIFY_BASE_URL}/{TWILIO_VERIFY_SERVICE_SID}{path}"


def _auth() -> tuple[str, str]:
    return TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET


def _raise_provider_error(operation: str, error: Exception) -> None:
    if isinstance(error, requests.HTTPError) and error.response is not None:
        logger.error(
            "Twilio %s failed (Status %s): %s",
            operation,
            error.response.status_code,
            error.response.text,
        )
    else:
        logger.error("Twilio %s failed: %s", operation, str(error))
    raise TwilioProviderError("Twilio request failed") from error


def send_verification(phone_number: str) -> None:
    """Ask Twilio Verify to generate and send an SMS verification code."""
    try:
        response = requests.post(
            _service_url("/Verifications"),
            auth=_auth(),
            data={"To": phone_number, "Channel": "sms"},
            timeout=TWILIO_REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        if response.json().get("status") not in {"pending", "approved"}:
            raise TwilioProviderError("Twilio did not accept the verification")
    except TwilioProviderError:
        raise
    except (requests.RequestException, ValueError) as error:
        _raise_provider_error("send_verification", error)


def verify_code(phone_number: str, code: str) -> bool:
    """Ask Twilio Verify to verify the user-provided code."""
    try:
        response = requests.post(
            _service_url("/VerificationCheck"),
            auth=_auth(),
            data={"To": phone_number, "Code": code},
            timeout=TWILIO_REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response.json().get("status") == "approved"
    except (requests.RequestException, ValueError) as error:
        _raise_provider_error("verify_code", error)
    return False


def send_programmable_sms(phone_number: str, body: str) -> None:
    """Send an SMS directly using Twilio Programmable SMS API."""
    if not is_sms_configured():
        raise TwilioProviderError("Twilio SMS credentials (SID, Secret, Phone Number) are not configured")
    try:
        url = f"{TWILIO_MESSAGES_BASE_URL}/{TWILIO_API_KEY_SID}/Messages.json"
        response = requests.post(
            url,
            auth=_auth(),
            data={"To": phone_number, "From": TWILIO_PHONE_NUMBER, "Body": body},
            timeout=TWILIO_REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except (requests.RequestException, ValueError) as error:
        _raise_provider_error("send_programmable_sms", error)

