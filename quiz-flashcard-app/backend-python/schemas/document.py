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
    message: str = "Document uploaded successfully"


class GenerateQuestionsRequest(BaseSchema):
    """Request to generate questions from documents."""

    document_ids: Optional[list[int]] = Field(
        None, description="Specific document IDs to use (all if not specified)"
    )
    question_count: int = Field(10, ge=1, le=50, alias="count", description="Number of questions to generate")
    question_types: Optional[list[str]] = Field(
        None, description="Types: multiple_choice, true_false, written, fill_in_blank"
    )
    question_type: Optional[str] = Field(
        None, description="Single question type: multiple_choice, true_false, written_answer, fill_in_blank"
    )
    difficulty: Optional[str] = Field(None, description="easy, medium, hard")
    custom_directions: Optional[str] = Field(None, description="Additional instructions for AI")


class GenerateFlashcardsRequest(BaseSchema):
    """Request to generate flashcards from documents."""

    document_ids: Optional[list[int]] = Field(
        None, description="Specific document IDs to use (all if not specified)"
    )
    count: int = Field(10, ge=1, le=50, description="Number of flashcards to generate")
    difficulty: Optional[str] = Field(None, description="easy, medium, hard")
    custom_directions: Optional[str] = Field(None, description="Additional instructions for AI")
