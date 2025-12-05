"""
Pydantic schemas for achievements API.

Kiroween Hackathon - Frankenstein Track (Education + Web3)
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import Field

from .base import BaseSchema


class AchievementRarity(str, Enum):
    """Achievement rarity levels."""

    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class VerificationStatus(str, Enum):
    """Blockchain verification status."""

    PENDING = "pending"
    UPLOADED = "uploaded"  # IPFS uploaded
    VERIFIED = "verified"  # On-chain confirmed
    FAILED = "failed"


class AchievementCategory(str, Enum):
    """Achievement categories."""

    ACCURACY = "accuracy"
    STREAK = "streak"
    VOLUME = "volume"
    MASTERY = "mastery"


# ============================================================================
# Achievement Definition Schemas
# ============================================================================


class AchievementBase(BaseSchema):
    """Base achievement schema."""

    slug: str
    name: str
    description: str
    category: str
    icon_name: str
    icon_color: str
    rarity: AchievementRarity = AchievementRarity.COMMON
    points: int = 10


class AchievementResponse(AchievementBase):
    """Achievement definition response."""

    id: int
    trigger_type: str
    is_active: bool = True
    sort_order: int = 0


class AchievementListResponse(BaseSchema):
    """List of achievement definitions."""

    achievements: List[AchievementResponse]
    total: int


# ============================================================================
# User Achievement Schemas
# ============================================================================


class UserAchievementBase(BaseSchema):
    """Base user achievement schema."""

    earned_at: Optional[datetime] = None
    context_data: Optional[Dict[str, Any]] = None


class BlockchainVerification(BaseSchema):
    """Blockchain verification details."""

    ipfs_hash: Optional[str] = None
    ipfs_url: Optional[str] = None
    tx_hash: Optional[str] = None
    block_number: Optional[int] = None
    chain_id: int = 8453  # Base mainnet
    verification_status: VerificationStatus = VerificationStatus.PENDING


class UserAchievementResponse(BaseSchema):
    """User's earned achievement with status."""

    id: int
    achievement: AchievementResponse
    earned_at: datetime
    context_data: Optional[Dict[str, Any]] = None
    # Blockchain verification
    ipfs_hash: Optional[str] = None
    ipfs_url: Optional[str] = None
    tx_hash: Optional[str] = None
    block_number: Optional[int] = None
    chain_id: int = 8453
    verification_status: VerificationStatus = VerificationStatus.PENDING


class AchievementWithProgress(BaseSchema):
    """Achievement with unlock status and progress."""

    achievement: AchievementResponse
    is_unlocked: bool = False
    earned_at: Optional[datetime] = None
    # Progress for locked achievements (0-100)
    progress: Optional[float] = None
    progress_text: Optional[str] = None  # e.g., "50/100 questions"
    # Blockchain data (if unlocked)
    verification_status: Optional[VerificationStatus] = None
    ipfs_url: Optional[str] = None
    tx_hash: Optional[str] = None


class UserAchievementsResponse(BaseSchema):
    """All achievements with user's progress."""

    achievements: List[AchievementWithProgress]
    total_points: int = 0
    unlocked_count: int = 0
    total_count: int = 0


# ============================================================================
# Achievement Detail Schema (for modal/certificate view)
# ============================================================================


class CertificateData(BaseSchema):
    """Achievement certificate data."""

    version: str = "1.0"
    type: str = "StudyForgeAchievement"
    achievement_slug: str
    achievement_name: str
    achievement_rarity: str
    recipient_user_id: int
    recipient_display: Optional[str] = None  # e.g., "John D."
    earned_timestamp: datetime
    context: Optional[Dict[str, Any]] = None
    chain_name: str = "Base"
    chain_id: int = 8453
    signature: Optional[str] = None


class AchievementDetailResponse(BaseSchema):
    """Detailed achievement info including certificate."""

    id: int
    achievement: AchievementResponse
    earned_at: datetime
    context_data: Optional[Dict[str, Any]] = None
    # Full blockchain verification
    ipfs_hash: Optional[str] = None
    ipfs_url: Optional[str] = None
    tx_hash: Optional[str] = None
    block_number: Optional[int] = None
    chain_id: int = 8453
    verification_status: VerificationStatus = VerificationStatus.PENDING
    # Certificate data
    certificate_data: Optional[CertificateData] = None
    # BaseScan URL for tx verification
    basescan_url: Optional[str] = None


# ============================================================================
# Verification Request/Response
# ============================================================================


class VerifyAchievementRequest(BaseSchema):
    """Request to verify an achievement on-chain."""

    ipfs_hash: str


class VerifyAchievementResponse(BaseSchema):
    """Response from verification check."""

    is_valid: bool
    ipfs_hash: str
    tx_hash: Optional[str] = None
    block_number: Optional[int] = None
    chain_id: int = 8453
    message: str = ""


# ============================================================================
# Achievement Award Response (internal use)
# ============================================================================


class AwardAchievementResponse(BaseSchema):
    """Response when an achievement is awarded."""

    success: bool
    achievement: Optional[AchievementResponse] = None
    message: str = ""
    already_earned: bool = False
