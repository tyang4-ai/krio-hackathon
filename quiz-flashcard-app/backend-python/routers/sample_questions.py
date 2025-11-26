"""
Sample Question API endpoints - AI learning samples.
"""
import csv
import io
import json
import os
import re
import tempfile
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
from services.ai_service import ai_service

logger = structlog.get_logger()

# AI prompt for extracting questions from documents
EXTRACTION_PROMPT = """Analyze this document content and extract all quiz/test questions you find.

For each question, identify:
1. The question text
2. The type (multiple_choice, true_false, written_answer, or fill_in_blank)
3. The answer options (if multiple choice)
4. The correct answer
5. Any explanation provided

Return the questions as JSON in this exact format:
{
    "questions": [
        {
            "question_text": "The full question text",
            "question_type": "multiple_choice",
            "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
            "correct_answer": "A",
            "explanation": "Optional explanation of why this is correct"
        }
    ]
}

Important:
- For multiple_choice: options should be an array of strings, correct_answer is the letter (A, B, C, D)
- For true_false: options should be ["True", "False"], correct_answer is "True" or "False"
- For written_answer: options should be null, correct_answer is the expected answer text
- For fill_in_blank: options should be null, correct_answer is the word/phrase for the blank

Document content:
"""


async def extract_text_from_pdf(content: bytes) -> str:
    """Extract text from PDF file content."""
    try:
        from PyPDF2 import PdfReader
        import io as io_module

        reader = PdfReader(io_module.BytesIO(content))
        text_parts = []

        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)

        return "\n".join(text_parts)
    except Exception as e:
        logger.error("pdf_extraction_error", error=str(e))
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")


async def extract_text_from_docx(content: bytes) -> str:
    """Extract text from DOCX file content."""
    try:
        from docx import Document as DocxDocument
        import io as io_module

        doc = DocxDocument(io_module.BytesIO(content))
        text_parts = []

        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_parts.append(paragraph.text)

        return "\n".join(text_parts)
    except Exception as e:
        logger.error("docx_extraction_error", error=str(e))
        raise ValueError(f"Failed to extract text from DOCX: {str(e)}")


async def extract_questions_with_ai(text_content: str) -> List[dict]:
    """Use AI to extract questions from document text."""
    # Truncate if too long
    max_length = 15000
    if len(text_content) > max_length:
        text_content = text_content[:max_length] + "..."

    prompt = EXTRACTION_PROMPT + text_content

    try:
        response = await ai_service.generate_json(
            prompt=prompt,
            system_prompt="You are an expert at analyzing educational documents and extracting quiz questions. Always respond with valid JSON.",
            max_tokens=4000,
            temperature=0.2,  # Low temperature for accuracy
        )

        # Parse the response
        cleaned = response.strip()
        # Remove markdown code blocks if present
        cleaned = re.sub(r"```json\s*", "", cleaned)
        cleaned = re.sub(r"```\s*", "", cleaned)

        # Find JSON object
        start = cleaned.find("{")
        end = cleaned.rfind("}") + 1
        if start != -1 and end > start:
            cleaned = cleaned[start:end]

        data = json.loads(cleaned)
        return data.get("questions", [])

    except json.JSONDecodeError as e:
        logger.error("ai_extraction_json_error", error=str(e))
        raise ValueError(f"AI returned invalid JSON: {str(e)}")
    except Exception as e:
        logger.error("ai_extraction_error", error=str(e))
        raise ValueError(f"AI extraction failed: {str(e)}")

router = APIRouter(prefix="/api", tags=["sample-questions"])


@router.get(
    "/categories/{category_id}/sample-questions",
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
    "/sample-questions/{sample_id}",
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
    "/categories/{category_id}/sample-questions",
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
    "/categories/{category_id}/sample-questions/bulk",
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
    "/sample-questions/{sample_id}",
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
    "/sample-questions/{sample_id}",
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
    "/categories/{category_id}/sample-questions/count",
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
    "/categories/{category_id}/sample-questions/upload",
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
    Upload sample questions from a file.

    Supported formats:
    - JSON: Array of question objects
    - CSV: Spreadsheet with question columns
    - PDF: Document with questions (AI extracts them)
    - DOCX: Word document with questions (AI extracts them)

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

    For PDF/DOCX: Upload a document containing quiz questions and the AI will
    automatically extract them.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded",
        )

    file_ext = file.filename.lower().split(".")[-1]
    supported_formats = ["json", "csv", "pdf", "docx", "doc"]

    if file_ext not in supported_formats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Supported: {', '.join(supported_formats)}",
        )

    content = await file.read()

    samples_data = []
    invalid_count = 0
    raw_samples = []

    try:
        # Handle different file types
        if file_ext == "json":
            content_str = content.decode("utf-8")
            parsed = json.loads(content_str)
            if isinstance(parsed, list):
                raw_samples = parsed
            elif isinstance(parsed, dict):
                raw_samples = parsed.get("samples") or parsed.get("questions") or []
            else:
                raise ValueError("JSON must contain an array of questions")

        elif file_ext == "csv":
            content_str = content.decode("utf-8")
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

        elif file_ext == "pdf":
            # Extract text from PDF and use AI to find questions
            logger.info("extracting_pdf_content", filename=file.filename)
            text_content = await extract_text_from_pdf(content)

            if not text_content.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract text from PDF. The file may be image-based or empty.",
                )

            logger.info("using_ai_to_extract_questions", text_length=len(text_content))
            raw_samples = await extract_questions_with_ai(text_content)

        elif file_ext in ["docx", "doc"]:
            # Extract text from Word doc and use AI to find questions
            logger.info("extracting_docx_content", filename=file.filename)
            text_content = await extract_text_from_docx(content)

            if not text_content.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract text from document. The file may be empty.",
                )

            logger.info("using_ai_to_extract_questions", text_length=len(text_content))
            raw_samples = await extract_questions_with_ai(text_content)

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
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error("sample_upload_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process file: {str(e)}",
        )
