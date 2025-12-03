# Performance & Security Optimizations - 2025-12-02

## Status: COMPLETED

## Overview
Critical fixes addressing security vulnerabilities, performance bottlenecks, and frontend stability issues.

---

## Changes Implemented

### 1. Security: Remove Hardcoded Credentials
**File:** `backend-python/config/settings.py`
- **Issue:** Database URL and secret key had hardcoded default values
- **Fix:** Changed defaults to empty strings, added production validation via `@model_validator`
- **Lines:** 20, 74, 95-103
- **Note:** Copied root `.env` to `backend-python/.env` for local development

### 2. Performance: Database Connection Pool
**File:** `backend-python/config/database.py`
- **Issue:** Pool size of 5 with overflow of 10 caused connection exhaustion under load
- **Fix:**
  - pool_size: 5 → 20
  - max_overflow: 10 → 20
  - Added pool_recycle=3600 for connection health
- **Lines:** 20-22

### 3. Performance: Database Indexes
**File:** `alembic/versions/20251202_000003_014_add_performance_indexes.py`
- **Issue:** Missing indexes caused full table scans on common queries
- **Fix:** Added 7 composite indexes:
  - `idx_flashcard_progress_card_user` (flashcard_id, user_id)
  - `idx_document_chunks_doc_status` (document_id, embedding_status)
  - `idx_flashcards_category_difficulty` (category_id, difficulty)
  - `idx_documents_category_processed` (category_id, processed)
  - `idx_documents_category_chunking` (category_id, chunking_status)
  - `idx_questions_category_id` (category_id)
  - `idx_question_attempts_session_user` (session_id, user_id)

### 4. Performance: Batch Embedding Updates
**File:** `backend-python/services/embedding_service.py`
- **Issue:** Individual UPDATE per chunk = N database round trips
- **Fix:** Batch UPDATEs using CASE expression = 1 round trip
- **Lines:** 276-288

### 5. Frontend: Timer Memory Leaks
**File:** `frontend/src/pages/QuizSession.tsx`
- **Issue:** setTimeout calls (lines 56, 64) without cleanup caused memory leaks and "Can't perform state update on unmounted component" errors
- **Fix:** Added `warningTimeoutRef` (line 24) for timeout tracking and cleanup in useEffect return (lines 42-44)
- **Pattern:** Clear previous timeout before setting new one (lines 59-60, 68-69)

### 6. Frontend: Silent Error Handling
**Files:**
- `frontend/src/pages/Home.tsx:133` - `.catch(() => null)`
- `frontend/src/contexts/AuthContext.tsx:89` - `.catch(() => {})`
- **Issue:** Errors silently swallowed, users left confused
- **Fix:** Added console.error logging for debugging visibility

### 7. Feature: Document Download with Fallback
**File:** `backend-python/routers/documents.py`
- **Feature:** Added download endpoint for documents at `/api/documents/{document_id}/download`
- **Implementation:**
  1. First tries to serve the original file from disk
  2. Falls back to extracted text content (`content_text`) if file is missing (common after EB redeploy)
  3. Returns clear error if neither available
- **Frontend:** Added Download button to batch actions in `CategoryDashboard.tsx`
- **API:** Added `getDownloadUrl()` method in `api.ts`

### 8. Frontend: Promise.all Race Conditions
**Files affected:**
| File | Line | API Calls |
|------|------|-----------|
| CategoryDashboard.tsx | 155 | 3 calls |
| Home.tsx | 131 | 2 calls |
| FlashcardsPage.tsx | 67 | 4 calls |
| QuizPage.tsx | 63 | 4 calls |
| NotebookPage.tsx | 102 | 3 calls |
| QuestionBank.tsx | 61 | 2 calls |

- **Issue:** If one Promise.all call fails, ALL results are lost
- **Fix:** Replaced with Promise.allSettled() for graceful partial data handling

---

## Analysis Note

**Analytics N+1 Query - NOT AN ISSUE**

The `analytics_service.py` was analyzed and found NOT to have N+1 queries. The 3 calls in `calculate_learning_score()` (lines 343-345) are:
- `get_user_overview()` - 1 aggregated SELECT query
- `get_trend_data()` - 1 aggregated SELECT query
- `get_difficulty_breakdown()` - 1 aggregated SELECT query

These are independent aggregate queries with GROUP BY, not N+1 patterns (which would be queries in a loop). The code is already optimal.

---

## Impact Assessment

| Fix | Impact | Risk |
|-----|--------|------|
| Hardcoded creds | High security | Low - env vars required |
| Connection pool | High performance | Low - larger pool |
| Database indexes | High performance | Low - standard indexes |
| Batch embeddings | Medium performance | Low - same logic batched |
| Timer cleanup | Medium stability | Low - proper cleanup |
| Error logging | Low debuggability | Very low - just logging |
| Promise.allSettled | Medium UX | Low - graceful degradation |

---

## Deferred Items

- RAG pipeline wiring (GenerationAgent already updated)
- Docker resource limits
- Backend healthcheck endpoint
- Accessibility improvements
- TypeScript interface cleanup
- Global topic embedding cache
- Console.log cleanup (13 frontend files)
