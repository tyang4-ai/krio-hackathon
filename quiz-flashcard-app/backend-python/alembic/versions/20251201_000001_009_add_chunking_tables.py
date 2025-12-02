"""Add pgvector extension and chunking tables for RAG pipeline

Revision ID: 009
Revises: 008
Create Date: 2025-12-01

Research Basis:
- MC-Indexing (arXiv:2404.15103v1): Content-aware chunking with multi-view indexing
- SCAN (arXiv:2505.14381v1): Coarse-grained chunking (800-1200 tokens)
- SuperRAG (arXiv:2503.04790v1): Knowledge graph structure preservation

Creates:
- pgvector extension for vector similarity search
- document_chunks: Semantic chunks with embeddings
- document_topics: Topic hierarchy and concept mapping
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Enable pgvector and create chunking tables."""

    # 1. Enable pgvector extension
    # Note: Requires RDS to have pgvector available (PostgreSQL 15+ or Aurora)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 2. Create document_chunks table
    op.create_table(
        "document_chunks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),

        # Content
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=True),
        sa.Column("start_char", sa.Integer(), nullable=True),
        sa.Column("end_char", sa.Integer(), nullable=True),

        # Metadata
        sa.Column("section_title", sa.String(500), nullable=True),
        sa.Column("chunk_type", sa.String(50), nullable=False, server_default="text"),
        sa.Column("page_numbers", postgresql.ARRAY(sa.Integer()), nullable=True),

        # Topic tagging (multi-topic support per MC-Indexing research)
        sa.Column("topics", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("primary_topic", sa.String(500), nullable=True),
        sa.Column("key_concepts", postgresql.ARRAY(sa.Text()), nullable=True),

        # Vector embedding (OpenAI ada-002 = 1536 dimensions)
        # Using raw SQL for vector type since SQLAlchemy doesn't have native support
        sa.Column("embedding_status", sa.String(20), nullable=False, server_default="pending"),

        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),

        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["document_id"], ["documents.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint("document_id", "chunk_index", name="uq_document_chunk_index"),
    )

    # Add vector column separately (pgvector specific)
    op.execute(
        "ALTER TABLE document_chunks ADD COLUMN embedding vector(1536)"
    )

    # Create indexes
    op.create_index("idx_chunks_document_id", "document_chunks", ["document_id"])
    op.create_index("idx_chunks_primary_topic", "document_chunks", ["primary_topic"])
    op.create_index("idx_chunks_embedding_status", "document_chunks", ["embedding_status"])

    # Vector index for similarity search (IVFFlat for large datasets)
    # Note: IVFFlat requires data to be present before creating, so we use a simpler index
    op.execute(
        "CREATE INDEX idx_chunks_embedding ON document_chunks "
        "USING hnsw (embedding vector_cosine_ops)"
    )

    # 3. Create document_topics table (for concept mapping per SuperRAG)
    op.create_table(
        "document_topics",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),

        # Topic hierarchy
        sa.Column("topic_name", sa.String(500), nullable=False),
        sa.Column("parent_topic_id", sa.Integer(), nullable=True),

        # Chunk associations
        sa.Column("chunk_ids", postgresql.ARRAY(sa.Integer()), nullable=True),

        # Concept mapping (per SuperRAG knowledge graph approach)
        sa.Column("key_concepts", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("related_topics", postgresql.ARRAY(sa.Text()), nullable=True),

        # Metadata
        sa.Column("difficulty_estimate", sa.String(20), nullable=True),
        sa.Column("importance_score", sa.Float(), nullable=True),

        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),

        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["document_id"], ["documents.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["parent_topic_id"], ["document_topics.id"], ondelete="SET NULL"
        ),
    )

    # Create indexes for topics
    op.create_index("idx_topics_document_id", "document_topics", ["document_id"])
    op.create_index("idx_topics_topic_name", "document_topics", ["topic_name"])
    op.create_index("idx_topics_parent_id", "document_topics", ["parent_topic_id"])

    # 4. Create document_concept_map table for cross-document concept relationships
    op.create_table(
        "document_concept_maps",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),

        # The full concept map as JSONB
        # Structure: {"concept_name": {"chunk_ids": [1,2], "related": ["other_concept"]}}
        sa.Column(
            "concept_map",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),

        # Stats
        sa.Column("total_concepts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_relationships", sa.Integer(), nullable=False, server_default="0"),

        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),

        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["document_id"], ["documents.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint("document_id", name="uq_document_concept_map"),
    )

    # 5. Add chunking status to documents table
    op.add_column(
        "documents",
        sa.Column("chunking_status", sa.String(20), nullable=True, server_default="pending")
    )
    op.add_column(
        "documents",
        sa.Column("total_chunks", sa.Integer(), nullable=True)
    )
    op.add_column(
        "documents",
        sa.Column("total_tokens", sa.Integer(), nullable=True)
    )


def downgrade() -> None:
    """Remove chunking tables and pgvector extension."""

    # Remove columns from documents
    op.drop_column("documents", "total_tokens")
    op.drop_column("documents", "total_chunks")
    op.drop_column("documents", "chunking_status")

    # Drop tables in reverse order
    op.drop_table("document_concept_maps")
    op.drop_table("document_topics")
    op.drop_table("document_chunks")

    # Note: We don't drop the pgvector extension as other tables may use it
    # op.execute("DROP EXTENSION IF EXISTS vector")
