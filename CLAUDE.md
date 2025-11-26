# Claude Code Project Instructions

## Project: Quiz & Flashcard App

This is a full-stack application with:
- **Frontend**: React/Vite (JavaScript) in `quiz-flashcard-app/frontend/`
- **Backend**: FastAPI/Python in `quiz-flashcard-app/backend-python/`
- **Database**: PostgreSQL with SQLAlchemy ORM

## Critical Development Guidelines

### API Contract Validation (MANDATORY)

**ALWAYS verify frontend-backend data structure alignment when making API changes.**

Before committing any API-related change, check:

1. **Route paths match** between `frontend/src/services/api.js` and `backend-python/routers/*.py`
2. **Request body field names** match the backend Pydantic schema in `backend-python/schemas/*.py`
3. **Response structure** matches what frontend components expect
4. **Field naming conventions** are handled:
   - Backend uses `snake_case` (Python convention)
   - Frontend may expect `camelCase` (JavaScript convention)
   - Use fallbacks: `data.field_name || data.fieldName || defaultValue`
5. **Response wrapping** is handled:
   - Backend returns `{ field: value }` directly
   - Frontend may expect `response.data.data.field` (double wrapped)
   - Use: `const data = response.data.data || response.data;`
6. **Error format** is normalized:
   - FastAPI returns `{ detail: "message" }`
   - Frontend expects `{ error: "message" }`

### Common Patterns

```javascript
// Frontend: Always handle both wrapped and unwrapped responses
const data = response.data.data || response.data;
const items = data.items || data || [];

// Frontend: Handle both snake_case and camelCase
const score = data.integrity_score || data.integrityScore || 0;
```

```python
# Backend: Return consistent field names
return {
    "total_count": count,
    "items": [item.model_dump() for item in items],
}
```

### Files to Cross-Reference for API Changes

| Change Type | Check These Files |
|-------------|-------------------|
| New endpoint | `routers/*.py`, `schemas/*.py`, `api.js`, consuming component |
| Modified response | Schema file, all frontend components using that endpoint |
| Route path change | `api.js` route, backend router decorator |

See `.claude/skills/api-contract-validation.md` for detailed guidelines.
