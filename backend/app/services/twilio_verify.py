"""Twilio Verify integration for production SMS OTP delivery."""

from __future__ import annotations

import logging
from typing import Final

import requests

from backend.app.core.config import (
    TWILIO_API_KEY_SECRET,
    TWILIO_API_KEY_SID,
    TWILIO_VERIFY_SERVICE_SID,
)

logger = logging.getLogger(__name__)
TWILIO_VERIFY_BASE_URL: Final[str] = "https://verify.twilio.com/v2/Services"
TWILIO_REQUEST_TIMEOUT_SECONDS: Final[int] = 20


class TwilioProviderError(RuntimeError):
    """Raised when Twilio cannot start or verify an OTP request."""


def _service_url(path: str = "") -> str:
    if not all((TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_VERIFY_SERVICE_SID)):
        raise TwilioProviderError("Twilio Verify is not configured")
    return f"{TWILIO_VERIFY_BASE_URL}/{TWILIO_VERIFY_SERVICE_SID}{path}"


def _auth() -> tuple[str, str]:
    return TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET


def _raise_provider_error(operation: str, error: Exception) -> None:
    logger.warning("Twilio Verify %s failed: %s", operation, error.__class__.__name__)
    raise TwilioProviderError("Twilio Verify request failed") from error


def send_verification(phone_number: str) -> None:
    """Ask Twilio to generate and send an SMS verification code."""
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
        _raise_provider_error("send", error)


def verify_code(phone_number: str, code: str) -> bool:
    """Ask Twilio to verify the user-provided code."""
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
        _raise_provider_error("verify", error)
    return False
