---
inclusion: fileMatch
fileMatchPattern: "**/models/**/*,**/services/**/*"
---

# Database Patterns & Guidelines

## SQLAlchemy Async Patterns

### Session Management
```python
from sqlalchemy.ext.asyncio import AsyncSession
from config.database import get_db

# In routers - use dependency injection
@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    categories = await category_service.get_all_categories(db)
    return categories

# In services - accept session as parameter
async def get_all_categories(db: AsyncSession) -> List[Category]:
    result = await db.execute(select(Category).order_by(Category.created_at.desc()))
    return result.scalars().all()
```

### Query Patterns

#### Basic Select
```python
from sqlalchemy import select

# Single record
result = await db.execute(select(Category).where(Category.id == category_id))
category = result.scalar_one_or_none()

# Multiple records
result = await db.execute(select(Question).where(Question.category_id == category_id))
questions = result.scalars().all()
```

#### Joins
```python
# Join with relationship
result = await db.execute(
    select(Question)
    .join(Category)
    .where(Category.id == category_id)
    .options(selectinload(Question.category))
)
questions = result.scalars().all()
```

#### Filtering
```python
from sqlalchemy import and_, or_

# Multiple conditions
query = select(Question).where(
    and_(
        Question.category_id == category_id,
        Question.difficulty == difficulty,
        Question.question_type.in_(question_types)
    )
)
```

#### Ordering & Pagination
```python
# Order by
query = select(Question).order_by(Question.created_at.desc())

# Pagination
query = query.offset(skip).limit(limit)
```

### Insert/Update/Delete

#### Create
```python
new_category = Category(
    id=str(uuid.uuid4()),
    name=name,
    description=description,
    color=color
)
db.add(new_category)
await db.commit()
await db.refresh(new_category)
return new_category
```

#### Update
```python
category.name = new_name
category.updated_at = datetime.utcnow()
await db.commit()
await db.refresh(category)
```

#### Delete
```python
await db.delete(category)
await db.commit()
```

#### Bulk Operations
```python
# Bulk insert
questions = [Question(...) for _ in range(10)]
db.add_all(questions)
await db.commit()

# Bulk update
await db.execute(
    update(Question)
    .where(Question.id.in_(question_ids))
    .values(difficulty="hard")
)
await db.commit()
```

## Model Definitions

### Base Model Pattern
```python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from models.base import Base

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    color = Column(String, default="#3B82F6")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    questions = relationship("Question", back_populates="category", cascade="all, delete-orphan")
```

### Relationships
```python
# One-to-Many
class Category(Base):
    questions = relationship("Question", back_populates="category", cascade="all, delete-orphan")

class Question(Base):
    category_id = Column(String, ForeignKey("categories.id", ondelete="CASCADE"))
    category = relationship("Category", back_populates="questions")
```

### JSON Columns
```python
from sqlalchemy import JSON

class Question(Base):
    options = Column(JSON)  # Store as JSON array
    tags = Column(JSON)     # Store as JSON array
```

## Alembic Migrations

### Creating Migrations
```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "Add rating column to questions"

# Create empty migration
alembic revision -m "Custom migration"
```

### Migration Structure
```python
"""Add rating column to questions

Revision ID: abc123
Revises: def456
Create Date: 2025-01-20 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('questions', sa.Column('rating', sa.Integer(), default=0))

def downgrade():
    op.drop_column('questions', 'rating')
```

### Running Migrations
```bash
# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

## Database Schema Guidelines

### Primary Keys
- Use **UUID strings** for all primary keys
- Generate with `str(uuid.uuid4())`
- Provides **globally unique** identifiers

### Foreign Keys
- Always specify **ON DELETE** behavior
- Use `CASCADE` for dependent data (questions → category)
- Use `SET NULL` for optional references (question → document)

### Timestamps
- Include `created_at` on all tables
- Include `updated_at` for mutable records
- Use `server_default=func.now()` for automatic timestamps

### Indexes
```python
from sqlalchemy import Index

# Single column index
__table_args__ = (
    Index('idx_category_id', 'category_id'),
)

# Composite index
__table_args__ = (
    Index('idx_category_difficulty', 'category_id', 'difficulty'),
)
```

### Constraints
```python
from sqlalchemy import CheckConstraint, UniqueConstraint

__table_args__ = (
    CheckConstraint('rating >= 0 AND rating <= 5', name='rating_range'),
    UniqueConstraint('category_id', 'preference_key', name='unique_preference'),
)
```

## Performance Best Practices

### Eager Loading
```python
# Use selectinload to avoid N+1 queries
from sqlalchemy.orm import selectinload

result = await db.execute(
    select(Category).options(
        selectinload(Category.questions),
        selectinload(Category.documents)
    )
)
```

### Query Optimization
- Use **select()** instead of legacy query API
- Avoid **loading unnecessary columns**
- Use **pagination** for large result sets
- Add **indexes** on frequently queried columns

### Connection Pooling
```python
# In database.py
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True  # Verify connections before use
)
```

## Error Handling

### Database Errors
```python
from sqlalchemy.exc import IntegrityError, NoResultFound

try:
    await db.commit()
except IntegrityError as e:
    await db.rollback()
    logger.error("database_integrity_error", error=str(e))
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Resource already exists or constraint violation"
    )
```

### Not Found Handling
```python
category = result.scalar_one_or_none()
if not category:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Category {category_id} not found"
    )
```

## Testing Database Code

### Test Database Setup
```python
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

@pytest.fixture
async def test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSession(engine) as session:
        yield session
    
    await engine.dispose()
```

### Test Patterns
```python
@pytest.mark.asyncio
async def test_create_category(test_db):
    category = Category(
        id=str(uuid.uuid4()),
        name="Test Category"
    )
    test_db.add(category)
    await test_db.commit()
    
    result = await test_db.execute(select(Category))
    assert result.scalar_one().name == "Test Category"
```
