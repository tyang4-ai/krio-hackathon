"""
Scholarly Quiz & Flashcard App - FastAPI Backend
Main application entry point
"""
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Add the backend-python directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

import sentry_sdk
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from config import settings
from config.database import init_db, close_db
from routers import (
    health_router,
    categories_router,
    documents_router,
    flashcards_router,
    quiz_router,
    notebook_router,
    sample_questions_router,
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Initialize Sentry if DSN is provided
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=1.0 if settings.is_development else 0.1,
        profiles_sample_rate=1.0 if settings.is_development else 0.1,
        environment=settings.environment,
    )
    logger.info("sentry_initialized", environment=settings.environment)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(
        "application_starting",
        environment=settings.environment,
        ai_provider=settings.ai_provider,
        ai_model=settings.ai_model,
        vision_provider=settings.vision_provider,
        vision_model=settings.vision_model,
    )

    # Initialize database
    await init_db()
    logger.info("database_initialized")

    yield

    # Shutdown
    await close_db()
    logger.info("application_shutting_down")


# Create FastAPI application
app = FastAPI(
    title="Scholarly API",
    description="Quiz & Flashcard Application with AI-powered content generation",
    version="5.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server (original)
        "http://localhost:3000",  # Vite dev server (Docker)
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(health_router)
app.include_router(categories_router)
app.include_router(documents_router)
app.include_router(flashcards_router)
app.include_router(quiz_router)
app.include_router(notebook_router)
app.include_router(sample_questions_router)


@app.get("/")
async def root():
    """Root endpoint - API info."""
    return {
        "name": "Scholarly API",
        "version": "5.0.0",
        "status": "running",
        "docs": "/docs",
        "environment": settings.environment,
        "ai_provider": settings.ai_provider,
        "ai_model": settings.ai_model,
        "vision_available": bool(settings.openai_api_key),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
