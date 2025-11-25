"""
User preferences and performance tracking models.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class UserPreference(BaseModel):
    """
    Key-value store for user preferences per category.
    """

    __tablename__ = "user_preferences"
    __table_args__ = (
        UniqueConstraint("category_id", "preference_key", name="uq_category_preference"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )

    # Key-value pair
    preference_key: Mapped[str] = mapped_column(String(100), nullable=False)
    preference_value: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationship
    category = relationship("Category", backref="user_preferences")

    def __repr__(self) -> str:
        return f"UserPreference(id={self.id}, key='{self.preference_key}')"


class QuestionPerformance(BaseModel):
    """
    Track user performance on individual questions.

    Used for identifying weak areas and personalizing AI generation.
    """

    __tablename__ = "question_performance"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )

    # Performance data
    times_answered: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    times_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_answered: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    question = relationship("Question", backref="performance")
    category = relationship("Category", backref="question_performance")

    @property
    def accuracy(self) -> float:
        """Calculate accuracy percentage."""
        if self.times_answered == 0:
            return 0.0
        return (self.times_correct / self.times_answered) * 100

    def __repr__(self) -> str:
        return f"QuestionPerformance(id={self.id}, accuracy={self.accuracy:.1f}%)"
