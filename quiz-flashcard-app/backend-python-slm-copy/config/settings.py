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
    # Options: "anthropic" (Claude direct API), "bedrock", "moonshot", "nvidia", "openai"
    ai_provider: str = "anthropic"
    ai_model: str = "kimi-k2-0711-preview"  # Used for moonshot/nvidia
    moonshot_api_key: Optional[str] = None
    moonshot_base_url: str = "https://api.moonshot.ai/v1"

    # Anthropic API (Direct Claude access - recommended)
    # Set ai_provider="anthropic" to use this
    anthropic_api_key: Optional[str] = None
    anthropic_model: str = "claude-3-5-haiku-20241022"  # Claude 3.5 Haiku (fast)

    # AWS Bedrock (alternative - requires AWS account verification)
    # Set ai_provider="bedrock" to use this
    bedrock_model: str = "anthropic.claude-3-haiku-20240307-v1:0"  # Claude 3 Haiku
    aws_bedrock_region: Optional[str] = None  # Falls back to aws_region if not set

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

    # SLM Provider Settings (Phase 4)
    # Use Small Language Models for cost optimization on simple tasks
    slm_provider: str = "groq"  # Options: groq, cerebras
    slm_enabled: bool = True    # Feature flag to enable/disable SLM routing

    # Groq Settings (Primary SLM provider)
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model_small: str = "llama-3.1-8b-instant"      # ~800 tok/s, $0.05/$0.08 per 1M
    groq_model_large: str = "llama-3.1-70b-versatile"   # ~250 tok/s, $0.59/$0.79 per 1M

    # Cerebras Settings (Fallback SLM provider)
    cerebras_api_key: Optional[str] = None
    cerebras_base_url: str = "https://api.cerebras.ai/v1"
    cerebras_model: str = "llama3.1-8b"

    # Embedding Provider Settings (Phase 1 Chunking & Embeddings)
    embedding_provider: str = "openai"  # Options: openai, moonshot, voyage
    embedding_model: str = "text-embedding-ada-002"  # OpenAI default
    moonshot_embedding_model: str = "moonshot-v1-embedding"
    voyage_api_key: Optional[str] = None
    voyage_embedding_model: str = "voyage-3"

    # AWS (required for Bedrock)
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
