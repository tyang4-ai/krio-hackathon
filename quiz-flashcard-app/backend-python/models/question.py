"""
Question model for quiz questions.
"""
from typing import Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class Question(BaseModel):
    """
    Question model for quiz questions.

    Supports types: multiple_choice, true_false, written, fill_in_blank
    """

    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    document_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )

    # Question content
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="multiple_choice"
    )
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")

    # Answer data (JSON for flexibility)
    options: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # For multiple choice
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    category = relationship("Category", backref="questions")
    document = relationship("Document", backref="questions")

    def __repr__(self) -> str:
        return f"Question(id={self.id}, type='{self.question_type}')"
