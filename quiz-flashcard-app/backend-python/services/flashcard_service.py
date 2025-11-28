"""
Flashcard service - business logic for flashcard management with spaced repetition.
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
    """Service for managing flashcards with spaced repetition."""

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
        Update flashcard progress with spaced repetition algorithm.

        The next review date is calculated as: 2^confidence days from now
        - Confidence 0: Review tomorrow (1 day)
        - Confidence 1: Review in 2 days
        - Confidence 2: Review in 4 days
        - Confidence 3: Review in 8 days
        - Confidence 4: Review in 16 days
        - Confidence 5: Review in 32 days
        """
        progress = await self.get_progress(db, flashcard_id, category_id)

        now = datetime.utcnow()
        days_until_review = int(2 ** confidence_level)
        next_review = now + timedelta(days=days_until_review)

        if progress:
            progress.confidence_level = confidence_level
            progress.times_reviewed += 1
            progress.last_reviewed = now
            progress.next_review = next_review
        else:
            progress = FlashcardProgress(
                flashcard_id=flashcard_id,
                category_id=category_id,
                confidence_level=confidence_level,
                times_reviewed=1,
                last_reviewed=now,
                next_review=next_review,
            )
            db.add(progress)

        await db.flush()
        await db.refresh(progress)

        logger.info(
            "flashcard_progress_updated",
            flashcard_id=flashcard_id,
            confidence=confidence_level,
            next_review=next_review.isoformat(),
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
        """
        now = datetime.utcnow()

        # Get flashcards with progress due for review
        due_query = (
            select(FlashcardProgress.flashcard_id)
            .where(FlashcardProgress.category_id == category_id)
            .where(FlashcardProgress.next_review <= now)
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

        # Combine: due for review + never reviewed
        review_ids = list(set(due_ids + never_reviewed_ids))[:limit]

        if not review_ids:
            return []

        result = await db.execute(
            select(Flashcard).where(Flashcard.id.in_(review_ids))
        )
        return list(result.scalars().all())

    async def get_flashcard_stats(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> dict:
        """Get statistics for flashcards in a category."""
        # Total count
        total_result = await db.execute(
            select(func.count(Flashcard.id))
            .where(Flashcard.category_id == category_id)
        )
        total = total_result.scalar() or 0

        # Count by difficulty
        flashcards = await self.get_flashcards_by_category(db, category_id)
        by_difficulty = {"easy": 0, "medium": 0, "hard": 0}
        for f in flashcards:
            if f.difficulty in by_difficulty:
                by_difficulty[f.difficulty] += 1

        # Progress stats
        progress_result = await db.execute(
            select(FlashcardProgress)
            .where(FlashcardProgress.category_id == category_id)
        )
        progress_records = list(progress_result.scalars().all())

        reviewed = len(progress_records)
        avg_confidence = 0.0
        if progress_records:
            avg_confidence = sum(p.confidence_level for p in progress_records) / len(progress_records)

        return {
            "total": total,
            "by_difficulty": by_difficulty,
            "reviewed": reviewed,
            "average_confidence": round(avg_confidence, 2),
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
        """Get overall study progress for a category."""
        stats = await self.get_flashcard_stats(db, category_id)

        return {
            "total_cards": stats["total"],
            "reviewed_count": stats["reviewed"],
            "average_confidence": stats["average_confidence"],
            "completion_percentage": round(
                (stats["reviewed"] / stats["total"] * 100) if stats["total"] > 0 else 0, 1
            ),
        }


# Global service instance
flashcard_service = FlashcardService()
