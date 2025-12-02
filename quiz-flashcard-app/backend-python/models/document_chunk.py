"""
Document chunk model for semantic chunking and RAG pipeline.

Research Basis:
- MC-Indexing (arXiv:2404.15103v1): Multi-topic tagging per chunk
- SCAN (arXiv:2505.14381v1): Coarse-grained chunking (800-1200 tokens)
"""
from typing import List, Optional

from sqlalchemy import ForeignKey, Integer, String, Text, Float
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class DocumentChunk(BaseModel):
    """
    Semantic chunk of a document with embedding support.

    Chunks are 800-1200 tokens with 100-token overlap between adjacent chunks.
    Each chunk can be tagged with multiple topics for better retrieval.
    """

    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)

    # Content
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    start_char: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    end_char: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Metadata
    section_title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    chunk_type: Mapped[str] = mapped_column(String(50), default="text", nullable=False)
    page_numbers: Mapped[Optional[List[int]]] = mapped_column(ARRAY(Integer), nullable=True)

    # Topic tagging (multi-topic support per MC-Indexing research)
    topics: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)
    primary_topic: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    key_concepts: Mapped[Optional[List[str]]] = mapped_column(ARRAY(Text), nullable=True)

    # Embedding status (embedding column is vector type, handled separately)
    embedding_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)

    # Note: The 'embedding' column is of type vector(1024) and is not directly mapped
    # Use raw SQL queries with pgvector for similarity search
    # Supports Voyage AI (1024 dims) and Moonshot (1024 dims)

    # Relationship
    document = relationship("Document", backref="chunks")

    def __repr__(self) -> str:
        return f"DocumentChunk(id={self.id}, doc={self.document_id}, index={self.chunk_index})"

    @property
    def has_embedding(self) -> bool:
        """Check if this chunk has a generated embedding."""
        return self.embedding_status == "complete"
