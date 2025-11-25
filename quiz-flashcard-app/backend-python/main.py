"""
Scholarly Quiz & Flashcard App - FastAPI Backend
Main application entry point
"""
import os
from contextlib import asynccontextmanager

import sentry_sdk
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

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
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=1.0 if os.getenv("ENVIRONMENT") == "development" else 0.1,
        profiles_sample_rate=1.0 if os.getenv("ENVIRONMENT") == "development" else 0.1,
        environment=os.getenv("ENVIRONMENT", "development"),
    )
    logger.info("sentry_initialized", environment=os.getenv("ENVIRONMENT"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("application_starting", environment=os.getenv("ENVIRONMENT", "development"))
    yield
    # Shutdown
    logger.info("application_shutting_down")


# Create FastAPI application
app = FastAPI(
    title="Scholarly API",
    description="Quiz & Flashcard Application with AI-powered content generation",
    version="5.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative frontend port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint - API info."""
    return {
        "name": "Scholarly API",
        "version": "5.0.0",
        "status": "running",
        "docs": "/docs",
        "environment": os.getenv("ENVIRONMENT", "development"),
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker/Kubernetes."""
    return {
        "status": "healthy",
        "database": "connected",  # TODO: Add actual DB check
    }


# TODO: Import and include routers
# from routers import categories, documents, questions, flashcards, quiz
# app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
# app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
# app.include_router(questions.router, prefix="/api/questions", tags=["Questions"])
# app.include_router(flashcards.router, prefix="/api/flashcards", tags=["Flashcards"])
# app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
