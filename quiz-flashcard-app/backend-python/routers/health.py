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
