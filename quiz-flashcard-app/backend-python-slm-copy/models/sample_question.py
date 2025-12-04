"""
Sample question model for AI learning/style matching.
"""
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class SampleQuestion(BaseModel):
    """
    Sample questions uploaded by users for AI to learn from.

    These are used by the Analysis Agent to detect patterns
    and by the Generation Agent to match question styles.
    """

    __tablename__ = "sample_questions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )

    # Question content
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="multiple_choice"
    )

    # Answer data
    options: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    # Relationship
    category = relationship("Category", backref="sample_questions")

    def __repr__(self) -> str:
        return f"SampleQuestion(id={self.id}, type='{self.question_type}')"
