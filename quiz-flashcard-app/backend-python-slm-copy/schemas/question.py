"""
Pydantic schemas for Question API requests/responses.
"""
from datetime import datetime
from typing import Optional, List, Any

from pydantic import Field

from .base import BaseSchema, TimestampSchema


class QuestionBase(BaseSchema):
    """Base schema for question data."""

    question_text: str = Field(..., min_length=1, description="Question text")
    question_type: str = Field(
        "multiple_choice",
        description="Type: multiple_choice, true_false, written_answer, fill_in_blank",
    )
    difficulty: str = Field("medium", description="Difficulty: easy, medium, hard")
    options: Optional[List[str]] = Field(None, description="Answer options for multiple choice")
    correct_answer: str = Field(..., description="Correct answer")
    explanation: Optional[str] = Field(None, description="Explanation for the answer")
    tags: Optional[List[str]] = Field(None, description="Tags for categorization")


class QuestionCreate(QuestionBase):
    """Schema for creating a question."""

    document_id: Optional[int] = None


class QuestionUpdate(BaseSchema):
    """Schema for updating a question (all fields optional)."""

    question_text: Optional[str] = None
    question_type: Optional[str] = None
    difficulty: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    tags: Optional[List[str]] = None


class QuestionResponse(QuestionBase, TimestampSchema):
    """Schema for question response."""

    id: int
    category_id: int
    document_id: Optional[int] = None
    rating: Optional[float] = None


class QuestionListResponse(BaseSchema):
    """Schema for list of questions response."""

    questions: List[QuestionResponse]
    total: int


class QuestionStatsResponse(BaseSchema):
    """Statistics for questions in a category."""

    total: int
    easy: int
    medium: int
    hard: int
    by_type: dict  # {"multiple_choice": 10, "true_false": 5, ...}


class RateQuestionRequest(BaseSchema):
    """Request to rate a question."""

    rating: float = Field(..., ge=1, le=5, description="Rating 1-5")
