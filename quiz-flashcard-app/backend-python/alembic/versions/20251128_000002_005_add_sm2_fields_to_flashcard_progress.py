"""Add SM-2 spaced repetition fields to flashcard_progress table.

Revision ID: 005_add_sm2_fields
Revises: 004_add_question_attempts_table
Create Date: 2025-11-28

Adds SM-2 algorithm fields:
- easiness_factor: Controls difficulty multiplier (default 2.5)
- repetition_count: Number of successful repetitions (resets on failure)
- interval_days: Current interval between reviews
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "005_add_sm2_fields"
down_revision = "004_add_question_attempts_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add SM-2 algorithm fields to flashcard_progress table."""
    # Add easiness_factor column (default 2.5 per SM-2 standard)
    op.add_column(
        "flashcard_progress",
        sa.Column("easiness_factor", sa.Float(), nullable=False, server_default="2.5"),
    )

    # Add repetition_count column (tracks successful reviews in a row)
    op.add_column(
        "flashcard_progress",
        sa.Column("repetition_count", sa.Integer(), nullable=False, server_default="0"),
    )

    # Add interval_days column (days until next review)
    op.add_column(
        "flashcard_progress",
        sa.Column("interval_days", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    """Remove SM-2 algorithm fields from flashcard_progress table."""
    op.drop_column("flashcard_progress", "interval_days")
    op.drop_column("flashcard_progress", "repetition_count")
    op.drop_column("flashcard_progress", "easiness_factor")
