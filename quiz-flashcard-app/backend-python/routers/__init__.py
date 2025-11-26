"""API routers for Scholarly backend."""
from .health import router as health_router
from .categories import router as categories_router
from .documents import router as documents_router
from .flashcards import router as flashcards_router
from .quiz import router as quiz_router
from .notebook import router as notebook_router
from .sample_questions import router as sample_questions_router
from .ai import router as ai_router

__all__ = [
    "health_router",
    "categories_router",
    "documents_router",
    "flashcards_router",
    "quiz_router",
    "notebook_router",
    "sample_questions_router",
    "ai_router",
]
