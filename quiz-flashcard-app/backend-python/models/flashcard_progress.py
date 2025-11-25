"""
Flashcard progress model for spaced repetition tracking.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class FlashcardProgress(BaseModel):
    """
    Track flashcard review progress for spaced repetition.
    """

    __tablename__ = "flashcard_progress"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    flashcard_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("flashcards.id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )

    # Progress tracking
    confidence_level: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    times_reviewed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Scheduling
    last_reviewed: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    next_review: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    flashcard = relationship("Flashcard", backref="progress")
    category = relationship("Category", backref="flashcard_progress")

    def __repr__(self) -> str:
        return f"FlashcardProgress(id={self.id}, confidence={self.confidence_level})"
