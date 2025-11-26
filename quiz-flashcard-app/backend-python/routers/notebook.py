"""
Notebook API endpoints - wrong answer tracking.
"""
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from schemas.notebook import (
    MostMissedQuestion,
    MostMissedResponse,
    NotebookEntryCreate,
    NotebookEntryListResponse,
    NotebookEntryResponse,
    NotebookEntryUpdate,
    NotebookStatsResponse,
)
from services.notebook_service import notebook_service

logger = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["notebook"])


@router.get(
    "/categories/{category_id}/notebook",
    response_model=NotebookEntryListResponse,
    summary="Get notebook entries for a category",
)
async def get_notebook_entries(
    category_id: int,
    reviewed: Optional[bool] = Query(None, description="Filter by reviewed status"),
    limit: Optional[int] = Query(None, ge=1, le=100, description="Max entries to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get all notebook entries for a category with optional filters."""
    entries = await notebook_service.get_entries_by_category(
        db, category_id, reviewed=reviewed, limit=limit
    )

    return NotebookEntryListResponse(
        entries=[NotebookEntryResponse(**e) for e in entries],
        total=len(entries),
    )


@router.get(
    "/notebook/{entry_id}",
    response_model=NotebookEntryResponse,
    summary="Get a notebook entry by ID",
)
async def get_notebook_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific notebook entry by ID."""
    entry = await notebook_service.get_entry_by_id(db, entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notebook entry with ID {entry_id} not found",
        )

    # Build response with question data
    return NotebookEntryResponse(
        id=entry.id,
        category_id=entry.category_id,
        question_id=entry.question_id,
        quiz_session_id=entry.quiz_session_id,
        user_answer=entry.user_answer,
        correct_answer=entry.correct_answer,
        notes=entry.notes,
        reviewed=entry.reviewed,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        question_text=entry.question.question_text if entry.question else None,
        options=entry.question.options if entry.question else None,
        explanation=entry.question.explanation if entry.question else None,
        difficulty=entry.question.difficulty if entry.question else None,
    )


@router.post(
    "/categories/{category_id}/notebook",
    response_model=NotebookEntryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new notebook entry",
)
async def create_notebook_entry(
    category_id: int,
    entry_data: NotebookEntryCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new notebook entry (wrong answer record)."""
    entry = await notebook_service.create_entry(db, category_id, entry_data)
    await db.commit()

    logger.info("notebook_entry_created_via_api", entry_id=entry.id, category_id=category_id)
    return NotebookEntryResponse(
        id=entry.id,
        category_id=entry.category_id,
        question_id=entry.question_id,
        quiz_session_id=entry.quiz_session_id,
        user_answer=entry.user_answer,
        correct_answer=entry.correct_answer,
        notes=entry.notes,
        reviewed=entry.reviewed,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


@router.put(
    "/notebook/{entry_id}",
    response_model=NotebookEntryResponse,
    summary="Update a notebook entry",
)
async def update_notebook_entry(
    entry_id: int,
    entry_data: NotebookEntryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a notebook entry (notes, reviewed status)."""
    entry = await notebook_service.update_entry(db, entry_id, entry_data)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notebook entry with ID {entry_id} not found",
        )

    await db.commit()
    logger.info("notebook_entry_updated_via_api", entry_id=entry_id)
    return NotebookEntryResponse(
        id=entry.id,
        category_id=entry.category_id,
        question_id=entry.question_id,
        quiz_session_id=entry.quiz_session_id,
        user_answer=entry.user_answer,
        correct_answer=entry.correct_answer,
        notes=entry.notes,
        reviewed=entry.reviewed,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        question_text=entry.question.question_text if entry.question else None,
        options=entry.question.options if entry.question else None,
        explanation=entry.question.explanation if entry.question else None,
        difficulty=entry.question.difficulty if entry.question else None,
    )


@router.post(
    "/notebook/{entry_id}/mark-reviewed",
    response_model=NotebookEntryResponse,
    summary="Mark a notebook entry as reviewed",
)
async def mark_entry_reviewed(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Mark a notebook entry as reviewed."""
    entry = await notebook_service.mark_as_reviewed(db, entry_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notebook entry with ID {entry_id} not found",
        )

    await db.commit()
    logger.info("notebook_entry_marked_reviewed", entry_id=entry_id)
    return NotebookEntryResponse(
        id=entry.id,
        category_id=entry.category_id,
        question_id=entry.question_id,
        quiz_session_id=entry.quiz_session_id,
        user_answer=entry.user_answer,
        correct_answer=entry.correct_answer,
        notes=entry.notes,
        reviewed=entry.reviewed,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


@router.delete(
    "/notebook/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a notebook entry",
)
async def delete_notebook_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a notebook entry."""
    success = await notebook_service.delete_entry(db, entry_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notebook entry with ID {entry_id} not found",
        )

    await db.commit()
    logger.info("notebook_entry_deleted_via_api", entry_id=entry_id)


@router.get(
    "/categories/{category_id}/notebook/stats",
    response_model=NotebookStatsResponse,
    summary="Get notebook statistics",
)
async def get_notebook_stats(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for notebook entries in a category."""
    stats = await notebook_service.get_notebook_stats(db, category_id)
    return NotebookStatsResponse(**stats)


@router.get(
    "/categories/{category_id}/notebook/most-missed",
    response_model=MostMissedResponse,
    summary="Get most frequently missed questions",
)
async def get_most_missed_questions(
    category_id: int,
    limit: int = Query(10, ge=1, le=50, description="Max questions to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get questions that have been missed most frequently."""
    questions = await notebook_service.get_most_missed_questions(db, category_id, limit)

    return MostMissedResponse(
        questions=[MostMissedQuestion(**q) for q in questions],
        total=len(questions),
    )


@router.delete(
    "/categories/{category_id}/notebook",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear all notebook entries for a category",
)
async def clear_category_notebook(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Clear all notebook entries for a category."""
    await notebook_service.clear_category(db, category_id)
    await db.commit()
    logger.info("notebook_cleared_via_api", category_id=category_id)
