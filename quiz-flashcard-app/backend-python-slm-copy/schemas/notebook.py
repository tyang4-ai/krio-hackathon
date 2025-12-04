"""
Pydantic schemas for Notebook API requests/responses.
"""
from typing import Optional, List

from pydantic import Field

from .base import BaseSchema, TimestampSchema


class NotebookEntryBase(BaseSchema):
    """Base schema for notebook entry data."""

    question_id: int = Field(..., description="Question ID")
    user_answer: str = Field(..., description="User's wrong answer")
    correct_answer: str = Field(..., description="Correct answer")
    notes: Optional[str] = Field(None, description="User notes for review")


class NotebookEntryCreate(NotebookEntryBase):
    """Schema for creating a notebook entry."""

    quiz_session_id: Optional[int] = None


class NotebookEntryUpdate(BaseSchema):
    """Schema for updating a notebook entry (all fields optional)."""

    notes: Optional[str] = None
    reviewed: Optional[bool] = None


class NotebookEntryResponse(NotebookEntryBase, TimestampSchema):
    """Schema for notebook entry response."""

    id: int
    category_id: int
    quiz_session_id: Optional[int] = None
    reviewed: bool = False

    # Joined question data
    question_text: Optional[str] = None
    options: Optional[List[str]] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None


class NotebookEntryListResponse(BaseSchema):
    """Schema for list of notebook entries response."""

    entries: List[NotebookEntryResponse]
    total: int


class NotebookStatsResponse(BaseSchema):
    """Statistics for notebook entries in a category."""

    total_entries: int
    reviewed_entries: int
    unreviewed_entries: int


class MostMissedQuestion(BaseSchema):
    """Question missed frequently."""

    id: int
    question_text: str
    difficulty: str
    times_missed: int


class MostMissedResponse(BaseSchema):
    """Response for most missed questions."""

    questions: List[MostMissedQuestion]
    total: int
