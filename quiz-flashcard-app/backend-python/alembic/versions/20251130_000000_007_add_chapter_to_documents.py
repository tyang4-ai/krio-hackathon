"""Add chapter field to documents table.

Revision ID: 007_add_chapter
Revises: 006
Create Date: 2025-11-30

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add chapter column to documents table."""
    op.add_column(
        "documents",
        sa.Column("chapter", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    """Remove chapter column from documents table."""
    op.drop_column("documents", "chapter")
