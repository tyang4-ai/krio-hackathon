"""
Base Pydantic schemas for request/response validation.
"""
from datetime import datetime
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(
        from_attributes=True,  # Allow ORM model conversion
        populate_by_name=True,
        use_enum_values=True,
    )


class TimestampSchema(BaseSchema):
    """Schema with timestamp fields."""

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Generic type for paginated responses
T = TypeVar("T")


class PaginatedResponse(BaseSchema, Generic[T]):
    """Generic paginated response schema."""

    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def create(
        cls,
        items: List[T],
        total: int,
        page: int,
        page_size: int,
    ) -> "PaginatedResponse[T]":
        """Create a paginated response."""
        total_pages = (total + page_size - 1) // page_size
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )


class BaseResponse(BaseSchema):
    """Standard API response wrapper."""

    success: bool = True
    message: Optional[str] = None


class ErrorResponse(BaseSchema):
    """Error response schema."""

    success: bool = False
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None
