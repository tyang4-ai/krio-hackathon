"""Middleware components for the Scholarly backend."""
from .auth_middleware import get_current_user, get_optional_user, require_auth
from .logging_middleware import LoggingMiddleware, PerformanceMiddleware
from .exception_handler import setup_exception_handlers
from .rate_limiter import (
    limiter,
    setup_rate_limiting,
    RateLimits,
    limit_auth,
    limit_auth_strict,
    limit_ai_generate,
    limit_ai_analyze,
    limit_ai_grade,
    limit_upload,
    limit_read,
    limit_write,
    limit_bulk,
)

__all__ = [
    "get_current_user",
    "get_optional_user",
    "require_auth",
    "LoggingMiddleware",
    "PerformanceMiddleware",
    "setup_exception_handlers",
    # Rate limiting
    "limiter",
    "setup_rate_limiting",
    "RateLimits",
    "limit_auth",
    "limit_auth_strict",
    "limit_ai_generate",
    "limit_ai_analyze",
    "limit_ai_grade",
    "limit_upload",
    "limit_read",
    "limit_write",
    "limit_bulk",
]
