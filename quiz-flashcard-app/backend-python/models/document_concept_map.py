"""
Document concept map model for cross-concept relationships.

Research Basis:
- SuperRAG (arXiv:2503.04790v1): Knowledge graph structure
- KAG System: Knowledge-augmented generation
"""
from typing import Dict, Any, Optional

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class DocumentConceptMap(BaseModel):
    """
    Stores the concept map for a document, showing relationships between concepts.

    The concept map is a graph structure stored as JSONB:
    {
        "mitochondria": {
            "chunk_ids": [1, 2, 5],
            "related": ["ATP", "cellular_respiration", "energy"]
        },
        "ATP": {
            "chunk_ids": [2, 3],
            "related": ["mitochondria", "energy", "metabolism"]
        }
    }

    This enables:
    - Finding all chunks that mention a concept
    - Discovering related concepts for query expansion
    - Building knowledge graphs for better RAG retrieval
    """

    __tablename__ = "document_concept_maps"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    # The full concept map as JSONB
    concept_map: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, default=dict, nullable=False
    )

    # Stats
    total_concepts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_relationships: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationship
    document = relationship("Document", backref="concept_map")

    def __repr__(self) -> str:
        return f"DocumentConceptMap(doc={self.document_id}, concepts={self.total_concepts})"

    def get_concept(self, concept_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific concept."""
        return self.concept_map.get(concept_name)

    def get_related_concepts(self, concept_name: str) -> list:
        """Get concepts related to a given concept."""
        concept = self.concept_map.get(concept_name)
        if concept:
            return concept.get("related", [])
        return []

    def get_chunks_for_concept(self, concept_name: str) -> list:
        """Get chunk IDs that contain a given concept."""
        concept = self.concept_map.get(concept_name)
        if concept:
            return concept.get("chunk_ids", [])
        return []

    def add_concept(
        self,
        concept_name: str,
        chunk_ids: list,
        related: list = None
    ) -> None:
        """Add or update a concept in the map."""
        if concept_name not in self.concept_map:
            self.total_concepts += 1

        existing_related = []
        if concept_name in self.concept_map:
            existing_related = self.concept_map[concept_name].get("related", [])

        new_related = list(set(existing_related + (related or [])))
        self.total_relationships = sum(
            len(c.get("related", [])) for c in self.concept_map.values()
        )

        self.concept_map[concept_name] = {
            "chunk_ids": list(set(chunk_ids)),
            "related": new_related
        }
