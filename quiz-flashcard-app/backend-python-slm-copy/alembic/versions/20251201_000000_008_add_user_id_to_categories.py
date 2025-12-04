"""Add user_id to categories for user isolation

Revision ID: 008_add_user_id_to_categories
Revises: 20251130_000000_007_add_chapter_to_documents
Create Date: 2025-12-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '008'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add user_id column to categories table
    op.add_column('categories', sa.Column('user_id', sa.Integer(), nullable=True))

    # Create index for faster lookups by user
    op.create_index(op.f('ix_categories_user_id'), 'categories', ['user_id'], unique=False)

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_categories_user_id_users',
        'categories',
        'users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    # Drop foreign key constraint
    op.drop_constraint('fk_categories_user_id_users', 'categories', type_='foreignkey')

    # Drop index
    op.drop_index(op.f('ix_categories_user_id'), table_name='categories')

    # Drop column
    op.drop_column('categories', 'user_id')
