"""
Quiz session model for tracking quiz attempts.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class QuizSession(BaseModel):
    """
    Quiz session model for tracking quiz attempts and results.

    Supports modes: practice, timed, exam
    """

    __tablename__ = "quiz_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )

    # Session settings
    settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # Contains: mode (practice/timed/exam), time_limit, question_count, etc.

    # Questions and answers (JSON arrays)
    questions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    answers: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Results
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Timestamps
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship
    category = relationship("Category", backref="quiz_sessions")

    def __repr__(self) -> str:
        return f"QuizSession(id={self.id}, completed={self.completed})"
