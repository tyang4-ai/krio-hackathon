"""
Document API routes.
"""
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_db
from schemas.document import (
    ChapterBreakdownResponse,
    ChapterInfo,
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
    GenerateFlashcardsRequest,
    GenerateQuestionsRequest,
)
from services.category_service import category_service
from services.document_service import document_service

router = APIRouter(tags=["Documents"])


@router.get(
    "/api/categories/{category_id}/documents",
    response_model=DocumentListResponse,
)
async def get_documents(
    category_id: int,
    db: AsyncSession = Depends(get_db),
) -> DocumentListResponse:
    """
    Get all documents for a category.
    """
    # Verify category exists
    category = await category_service.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    documents = await document_service.get_documents_by_category(db, category_id)

    return DocumentListResponse(
        documents=[
            DocumentResponse(
                id=doc.id,
                category_id=doc.category_id,
                filename=doc.filename,
                original_name=doc.original_name,
                file_type=doc.file_type,
                file_size=doc.file_size,
                storage_path=doc.storage_path,
                content_text=doc.content_text,
                processed=doc.processed,
                chapter=doc.chapter,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
            )
            for doc in documents
        ],
        total=len(documents),
    )


@router.post(
    "/api/categories/{category_id}/documents",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    category_id: int,
    file: UploadFile = File(...),
    chapter: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    """
    Upload a document to a category.

    Supported formats: PDF, DOCX, DOC, TXT, MD
    Max size: 50MB

    Args:
        chapter: Optional chapter/topic name to associate with this document.
                 When generating content, you can filter by chapter to only
                 use documents from that specific chapter.
    """
    # Verify category exists
    category = await category_service.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    # Read file content
    content = await file.read()
    file_size = len(content)
    original_name = file.filename or "unknown"
    file_type = Path(original_name).suffix.lower()

    # Validate file
    is_valid, error_message = document_service.validate_file(original_name, file_size)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message,
        )

    # Generate unique filename and save
    filename = document_service.generate_filename(original_name)

    document = await document_service.save_document(
        db=db,
        category_id=category_id,
        filename=filename,
        original_name=original_name,
        file_type=file_type,
        file_size=file_size,
        content=content,
        chapter=chapter,
    )

    # Process document to extract text
    try:
        await document_service.process_document(db, document.id)
    except Exception as e:
        # Document saved but text extraction failed - log but don't fail
        pass

    return DocumentUploadResponse(
        id=document.id,
        filename=document.filename,
        original_name=document.original_name,
        file_type=document.file_type,
        file_size=document.file_size,
        chapter=document.chapter,
    )


@router.delete(
    "/api/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a document.
    """
    deleted = await document_service.delete_document(db, document_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found",
        )


@router.post("/api/categories/{category_id}/generate-questions")
async def generate_questions_endpoint(
    category_id: int,
    request: GenerateQuestionsRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Generate questions from documents in a category using AI.
    """
    from agents import generate_from_documents

    # Verify category exists
    category = await category_service.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    # Generate questions using AI agent
    result = await generate_from_documents(
        db=db,
        category_id=category_id,
        document_ids=request.document_ids,
        count=request.question_count,
        difficulty=request.difficulty or "medium",
        question_type=request.question_type or "multiple_choice",
        custom_directions=request.custom_directions or "",
        chapter=request.chapter,
    )

    await db.commit()

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Question generation failed"),
        )

    # Return response in format frontend expects
    questions = result.get("stored_questions", []) or result.get("questions", [])
    return {
        "success": True,
        "questions": [
            {
                "id": getattr(q, "id", None) if hasattr(q, "id") else q.get("id"),
                "question_text": getattr(q, "question_text", None) if hasattr(q, "question_text") else q.get("question_text"),
                "question_type": getattr(q, "question_type", None) if hasattr(q, "question_type") else q.get("question_type"),
                "difficulty": getattr(q, "difficulty", None) if hasattr(q, "difficulty") else q.get("difficulty"),
                "options": getattr(q, "options", None) if hasattr(q, "options") else q.get("options"),
                "correct_answer": getattr(q, "correct_answer", None) if hasattr(q, "correct_answer") else q.get("correct_answer"),
                "explanation": getattr(q, "explanation", "") if hasattr(q, "explanation") else q.get("explanation", ""),
            }
            for q in questions
        ],
        "generated": len(questions),
    }


