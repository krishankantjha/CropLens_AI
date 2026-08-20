"""
Resilient Redis client wrapper for distributed OTP storage and rate limiting.
Provides automatic fallback to in-memory thread-safe dictionaries when Redis
is unavailable or unconfigured (Degraded Mode / Local Development).
"""

import time
import logging
import threading
from typing import Optional, Dict, List, Any
from backend.app.core.config import REDIS_URL

logger = logging.getLogger("croplens.redis")

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("redis package not installed. Operating in in-memory fallback mode.")


class RedisStoreManager:
    def __init__(self):
        self._client: Optional[Any] = None
        self._connected = False
        self._lock = threading.Lock()
        
        # In-memory fallback stores
        self._fallback_otp: Dict[str, Dict[str, Any]] = {}
        self._fallback_rate_limit: Dict[str, List[float]] = {}
        
        if REDIS_AVAILABLE and REDIS_URL:
            try:
                # Initialize Redis connection with a short connection timeout
                client = redis.Redis.from_url(
                    REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                    socket_timeout=2.0
                )
                # Test connection
                client.ping()
                self._client = client
                self._connected = True
                logger.info("Successfully connected to Redis instance.")
            except Exception as e:
                logger.warning(f"Could not connect to Redis at {REDIS_URL}: {e}. Falling back to in-memory store.")
                self._connected = False

    def is_redis_active(self) -> bool:
        if not self._connected or not self._client:
            return False
        try:
            self._client.ping()
            return True
        except Exception:
            self._connected = False
            return False

    def set_otp(self, mobile: str, code: str, ttl_seconds: int = 300) -> None:
        """Stores OTP with a TTL."""
        key = f"otp:{mobile}"
        if self.is_redis_active():
            try:
                self._client.setex(key, ttl_seconds, code)
                return
            except Exception as e:
                logger.warning(f"Redis set_otp failed: {e}. Using fallback.")
        
        # Fallback
        with self._lock:
            self._fallback_otp[mobile] = {
                "code": code,
                "expires_at": time.time() + ttl_seconds
            }

    def get_otp(self, mobile: str) -> Optional[str]:
        """Retrieves active OTP code."""
        key = f"otp:{mobile}"
        if self.is_redis_active():
            try:
                return self._client.get(key)
            except Exception as e:
                logger.warning(f"Redis get_otp failed: {e}. Using fallback.")
        
        # Fallback
        with self._lock:
            entry = self._fallback_otp.get(mobile)
            if not entry:
                return None
            if time.time() > entry["expires_at"]:
                self._fallback_otp.pop(mobile, None)
                return None
            return entry["code"]

    def delete_otp(self, mobile: str) -> None:
        """Consumes/deletes OTP code."""
        key = f"otp:{mobile}"
        if self.is_redis_active():
            try:
                self._client.delete(key)
                return
            except Exception as e:
                logger.warning(f"Redis delete_otp failed: {e}. Using fallback.")
        
        with self._lock:
            self._fallback_otp.pop(mobile, None)

    def check_rate_limit(self, key: str, window_seconds: int = 60, max_requests: int = 10) -> bool:
        """
        Sliding window rate limiter. Returns True if request is allowed,
        False if rate limit is exceeded.
        """
        rl_key = f"rl:{key}"
        if self.is_redis_active():
            try:
                now_ms = int(time.time() * 1000)
                window_ms = window_seconds * 1000
                pipeline = self._client.pipeline()
                # Remove old timestamps outside window
                pipeline.zremrangebyscore(rl_key, 0, now_ms - window_ms)
                # Add current request timestamp
                pipeline.zadd(rl_key, {str(now_ms): now_ms})
                # Count requests in window
                pipeline.zcard(rl_key)
                # Set TTL on rate limit key
                pipeline.expire(rl_key, window_seconds)
                results = pipeline.execute()
                request_count = results[2]
                return request_count <= max_requests
            except Exception as e:
                logger.warning(f"Redis rate_limit failed: {e}. Using fallback.")
        
        # Fallback sliding window
        with self._lock:
            now = time.time()
            timestamps = self._fallback_rate_limit.get(key, [])
            valid = [t for t in timestamps if now - t < window_seconds]
            if len(valid) >= max_requests:
                return False
            valid.append(now)
            self._fallback_rate_limit[key] = valid
            return True


# Global singleton instance
redis_store = RedisStoreManager()
