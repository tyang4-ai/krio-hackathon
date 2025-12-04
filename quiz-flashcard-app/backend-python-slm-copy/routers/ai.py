"""
AI API endpoints - Analysis, Generation, Grading, Handwriting.

This router provides all AI-powered functionality including:
- Sample question analysis
- Question/flashcard generation
- Answer grading with partial credit
- Handwriting recognition
"""
from typing import List, Optional

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from middleware import limiter, RateLimits

from agents import (
    analyze_samples,
    clear_analysis,
    explain_question,
    generate_flashcards,
    generate_from_documents,
    generate_questions,
    get_agent_activity,
    get_analysis_status,
    get_session_grades,
    get_system_stats,
    grade_answer,
    trigger_analysis,
    get_handwritten_answer,
    get_session_handwritten_answers,
    process_handwritten_answer,
    update_with_correction,
)
from config.database import get_db

logger = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["ai"])


# ============== Request/Response Models ==============


class AnalyzeRequest(BaseModel):
    """Request to analyze sample questions."""
    force: bool = Field(False, description="Force re-analysis even if results exist")


class AnalysisStatusResponse(BaseModel):
    """Response for analysis status."""
    has_analysis: bool
    analysis: Optional[dict] = None
    sample_count: int
    samples_by_type: dict


class AgentActivityItem(BaseModel):
    """Single agent activity entry."""
    id: int
    from_agent: str
    to_agent: str
    message_type: str
    payload: dict
    status: str
    created_at: str
    processed_at: Optional[str] = None


class AgentActivityResponse(BaseModel):
    """Response for agent activity."""
    activity: List[AgentActivityItem]
    total: int


class GenerateQuestionsRequest(BaseModel):
    """Request to generate questions."""
    content: Optional[str] = Field(None, description="Text content to generate from")
    document_ids: Optional[List[int]] = Field(None, alias="documentIds", description="Document IDs to use")
    count: int = Field(5, ge=1, le=50, description="Number of questions")
    difficulty: str = Field("medium", description="easy, medium, or hard")
    question_type: str = Field("multiple_choice", alias="contentType", description="Question type")
    custom_directions: str = Field("", alias="customDirections", description="Additional instructions")
    chapter: str = Field("", description="Chapter/topic to tag questions with")
    # Phase 3: RAG and validation options
    use_rag: bool = Field(False, alias="useRag", description="Use RAG for semantic context retrieval")
    validate: bool = Field(False, description="Validate and score generated questions")

    model_config = {"populate_by_name": True}


class GeneratedQuestion(BaseModel):
    """A generated question."""
    id: Optional[int] = None
    question_text: str
    question_type: str
    difficulty: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str = ""
    tags: List[str] = []
    # Phase 3: Quality metadata
    quality_score: Optional[float] = None
    bloom_level: Optional[str] = None
    quality_scores: Optional[dict] = None


class GenerateQuestionsResponse(BaseModel):
    """Response for question generation."""
    success: bool
    questions: List[GeneratedQuestion] = []
    error: Optional[str] = None
    # Phase 3: Validation info
    validation: Optional[dict] = None


class GenerateFlashcardsRequest(BaseModel):
    """Request to generate flashcards."""
    content: Optional[str] = Field(None, description="Text content to generate from")
    document_ids: Optional[List[int]] = Field(None, alias="documentIds", description="Document IDs to use")
    count: int = Field(10, ge=1, le=50, description="Number of flashcards")
    difficulty: str = Field("medium", description="Difficulty level: easy, medium, hard")
    custom_directions: str = Field("", alias="customDirections", description="Additional instructions")
    chapter: str = Field("", description="Chapter/topic to tag flashcards with")

    model_config = {"populate_by_name": True}


class GeneratedFlashcard(BaseModel):
    """A generated flashcard."""
    id: Optional[int] = None
    front_text: str
    back_text: str
    difficulty: str = "medium"
    tags: List[str] = []


class GenerateFlashcardsResponse(BaseModel):
    """Response for flashcard generation."""
    success: bool
    flashcards: List[GeneratedFlashcard] = []
    error: Optional[str] = None


