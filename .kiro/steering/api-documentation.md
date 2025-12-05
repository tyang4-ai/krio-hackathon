---
inclusion: fileMatch
fileMatchPattern: "**/routers/**/*"
---

# API Documentation Standards

## FastAPI Router Patterns

### Endpoint Documentation
```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

router = APIRouter(prefix="/api/categories", tags=["categories"])

@router.get("/{category_id}/questions", response_model=List[QuestionResponse])
async def get_questions(
    category_id: str,
    difficulty: Optional[str] = None,
    question_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
) -> List[QuestionResponse]:
    """
    Get all questions for a category.
    
    Args:
        category_id: UUID of the category
        difficulty: Optional filter by difficulty (easy, medium, hard)
        question_type: Optional filter by type (multiple_choice, true_false, etc.)
        db: Database session
    
    Returns:
        List of questions matching the filters
    
    Raises:
        HTTPException: 404 if category not found
    """
    pass
```

### Response Models
```python
from pydantic import BaseModel, Field
from datetime import datetime

class QuestionResponse(BaseModel):
    """Response model for question data."""
    id: str = Field(..., description="Unique question identifier")
    category_id: str = Field(..., description="Parent category ID")
    question_text: str = Field(..., description="The question text")
    question_type: str = Field(..., description="Type: multiple_choice, true_false, etc.")
    difficulty: str = Field(..., description="Difficulty: easy, medium, hard")
    options: Optional[List[str]] = Field(None, description="Answer options for MC/TF")
    correct_answer: str = Field(..., description="The correct answer")
    explanation: Optional[str] = Field(None, description="Explanation of the answer")
    tags: Optional[List[str]] = Field(None, description="Topic tags")
    rating: int = Field(0, ge=0, le=5, description="User rating (0-5 stars)")
    created_at: datetime = Field(..., description="Creation timestamp")
    
    class Config:
        from_attributes = True
```

### Request Models
```python
class CreateQuestionRequest(BaseModel):
    """Request model for creating a question."""
    question_text: str = Field(..., min_length=1, max_length=1000)
    question_type: str = Field(..., pattern="^(multiple_choice|true_false|written_answer|fill_in_blank)$")
    difficulty: str = Field("medium", pattern="^(easy|medium|hard)$")
    options: Optional[List[str]] = Field(None, min_items=2, max_items=6)
    correct_answer: str = Field(..., min_length=1)
    explanation: Optional[str] = Field(None, max_length=2000)
    tags: Optional[List[str]] = Field(None, max_items=10)
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "detail": "Error message here",
  "error_code": "CATEGORY_NOT_FOUND"
}
```

## Status Codes

- **200 OK**: Successful GET request
- **201 Created**: Successful POST request creating a resource
- **204 No Content**: Successful DELETE request
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (duplicate)
- **422 Unprocessable Entity**: Validation error
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: External service (AI) unavailable

## Auto-Generated Documentation

FastAPI automatically generates interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Ensure all endpoints have:
- Clear docstrings
- Proper response models
- Example values in Field descriptions
- Tags for grouping

## API Versioning

Currently using **v1** (implicit). For future versions:
```python
router = APIRouter(prefix="/api/v2/categories", tags=["categories-v2"])
```

## Rate Limiting

Rate limits are applied per endpoint:
- **Standard endpoints**: 100 requests/minute
- **AI generation**: 10 requests/minute
- **File uploads**: 20 requests/minute

Headers returned:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets
