"""
Flashcard model for study flashcards.
"""
from typing import Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class Flashcard(BaseModel):
    """
    Flashcard model for study cards with spaced repetition support.
    """

    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    document_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )

    # Flashcard content
    front_text: Mapped[str] = mapped_column(Text, nullable=False)
    back_text: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")

    # Metadata
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    category = relationship("Category", backref="flashcards")
    document = relationship("Document", backref="flashcards")

    def __repr__(self) -> str:
        return f"Flashcard(id={self.id}, front='{self.front_text[:30]}...')"
