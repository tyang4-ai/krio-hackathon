"""API routers for Scholarly backend."""
from .health import router as health_router
from .categories import router as categories_router
from .documents import router as documents_router

__all__ = ["health_router", "categories_router", "documents_router"]
