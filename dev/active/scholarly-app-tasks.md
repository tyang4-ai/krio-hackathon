# Scholarly App - Task Checklist

**Last Updated**: 2025-11-28 (Session 2)

## Completed Tasks

### Phase 0: TypeScript Migration ✅
- [x] Setup TypeScript in frontend
- [x] Convert JS files to TSX
- [x] Add type definitions

### Phase 1: Authentication ✅
- [x] Add @react-oauth/google dependency
- [x] Create LoginPage component
- [x] Create auth_service.py backend
- [x] Create User model and schema
- [x] JWT token generation/verification

### Phase 2: Data Tracking ✅
- [x] Create QuestionAttempt model
- [x] Track per-question attempts
- [x] Store time spent, score history

### Phase 3: Analytics Dashboard ✅
- [x] Create AnalyticsDashboard.tsx
- [x] Add AI Learning Score calculation
- [x] Create analytics API endpoints
- [x] Add echarts-for-react charts

### Phase 4: Spaced Repetition ✅
- [x] Implement SM-2 algorithm
- [x] Add FlashcardProgress model with SM-2 fields
- [x] Create database migration
- [x] Update flashcard study flow

### Phase 5: Logging ✅
- [x] Install structlog
- [x] Create LoggingMiddleware
- [x] Create PerformanceMiddleware
- [x] Create activity_logger.py
- [x] Add rotating file handler

### Phase 6: Error Handling ✅
- [x] Create ErrorBoundary.tsx component
- [x] Create ErrorContext.tsx
- [x] Create Toast.tsx component
- [x] Create exceptions/__init__.py
- [x] Create exception_handler.py middleware

### Phase 7: PDF Export ✅
- [x] Add jspdf dependency
- [x] Add html2canvas dependency
- [x] Create pdfExport.ts service
- [x] Add export button to AnalyticsDashboard

### Phase 8: Rate Limiting ✅
- [x] Install slowapi
- [x] Create rate_limiter.py middleware
- [x] Define rate limit tiers
- [x] Apply to auth routes (5/min strict)
- [x] Apply to AI routes (5-20/min)
- [x] Apply to document upload (20/min)
- [x] Create custom 429 handler
- [x] Create test_rate_limit.py script
- [x] Test rate limiting (PASSED)

### Phase 10: Dark Mode ✅
- [x] Create ThemeContext.tsx
- [x] Add theme toggle button to Layout
- [x] Create dark mode CSS variables
- [x] Update TailwindCSS config with custom palette
- [x] Persist preference in localStorage
- [x] Apply dark mode to all major components
- [x] Fix Learning Score card dark mode styling

### Category Icons & Edit Feature ✅
- [x] Add icon field to Category model
- [x] Add icon to CategoryBase/CategoryUpdate schemas
- [x] Create migration 006_add_icon_to_categories
- [x] Create icon selector UI (21 icons)
- [x] Create edit modal for categories
- [x] Add edit/delete buttons on hover
- [x] Live preview in modal

### Clickable Questions Feature ✅
- [x] Add category_id to HardestQuestion type
- [x] Add category_id to get_hardest_questions backend
- [x] Make Analytics Dashboard questions clickable
- [x] Navigate to Notebook with ?highlight= parameter
- [x] Add URL parameter handling in NotebookPage
- [x] Auto-scroll to highlighted question
- [x] Make "Most Missed Questions" in Notebook clickable
- [x] Add highlight animation (ring + fade)

### AI Learning Score Category Filtering ✅
- [x] Update get_user_overview() to accept category_id
- [x] Update _calculate_streak() to accept category_id
- [x] Update calculate_learning_score() to pass category_id
- [x] Filter sessions_query by category

### Infrastructure ✅
- [x] Create frontend/.dockerignore
- [x] Fix Dockerfile npm install
- [x] Rebuild Docker containers
- [x] Push v7.0.0 to GitHub

---

## Pending Tasks

### Phase 9: AI Explanations 📋 (Deferred)
- [ ] Create ExplanationChatbox component
- [ ] Add "Explain This" button to quiz results
- [ ] Create /api/ai/explain endpoint
- [ ] Implement streaming response (optional)
- [ ] Store explanation history (optional)

---

## Quick Reference

### Dark Mode Color Tokens
```
dark-surface-10: #121212 (background)
dark-surface-20: #282828 (cards)
dark-surface-30: #3f3f3f (elevated)
dark-tonal-10: #191c22 (primary tinted bg)
dark-primary-10: #407dc7 (primary text)
dark-primary-20: #5b8acd (primary lighter)
```

### Category Icons Available
```
Folder, GraduationCap, BookMarked, Beaker, Calculator, Globe, Music, Palette,
Code, Heart, Brain, Atom, Languages, Scale, Landmark, Microscope, PenTool,
Camera, Leaf, Dumbbell, DollarSign
```

### Key Files (Session 2)
```
backend-python/
├── services/
│   └── analytics_service.py  # Category filtering fix
├── models/
│   └── category.py           # Added icon field
├── schemas/
│   └── category.py           # Added icon to schemas
└── alembic/versions/
    └── 20251128_000003_006_add_icon_to_categories.py

frontend/
├── src/
│   ├── contexts/
│   │   └── ThemeContext.tsx  # NEW - dark mode state
│   ├── pages/
│   │   ├── Home.tsx          # Icon selector, edit modal
│   │   ├── AnalyticsDashboard.tsx  # Clickable questions
│   │   └── NotebookPage.tsx  # Highlight + scroll
│   ├── components/
│   │   └── Layout.tsx        # Theme toggle
│   ├── styles/
│   │   └── index.css         # Dark mode CSS
│   └── types/
│       └── index.ts          # HardestQuestion.category_id
└── tailwind.config.js        # Custom dark palette
```

### Rate Limit Tiers Applied
| Endpoint | Limit | File |
|----------|-------|------|
| POST /api/auth/google | 5/min | auth.py |
| GET /api/auth/verify | 10/min | auth.py |
| POST /categories/{id}/analyze-samples | 5/min | ai.py |
| POST /categories/{id}/generate-questions | 10/min | ai.py |
| POST /categories/{id}/generate-flashcards | 10/min | ai.py |
| POST /quiz/{id}/question/{id}/grade | 20/min | ai.py |
| POST /quiz/{id}/question/{id}/handwritten | 20/min | ai.py |
| POST /api/categories/{id}/documents | 20/min | documents.py |
