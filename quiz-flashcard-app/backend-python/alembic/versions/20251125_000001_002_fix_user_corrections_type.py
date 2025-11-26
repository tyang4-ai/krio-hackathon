"""Fix user_corrections column type

Revision ID: 002
Revises: 001
Create Date: 2025-11-25

Changes user_corrections from Text to JSON for handwritten_answers table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Change user_corrections to JSON type."""
    # Drop the old column and add new one with JSON type
    op.drop_column("handwritten_answers", "user_corrections")
    op.add_column(
        "handwritten_answers",
        sa.Column(
            "user_corrections",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=True,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    """Revert to Text type."""
    op.drop_column("handwritten_answers", "user_corrections")
    op.add_column(
        "handwritten_answers",
        sa.Column("user_corrections", sa.Text(), nullable=True),
    )
