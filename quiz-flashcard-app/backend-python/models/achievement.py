"""
Achievement models for blockchain-verified study milestones.

Supports gamification badges with IPFS storage and Base L2 anchoring.
Part of Kiroween hackathon (Frankenstein track - Education + Web3).
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from config.database import Base
from .base import BaseModel


class Achievement(Base):
    """
    Achievement definition.

    Defines the badges users can earn (e.g., "Perfect Scholar", "Week Warrior").
    """
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Identity
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Categorization
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # accuracy, streak, volume, mastery

    # Display
    icon_name: Mapped[str] = mapped_column(String(50), nullable=False)  # Lucide icon name
    icon_color: Mapped[str] = mapped_column(String(20), nullable=False)  # Hex color
    rarity: Mapped[str] = mapped_column(String(20), default="common")  # common, rare, epic, legendary
    points: Mapped[int] = mapped_column(Integer, default=10)

    # Trigger configuration
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)  # quiz_score, streak, volume, etc.
    trigger_config: Mapped[dict] = mapped_column(JSONB, nullable=False)  # {"min_score": 80, "count": 1}

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    user_achievements: Mapped[list["UserAchievement"]] = relationship(
        "UserAchievement",
        back_populates="achievement",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Achievement(slug={self.slug}, name={self.name}, rarity={self.rarity})>"


class UserAchievement(BaseModel):
    """
    User's earned achievement with blockchain verification.

    Tracks when a user earned an achievement and stores the
    IPFS hash and Base L2 transaction for verification.
    """
    __tablename__ = "user_achievements"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Foreign keys
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    achievement_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("achievements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # When earned
    earned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Context when earned (e.g., {"quiz_session_id": 123, "score": 100})
    context_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Blockchain verification fields
    ipfs_hash: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # QmXyz... or bafybeic...
    ipfs_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Gateway URL
    tx_hash: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # 0x123...
    block_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chain_id: Mapped[int] = mapped_column(Integer, default=8453)  # Base mainnet (84532 for testnet)
    verification_status: Mapped[str] = mapped_column(
        String(20),
        default="pending",  # pending, uploaded, verified, failed
    )

    # Full certificate JSON for offline verification
    certificate_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", backref="achievements")
    achievement: Mapped[Achievement] = relationship("Achievement", back_populates="user_achievements")

    # Unique constraint - each user can only earn each achievement once
    __table_args__ = (
        {"sqlite_autoincrement": True},
    )

    def __repr__(self) -> str:
        return f"<UserAchievement(user_id={self.user_id}, achievement_id={self.achievement_id}, status={self.verification_status})>"
