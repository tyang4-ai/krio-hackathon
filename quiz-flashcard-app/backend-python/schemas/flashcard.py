"""
Pydantic schemas for Flashcard API requests/responses.
"""
from datetime import datetime
from typing import Optional, List

from pydantic import Field

from .base import BaseSchema, TimestampSchema


class FlashcardBase(BaseSchema):
    """Base schema for flashcard data."""

    front_text: str = Field(..., min_length=1, description="Front side of flashcard")
    back_text: str = Field(..., min_length=1, description="Back side of flashcard")
    difficulty: str = Field("medium", description="easy, medium, hard")
    tags: Optional[List[str]] = Field(None, description="Tags for categorization")


class FlashcardCreate(FlashcardBase):
    """Schema for creating a flashcard."""

    document_id: Optional[int] = None


class FlashcardUpdate(BaseSchema):
    """Schema for updating a flashcard (all fields optional)."""

    front_text: Optional[str] = None
    back_text: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None


class FlashcardResponse(FlashcardBase, TimestampSchema):
    """Schema for flashcard response."""

    id: int
    category_id: int
    document_id: Optional[int] = None
    rating: Optional[float] = None


class FlashcardListResponse(BaseSchema):
    """Schema for list of flashcards response."""

    flashcards: List[FlashcardResponse]
    total: int


class FlashcardProgressResponse(BaseSchema):
    """Schema for flashcard progress (spaced repetition)."""

    flashcard_id: int
    confidence_level: float
    times_reviewed: int
    last_reviewed: Optional[datetime] = None
    next_review: Optional[datetime] = None


class FlashcardWithProgressResponse(FlashcardResponse):
    """Flashcard with progress data."""

    progress: Optional[FlashcardProgressResponse] = None


class FlashcardStatsResponse(BaseSchema):
    """Statistics for flashcards in a category."""

    total: int
    by_difficulty: dict  # {"easy": 10, "medium": 20, "hard": 5}
    reviewed: int
    average_confidence: float


class UpdateProgressRequest(BaseSchema):
    """Request to update flashcard progress."""

    confidence_level: float = Field(..., ge=0, le=5, description="Confidence 0-5")


class RateFlashcardRequest(BaseSchema):
    """Request to rate a flashcard."""

    rating: float = Field(..., ge=1, le=5, description="Rating 1-5")
