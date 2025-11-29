---
inclusion: always
---

# Coding Standards & Best Practices

## Python Backend Standards

### Code Style
- Follow **PEP 8** style guide
- Use **type hints** for all function parameters and return values
- Maximum line length: **100 characters**
- Use **async/await** for all database and I/O operations
- Prefer **f-strings** for string formatting

### Naming Conventions
- **Files**: snake_case (e.g., `quiz_service.py`)
- **Classes**: PascalCase (e.g., `QuizSession`)
- **Functions/Variables**: snake_case (e.g., `get_quiz_session`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Private methods**: prefix with underscore (e.g., `_validate_answer`)

### FastAPI Patterns
```python
# Router structure
@router.get("/categories/{category_id}/questions")
async def get_questions(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[QuestionResponse]:
    """Get all questions for a category."""
    pass

# Service layer - always async
async def get_questions_by_category(
    db: AsyncSession,
    category_id: str,
    filters: Optional[QuestionFilters] = None
) -> List[Question]:
    """Business logic here."""
    pass
```

### Database Operations
- Always use **async sessions** from `get_db()` dependency
- Use **SQLAlchemy 2.0 style** queries with `select()`
- Commit transactions in **service layer**, not routers
- Handle **database errors** with proper exception handling
- Use **Alembic migrations** for schema changes

### Error Handling
```python
from fastapi import HTTPException, status

# Use appropriate HTTP status codes
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Category not found"
)

# Log errors with structlog
logger.error("operation_failed", category_id=category_id, error=str(e))
```

### Logging
- Use **structlog** for structured logging
- Include **context** in log messages (IDs, user info, etc.)
- Log levels: DEBUG (dev), INFO (important events), ERROR (failures)
```python
logger.info("quiz_created", quiz_id=quiz.id, category_id=category_id, question_count=len(questions))
```

## TypeScript Frontend Standards

### Code Style
- Use **TypeScript** for all new files
- Enable **strict mode** in tsconfig.json
- Use **functional components** with hooks
- Prefer **arrow functions** for component definitions
- Use **const** by default, **let** only when reassignment needed

### Naming Conventions
- **Files**: PascalCase for components (e.g., `QuizPage.tsx`)
- **Components**: PascalCase (e.g., `QuizSession`)
- **Functions/Variables**: camelCase (e.g., `handleSubmit`)
- **Types/Interfaces**: PascalCase (e.g., `QuizSettings`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)

### React Patterns
```typescript
// Component structure
interface QuizPageProps {
  categoryId: string;
}

export const QuizPage: React.FC<QuizPageProps> = ({ categoryId }) => {
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Side effects here
  }, [categoryId]);
  
  return (
    <div className="container">
      {/* JSX here */}
    </div>
  );
};
```

### State Management
- Use **useState** for local component state
- Use **useContext** for shared state (Auth, Theme, Tour)
- Keep state **close to where it's used**
- Avoid prop drilling - use context for deeply nested data

### API Calls
- Use the **api.ts** service for all backend calls
- Handle **loading states** with useState
- Handle **errors** with try/catch and display user-friendly messages
- Use **async/await** syntax
```typescript
try {
  setLoading(true);
  const response = await api.get(`/categories/${categoryId}/questions`);
  setQuestions(response.data);
} catch (error) {
  console.error('Failed to fetch questions:', error);
  // Show error toast
} finally {
  setLoading(false);
}
```

### Styling
- Use **Tailwind CSS** utility classes
- Follow **mobile-first** responsive design
- Use **Lucide React** for icons
- Maintain **consistent spacing** (p-4, p-6, p-8)
- Use **theme colors** from ThemeContext for dark mode support

## General Best Practices

### Security
- **Never commit** `.env` files or API keys
- Use **environment variables** for all secrets
- Validate **all user inputs** on backend
- Use **rate limiting** for API endpoints
- Implement **proper authentication** checks

### Performance
- Use **pagination** for large data sets
- Implement **lazy loading** where appropriate
- Optimize **database queries** (use indexes, avoid N+1)
- Cache **AI analysis results** in database
- Use **async operations** to avoid blocking

### Testing
- Write **unit tests** for critical business logic
- Test **API endpoints** with pytest
- Test **error handling** paths
- Mock **external API calls** (AI providers)

### Documentation
- Add **docstrings** to all Python functions
- Add **JSDoc comments** for complex TypeScript functions
- Keep **README.md** and **DEVDOC.md** up to date
- Document **API changes** in commit messages
- Update **environment variable** examples

### Git Workflow
- Use **descriptive commit messages**
- Create **feature branches** for new work
- Keep commits **focused and atomic**
- Run **tests** before committing
- Update **documentation** in the same commit as code changes