class GradeAnswerRequest(BaseModel):
    """Request to grade an answer."""
    user_answer: str
    use_partial_credit: bool = True
    is_handwritten: bool = False
    recognized_text: Optional[str] = None


class GradeBreakdownItem(BaseModel):
    """Breakdown of grading for partial credit."""
    component: str
    max_points: float
    earned_points: float
    correct: bool
    feedback: str


class GradeAnswerResponse(BaseModel):
    """Response for answer grading."""
    success: bool
    is_correct: bool = False
    earned_points: float = 0
    total_points: float = 1.0
    feedback: str = ""
    breakdown: List[GradeBreakdownItem] = []
    correct_parts: List[str] = []
    incorrect_parts: List[str] = []
    suggestions: List[str] = []
    error: Optional[str] = None


class HandwrittenAnswerResponse(BaseModel):
    """Response for handwritten answer."""
    id: int
    session_id: int
    question_id: int
    recognized_text: str
    confidence_score: float
    file_path: str
    original_name: str
    created_at: str


class CorrectionRequest(BaseModel):
    """Request to update handwriting correction."""
    corrected_text: str
    corrections: List[dict] = []


class SystemStatsResponse(BaseModel):
    """Response for system stats."""
    category_id: int
    sample_questions: int
    documents: int
    has_analysis: bool
    analysis_updated_at: Optional[str] = None
    agent_messages: int


# ============== Analysis Endpoints ==============


