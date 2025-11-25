"""
Multi-provider AI service for Scholarly.

Supports:
- NVIDIA (primary for reasoning agents)
- OpenAI (vision for handwriting recognition)
- Groq, Together, HuggingFace (optional)
"""
import base64
from typing import Any, Dict, List, Optional

import structlog
from openai import AsyncOpenAI

from config import settings

logger = structlog.get_logger()


class AIService:
    """
    Multi-provider AI service.

    Handles text generation (NVIDIA) and vision (OpenAI) tasks.
    """

    def __init__(self):
        """Initialize AI clients based on available API keys."""
        self._nvidia_client: Optional[AsyncOpenAI] = None
        self._openai_client: Optional[AsyncOpenAI] = None

        # Initialize NVIDIA client (OpenAI-compatible API)
        if settings.nvidia_api_key:
            self._nvidia_client = AsyncOpenAI(
                api_key=settings.nvidia_api_key,
                base_url="https://integrate.api.nvidia.com/v1",
            )
            logger.info("nvidia_client_initialized", model=settings.ai_model)

        # Initialize OpenAI client (for vision)
        if settings.openai_api_key:
            self._openai_client = AsyncOpenAI(
                api_key=settings.openai_api_key,
            )
            logger.info("openai_client_initialized", model=settings.vision_model)

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.7,
        provider: Optional[str] = None,
    ) -> str:
        """
        Generate text using the primary AI provider (NVIDIA).

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0-1)
            provider: Override default provider

        Returns:
            Generated text response
        """
        provider = provider or settings.ai_provider
        client = self._get_client(provider)

        if not client:
            raise ValueError(f"No client available for provider: {provider}")

        messages: List[Dict[str, Any]] = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        model = settings.ai_model if provider == "nvidia" else settings.vision_model

        logger.info(
            "ai_generate_text",
            provider=provider,
            model=model,
            prompt_length=len(prompt),
        )

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )

            result = response.choices[0].message.content or ""

            logger.info(
                "ai_generate_text_success",
                provider=provider,
                response_length=len(result),
            )

            return result

        except Exception as e:
            logger.error(
                "ai_generate_text_error",
                provider=provider,
                error=str(e),
            )
            raise

    async def analyze_image(
        self,
        image_data: bytes,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
    ) -> str:
        """
        Analyze an image using OpenAI Vision (GPT-4o).

        Used for handwriting recognition.

        Args:
            image_data: Image bytes (PNG, JPEG, etc.)
            prompt: What to analyze in the image
            system_prompt: Optional system instructions
            max_tokens: Maximum tokens to generate

        Returns:
            Analysis result text
        """
        if not self._openai_client:
            raise ValueError("OpenAI client not configured for vision tasks")

        # Convert image to base64
        base64_image = base64.b64encode(image_data).decode("utf-8")

        messages: List[Dict[str, Any]] = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": prompt,
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{base64_image}",
                        "detail": "high",  # High detail for handwriting
                    },
                },
            ],
        })

        logger.info(
            "ai_analyze_image",
            model=settings.vision_model,
            prompt_length=len(prompt),
            image_size=len(image_data),
        )

        try:
            response = await self._openai_client.chat.completions.create(
                model=settings.vision_model,
                messages=messages,
                max_tokens=max_tokens,
            )

            result = response.choices[0].message.content or ""

            logger.info(
                "ai_analyze_image_success",
                response_length=len(result),
            )

            return result

        except Exception as e:
            logger.error(
                "ai_analyze_image_error",
                error=str(e),
            )
            raise

    async def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.3,  # Lower temp for structured output
    ) -> str:
        """
        Generate JSON response (for structured data like questions, flashcards).

        Uses lower temperature for more deterministic output.
        """
        json_system = (system_prompt or "") + "\n\nRespond ONLY with valid JSON."

        return await self.generate_text(
            prompt=prompt,
            system_prompt=json_system,
            max_tokens=max_tokens,
            temperature=temperature,
        )

    def _get_client(self, provider: str) -> Optional[AsyncOpenAI]:
        """Get the appropriate client for a provider."""
        if provider == "nvidia":
            return self._nvidia_client
        elif provider == "openai":
            return self._openai_client
        else:
            logger.warning("unknown_provider", provider=provider)
            return self._nvidia_client  # Fallback to primary

    @property
    def has_nvidia(self) -> bool:
        """Check if NVIDIA is available."""
        return self._nvidia_client is not None

    @property
    def has_vision(self) -> bool:
        """Check if vision (OpenAI) is available."""
        return self._openai_client is not None


# Global AI service instance
ai_service = AIService()
