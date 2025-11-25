"""
Notebook entry model for tracking wrong answers.
"""
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class NotebookEntry(BaseModel):
    """
    Notebook entry model for tracking wrong answers for review.
    """

    __tablename__ = "notebook_entries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    quiz_session_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("quiz_sessions.id", ondelete="SET NULL"), nullable=True
    )

    # Answer data
    user_answer: Mapped[str] = mapped_column(Text, nullable=False)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)

    # Review tracking
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    category = relationship("Category", backref="notebook_entries")
    question = relationship("Question", backref="notebook_entries")
    quiz_session = relationship("QuizSession", backref="notebook_entries")

    def __repr__(self) -> str:
        return f"NotebookEntry(id={self.id}, reviewed={self.reviewed})"
