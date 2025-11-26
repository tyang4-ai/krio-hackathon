"""
Pydantic schemas for Sample Question API requests/responses.
"""
from typing import Optional, List

from pydantic import Field

from .base import BaseSchema, TimestampSchema


class SampleQuestionBase(BaseSchema):
    """Base schema for sample question data."""

    question_text: str = Field(..., min_length=1, description="Question text")
    question_type: str = Field(
        "multiple_choice",
        description="Type: multiple_choice, true_false, written_answer, fill_in_blank",
    )
    options: Optional[List[str]] = Field(None, description="Answer options")
    correct_answer: str = Field(..., description="Correct answer")
    explanation: Optional[str] = Field(None, description="Explanation for the answer")
    tags: Optional[List[str]] = Field(None, description="Tags for categorization")


class SampleQuestionCreate(SampleQuestionBase):
    """Schema for creating a sample question."""

    pass


class SampleQuestionUpdate(BaseSchema):
    """Schema for updating a sample question (all fields optional)."""

    question_text: Optional[str] = None
    question_type: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    tags: Optional[List[str]] = None


class SampleQuestionResponse(SampleQuestionBase, TimestampSchema):
    """Schema for sample question response."""

    id: int
    category_id: int


class SampleQuestionListResponse(BaseSchema):
    """Schema for list of sample questions response."""

    samples: List[SampleQuestionResponse]
    total: int


class SampleQuestionCountResponse(BaseSchema):
    """Response for sample question count."""

    count: int


class SampleQuestionUploadResponse(BaseSchema):
    """Response for file upload."""

    success: bool
    message: str
    samples: List[SampleQuestionResponse]
    skipped: int


# AI Analysis schemas


class AnalysisStatusResponse(BaseSchema):
    """Response for analysis status."""

    category_id: int
    status: str  # pending, analyzing, completed, error
    progress: Optional[float] = None
    result: Optional[dict] = None
    error: Optional[str] = None


class TriggerAnalysisResponse(BaseSchema):
    """Response after triggering analysis."""

    success: bool
    message: str
    analysis_id: Optional[int] = None


class AgentActivityItem(BaseSchema):
    """Single agent activity log item."""

    id: int
    agent_type: str
    action: str
    timestamp: str
    details: Optional[dict] = None


class AgentActivityResponse(BaseSchema):
    """Response for agent activity."""

    activities: List[AgentActivityItem]
    total: int