@router.post("/api/categories/{category_id}/generate-flashcards")
async def generate_flashcards_endpoint(
    category_id: int,
    request: GenerateFlashcardsRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Generate flashcards from documents in a category using AI.
    """
    from agents import generate_flashcards as generate_flashcards_agent

    # Verify category exists
    category = await category_service.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    # Get combined content (filtered by chapter if specified)
    content = await document_service.get_combined_content_for_category(
        db, category_id, request.document_ids, chapter=request.chapter
    )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No processed documents found for flashcard generation",
        )

    # Generate flashcards using AI agent
    result = await generate_flashcards_agent(
        db=db,
        category_id=category_id,
        content=content,
        count=request.count,
        custom_directions=request.custom_directions or "",
    )

    await db.commit()

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Flashcard generation failed"),
        )

    # Return response in format frontend expects
    flashcards = result.get("stored_flashcards", []) or result.get("flashcards", [])
    return {
        "success": True,
        "flashcards": [
            {
                "id": getattr(f, "id", None) if hasattr(f, "id") else f.get("id"),
                "front_text": getattr(f, "front_text", None) if hasattr(f, "front_text") else f.get("front_text"),
                "back_text": getattr(f, "back_text", None) if hasattr(f, "back_text") else f.get("back_text"),
                "difficulty": getattr(f, "difficulty", "medium") if hasattr(f, "difficulty") else f.get("difficulty", "medium"),
            }
            for f in flashcards
        ],
        "generated": len(flashcards),
    }


@router.get("/api/categories/{category_id}/documents/chapters")
async def get_document_chapters(
    category_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Get all unique chapters from documents in a category.
    """
    # Verify category exists
    category = await category_service.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    chapters = await document_service.get_chapters_for_category(db, category_id)
    return {"chapters": chapters, "total": len(chapters)}


@router.patch("/api/documents/{document_id}/chapter")
async def update_document_chapter(
    document_id: int,
    chapter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Update the chapter assignment for a document.
    """
    document = await document_service.update_document_chapter(db, document_id, chapter)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found",
        )

    await db.commit()
    return {
        "id": document.id,
        "chapter": document.chapter,
        "message": "Chapter updated successfully",
    }


@router.post(
    "/api/documents/{document_id}/analyze-chapters",
    response_model=ChapterBreakdownResponse,
)
async def analyze_document_chapters(
    document_id: int,
    db: AsyncSession = Depends(get_db),
) -> ChapterBreakdownResponse:
    """
    Use AI to analyze a document and detect chapter/section boundaries.

    This endpoint extracts the structure of a document, identifying chapters,
    sections, or major topic divisions that the user can then use to split
    the document or tag specific portions.
    """
    from agents import analyze_document_chapters as analyze_chapters_agent

    document = await document_service.get_document_by_id(db, document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found",
        )

    if not document.content_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document has not been processed yet. Text content is required.",
        )

    # Use AI to analyze document structure
    result = await analyze_chapters_agent(document.content_text)

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Chapter analysis failed"),
        )

    chapters = result.get("chapters", [])
    return ChapterBreakdownResponse(
        document_id=document.id,
        original_name=document.original_name,
        chapters=[
            ChapterInfo(
                title=ch.get("title", "Untitled"),
                start_index=ch.get("start_index", 0),
                end_index=ch.get("end_index", 0),
                content_preview=ch.get("content_preview", "")[:200],
            )
            for ch in chapters
        ],
        total_chapters=len(chapters),
    )
