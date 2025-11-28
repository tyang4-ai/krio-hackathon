"""
Health check endpoints for monitoring and load balancers.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_db, settings
from schemas import BaseResponse

router = APIRouter(tags=["Health"])


class HealthResponse(BaseResponse):
    """Health check response schema."""

    status: str
    environment: str
    database: str
    version: str = "5.0.0"


@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    """
    Health check endpoint for Docker/Kubernetes.

    Checks:
    - API is running
    - Database is connected
    """
    # Check database connection
    db_status = "disconnected"
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "error"

    return HealthResponse(
        success=True,
        status="healthy" if db_status == "connected" else "degraded",
        environment=settings.environment,
        database=db_status,
    )


@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)) -> dict:
    """
    Readiness probe for Kubernetes.

    Returns 200 only if all dependencies are ready.
    """
    try:
        await db.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception as e:
        return {"ready": False, "error": str(e)}


@router.get("/live")
async def liveness_check() -> dict:
    """
    Liveness probe for Kubernetes.

    Returns 200 if the application is running.
    """
    return {"alive": True}


@router.get("/metrics")
async def get_metrics() -> dict:
    """
    Get application performance metrics.

    Returns request counts, error rates, and response time statistics
    for each endpoint.
    """
    # Import here to avoid circular import
    from main import performance_middleware

    return performance_middleware.get_metrics()


@router.get("/sentry-debug")
async def trigger_error():
    """
    Trigger a test error for Sentry debugging.

    This endpoint intentionally raises an exception to verify
    that Sentry error tracking is working correctly.
    """
    division_by_zero = 1 / 0
    return {"this": "will never return"}
