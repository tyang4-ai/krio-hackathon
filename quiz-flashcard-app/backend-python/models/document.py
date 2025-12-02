"""
Document model for uploaded study materials.
"""
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class Document(BaseModel):
    """
    Document model for storing uploaded study materials.

    Supports: PDF, DOCX, DOC, TXT, MD files
    """

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )

    # File metadata
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)

    # Extracted content
    content_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Chapter/section metadata
    chapter: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Chunking status (for RAG pipeline)
    chunking_status: Mapped[Optional[str]] = mapped_column(String(20), default="pending", nullable=True)
    total_chunks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_tokens: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationship
    category = relationship("Category", backref="documents")

    def __repr__(self) -> str:
        return f"Document(id={self.id}, filename='{self.filename}')"
