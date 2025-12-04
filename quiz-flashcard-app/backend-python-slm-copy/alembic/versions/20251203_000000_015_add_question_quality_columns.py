"""Add quality scoring columns to questions table.

Revision ID: 015
Revises: 014
Create Date: 2025-12-03

Phase 3 RAG Pipeline: Add columns for storing question quality metadata.
- quality_score: Weighted overall quality score (1-5)
- bloom_level: Bloom's taxonomy level (remember, understand, apply, etc.)
- quality_scores: Detailed scores per dimension (JSONB)

These enable filtering by quality and tracking generation improvements.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add quality scoring columns to questions."""

    # quality_score: Weighted overall quality score (1.0 - 5.0)
    # Based on 8-dimension scoring with QUALITY_WEIGHTS
    op.add_column(
        'questions',
        sa.Column('quality_score', sa.Float, nullable=True)
    )

    # bloom_level: Bloom's taxonomy level
    # Values: remember, understand, apply, analyze, evaluate, create
    op.add_column(
        'questions',
        sa.Column('bloom_level', sa.String(20), nullable=True)
    )

    # quality_scores: Detailed scores per dimension (JSONB)
    # Schema: {
    #   "clarity": 4.5,
    #   "content_accuracy": 5.0,
    #   "answer_accuracy": 5.0,
    #   "distractor_quality": 4.0,
    #   "cognitive_level": 4.0,
    #   "rationale_quality": 4.5,
    #   "single_concept": 5.0,
    #   "cover_test": 4.0
    # }
    op.add_column(
        'questions',
        sa.Column('quality_scores', JSONB, nullable=True, server_default='{}')
    )

    # Create index for filtering by quality score
    op.create_index(
        'idx_questions_quality_score',
        'questions',
        ['quality_score'],
        unique=False
    )

    # Create index for filtering by bloom level
    op.create_index(
        'idx_questions_bloom_level',
        'questions',
        ['bloom_level'],
        unique=False
    )


def downgrade() -> None:
    """Remove quality scoring columns."""
    op.drop_index('idx_questions_bloom_level', table_name='questions')
    op.drop_index('idx_questions_quality_score', table_name='questions')
    op.drop_column('questions', 'quality_scores')
    op.drop_column('questions', 'bloom_level')
    op.drop_column('questions', 'quality_score')
