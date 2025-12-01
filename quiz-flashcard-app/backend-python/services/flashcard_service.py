"""
Flashcard service - business logic for flashcard management with SM-2 spaced repetition.
"""
from datetime import datetime, timedelta
from typing import List, Optional

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.flashcard import Flashcard
from models.flashcard_progress import FlashcardProgress
from schemas.flashcard import FlashcardCreate, FlashcardUpdate

logger = structlog.get_logger()


class FlashcardService:
    """Service for managing flashcards with SM-2 spaced repetition algorithm."""

    # SM-2 Algorithm Constants
    MIN_EASINESS_FACTOR = 1.3  # Minimum EF value
    DEFAULT_EASINESS_FACTOR = 2.5  # Starting EF for new cards

    def calculate_sm2(
        self,
        quality: int,
        repetition_count: int,
        easiness_factor: float,
        interval_days: int,
    ) -> tuple[int, float, int]:
        """
        Calculate next review interval using SM-2 algorithm.

        Args:
            quality: User's response quality (0-5)
                0 - Complete blackout, no recall
                1 - Incorrect, but upon seeing correct answer, remembered
                2 - Incorrect, but correct answer seemed easy to recall
                3 - Correct with serious difficulty
                4 - Correct with some hesitation
                5 - Perfect response, instant recall
            repetition_count: Current successful repetition count
            easiness_factor: Current easiness factor (starts at 2.5)
            interval_days: Current interval in days

        Returns:
            Tuple of (new_repetition_count, new_easiness_factor, new_interval_days)
        """
        # Calculate new easiness factor (EF)
        # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        new_ef = easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ef = max(self.MIN_EASINESS_FACTOR, new_ef)  # EF should never go below 1.3

        if quality < 3:
            # Failed recall - reset repetitions, review again soon
            new_repetition = 0
            new_interval = 1  # Review tomorrow
        else:
            # Successful recall - increase interval
            new_repetition = repetition_count + 1

            if new_repetition == 1:
                new_interval = 1  # First successful review: 1 day
            elif new_repetition == 2:
                new_interval = 6  # Second successful review: 6 days
            else:
                # Subsequent reviews: multiply previous interval by EF
                new_interval = round(interval_days * new_ef)

        return new_repetition, new_ef, new_interval

    async def create_flashcard(
        self,
        db: AsyncSession,
        category_id: int,
        flashcard_data: FlashcardCreate,
    ) -> Flashcard:
        """Create a new flashcard."""
        flashcard = Flashcard(
            category_id=category_id,
            document_id=flashcard_data.document_id,
            front_text=flashcard_data.front_text,
            back_text=flashcard_data.back_text,
            difficulty=flashcard_data.difficulty,
            tags=flashcard_data.tags or [],
        )

        db.add(flashcard)
        await db.flush()
        await db.refresh(flashcard)

        logger.info("flashcard_created", flashcard_id=flashcard.id, category_id=category_id)
        return flashcard

    async def create_bulk_flashcards(
        self,
        db: AsyncSession,
        category_id: int,
        flashcards_data: List[FlashcardCreate],
    ) -> List[Flashcard]:
        """Create multiple flashcards at once."""
        flashcards = []
        for data in flashcards_data:
            flashcard = Flashcard(
                category_id=category_id,
                document_id=data.document_id,
                front_text=data.front_text,
                back_text=data.back_text,
                difficulty=data.difficulty,
                tags=data.tags or [],
            )
            db.add(flashcard)
            flashcards.append(flashcard)

        await db.flush()
        for flashcard in flashcards:
            await db.refresh(flashcard)

        logger.info("flashcards_bulk_created", count=len(flashcards), category_id=category_id)
        return flashcards

    async def get_flashcard_by_id(
        self,
        db: AsyncSession,
        flashcard_id: int,
    ) -> Optional[Flashcard]:
        """Get a flashcard by ID."""
        result = await db.execute(
            select(Flashcard).where(Flashcard.id == flashcard_id)
        )
        return result.scalar_one_or_none()

    async def get_flashcards_by_category(
        self,
        db: AsyncSession,
        category_id: int,
        difficulty: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> List[Flashcard]:
        """Get all flashcards for a category with optional filters."""
        query = select(Flashcard).where(Flashcard.category_id == category_id)

        if difficulty:
            query = query.where(Flashcard.difficulty == difficulty)

        # Note: Tag filtering would need JSON operations for PostgreSQL
        # For now, we filter in Python if tags are provided

        query = query.order_by(Flashcard.created_at.desc())
        result = await db.execute(query)
        flashcards = list(result.scalars().all())

        # Filter by tags if provided
        if tags:
            flashcards = [
                f for f in flashcards
                if f.tags and any(tag in f.tags for tag in tags)
            ]

        return flashcards

    async def update_flashcard(
        self,
        db: AsyncSession,
        flashcard_id: int,
        flashcard_data: FlashcardUpdate,
    ) -> Optional[Flashcard]:
        """Update a flashcard."""
        flashcard = await self.get_flashcard_by_id(db, flashcard_id)
        if not flashcard:
            return None

        update_data = flashcard_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(flashcard, field, value)

        await db.flush()
        await db.refresh(flashcard)

        logger.info("flashcard_updated", flashcard_id=flashcard_id)
        return flashcard

    async def delete_flashcard(
        self,
        db: AsyncSession,
        flashcard_id: int,
    ) -> bool:
        """Delete a flashcard."""
        flashcard = await self.get_flashcard_by_id(db, flashcard_id)
        if not flashcard:
            return False

        await db.delete(flashcard)
        await db.flush()

        logger.info("flashcard_deleted", flashcard_id=flashcard_id)
        return True

    async def rate_flashcard(
        self,
        db: AsyncSession,
        flashcard_id: int,
        rating: float,
    ) -> Optional[Flashcard]:
        """Rate a flashcard (1-5 stars)."""
        flashcard = await self.get_flashcard_by_id(db, flashcard_id)
        if not flashcard:
            return None

        # Average with existing rating if present
        if flashcard.rating:
            flashcard.rating = (flashcard.rating + rating) / 2
        else:
            flashcard.rating = rating

        await db.flush()
        await db.refresh(flashcard)

        logger.info("flashcard_rated", flashcard_id=flashcard_id, rating=rating)
        return flashcard

    # Spaced Repetition Methods

    async def get_progress(
        self,
        db: AsyncSession,
        flashcard_id: int,
        category_id: int,
    ) -> Optional[FlashcardProgress]:
        """Get progress for a specific flashcard."""
        result = await db.execute(
            select(FlashcardProgress)
            .where(FlashcardProgress.flashcard_id == flashcard_id)
            .where(FlashcardProgress.category_id == category_id)
        )
        return result.scalar_one_or_none()

    async def update_progress(
        self,
        db: AsyncSession,
        flashcard_id: int,
        category_id: int,
        confidence_level: float,
    ) -> FlashcardProgress:
        """
        Update flashcard progress using SM-2 spaced repetition algorithm.

        The confidence_level from frontend (1, 3, 5) is mapped to SM-2 quality:
        - 1 (Hard/Forgot) -> quality 1 (Incorrect but remembered after seeing answer)
        - 3 (Medium/Okay) -> quality 3 (Correct with serious difficulty)
        - 5 (Easy/Perfect) -> quality 5 (Perfect response)

        SM-2 Algorithm calculates:
        - Easiness Factor (EF): How easy the card is (2.5 default, min 1.3)
        - Repetition Count: Successful reviews in a row (resets on failure)
        - Interval: Days until next review (1 -> 6 -> n*EF)
        """
        progress = await self.get_progress(db, flashcard_id, category_id)
        now = datetime.utcnow()

        # Map confidence_level to SM-2 quality (0-5)
        # Frontend sends 1, 3, or 5 - we use these directly
        quality = int(confidence_level)

        if progress:
            # Calculate new SM-2 values based on existing progress
            new_rep, new_ef, new_interval = self.calculate_sm2(
                quality=quality,
                repetition_count=progress.repetition_count,
                easiness_factor=progress.easiness_factor,
                interval_days=progress.interval_days if progress.interval_days > 0 else 1,
            )

            progress.confidence_level = confidence_level
            progress.times_reviewed += 1
            progress.last_reviewed = now
            progress.easiness_factor = new_ef
            progress.repetition_count = new_rep
            progress.interval_days = new_interval
            progress.next_review = now + timedelta(days=new_interval)
        else:
            # First review - calculate initial SM-2 values
            new_rep, new_ef, new_interval = self.calculate_sm2(
                quality=quality,
                repetition_count=0,
                easiness_factor=self.DEFAULT_EASINESS_FACTOR,
                interval_days=1,
            )

            progress = FlashcardProgress(
                flashcard_id=flashcard_id,
                category_id=category_id,
                confidence_level=confidence_level,
                times_reviewed=1,
                last_reviewed=now,
                easiness_factor=new_ef,
                repetition_count=new_rep,
                interval_days=new_interval,
                next_review=now + timedelta(days=new_interval),
            )
            db.add(progress)

        await db.flush()
        await db.refresh(progress)

        logger.info(
            "flashcard_progress_updated_sm2",
            flashcard_id=flashcard_id,
            quality=quality,
            easiness_factor=round(progress.easiness_factor, 2),
            repetition_count=progress.repetition_count,
            interval_days=progress.interval_days,
            next_review=progress.next_review.isoformat() if progress.next_review else None,
        )
        return progress

    async def get_flashcards_for_review(
        self,
        db: AsyncSession,
        category_id: int,
        limit: int = 20,
    ) -> List[Flashcard]:
        """
        Get flashcards due for review (spaced repetition).

        Returns flashcards where:
        1. No progress record exists (never reviewed)
        2. next_review date is in the past or today

        Cards are prioritized by:
        - Never reviewed cards first (new material)
        - Then cards most overdue for review
        """
        now = datetime.utcnow()

        # Get flashcards with progress due for review, ordered by most overdue
        due_query = (
            select(FlashcardProgress.flashcard_id)
            .where(FlashcardProgress.category_id == category_id)
            .where(FlashcardProgress.next_review <= now)
            .order_by(FlashcardProgress.next_review.asc())  # Most overdue first
        )
        due_result = await db.execute(due_query)
        due_ids = [row[0] for row in due_result.fetchall()]

        # Get flashcards with no progress (never reviewed)
        all_flashcards_query = (
            select(Flashcard.id)
            .where(Flashcard.category_id == category_id)
        )
        all_result = await db.execute(all_flashcards_query)
        all_ids = [row[0] for row in all_result.fetchall()]

        reviewed_query = (
            select(FlashcardProgress.flashcard_id)
            .where(FlashcardProgress.category_id == category_id)
        )
        reviewed_result = await db.execute(reviewed_query)
        reviewed_ids = [row[0] for row in reviewed_result.fetchall()]

        never_reviewed_ids = [id for id in all_ids if id not in reviewed_ids]

        # Prioritize: never reviewed first, then due for review
        review_ids = (never_reviewed_ids + due_ids)[:limit]

        if not review_ids:
            return []

        result = await db.execute(
            select(Flashcard).where(Flashcard.id.in_(review_ids))
        )
        flashcards = list(result.scalars().all())

        # Sort to maintain priority order
        id_order = {id: i for i, id in enumerate(review_ids)}
        flashcards.sort(key=lambda f: id_order.get(f.id, 999))

        return flashcards

    async def get_flashcard_stats(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> dict:
        """Get statistics for flashcards in a category including SM-2 metrics."""
        # Total count
        total_result = await db.execute(
            select(func.count(Flashcard.id))
            .where(Flashcard.category_id == category_id)
        )
        total = total_result.scalar() or 0

        # Count by difficulty (including concepts)
        flashcards = await self.get_flashcards_by_category(db, category_id)
        by_difficulty = {"easy": 0, "medium": 0, "hard": 0, "concepts": 0}
        for f in flashcards:
            diff = f.difficulty or "medium"
            if diff in by_difficulty:
                by_difficulty[diff] += 1
            else:
                # Handle any unexpected difficulty value
                by_difficulty["medium"] += 1

        # Progress stats with SM-2 metrics
        progress_result = await db.execute(
            select(FlashcardProgress)
            .where(FlashcardProgress.category_id == category_id)
        )
        progress_records = list(progress_result.scalars().all())

        reviewed = len(progress_records)
        avg_confidence = 0.0
        avg_easiness = 0.0
        avg_interval = 0.0
        mastered_count = 0  # Cards with interval >= 21 days (3 weeks)

        if progress_records:
            # Use defensive handling for None values
            avg_confidence = sum((p.confidence_level or 0.0) for p in progress_records) / len(progress_records)
            avg_easiness = sum((p.easiness_factor or 2.5) for p in progress_records) / len(progress_records)
            avg_interval = sum((p.interval_days or 0) for p in progress_records) / len(progress_records)
            mastered_count = sum(1 for p in progress_records if (p.interval_days or 0) >= 21)

        # Count cards due for review
        now = datetime.utcnow()
        due_count = sum(
            1 for p in progress_records
            if p.next_review and p.next_review <= now
        )
        # Add never reviewed cards to due count
        due_count += total - reviewed

        return {
            "total": total,
            "by_difficulty": by_difficulty,
            "reviewed": reviewed,
            "average_confidence": round(avg_confidence, 2),
            # SM-2 specific stats
            "average_easiness_factor": round(avg_easiness, 2),
            "average_interval_days": round(avg_interval, 1),
            "mastered_count": mastered_count,
            "due_for_review": due_count,
        }

    async def get_flashcard_chapters(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> List[str]:
        """Get all unique chapters/tags from flashcards in a category."""
        flashcards = await self.get_flashcards_by_category(db, category_id)

        # Collect all unique tags
        all_tags = set()
        for f in flashcards:
            if f.tags:
                for tag in f.tags:
                    if tag:  # Skip empty tags
                        all_tags.add(tag)

        # Sort alphabetically for consistency
        return sorted(list(all_tags))

    async def get_study_progress(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> dict:
        """Get overall study progress for a category with SM-2 metrics."""
        stats = await self.get_flashcard_stats(db, category_id)

        return {
            "total_cards": stats["total"],
            "reviewed_count": stats["reviewed"],
            "average_confidence": stats["average_confidence"],
            "completion_percentage": round(
                (stats["reviewed"] / stats["total"] * 100) if stats["total"] > 0 else 0, 1
            ),
            # SM-2 metrics
            "average_easiness_factor": stats["average_easiness_factor"],
            "average_interval_days": stats["average_interval_days"],
            "mastered_count": stats["mastered_count"],
            "due_for_review": stats["due_for_review"],
            "mastery_percentage": round(
                (stats["mastered_count"] / stats["total"] * 100) if stats["total"] > 0 else 0, 1
            ),
        }


# Global service instance
flashcard_service = FlashcardService()
