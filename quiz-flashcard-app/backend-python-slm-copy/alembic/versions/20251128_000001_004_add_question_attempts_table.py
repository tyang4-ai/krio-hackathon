"""Add question_attempts table for analytics

Revision ID: 004
Revises: 003
Create Date: 2025-11-28

Adds question_attempts table for tracking individual question responses.
This enables detailed analytics for the Analytics Dashboard feature.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create question_attempts table."""
    op.create_table(
        "question_attempts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        # Foreign keys
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("category_id", sa.Integer(), nullable=False),
        # Answer data
        sa.Column("user_answer", sa.Text(), nullable=False),
        sa.Column("correct_answer", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False, server_default="false"),
        # Partial credit
        sa.Column("points_earned", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("points_possible", sa.Float(), nullable=False, server_default="1.0"),
        # Question metadata (denormalized)
        sa.Column("question_type", sa.String(50), nullable=False),
        sa.Column("difficulty", sa.String(20), nullable=False),
        # Time tracking
        sa.Column("time_spent_seconds", sa.Integer(), nullable=True),
        sa.Column(
            "answered_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        # Additional data
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("extra_data", sa.dialects.postgresql.JSON(), nullable=True),
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
            ["session_id"], ["quiz_sessions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["question_id"], ["questions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
    )
    # Indexes for common queries
    op.create_index("ix_question_attempts_session_id", "question_attempts", ["session_id"])
    op.create_index("ix_question_attempts_question_id", "question_attempts", ["question_id"])
    op.create_index("ix_question_attempts_user_id", "question_attempts", ["user_id"])
    op.create_index("ix_question_attempts_category_id", "question_attempts", ["category_id"])
    op.create_index("ix_question_attempts_answered_at", "question_attempts", ["answered_at"])
    op.create_index("ix_question_attempts_is_correct", "question_attempts", ["is_correct"])


def downgrade() -> None:
    """Drop question_attempts table."""
    op.drop_index("ix_question_attempts_is_correct", table_name="question_attempts")
    op.drop_index("ix_question_attempts_answered_at", table_name="question_attempts")
    op.drop_index("ix_question_attempts_category_id", table_name="question_attempts")
    op.drop_index("ix_question_attempts_user_id", table_name="question_attempts")
    op.drop_index("ix_question_attempts_question_id", table_name="question_attempts")
    op.drop_index("ix_question_attempts_session_id", table_name="question_attempts")
    op.drop_table("question_attempts")
