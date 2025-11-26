"""
Pydantic schemas for Quiz Session API requests/responses.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import Field

from .base import BaseSchema
from .question import QuestionResponse


class QuizSettings(BaseSchema):
    """Settings for creating a quiz session."""

    mode: str = Field("practice", description="Quiz mode: practice, timed, exam")
    difficulty: Optional[str] = Field(None, description="Difficulty filter: easy, medium, hard, mixed")
    selection_mode: str = Field("mixed", description="Question selection: mixed or custom")
    total_questions: int = Field(10, ge=1, le=100, description="Total questions for mixed mode")

    # Custom mode: specify counts per question type
    multiple_choice: int = Field(0, ge=0, description="Number of multiple choice questions")
    true_false: int = Field(0, ge=0, description="Number of true/false questions")
    written_answer: int = Field(0, ge=0, description="Number of written answer questions")
    fill_in_blank: int = Field(0, ge=0, description="Number of fill-in-blank questions")

    # Timed mode
    time_limit: Optional[int] = Field(None, description="Time limit in minutes (for timed mode)")


class QuizQuestionResponse(BaseSchema):
    """Question data returned in quiz (without correct answer)."""

    id: int
    question_text: str
    question_type: str
    difficulty: str
    options: Optional[List[str]] = None


class CreateQuizResponse(BaseSchema):
    """Response when creating a new quiz session."""

    session_id: int
    questions: List[QuizQuestionResponse]
    total_questions: int
    settings: QuizSettings


class SubmitQuizRequest(BaseSchema):
    """Request to submit quiz answers."""

    answers: Dict[str, str] = Field(..., description="Map of question_id to user answer")


class QuizResultItem(BaseSchema):
    """Result for a single question."""

    question_id: int
    question_text: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    explanation: Optional[str] = None
    options: Optional[List[str]] = None


class SubmitQuizResponse(BaseSchema):
    """Response after submitting quiz."""

    session_id: int
    score: int
    total: int
    percentage: float
    results: List[QuizResultItem]


class QuizHistoryItem(BaseSchema):
    """Quiz session history item."""

    id: int
    category_id: int
    settings: QuizSettings
    score: Optional[float] = None
    total_questions: int
    completed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None


class QuizHistoryResponse(BaseSchema):
    """Response for quiz history."""

    sessions: List[QuizHistoryItem]
    total: int


# Exam mode - Focus events


class FocusEventCreate(BaseSchema):
    """Request to record a focus event."""

    event_type: str = Field(..., description="Type: focus_lost, tab_switch, window_blur")
    details: Optional[dict] = Field(None, description="Additional event details")


class FocusEventResponse(BaseSchema):
    """Focus event response."""

    id: int
    session_id: int
    event_type: str
    timestamp: datetime
    details: Optional[dict] = None


class ExamIntegrityReport(BaseSchema):
    """Exam integrity report."""

    session_id: int
    total_violations: int
    focus_lost_count: int
    tab_switch_count: int
    window_blur_count: int
    integrity_score: int
    events: List[FocusEventResponse]


# Enhanced grading with partial credit


class GradingResultItem(BaseSchema):
    """Result for a single question with partial credit support."""

    question_id: int
    user_answer: str
    is_correct: bool
    earned_points: float
    total_points: float
    breakdown: List[dict]
    feedback: str
    partial_credit: bool
    handwritten: Optional[dict] = None


class SubmitQuizWithGradingRequest(BaseSchema):
    """Request to submit quiz with enhanced grading."""

    answers: Dict[str, str] = Field(..., description="Map of question_id to user answer")
    use_partial_credit: bool = Field(False, description="Enable partial credit grading")


class SubmitQuizWithGradingResponse(BaseSchema):
    """Response after submitting quiz with grading."""

    session_id: int
    score: int
    total: float
    percentage: float
    results: List[GradingResultItem]
    integrity_report: Optional[ExamIntegrityReport] = None
