"""
Quiz API endpoints - questions and quiz sessions.
"""
from typing import List, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from middleware.auth_middleware import get_optional_user
from schemas.question import (
    QuestionCreate,
    QuestionListResponse,
    QuestionResponse,
    QuestionStatsResponse,
    QuestionUpdate,
    RateQuestionRequest,
)
from schemas.quiz import (
    CreateQuizResponse,
    ExamIntegrityReport,
    FocusEventCreate,
    FocusEventResponse,
    QuizHistoryItem,
    QuizHistoryResponse,
    QuizQuestionResponse,
    QuizSettings,
    SubmitQuizRequest,
    SubmitQuizResponse,
    QuizResultItem,
)
from services.quiz_service import quiz_service

logger = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["quiz"])


# ============== Question CRUD ==============


@router.get(
    "/categories/{category_id}/questions",
    response_model=QuestionListResponse,
    summary="Get all questions for a category",
)
async def get_questions(
    category_id: int,
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    db: AsyncSession = Depends(get_db),
):
    """Get all questions for a category with optional filters."""
    questions = await quiz_service.get_questions_by_category(
        db, category_id, difficulty=difficulty, tags=tags
    )

    return QuestionListResponse(
        questions=[QuestionResponse.model_validate(q) for q in questions],
        total=len(questions),
    )


@router.post(
    "/categories/{category_id}/questions",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new question",
)
async def create_question(
    category_id: int,
    question_data: QuestionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new question in a category."""
    question = await quiz_service.create_question(db, category_id, question_data)
    await db.commit()

    logger.info("question_created_via_api", question_id=question.id, category_id=category_id)
    return QuestionResponse.model_validate(question)


@router.post(
    "/categories/{category_id}/questions/bulk",
    response_model=QuestionListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create multiple questions at once",
)
async def create_bulk_questions(
    category_id: int,
    questions_data: List[QuestionCreate],
    document_id: Optional[int] = Query(None, description="Document ID for all questions"),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple questions in a category."""
    questions = await quiz_service.create_bulk_questions(
        db, category_id, questions_data, document_id
    )
    await db.commit()

    logger.info("questions_bulk_created_via_api", count=len(questions), category_id=category_id)
    return QuestionListResponse(
        questions=[QuestionResponse.model_validate(q) for q in questions],
        total=len(questions),
    )


@router.get(
    "/questions/{question_id}",
    response_model=QuestionResponse,
    summary="Get a question by ID",
)
async def get_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific question by ID."""
    question = await quiz_service.get_question_by_id(db, question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found",
        )

    return QuestionResponse.model_validate(question)


@router.put(
    "/questions/{question_id}",
    response_model=QuestionResponse,
    summary="Update a question",
)
async def update_question(
    question_id: int,
    question_data: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing question."""
    question = await quiz_service.update_question(db, question_id, question_data)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found",
        )

    await db.commit()
    logger.info("question_updated_via_api", question_id=question_id)
    return QuestionResponse.model_validate(question)


@router.delete(
    "/questions/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a question",
)
async def delete_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a question."""
    success = await quiz_service.delete_question(db, question_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found",
        )

    await db.commit()
    logger.info("question_deleted_via_api", question_id=question_id)


@router.post(
    "/questions/{question_id}/rate",
    response_model=QuestionResponse,
    summary="Rate a question",
)
async def rate_question(
    question_id: int,
    rate_data: RateQuestionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Rate a question (1-5 stars)."""
    question = await quiz_service.rate_question(db, question_id, rate_data.rating)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found",
        )

    await db.commit()
    logger.info("question_rated_via_api", question_id=question_id, rating=rate_data.rating)
    return QuestionResponse.model_validate(question)


