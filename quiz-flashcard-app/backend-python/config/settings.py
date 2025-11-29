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
    ai_provider: str = "moonshot"
    ai_model: str = "kimi-k2-0711-preview"
    moonshot_api_key: Optional[str] = None
    moonshot_base_url: str = "https://api.moonshot.ai/v1"

    # Legacy NVIDIA (kept for backwards compatibility)
    nvidia_api_key: Optional[str] = None
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"

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

    # Google OAuth
    google_client_id: Optional[str] = None

    # CORS - for production deployment
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"

    # API Settings
    api_prefix: str = "/api"

    def model_post_init(self, __context) -> None:
        """Post-init processing to fix database URL format."""
        # Convert Railway's postgresql:// to asyncpg format
        if self.database_url.startswith("postgresql://") and "+asyncpg" not in self.database_url:
            object.__setattr__(
                self,
                "database_url",
                self.database_url.replace("postgresql://", "postgresql+asyncpg://")
            )

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
