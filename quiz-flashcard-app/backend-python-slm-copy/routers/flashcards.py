"""
Flashcard API endpoints with SM-2 spaced repetition support.
"""
from typing import List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from schemas.flashcard import (
    FlashcardCreate,
    FlashcardListResponse,
    FlashcardResponse,
    FlashcardStatsResponse,
    FlashcardUpdate,
    FlashcardProgressResponse,
    RateFlashcardRequest,
    StudyProgressResponse,
    UpdateProgressRequest,
)
from services.flashcard_service import flashcard_service

logger = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["flashcards"])


# ============== Flashcard CRUD ==============


@router.get(
    "/categories/{category_id}/flashcards",
    response_model=FlashcardListResponse,
    summary="Get all flashcards for a category",
)
async def get_flashcards(
    category_id: int,
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    db: AsyncSession = Depends(get_db),
):
    """Get all flashcards for a category with optional filters."""
    flashcards = await flashcard_service.get_flashcards_by_category(
        db, category_id, difficulty=difficulty, tags=tags
    )

    return FlashcardListResponse(
        flashcards=[FlashcardResponse.model_validate(f) for f in flashcards],
        total=len(flashcards),
    )


@router.post(
    "/categories/{category_id}/flashcards",
    response_model=FlashcardResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new flashcard",
)
async def create_flashcard(
    category_id: int,
    flashcard_data: FlashcardCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new flashcard in a category."""
    flashcard = await flashcard_service.create_flashcard(db, category_id, flashcard_data)
    await db.commit()

    logger.info("flashcard_created_via_api", flashcard_id=flashcard.id, category_id=category_id)
    return FlashcardResponse.model_validate(flashcard)


@router.post(
    "/categories/{category_id}/flashcards/bulk",
    response_model=FlashcardListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create multiple flashcards at once",
)
async def create_bulk_flashcards(
    category_id: int,
    flashcards_data: List[FlashcardCreate],
    db: AsyncSession = Depends(get_db),
):
    """Create multiple flashcards in a category."""
    flashcards = await flashcard_service.create_bulk_flashcards(db, category_id, flashcards_data)
    await db.commit()

    logger.info("flashcards_bulk_created_via_api", count=len(flashcards), category_id=category_id)
    return FlashcardListResponse(
        flashcards=[FlashcardResponse.model_validate(f) for f in flashcards],
        total=len(flashcards),
    )


@router.get(
    "/flashcards/{flashcard_id}",
    response_model=FlashcardResponse,
    summary="Get a flashcard by ID",
)
async def get_flashcard(
    flashcard_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific flashcard by ID."""
    flashcard = await flashcard_service.get_flashcard_by_id(db, flashcard_id)
    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flashcard with ID {flashcard_id} not found",
        )

    return FlashcardResponse.model_validate(flashcard)


@router.put(
    "/flashcards/{flashcard_id}",
    response_model=FlashcardResponse,
    summary="Update a flashcard",
)
async def update_flashcard(
    flashcard_id: int,
    flashcard_data: FlashcardUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing flashcard."""
    flashcard = await flashcard_service.update_flashcard(db, flashcard_id, flashcard_data)
    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flashcard with ID {flashcard_id} not found",
        )

    await db.commit()
    logger.info("flashcard_updated_via_api", flashcard_id=flashcard_id)
    return FlashcardResponse.model_validate(flashcard)


@router.delete(
    "/flashcards/{flashcard_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a flashcard",
)
async def delete_flashcard(
    flashcard_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a flashcard."""
    success = await flashcard_service.delete_flashcard(db, flashcard_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flashcard with ID {flashcard_id} not found",
        )

    await db.commit()
    logger.info("flashcard_deleted_via_api", flashcard_id=flashcard_id)


# ============== Rating ==============


@router.post(
    "/flashcards/{flashcard_id}/rate",
    response_model=FlashcardResponse,
    summary="Rate a flashcard",
)
async def rate_flashcard(
    flashcard_id: int,
    rate_data: RateFlashcardRequest,
    db: AsyncSession = Depends(get_db),
):
    """Rate a flashcard (1-5 stars)."""
    flashcard = await flashcard_service.rate_flashcard(db, flashcard_id, rate_data.rating)
    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flashcard with ID {flashcard_id} not found",
        )

    await db.commit()
    logger.info("flashcard_rated_via_api", flashcard_id=flashcard_id, rating=rate_data.rating)
    return FlashcardResponse.model_validate(flashcard)


