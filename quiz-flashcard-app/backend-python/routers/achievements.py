"""
Achievements API endpoints.

Kiroween Hackathon - Frankenstein Track (Education + Web3)

Provides:
- Achievement definitions (all available achievements)
- User achievements with unlock status and progress
- Achievement detail with blockchain verification
- On-chain verification endpoint
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from middleware.auth_middleware import get_current_user, get_optional_user
from services.achievement_service import AchievementService
from schemas.achievement import (
    AchievementListResponse,
    AchievementResponse,
    AchievementWithProgress,
    UserAchievementsResponse,
    AchievementDetailResponse,
    VerifyAchievementResponse,
)

router = APIRouter(prefix="/api/achievements", tags=["Achievements"])


@router.get("", response_model=AchievementListResponse)
async def get_all_achievements(
    db: AsyncSession = Depends(get_db),
):
    """
    Get all achievement definitions.

    Returns list of all available achievements with their requirements.
    No authentication required.
    """
    service = AchievementService(db)
    achievements = await service.get_all_achievements()

    return AchievementListResponse(
        achievements=[AchievementResponse.model_validate(a) for a in achievements],
        total=len(achievements),
    )


@router.get("/user", response_model=UserAchievementsResponse)
async def get_user_achievements(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """
    Get user's achievements with unlock status and progress.

    Returns all achievements with:
    - is_unlocked: Whether user has earned it
    - earned_at: When it was earned (if unlocked)
    - progress: Progress toward locked achievements (0-100)
    - progress_text: Human-readable progress (e.g., "50/100 questions")
    - verification_status: Blockchain verification status
    """
    # Treat guest users (id=-1) and anonymous as the same - show locked achievements
    if not current_user or current_user.id <= 0:
        # Return all achievements as locked for anonymous/guest users
        service = AchievementService(db)
        achievements = await service.get_all_achievements()
        return UserAchievementsResponse(
            achievements=[
                AchievementWithProgress(
                    achievement=AchievementResponse.model_validate(a),
                    is_unlocked=False,
                    progress=0,
                    progress_text="Login to track progress",
                )
                for a in achievements
            ],
            total_points=0,
            unlocked_count=0,
            total_count=len(achievements),
        )

    service = AchievementService(db)
    return await service.get_user_achievements(current_user.id)


@router.get("/user/{achievement_id}", response_model=AchievementDetailResponse)
async def get_achievement_detail(
    achievement_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get detailed info for a specific earned achievement.

    Includes blockchain verification data:
    - ipfs_hash: IPFS content hash for certificate
    - ipfs_url: Gateway URL to view certificate
    - tx_hash: Base L2 transaction hash
    - basescan_url: Link to verify on BaseScan
    - certificate_data: Full certificate JSON
    """
    service = AchievementService(db)
    detail = await service.get_achievement_detail(current_user.id, achievement_id)

    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Achievement not found or not earned by user",
        )

    return detail


@router.post("/check", response_model=UserAchievementsResponse)
async def check_achievements(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Manually trigger achievement checks for current user.

    Checks all achievement types:
    - Volume (questions answered, flashcards reviewed)
    - Streak (consecutive study days)
    - Learning score (grade milestones)
    - Accuracy master (90%+ with 50+ questions)

    Returns updated achievements with any newly earned.
    """
    service = AchievementService(db)

    # Run all achievement checks
    await service.check_all_achievements(current_user.id)

    # Return updated achievements
    return await service.get_user_achievements(current_user.id)


@router.post("/verify/{ipfs_hash}", response_model=VerifyAchievementResponse)
async def verify_achievement(
    ipfs_hash: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify an achievement certificate on-chain.

    Checks that the IPFS hash is anchored to Base L2.
    No authentication required - anyone can verify.
    """
    # TODO: Implement blockchain verification
    # For now, return pending status
    return VerifyAchievementResponse(
        is_valid=False,
        ipfs_hash=ipfs_hash,
        message="Blockchain verification not yet implemented",
    )


@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    """
    Get achievement leaderboard.

    Returns top users by achievement points.
    """
    # TODO: Implement leaderboard query
    # For now, return empty list
    return {
        "leaderboard": [],
        "message": "Leaderboard coming soon!",
    }


@router.post("/test-blockchain")
async def test_blockchain_verification(
    db: AsyncSession = Depends(get_db),
):
    """
    Test endpoint for blockchain verification.

    Creates a test certificate, uploads to IPFS, and anchors to Base L2.
    For development/demo purposes only.
    """
    from services.blockchain_service import blockchain_service
    from datetime import datetime

    # Create test certificate
    certificate = blockchain_service.create_certificate(
        achievement_slug="test_achievement",
        achievement_name="Test Achievement",
        achievement_rarity="common",
        user_id=999,
        user_display="Test User",
        earned_at=datetime.utcnow(),
        context={"test": True, "source": "api_test"},
    )

    result = {
        "certificate": certificate,
        "ipfs": {"hash": None, "url": None},
        "blockchain": {"tx_hash": None, "block_number": None},
    }

    # Upload to IPFS
    ipfs_hash, ipfs_url = await blockchain_service.upload_to_ipfs(certificate)
    if ipfs_hash:
        result["ipfs"] = {"hash": ipfs_hash, "url": ipfs_url}

        # Anchor to Base L2
        try:
            tx_hash, block_number = await blockchain_service.anchor_to_chain(ipfs_hash)
            if tx_hash:
                result["blockchain"] = {
                    "tx_hash": tx_hash,
                    "block_number": block_number,
                    "basescan_url": blockchain_service.get_explorer_url(tx_hash),
                }
            else:
                # Debug info for troubleshooting
                result["blockchain"]["debug"] = {
                    "is_chain_configured": blockchain_service.is_chain_configured,
                    "rpc_url": blockchain_service.base_rpc_url,
                    "chain_id": blockchain_service.base_chain_id,
                    "error": "anchor_to_chain returned None",
                }
        except Exception as e:
            result["blockchain"]["error"] = str(e)
            result["blockchain"]["error_type"] = type(e).__name__

    return result
