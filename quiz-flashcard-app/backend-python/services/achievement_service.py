"""
Achievement service for tracking and awarding user achievements.

Kiroween Hackathon - Frankenstein Track (Education + Web3)

Handles:
- Checking achievement triggers after quiz/flashcard activity
- Awarding achievements to users
- Progress calculation for locked achievements
- Integration with blockchain service for verification
"""
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, case, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from models import (
    Achievement,
    UserAchievement,
    QuestionAttempt,
    QuizSession,
    User,
)
from models.flashcard_progress import FlashcardProgress
from schemas.achievement import (
    AchievementResponse,
    AchievementWithProgress,
    UserAchievementsResponse,
    AchievementDetailResponse,
    AwardAchievementResponse,
    VerificationStatus,
    CertificateData,
)
from services.analytics_service import AnalyticsService
from services.blockchain_service import blockchain_service
import structlog

logger = structlog.get_logger()


class AchievementService:
    """Service for managing achievements."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.analytics = AnalyticsService(db)

    # =========================================================================
    # Public API - Get achievements
    # =========================================================================

    async def get_all_achievements(self) -> List[Achievement]:
        """Get all active achievement definitions."""
        query = (
            select(Achievement)
            .where(Achievement.is_active == True)
            .order_by(Achievement.sort_order, Achievement.id)
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_user_achievements(self, user_id: int) -> UserAchievementsResponse:
        """Get all achievements with user's progress/unlock status."""
        # Get all achievement definitions
        all_achievements = await self.get_all_achievements()

        # Get user's earned achievements
        earned_query = (
            select(UserAchievement)
            .where(UserAchievement.user_id == user_id)
            .options(selectinload(UserAchievement.achievement))
        )
        earned_result = await self.db.execute(earned_query)
        earned_map = {ua.achievement_id: ua for ua in earned_result.scalars().all()}

        # Get user stats for progress calculation
        user_stats = await self._get_user_stats(user_id)

        # Build response with progress
        achievements_with_progress = []
        total_points = 0
        unlocked_count = 0

        for achievement in all_achievements:
            user_achievement = earned_map.get(achievement.id)
            is_unlocked = user_achievement is not None

            if is_unlocked:
                unlocked_count += 1
                total_points += achievement.points

            # Calculate progress for locked achievements
            progress = None
            progress_text = None
            if not is_unlocked:
                progress, progress_text = self._calculate_progress(
                    achievement, user_stats
                )

            achievements_with_progress.append(
                AchievementWithProgress(
                    achievement=AchievementResponse.model_validate(achievement),
                    is_unlocked=is_unlocked,
                    earned_at=user_achievement.earned_at if user_achievement else None,
                    progress=progress,
                    progress_text=progress_text,
                    verification_status=(
                        VerificationStatus(user_achievement.verification_status)
                        if user_achievement
                        else None
                    ),
                    ipfs_url=user_achievement.ipfs_url if user_achievement else None,
                    tx_hash=user_achievement.tx_hash if user_achievement else None,
                )
            )

        return UserAchievementsResponse(
            achievements=achievements_with_progress,
            total_points=total_points,
            unlocked_count=unlocked_count,
            total_count=len(all_achievements),
        )

    async def get_achievement_detail(
        self, user_id: int, user_achievement_id: int
    ) -> Optional[AchievementDetailResponse]:
        """Get detailed info for a specific earned achievement."""
        query = (
            select(UserAchievement)
            .where(
                and_(
                    UserAchievement.id == user_achievement_id,
                    UserAchievement.user_id == user_id,
                )
            )
            .options(selectinload(UserAchievement.achievement))
        )
        result = await self.db.execute(query)
        user_achievement = result.scalar_one_or_none()

        if not user_achievement:
            return None

        # Build BaseScan URL if tx exists
        basescan_url = None
        if user_achievement.tx_hash:
            basescan_url = f"https://basescan.org/tx/{user_achievement.tx_hash}"

        # Parse certificate data if exists
        certificate = None
        if user_achievement.certificate_data:
            certificate = CertificateData(**user_achievement.certificate_data)

        return AchievementDetailResponse(
            id=user_achievement.id,
            achievement=AchievementResponse.model_validate(user_achievement.achievement),
            earned_at=user_achievement.earned_at,
            context_data=user_achievement.context_data,
            ipfs_hash=user_achievement.ipfs_hash,
            ipfs_url=user_achievement.ipfs_url,
            tx_hash=user_achievement.tx_hash,
            block_number=user_achievement.block_number,
            chain_id=user_achievement.chain_id,
            verification_status=VerificationStatus(user_achievement.verification_status),
            certificate_data=certificate,
            basescan_url=basescan_url,
        )

    # =========================================================================
    # Achievement Trigger Checks
    # =========================================================================

    async def check_quiz_achievements(
        self, user_id: Optional[int], quiz_score: float, question_count: int
    ) -> List[AwardAchievementResponse]:
        """
        Check and award quiz score-based achievements.
        Called after a quiz is submitted.
        """
        awarded = []

        # Check accuracy achievements
        if quiz_score >= 80:
            result = await self.award_achievement(
                user_id,
                "first_80_percent",
                {"score": quiz_score, "questions": question_count},
            )
            if result.success:
                awarded.append(result)

        if quiz_score >= 90:
            result = await self.award_achievement(
                user_id,
                "first_90_percent",
                {"score": quiz_score, "questions": question_count},
            )
            if result.success:
                awarded.append(result)

        if quiz_score >= 100:
            result = await self.award_achievement(
                user_id,
                "perfect_score",
                {"score": quiz_score, "questions": question_count},
            )
            if result.success:
                awarded.append(result)

            # Check for triple perfect
            await self._check_perfect_count(user_id)

        return awarded

    async def check_volume_achievements(self, user_id: Optional[int]) -> List[AwardAchievementResponse]:
        """
        Check and award volume-based achievements.
        Called after quiz/flashcard activity.
        """
        awarded = []

        # Get total question count
        stats = await self._get_user_stats(user_id)
        total_questions = stats.get("total_questions", 0)
        flashcard_reviews = stats.get("flashcard_reviews", 0)

        # Question milestones
        if total_questions >= 100:
            result = await self.award_achievement(
                user_id, "questions_100", {"count": total_questions}
            )
            if result.success:
                awarded.append(result)

        if total_questions >= 500:
            result = await self.award_achievement(
                user_id, "questions_500", {"count": total_questions}
            )
            if result.success:
                awarded.append(result)

        if total_questions >= 1000:
            result = await self.award_achievement(
                user_id, "questions_1000", {"count": total_questions}
            )
            if result.success:
                awarded.append(result)

        # Flashcard milestones
        if flashcard_reviews >= 100:
            result = await self.award_achievement(
                user_id, "flashcard_100", {"count": flashcard_reviews}
            )
            if result.success:
                awarded.append(result)

        return awarded

    async def check_streak_achievements(self, user_id: Optional[int]) -> List[AwardAchievementResponse]:
        """
        Check and award streak-based achievements.
        Called after daily activity.
        """
        awarded = []

        # Get current streak
        streak = await self.analytics._calculate_streak(user_id)

        if streak >= 7:
            result = await self.award_achievement(
                user_id, "streak_7", {"days": streak}
            )
            if result.success:
                awarded.append(result)

        if streak >= 30:
            result = await self.award_achievement(
                user_id, "streak_30", {"days": streak}
            )
            if result.success:
                awarded.append(result)

        if streak >= 100:
            result = await self.award_achievement(
                user_id, "streak_100", {"days": streak}
            )
            if result.success:
                awarded.append(result)

        return awarded

    async def check_learning_score_achievements(
        self, user_id: Optional[int]
    ) -> List[AwardAchievementResponse]:
        """
        Check and award learning score-based achievements.
        Called periodically or after significant activity.
        """
        awarded = []

        # Get learning score
        learning_data = await self.analytics.calculate_learning_score(user_id)
        score = learning_data.get("total_score", 0)

        if score >= 70:
            result = await self.award_achievement(
                user_id, "grade_b", {"score": score, "grade": learning_data.get("grade")}
            )
            if result.success:
                awarded.append(result)

        if score >= 85:
            result = await self.award_achievement(
                user_id, "grade_a", {"score": score, "grade": learning_data.get("grade")}
            )
            if result.success:
                awarded.append(result)

        if score >= 95:
            result = await self.award_achievement(
                user_id, "grade_a_plus", {"score": score, "grade": learning_data.get("grade")}
            )
            if result.success:
                awarded.append(result)

        return awarded

    async def check_accuracy_master(self, user_id: Optional[int]) -> Optional[AwardAchievementResponse]:
        """
        Check for accuracy master achievement.
        Requires 90%+ accuracy with 50+ questions.
        """
        stats = await self._get_user_stats(user_id)
        total = stats.get("total_questions", 0)
        accuracy = stats.get("accuracy", 0)

        if total >= 50 and accuracy >= 90:
            return await self.award_achievement(
                user_id,
                "accuracy_master",
                {"accuracy": accuracy, "questions": total},
            )
        return None

    async def check_all_achievements(self, user_id: Optional[int]) -> List[AwardAchievementResponse]:
        """
        Run all achievement checks for a user.
        Useful after sync or on profile load.
        """
        all_awarded = []

        # Volume checks
        all_awarded.extend(await self.check_volume_achievements(user_id))

        # Streak checks
        all_awarded.extend(await self.check_streak_achievements(user_id))

        # Learning score checks
        all_awarded.extend(await self.check_learning_score_achievements(user_id))

        # Accuracy master check
        result = await self.check_accuracy_master(user_id)
        if result and result.success:
            all_awarded.append(result)

        return all_awarded

    # =========================================================================
    # Award Achievement
    # =========================================================================

    async def award_achievement(
        self,
        user_id: Optional[int],
        slug: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> AwardAchievementResponse:
        """
        Award an achievement to a user.

        Returns success=False if already earned or achievement not found.
        """
        # Get achievement by slug
        achievement_query = select(Achievement).where(Achievement.slug == slug)
        achievement_result = await self.db.execute(achievement_query)
        achievement = achievement_result.scalar_one_or_none()

        if not achievement:
            return AwardAchievementResponse(
                success=False,
                message=f"Achievement '{slug}' not found",
            )

        # Check if already earned - handle guest users (user_id=None)
        if user_id:
            existing_query = select(UserAchievement).where(
                and_(
                    UserAchievement.user_id == user_id,
                    UserAchievement.achievement_id == achievement.id,
                )
            )
        else:
            existing_query = select(UserAchievement).where(
                and_(
                    UserAchievement.user_id.is_(None),
                    UserAchievement.achievement_id == achievement.id,
                )
            )
        existing_result = await self.db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            return AwardAchievementResponse(
                success=False,
                already_earned=True,
                message=f"Achievement '{achievement.name}' already earned",
            )

        # Create user achievement
        user_achievement = UserAchievement(
            user_id=user_id,
            achievement_id=achievement.id,
            earned_at=datetime.utcnow(),
            context_data=context,
            verification_status="pending",
        )
        self.db.add(user_achievement)
        await self.db.commit()
        await self.db.refresh(user_achievement)

        # Trigger blockchain verification (IPFS upload + Base L2 anchor)
        await self._trigger_blockchain_verification(user_achievement, achievement)

        return AwardAchievementResponse(
            success=True,
            achievement=AchievementResponse.model_validate(achievement),
            message=f"Earned achievement: {achievement.name}!",
        )

    # =========================================================================
    # Private Helpers
    # =========================================================================

    async def _get_user_stats(self, user_id: Optional[int]) -> Dict[str, Any]:
        """Get aggregated user stats for achievement checks."""
        try:
            # Total questions answered - handle guest users (user_id=None)
            questions_query = select(
                func.count(QuestionAttempt.id).label("total"),
                func.sum(case((QuestionAttempt.is_correct == True, 1), else_=0)).label("correct"),
            )
            if user_id:
                questions_query = questions_query.where(QuestionAttempt.user_id == user_id)
            else:
                questions_query = questions_query.where(QuestionAttempt.user_id.is_(None))
            questions_result = await self.db.execute(questions_query)
            q_row = questions_result.one()

            total_questions = q_row.total or 0
            correct = q_row.correct or 0
            accuracy = (correct / total_questions * 100) if total_questions > 0 else 0

            # Perfect score count
            # Note: QuizSession doesn't have user_id column, so we count all perfect scores
            # A "perfect score" is when score equals total_questions (100%)
            perfect_query = select(func.count(QuizSession.id)).where(
                and_(
                    QuizSession.completed == True,
                    QuizSession.score == QuizSession.total_questions,
                    QuizSession.total_questions > 0,
                )
            )
            perfect_result = await self.db.execute(perfect_query)
            perfect_count = perfect_result.scalar() or 0

            # Flashcard reviews count (sum of times_reviewed from FlashcardProgress)
            # Note: FlashcardProgress doesn't have user_id, so we count all reviews for now
            # TODO: Add user tracking to FlashcardProgress for per-user achievements
            flashcard_query = select(func.sum(FlashcardProgress.times_reviewed))
            flashcard_result = await self.db.execute(flashcard_query)
            flashcard_reviews = flashcard_result.scalar() or 0

            # Streak
            streak = await self.analytics._calculate_streak(user_id)

            # Learning score
            learning_data = await self.analytics.calculate_learning_score(user_id)

            return {
                "total_questions": total_questions,
                "correct": correct,
                "accuracy": accuracy,
                "perfect_count": perfect_count,
                "flashcard_reviews": flashcard_reviews,
                "streak_days": streak,
                "learning_score": learning_data.get("total_score", 0),
            }
        except Exception:
            # Return default stats if any query fails
            return {
                "total_questions": 0,
                "correct": 0,
                "accuracy": 0,
                "perfect_count": 0,
                "flashcard_reviews": 0,
                "streak_days": 0,
                "learning_score": 0,
            }

    def _calculate_progress(
        self, achievement: Achievement, user_stats: Dict[str, Any]
    ) -> Tuple[Optional[float], Optional[str]]:
        """Calculate progress toward a locked achievement."""
        trigger_type = achievement.trigger_type
        config = achievement.trigger_config or {}

        if trigger_type == "quiz_score":
            # Can't show progress for one-time score achievements
            return None, None

        elif trigger_type == "perfect_count":
            min_count = config.get("min_count", 3)
            current = user_stats.get("perfect_count", 0)
            progress = min(100, (current / min_count) * 100)
            return progress, f"{current}/{min_count} perfect scores"

        elif trigger_type == "overall_accuracy":
            min_acc = config.get("min_accuracy", 90)
            min_q = config.get("min_questions", 50)
            current_acc = user_stats.get("accuracy", 0)
            current_q = user_stats.get("total_questions", 0)

            if current_q < min_q:
                progress = (current_q / min_q) * 50  # 50% for volume
                return progress, f"{current_q}/{min_q} questions needed"
            else:
                progress = 50 + (min(current_acc, min_acc) / min_acc) * 50
                return progress, f"{current_acc:.1f}%/{min_acc}% accuracy"

        elif trigger_type == "streak":
            min_days = config.get("min_days", 7)
            current = user_stats.get("streak_days", 0)
            progress = min(100, (current / min_days) * 100)
            return progress, f"{current}/{min_days} day streak"

        elif trigger_type == "total_questions":
            min_count = config.get("min_count", 100)
            current = user_stats.get("total_questions", 0)
            progress = min(100, (current / min_count) * 100)
            return progress, f"{current}/{min_count} questions"

        elif trigger_type == "flashcard_reviews":
            min_count = config.get("min_count", 100)
            current = user_stats.get("flashcard_reviews", 0)
            progress = min(100, (current / min_count) * 100)
            return progress, f"{current}/{min_count} reviews"

        elif trigger_type == "learning_score":
            min_score = config.get("min_score", 70)
            current = user_stats.get("learning_score", 0)
            progress = min(100, (current / min_score) * 100)
            return progress, f"{current:.0f}/{min_score} learning score"

        return None, None

    async def _check_perfect_count(self, user_id: Optional[int]) -> Optional[AwardAchievementResponse]:
        """Check if user has earned triple_perfect achievement."""
        # Note: QuizSession doesn't have user_id column, so we count all perfect scores
        # A "perfect score" is when score equals total_questions (100%)
        perfect_query = select(func.count(QuizSession.id)).where(
            and_(
                QuizSession.completed == True,
                QuizSession.score == QuizSession.total_questions,
                QuizSession.total_questions > 0,
            )
        )
        result = await self.db.execute(perfect_query)
        count = result.scalar() or 0

        if count >= 3:
            return await self.award_achievement(
                user_id, "triple_perfect", {"count": count}
            )
        return None

    async def _trigger_blockchain_verification(
        self,
        user_achievement: UserAchievement,
        achievement: Achievement,
        user: Optional[User] = None,
    ) -> None:
        """
        Trigger blockchain verification for an achievement.

        This uploads the certificate to IPFS and anchors it to Base L2.
        Runs asynchronously so it doesn't block the achievement award.
        """
        try:
            # Get user display name
            user_display = None
            if user:
                user_display = user.name or user.email.split("@")[0] if user.email else None

            # Create certificate
            certificate = blockchain_service.create_certificate(
                achievement_slug=achievement.slug,
                achievement_name=achievement.name,
                achievement_rarity=achievement.rarity,
                user_id=user_achievement.user_id,
                user_display=user_display,
                earned_at=user_achievement.earned_at,
                context=user_achievement.context_data,
            )

            logger.info(
                "blockchain_certificate_created",
                achievement=achievement.slug,
                user_id=user_achievement.user_id,
            )

            # Upload to IPFS
            ipfs_hash, ipfs_url = await blockchain_service.upload_to_ipfs(certificate)

            if ipfs_hash:
                user_achievement.ipfs_hash = ipfs_hash
                user_achievement.ipfs_url = ipfs_url
                user_achievement.verification_status = "uploaded"
                user_achievement.certificate_data = certificate
                await self.db.commit()

                logger.info(
                    "blockchain_ipfs_uploaded",
                    ipfs_hash=ipfs_hash,
                    achievement=achievement.slug,
                )

                # Anchor to Base L2
                tx_hash, block_number = await blockchain_service.anchor_to_chain(ipfs_hash)

                if tx_hash:
                    user_achievement.tx_hash = tx_hash
                    user_achievement.block_number = block_number
                    user_achievement.chain_id = blockchain_service.base_chain_id
                    user_achievement.verification_status = "verified"
                    await self.db.commit()

                    logger.info(
                        "blockchain_anchored",
                        tx_hash=tx_hash,
                        block_number=block_number,
                        achievement=achievement.slug,
                    )
                else:
                    logger.warning(
                        "blockchain_anchor_skipped",
                        reason="chain_not_configured_or_failed",
                        achievement=achievement.slug,
                    )
            else:
                logger.warning(
                    "blockchain_ipfs_skipped",
                    reason="ipfs_not_configured_or_failed",
                    achievement=achievement.slug,
                )

        except Exception as e:
            logger.error(
                "blockchain_verification_error",
                error=str(e),
                achievement=achievement.slug,
                user_id=user_achievement.user_id,
            )
            # Don't raise - blockchain verification is non-critical
