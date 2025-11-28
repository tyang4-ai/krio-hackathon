"""
Scholarly Quiz & Flashcard App - FastAPI Backend
Main application entry point
"""
import logging
import sys
from contextlib import asynccontextmanager
from logging.handlers import RotatingFileHandler
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
from middleware import LoggingMiddleware, PerformanceMiddleware, setup_exception_handlers, setup_rate_limiting
from routers import (
    health_router,
    auth_router,
    categories_router,
    documents_router,
    flashcards_router,
    quiz_router,
    notebook_router,
    sample_questions_router,
    ai_router,
    analytics_router,
)


def setup_logging():
    """Configure structured logging with file and console output."""
    # Create logs directory if it doesn't exist
    logs_dir = Path(__file__).parent / "logs"
    logs_dir.mkdir(exist_ok=True)

    # Set up Python's standard logging
    log_level = logging.DEBUG if settings.debug else logging.INFO

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Console handler (always enabled)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)

    # File handler with rotation (10MB max, keep 5 files)
    file_handler = RotatingFileHandler(
        logs_dir / "scholarly.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(log_level)

    # Add handlers to root logger
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # Configure structlog
    shared_processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]

    # Use JSON renderer for production, console for development
    if settings.is_development:
        renderer = structlog.dev.ConsoleRenderer()
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=shared_processors + [renderer],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


# Initialize logging
setup_logging()

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

# Add logging middleware (after CORS)
app.add_middleware(LoggingMiddleware)

# Add performance tracking middleware
performance_middleware = PerformanceMiddleware(app, track_endpoints=True)

# Setup rate limiting (before exception handlers)
setup_rate_limiting(app)

# Register exception handlers
setup_exception_handlers(app)

# Include routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(categories_router)
app.include_router(documents_router)
app.include_router(flashcards_router)
app.include_router(quiz_router)
app.include_router(notebook_router)
app.include_router(sample_questions_router)
app.include_router(ai_router)
app.include_router(analytics_router)


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
