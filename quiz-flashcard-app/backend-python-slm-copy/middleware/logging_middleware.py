"""
Request/Response logging middleware with performance metrics.

Features:
- Request logging with method, path, and client info
- Response logging with status code and duration
- Performance metrics tracking
- Error context capture
- Request ID correlation
"""
import time
import uuid
from typing import Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for structured request/response logging.

    Logs:
    - request_started: When a request begins
    - request_completed: When a request completes with duration
    - request_failed: When a request fails with error details
    """

    # Paths to exclude from logging (health checks, static assets)
    EXCLUDE_PATHS = {"/health", "/api/health", "/favicon.ico"}

    # Paths to log at debug level (frequent operations)
    DEBUG_LEVEL_PATHS = {"/api/categories", "/api/flashcards"}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request and log details."""
        # Skip logging for excluded paths
        if request.url.path in self.EXCLUDE_PATHS:
            return await call_next(request)

        # Generate request ID for correlation
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        # Extract client info
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")[:100]

        # Start timing
        start_time = time.perf_counter()

        # Log request start
        log_method = logger.debug if self._is_debug_path(request.url.path) else logger.info
        log_method(
            "request_started",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            query=str(request.query_params) if request.query_params else None,
            client_ip=client_ip,
        )

        # Process request
        try:
            response = await call_next(request)

            # Calculate duration
            duration_ms = (time.perf_counter() - start_time) * 1000

            # Log completion
            log_data = {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
            }

            # Add warning for slow requests (> 1 second)
            if duration_ms > 1000:
                logger.warning("slow_request", **log_data)
            elif response.status_code >= 400:
                logger.warning("request_completed", **log_data)
            else:
                log_method("request_completed", **log_data)

            # Add request ID to response headers for debugging
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as exc:
            # Calculate duration even for errors
            duration_ms = (time.perf_counter() - start_time) * 1000

            logger.error(
                "request_failed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                duration_ms=round(duration_ms, 2),
                error_type=type(exc).__name__,
                error_message=str(exc),
            )
            raise

    def _is_debug_path(self, path: str) -> bool:
        """Check if path should be logged at debug level."""
        return any(path.startswith(p) for p in self.DEBUG_LEVEL_PATHS)


class PerformanceMiddleware(BaseHTTPMiddleware):
    """
    Middleware for tracking performance metrics.

    Tracks:
    - Request counts by endpoint
    - Response time percentiles
    - Error rates
    """

    def __init__(self, app, track_endpoints: bool = True):
        super().__init__(app)
        self.track_endpoints = track_endpoints
        self.metrics: dict = {
            "total_requests": 0,
            "total_errors": 0,
            "endpoints": {},
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and track performance metrics."""
        start_time = time.perf_counter()

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000

            # Update metrics
            self._update_metrics(
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )

            return response

        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            self._update_metrics(request.method, request.url.path, 500, duration_ms)
            raise

    def _update_metrics(
        self, method: str, path: str, status_code: int, duration_ms: float
    ) -> None:
        """Update internal performance metrics."""
        self.metrics["total_requests"] += 1
        if status_code >= 500:
            self.metrics["total_errors"] += 1

        if self.track_endpoints:
            endpoint_key = f"{method}:{path}"
            if endpoint_key not in self.metrics["endpoints"]:
                self.metrics["endpoints"][endpoint_key] = {
                    "count": 0,
                    "errors": 0,
                    "total_duration_ms": 0,
                    "max_duration_ms": 0,
                }

            endpoint = self.metrics["endpoints"][endpoint_key]
            endpoint["count"] += 1
            endpoint["total_duration_ms"] += duration_ms
            endpoint["max_duration_ms"] = max(endpoint["max_duration_ms"], duration_ms)
            if status_code >= 500:
                endpoint["errors"] += 1

    def get_metrics(self) -> dict:
        """Get current performance metrics."""
        result = {
            "total_requests": self.metrics["total_requests"],
            "total_errors": self.metrics["total_errors"],
            "error_rate": (
                self.metrics["total_errors"] / self.metrics["total_requests"]
                if self.metrics["total_requests"] > 0
                else 0
            ),
            "endpoints": {},
        }

        for key, data in self.metrics["endpoints"].items():
            avg_duration = (
                data["total_duration_ms"] / data["count"] if data["count"] > 0 else 0
            )
            result["endpoints"][key] = {
                "count": data["count"],
                "errors": data["errors"],
                "avg_duration_ms": round(avg_duration, 2),
                "max_duration_ms": round(data["max_duration_ms"], 2),
            }

        return result
