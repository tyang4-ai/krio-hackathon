"""
Handwriting recognition models for handwritten answer support.
"""
from typing import Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class HandwrittenAnswer(BaseModel):
    """
    Store handwritten answer submissions with OCR results.
    """

    __tablename__ = "handwritten_answers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("quiz_sessions.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )

    # File storage
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # OCR results
    recognized_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # User corrections (for learning)
    user_corrections: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    # Relationships
    session = relationship("QuizSession", backref="handwritten_answers")
    question = relationship("Question", backref="handwritten_answers")

    def __repr__(self) -> str:
        return f"HandwrittenAnswer(id={self.id}, confidence={self.confidence_score})"


class HandwritingCorrection(BaseModel):
    """
    Store handwriting corrections for OCR learning.
    """

    __tablename__ = "handwriting_corrections"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )

    # Correction data
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    corrected_text: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    category = relationship("Category", backref="handwriting_corrections")

    def __repr__(self) -> str:
        return f"HandwritingCorrection(id={self.id})"
