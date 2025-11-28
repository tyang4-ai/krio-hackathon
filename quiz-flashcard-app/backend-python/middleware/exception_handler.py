"""
Global exception handler middleware for FastAPI.

Provides consistent error responses and logging for all exceptions.
"""

import traceback
from typing import Callable

import sentry_sdk
import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from exceptions import ScholarlyException

logger = structlog.get_logger()


def setup_exception_handlers(app: FastAPI) -> None:
    """Register exception handlers with the FastAPI app."""

    @app.exception_handler(ScholarlyException)
    async def scholarly_exception_handler(
        request: Request, exc: ScholarlyException
    ) -> JSONResponse:
        """Handle custom Scholarly exceptions."""
        request_id = getattr(request.state, "request_id", "unknown")

        logger.warning(
            "scholarly_exception",
            error_code=exc.error_code,
            detail=exc.detail,
            status_code=exc.status_code,
            request_id=request_id,
            path=request.url.path,
            method=request.method,
            extra=exc.extra,
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.error_code,
                "detail": exc.detail,
                "request_id": request_id,
                **({"extra": exc.extra} if exc.extra else {}),
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        """Handle standard HTTP exceptions."""
        request_id = getattr(request.state, "request_id", "unknown")

        logger.warning(
            "http_exception",
            status_code=exc.status_code,
            detail=exc.detail,
            request_id=request_id,
            path=request.url.path,
            method=request.method,
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": _status_code_to_error_code(exc.status_code),
                "detail": exc.detail,
                "request_id": request_id,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors with detailed messages."""
        request_id = getattr(request.state, "request_id", "unknown")

        # Format validation errors
        errors = []
        for error in exc.errors():
            location = " -> ".join(str(loc) for loc in error["loc"])
            errors.append({
                "field": location,
                "message": error["msg"],
                "type": error["type"],
            })

        logger.warning(
            "validation_error",
            errors=errors,
            request_id=request_id,
            path=request.url.path,
            method=request.method,
        )

        return JSONResponse(
            status_code=422,
            content={
                "error": "VALIDATION_ERROR",
                "detail": "Request validation failed",
                "errors": errors,
                "request_id": request_id,
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Handle all unhandled exceptions."""
        request_id = getattr(request.state, "request_id", "unknown")

        # Log full traceback
        logger.error(
            "unhandled_exception",
            error_type=type(exc).__name__,
            error_message=str(exc),
            request_id=request_id,
            path=request.url.path,
            method=request.method,
            traceback=traceback.format_exc(),
        )

        # Capture to Sentry
        sentry_sdk.capture_exception(exc)

        # Return generic error (don't expose internal details)
        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_ERROR",
                "detail": "An unexpected error occurred. Please try again later.",
                "request_id": request_id,
            },
        )


def _status_code_to_error_code(status_code: int) -> str:
    """Map HTTP status code to error code string."""
    mapping = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        408: "REQUEST_TIMEOUT",
        409: "CONFLICT",
        410: "GONE",
        413: "PAYLOAD_TOO_LARGE",
        415: "UNSUPPORTED_MEDIA_TYPE",
        422: "VALIDATION_ERROR",
        429: "TOO_MANY_REQUESTS",
        500: "INTERNAL_ERROR",
        502: "BAD_GATEWAY",
        503: "SERVICE_UNAVAILABLE",
        504: "GATEWAY_TIMEOUT",
    }
    return mapping.get(status_code, "ERROR")
