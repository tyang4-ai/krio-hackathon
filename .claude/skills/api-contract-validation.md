# API Contract Validation Guidelines

## CRITICAL: Frontend-Backend Data Structure Alignment

Whenever making changes to API endpoints (backend) or API calls (frontend), ALWAYS verify that the data structures match between frontend expectations and backend responses.

## Checklist for Every API Change

### When Modifying Backend Endpoints:

1. **Response Structure**: Check if frontend expects:
   - Wrapped response: `{ data: { ... } }` vs direct response `{ ... }`
   - Array wrapper: `{ items: [...] }` vs direct array `[...]`
   - Specific field names (e.g., `total`, `count`, `items`, `data`)

2. **Field Naming Convention**:
   - Backend (Python/FastAPI): Uses `snake_case` (e.g., `total_violations`, `question_count`)
   - Frontend (JavaScript/React): Often expects `camelCase` (e.g., `totalViolations`, `questionCount`)
   - **Solution**: Either use Pydantic's `alias_generator` or ensure frontend handles both

3. **Error Response Format**:
   - FastAPI default: `{ "detail": "error message" }`
   - Frontend often expects: `{ "error": "error message" }`
   - Ensure error interceptor normalizes this

### When Modifying Frontend API Calls:

1. **Path Parameters**: Verify route matches backend exactly
   - Example: `/flashcards/{id}/progress` vs `/categories/{categoryId}/flashcards/{id}/progress`

2. **Request Body Fields**: Match backend schema field names
   - Example: `confidence` vs `confidence_level`

3. **Response Unwrapping**: Handle both wrapped and unwrapped formats
   ```javascript
   const data = response.data.data || response.data;
   const items = data.items || data || [];
   ```

## Common Patterns to Watch For

### Response Wrapper Pattern
```javascript
// Frontend should handle both:
const data = response.data.data || response.data;  // Wrapped vs unwrapped
const items = data.questions || data || [];         // Named array vs direct array
```

### Field Name Fallback Pattern
```javascript
// Handle both snake_case and camelCase
const score = data.integrity_score || data.integrityScore || 0;
const count = data.total_violations || data.totalViolations || 0;
```

### Backend Response Schema Pattern
```python
# Include both naming conventions if needed
return {
    "has_analysis": value,      # snake_case for Python
    "hasAnalysis": value,       # camelCase for JS (optional)
}
```

## Files to Cross-Reference

When changing an endpoint, always check:

1. **Backend Router** (`backend-python/routers/*.py`)
   - Route path
   - Request body schema
   - Response model/structure

2. **Backend Schema** (`backend-python/schemas/*.py`)
   - Field names and types
   - Aliases defined

3. **Frontend API Service** (`frontend/src/services/api.js`)
   - Route path matches
   - Request body field names

4. **Frontend Components** (`frontend/src/pages/*.jsx`)
   - How response data is accessed
   - Field names used in templates

## Quick Validation Steps

Before committing any API-related change:

1. [ ] Route paths match between frontend and backend
2. [ ] Request body field names match schema
3. [ ] Response structure matches frontend expectations
4. [ ] Field names are handled (snake_case vs camelCase)
5. [ ] Error responses are normalized
6. [ ] Arrays are properly unwrapped
7. [ ] Optional fields have fallback values

## Example: Adding a New Endpoint

```python
# Backend: routers/example.py
@router.get("/categories/{category_id}/stats")
async def get_stats(category_id: int, db: AsyncSession = Depends(get_db)):
    stats = await service.get_stats(db, category_id)
    return {
        "total_items": stats.total,      # snake_case
        "reviewed_count": stats.reviewed,
    }
```

```javascript
// Frontend: services/api.js
getStats: (categoryId) => api.get(`/categories/${categoryId}/stats`),

// Frontend: pages/StatsPage.jsx
const loadStats = async () => {
    const response = await statsApi.getStats(categoryId);
    const data = response.data.data || response.data;
    setStats({
        total: data.total_items || data.totalItems || 0,
        reviewed: data.reviewed_count || data.reviewedCount || 0,
    });
};
```