# ============== Spaced Repetition ==============


@router.get(
    "/categories/{category_id}/flashcards/review",
    response_model=FlashcardListResponse,
    summary="Get flashcards due for review",
)
async def get_flashcards_for_review(
    category_id: int,
    limit: int = Query(20, ge=1, le=100, description="Maximum cards to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get flashcards due for review using spaced repetition.

    Returns flashcards where:
    - No progress record exists (never reviewed)
    - next_review date is in the past or today
    """
    flashcards = await flashcard_service.get_flashcards_for_review(db, category_id, limit=limit)

    return FlashcardListResponse(
        flashcards=[FlashcardResponse.model_validate(f) for f in flashcards],
        total=len(flashcards),
    )


@router.post(
    "/categories/{category_id}/flashcards/{flashcard_id}/progress",
    response_model=FlashcardProgressResponse,
    summary="Update flashcard progress (SM-2 spaced repetition)",
)
async def update_flashcard_progress(
    category_id: int,
    flashcard_id: int,
    progress_data: UpdateProgressRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update flashcard progress using SM-2 spaced repetition algorithm.

    SM-2 Algorithm uses quality ratings (0-5):
    - 0-2: Failed recall - reset repetitions, review tomorrow
    - 3-5: Successful recall - increase interval exponentially

    The frontend sends confidence_level (1, 3, or 5) which maps to:
    - 1 (Hard): Quality 1 - Resets repetitions, review tomorrow
    - 3 (Medium): Quality 3 - Maintains learning, shorter interval
    - 5 (Easy): Quality 5 - Perfect recall, longer interval

    Interval progression: 1 day -> 6 days -> interval * EF (exponential growth)
    """
    # Verify flashcard exists
    flashcard = await flashcard_service.get_flashcard_by_id(db, flashcard_id)
    if not flashcard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flashcard with ID {flashcard_id} not found",
        )

    progress = await flashcard_service.update_progress(
        db, flashcard_id, category_id, progress_data.confidence_level
    )
    await db.commit()

    return FlashcardProgressResponse(
        flashcard_id=progress.flashcard_id,
        confidence_level=progress.confidence_level,
        times_reviewed=progress.times_reviewed,
        last_reviewed=progress.last_reviewed,
        next_review=progress.next_review,
        easiness_factor=progress.easiness_factor,
        repetition_count=progress.repetition_count,
        interval_days=progress.interval_days,
    )


@router.get(
    "/categories/{category_id}/flashcards/{flashcard_id}/progress",
    response_model=FlashcardProgressResponse,
    summary="Get flashcard progress",
)
async def get_flashcard_progress(
    category_id: int,
    flashcard_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get progress for a specific flashcard."""
    progress = await flashcard_service.get_progress(db, flashcard_id, category_id)
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No progress record for flashcard {flashcard_id}",
        )

    return FlashcardProgressResponse.model_validate(progress)


# ============== Statistics ==============


@router.get(
    "/categories/{category_id}/flashcards/stats",
    response_model=FlashcardStatsResponse,
    summary="Get flashcard statistics",
)
async def get_flashcard_stats(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for flashcards in a category."""
    stats = await flashcard_service.get_flashcard_stats(db, category_id)
    return FlashcardStatsResponse(**stats)


@router.get(
    "/categories/{category_id}/flashcards/chapters",
    summary="Get available chapters/tags for flashcards",
)
async def get_flashcard_chapters(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all unique chapters/tags from flashcards in a category."""
    chapters = await flashcard_service.get_flashcard_chapters(db, category_id)
    return {"chapters": chapters, "total": len(chapters)}


@router.get(
    "/categories/{category_id}/study-progress",
    response_model=StudyProgressResponse,
    summary="Get overall study progress with SM-2 metrics",
)
async def get_study_progress(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get overall study progress for a category with SM-2 metrics.

    Returns:
    - total_cards: Total flashcards in category
    - reviewed_count: Cards that have been reviewed at least once
    - average_confidence: Average confidence level across reviewed cards
    - completion_percentage: Percentage of cards reviewed
    - average_easiness_factor: Average SM-2 EF (2.5 is default, higher = easier)
    - average_interval_days: Average days between reviews
    - mastered_count: Cards with interval >= 21 days (considered mastered)
    - due_for_review: Cards that need to be reviewed now
    - mastery_percentage: Percentage of cards mastered
    """
    progress = await flashcard_service.get_study_progress(db, category_id)
    return StudyProgressResponse(**progress)
