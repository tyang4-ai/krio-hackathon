"""
Application settings loaded from environment variables.
Uses Pydantic Settings for validation and type coercion.
"""
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://scholarly:localdev123@postgres:5432/scholarly"

    # Environment
    environment: str = "development"
    debug: bool = True

    # Sentry
    sentry_dsn: Optional[str] = None

    # Primary AI Provider (for reasoning agents)
    ai_provider: str = "nvidia"
    ai_model: str = "llama-3.1-nemotron-nano-4b-v1.1"
    nvidia_api_key: Optional[str] = None

    # Vision AI Provider (for handwriting recognition)
    vision_provider: str = "openai"
    vision_model: str = "gpt-4o"
    openai_api_key: Optional[str] = None

    # Optional AI Providers
    groq_api_key: Optional[str] = None
    together_api_key: Optional[str] = None
    huggingface_api_key: Optional[str] = None

    # AWS (optional)
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"

    # Security
    secret_key: str = "dev-secret-key-change-in-production"

    # API Settings
    api_prefix: str = "/api"

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment == "production"


# Global settings instance
settings = Settings()
