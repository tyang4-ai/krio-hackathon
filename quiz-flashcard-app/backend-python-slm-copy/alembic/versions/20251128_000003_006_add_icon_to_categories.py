"""Add icon field to categories table.

Revision ID: 006_add_icon
Revises: 005_add_sm2_fields
Create Date: 2025-11-28

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add icon column to categories table."""
    op.add_column(
        "categories",
        sa.Column("icon", sa.String(50), nullable=True, server_default="Folder"),
    )


def downgrade() -> None:
    """Remove icon column from categories table."""
    op.drop_column("categories", "icon")
