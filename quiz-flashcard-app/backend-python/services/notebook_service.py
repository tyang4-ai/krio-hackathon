"""
Notebook service - business logic for tracking wrong answers.
"""
from typing import List, Optional

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.notebook_entry import NotebookEntry
from models.question import Question
from schemas.notebook import NotebookEntryCreate, NotebookEntryUpdate

logger = structlog.get_logger()


class NotebookService:
    """Service for managing notebook entries (wrong answer tracking)."""

    async def create_entry(
        self,
        db: AsyncSession,
        category_id: int,
        entry_data: NotebookEntryCreate,
    ) -> NotebookEntry:
        """Create a new notebook entry."""
        entry = NotebookEntry(
            category_id=category_id,
            question_id=entry_data.question_id,
            quiz_session_id=entry_data.quiz_session_id,
            user_answer=entry_data.user_answer,
            correct_answer=entry_data.correct_answer,
            notes=entry_data.notes or "",
        )

        db.add(entry)
        await db.flush()
        await db.refresh(entry)

        logger.info("notebook_entry_created", entry_id=entry.id, category_id=category_id)
        return entry

    async def create_bulk_entries(
        self,
        db: AsyncSession,
        category_id: int,
        entries_data: List[NotebookEntryCreate],
    ) -> List[NotebookEntry]:
        """Create multiple notebook entries at once."""
        entries = []
        for data in entries_data:
            entry = NotebookEntry(
                category_id=category_id,
                question_id=data.question_id,
                quiz_session_id=data.quiz_session_id,
                user_answer=data.user_answer,
                correct_answer=data.correct_answer,
                notes=data.notes or "",
            )
            db.add(entry)
            entries.append(entry)

        await db.flush()
        for entry in entries:
            await db.refresh(entry)

        logger.info("notebook_entries_bulk_created", count=len(entries), category_id=category_id)
        return entries

    async def get_entry_by_id(
        self,
        db: AsyncSession,
        entry_id: int,
    ) -> Optional[NotebookEntry]:
        """Get a notebook entry by ID with question data."""
        result = await db.execute(
            select(NotebookEntry)
            .options(selectinload(NotebookEntry.question))
            .where(NotebookEntry.id == entry_id)
        )
        return result.scalar_one_or_none()

    async def get_entries_by_category(
        self,
        db: AsyncSession,
        category_id: int,
        reviewed: Optional[bool] = None,
        limit: Optional[int] = None,
    ) -> List[dict]:
        """Get all notebook entries for a category with question data."""
        query = (
            select(NotebookEntry)
            .options(selectinload(NotebookEntry.question))
            .where(NotebookEntry.category_id == category_id)
        )

        if reviewed is not None:
            query = query.where(NotebookEntry.reviewed == reviewed)

        query = query.order_by(NotebookEntry.created_at.desc())

        if limit:
            query = query.limit(limit)

        result = await db.execute(query)
        entries = result.scalars().all()

        # Join with question data
        return [
            {
                "id": entry.id,
                "category_id": entry.category_id,
                "question_id": entry.question_id,
                "quiz_session_id": entry.quiz_session_id,
                "user_answer": entry.user_answer,
                "correct_answer": entry.correct_answer,
                "notes": entry.notes,
                "reviewed": entry.reviewed,
                "created_at": entry.created_at,
                "updated_at": entry.updated_at,
                # Question data
                "question_text": entry.question.question_text if entry.question else None,
                "options": entry.question.options if entry.question else None,
                "explanation": entry.question.explanation if entry.question else None,
                "difficulty": entry.question.difficulty if entry.question else None,
            }
            for entry in entries
        ]

    async def update_entry(
        self,
        db: AsyncSession,
        entry_id: int,
        entry_data: NotebookEntryUpdate,
    ) -> Optional[NotebookEntry]:
        """Update a notebook entry."""
        entry = await self.get_entry_by_id(db, entry_id)
        if not entry:
            return None

        update_data = entry_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(entry, field, value)

        await db.flush()
        await db.refresh(entry)

        logger.info("notebook_entry_updated", entry_id=entry_id)
        return entry

    async def delete_entry(
        self,
        db: AsyncSession,
        entry_id: int,
    ) -> bool:
        """Delete a notebook entry."""
        entry = await self.get_entry_by_id(db, entry_id)
        if not entry:
            return False

        await db.delete(entry)
        await db.flush()

        logger.info("notebook_entry_deleted", entry_id=entry_id)
        return True

    async def mark_as_reviewed(
        self,
        db: AsyncSession,
        entry_id: int,
    ) -> Optional[NotebookEntry]:
        """Mark a notebook entry as reviewed."""
        return await self.update_entry(
            db, entry_id, NotebookEntryUpdate(reviewed=True)
        )

    async def get_notebook_stats(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> dict:
        """Get statistics for notebook entries in a category."""
        # Total count
        total_result = await db.execute(
            select(func.count(NotebookEntry.id))
            .where(NotebookEntry.category_id == category_id)
        )
        total = total_result.scalar() or 0

        # Reviewed count
        reviewed_result = await db.execute(
            select(func.count(NotebookEntry.id))
            .where(NotebookEntry.category_id == category_id)
            .where(NotebookEntry.reviewed == True)
        )
        reviewed = reviewed_result.scalar() or 0

        return {
            "total_entries": total,
            "reviewed_entries": reviewed,
            "unreviewed_entries": total - reviewed,
        }

    async def get_most_missed_questions(
        self,
        db: AsyncSession,
        category_id: int,
        limit: int = 10,
    ) -> List[dict]:
        """Get questions that have been missed most frequently."""
        result = await db.execute(
            select(
                Question.id,
                Question.question_text,
                Question.difficulty,
                func.count(NotebookEntry.id).label("times_missed"),
            )
            .join(NotebookEntry, NotebookEntry.question_id == Question.id)
            .where(NotebookEntry.category_id == category_id)
            .group_by(Question.id, Question.question_text, Question.difficulty)
            .order_by(func.count(NotebookEntry.id).desc())
            .limit(limit)
        )

        return [
            {
                "id": row.id,
                "question_text": row.question_text,
                "difficulty": row.difficulty,
                "times_missed": row.times_missed,
            }
            for row in result.fetchall()
        ]

    async def clear_category(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> int:
        """Clear all notebook entries for a category."""
        result = await db.execute(
            select(NotebookEntry).where(NotebookEntry.category_id == category_id)
        )
        entries = result.scalars().all()

        count = len(entries)
        for entry in entries:
            await db.delete(entry)

        await db.flush()

        logger.info("notebook_cleared", category_id=category_id, deleted_count=count)
        return count


# Global service instance
notebook_service = NotebookService()
