"""
Category service - business logic for category management.
"""
from typing import List, Optional

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.category import Category
from models.question import Question
from models.flashcard import Flashcard
from models.document import Document
from models.notebook_entry import NotebookEntry
from schemas.category import CategoryCreate, CategoryStats, CategoryUpdate

logger = structlog.get_logger()


class CategoryService:
    """Service for managing categories."""

    async def create_category(
        self,
        db: AsyncSession,
        category_data: CategoryCreate,
    ) -> Category:
        """
        Create a new category.

        Args:
            db: Database session
            category_data: Category creation data

        Returns:
            Created category
        """
        category = Category(
            name=category_data.name,
            description=category_data.description,
            color=category_data.color or "#3B82F6",
        )

        db.add(category)
        await db.flush()
        await db.refresh(category)

        logger.info("category_created", category_id=category.id, name=category.name)
        return category

    async def get_category_by_id(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> Optional[Category]:
        """
        Get a category by ID.

        Args:
            db: Database session
            category_id: Category ID

        Returns:
            Category if found, None otherwise
        """
        result = await db.execute(
            select(Category).where(Category.id == category_id)
        )
        return result.scalar_one_or_none()

    async def get_all_categories(
        self,
        db: AsyncSession,
    ) -> List[Category]:
        """
        Get all categories.

        Args:
            db: Database session

        Returns:
            List of all categories
        """
        result = await db.execute(
            select(Category).order_by(Category.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_category(
        self,
        db: AsyncSession,
        category_id: int,
        category_data: CategoryUpdate,
    ) -> Optional[Category]:
        """
        Update a category.

        Args:
            db: Database session
            category_id: Category ID
            category_data: Update data

        Returns:
            Updated category if found, None otherwise
        """
        category = await self.get_category_by_id(db, category_id)
        if not category:
            return None

        # Update only provided fields
        update_data = category_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)

        await db.flush()
        await db.refresh(category)

        logger.info("category_updated", category_id=category_id)
        return category

    async def delete_category(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> bool:
        """
        Delete a category (cascades to all related content).

        Args:
            db: Database session
            category_id: Category ID

        Returns:
            True if deleted, False if not found
        """
        category = await self.get_category_by_id(db, category_id)
        if not category:
            return False

        await db.delete(category)
        await db.flush()

        logger.info("category_deleted", category_id=category_id)
        return True

    async def get_category_stats(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> CategoryStats:
        """
        Get statistics for a category.

        Args:
            db: Database session
            category_id: Category ID

        Returns:
            Category statistics
        """
        # Count questions
        question_result = await db.execute(
            select(func.count(Question.id)).where(Question.category_id == category_id)
        )
        question_count = question_result.scalar() or 0

        # Count flashcards
        flashcard_result = await db.execute(
            select(func.count(Flashcard.id)).where(Flashcard.category_id == category_id)
        )
        flashcard_count = flashcard_result.scalar() or 0

        # Count documents
        document_result = await db.execute(
            select(func.count(Document.id)).where(Document.category_id == category_id)
        )
        document_count = document_result.scalar() or 0

        # Count notebook entries
        notebook_result = await db.execute(
            select(func.count(NotebookEntry.id)).where(NotebookEntry.category_id == category_id)
        )
        notebook_count = notebook_result.scalar() or 0

        return CategoryStats(
            question_count=question_count,
            flashcard_count=flashcard_count,
            document_count=document_count,
            notebook_count=notebook_count,
        )

    async def get_category_with_stats(
        self,
        db: AsyncSession,
        category_id: int,
    ) -> Optional[tuple[Category, CategoryStats]]:
        """
        Get a category with its statistics.

        Args:
            db: Database session
            category_id: Category ID

        Returns:
            Tuple of (category, stats) if found, None otherwise
        """
        category = await self.get_category_by_id(db, category_id)
        if not category:
            return None

        stats = await self.get_category_stats(db, category_id)
        return (category, stats)

    async def get_all_categories_with_stats(
        self,
        db: AsyncSession,
    ) -> List[tuple[Category, CategoryStats]]:
        """
        Get all categories with their statistics.

        Args:
            db: Database session

        Returns:
            List of (category, stats) tuples
        """
        categories = await self.get_all_categories(db)
        result = []

        for category in categories:
            stats = await self.get_category_stats(db, category.id)
            result.append((category, stats))

        return result


# Global service instance
category_service = CategoryService()
