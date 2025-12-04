"""Add enhanced style guide columns to ai_analysis_results.

Revision ID: 011
Revises: 010
Create Date: 2025-12-02

Adds columns for research-backed quality scoring:
- few_shot_examples: Best sample questions with quality scores for few-shot learning
- quality_criteria: Weighted scoring schema and analysis summary
- bloom_taxonomy_targets: Detected Bloom's taxonomy levels

Based on 6 academic papers:
- Ahmed et al. (BMC Medical Education 2025)
- Sultan (PDQI-9 Framework)
- Abouzeid et al. (JMIR Medical Education 2025)
- Zelikman et al. (Stanford 2023)
- Nielsen et al. (Diagnostics 2025)
- Cherrez-Ojeda et al. (World Allergy 2025)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add enhanced style guide columns."""

    # few_shot_examples: Best 3-5 questions with quality scores
    # Schema: {
    #   "questions": [{
    #     "question_text": "...",
    #     "question_type": "multiple_choice",
    #     "options": [...],
    #     "correct_answer": "...",
    #     "explanation": "...",
    #     "quality_scores": {
    #       "clarity": 5, "content_accuracy": 5, "answer_accuracy": 5,
    #       "distractor_quality": 4, "cognitive_level": 4,
    #       "rationale_quality": 5, "single_concept": 5, "cover_test": 4,
    #       "overall": 4.65
    #     },
    #     "bloom_level": "apply"
    #   }]
    # }
    op.add_column(
        'ai_analysis_results',
        sa.Column('few_shot_examples', JSONB, nullable=True, server_default='{}')
    )

    # quality_criteria: Weighted scoring schema
    # Schema: {
    #   "weights": {"clarity": 0.15, "content_accuracy": 0.20, ...},
    #   "thresholds": {"high": 4.0, "medium": 3.0},
    #   "analysis_summary": {
    #     "average_quality": 4.2,
    #     "strongest_dimension": "content_accuracy",
    #     "weakest_dimension": "distractor_quality"
    #   }
    # }
    op.add_column(
        'ai_analysis_results',
        sa.Column('quality_criteria', JSONB, nullable=True, server_default='{}')
    )

    # bloom_taxonomy_targets: Detected taxonomy levels
    # Schema: ["remember", "understand", "apply", "analyze"]
    op.add_column(
        'ai_analysis_results',
        sa.Column('bloom_taxonomy_targets', JSONB, nullable=True, server_default='[]')
    )


def downgrade() -> None:
    """Remove enhanced style guide columns."""
    op.drop_column('ai_analysis_results', 'bloom_taxonomy_targets')
    op.drop_column('ai_analysis_results', 'quality_criteria')
    op.drop_column('ai_analysis_results', 'few_shot_examples')
