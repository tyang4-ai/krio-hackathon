"""
Pydantic schemas for Category API requests/responses.
"""
from datetime import datetime
from typing import Optional

from pydantic import Field

from .base import BaseSchema, TimestampSchema


class CategoryBase(BaseSchema):
    """Base schema for category data."""

    name: str = Field(..., min_length=1, max_length=255, description="Category name")
    description: Optional[str] = Field(None, description="Category description")
    color: Optional[str] = Field("#3B82F6", description="Category color (hex code)")
    icon: Optional[str] = Field("Folder", description="Category icon name from lucide-react")


class CategoryCreate(CategoryBase):
    """Schema for creating a new category."""

    pass


class CategoryUpdate(BaseSchema):
    """Schema for updating a category (all fields optional)."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class CategoryStats(BaseSchema):
    """Statistics for a category."""

    question_count: int = Field(0, description="Number of questions")
    flashcard_count: int = Field(0, description="Number of flashcards")
    document_count: int = Field(0, description="Number of documents")
    notebook_count: int = Field(0, description="Number of notebook entries")


class CategoryResponse(CategoryBase, TimestampSchema):
    """Schema for category response."""

    id: int
    stats: Optional[CategoryStats] = None


class CategoryListResponse(BaseSchema):
    """Schema for list of categories response."""

    categories: list[CategoryResponse]
    total: int
