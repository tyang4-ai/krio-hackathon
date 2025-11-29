# Scholarly Quiz & Flashcard App - Development Context

**Last Updated**: 2025-11-28 (Session 3)

## Current State Summary

### Completed Phases (0-10)
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
| 9 | AI Explanations (per-question chatbox) | ⏳ Skipped for now |
| 10 | Dark Mode | ✅ Complete |

### Additional Features Completed (Session 2)
| Feature | Status |
|---------|--------|
| Category Icons (21 lucide-react icons) | ✅ Complete |
| Category Edit Modal (name, description, color, icon) | ✅ Complete |
| Clickable Questions in Analytics Dashboard | ✅ Complete |
| Clickable Questions in Notebook Page | ✅ Complete |
| AI Learning Score Category Filtering | ✅ Complete |

### Bugfixes (Session 3)
| Fix | Status |
|-----|--------|
| Analytics overview stats category filtering | ✅ Fixed |
| Category icon not displaying on Home page | ✅ Fixed |

## Session 2 Work (2025-11-28)

### Phase 10: Dark Mode Implementation
**Custom Color Palette** (from design images):
```javascript
// tailwind.config.js
dark: {
  surface: { 10: '#121212', 20: '#282828', 30: '#3f3f3f', 40: '#575757', 50: '#717171', 60: '#8b8b8b' },
  tonal: { 10: '#191c22', 20: '#2e3137', 30: '#45474c', 40: '#5c5f64', 50: '#75777b', 60: '#8f9194' },
  primary: { 10: '#407dc7', 20: '#5b8acd', 30: '#7298d4', 40: '#88a6da', 50: '#9cb4e0', 60: '#b0c3e7' },
},
success: { dark: '#22946e', DEFAULT: '#47d5a6', light: '#9ae8ce' },
warning: { dark: '#a87a2a', DEFAULT: '#d7ac61', light: '#ecd7b2' },
danger: '#d94a4a',
info: '#9e40d1',
```

**Files Created/Modified:**
- `frontend/src/contexts/ThemeContext.tsx` - NEW: Theme state management
- `frontend/tailwind.config.js` - Added dark mode colors
- `frontend/src/styles/index.css` - Comprehensive dark mode CSS (~420 lines)
- `frontend/src/components/Layout.tsx` - Theme toggle button, dark classes

### Category Icons & Edit Feature
**Database Migration:**
- `backend-python/alembic/versions/20251128_000003_006_add_icon_to_categories.py`
  - Adds `icon` column (String(50), default="Folder")

**Files Modified:**
- `backend-python/models/category.py` - Added `icon` field
- `backend-python/schemas/category.py` - Added `icon` to all schemas
- `frontend/src/pages/Home.tsx` - Complete rewrite with icon selector and edit modal
- `frontend/src/types/index.ts` - Added `icon` to Category interface

**21 Available Icons:**
```typescript
const CATEGORY_ICONS = {
  Folder, GraduationCap, BookMarked, Beaker, Calculator, Globe, Music, Palette,
  Code, Heart, Brain, Atom, Languages, Scale, Landmark, Microscope, PenTool,
  Camera, Leaf, Dumbbell, DollarSign,
};
```

### Clickable Questions Feature
**Analytics Dashboard → Notebook Navigation:**
- Questions in "Questions to Review" section now clickable
- Navigates to `/category/{category_id}/notebook?highlight={question_id}`
- Required adding `category_id` to `HardestQuestion` type and backend response

**Notebook Page Enhancements:**
- Reads `?highlight=` parameter from URL
- Auto-scrolls to matching entry and highlights it
- "Most Missed Questions" also clickable to scroll within page
- Highlight styling: ring-2 with primary color, fades after 5 seconds

**Files Modified:**
- `backend-python/services/analytics_service.py` - Added `category_id` to hardest_questions query
- `frontend/src/types/index.ts` - Added `category_id` to HardestQuestion interface
- `frontend/src/pages/AnalyticsDashboard.tsx` - Made questions clickable, dark mode styling
- `frontend/src/pages/NotebookPage.tsx` - Added URL param handling, scroll-to-highlight, dark mode

### AI Learning Score Category Filtering Fix
**Problem:** AI Learning Score always showed overall stats, not category-specific

**Root Cause:** `calculate_learning_score()` called `get_user_overview()` without category_id

**Fix Applied:**
- `analytics_service.py`:
  - Updated `get_user_overview()` signature to accept `category_id`
  - Updated `_calculate_streak()` signature to accept `category_id`
  - Updated `calculate_learning_score()` to pass `category_id` to both methods
  - Added category filter to sessions_query

## Session 3 Work (2025-11-28)

### Analytics Dashboard Overview Stats Fix
**Problem:** Overview stats (Questions Attempted, Accuracy, etc.) didn't filter by category

**Root Cause:** `routers/analytics.py` `get_full_dashboard` called `get_user_overview(user_id, days)` without `category_id`

**Fix Applied:**
- Changed to `get_user_overview(user_id, days, category_id)`

### Category Icon Display Fix
**Problem:** Category icons not displaying on Home page after editing

**Root Cause:** `routers/categories.py` was NOT including `icon` field in `CategoryResponse` constructors

**Fix Applied:**
- Added `icon=cat.icon` to all 4 `CategoryResponse` constructors:
  - `get_all_categories` (line 36)
  - `get_category` (line 69)
  - `create_category` (line 92)
  - `update_category` (line 123)
- Added `icon=category_data.icon or "Folder"` to `create_category` in `category_service.py`

### Dark Mode Fixes
**Learning Score Card** (was not styled for dark mode):
- Added gradient: `dark:from-dark-tonal-10 dark:to-dark-surface-20`
- Added border: `dark:border-dark-primary-10/30`
- Updated all text colors for dark mode readability

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
- **Styling**: TailwindCSS with custom dark mode
- **Theme**: Context-based with localStorage persistence

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
- **Latest Commit**: v7.3.0: Fix analytics category filtering and category icon display
- **Needs Push**: No

## Commands Reference

### Start Docker Environment
```bash
cd quiz-flashcard-app
docker-compose up -d
```

### Rebuild After Changes
```bash
# Backend
docker-compose build backend && docker-compose up -d backend

# Frontend
docker-compose build --no-cache frontend && docker-compose up -d frontend

# Full rebuild
docker-compose down && docker-compose build --no-cache && docker-compose up -d
```

### Run Database Migrations
```bash
docker-compose exec backend alembic upgrade head
```

### Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Handoff Notes for Next Session

### Current Task Status
All requested features complete:
1. ✅ Dark mode with custom color palette
2. ✅ Category icons with edit functionality
3. ✅ Clickable questions (Analytics → Notebook)
4. ✅ AI Learning Score category filtering
5. ✅ Dark mode fix for Learning Score card
6. ✅ Analytics overview stats category filtering (Session 3)
7. ✅ Category icon display fix (Session 3)

### Files Changed Session 3
```
Modified:
- quiz-flashcard-app/backend-python/routers/analytics.py (category_id to get_user_overview)
- quiz-flashcard-app/backend-python/routers/categories.py (icon field in all responses)
- quiz-flashcard-app/backend-python/services/category_service.py (icon in create_category)
```

### Known Issues
None currently - all features tested and working

### Important Notes
1. **Migration 006** adds icon column - run `alembic upgrade head` after backend restart
2. **ThemeContext** must wrap App in main.tsx for dark mode to work
3. **Dark mode uses `darkMode: 'class'`** in tailwind.config.js - theme toggle adds/removes `dark` class on `<html>`
