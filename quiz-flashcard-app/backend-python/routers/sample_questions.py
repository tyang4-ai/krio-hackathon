"""
Sample Question API endpoints - AI learning samples.
"""
import csv
import io
import json
from typing import List

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from schemas.sample_question import (
    SampleQuestionCreate,
    SampleQuestionCountResponse,
    SampleQuestionListResponse,
    SampleQuestionResponse,
    SampleQuestionUpdate,
    SampleQuestionUploadResponse,
)
from services.sample_question_service import sample_question_service

logger = structlog.get_logger()

router = APIRouter(prefix="/api", tags=["sample-questions"])


@router.get(
    "/categories/{category_id}/samples",
    response_model=SampleQuestionListResponse,
    summary="Get all sample questions for a category",
)
async def get_sample_questions(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all sample questions for AI learning."""
    samples = await sample_question_service.get_samples_by_category(db, category_id)

    return SampleQuestionListResponse(
        samples=[SampleQuestionResponse.model_validate(s) for s in samples],
        total=len(samples),
    )


@router.get(
    "/samples/{sample_id}",
    response_model=SampleQuestionResponse,
    summary="Get a sample question by ID",
)
async def get_sample_question(
    sample_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific sample question by ID."""
    sample = await sample_question_service.get_sample_by_id(db, sample_id)
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample question with ID {sample_id} not found",
        )

    return SampleQuestionResponse.model_validate(sample)


@router.post(
    "/categories/{category_id}/samples",
    response_model=SampleQuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new sample question",
)
async def create_sample_question(
    category_id: int,
    sample_data: SampleQuestionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new sample question for AI learning."""
    sample = await sample_question_service.create_sample(db, category_id, sample_data)
    await db.commit()

    logger.info("sample_question_created_via_api", sample_id=sample.id, category_id=category_id)
    return SampleQuestionResponse.model_validate(sample)


@router.post(
    "/categories/{category_id}/samples/bulk",
    response_model=SampleQuestionListResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create multiple sample questions at once",
)
async def create_bulk_sample_questions(
    category_id: int,
    samples_data: List[SampleQuestionCreate],
    db: AsyncSession = Depends(get_db),
):
    """Create multiple sample questions at once."""
    if not samples_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Samples must be a non-empty array",
        )

    samples = await sample_question_service.create_bulk_samples(db, category_id, samples_data)
    await db.commit()

    logger.info("sample_questions_bulk_created_via_api", count=len(samples), category_id=category_id)
    return SampleQuestionListResponse(
        samples=[SampleQuestionResponse.model_validate(s) for s in samples],
        total=len(samples),
    )


@router.put(
    "/samples/{sample_id}",
    response_model=SampleQuestionResponse,
    summary="Update a sample question",
)
async def update_sample_question(
    sample_id: int,
    sample_data: SampleQuestionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing sample question."""
    sample = await sample_question_service.update_sample(db, sample_id, sample_data)
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample question with ID {sample_id} not found",
        )

    await db.commit()
    logger.info("sample_question_updated_via_api", sample_id=sample_id)
    return SampleQuestionResponse.model_validate(sample)


@router.delete(
    "/samples/{sample_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a sample question",
)
async def delete_sample_question(
    sample_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a sample question."""
    success = await sample_question_service.delete_sample(db, sample_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample question with ID {sample_id} not found",
        )

    await db.commit()
    logger.info("sample_question_deleted_via_api", sample_id=sample_id)


@router.get(
    "/categories/{category_id}/samples/count",
    response_model=SampleQuestionCountResponse,
    summary="Get sample question count",
)
async def get_sample_question_count(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get count of sample questions for a category."""
    count = await sample_question_service.get_sample_count(db, category_id)
    return SampleQuestionCountResponse(count=count)


@router.post(
    "/categories/{category_id}/samples/upload",
    response_model=SampleQuestionUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload sample questions from file",
)
async def upload_sample_questions(
    category_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload sample questions from a JSON or CSV file.

    JSON format:
    ```json
    [
      {
        "question_text": "What is...",
        "question_type": "multiple_choice",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "correct_answer": "A",
        "explanation": "Optional explanation"
      }
    ]
    ```

    CSV format:
    ```
    question_text,question_type,options,correct_answer,explanation,tags
    "What is...",multiple_choice,"A;B;C;D",A,Optional explanation,"tag1;tag2"
    ```
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded",
        )

    file_ext = file.filename.lower().split(".")[-1]

    if file_ext not in ["json", "csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload JSON or CSV file.",
        )

    content = await file.read()
    content_str = content.decode("utf-8")

    samples_data = []
    invalid_count = 0

    try:
        if file_ext == "json":
            parsed = json.loads(content_str)
            if isinstance(parsed, list):
                raw_samples = parsed
            elif isinstance(parsed, dict):
                raw_samples = parsed.get("samples") or parsed.get("questions") or []
            else:
                raise ValueError("JSON must contain an array of questions")
        else:  # CSV
            raw_samples = []
            reader = csv.DictReader(io.StringIO(content_str))
            for row in reader:
                # Parse options and tags from semicolon-separated strings
                options = None
                if row.get("options"):
                    options = [o.strip() for o in row["options"].split(";")]

                tags = None
                if row.get("tags"):
                    tags = [t.strip() for t in row["tags"].split(";")]

                raw_samples.append({
                    "question_text": row.get("question_text"),
                    "question_type": row.get("question_type", "multiple_choice"),
                    "options": options,
                    "correct_answer": row.get("correct_answer"),
                    "explanation": row.get("explanation"),
                    "tags": tags,
                })

        # Validate samples
        for sample in raw_samples:
            if sample.get("question_text") and sample.get("correct_answer"):
                samples_data.append(
                    SampleQuestionCreate(
                        question_text=sample["question_text"],
                        question_type=sample.get("question_type", "multiple_choice"),
                        options=sample.get("options"),
                        correct_answer=sample["correct_answer"],
                        explanation=sample.get("explanation"),
                        tags=sample.get("tags"),
                    )
                )
            else:
                invalid_count += 1

        if not samples_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No valid sample questions found in file. Skipped {invalid_count} invalid entries.",
            )

        # Create samples
        samples = await sample_question_service.create_bulk_samples(db, category_id, samples_data)
        await db.commit()

        message = f"Successfully imported {len(samples)} sample questions"
        if invalid_count > 0:
            message += f" (skipped {invalid_count} invalid questions)"

        logger.info(
            "sample_questions_uploaded",
            category_id=category_id,
            created=len(samples),
            skipped=invalid_count,
        )

        return SampleQuestionUploadResponse(
            success=True,
            message=message,
            samples=[SampleQuestionResponse.model_validate(s) for s in samples],
            skipped=invalid_count,
        )

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON format: {str(e)}",
        )
    except Exception as e:
        logger.error("sample_upload_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process file: {str(e)}",
        )


# Note: AI analysis endpoints will be added after AI agents are migrated
# - POST /categories/{category_id}/samples/analyze - Trigger AI analysis
# - GET /categories/{category_id}/samples/analysis-status - Get analysis status
# - DELETE /categories/{category_id}/samples/analysis - Clear analysis
# - GET /categories/{category_id}/samples/agent-activity - Get agent activity log
