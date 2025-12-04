"""
Sample Question service - business logic for AI learning samples.
"""
from typing import List, Optional

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.sample_question import SampleQuestion
from schemas.sample_question import SampleQuestionCreate, SampleQuestionUpdate

logger = structlog.get_logger()


class SampleQuestionService:
    """Service for managing sample questions for AI learning."""

    async def create_sample(
        self,
        db: AsyncSession,
        category_id: int,
        sample_data: SampleQuestionCreate,
    ) -> SampleQuestion:
        """Create a new sample question."""
        sample = SampleQuestion(
            category_id=category_id,
            question_text=sample_data.question_text,
            question_type=sample_data.question_type,
            options=sample_data.options,
            correct_answer=sample_data.correct_answer,
            explanation=sample_data.explanation,
            tags=sample_data.tags or [],
        )

        db.add(sample)
        await db.flush()
        await db.refresh(sample)

        logger.info("sample_question_created", sample_id=sample.id, category_id=category_id)
        return sample

    async def create_bulk_samples(
        self,
        db: AsyncSession,
        category_id: int,
        samples_data: List[SampleQuestionCreate],
    ) -> List[SampleQuestion]:
        """Create multiple sample questions at once."""
        samples = []
        for data in samples_data:
            sample = SampleQuestion(
                category_id=category_id,
                question_text=data.question_text,
                question_type=data.question_type,
                options=data.options,
                correct_answer=data.correct_answer,
                explanation=data.explanation,
                tags=data.tags or [],
            )
            db.add(sample)
            samples.append(sample)

        await db.flush()
        for sample in samples:
            await db.refresh(sample)

        logger.info("sample_questions_bulk_created", count=len(samples), category_id=category_id)
        return samples

    async def get_sample_by_id(
        self,
        db: AsyncSession,
        sample_id: int,
    ) -> Optional[SampleQuestion]:
        """Get a sample question by ID."""
        result = await db.execute(
            select(SampleQuestion).where(SampleQuestion.id == sample_id)
        )
        return result.scalar_one_or_none()

    async def get_samples_by_category(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> List[SampleQuestion]:
        """Get all sample questions for a category."""
        result = await db.execute(
            select(SampleQuestion)
            .where(SampleQuestion.category_id == category_id)
            .order_by(SampleQuestion.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_sample(
        self,
        db: AsyncSession,
        sample_id: int,
        sample_data: SampleQuestionUpdate,
    ) -> Optional[SampleQuestion]:
        """Update a sample question."""
        sample = await self.get_sample_by_id(db, sample_id)
        if not sample:
            return None

        update_data = sample_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(sample, field, value)

        await db.flush()
        await db.refresh(sample)

        logger.info("sample_question_updated", sample_id=sample_id)
        return sample

    async def delete_sample(
        self,
        db: AsyncSession,
        sample_id: int,
    ) -> bool:
        """Delete a sample question."""
        sample = await self.get_sample_by_id(db, sample_id)
        if not sample:
            return False

        await db.delete(sample)
        await db.flush()

        logger.info("sample_question_deleted", sample_id=sample_id)
        return True

    async def get_sample_count(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> int:
        """Get count of sample questions for a category."""
        result = await db.execute(
            select(func.count(SampleQuestion.id))
            .where(SampleQuestion.category_id == category_id)
        )
        return result.scalar() or 0

    async def get_samples_for_ai(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> List[dict]:
        """Get sample questions formatted for AI prompt."""
        samples = await self.get_samples_by_category(db, category_id)
        return [
            {
                "question_text": s.question_text,
                "question_type": s.question_type,
                "options": s.options,
                "correct_answer": s.correct_answer,
                "explanation": s.explanation,
            }
            for s in samples
        ]


# Global service instance
sample_question_service = SampleQuestionService()
