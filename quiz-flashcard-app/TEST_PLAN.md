# StudyForge - Comprehensive Test Plan

**Version**: 1.0
**Last Updated**: December 2024
**Total Test Cases**: 175+

---

## Quick Reference

| Priority | Test Count | Description |
|----------|------------|-------------|
| P0 | 25 | Critical path - must pass before any release |
| P1 | 70 | Core functionality - API endpoints, security |
| P2 | 45 | Edge cases, performance |
| P3 | 35 | UI/UX, accessibility |

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Critical Path Tests (P0)](#2-critical-path-tests-p0)
3. [API Endpoint Tests (P1)](#3-api-endpoint-tests-p1)
4. [User Flow Tests](#4-user-flow-tests)
5. [Edge Case Tests (P2)](#5-edge-case-tests-p2)
6. [Performance Tests](#6-performance-tests)
7. [Security Tests (P1)](#7-security-tests-p1)
8. [UI/UX Tests (P3)](#8-uiux-tests-p3)
9. [Integration Tests](#9-integration-tests)
10. [Test Execution Checklist](#10-test-execution-checklist)
11. [Bug Reporting Template](#11-bug-reporting-template)

---

## 1. Test Environment Setup

### Prerequisites
```bash
# Backend
cd quiz-flashcard-app/backend-python
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd quiz-flashcard-app/frontend
npm install
```

### Environment Variables
Create `.env` file with test credentials:
```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/studyforge_test
OPENAI_API_KEY=sk-test-...
GOOGLE_CLIENT_ID=test-client-id
GOOGLE_CLIENT_SECRET=test-secret
JWT_SECRET_KEY=test-jwt-secret
ENVIRONMENT=development
```

### Test Data Preparation
1. Create test user accounts (User A, User B for isolation tests)
2. Prepare test files:
   - `test.pdf` - Valid PDF with text content
   - `test.docx` - Valid Word document
   - `large.pdf` - 49MB file (just under limit)
   - `toolarge.pdf` - 51MB file (over limit)
   - `corrupt.pdf` - Corrupted PDF file
   - `test.exe` - Invalid file type
   - `handwriting.jpg` - Handwritten text image

### Starting Services
```bash
# Terminal 1: Backend
cd backend-python
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## 2. Critical Path Tests (P0)

> These 25 tests MUST pass before any release. Run these first.

### 2.1 Authentication (5 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| AUTH-01 | Google OAuth Login | 1. Click "Sign in with Google"<br>2. Complete OAuth flow | Redirected to dashboard, JWT stored | ☐ |
| AUTH-02 | Guest Login | 1. Click "Continue as Guest" | Access granted, guest JWT stored | ☐ |
| AUTH-03 | Token Persistence | 1. Login<br>2. Close browser<br>3. Reopen app | Still logged in | ☐ |
| AUTH-04 | Logout | 1. Click logout button | Redirected to login, token cleared | ☐ |
| AUTH-05 | Invalid Token | 1. Manually corrupt JWT in storage<br>2. Refresh page | 401 error, redirect to login | ☐ |

### 2.2 Category Management (5 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| CAT-01 | Create Category | 1. Click + button<br>2. Enter name "Test Category"<br>3. Save | Category appears in list | ☐ |
| CAT-02 | Edit Category | 1. Click edit on category<br>2. Change name/color/icon<br>3. Save | Changes reflected immediately | ☐ |
| CAT-03 | Delete Empty Category | 1. Click delete<br>2. Confirm deletion | Category removed from list | ☐ |
| CAT-04 | Delete Category with Content | 1. Create category with documents<br>2. Delete category | All documents/questions/flashcards deleted | ☐ |
| CAT-05 | User Isolation | 1. User A creates category<br>2. Login as User B | User B cannot see User A's category | ☐ |

### 2.3 Document Upload (5 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| DOC-01 | Upload PDF | 1. Click upload<br>2. Select valid PDF<br>3. Submit | Document appears, text extracted | ☐ |
| DOC-02 | Upload DOCX | 1. Upload Word document | Document appears, text extracted | ☐ |
| DOC-03 | Upload with Chapter | 1. Upload document<br>2. Assign chapter tag | Chapter saved with document | ☐ |
| DOC-04 | Auto-Indexing | 1. Upload document<br>2. Wait for processing | Chunks created, embeddings generated | ☐ |
| DOC-05 | Delete Document | 1. Click delete on document<br>2. Confirm | Document and chunks removed | ☐ |

### 2.4 Content Generation (4 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| GEN-01 | Generate Questions | 1. Select documents<br>2. Set count=5, difficulty=medium<br>3. Generate | 5 questions created and saved | ☐ |
| GEN-02 | Generate Flashcards | 1. Select documents<br>2. Generate flashcards | Flashcards created | ☐ |
| GEN-03 | Generate with Analysis | 1. Add 3+ sample questions<br>2. Analyze<br>3. Generate | Questions match sample style | ☐ |
| GEN-04 | Chapter Filtering | 1. Filter by specific chapter<br>2. Generate | Only chapter content used | ☐ |

### 2.5 Quiz Flow (5 tests)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| QUIZ-01 | Create Practice Quiz | 1. Select settings<br>2. Start quiz | Quiz session created with questions | ☐ |
| QUIZ-02 | Answer Questions | 1. Select/type answers<br>2. Navigate between questions | Answers saved correctly | ☐ |
| QUIZ-03 | Submit Quiz | 1. Complete all questions<br>2. Submit | Score calculated, results shown | ☐ |
| QUIZ-04 | View Results | 1. After submission | Shows correct/incorrect, %, explanations | ☐ |
| QUIZ-05 | Timed Quiz Timeout | 1. Start timed quiz<br>2. Let timer expire | Auto-submit with warning message | ☐ |

### 2.6 Flashcard Study (1 test)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| FLASH-01 | Study Flashcards | 1. Open deck<br>2. Flip cards<br>3. Rate difficulty | SM-2 metrics updated correctly | ☐ |

---

## 3. API Endpoint Tests (P1)

### 3.1 Authentication Endpoints

**Base URL**: `/api/auth`

| ID | Method | Endpoint | Test Input | Expected Status | Expected Response |
|----|--------|----------|------------|-----------------|-------------------|
| API-AUTH-01 | POST | /google | Valid Google credential | 200 | `{token, user}` |
| API-AUTH-02 | POST | /google | Invalid credential | 401 | `{detail: "..."}` |
| API-AUTH-03 | POST | /guest | None | 200 | `{token, user}` |
| API-AUTH-04 | GET | /verify | Valid Bearer token | 200 | `{user}` |
| API-AUTH-05 | GET | /verify | Expired token | 401 | `{detail: "..."}` |
| API-AUTH-06 | GET | /verify | No token | 401 | `{detail: "..."}` |
| API-AUTH-07 | POST | /logout | Valid token | 200 | `{success: true}` |

### 3.2 Category Endpoints

**Base URL**: `/api/categories`

| ID | Method | Endpoint | Test Input | Expected Status | Expected Response |
|----|--------|----------|------------|-----------------|-------------------|
| API-CAT-01 | GET | / | Auth header | 200 | `[{id, name, ...}]` |
| API-CAT-02 | GET | / | No auth | 401 | Error |
| API-CAT-03 | POST | / | `{name: "Test"}` | 201 | `{id, name}` |
| API-CAT-04 | POST | / | `{name: ""}` | 422 | Validation error |
| API-CAT-05 | GET | /{id} | Valid ID | 200 | `{id, name, stats}` |
| API-CAT-06 | GET | /{id} | Invalid ID | 404 | Not found |
| API-CAT-07 | GET | /{id} | Other user's ID | 403/404 | Forbidden/Not found |
| API-CAT-08 | PUT | /{id} | `{name: "Updated"}` | 200 | Updated category |
| API-CAT-09 | DELETE | /{id} | Valid ID | 200 | Success |
| API-CAT-10 | DELETE | /{id} | ID with content | 200 | Cascade deleted |

### 3.3 Document Endpoints

**Base URL**: `/api`

| ID | Method | Endpoint | Test Input | Expected Status |
|----|--------|----------|------------|-----------------|
| API-DOC-01 | GET | /categories/{id}/documents | Valid category | 200 |
| API-DOC-02 | POST | /categories/{id}/documents | PDF < 50MB | 201 |
| API-DOC-03 | POST | /categories/{id}/documents | File > 50MB | 413 |
| API-DOC-04 | POST | /categories/{id}/documents | .exe file | 400 |
| API-DOC-05 | DELETE | /documents/{id} | Valid ID | 200 |
| API-DOC-06 | GET | /documents/{id}/status | Valid ID | 200 |
| API-DOC-07 | POST | /documents/{id}/chunk | Valid ID | 200 |
| API-DOC-08 | POST | /documents/{id}/embed | Chunked doc | 200 |
| API-DOC-09 | GET | /documents/{id}/chunks | Valid ID | 200 |
| API-DOC-10 | POST | /categories/{id}/search-chunks | `{query: "test"}` | 200 |
| API-DOC-11 | POST | /categories/{id}/organize | Valid category | 200 |

### 3.4 Quiz Endpoints

**Base URL**: `/api`

| ID | Method | Endpoint | Test Input | Expected Status |
|----|--------|----------|------------|-----------------|
| API-QUIZ-01 | GET | /categories/{id}/questions | Valid category | 200 |
| API-QUIZ-02 | POST | /categories/{id}/questions | Valid question | 201 |
| API-QUIZ-03 | POST | /categories/{id}/questions/bulk | Array of questions | 201 |
| API-QUIZ-04 | PUT | /questions/{id} | Updated fields | 200 |
| API-QUIZ-05 | DELETE | /questions/{id} | Valid ID | 200 |
| API-QUIZ-06 | POST | /categories/{id}/quiz | `{mode, difficulty, count}` | 201 |
| API-QUIZ-07 | GET | /quiz/{id} | Valid session | 200 |
| API-QUIZ-08 | POST | /quiz/{id}/submit | Answers array | 200 |
| API-QUIZ-09 | POST | /quiz/{id}/focus-event | `{type: "tab_switch"}` | 200 |
| API-QUIZ-10 | GET | /quiz/{id}/integrity-report | Valid session | 200 |

### 3.5 Flashcard Endpoints

**Base URL**: `/api`

| ID | Method | Endpoint | Test Input | Expected Status |
|----|--------|----------|------------|-----------------|
| API-FLASH-01 | GET | /categories/{id}/flashcards | Valid category | 200 |
| API-FLASH-02 | POST | /categories/{id}/flashcards | `{front, back}` | 201 |
| API-FLASH-03 | POST | /categories/{id}/flashcards/bulk | Array | 201 |
| API-FLASH-04 | PUT | /flashcards/{id} | Updated fields | 200 |
| API-FLASH-05 | DELETE | /flashcards/{id} | Valid ID | 200 |
| API-FLASH-06 | GET | /categories/{id}/flashcards/review | Valid category | 200 |
| API-FLASH-07 | POST | /flashcards/{id}/progress | `{quality: 5}` | 200 |
| API-FLASH-08 | GET | /categories/{id}/study-progress | Valid category | 200 |

### 3.6 AI Endpoints

**Base URL**: `/api`

| ID | Method | Endpoint | Test Input | Expected Status |
|----|--------|----------|------------|-----------------|
| API-AI-01 | POST | /categories/{id}/analyze-samples | 3+ samples exist | 200 |
| API-AI-02 | GET | /categories/{id}/analysis-status | Valid category | 200 |
| API-AI-03 | POST | /categories/{id}/generate-questions | `{count: 5}` | 200 |
| API-AI-04 | POST | /categories/{id}/generate-flashcards | `{count: 5}` | 200 |
| API-AI-05 | POST | /quiz/{id}/question/{qid}/grade | Answer text | 200 |
| API-AI-06 | POST | /quiz/{id}/question/{qid}/handwritten | Image file | 200 |
| API-AI-07 | POST | /explain | `{question_id, history}` | 200 |

### 3.7 Analytics Endpoints

| ID | Method | Endpoint | Test Input | Expected Status |
|----|--------|----------|------------|-----------------|
| API-ANAL-01 | GET | /analytics/dashboard | `?time_period=30` | 200 |
| API-ANAL-02 | GET | /analytics/dashboard | New user (no data) | 200 (empty) |

---

## 4. User Flow Tests

### 4.1 New User Onboarding

**Objective**: Verify complete new user journey

```
Step 1: Land on login page
  Expected: Login options visible

Step 2: Sign in with Google
  Expected: OAuth flow completes, redirected to dashboard

Step 3: See empty dashboard
  Expected: "Create your first category" prompt

Step 4: Create first category
  Expected: Category card appears

Step 5: Upload first document
  Expected: Document listed, processing starts

Step 6: Wait for processing
  Expected: Status shows "complete"

Step 7: Generate first questions
  Expected: Questions created successfully

Step 8: Take first quiz
  Expected: Quiz starts with generated questions

Step 9: View results
  Expected: Score displayed with feedback

Step 10: Check analytics
  Expected: Dashboard shows first quiz data
```

**Pass/Fail**: ☐

### 4.2 Document Processing Pipeline

```
Step 1: Upload PDF document
  Expected: Document appears in list

Step 2: Verify text extracted
  Expected: Content preview available

Step 3: Check chunking status
  Expected: Status = "chunked", chunks visible

Step 4: Verify embedding status
  Expected: Status = "embedded"

Step 5: Test vector search
  Expected: Search returns relevant chunks

Step 6: Generate content from chunks
  Expected: Questions reference source content
```

**Pass/Fail**: ☐

### 4.3 Sample-Based Generation

```
Step 1: Create category
Step 2: Add 3+ sample questions manually
Step 3: Trigger pattern analysis
  Expected: Analysis status = "complete"
Step 4: View analysis results
  Expected: Style guide extracted
Step 5: Generate questions with patterns
  Expected: New questions match sample style
Step 6: Verify style matches samples
  Expected: Similar tone, difficulty, format
```

**Pass/Fail**: ☐

### 4.4 Complete Quiz Cycle

```
Step 1: Select category with questions
Step 2: Configure quiz (practice mode, 10 questions, medium)
Step 3: Start quiz
  Expected: First question displayed
Step 4: Answer all questions
Step 5: Submit quiz
  Expected: Grading completes
Step 6: View score and feedback
  Expected: Percentage, correct/incorrect marks
Step 7: Get explanations for wrong answers
  Expected: AI explanations displayed
Step 8: Check updated analytics
  Expected: Quiz reflected in stats
```

**Pass/Fail**: ☐

### 4.5 Flashcard Mastery (SM-2)

```
Step 1: Create/generate flashcards
Step 2: Start study session
Step 3: Flip cards, rate as "Easy" (quality=5)
  Expected: Interval increases (1→6 days)
Step 4: Rate next card as "Hard" (quality=1)
  Expected: Interval resets, due soon
Step 5: Complete session
Step 6: Check SM-2 metrics
  Expected: EF updated, next_review calculated
Step 7: Return next day
Step 8: Study due cards only
  Expected: Only past-due cards shown
Step 9: Track mastery increase
  Expected: Mastery % increases over time
```

**Pass/Fail**: ☐

### 4.6 Exam Mode with Integrity

```
Step 1: Start exam mode quiz with 30-minute timer
Step 2: Answer some questions
Step 3: Switch to another tab
  Expected: Focus event recorded
Step 4: Return and complete quiz
Step 5: Submit
Step 6: View integrity report
  Expected: Shows focus events, integrity score < 100
Step 7: See focus event summary
  Expected: Lists all tab switches with timestamps
```

**Pass/Fail**: ☐

### 4.7 Handwritten Answer Flow

```
Step 1: Start quiz with written answer questions
Step 2: Write answer on paper
Step 3: Take photo and upload
  Expected: Upload succeeds
Step 4: Submit for OCR
  Expected: Recognized text displayed
Step 5: Correct if needed
  Expected: Correction saved
Step 6: Get AI grading
  Expected: Partial credit score with feedback
```

**Pass/Fail**: ☐

### 4.8 Document Organization

```
Step 1: Upload 5+ documents on related topics
Step 2: Trigger AI organization
  Expected: Processing starts
Step 3: View suggested chapters
  Expected: Documents grouped by topic
Step 4: Download chapter PDFs
  Expected: PDF downloads with grouped content
Step 5: Verify content preserved
  Expected: Full text, no summarization
```

**Pass/Fail**: ☐

---

## 5. Edge Case Tests (P2)

### 5.1 File Upload Edge Cases

| ID | Test | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| EDGE-UP-01 | Empty file | Upload 0-byte file | Error: "File is empty" | ☐ |
| EDGE-UP-02 | Corrupted PDF | Upload corrupt.pdf | Error or partial extraction | ☐ |
| EDGE-UP-03 | Max size | Upload 49MB file | Success | ☐ |
| EDGE-UP-04 | Over limit | Upload 51MB file | Error: "File too large" | ☐ |
| EDGE-UP-05 | Special chars | Filename: "tëst émøji 📚.pdf" | Handled correctly | ☐ |
| EDGE-UP-06 | Concurrent | Upload 5 files at once | All processed | ☐ |
| EDGE-UP-07 | Scanned PDF | PDF with images only | Extraction attempt, warning | ☐ |

### 5.2 Generation Edge Cases

| ID | Test | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| EDGE-GEN-01 | No documents | Generate with empty category | Error: "No content" | ☐ |
| EDGE-GEN-02 | Empty document | Generate from blank doc | Error: "No content" | ☐ |
| EDGE-GEN-03 | Too many | Request 100 from small doc | Returns max possible | ☐ |
| EDGE-GEN-04 | Conflict | "Easy but complex" directions | Best-effort response | ☐ |
| EDGE-GEN-05 | Rate limit | 101 requests in 1 minute | 429 with retry-after | ☐ |

### 5.3 Quiz Edge Cases

| ID | Test | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| EDGE-QUIZ-01 | No questions | Create quiz with 0 available | Error message | ☐ |
| EDGE-QUIZ-02 | Empty answer | Submit blank written answer | Marked incorrect, 0 points | ☐ |
| EDGE-QUIZ-03 | Long answer | 10,000 character response | Truncated or accepted | ☐ |
| EDGE-QUIZ-04 | Timer expires | Let time reach 0 | Auto-submit with results | ☐ |
| EDGE-QUIZ-05 | Close mid-quiz | Close browser during quiz | Resume option on return | ☐ |
| EDGE-QUIZ-06 | Double submit | Click submit twice quickly | Second ignored | ☐ |

### 5.4 Flashcard Edge Cases

| ID | Test | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| EDGE-FLASH-01 | All mastered | Study when all EF > 4.0 | "All caught up" message | ☐ |
| EDGE-FLASH-02 | SM-2 floor | Rate "hard" 10x consecutively | EF stays >= 1.3 | ☐ |
| EDGE-FLASH-03 | Future review | Card due tomorrow | Not in "due" list today | ☐ |
| EDGE-FLASH-04 | Delete mid-study | Delete card during session | Graceful removal, continue | ☐ |

### 5.5 Authentication Edge Cases

| ID | Test | Action | Expected Result | Pass/Fail |
|----|------|--------|-----------------|-----------|
| EDGE-AUTH-01 | Expired token | API call with old token | 401, redirect to login | ☐ |
| EDGE-AUTH-02 | Tampered token | Modified JWT payload | 401 error | ☐ |
| EDGE-AUTH-03 | Guest → Google | Guest logs in with Google | New account or merge prompt | ☐ |
| EDGE-AUTH-04 | Multi-tab logout | Logout in one tab | Other tabs redirect | ☐ |

---

## 6. Performance Tests

### 6.1 Response Time Benchmarks

| ID | Operation | Target | Test Method | Actual | Pass/Fail |
|----|-----------|--------|-------------|--------|-----------|
| PERF-01 | Category list | < 500ms | Load 100 categories | ___ms | ☐ |
| PERF-02 | Question list | < 500ms | Load 1000 questions | ___ms | ☐ |
| PERF-03 | Quiz creation | < 1000ms | Create 50-question quiz | ___ms | ☐ |
| PERF-04 | Quiz submission | < 2000ms | Submit with AI grading | ___ms | ☐ |
| PERF-05 | Content generation | < 30s | Generate 10 questions | ___s | ☐ |
| PERF-06 | Vector search | < 2000ms | Search 10K chunks | ___ms | ☐ |
| PERF-07 | Dashboard load | < 1000ms | Full analytics | ___ms | ☐ |
| PERF-08 | Document upload | < 5s | 10MB PDF | ___s | ☐ |

### 6.2 Concurrent Users

| ID | Test | Users | Expected | Pass/Fail |
|----|------|-------|----------|-----------|
| PERF-CON-01 | Simultaneous logins | 10 | All succeed | ☐ |
| PERF-CON-02 | Concurrent uploads | 10 | All processed | ☐ |
| PERF-CON-03 | Concurrent generation | 5 | Rate limited | ☐ |
| PERF-CON-04 | Concurrent quizzes | 20 | All complete | ☐ |

### 6.3 Data Volume

| ID | Test | Volume | Expected | Pass/Fail |
|----|------|--------|----------|-----------|
| PERF-VOL-01 | Large category | 5000 questions | Pagination works | ☐ |
| PERF-VOL-02 | Many categories | 200 categories | Dashboard loads | ☐ |
| PERF-VOL-03 | Large document | 500 pages | Processes correctly | ☐ |
| PERF-VOL-04 | Long history | 1000 quiz sessions | Analytics calculates | ☐ |

---

## 7. Security Tests (P1)

### 7.1 Authorization

| ID | Test | Action | Expected | Pass/Fail |
|----|------|--------|----------|-----------|
| SEC-AUTH-01 | Access other's category | GET /categories/{other_user} | 403 or 404 | ☐ |
| SEC-AUTH-02 | Modify other's question | PUT /questions/{other_user} | 403 | ☐ |
| SEC-AUTH-03 | Delete other's document | DELETE /documents/{other} | 403 | ☐ |
| SEC-AUTH-04 | Guest restricted | Guest tries generation | 401/403 | ☐ |
| SEC-AUTH-05 | No token | API call without auth | 401 | ☐ |

### 7.2 Input Validation

| ID | Test | Input | Expected | Pass/Fail |
|----|------|-------|----------|-----------|
| SEC-INP-01 | SQL injection | `'; DROP TABLE users;--` | Escaped, no effect | ☐ |
| SEC-INP-02 | XSS in question | `<script>alert(1)</script>` | Escaped in output | ☐ |
| SEC-INP-03 | Path traversal | `../../etc/passwd` | Rejected | ☐ |
| SEC-INP-04 | Large payload | 10MB JSON body | 413 error | ☐ |
| SEC-INP-05 | Null bytes | `test\x00malicious` | Sanitized | ☐ |

### 7.3 Rate Limiting

| ID | Endpoint Type | Limit | Test | Expected | Pass/Fail |
|----|---------------|-------|------|----------|-----------|
| SEC-RATE-01 | AI Generate | 100/min | Send 101 requests | 429 after 100 | ☐ |
| SEC-RATE-02 | AI Grade | 200/min | Send 201 requests | 429 after 200 | ☐ |
| SEC-RATE-03 | Upload | 50/min | Send 51 uploads | 429 after 50 | ☐ |
| SEC-RATE-04 | Auth | Strict | 10 failed logins | Blocked | ☐ |

---

## 8. UI/UX Tests (P3)

### 8.1 Responsive Design

| ID | Viewport | Test | Expected | Pass/Fail |
|----|----------|------|----------|-----------|
| UI-RESP-01 | Desktop (1920x1080) | Full layout | Sidebar visible, full width | ☐ |
| UI-RESP-02 | Laptop (1366x768) | Adjusted layout | Readable, no overflow | ☐ |
| UI-RESP-03 | Tablet (768x1024) | Collapsible menu | Hamburger menu works | ☐ |
| UI-RESP-04 | Mobile (375x667) | Stack layout | Cards stack, bottom nav | ☐ |

### 8.2 Dark Mode

| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| UI-DARK-01 | Toggle mode | All components update | ☐ |
| UI-DARK-02 | Persist preference | Remembers on reload | ☐ |
| UI-DARK-03 | Charts readable | Proper contrast in charts | ☐ |
| UI-DARK-04 | Form inputs | Clear borders, readable | ☐ |

### 8.3 Empty States

| ID | Page | Expected Message | Pass/Fail |
|----|------|------------------|-----------|
| UI-EMPTY-01 | Categories | "Create your first category" | ☐ |
| UI-EMPTY-02 | Documents | "Upload your first document" | ☐ |
| UI-EMPTY-03 | Questions | "Generate or add questions" | ☐ |
| UI-EMPTY-04 | Flashcards | "Create flashcards to study" | ☐ |
| UI-EMPTY-05 | Quiz history | "Take your first quiz" | ☐ |

### 8.4 Loading States

| ID | Action | Expected Indicator | Pass/Fail |
|----|--------|-------------------|-----------|
| UI-LOAD-01 | Category load | Skeleton cards | ☐ |
| UI-LOAD-02 | Document upload | Progress bar with % | ☐ |
| UI-LOAD-03 | AI Generation | Spinner with status text | ☐ |
| UI-LOAD-04 | Quiz submit | Loading overlay | ☐ |

### 8.5 Error Messages

| ID | Error Scenario | Expected Message | Pass/Fail |
|----|----------------|------------------|-----------|
| UI-ERR-01 | Network failure | "Connection error. Please retry." | ☐ |
| UI-ERR-02 | 500 error | "Something went wrong. Try again." | ☐ |
| UI-ERR-03 | Validation error | Specific field message | ☐ |
| UI-ERR-04 | Rate limit | "Too many requests. Wait X seconds." | ☐ |

---

## 9. Integration Tests

### 9.1 Frontend-Backend Contract

| ID | Check | How to Test | Expected | Pass/Fail |
|----|-------|-------------|----------|-----------|
| INT-01 | Field names | Check snake_case ↔ camelCase | Properly converted | ☐ |
| INT-02 | Response wrapping | Check data.data vs data | Handled both cases | ☐ |
| INT-03 | Error format | Check {detail} → {error} | Normalized | ☐ |
| INT-04 | Optional fields | Send null/undefined | No crashes | ☐ |

### 9.2 Database Integrity

| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| INT-DB-01 | Cascade delete category | All related deleted | ☐ |
| INT-DB-02 | Foreign key constraint | Invalid refs rejected | ☐ |
| INT-DB-03 | Unique constraint | Duplicates rejected | ☐ |
| INT-DB-04 | Transaction rollback | Partial ops cleaned | ☐ |

### 9.3 AI Agent Integration

| ID | Test | Expected | Pass/Fail |
|----|------|----------|-----------|
| INT-AI-01 | Generation uses analysis | Style guide applied | ☐ |
| INT-AI-02 | Grading by type | Correct rubric used | ☐ |
| INT-AI-03 | Explanation context | Question details included | ☐ |
| INT-AI-04 | Handwriting → Grading | OCR feeds grading | ☐ |

---

## 10. Test Execution Checklist

### Pre-Testing Setup
- [ ] Test database cleaned/reset
- [ ] Test API keys configured
- [ ] Test user accounts created (User A, User B)
- [ ] Test files prepared (PDFs, images)
- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173

### Execution Order

**Phase 1: Critical Path (P0)** - Must pass first
- [ ] AUTH-01 through AUTH-05 (Authentication)
- [ ] CAT-01 through CAT-05 (Categories)
- [ ] DOC-01 through DOC-05 (Documents)
- [ ] GEN-01 through GEN-04 (Generation)
- [ ] QUIZ-01 through QUIZ-05 (Quiz)
- [ ] FLASH-01 (Flashcards)

**Phase 2: API Endpoints (P1)**
- [ ] All API-AUTH tests
- [ ] All API-CAT tests
- [ ] All API-DOC tests
- [ ] All API-QUIZ tests
- [ ] All API-FLASH tests
- [ ] All API-AI tests
- [ ] All API-ANAL tests

**Phase 3: Security (P1)**
- [ ] All SEC-AUTH tests
- [ ] All SEC-INP tests
- [ ] All SEC-RATE tests

**Phase 4: User Flows**
- [ ] New user onboarding
- [ ] Document pipeline
- [ ] Quiz cycle
- [ ] Flashcard mastery
- [ ] Exam integrity

**Phase 5: Edge Cases (P2)**
- [ ] File upload edge cases
- [ ] Generation edge cases
- [ ] Quiz edge cases
- [ ] Authentication edge cases

**Phase 6: Performance (P2)**
- [ ] Response time benchmarks
- [ ] Concurrent user tests
- [ ] Data volume tests

**Phase 7: UI/UX (P3)**
- [ ] Responsive design
- [ ] Dark mode
- [ ] Empty states
- [ ] Loading states
- [ ] Error messages

**Phase 8: Integration**
- [ ] Frontend-backend contract
- [ ] Database integrity
- [ ] AI agent integration

### Sign-off

| Phase | Tests Passed | Tests Failed | Tester | Date |
|-------|--------------|--------------|--------|------|
| P0 Critical | ___/25 | ___ | | |
| P1 API | ___/50 | ___ | | |
| P1 Security | ___/15 | ___ | | |
| User Flows | ___/8 | ___ | | |
| P2 Edge Cases | ___/25 | ___ | | |
| P2 Performance | ___/15 | ___ | | |
| P3 UI/UX | ___/20 | ___ | | |
| Integration | ___/12 | ___ | | |
| **TOTAL** | ___/170 | ___ | | |

---

## 11. Bug Reporting Template

When a test fails, create a bug report using this template:

```markdown
## Bug Report

**ID**: BUG-[NUMBER]
**Test ID**: [e.g., AUTH-03]
**Title**: [Brief description]

**Severity**:
- [ ] Critical (blocks release)
- [ ] High (major feature broken)
- [ ] Medium (feature impaired)
- [ ] Low (minor issue)

**Environment**:
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- User Type: [Guest/Authenticated]
- Backend Version: [commit hash]
- Frontend Version: [commit hash]

**Steps to Reproduce**:
1.
2.
3.

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happened]

**Screenshots/Logs**:
[Attach relevant evidence]

**Additional Context**:
[Any other relevant information]
```

---

## Appendix: Test Data Requirements

### Sample Questions (for GEN-03)
```json
[
  {
    "question_text": "What is the capital of France?",
    "question_type": "multiple_choice",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "correct_answer": "Paris",
    "difficulty": "easy",
    "explanation": "Paris is the capital and largest city of France."
  },
  {
    "question_text": "The Earth revolves around the Sun.",
    "question_type": "true_false",
    "correct_answer": "True",
    "difficulty": "easy"
  },
  {
    "question_text": "Explain the process of photosynthesis.",
    "question_type": "written_answer",
    "correct_answer": "Photosynthesis is the process by which plants convert sunlight, water, and carbon dioxide into glucose and oxygen.",
    "difficulty": "medium"
  }
]
```

### Test PDF Content
Create a test PDF with educational content about a topic (e.g., "Introduction to Machine Learning") containing at least 5 pages of text for chunking and generation tests.

---

**End of Test Plan**