@router.post(
    "/categories/{category_id}/analyze-samples",
    response_model=dict,
    summary="Analyze sample questions",
)
@limiter.limit(RateLimits.AI_ANALYZE)
async def analyze_category_samples(
    request: Request,
    category_id: int,
    analyze_request: Optional[AnalyzeRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger AI analysis of sample questions for a category.

    The analysis extracts patterns and style guides that will be
    used to generate consistent questions.
    """
    force = analyze_request.force if analyze_request else False
    result = await trigger_analysis(db, category_id, force=force)
    await db.commit()

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Analysis failed"),
        )

    logger.info("analysis_triggered", category_id=category_id)
    return result


@router.get(
    "/categories/{category_id}/analysis-status",
    summary="Get analysis status",
)
async def get_category_analysis_status(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get the current analysis status for a category."""
    try:
        status_data = await get_analysis_status(db, category_id)
        # Return in format frontend expects (hasAnalysis, sampleCount, lastUpdated)
        return {
            "hasAnalysis": status_data.get("has_analysis", False),
            "has_analysis": status_data.get("has_analysis", False),
            "analysis": status_data.get("analysis"),
            "sampleCount": status_data.get("sample_count", 0),
            "sample_count": status_data.get("sample_count", 0),
            "samples_by_type": status_data.get("samples_by_type", {}),
            "lastUpdated": status_data.get("analysis", {}).get("updated_at") if status_data.get("analysis") else None,
        }
    except Exception as e:
        logger.error("analysis_status_error", category_id=category_id, error=str(e))
        # Return default response instead of 500 error
        return {
            "hasAnalysis": False,
            "has_analysis": False,
            "analysis": None,
            "sampleCount": 0,
            "sample_count": 0,
            "samples_by_type": {},
            "lastUpdated": None,
        }


@router.delete(
    "/categories/{category_id}/analysis",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear analysis",
)
async def clear_category_analysis(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Clear analysis results, forcing re-analysis on next request."""
    await clear_analysis(db, category_id)
    await db.commit()
    logger.info("analysis_cleared", category_id=category_id)


@router.get(
    "/categories/{category_id}/agent-activity",
    response_model=AgentActivityResponse,
    summary="Get agent activity",
)
async def get_category_agent_activity(
    category_id: int,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get recent agent communication activity for a category."""
    activity = await get_agent_activity(db, category_id, limit)
    return AgentActivityResponse(
        activity=[AgentActivityItem(**a) for a in activity],
        total=len(activity),
    )


@router.get(
    "/categories/{category_id}/ai-stats",
    response_model=SystemStatsResponse,
    summary="Get AI system stats",
)
async def get_category_ai_stats(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get AI system statistics for a category."""
    stats = await get_system_stats(db, category_id)
    return SystemStatsResponse(**stats)


# ============== Generation Endpoints ==============


@router.post(
    "/categories/{category_id}/generate-questions",
    response_model=GenerateQuestionsResponse,
    summary="Generate questions",
)
@limiter.limit(RateLimits.AI_GENERATE)
async def generate_category_questions(
    request: Request,
    category_id: int,
    gen_request: GenerateQuestionsRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate questions using AI.

    Can generate from:
    - Provided text content
    - Existing documents (by ID)
    - All documents in category (if neither specified)
    """
    import traceback

    try:
        logger.info(
            "generate_questions_request",
            category_id=category_id,
            has_content=bool(gen_request.content),
            document_ids=gen_request.document_ids,
            count=gen_request.count,
            difficulty=gen_request.difficulty,
            question_type=gen_request.question_type,
            use_rag=gen_request.use_rag,
            validate=gen_request.validate,
        )

        # Determine content source
        if gen_request.content:
            # Use provided content
            result = await generate_questions(
                db=db,
                category_id=category_id,
                content=gen_request.content,
                count=gen_request.count,
                difficulty=gen_request.difficulty,
                question_type=gen_request.question_type,
                custom_directions=gen_request.custom_directions,
                chapter=gen_request.chapter,
                use_rag=gen_request.use_rag,
                validate=gen_request.validate,
                document_ids=gen_request.document_ids,
            )
        elif gen_request.document_ids:
            # Use specific documents
            result = await generate_from_documents(
                db=db,
                category_id=category_id,
                document_ids=gen_request.document_ids,
                count=gen_request.count,
                difficulty=gen_request.difficulty,
                question_type=gen_request.question_type,
                custom_directions=gen_request.custom_directions,
                chapter=gen_request.chapter,
                use_rag=gen_request.use_rag,
                validate=gen_request.validate,
            )
        else:
            # Use all documents in category
            result = await generate_from_documents(
                db=db,
                category_id=category_id,
                document_ids=None,
                count=gen_request.count,
                difficulty=gen_request.difficulty,
                question_type=gen_request.question_type,
                custom_directions=gen_request.custom_directions,
                chapter=gen_request.chapter,
                use_rag=gen_request.use_rag,
                validate=gen_request.validate,
            )

        await db.commit()

        if not result.get("success"):
            return GenerateQuestionsResponse(
                success=False,
                error=result.get("error", "Generation failed"),
            )

        # Convert stored questions to response
        questions = []
        stored = result.get("stored_questions", [])
        for q in stored:
            questions.append(GeneratedQuestion(
                id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                difficulty=q.difficulty,
                options=q.options,
                correct_answer=q.correct_answer,
                explanation=q.explanation or "",
                tags=q.tags or [],
                # Phase 3: Quality metadata
                quality_score=q.quality_score,
                bloom_level=q.bloom_level,
                quality_scores=q.quality_scores,
            ))

        # If no stored questions, use raw questions
        if not questions:
            for q in result.get("questions", []):
                questions.append(GeneratedQuestion(
                    question_text=q["question_text"],
                    question_type=q["question_type"],
                    difficulty=q["difficulty"],
                    options=q.get("options"),
                    correct_answer=q["correct_answer"],
                    explanation=q.get("explanation", ""),
                    tags=q.get("tags", []),
                    # Phase 3: Quality metadata
                    quality_score=q.get("quality_score"),
                    bloom_level=q.get("bloom_level"),
                    quality_scores=q.get("quality_scores"),
                ))

        logger.info(
            "questions_generated",
            category_id=category_id,
            count=len(questions),
            used_rag=gen_request.use_rag,
            validated=gen_request.validate,
        )

        return GenerateQuestionsResponse(
            success=True,
            questions=questions,
            validation=result.get("validation"),
        )

    except Exception as e:
        logger.error(
            "generate_questions_error",
            category_id=category_id,
            error=str(e),
            traceback=traceback.format_exc(),
        )
        raise


@router.post(
    "/categories/{category_id}/generate-flashcards",
    response_model=GenerateFlashcardsResponse,
    summary="Generate flashcards",
)
@limiter.limit(RateLimits.AI_GENERATE)
async def generate_category_flashcards(
    request: Request,
    category_id: int,
    fc_request: GenerateFlashcardsRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate flashcards using AI.

    Can generate from:
    - Provided text content
    - All documents in category (if no content provided)
    """
    if fc_request.content:
        result = await generate_flashcards(
            db=db,
            category_id=category_id,
            content=fc_request.content,
            count=fc_request.count,
            difficulty=fc_request.difficulty,
            custom_directions=fc_request.custom_directions,
            chapter=fc_request.chapter,
        )
    else:
        # Get all documents for category
        from sqlalchemy import select
        from models import Document

        docs_result = await db.execute(
            select(Document).where(Document.category_id == category_id)
        )
        documents = docs_result.scalars().all()

        if not documents:
            return GenerateFlashcardsResponse(
                success=False,
                error="No content or documents provided",
            )

        # Use content_text field from Document model
        combined = "\n\n".join([doc.content_text for doc in documents if doc.content_text])
        if not combined.strip():
            return GenerateFlashcardsResponse(
                success=False,
                error="Documents have not been processed yet. Please wait for processing to complete.",
            )
        result = await generate_flashcards(
            db=db,
            category_id=category_id,
            content=combined,
            count=fc_request.count,
            difficulty=fc_request.difficulty,
            custom_directions=fc_request.custom_directions,
            chapter=fc_request.chapter,
        )

    await db.commit()

    if not result.get("success"):
        return GenerateFlashcardsResponse(
            success=False,
            error=result.get("error", "Generation failed"),
        )

    flashcards = []
    stored = result.get("stored_flashcards", [])
    for f in stored:
        flashcards.append(GeneratedFlashcard(
            id=f.id,
            front_text=f.front_text,
            back_text=f.back_text,
            difficulty=f.difficulty or "medium",
            tags=f.tags or [],
        ))

    if not flashcards:
        for f in result.get("flashcards", []):
            flashcards.append(GeneratedFlashcard(
                front_text=f["front_text"],
                back_text=f["back_text"],
                difficulty=f.get("difficulty", "medium"),
                tags=f.get("tags", []),
            ))

    logger.info(
        "flashcards_generated",
        category_id=category_id,
        count=len(flashcards),
    )

    return GenerateFlashcardsResponse(success=True, flashcards=flashcards)


# ============== Grading Endpoints ==============


@router.post(
    "/quiz/{session_id}/question/{question_id}/grade",
    response_model=GradeAnswerResponse,
    summary="Grade an answer",
)
@limiter.limit(RateLimits.AI_GRADE)
async def grade_quiz_answer(
    request: Request,
    session_id: int,
    question_id: int,
    grade_request: GradeAnswerRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Grade a quiz answer with optional partial credit.

    For simple types (multiple_choice, true_false), uses exact matching.
    For complex types (written_answer, fill_in_blank), can use AI for
    partial credit grading.
    """
    # Use recognized text if handwritten
    answer_text = grade_request.recognized_text if grade_request.is_handwritten else grade_request.user_answer

    result = await grade_answer(
        db=db,
        session_id=session_id,
        question_id=question_id,
        user_answer=answer_text,
        use_partial_credit=grade_request.use_partial_credit,
    )

    await db.commit()

    if not result.get("success"):
        return GradeAnswerResponse(
            success=False,
            error=result.get("error", "Grading failed"),
        )

    breakdown = [
        GradeBreakdownItem(**b) for b in result.get("breakdown", [])
    ]

    return GradeAnswerResponse(
        success=True,
        is_correct=result.get("is_correct", False),
        earned_points=result.get("earned_points", 0),
        total_points=result.get("total_points", 1.0),
        feedback=result.get("feedback", ""),
        breakdown=breakdown,
        correct_parts=result.get("correct_parts", []),
        incorrect_parts=result.get("incorrect_parts", []),
        suggestions=result.get("suggestions", []),
    )


@router.get(
    "/quiz/{session_id}/partial-grades",
    summary="Get partial credit grades",
)
async def get_quiz_partial_grades(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all partial credit grades for a quiz session."""
    grades = await get_session_grades(db, session_id)
    return {"grades": grades, "total": len(grades)}


# ============== Handwriting Endpoints ==============


@router.post(
    "/quiz/{session_id}/question/{question_id}/handwritten",
    summary="Upload handwritten answer",
)
@limiter.limit(RateLimits.UPLOAD)
async def upload_handwritten_answer(
    request: Request,
    session_id: int,
    question_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload and process a handwritten answer.

    Accepts PDF or image files. Uses AI vision to recognize
    the handwritten content.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded",
        )

    # Read file content
    content = await file.read()

    # Process with handwriting agent
    result = await process_handwritten_answer(
        db=db,
        session_id=session_id,
        question_id=question_id,
        image_data=content,
        file_path=f"uploads/{session_id}/{question_id}/{file.filename}",
        original_name=file.filename,
    )

    await db.commit()

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Handwriting recognition failed"),
        )

    return {
        "success": True,
        "recognized_text": result.get("text", ""),
        "confidence": result.get("confidence", 0),
        "segments": result.get("segments", []),
        "handwritten_id": result.get("handwritten_id"),
    }


@router.get(
    "/quiz/{session_id}/handwritten-answers",
    summary="Get handwritten answers for session",
)
async def get_session_handwritten(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all handwritten answers for a quiz session."""
    answers = await get_session_handwritten_answers(db, session_id)
    return {"answers": answers, "total": len(answers)}


@router.put(
    "/handwritten/{handwritten_id}/correction",
    summary="Update with correction",
)
async def update_handwritten_correction(
    handwritten_id: int,
    request: CorrectionRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update a handwritten answer with user corrections.

    The system learns from corrections to improve future recognition.
    """
    result = await update_with_correction(
        db=db,
        handwritten_id=handwritten_id,
        corrected_text=request.corrected_text,
        corrections=request.corrections,
    )

    await db.commit()

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result.get("error", "Update failed"),
        )

    return result


@router.get(
    "/handwritten/{handwritten_id}",
    summary="Get handwritten answer",
)
async def get_single_handwritten_answer(
    handwritten_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single handwritten answer by ID."""
    answer = await get_handwritten_answer(db, handwritten_id)

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Handwritten answer {handwritten_id} not found",
        )

    return answer


# ============== Explanation Endpoints ==============


class ExplanationMessage(BaseModel):
    """A message in the explanation conversation."""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ExplainQuestionRequest(BaseModel):
    """Request for AI explanation of a question."""
    question_text: str = Field(..., description="The question text")
    correct_answer: str = Field(..., description="The correct answer")
    user_query: str = Field(..., description="What the student wants explained")
    question_type: str = Field("multiple_choice", description="Type of question")
    options: Optional[List[str]] = Field(None, description="Answer options")
    user_answer: Optional[str] = Field(None, description="Student's answer")
    explanation: Optional[str] = Field(None, description="Existing explanation")
    conversation_history: Optional[List[ExplanationMessage]] = Field(
        None, description="Previous messages in conversation"
    )


class ExplainQuestionResponse(BaseModel):
    """Response with AI explanation."""
    success: bool
    explanation: Optional[str] = None
    error: Optional[str] = None


@router.post(
    "/explain",
    response_model=ExplainQuestionResponse,
    summary="Get AI explanation for a question",
)
@limiter.limit(RateLimits.AI_GENERATE)
async def explain_question_endpoint(
    request: Request,
    explain_request: ExplainQuestionRequest,
):
    """
    Get an AI-powered explanation for a quiz question.

    This endpoint provides detailed explanations to help students understand:
    - Why an answer is correct or incorrect
    - The underlying concepts
    - Related topics and connections

    Students can ask follow-up questions by including conversation_history.
    """
    # Convert conversation history to dict format
    history = None
    if explain_request.conversation_history:
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in explain_request.conversation_history
        ]

    result = await explain_question(
        question_text=explain_request.question_text,
        correct_answer=explain_request.correct_answer,
        user_query=explain_request.user_query,
        question_type=explain_request.question_type,
        options=explain_request.options,
        user_answer=explain_request.user_answer,
        explanation=explain_request.explanation,
        conversation_history=history,
    )

    if not result.get("success"):
        return ExplainQuestionResponse(
            success=False,
            error=result.get("error", "Failed to generate explanation"),
        )

    return ExplainQuestionResponse(
        success=True,
        explanation=result.get("explanation"),
    )
