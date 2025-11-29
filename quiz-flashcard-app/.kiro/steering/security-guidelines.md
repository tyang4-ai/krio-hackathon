---
inclusion: always
---

# Security Guidelines

## Environment Variables & Secrets

### Never Commit Secrets
- **NEVER** commit `.env` files to git
- Use `.env.example` as a template
- Store production secrets in secure vaults (AWS Secrets Manager, etc.)
- Rotate API keys regularly

### Environment Variable Naming
```bash
# Good
DATABASE_URL=postgresql://...
MOONSHOT_API_KEY=sk-...
SECRET_KEY=randomly-generated-key

# Bad (avoid)
password=123456
api_key=test
```

### Generating Secure Keys
```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Or in Python
python -c "import secrets; print(secrets.token_hex(32))"
```

## Authentication & Authorization

### JWT Tokens
```python
from datetime import datetime, timedelta
from jose import jwt

# Create token
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")

# Verify token
def verify_token(token: str):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### Protected Endpoints
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)):
    """Dependency to get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = verify_token(token.credentials)
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.JWTError:
        raise credentials_exception
    
    # Fetch user from database
    user = await get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    
    return user

# Use in routes
@router.get("/protected")
async def protected_route(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.email}"}
```

## Input Validation

### Pydantic Models
```python
from pydantic import BaseModel, Field, validator

class CreateCategoryRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    color: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty or whitespace')
        return v.strip()
```

### SQL Injection Prevention
- **Always use** SQLAlchemy ORM or parameterized queries
- **Never** concatenate user input into SQL strings
```python
# Good - SQLAlchemy ORM
result = await db.execute(
    select(Category).where(Category.name == user_input)
)

# Bad - String concatenation (DON'T DO THIS!)
query = f"SELECT * FROM categories WHERE name = '{user_input}'"
```

### XSS Prevention
- Frontend: React automatically escapes content
- Backend: Validate and sanitize HTML input
```python
import bleach

def sanitize_html(text: str) -> str:
    """Remove potentially dangerous HTML."""
    allowed_tags = ['p', 'br', 'strong', 'em']
    return bleach.clean(text, tags=allowed_tags, strip=True)
```

## File Upload Security

### Validation
```python
from fastapi import UploadFile, HTTPException

ALLOWED_EXTENSIONS = {'.pdf', '.txt', '.docx', '.md'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

async def validate_upload(file: UploadFile):
    """Validate uploaded file."""
    # Check extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {ext} not allowed"
        )
    
    # Check file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large (max 10MB)"
        )
    
    # Reset file pointer
    await file.seek(0)
    return file
```

### Safe File Storage
```python
import uuid
from pathlib import Path

def get_safe_filename(original_filename: str) -> str:
    """Generate safe filename with UUID."""
    ext = Path(original_filename).suffix.lower()
    return f"{uuid.uuid4()}{ext}"

# Store with safe name
safe_name = get_safe_filename(file.filename)
file_path = UPLOAD_DIR / safe_name
```

## Rate Limiting

### Implementation
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/generate-questions")
@limiter.limit("10/minute")  # 10 requests per minute
async def generate_questions(request: Request, ...):
    pass
```

### Rate Limit Tiers
- **Standard endpoints**: 100/minute
- **AI generation**: 10/minute
- **File uploads**: 20/minute
- **Authentication**: 5/minute

## CORS Configuration

### Production Settings
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",
        "https://app.yourdomain.com"
    ],  # Specific domains only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

### Development Settings
```python
# Only for local development
allow_origins=[
    "http://localhost:3000",
    "http://localhost:5173"
]
```

## Database Security

### Connection Security
```python
# Use SSL in production
DATABASE_URL = "postgresql://user:pass@host:5432/db?sslmode=require"
```

### Password Hashing
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

## API Security Headers

### Security Middleware
```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

# Production only
if not settings.is_development:
    app.add_middleware(HTTPSRedirectMiddleware)
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
    )
```

## Logging Security

### Sensitive Data Redaction
```python
import structlog

def redact_sensitive_data(logger, method_name, event_dict):
    """Redact sensitive fields from logs."""
    sensitive_keys = ['password', 'api_key', 'token', 'secret']
    
    for key in sensitive_keys:
        if key in event_dict:
            event_dict[key] = '***REDACTED***'
    
    return event_dict

structlog.configure(
    processors=[
        redact_sensitive_data,
        # ... other processors
    ]
)
```

## Security Checklist

- [ ] All secrets in environment variables
- [ ] `.env` in `.gitignore`
- [ ] Strong SECRET_KEY generated
- [ ] JWT tokens with expiration
- [ ] Input validation on all endpoints
- [ ] File upload validation
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] SQL injection prevention (ORM)
- [ ] XSS prevention
- [ ] HTTPS in production
- [ ] Database SSL enabled
- [ ] Sensitive data redacted from logs
- [ ] Regular dependency updates
- [ ] Sentry error tracking enabled
