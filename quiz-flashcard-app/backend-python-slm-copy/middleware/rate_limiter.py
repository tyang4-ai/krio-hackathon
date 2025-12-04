"""
Rate Limiting Middleware using SlowAPI

Provides configurable rate limiting for API endpoints to prevent abuse
and ensure fair usage of resources.
"""
from typing import Callable, Optional

import structlog
from fastapi import FastAPI, Request, Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.responses import JSONResponse

logger = structlog.get_logger()


def get_identifier(request: Request) -> str:
    """
    Get a unique identifier for rate limiting.
    Uses user ID if authenticated, otherwise falls back to IP address.
    """
    # Check for authenticated user (set by auth middleware)
    if hasattr(request.state, "user") and request.state.user:
        return f"user:{request.state.user.id}"

    # Fall back to IP address
    return get_remote_address(request)


# Create limiter instance with custom key function
limiter = Limiter(key_func=get_identifier)


# Rate limit configurations for different endpoint types
class RateLimits:
    """Rate limit configurations by endpoint category."""

    # Standard API endpoints
    DEFAULT = "100/minute"

    # Authentication endpoints (stricter to prevent brute force)
    AUTH = "10/minute"
    AUTH_STRICT = "5/minute"  # For login/registration

    # AI endpoints (expensive operations)
    AI_GENERATE = "10/minute"  # Content generation
    AI_ANALYZE = "5/minute"    # Document analysis
    AI_GRADE = "20/minute"     # Grading (faster operation)

    # File upload endpoints
    UPLOAD = "20/minute"

    # Read-heavy endpoints (can be more generous)
    READ = "200/minute"

    # Write endpoints
    WRITE = "50/minute"

    # Bulk operations
    BULK = "10/minute"


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom handler for rate limit exceeded errors.
    Returns a user-friendly JSON response with retry information.
    """
    logger.warning(
        "rate_limit_exceeded",
        path=request.url.path,
        method=request.method,
        identifier=get_identifier(request),
        limit=str(exc.detail),
    )

    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": f"Too many requests. {exc.detail}",
            "retry_after": getattr(exc, "retry_after", 60),
        },
        headers={
            "Retry-After": str(getattr(exc, "retry_after", 60)),
            "X-RateLimit-Limit": str(exc.detail) if exc.detail else "unknown",
        },
    )


def setup_rate_limiting(app: FastAPI) -> Limiter:
    """
    Configure rate limiting for the FastAPI application.

    Args:
        app: FastAPI application instance

    Returns:
        Configured Limiter instance
    """
    # Store limiter in app state for access in route decorators
    app.state.limiter = limiter

    # Add the SlowAPI middleware
    app.add_middleware(SlowAPIMiddleware)

    # Register custom exception handler
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    logger.info("rate_limiting_configured", default_limit=RateLimits.DEFAULT)

    return limiter


# Decorator helpers for common rate limit patterns
def limit_auth(func: Callable) -> Callable:
    """Apply authentication rate limit."""
    return limiter.limit(RateLimits.AUTH)(func)


def limit_auth_strict(func: Callable) -> Callable:
    """Apply strict authentication rate limit (login/register)."""
    return limiter.limit(RateLimits.AUTH_STRICT)(func)


def limit_ai_generate(func: Callable) -> Callable:
    """Apply AI generation rate limit."""
    return limiter.limit(RateLimits.AI_GENERATE)(func)


def limit_ai_analyze(func: Callable) -> Callable:
    """Apply AI analysis rate limit."""
    return limiter.limit(RateLimits.AI_ANALYZE)(func)


def limit_ai_grade(func: Callable) -> Callable:
    """Apply AI grading rate limit."""
    return limiter.limit(RateLimits.AI_GRADE)(func)


def limit_upload(func: Callable) -> Callable:
    """Apply upload rate limit."""
    return limiter.limit(RateLimits.UPLOAD)(func)


def limit_read(func: Callable) -> Callable:
    """Apply read operation rate limit."""
    return limiter.limit(RateLimits.READ)(func)


def limit_write(func: Callable) -> Callable:
    """Apply write operation rate limit."""
    return limiter.limit(RateLimits.WRITE)(func)


def limit_bulk(func: Callable) -> Callable:
    """Apply bulk operation rate limit."""
    return limiter.limit(RateLimits.BULK)(func)
