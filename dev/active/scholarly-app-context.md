# Scholarly Quiz & Flashcard App - Development Context

**Last Updated**: 2025-11-28

## Current State Summary

### Completed Phases (0-8)
| Phase | Feature | Status |
|-------|---------|--------|
| 0 | TypeScript Migration | ✅ Complete |
| 1 | Google OAuth Authentication | ✅ Complete |
| 2 | Data Tracking (QuestionAttempt table) | ✅ Complete |
| 3 | Analytics Dashboard with AI Learning Score | ✅ Complete |
| 4 | SM-2 Spaced Repetition for Flashcards | ✅ Complete |
| 5 | Structured Logging (structlog + activity) | ✅ Complete |
| 6 | Error Handling (ErrorBoundary + Toast) | ✅ Complete |
| 7 | PDF Export (analytics reports) | ✅ Complete |
| 8 | Rate Limiting (slowapi) | ✅ Complete |

### Pending Phases
| Phase | Feature | Status |
|-------|---------|--------|
| 9 | AI Explanations (per-question chatbox) | Pending |
| 10 | Dark Mode (user preference) | Pending |

## Recent Session Work (2025-11-28)

### Phase 8: Rate Limiting Implementation
**Files Created:**
- `backend-python/middleware/rate_limiter.py` - Core rate limiting with slowapi

**Rate Limit Tiers:**
```python
class RateLimits:
    DEFAULT = "100/minute"
    AUTH = "10/minute"
    AUTH_STRICT = "5/minute"      # Google login
    AI_GENERATE = "10/minute"     # Question/flashcard generation
    AI_ANALYZE = "5/minute"       # Sample analysis
    AI_GRADE = "20/minute"        # Answer grading
    UPLOAD = "20/minute"          # Document/handwriting upload
    READ = "200/minute"
    WRITE = "50/minute"
    BULK = "10/minute"
```

**Applied To:**
- `routers/auth.py`: google_login (5/min), verify_token (10/min)
- `routers/ai.py`: analyze (5/min), generate (10/min), grade (20/min), handwritten (20/min)
- `routers/documents.py`: upload_document (20/min)

### Docker Issues Resolved
**Problem**: Frontend container missing npm dependencies (echarts-for-react, @react-oauth/google, jspdf, html2canvas)

**Root Cause**: Local `node_modules` was being copied into Docker, overriding `npm install`

**Solution**:
1. Created `frontend/.dockerignore` to exclude node_modules
2. Updated `frontend/Dockerfile` to use `npm install --legacy-peer-deps`

### Key Files Modified This Session
| File | Changes |
|------|---------|
| `backend-python/main.py` | Added setup_rate_limiting() call |
| `backend-python/middleware/__init__.py` | Export rate limiting functions |
| `backend-python/requirements.txt` | Added slowapi==0.1.9 |
| `frontend/Dockerfile` | Added --legacy-peer-deps flag |
| `frontend/.dockerignore` | NEW - excludes node_modules |
| `test_rate_limit.py` | NEW - rate limit test script |

## Architecture Notes

### Backend Stack
- **Framework**: FastAPI with async/await
- **Database**: PostgreSQL + SQLAlchemy (async)
- **AI**: OpenAI/Anthropic (configurable via settings)
- **Logging**: structlog + RotatingFileHandler
- **Rate Limiting**: slowapi (built on limits library)
- **Error Tracking**: Sentry (optional)

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Router**: react-router-dom v6
- **Auth**: @react-oauth/google
- **Charts**: echarts-for-react
- **PDF**: jspdf + html2canvas
- **Styling**: TailwindCSS

### Middleware Order (main.py)
```python
app.add_middleware(CORSMiddleware, ...)
app.add_middleware(LoggingMiddleware)
performance_middleware = PerformanceMiddleware(app, track_endpoints=True)
setup_rate_limiting(app)
setup_exception_handlers(app)
```

## Git Status
- **Branch**: `claude/quiz-flashcard-generator-01LL7DUF3V3JQVpU4DyTRzbE`
- **Latest Commit**: `v7.0.0: Add Phases 5-8`
- **Pushed**: Yes, to origin

## Next Steps

### Immediate (before context reset)
1. ✅ Commit and push changes - DONE
2. ⏳ Update dev docs - IN PROGRESS
3. Clone to hackathon-krio repo

### After Context Reset
1. Clone project to https://github.com/tyang4-ai/hackathon-krio
2. Continue with Phase 9: AI Explanations
3. Then Phase 10: Dark Mode

## Commands Reference

### Start Docker Environment
```bash
cd quiz-flashcard-app
docker-compose up -d
```

### Rebuild After Dependency Changes
```bash
# Backend
docker-compose build backend && docker-compose up -d backend

# Frontend
docker-compose build --no-cache frontend && docker-compose up -d frontend
```

### Test Rate Limiting
```bash
cd quiz-flashcard-app
python test_rate_limit.py
```

### Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Important Notes

1. **Random-testing-repo is the main repo** - hackathon-krio will be a copy for the hackathon
2. **Rate limiting uses IP-based identification** - no auth required for limiter to work
3. **Docker .dockerignore is critical** - prevents local node_modules from breaking container builds
