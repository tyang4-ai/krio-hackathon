"""
Grading models for partial credit and exam integrity.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class PartialCreditGrade(BaseModel):
    """
    Store detailed partial credit grading results.
    """

    __tablename__ = "partial_credit_grades"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quiz_sessions.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )

    # Grading results
    total_points: Mapped[float] = mapped_column(Float, nullable=False)
    earned_points: Mapped[float] = mapped_column(Float, nullable=False)

    # Detailed breakdown (JSON)
    breakdown: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # Contains: component scores, rubric criteria, point deductions

    # Feedback
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    session = relationship("QuizSession", backref="partial_credit_grades")
    question = relationship("Question", backref="partial_credit_grades")

    @property
    def percentage(self) -> float:
        """Calculate grade percentage."""
        if self.total_points == 0:
            return 0.0
        return (self.earned_points / self.total_points) * 100

    def __repr__(self) -> str:
        return f"PartialCreditGrade(id={self.id}, {self.earned_points}/{self.total_points})"


class ExamFocusEvent(BaseModel):
    """
    Track exam integrity events (focus loss, tab switches, etc.).
    """

    __tablename__ = "exam_focus_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quiz_sessions.id", ondelete="CASCADE"), nullable=False
    )

    # Event data
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # Types: focus_lost, tab_switch, window_blur

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    # Additional details
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationship
    session = relationship("QuizSession", backref="focus_events")

    def __repr__(self) -> str:
        return f"ExamFocusEvent(id={self.id}, type='{self.event_type}')"
