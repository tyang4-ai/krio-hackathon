"""Add blockchain-verified achievements tables.

Revision ID: 016
Revises: 015
Create Date: 2025-12-04

Kiroween Hackathon - Frankenstein Track (Education + Web3)
Adds gamification achievements with IPFS storage and Base L2 anchoring.

Tables:
- achievements: Achievement definitions (slug, name, trigger config)
- user_achievements: User's earned achievements with blockchain verification
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Achievement seed data - 15 achievements across 4 categories
ACHIEVEMENTS_SEED = [
    # Accuracy achievements
    {
        "slug": "first_80_percent",
        "name": "Rising Star",
        "description": "Score 80% or higher on a quiz",
        "category": "accuracy",
        "icon_name": "Star",
        "icon_color": "#FFD700",
        "rarity": "common",
        "points": 10,
        "trigger_type": "quiz_score",
        "trigger_config": {"min_score": 80},
        "sort_order": 1,
    },
    {
        "slug": "first_90_percent",
        "name": "Honor Roll",
        "description": "Score 90% or higher on a quiz",
        "category": "accuracy",
        "icon_name": "Award",
        "icon_color": "#4169E1",
        "rarity": "rare",
        "points": 25,
        "trigger_type": "quiz_score",
        "trigger_config": {"min_score": 90},
        "sort_order": 2,
    },
    {
        "slug": "perfect_score",
        "name": "Perfect Scholar",
        "description": "Score 100% on any quiz",
        "category": "accuracy",
        "icon_name": "Trophy",
        "icon_color": "#9932CC",
        "rarity": "epic",
        "points": 50,
        "trigger_type": "quiz_score",
        "trigger_config": {"min_score": 100},
        "sort_order": 3,
    },
    {
        "slug": "triple_perfect",
        "name": "Flawless Trio",
        "description": "Get 3 perfect scores on quizzes",
        "category": "accuracy",
        "icon_name": "Crown",
        "icon_color": "#9932CC",
        "rarity": "epic",
        "points": 100,
        "trigger_type": "perfect_count",
        "trigger_config": {"min_count": 3},
        "sort_order": 4,
    },
    {
        "slug": "accuracy_master",
        "name": "Accuracy Master",
        "description": "Maintain 90%+ overall accuracy (min 50 questions)",
        "category": "accuracy",
        "icon_name": "Target",
        "icon_color": "#FFD700",
        "rarity": "legendary",
        "points": 200,
        "trigger_type": "overall_accuracy",
        "trigger_config": {"min_accuracy": 90, "min_questions": 50},
        "sort_order": 5,
    },
    # Streak achievements
    {
        "slug": "streak_7",
        "name": "Week Warrior",
        "description": "Study 7 days in a row",
        "category": "streak",
        "icon_name": "Flame",
        "icon_color": "#FF4500",
        "rarity": "common",
        "points": 20,
        "trigger_type": "streak",
        "trigger_config": {"min_days": 7},
        "sort_order": 10,
    },
    {
        "slug": "streak_30",
        "name": "Monthly Master",
        "description": "Study 30 days in a row",
        "category": "streak",
        "icon_name": "Zap",
        "icon_color": "#9932CC",
        "rarity": "epic",
        "points": 100,
        "trigger_type": "streak",
        "trigger_config": {"min_days": 30},
        "sort_order": 11,
    },
    {
        "slug": "streak_100",
        "name": "Century Scholar",
        "description": "Study 100 days in a row",
        "category": "streak",
        "icon_name": "BadgeCheck",
        "icon_color": "#FFD700",
        "rarity": "legendary",
        "points": 500,
        "trigger_type": "streak",
        "trigger_config": {"min_days": 100},
        "sort_order": 12,
    },
    # Volume achievements
    {
        "slug": "questions_100",
        "name": "Question Explorer",
        "description": "Answer 100 questions",
        "category": "volume",
        "icon_name": "HelpCircle",
        "icon_color": "#32CD32",
        "rarity": "common",
        "points": 15,
        "trigger_type": "total_questions",
        "trigger_config": {"min_count": 100},
        "sort_order": 20,
    },
    {
        "slug": "questions_500",
        "name": "Quiz Champion",
        "description": "Answer 500 questions",
        "category": "volume",
        "icon_name": "BookOpen",
        "icon_color": "#4169E1",
        "rarity": "rare",
        "points": 50,
        "trigger_type": "total_questions",
        "trigger_config": {"min_count": 500},
        "sort_order": 21,
    },
    {
        "slug": "questions_1000",
        "name": "Knowledge Seeker",
        "description": "Answer 1000 questions",
        "category": "volume",
        "icon_name": "GraduationCap",
        "icon_color": "#9932CC",
        "rarity": "epic",
        "points": 150,
        "trigger_type": "total_questions",
        "trigger_config": {"min_count": 1000},
        "sort_order": 22,
    },
    {
        "slug": "flashcard_100",
        "name": "Card Collector",
        "description": "Review 100 flashcards",
        "category": "volume",
        "icon_name": "Layers",
        "icon_color": "#32CD32",
        "rarity": "common",
        "points": 15,
        "trigger_type": "flashcard_reviews",
        "trigger_config": {"min_count": 100},
        "sort_order": 23,
    },
    # Mastery achievements (learning score)
    {
        "slug": "grade_b",
        "name": "B Grade Scholar",
        "description": "Reach B grade (70+ learning score)",
        "category": "mastery",
        "icon_name": "TrendingUp",
        "icon_color": "#32CD32",
        "rarity": "common",
        "points": 25,
        "trigger_type": "learning_score",
        "trigger_config": {"min_score": 70},
        "sort_order": 30,
    },
    {
        "slug": "grade_a",
        "name": "A Grade Scholar",
        "description": "Reach A grade (85+ learning score)",
        "category": "mastery",
        "icon_name": "Medal",
        "icon_color": "#4169E1",
        "rarity": "rare",
        "points": 75,
        "trigger_type": "learning_score",
        "trigger_config": {"min_score": 85},
        "sort_order": 31,
    },
    {
        "slug": "grade_a_plus",
        "name": "A+ Excellence",
        "description": "Reach A+ grade (95+ learning score)",
        "category": "mastery",
        "icon_name": "Sparkles",
        "icon_color": "#FFD700",
        "rarity": "legendary",
        "points": 200,
        "trigger_type": "learning_score",
        "trigger_config": {"min_score": 95},
        "sort_order": 32,
    },
]


def upgrade() -> None:
    """Create achievements tables and seed initial data."""

    # Create achievements table (definitions)
    op.create_table(
        'achievements',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('slug', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('icon_name', sa.String(50), nullable=False),
        sa.Column('icon_color', sa.String(20), nullable=False),
        sa.Column('rarity', sa.String(20), server_default='common'),
        sa.Column('points', sa.Integer, server_default='10'),
        sa.Column('trigger_type', sa.String(50), nullable=False),
        sa.Column('trigger_config', JSONB, nullable=False),
        sa.Column('is_active', sa.Boolean, server_default='true'),
        sa.Column('sort_order', sa.Integer, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create user_achievements table (earned achievements with blockchain data)
    op.create_table(
        'user_achievements',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('achievement_id', sa.Integer, sa.ForeignKey('achievements.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('earned_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('context_data', JSONB, nullable=True),
        # Blockchain verification fields
        sa.Column('ipfs_hash', sa.String(100), nullable=True),
        sa.Column('ipfs_url', sa.String(255), nullable=True),
        sa.Column('tx_hash', sa.String(100), nullable=True),
        sa.Column('block_number', sa.Integer, nullable=True),
        sa.Column('chain_id', sa.Integer, server_default='8453'),  # Base mainnet
        sa.Column('verification_status', sa.String(20), server_default='pending'),
        sa.Column('certificate_data', JSONB, nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        # Unique constraint
        sa.UniqueConstraint('user_id', 'achievement_id', name='uq_user_achievement'),
    )

    # Create indexes for common queries
    op.create_index('idx_achievements_category', 'achievements', ['category'])
    op.create_index('idx_achievements_rarity', 'achievements', ['rarity'])
    op.create_index('idx_user_achievements_verification', 'user_achievements', ['verification_status'])

    # Seed achievement definitions
    achievements_table = sa.table(
        'achievements',
        sa.column('slug', sa.String),
        sa.column('name', sa.String),
        sa.column('description', sa.Text),
        sa.column('category', sa.String),
        sa.column('icon_name', sa.String),
        sa.column('icon_color', sa.String),
        sa.column('rarity', sa.String),
        sa.column('points', sa.Integer),
        sa.column('trigger_type', sa.String),
        sa.column('trigger_config', JSONB),
        sa.column('sort_order', sa.Integer),
    )

    op.bulk_insert(achievements_table, ACHIEVEMENTS_SEED)


def downgrade() -> None:
    """Drop achievements tables."""
    op.drop_index('idx_user_achievements_verification', table_name='user_achievements')
    op.drop_index('idx_achievements_rarity', table_name='achievements')
    op.drop_index('idx_achievements_category', table_name='achievements')
    op.drop_table('user_achievements')
    op.drop_table('achievements')
