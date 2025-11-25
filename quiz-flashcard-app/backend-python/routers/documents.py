"""
Document API routes.
"""
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_db
from schemas.document import (
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
    db: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    """
    Upload a document to a category.

    Supported formats: PDF, DOCX, DOC, TXT, MD
    Max size: 50MB
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
async def generate_questions(
    category_id: int,
    request: GenerateQuestionsRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Generate questions from documents in a category.
    """
    # Verify category exists
    category = await category_service.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    # Get combined content
    content = await document_service.get_combined_content_for_category(
        db, category_id, request.document_ids
    )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No processed documents found for question generation",
        )

    # TODO: Implement AI question generation
    # This will be implemented when we migrate the AI agents
    return {
        "message": "Question generation not yet implemented",
        "category_id": category_id,
        "content_length": len(content),
        "requested_count": request.question_count,
    }


@router.post("/api/categories/{category_id}/generate-flashcards")
async def generate_flashcards(
    category_id: int,
    request: GenerateFlashcardsRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Generate flashcards from documents in a category.
    """
    # Verify category exists
    category = await category_service.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    # Get combined content
    content = await document_service.get_combined_content_for_category(
        db, category_id, request.document_ids
    )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No processed documents found for flashcard generation",
        )

    # TODO: Implement AI flashcard generation
    # This will be implemented when we migrate the AI agents
    return {
        "message": "Flashcard generation not yet implemented",
        "category_id": category_id,
        "content_length": len(content),
        "requested_count": request.count,
    }
