"""
QuestionAttempt model for tracking individual question responses.

This enables detailed analytics:
- Per-question difficulty analysis
- User performance trends over time
- Time spent per question tracking
- Category/topic mastery calculation
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class QuestionAttempt(BaseModel):
    """
    Individual question attempt within a quiz session.

    Normalized table that replaces the JSON answers array in QuizSession
    for better analytics queries.
    """

    __tablename__ = "question_attempts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Foreign keys
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quiz_sessions.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )

    # Answer data
    user_answer: Mapped[str] = mapped_column(Text, nullable=False)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Partial credit support
    points_earned: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    points_possible: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)

    # Question metadata (denormalized for fast analytics)
    question_type: Mapped[str] = mapped_column(String(50), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)

    # Time tracking
    time_spent_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    # Additional data (AI feedback, etc.)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    session = relationship("QuizSession", backref="attempts")
    question = relationship("Question", backref="attempts")
    user = relationship("User", backref="question_attempts")
    category = relationship("Category", backref="question_attempts")

    def __repr__(self) -> str:
        return f"QuestionAttempt(id={self.id}, correct={self.is_correct})"

    @property
    def score_percentage(self) -> float:
        """Calculate percentage score for this attempt."""
        if self.points_possible == 0:
            return 0.0
        return (self.points_earned / self.points_possible) * 100
