"""Allow flexible embedding dimensions for different providers

Revision ID: 010
Revises: 009
Create Date: 2025-12-01

Changes the embedding column from vector(1536) to vector(1024)
to support Voyage AI and Moonshot embeddings.
Also clears existing embeddings so they can be regenerated.

Note: Mixing embeddings from different providers in the same dataset
is not recommended as similarity scores won't be comparable.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Change embedding column to 1024 dimensions for Voyage AI."""

    # Drop the existing HNSW index
    op.execute("DROP INDEX IF EXISTS idx_chunks_embedding")

    # Clear existing embeddings (they were 1536-dim, incompatible with 1024)
    op.execute(
        "UPDATE document_chunks "
        "SET embedding = NULL, embedding_status = 'pending'"
    )

    # Drop the old column and recreate with new dimension
    op.execute("ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding")
    op.execute(
        "ALTER TABLE document_chunks ADD COLUMN embedding vector(1024)"
    )

    # Recreate the HNSW index with cosine distance
    op.execute(
        "CREATE INDEX idx_chunks_embedding ON document_chunks "
        "USING hnsw (embedding vector_cosine_ops)"
    )

    # Add column to track embedding provider/dimension for each document
    op.execute(
        "ALTER TABLE documents "
        "ADD COLUMN IF NOT EXISTS embedding_provider VARCHAR(50)"
    )
    op.execute(
        "ALTER TABLE documents "
        "ADD COLUMN IF NOT EXISTS embedding_dimension INTEGER"
    )


def downgrade() -> None:
    """Revert to 1536-dimension vector."""

    # Drop the HNSW index
    op.execute("DROP INDEX IF EXISTS idx_chunks_embedding")

    # Drop provider tracking columns
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS embedding_dimension")
    op.execute("ALTER TABLE documents DROP COLUMN IF EXISTS embedding_provider")

    # Clear embeddings and recreate column with original dimension
    op.execute("ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding")
    op.execute(
        "ALTER TABLE document_chunks ADD COLUMN embedding vector(1536)"
    )

    # Reset embedding status
    op.execute(
        "UPDATE document_chunks SET embedding_status = 'pending'"
    )

    # Recreate the HNSW index
    op.execute(
        "CREATE INDEX idx_chunks_embedding ON document_chunks "
        "USING hnsw (embedding vector_cosine_ops)"
    )
