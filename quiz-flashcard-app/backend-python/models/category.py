"""
Category model for organizing study content.
"""
from typing import Optional

from sqlalchemy import String, Text, Integer, ForeignKey
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
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="Folder")

    # User ownership - nullable for backward compatibility with existing data
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    # Relationships
    # user = relationship("User", back_populates="categories")

    def __repr__(self) -> str:
        return f"Category(id={self.id}, name='{self.name}')"
