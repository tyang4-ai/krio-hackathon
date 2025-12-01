"""
Pydantic schemas for Document API requests/responses.
"""
from datetime import datetime
from typing import Optional

from pydantic import Field

from .base import BaseSchema, TimestampSchema


class DocumentBase(BaseSchema):
    """Base schema for document data."""

    filename: str
    original_name: str
    file_type: str
    file_size: int
    chapter: Optional[str] = None


class DocumentResponse(DocumentBase, TimestampSchema):
    """Schema for document response."""

    id: int
    category_id: int
    storage_path: str
    content_text: Optional[str] = None
    processed: bool = False


class DocumentListResponse(BaseSchema):
    """Schema for list of documents response."""

    documents: list[DocumentResponse]
    total: int


class DocumentUploadResponse(BaseSchema):
    """Response after document upload."""

    id: int
    filename: str
    original_name: str
    file_type: str
    file_size: int
    chapter: Optional[str] = None
    message: str = "Document uploaded successfully"


class GenerateQuestionsRequest(BaseSchema):
    """Request to generate questions from documents."""

    document_ids: Optional[list[int]] = Field(
        None, alias="documentIds", description="Specific document IDs to use (all if not specified)"
    )
    question_count: int = Field(10, ge=1, le=50, alias="count", description="Number of questions to generate")
    question_types: Optional[list[str]] = Field(
        None, alias="questionTypes", description="Types: multiple_choice, true_false, written, fill_in_blank"
    )
    question_type: Optional[str] = Field(
        None, alias="contentType", description="Single question type: multiple_choice, true_false, written_answer, fill_in_blank"
    )
    difficulty: Optional[str] = Field(None, description="easy, medium, hard")
    custom_directions: Optional[str] = Field(None, alias="customDirections", description="Additional instructions for AI")
    chapter: Optional[str] = Field(None, description="Filter documents by chapter and tag generated content")

    model_config = {"populate_by_name": True}


class GenerateFlashcardsRequest(BaseSchema):
    """Request to generate flashcards from documents."""

    document_ids: Optional[list[int]] = Field(
        None, alias="documentIds", description="Specific document IDs to use (all if not specified)"
    )
    count: int = Field(10, ge=1, le=50, description="Number of flashcards to generate")
    difficulty: Optional[str] = Field(None, description="easy, medium, hard")
    custom_directions: Optional[str] = Field(None, alias="customDirections", description="Additional instructions for AI")
    chapter: Optional[str] = Field(None, description="Filter documents by chapter and tag generated content")

    model_config = {"populate_by_name": True}


class ChapterBreakdownRequest(BaseSchema):
    """Request to break down a document into chapters using AI."""

    document_id: int = Field(..., description="Document ID to analyze")


class ChapterInfo(BaseSchema):
    """Information about a detected chapter."""

    title: str
    start_index: int
    end_index: int
    content_preview: str = Field(default="", max_length=200)


class ChapterBreakdownResponse(BaseSchema):
    """Response with detected chapters from document analysis."""

    document_id: int
    original_name: str
    chapters: list[ChapterInfo]
    total_chapters: int
    message: str = "Document analyzed successfully"