@router.get(
    "/categories/{category_id}/questions/stats",
    response_model=QuestionStatsResponse,
    summary="Get question statistics",
)
async def get_question_stats(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for questions in a category."""
    stats = await quiz_service.get_question_stats(db, category_id)
    return QuestionStatsResponse(**stats)


@router.get(
    "/categories/{category_id}/questions/chapters",
    summary="Get available chapters/tags for questions",
)
async def get_question_chapters(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all unique chapters/tags from questions in a category."""
    chapters = await quiz_service.get_question_chapters(db, category_id)
    return {"chapters": chapters, "total": len(chapters)}


# ============== Quiz Sessions ==============


@router.post(
    "/categories/{category_id}/quiz",
    response_model=CreateQuizResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new quiz session",
)
async def create_quiz(
    category_id: int,
    settings: QuizSettings,
    db: AsyncSession = Depends(get_db),
):
    """Create a new quiz session with selected questions."""
    try:
        session, questions = await quiz_service.create_quiz_session(db, category_id, settings)
        await db.commit()

        # Return questions without correct answers
        quiz_questions = [
            QuizQuestionResponse(
                id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                difficulty=q.difficulty,
                options=q.options,
            )
            for q in questions
        ]

        return CreateQuizResponse(
            session_id=session.id,
            questions=quiz_questions,
            total_questions=len(questions),
            settings=settings,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/quiz/{session_id}",
    summary="Get a quiz session",
)
async def get_quiz_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a quiz session by ID."""
    session = await quiz_service.get_quiz_session(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz session with ID {session_id} not found",
        )

    return {
        "id": session.id,
        "category_id": session.category_id,
        "settings": session.settings,
        "questions": session.questions,
        "answers": session.answers,
        "total_questions": session.total_questions,
        "completed": session.completed,
        "score": session.score,
        "started_at": session.started_at,
        "completed_at": session.completed_at,
    }


@router.post(
    "/quiz/{session_id}/submit",
    response_model=SubmitQuizResponse,
    summary="Submit quiz answers",
)
async def submit_quiz(
    session_id: int,
    submit_data: SubmitQuizRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """Submit quiz answers and get results."""
    try:
        user_id = current_user.id if current_user else None
        results = await quiz_service.submit_quiz_answers(
            db,
            session_id,
            submit_data.answers,
            user_id=user_id,
            time_per_question=submit_data.time_per_question,
        )
        await db.commit()

        return SubmitQuizResponse(
            session_id=results["session_id"],
            score=results["score"],
            total=results["total"],
            percentage=results["percentage"],
            results=[QuizResultItem(**r) for r in results["results"]],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/categories/{category_id}/quiz/history",
    response_model=QuizHistoryResponse,
    summary="Get quiz history for a category",
)
async def get_quiz_history(
    category_id: int,
    limit: int = Query(50, ge=1, le=100, description="Maximum sessions to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get quiz history for a category."""
    sessions = await quiz_service.get_quiz_history(db, category_id, limit)

    return QuizHistoryResponse(
        sessions=[
            QuizHistoryItem(
                id=s.id,
                category_id=s.category_id,
                settings=QuizSettings(**s.settings),
                score=s.score,
                total_questions=s.total_questions,
                completed=s.completed,
                started_at=s.started_at,
                completed_at=s.completed_at,
            )
            for s in sessions
        ],
        total=len(sessions),
    )


# ============== Exam Mode - Focus Events ==============


@router.post(
    "/quiz/{session_id}/focus-event",
    response_model=FocusEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a focus event",
)
async def record_focus_event(
    session_id: int,
    event_data: FocusEventCreate,
    db: AsyncSession = Depends(get_db),
):
    """Record a focus event for exam integrity tracking."""
    event = await quiz_service.record_focus_event(
        db, session_id, event_data.event_type, event_data.details
    )
    await db.commit()

    return FocusEventResponse(
        id=event.id,
        session_id=event.session_id,
        event_type=event.event_type,
        timestamp=event.timestamp,
        details=event.details,
    )


@router.get(
    "/quiz/{session_id}/focus-events",
    response_model=List[FocusEventResponse],
    summary="Get focus events for a session",
)
async def get_focus_events(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get focus events for a quiz session."""
    events = await quiz_service.get_focus_events(db, session_id)

    return [
        FocusEventResponse(
            id=e.id,
            session_id=e.session_id,
            event_type=e.event_type,
            timestamp=e.timestamp,
            details=e.details,
        )
        for e in events
    ]


@router.get(
    "/quiz/{session_id}/integrity-report",
    response_model=ExamIntegrityReport,
    summary="Get exam integrity report",
)
async def get_exam_integrity_report(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get exam integrity report for a session."""
    report = await quiz_service.get_exam_integrity_report(db, session_id)

    return ExamIntegrityReport(
        session_id=report["session_id"],
        total_violations=report["total_violations"],
        focus_lost_count=report["focus_lost_count"],
        tab_switch_count=report["tab_switch_count"],
        window_blur_count=report["window_blur_count"],
        integrity_score=report["integrity_score"],
        events=[
            FocusEventResponse(
                id=e.id,
                session_id=e.session_id,
                event_type=e.event_type,
                timestamp=e.timestamp,
                details=e.details,
            )
            for e in report["events"]
        ],
    )
