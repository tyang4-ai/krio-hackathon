"""Add performance indexes for common query patterns

Revision ID: 014
Revises: 013
Create Date: 2025-12-02

Performance Optimization: Add composite indexes to speed up common queries.
Missing indexes cause full table scans; these indexes can improve query
performance by 10-100x for filtered lookups.

Based on code review identifying frequent query patterns:
- Flashcard progress lookups by card + category
- Document chunk lookups by document + status
- Flashcard filtering by category + difficulty
- Document filtering by category + processed status
- Document filtering by category + chunking status
- Question lookups by category
- Question attempt lookups by session + user
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '014'
down_revision = '013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Flashcard progress: frequent lookups by (flashcard_id, category_id)
    # Note: flashcard_progress uses category_id, not user_id
    op.create_index(
        'idx_flashcard_progress_card_category',
        'flashcard_progress',
        ['flashcard_id', 'category_id'],
        unique=False
    )

    # Document chunks: filtering by document_id and embedding_status
    op.create_index(
        'idx_document_chunks_doc_status',
        'document_chunks',
        ['document_id', 'embedding_status'],
        unique=False
    )

    # Flashcards: filtering by category_id and difficulty
    op.create_index(
        'idx_flashcards_category_difficulty',
        'flashcards',
        ['category_id', 'difficulty'],
        unique=False
    )

    # Documents: filtering by category_id and processed status
    op.create_index(
        'idx_documents_category_processed',
        'documents',
        ['category_id', 'processed'],
        unique=False
    )

    # Documents: filtering by category_id and chunking_status
    op.create_index(
        'idx_documents_category_chunking',
        'documents',
        ['category_id', 'chunking_status'],
        unique=False
    )

    # Questions: lookups by category_id
    op.create_index(
        'idx_questions_category_id',
        'questions',
        ['category_id'],
        unique=False
    )

    # Question attempts: lookups by session_id and user_id
    op.create_index(
        'idx_question_attempts_session_user',
        'question_attempts',
        ['session_id', 'user_id'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('idx_question_attempts_session_user', table_name='question_attempts')
    op.drop_index('idx_questions_category_id', table_name='questions')
    op.drop_index('idx_documents_category_chunking', table_name='documents')
    op.drop_index('idx_documents_category_processed', table_name='documents')
    op.drop_index('idx_flashcards_category_difficulty', table_name='flashcards')
    op.drop_index('idx_document_chunks_doc_status', table_name='document_chunks')
    op.drop_index('idx_flashcard_progress_card_category', table_name='flashcard_progress')
