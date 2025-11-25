"""
Category model for organizing study content.
"""
from typing import Optional

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class Category(BaseModel):
    """
    Category model for grouping study content.

    A category contains:
    - Documents (uploaded study materials)
    - Questions (generated quiz questions)
    - Flashcards (study flashcards)
    - Notebook entries (wrong answers for review)
    """

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="#3B82F6")

    # Relationships (will be populated as other models are added)
    # documents = relationship("Document", back_populates="category", cascade="all, delete-orphan")
    # questions = relationship("Question", back_populates="category", cascade="all, delete-orphan")
    # flashcards = relationship("Flashcard", back_populates="category", cascade="all, delete-orphan")
    # notebook_entries = relationship("NotebookEntry", back_populates="category", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"Category(id={self.id}, name='{self.name}')"
