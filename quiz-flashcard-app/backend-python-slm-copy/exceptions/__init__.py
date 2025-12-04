"""
Custom exceptions for the Scholarly application.

Provides domain-specific exceptions with proper HTTP status codes
and structured error responses.
"""

from typing import Any, Optional


class ScholarlyException(Exception):
    """Base exception for all Scholarly errors."""

    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"
    detail: str = "An unexpected error occurred"

    def __init__(
        self,
        detail: Optional[str] = None,
        error_code: Optional[str] = None,
        extra: Optional[dict[str, Any]] = None,
    ):
        self.detail = detail or self.detail
        self.error_code = error_code or self.error_code
        self.extra = extra or {}
        super().__init__(self.detail)

    def to_dict(self) -> dict[str, Any]:
        """Convert exception to response dict."""
        response = {
            "error": self.error_code,
            "detail": self.detail,
        }
        if self.extra:
            response["extra"] = self.extra
        return response


# Authentication Exceptions
class AuthenticationError(ScholarlyException):
    """Authentication failed."""

    status_code = 401
    error_code = "AUTHENTICATION_ERROR"
    detail = "Authentication required"


class InvalidTokenError(AuthenticationError):
    """Invalid or expired token."""

    error_code = "INVALID_TOKEN"
    detail = "Invalid or expired authentication token"


class TokenExpiredError(AuthenticationError):
    """Token has expired."""

    error_code = "TOKEN_EXPIRED"
    detail = "Authentication token has expired"


# Authorization Exceptions
class AuthorizationError(ScholarlyException):
    """Authorization failed - user lacks permission."""

    status_code = 403
    error_code = "AUTHORIZATION_ERROR"
    detail = "You do not have permission to perform this action"


class ResourceOwnershipError(AuthorizationError):
    """User does not own the resource."""

    error_code = "RESOURCE_OWNERSHIP_ERROR"
    detail = "You do not have access to this resource"


# Resource Exceptions
class ResourceNotFoundError(ScholarlyException):
    """Requested resource does not exist."""

    status_code = 404
    error_code = "RESOURCE_NOT_FOUND"
    detail = "The requested resource was not found"


class CategoryNotFoundError(ResourceNotFoundError):
    """Category not found."""

    error_code = "CATEGORY_NOT_FOUND"
    detail = "Category not found"


class QuestionNotFoundError(ResourceNotFoundError):
    """Question not found."""

    error_code = "QUESTION_NOT_FOUND"
    detail = "Question not found"


class DocumentNotFoundError(ResourceNotFoundError):
    """Document not found."""

    error_code = "DOCUMENT_NOT_FOUND"
    detail = "Document not found"


class SessionNotFoundError(ResourceNotFoundError):
    """Quiz session not found."""

    error_code = "SESSION_NOT_FOUND"
    detail = "Quiz session not found"


# Validation Exceptions
class ValidationError(ScholarlyException):
    """Request validation failed."""

    status_code = 422
    error_code = "VALIDATION_ERROR"
    detail = "Validation failed"


class InvalidFileTypeError(ValidationError):
    """File type not allowed."""

    error_code = "INVALID_FILE_TYPE"
    detail = "File type not supported"


class FileTooLargeError(ValidationError):
    """File exceeds size limit."""

    error_code = "FILE_TOO_LARGE"
    detail = "File size exceeds the maximum allowed"


# Business Logic Exceptions
class BusinessError(ScholarlyException):
    """Business rule violation."""

    status_code = 400
    error_code = "BUSINESS_ERROR"
    detail = "Operation not allowed"


class QuizAlreadyCompletedError(BusinessError):
    """Quiz session is already completed."""

    error_code = "QUIZ_ALREADY_COMPLETED"
    detail = "This quiz session has already been completed"


class InsufficientQuestionsError(BusinessError):
    """Not enough questions available."""

    error_code = "INSUFFICIENT_QUESTIONS"
    detail = "Not enough questions available for this quiz"


class AnalysisInProgressError(BusinessError):
    """Analysis is already in progress."""

    error_code = "ANALYSIS_IN_PROGRESS"
    detail = "Analysis is already in progress for this category"


# External Service Exceptions
class ExternalServiceError(ScholarlyException):
    """External service communication failed."""

    status_code = 502
    error_code = "EXTERNAL_SERVICE_ERROR"
    detail = "External service unavailable"


class AIServiceError(ExternalServiceError):
    """AI service error."""

    error_code = "AI_SERVICE_ERROR"
    detail = "AI service is currently unavailable"


class AIRateLimitError(ExternalServiceError):
    """AI service rate limit exceeded."""

    status_code = 429
    error_code = "AI_RATE_LIMIT"
    detail = "AI service rate limit exceeded. Please try again later."


# Rate Limiting
class RateLimitError(ScholarlyException):
    """Rate limit exceeded."""

    status_code = 429
    error_code = "RATE_LIMIT_EXCEEDED"
    detail = "Too many requests. Please try again later."


# Database Exceptions
class DatabaseError(ScholarlyException):
    """Database operation failed."""

    status_code = 500
    error_code = "DATABASE_ERROR"
    detail = "A database error occurred"


class DuplicateEntryError(ScholarlyException):
    """Duplicate entry constraint violation."""

    status_code = 409
    error_code = "DUPLICATE_ENTRY"
    detail = "A resource with this identifier already exists"


__all__ = [
    # Base
    "ScholarlyException",
    # Authentication
    "AuthenticationError",
    "InvalidTokenError",
    "TokenExpiredError",
    # Authorization
    "AuthorizationError",
    "ResourceOwnershipError",
    # Resource
    "ResourceNotFoundError",
    "CategoryNotFoundError",
    "QuestionNotFoundError",
    "DocumentNotFoundError",
    "SessionNotFoundError",
    # Validation
    "ValidationError",
    "InvalidFileTypeError",
    "FileTooLargeError",
    # Business
    "BusinessError",
    "QuizAlreadyCompletedError",
    "InsufficientQuestionsError",
    "AnalysisInProgressError",
    # External
    "ExternalServiceError",
    "AIServiceError",
    "AIRateLimitError",
    # Rate Limiting
    "RateLimitError",
    # Database
    "DatabaseError",
    "DuplicateEntryError",
]
