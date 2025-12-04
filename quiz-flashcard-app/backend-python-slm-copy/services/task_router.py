"""
Task Router Service - Routes AI tasks to appropriate model tier.

Phase 4: SLM Integration

Quality-critical tasks stay on Claude, simple tasks use SLM for cost savings.

Task Routing Strategy:
- ALL question generation -> Claude (quality of distractors & accuracy critical)
- Chapter boundary detection -> Claude (semantic understanding needed)
- Document organization -> Claude (affects downstream RAG quality)
- Quality scoring/validation -> Claude (8-dimension judgment)
- Written answer grading -> Claude (partial credit logic)
- Sample pattern extraction -> Claude (complex style inference)
- MCQ/T-F grading -> Hardcoded (already uses string comparison)
- Simple flashcards -> SLM 8B (term->definition is structured)
- Short explanations -> SLM 70B (basic tutoring)
"""
from enum import Enum
from typing import Optional, Tuple

import structlog

from config import settings

logger = structlog.get_logger()


class ModelTier(str, Enum):
    """Model tiers for task routing."""
    SLM_SMALL = "slm_small"   # Llama 3.1 8B (~800 tok/s, $0.05/$0.08 per 1M)
    SLM_LARGE = "slm_large"   # Llama 3.1 70B (~250 tok/s, $0.59/$0.79 per 1M)
    LLM = "llm"               # Claude Haiku (~150 tok/s, $0.80/$4.00 per 1M)
    HARDCODED = "hardcoded"   # No AI needed (string comparison)


class TaskType(str, Enum):
    """Task types for routing decisions."""
    # Quality-critical tasks (always use Claude)
    QUESTION_GENERATION = "question_generation"
    CHAPTER_DETECTION = "chapter_detection"
    DOCUMENT_ORGANIZATION = "document_organization"
    QUALITY_SCORING = "quality_scoring"
    WRITTEN_GRADING = "written_grading"
    SAMPLE_EXTRACTION = "sample_extraction"

    # Tasks that don't need AI
    MCQ_GRADING = "mcq_grading"
    TF_GRADING = "tf_grading"

    # Simple tasks (can use SLM)
    FLASHCARD_VOCABULARY = "flashcard_vocabulary"
    SHORT_EXPLANATION = "short_explanation"


class TaskRouter:
    """
    Routes tasks to appropriate model tier.

    Quality-critical tasks stay on Claude, simple tasks use SLM.
    """

    # Task routing configuration
    TASK_ROUTING = {
        # === QUALITY-CRITICAL: Always use Claude ===
        TaskType.QUESTION_GENERATION: ModelTier.LLM,
        TaskType.CHAPTER_DETECTION: ModelTier.LLM,
        TaskType.DOCUMENT_ORGANIZATION: ModelTier.LLM,
        TaskType.QUALITY_SCORING: ModelTier.LLM,
        TaskType.WRITTEN_GRADING: ModelTier.LLM,
        TaskType.SAMPLE_EXTRACTION: ModelTier.LLM,

        # === NO AI NEEDED: Hardcoded logic ===
        TaskType.MCQ_GRADING: ModelTier.HARDCODED,
        TaskType.TF_GRADING: ModelTier.HARDCODED,

        # === SAFE FOR SLM: Low-risk, structured tasks ===
        TaskType.FLASHCARD_VOCABULARY: ModelTier.SLM_SMALL,
        TaskType.SHORT_EXPLANATION: ModelTier.SLM_LARGE,
    }

    def get_model_tier(self, task_type: TaskType) -> ModelTier:
        """
        Get the model tier for a task type.

        Args:
            task_type: The type of task

        Returns:
            Model tier to use
        """
        tier = self.TASK_ROUTING.get(task_type, ModelTier.LLM)

        # If SLM is disabled, fall back to LLM for SLM tasks
        if not settings.slm_enabled and tier in (ModelTier.SLM_SMALL, ModelTier.SLM_LARGE):
            logger.info(
                "slm_disabled_fallback",
                task_type=task_type.value,
                original_tier=tier.value,
                fallback_tier=ModelTier.LLM.value,
            )
            return ModelTier.LLM

        return tier

    def should_use_slm(self, task_type: TaskType) -> bool:
        """
        Check if a task should use SLM.

        Args:
            task_type: The type of task

        Returns:
            True if task should use SLM
        """
        if not settings.slm_enabled:
            return False

        tier = self.TASK_ROUTING.get(task_type, ModelTier.LLM)
        return tier in (ModelTier.SLM_SMALL, ModelTier.SLM_LARGE)

    def should_use_large_slm(self, task_type: TaskType) -> bool:
        """
        Check if a task should use the large SLM model (70B).

        Args:
            task_type: The type of task

        Returns:
            True if task should use 70B model
        """
        tier = self.get_model_tier(task_type)
        return tier == ModelTier.SLM_LARGE

    def get_routing_info(self, task_type: TaskType) -> dict:
        """
        Get detailed routing info for a task.

        Args:
            task_type: The type of task

        Returns:
            Dict with routing details
        """
        tier = self.get_model_tier(task_type)

        model_info = {
            ModelTier.SLM_SMALL: {
                "provider": "groq",
                "model": settings.groq_model_small,
                "cost_per_1m_input": 0.05,
                "cost_per_1m_output": 0.08,
                "speed_tok_s": 800,
            },
            ModelTier.SLM_LARGE: {
                "provider": "groq",
                "model": settings.groq_model_large,
                "cost_per_1m_input": 0.59,
                "cost_per_1m_output": 0.79,
                "speed_tok_s": 250,
            },
            ModelTier.LLM: {
                "provider": settings.ai_provider,
                "model": settings.anthropic_model if settings.ai_provider == "anthropic" else settings.bedrock_model,
                "cost_per_1m_input": 0.80,
                "cost_per_1m_output": 4.00,
                "speed_tok_s": 150,
            },
            ModelTier.HARDCODED: {
                "provider": "none",
                "model": "hardcoded_logic",
                "cost_per_1m_input": 0,
                "cost_per_1m_output": 0,
                "speed_tok_s": float("inf"),
            },
        }

        info = model_info.get(tier, model_info[ModelTier.LLM])
        info["tier"] = tier.value
        info["task_type"] = task_type.value
        info["slm_enabled"] = settings.slm_enabled

        return info

    def log_routing_decision(self, task_type: TaskType, context: Optional[str] = None) -> None:
        """
        Log a routing decision for monitoring.

        Args:
            task_type: The type of task
            context: Optional context about the task
        """
        info = self.get_routing_info(task_type)

        logger.info(
            "task_routing_decision",
            task_type=task_type.value,
            tier=info["tier"],
            provider=info["provider"],
            model=info["model"],
            context=context,
        )


# Global task router instance
task_router = TaskRouter()
