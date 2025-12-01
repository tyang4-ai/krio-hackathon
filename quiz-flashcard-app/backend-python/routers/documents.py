"""
Document API routes.
"""
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_db
from middleware import limiter, RateLimits
from schemas.document import (
    ChapterBreakdownResponse,
    ChapterInfo,
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
    GenerateFlashcardsRequest,
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
@limiter.limit(RateLimits.UPLOAD)
async def upload_document(
    request: Request,
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


@router.post("/api/categories/{category_id}/organize")
@limiter.limit(RateLimits.AI_GENERATE)
async def organize_documents(
    request: Request,
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Use AI to organize all documents in a category into chapters.

    This ENHANCED version:
    - Preserves FULL document content (no summarization)
    - Groups documents into logical chapters
    - Generates separate PDF for each chapter with complete content
    - Optionally auto-updates document chapter tags
    """
    from agents.chapter_agent import (
        organize_documents_with_full_content,
        generate_all_chapter_pdfs,
    )
    from sqlalchemy import select
    from models.document import Document

    # Verify category exists
    category = await category_service.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    # Get all documents with their full content
    result = await db.execute(
        select(Document).where(
            Document.category_id == category_id,
            Document.processed == True,
        )
    )
    documents = result.scalars().all()

    if not documents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No processed documents found. Please upload and process documents first.",
        )

    # Convert to dict format for the organize function
    # Include storage_path and file_type so we can send actual PDFs to AI
    doc_list = [
        {
            "id": doc.id,
            "original_name": doc.original_name,
            "content_text": doc.content_text,
            "storage_path": doc.storage_path,
            "file_type": doc.file_type,
        }
        for doc in documents
    ]

    # Organize documents with AI (preserves full content)
    # Will use PDF vision if documents are PDFs
    organize_result = await organize_documents_with_full_content(doc_list, category.name)

    if not organize_result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=organize_result.get("error", "Organization failed"),
        )

    organization = organize_result["organization"]

    # Generate separate PDFs for each chapter
    chapter_pdfs = generate_all_chapter_pdfs(organization, category.name)

    # Auto-update document chapter tags based on organization
    updated_docs = []
    for chapter in organization.get("chapters", []):
        chapter_title = chapter.get("title", "")
        for doc_info in chapter.get("documents", []):
            doc_id = doc_info.get("id")
            # Find and update the document
            for doc in documents:
                if doc.id == doc_id:
                    doc.chapter = chapter_title
                    updated_docs.append({
                        "id": doc.id,
                        "name": doc.original_name,
                        "chapter": chapter_title,
                    })
                    break

    # Create new documents for each organized chapter (auto-upload to notes section)
    import uuid
    from pathlib import Path
    created_chapter_docs = []

    for chapter in organization.get("chapters", []):
        chapter_num = chapter.get("chapter_number", 0)
        chapter_title = chapter.get("title", f"Chapter {chapter_num}")
        full_content = chapter.get("full_content", "")

        # Skip if no content
        if not full_content or not full_content.strip():
            continue

        # Generate filename for the organized chapter
        safe_title = "".join(c if c.isalnum() or c in " -_" else "" for c in chapter_title)
        safe_title = safe_title.replace(" ", "_")[:50]
        unique_id = str(uuid.uuid4())[:8]
        filename = f"Organized_Chapter_{chapter_num}_{safe_title}_{unique_id}.txt"
        original_name = f"Chapter {chapter_num}: {chapter_title}"

        # Create storage path (virtual - content is stored in DB)
        storage_path = f"organized/{category_id}/{filename}"

        # Create new document in database
        new_doc = Document(
            category_id=category_id,
            filename=filename,
            original_name=original_name,
            file_type=".txt",
            file_size=len(full_content.encode("utf-8")),
            storage_path=storage_path,
            content_text=full_content,
            processed=True,
            chapter=chapter_title,
        )
        db.add(new_doc)
        await db.flush()  # Get the ID

        created_chapter_docs.append({
            "id": new_doc.id,
            "filename": filename,
            "original_name": original_name,
            "chapter": chapter_title,
            "content_length": len(full_content),
        })

    await db.commit()

    # Extract chapter names for UI
    chapter_names = [ch.get("title", "") for ch in organization.get("chapters", [])]

    return {
        "success": True,
        "organization": {
            "title": organization.get("title"),
            "chapters": [
                {
                    "chapter_number": ch.get("chapter_number"),
                    "title": ch.get("title"),
                    "description": ch.get("description"),
                    "documents": ch.get("documents", []),
                    # Don't include full_content in response to reduce size
                }
                for ch in organization.get("chapters", [])
            ],
        },
        "chapter_names": chapter_names,
        "chapter_pdfs": chapter_pdfs,  # List of PDFs, one per chapter
        "updated_documents": updated_docs,  # Documents that were auto-tagged
        "created_chapter_documents": created_chapter_docs,  # NEW: Auto-created organized chapter docs
        "message": f"Organized {len(documents)} documents into {len(chapter_names)} chapters. {len(created_chapter_docs)} organized chapter documents created.",
    }


@router.get("/api/organize/debug")
async def get_organize_debug():
    """
    Debug endpoint to see the raw AI input/output from the last organize operation.

    Returns:
        - prompt: The exact prompt sent to the AI
        - raw_response: The raw text response from the AI
        - parsed_response: The parsed JSON structure
        - error: Any error that occurred
    """
    from agents.chapter_agent import get_organize_debug_info

    debug_info = get_organize_debug_info()

    # Truncate very long fields for readability
    result = {
        "mode": debug_info.get("mode", "unknown"),  # pdf_vision or text
        "prompt_length": len(debug_info.get("prompt") or ""),
        "prompt_preview": (debug_info.get("prompt") or "")[:3000] + "..." if len(debug_info.get("prompt") or "") > 3000 else debug_info.get("prompt"),
        "raw_response_length": len(debug_info.get("raw_response") or ""),
        "raw_response": debug_info.get("raw_response"),  # Full response for debugging
        "parsed_response": debug_info.get("parsed_response"),
        "error": debug_info.get("error"),
    }

    # Also show chapter content lengths if parsed
    if debug_info.get("parsed_response"):
        chapters = debug_info["parsed_response"].get("chapters", [])
        result["chapter_summary"] = [
            {
                "title": ch.get("title"),
                "full_content_length": len(ch.get("full_content", "")),
                "has_content": bool(ch.get("full_content")),
                "num_units": len(ch.get("units", [])),
            }
            for ch in chapters
        ]

    return result


@router.get("/api/categories/{category_id}/organize/pdf")
async def download_organized_pdf(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Generate and download the organized study guide as PDF.
    """
    from agents.chapter_agent import organize_content_into_structure, generate_organized_pdf
    from fastapi.responses import Response

    # Verify category exists
    category = await category_service.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} not found",
        )

    # Get combined content from all documents
    content = await document_service.get_combined_content_for_category(db, category_id)

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No processed documents found.",
        )

    # Organize content with AI
    result = await organize_content_into_structure(content, category.name)

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Organization failed"),
        )

    # Generate PDF
    pdf_bytes = generate_organized_pdf(result["organization"])

    filename = f"StudyGuide_{category.name.replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


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
