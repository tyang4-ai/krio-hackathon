"""Initial schema - all 16 models

Revision ID: 001
Revises:
Create Date: 2025-11-25

Creates all tables for the Scholarly Quiz & Flashcard application:
- categories: Study content organization
- documents: Uploaded study materials
- questions: Quiz questions
- flashcards: Study flashcards
- quiz_sessions: Quiz attempts and results
- notebook_entries: Wrong answers for review
- flashcard_progress: Spaced repetition tracking
- sample_questions: AI learning samples
- ai_analysis_results: AI pattern detection
- agent_messages: Inter-agent communication
- user_preferences: Per-category settings
- question_performance: User performance tracking
- handwritten_answers: OCR submissions
- handwriting_corrections: OCR learning data
- partial_credit_grades: Detailed grading
- exam_focus_events: Exam integrity tracking
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables."""

    # 1. Categories (no dependencies)
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("color", sa.String(50), nullable=True, server_default="#3B82F6"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # 2. Documents (depends on categories)
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("file_type", sa.String(50), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("content_text", sa.Text(), nullable=True),
        sa.Column("processed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_documents_category_id", "documents", ["category_id"])

    # 3. Questions (depends on categories, documents)
    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=True),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column(
            "question_type",
            sa.String(50),
            nullable=False,
            server_default="multiple_choice",
        ),
        sa.Column("difficulty", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("options", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("correct_answer", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("rating", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["document_id"], ["documents.id"], ondelete="SET NULL"
        ),
    )
    op.create_index("ix_questions_category_id", "questions", ["category_id"])
    op.create_index("ix_questions_document_id", "questions", ["document_id"])

    # 4. Flashcards (depends on categories, documents)
    op.create_table(
        "flashcards",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=True),
        sa.Column("front_text", sa.Text(), nullable=False),
        sa.Column("back_text", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("tags", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("rating", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["document_id"], ["documents.id"], ondelete="SET NULL"
        ),
    )
    op.create_index("ix_flashcards_category_id", "flashcards", ["category_id"])

    # 5. Quiz Sessions (depends on categories)
    op.create_table(
        "quiz_sessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column(
            "settings",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "questions",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("answers", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("total_questions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_quiz_sessions_category_id", "quiz_sessions", ["category_id"])

    # 6. Notebook Entries (depends on categories, questions, quiz_sessions)
    op.create_table(
        "notebook_entries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("quiz_session_id", sa.Integer(), nullable=True),
        sa.Column("user_answer", sa.Text(), nullable=False),
        sa.Column("correct_answer", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("reviewed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["question_id"], ["questions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["quiz_session_id"], ["quiz_sessions.id"], ondelete="SET NULL"
        ),
    )
    op.create_index("ix_notebook_entries_category_id", "notebook_entries", ["category_id"])
    op.create_index("ix_notebook_entries_question_id", "notebook_entries", ["question_id"])

    # 7. Flashcard Progress (depends on flashcards, categories)
    op.create_table(
        "flashcard_progress",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("flashcard_id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("confidence_level", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("times_reviewed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_reviewed", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_review", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["flashcard_id"], ["flashcards.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_flashcard_progress_flashcard_id", "flashcard_progress", ["flashcard_id"])
    op.create_index("ix_flashcard_progress_next_review", "flashcard_progress", ["next_review"])

    # 8. Sample Questions (depends on categories)
    op.create_table(
        "sample_questions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column(
            "question_type",
            sa.String(50),
            nullable=False,
            server_default="multiple_choice",
        ),
        sa.Column("options", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("correct_answer", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_sample_questions_category_id", "sample_questions", ["category_id"])

    # 9. AI Analysis Results (depends on categories)
    op.create_table(
        "ai_analysis_results",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("analysis_type", sa.String(50), nullable=False),
        sa.Column(
            "patterns",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "style_guide",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "recommendations",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("analyzed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_ai_analysis_results_category_id", "ai_analysis_results", ["category_id"])

    # 10. Agent Messages (depends on categories)
    op.create_table(
        "agent_messages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("from_agent", sa.String(50), nullable=False),
        sa.Column("to_agent", sa.String(50), nullable=False),
        sa.Column("message_type", sa.String(50), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_agent_messages_category_id", "agent_messages", ["category_id"])
    op.create_index("ix_agent_messages_status", "agent_messages", ["status"])

    # 11. User Preferences (depends on categories)
    op.create_table(
        "user_preferences",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("preference_key", sa.String(100), nullable=False),
        sa.Column("preference_value", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint("category_id", "preference_key", name="uq_category_preference"),
    )
    op.create_index("ix_user_preferences_category_id", "user_preferences", ["category_id"])

    # 12. Question Performance (depends on questions, categories)
    op.create_table(
        "question_performance",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("times_answered", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("times_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_answered", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["question_id"], ["questions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_question_performance_question_id", "question_performance", ["question_id"])

    # 13. Handwritten Answers (depends on quiz_sessions, questions)
    op.create_table(
        "handwritten_answers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("original_name", sa.String(255), nullable=False),
        sa.Column("recognized_text", sa.Text(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("user_corrections", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["session_id"], ["quiz_sessions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["question_id"], ["questions.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_handwritten_answers_session_id", "handwritten_answers", ["session_id"])

    # 14. Handwriting Corrections (depends on categories)
    op.create_table(
        "handwriting_corrections",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("corrected_text", sa.Text(), nullable=False),
        sa.Column("context", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_handwriting_corrections_category_id", "handwriting_corrections", ["category_id"])

    # 15. Partial Credit Grades (depends on quiz_sessions, questions)
    op.create_table(
        "partial_credit_grades",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("total_points", sa.Float(), nullable=False),
        sa.Column("earned_points", sa.Float(), nullable=False),
        sa.Column(
            "breakdown",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["session_id"], ["quiz_sessions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["question_id"], ["questions.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_partial_credit_grades_session_id", "partial_credit_grades", ["session_id"])

    # 16. Exam Focus Events (depends on quiz_sessions)
    op.create_table(
        "exam_focus_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("details", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["session_id"], ["quiz_sessions.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_exam_focus_events_session_id", "exam_focus_events", ["session_id"])
    op.create_index("ix_exam_focus_events_event_type", "exam_focus_events", ["event_type"])


def downgrade() -> None:
    """Drop all tables in reverse order."""
    # Drop tables in reverse dependency order
    op.drop_table("exam_focus_events")
    op.drop_table("partial_credit_grades")
    op.drop_table("handwriting_corrections")
    op.drop_table("handwritten_answers")
    op.drop_table("question_performance")
    op.drop_table("user_preferences")
    op.drop_table("agent_messages")
    op.drop_table("ai_analysis_results")
    op.drop_table("sample_questions")
    op.drop_table("flashcard_progress")
    op.drop_table("notebook_entries")
    op.drop_table("quiz_sessions")
    op.drop_table("flashcards")
    op.drop_table("questions")
    op.drop_table("documents")
    op.drop_table("categories")
