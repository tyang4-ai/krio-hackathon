---
inclusion: fileMatch
fileMatchPattern: "**/test_*,**/tests/**/*"
---

# Testing Guidelines

## Backend Testing (pytest)

### Test Structure
```python
# tests/test_quiz_service.py
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from services.quiz_service import QuizService

@pytest.mark.asyncio
async def test_create_quiz_session(test_db: AsyncSession):
    """Test creating a new quiz session."""
    quiz_service = QuizService()
    
    session = await quiz_service.create_quiz_session(
        db=test_db,
        category_id="test-category-id",
        settings={
            "difficulty": "medium",
            "selectionMode": "mixed",
            "totalQuestions": 10
        }
    )
    
    assert session.id is not None
    assert session.category_id == "test-category-id"
    assert session.completed is False
```

### Fixtures
```python
# conftest.py
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from models.base import Base

@pytest.fixture
async def test_db():
    """Create a test database session."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSession(engine) as session:
        yield session
    
    await engine.dispose()

@pytest.fixture
def sample_category():
    """Sample category data for testing."""
    return {
        "id": "test-category-id",
        "name": "Test Category",
        "description": "Test description",
        "color": "#3B82F6"
    }
```

### Mocking AI Calls
```python
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_generate_questions(test_db: AsyncSession):
    """Test question generation with mocked AI."""
    mock_response = {
        "questions": [{
            "question_text": "Test question?",
            "question_type": "multiple_choice",
            "difficulty": "medium",
            "options": ["A) Option 1", "B) Option 2"],
            "correct_answer": "A",
            "explanation": "Test explanation"
        }]
    }
    
    with patch('services.ai_service.AIService.generate_questions', 
               new_callable=AsyncMock, return_value=mock_response):
        questions = await generation_agent.generate_questions(
            content="Test content",
            options={"count": 1}
        )
        
        assert len(questions) == 1
        assert questions[0]["question_text"] == "Test question?"
```

### Running Tests
```bash
# Run all tests
docker-compose exec backend pytest

# Run with coverage
docker-compose exec backend pytest --cov=. --cov-report=html

# Run specific test file
docker-compose exec backend pytest tests/test_quiz_service.py

# Run specific test
docker-compose exec backend pytest tests/test_quiz_service.py::test_create_quiz_session

# Run with verbose output
docker-compose exec backend pytest -v
```

## Frontend Testing (Jest/Vitest)

### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizPage } from './QuizPage';

describe('QuizPage', () => {
  it('renders quiz settings', () => {
    render(<QuizPage categoryId="test-id" />);
    expect(screen.getByText('Quiz Settings')).toBeInTheDocument();
  });
  
  it('handles difficulty selection', () => {
    render(<QuizPage categoryId="test-id" />);
    const select = screen.getByLabelText('Difficulty');
    fireEvent.change(select, { target: { value: 'hard' } });
    expect(select.value).toBe('hard');
  });
});
```

### API Mocking
```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/categories/:id/questions', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: [{ id: '1', question_text: 'Test?' }]
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Integration Testing

### API Endpoint Testing
```python
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_get_categories():
    """Test GET /api/categories endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/categories")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert isinstance(data["data"], list)
```

### Database Integration
```python
@pytest.mark.asyncio
async def test_category_cascade_delete(test_db: AsyncSession):
    """Test that deleting a category deletes related questions."""
    # Create category
    category = Category(id="test-id", name="Test")
    test_db.add(category)
    await test_db.commit()
    
    # Create question
    question = Question(
        id="q-id",
        category_id="test-id",
        question_text="Test?"
    )
    test_db.add(question)
    await test_db.commit()
    
    # Delete category
    await test_db.delete(category)
    await test_db.commit()
    
    # Verify question is also deleted
    result = await test_db.execute(select(Question).where(Question.id == "q-id"))
    assert result.scalar_one_or_none() is None
```

## Test Coverage Goals

- **Backend**: Aim for 80%+ coverage on services and routers
- **Frontend**: Focus on critical user flows and complex components
- **Integration**: Test all API endpoints with various scenarios
- **Error Handling**: Test error paths and edge cases

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Isolation**: Each test should be independent
3. **Mocking**: Mock external dependencies (AI, file system)
4. **Descriptive Names**: Test names should describe what they test
5. **Fast Tests**: Keep tests fast by using in-memory databases
6. **Clean Up**: Always clean up test data and resources
