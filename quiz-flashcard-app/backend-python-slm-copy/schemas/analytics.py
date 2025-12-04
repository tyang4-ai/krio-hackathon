"""
Pydantic schemas for analytics API.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class OverviewResponse(BaseModel):
    """Overall analytics summary."""
    total_attempts: int = Field(description="Total questions attempted")
    correct_count: int = Field(description="Number of correct answers")
    accuracy: float = Field(description="Accuracy percentage (0-100)")
    total_time_minutes: float = Field(description="Total study time in minutes")
    avg_time_per_question: float = Field(description="Average seconds per question")
    sessions_completed: int = Field(description="Completed quiz sessions")
    streak_days: int = Field(description="Current study streak")
    period_days: int = Field(description="Analysis period in days")


class CategoryPerformance(BaseModel):
    """Performance for a single category."""
    category_id: int
    category_name: str
    color: str
    total_attempts: int
    correct_count: int
    accuracy: float
    avg_time: float
    mastery_score: int = Field(ge=0, le=5, description="Mastery level 0-5")


class DifficultyBreakdown(BaseModel):
    """Performance for a difficulty level."""
    total: int
    correct: int
    accuracy: float


class QuestionTypeBreakdown(BaseModel):
    """Performance for a question type."""
    total: int
    correct: int
    accuracy: float
    avg_time: float


class TrendDataPoint(BaseModel):
    """Single data point in trend."""
    date: Optional[str]
    attempts: int
    correct: int
    accuracy: float


class HardestQuestion(BaseModel):
    """Question user struggles with."""
    question_id: int
    question_text: str
    question_type: str
    difficulty: str
    attempts: int
    correct: int
    accuracy: float


class LearningScore(BaseModel):
    """AI-calculated learning score."""
    total_score: float = Field(ge=0, le=100)
    accuracy_score: float
    consistency_score: float
    improvement_score: float
    difficulty_score: float
    grade: str = Field(description="Letter grade A+ to F")
    recommendation: str = Field(description="Personalized study recommendation")


class QuestionAttemptCreate(BaseModel):
    """Create a new question attempt."""
    session_id: int
    question_id: int
    category_id: int
    user_answer: str
    correct_answer: str
    is_correct: bool
    points_earned: float = 1.0
    points_possible: float = 1.0
    question_type: str
    difficulty: str
    time_spent_seconds: Optional[int] = None
    feedback: Optional[str] = None


class QuestionAttemptResponse(BaseModel):
    """Question attempt response."""
    id: int
    session_id: int
    question_id: int
    user_id: Optional[int]
    category_id: int
    user_answer: str
    correct_answer: str
    is_correct: bool
    points_earned: float
    points_possible: float
    question_type: str
    difficulty: str
    time_spent_seconds: Optional[int]
    answered_at: datetime
    feedback: Optional[str]

    class Config:
        from_attributes = True


class AnalyticsDashboardResponse(BaseModel):
    """Complete analytics dashboard data."""
    overview: OverviewResponse
    category_performance: list[CategoryPerformance]
    difficulty_breakdown: dict[str, DifficultyBreakdown]
    question_type_breakdown: dict[str, QuestionTypeBreakdown]
    trend_data: list[TrendDataPoint]
    hardest_questions: list[HardestQuestion]
    learning_score: LearningScore
