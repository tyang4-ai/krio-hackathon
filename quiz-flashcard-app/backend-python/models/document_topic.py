"""
Document topic model for topic hierarchy and concept mapping.

Research Basis:
- SuperRAG (arXiv:2503.04790v1): Knowledge graph structure preservation
- MC-Indexing (arXiv:2404.15103v1): Topic-based organization
"""
from typing import List, Optional

from sqlalchemy import ForeignKey, Integer, String, Float
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class DocumentTopic(BaseModel):
    """
    Topic within a document, supporting hierarchical organization.

    Topics form a tree structure with parent-child relationships,
    enabling both broad topic retrieval and focused sub-topic queries.
    """

    __tablename__ = "document_topics"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )

    # Topic hierarchy
    topic_name: Mapped[str] = mapped_column(String(500), nullable=False)
    parent_topic_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("document_topics.id", ondelete="SET NULL"), nullable=True
    )

    # Chunk associations
    chunk_ids: Mapped[Optional[List[int]]] = mapped_column(ARRAY(Integer), nullable=True)

    # Concept mapping (per SuperRAG knowledge graph approach)
    key_concepts: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    related_topics: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)

    # Metadata
    difficulty_estimate: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    importance_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    document = relationship("Document", backref="topics")
    parent = relationship("DocumentTopic", remote_side=[id], backref="children")

    def __repr__(self) -> str:
        return f"DocumentTopic(id={self.id}, name='{self.topic_name}')"

    @property
    def is_root_topic(self) -> bool:
        """Check if this is a root-level topic."""
        return self.parent_topic_id is None

    @property
    def chunk_count(self) -> int:
        """Number of chunks associated with this topic."""
        return len(self.chunk_ids) if self.chunk_ids else 0
