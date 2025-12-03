"""
AI analysis and agent communication models.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel


class AIAnalysisResult(BaseModel):
    """
    Stores AI analysis results from the Analysis Agent.

    Contains detected patterns, style guides, and recommendations
    for question generation.
    """

    __tablename__ = "ai_analysis_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )

    # Analysis data
    analysis_type: Mapped[str] = mapped_column(String(50), nullable=False)
    patterns: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    style_guide: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    recommendations: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Enhanced style guide fields (Phase 2 - research-backed quality scoring)
    # few_shot_examples: Best 3-5 questions with quality scores for few-shot learning
    few_shot_examples: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, default=dict
    )
    # quality_criteria: Weighted scoring schema and analysis summary
    quality_criteria: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True, default=dict
    )
    # bloom_taxonomy_targets: Detected Bloom's taxonomy levels ["remember", "apply", ...]
    bloom_taxonomy_targets: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True, default=list
    )

    # Metadata
    analyzed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationship
    category = relationship("Category", backref="ai_analysis_results")

    def __repr__(self) -> str:
        return f"AIAnalysisResult(id={self.id}, type='{self.analysis_type}')"


class AgentMessage(BaseModel):
    """
    Inter-agent communication messages.

    Used for coordination between Controller, Analysis,
    Generation, Handwriting, and Grading agents.
    """

    __tablename__ = "agent_messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )

    # Message routing
    from_agent: Mapped[str] = mapped_column(String(50), nullable=False)
    to_agent: Mapped[str] = mapped_column(String(50), nullable=False)
    message_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # Message content
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Processing status
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationship
    category = relationship("Category", backref="agent_messages")

    def __repr__(self) -> str:
        return f"AgentMessage(id={self.id}, {self.from_agent}->{self.to_agent})"
