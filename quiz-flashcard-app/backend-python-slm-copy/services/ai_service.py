"""
Multi-provider AI service for Scholarly.

Supports:
- Anthropic API (Direct Claude access - recommended)
- AWS Bedrock with Claude (alternative)
- Moonshot/Kimi K2 (alternative)
- OpenAI (vision for handwriting recognition)
- NVIDIA (legacy support)
"""
import base64
import json
from typing import Any, Dict, List, Optional

import structlog
from openai import AsyncOpenAI

from config import settings

logger = structlog.get_logger()


class AIService:
    """
    Multi-provider AI service.

    Handles text generation and vision tasks across multiple providers.
    Direct Anthropic API is the recommended primary provider.
    SLM (Groq) available for cost-optimized simple tasks (Phase 4).
    """

    def __init__(self):
        """Initialize AI clients based on available API keys."""
        self._moonshot_client: Optional[AsyncOpenAI] = None
        self._nvidia_client: Optional[AsyncOpenAI] = None
        self._openai_client: Optional[AsyncOpenAI] = None
        self._groq_client: Optional[AsyncOpenAI] = None  # Phase 4: SLM
        self._anthropic_client = None
        self._bedrock_client = None
        self._bedrock_runtime = None

        # Initialize Anthropic client (primary - direct Claude API)
        if settings.anthropic_api_key:
            try:
                import anthropic
                self._anthropic_client = anthropic.AsyncAnthropic(
                    api_key=settings.anthropic_api_key,
                )
                logger.info(
                    "anthropic_client_initialized",
                    model=settings.anthropic_model,
                )
            except ImportError:
                logger.warning("anthropic_not_installed", message="Install anthropic for direct Claude API support")
            except Exception as e:
                logger.error("anthropic_client_init_error", error=str(e))

        # Initialize AWS Bedrock client (alternative - Claude models)
        # Try with explicit credentials first, then fall back to default credential chain
        try:
            import boto3
            region = settings.aws_bedrock_region or settings.aws_region

            if settings.aws_access_key_id and settings.aws_secret_access_key:
                # Use explicit credentials from environment
                self._bedrock_runtime = boto3.client(
                    service_name="bedrock-runtime",
                    region_name=region,
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key,
                )
                logger.info(
                    "bedrock_client_initialized",
                    model=settings.bedrock_model,
                    region=region,
                    auth="explicit_credentials",
                )
            else:
                # Fall back to default credential chain (instance role, env vars, etc.)
                self._bedrock_runtime = boto3.client(
                    service_name="bedrock-runtime",
                    region_name=region,
                )
                logger.info(
                    "bedrock_client_initialized",
                    model=settings.bedrock_model,
                    region=region,
                    auth="default_credential_chain",
                )
        except ImportError:
            logger.warning("boto3_not_installed", message="Install boto3 for AWS Bedrock support")
        except Exception as e:
            logger.error("bedrock_client_init_error", error=str(e))

        # Initialize Moonshot/Kimi K2 client (OpenAI-compatible API)
        if settings.moonshot_api_key:
            self._moonshot_client = AsyncOpenAI(
                api_key=settings.moonshot_api_key,
                base_url=settings.moonshot_base_url,
            )
            logger.info("moonshot_client_initialized", model=settings.ai_model, base_url=settings.moonshot_base_url)

        # Initialize NVIDIA client (legacy, OpenAI-compatible API)
        if settings.nvidia_api_key:
            self._nvidia_client = AsyncOpenAI(
                api_key=settings.nvidia_api_key,
                base_url=settings.nvidia_base_url,
            )
            logger.info("nvidia_client_initialized", model=settings.ai_model, base_url=settings.nvidia_base_url)

        # Initialize OpenAI client (for vision)
        if settings.openai_api_key:
            self._openai_client = AsyncOpenAI(
                api_key=settings.openai_api_key,
            )
            logger.info("openai_client_initialized", model=settings.vision_model)

        # Phase 4: Initialize Groq client (SLM for cost-optimized tasks)
        if settings.groq_api_key and settings.slm_enabled:
            self._groq_client = AsyncOpenAI(
                api_key=settings.groq_api_key,
                base_url=settings.groq_base_url,
            )
            logger.info(
                "groq_client_initialized",
                models=[settings.groq_model_small, settings.groq_model_large],
                base_url=settings.groq_base_url,
            )

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.7,
        provider: Optional[str] = None,
    ) -> str:
        """
        Generate text using the configured AI provider.

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

        # Use Anthropic direct API if configured
        if provider == "anthropic" and self._anthropic_client:
            return await self._generate_with_anthropic(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
            )

        # Use Bedrock if configured and provider is bedrock
        if provider == "bedrock" and self._bedrock_runtime:
            return await self._generate_with_bedrock(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
            )

        # Fall back to OpenAI-compatible clients
        client = self._get_client(provider)

        if not client:
            # Try Anthropic as first fallback
            if self._anthropic_client:
                logger.info("falling_back_to_anthropic", original_provider=provider)
                return await self._generate_with_anthropic(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            # Try Bedrock as second fallback
            if self._bedrock_runtime:
                logger.info("falling_back_to_bedrock", original_provider=provider)
                return await self._generate_with_bedrock(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            raise ValueError(f"No client available for provider: {provider}")

        messages: List[Dict[str, Any]] = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        model = settings.ai_model if provider in ("moonshot", "nvidia") else settings.vision_model

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

    async def _generate_with_anthropic(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ) -> str:
        """
        Generate text using the direct Anthropic API (Claude models).

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0-1)

        Returns:
            Generated text response
        """
        if not self._anthropic_client:
            raise ValueError("Anthropic client not initialized")

        model = settings.anthropic_model

        logger.info(
            "anthropic_generate_text",
            model=model,
            prompt_length=len(prompt),
            max_tokens=max_tokens,
        )

        try:
            # Build the request
            kwargs = {
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": [{"role": "user", "content": prompt}],
            }

            if system_prompt:
                kwargs["system"] = system_prompt

            response = await self._anthropic_client.messages.create(**kwargs)

            # Extract text from response
            result = ""
            for block in response.content:
                if block.type == "text":
                    result += block.text

            logger.info(
                "anthropic_generate_text_success",
                model=model,
                response_length=len(result),
                usage={
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                },
            )

            return result

        except Exception as e:
            logger.error(
                "anthropic_generate_text_error",
                model=model,
                error=str(e),
            )
            raise

    async def _generate_with_bedrock(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ) -> str:
        """
        Generate text using AWS Bedrock (supports Claude and Amazon Nova models).

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0-1)

        Returns:
            Generated text response
        """
        import asyncio

        if not self._bedrock_runtime:
            raise ValueError("Bedrock client not initialized")

        model_id = settings.bedrock_model

        # Determine model type and build appropriate request
        is_nova = model_id.startswith("amazon.nova")
        is_claude = model_id.startswith("anthropic.")

        if is_nova:
            # Amazon Nova format
            messages = [{"role": "user", "content": [{"text": prompt}]}]
            request_body = {
                "messages": messages,
                "inferenceConfig": {
                    "maxTokens": max_tokens,
                    "temperature": temperature,
                },
            }
            if system_prompt:
                request_body["system"] = [{"text": system_prompt}]
        elif is_claude:
            # Claude/Anthropic format
            messages = [{"role": "user", "content": prompt}]
            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages,
            }
            if system_prompt:
                request_body["system"] = system_prompt
        else:
            # Default to Nova format for unknown models
            messages = [{"role": "user", "content": [{"text": prompt}]}]
            request_body = {
                "messages": messages,
                "inferenceConfig": {
                    "maxTokens": max_tokens,
                    "temperature": temperature,
                },
            }
            if system_prompt:
                request_body["system"] = [{"text": system_prompt}]

        logger.info(
            "bedrock_generate_text",
            model=model_id,
            model_type="nova" if is_nova else "claude" if is_claude else "unknown",
            prompt_length=len(prompt),
            max_tokens=max_tokens,
        )

        try:
            # Run synchronous boto3 call in thread pool
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self._bedrock_runtime.invoke_model(
                    modelId=model_id,
                    body=json.dumps(request_body),
                    contentType="application/json",
                    accept="application/json",
                )
            )

            # Parse response
            response_body = json.loads(response["body"].read())

            # Extract text based on model type
            result = ""
            if is_nova:
                # Nova response format
                output = response_body.get("output", {})
                message = output.get("message", {})
                content = message.get("content", [])
                for block in content:
                    if "text" in block:
                        result += block["text"]
            elif is_claude:
                # Claude response format
                if "content" in response_body:
                    for block in response_body["content"]:
                        if block.get("type") == "text":
                            result += block.get("text", "")
            else:
                # Try Nova format first, then Claude
                output = response_body.get("output", {})
                if output:
                    message = output.get("message", {})
                    content = message.get("content", [])
                    for block in content:
                        if "text" in block:
                            result += block["text"]
                elif "content" in response_body:
                    for block in response_body["content"]:
                        if block.get("type") == "text":
                            result += block.get("text", "")

            logger.info(
                "bedrock_generate_text_success",
                model=model_id,
                response_length=len(result),
                usage=response_body.get("usage"),
            )

            return result

        except Exception as e:
            logger.error(
                "bedrock_generate_text_error",
                model=model_id,
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

    async def generate_with_slm(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        use_large_model: bool = False,
        json_mode: bool = False,
    ) -> str:
        """
        Generate text using SLM (Groq) for cost-optimized simple tasks.

        Phase 4: Use Small Language Models for:
        - Simple flashcard generation (vocabulary)
        - Short explanations (post-grading tutoring)

        Falls back to Claude if Groq is unavailable.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0-1)
            use_large_model: Use 70B model instead of 8B (for explanations)
            json_mode: Request JSON response format

        Returns:
            Generated text response
        """
        # Select model based on task complexity
        model = settings.groq_model_large if use_large_model else settings.groq_model_small

        # If Groq is not available, fall back to Claude
        if not self._groq_client:
            logger.info(
                "slm_fallback_to_claude",
                reason="groq_client_not_available",
            )
            if json_mode:
                return await self.generate_json(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            return await self.generate_text(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
            )

        messages: List[Dict[str, Any]] = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        logger.info(
            "slm_generate_text",
            provider="groq",
            model=model,
            prompt_length=len(prompt),
            json_mode=json_mode,
        )

        try:
            # Build request kwargs
            kwargs = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }

            # Add JSON mode if requested (Groq supports this)
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            response = await self._groq_client.chat.completions.create(**kwargs)

            result = response.choices[0].message.content or ""

            # Log usage for cost tracking
            usage = getattr(response, 'usage', None)
            logger.info(
                "slm_generate_text_success",
                provider="groq",
                model=model,
                response_length=len(result),
                usage={
                    "prompt_tokens": usage.prompt_tokens if usage else 0,
                    "completion_tokens": usage.completion_tokens if usage else 0,
                } if usage else None,
            )

            return result

        except Exception as e:
            logger.error(
                "slm_generate_text_error",
                provider="groq",
                model=model,
                error=str(e),
            )

            # Fall back to Claude on error
            logger.info(
                "slm_fallback_to_claude",
                reason="groq_error",
                error=str(e),
            )
            if json_mode:
                return await self.generate_json(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            return await self.generate_text(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
            )

    def _get_client(self, provider: str) -> Optional[AsyncOpenAI]:
        """Get the appropriate client for a provider."""
        if provider == "moonshot":
            return self._moonshot_client
        elif provider == "nvidia":
            return self._nvidia_client
        elif provider == "openai":
            return self._openai_client
        elif provider == "anthropic":
            # Anthropic uses its own client, not OpenAI-compatible
            return None
        elif provider == "bedrock":
            # Bedrock uses its own client, not OpenAI-compatible
            return None
        else:
            logger.warning("unknown_provider", provider=provider)
            # Fallback to moonshot (primary), then nvidia
            return self._moonshot_client or self._nvidia_client

    @property
    def has_anthropic(self) -> bool:
        """Check if direct Anthropic API is available."""
        return self._anthropic_client is not None

    @property
    def has_bedrock(self) -> bool:
        """Check if AWS Bedrock is available."""
        return self._bedrock_runtime is not None

    @property
    def has_moonshot(self) -> bool:
        """Check if Moonshot/Kimi K2 is available."""
        return self._moonshot_client is not None

    @property
    def has_nvidia(self) -> bool:
        """Check if NVIDIA is available."""
        return self._nvidia_client is not None

    @property
    def has_vision(self) -> bool:
        """Check if vision (OpenAI) is available."""
        return self._openai_client is not None

    @property
    def has_slm(self) -> bool:
        """Check if SLM (Groq) is available for cost-optimized tasks."""
        return self._groq_client is not None and settings.slm_enabled


# Global AI service instance
ai_service = AIService()
