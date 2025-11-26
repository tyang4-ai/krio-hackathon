# Scholarly - Quiz & Flashcard Generator - Developer Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Backend Services](#backend-services)
6. [Multi-Agent AI System](#multi-agent-ai-system)
7. [Frontend Components](#frontend-components)
8. [API Reference](#api-reference)
9. [AI Integration](#ai-integration)
10. [Personalization System](#personalization-system)
11. [Development Setup](#development-setup)
12. [Deployment](#deployment)
13. [API Contract Validation Guidelines](#api-contract-validation-guidelines)

---

## Project Overview

Scholarly is an AI-powered educational platform that generates quiz questions and flashcards from uploaded documents. It features adaptive learning through user performance tracking and content personalization.

### Key Features
- **Multi-format Document Support**: PDF, TXT, DOCX, MD
- **AI Content Generation**: Questions (multiple choice, true/false, written answer, fill-in-the-blank) and flashcards
- **Scientific Notation Input**: Rich input component with auto-conversion for superscripts (^), fractions (/), arrows, and Greek letters
- **Adaptive Learning**: Tracks user performance and preferences
- **Personalized AI**: Learns from ratings and performance history
- **Spaced Repetition**: Smart flashcard review scheduling
- **Multi-Provider AI**: Supports NVIDIA, Groq, Together.ai, Ollama, AWS Bedrock, HuggingFace
- **Multi-Agent AI System**: Separate analysis, generation, handwriting, and grading agents with controller coordination
- **Question Bank Management**: Full CRUD with bulk operations and star ratings
- **Custom Quiz Configuration**: Mixed or type-specific question selection
- **Sample Questions**: User-provided examples with AI pattern analysis
- **Multiple Quiz Modes**: Practice (no timer), Timed (customizable), Exam Simulation (focus tracking)
- **Handwritten Answer Support**: PDF upload with AI handwriting recognition
- **Partial Credit Grading**: AI-powered component breakdown for complex questions
- **Exam Integrity Tracking**: Focus violation detection for exam simulation mode

---

## Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │   Home   │ Category │   Quiz   │Flashcards│ Question │  │
│  │          │Dashboard │  Page    │   Page   │   Bank   │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────┐
│                    Backend (Express.js)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Controllers                        │  │
│  │  Category │ Document │ Quiz │ Flashcard │ Notebook   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                     Services                          │  │
│  │  Category │ Document │ Quiz │ Flashcard │ AI │ Prefs │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Multi-Agent System                       │  │
│  │  Controller ←→ Analysis ←→ Generation ←→ Handwriting │  │
│  │                         ←→ Grading                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database (SQLite + sql.js)               │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                 AI Provider (Multi-Provider)                 │
│  NVIDIA │ Groq │ Together.ai │ Ollama │ Bedrock │ HuggingFace│
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure
```
quiz-flashcard-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js              # Database setup & migrations
│   │   ├── controllers/
│   │   │   ├── categoryController.js    # Category CRUD
│   │   │   ├── documentController.js    # Document upload & AI generation
│   │   │   ├── flashcardController.js   # Flashcard management
│   │   │   ├── notebookController.js    # Wrong answer tracking
│   │   │   ├── quizController.js        # Quiz & questions
│   │   │   └── sampleQuestionController.js # Sample questions
│   │   ├── services/
│   │   │   ├── aiService.js             # Multi-provider AI client
│   │   │   ├── categoryService.js       # Category business logic
│   │   │   ├── documentService.js       # Document processing
│   │   │   ├── flashcardService.js      # Flashcard logic & spaced repetition
│   │   │   ├── quizService.js           # Quiz sessions & questions
│   │   │   ├── sampleQuestionService.js # Sample question management
│   │   │   ├── storageService.js        # File storage
│   │   │   ├── userPreferencesService.js # Performance tracking & AI insights
│   │   │   └── agents/                  # Multi-agent AI system (NEW)
│   │   │       ├── controllerAgent.js   # Main coordinator
│   │   │       ├── analysisAgent.js     # Pattern analysis agent
│   │   │       ├── generationAgent.js   # Question generation agent
│   │   │       ├── handwritingAgent.js  # Handwritten PDF recognition (NEW)
│   │   │       └── gradingAgent.js      # Partial credit grading (NEW)
│   │   ├── routes/
│   │   │   └── index.js                 # API route definitions
│   │   └── server.js                    # Express server entry point
│   ├── data/                            # SQLite database storage
│   ├── uploads/                         # Uploaded documents
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx              # Main layout wrapper
│   │   │   ├── CategoryForm.jsx        # Category creation form
│   │   │   └── ScientificInput.jsx     # Scientific notation input with auto-conversion
│   │   ├── pages/
│   │   │   ├── Home.jsx                # Landing page & category list
│   │   │   ├── CategoryDashboard.jsx   # Category overview & content generation
│   │   │   ├── QuizPage.jsx            # Quiz configuration & history
│   │   │   ├── QuizSession.jsx         # Active quiz interface
│   │   │   ├── QuizResults.jsx         # Quiz results & review
│   │   │   ├── QuestionBank.jsx        # Question management (new)
│   │   │   ├── FlashcardsPage.jsx      # Flashcard study interface
│   │   │   └── NotebookPage.jsx        # Wrong answer notebook
│   │   ├── services/
│   │   │   └── api.js                  # API client with axios
│   │   ├── App.jsx                     # React Router setup
│   │   └── index.css                   # Tailwind CSS styles
│   ├── public/
│   └── package.json
├── README.md
└── DEVDOC.md                           # This file
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: SQLite with sql.js (in-memory for portability)
- **File Upload**: multer
- **Document Processing**:
  - pdf-parse (PDF)
  - mammoth (DOCX)
  - markdown-it (Markdown)
- **AI Client**: OpenAI SDK (compatible with multiple providers)
- **UUID**: uuid v4

### Frontend
- **Framework**: React 18+
- **Routing**: React Router 6
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS 3.x
- **Icons**: Lucide React
- **Build Tool**: Vite

### AI Providers
- NVIDIA Nemotron (default)
- Groq (recommended for production - fast & cheap)
- Together.ai
- Ollama (local development)
- AWS Bedrock (requires AWS SDK)
- HuggingFace (requires HF SDK)

---

## Database Schema

### Tables Overview
```sql
-- Core Tables
categories          # Subject categories
documents           # Uploaded files
questions           # Question bank
flashcards          # Flashcard bank
sample_questions    # User-provided style examples

-- Session & Progress Tables
quiz_sessions       # Quiz attempts
flashcard_progress  # Spaced repetition tracking
notebook_entries    # Wrong answers

-- Personalization Tables
user_preferences    # Key-value preference storage
question_performance # Answer accuracy tracking

-- Multi-Agent System Tables
ai_analysis_results # Pattern analysis results from analysis agent
agent_messages      # Inter-agent communication log

-- Quiz Enhanced Features Tables (NEW)
handwritten_answers     # Uploaded handwritten PDFs with recognized text
handwriting_corrections # User corrections for AI learning
partial_credit_grades   # Detailed partial credit breakdowns
exam_focus_events       # Focus tracking for exam simulation mode
```

### Detailed Schema

#### categories
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### documents
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL,        -- pdf, txt, docx, md
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  content_text TEXT,              -- Extracted text content
  processed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

#### questions
```sql
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  document_id TEXT,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice', -- multiple_choice, true_false, written_answer, fill_in_blank
  difficulty TEXT DEFAULT 'medium',              -- easy, medium, hard
  options TEXT,                                   -- JSON array for MC/TF
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  tags TEXT,                                      -- JSON array
  rating INTEGER DEFAULT 0,                       -- 0-5 stars (NEW)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);
```

#### flashcards
```sql
CREATE TABLE flashcards (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  document_id TEXT,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  tags TEXT,                                      -- JSON array
  rating INTEGER DEFAULT 0,                       -- 0-5 stars (NEW)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);
```

#### quiz_sessions
```sql
CREATE TABLE quiz_sessions (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  settings TEXT NOT NULL,          -- JSON: { difficulty, selectionMode, counts }
  questions TEXT NOT NULL,          -- JSON array of question IDs
  answers TEXT,                     -- JSON object: { questionId: answer }
  score INTEGER,
  total_questions INTEGER,
  completed BOOLEAN DEFAULT 0,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

#### flashcard_progress
```sql
CREATE TABLE flashcard_progress (
  id TEXT PRIMARY KEY,
  flashcard_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  confidence_level INTEGER DEFAULT 0,  -- 0-5 (spaced repetition)
  times_reviewed INTEGER DEFAULT 0,
  last_reviewed DATETIME,
  next_review DATETIME,                -- Calculated: datetime('now', '+N days')
  FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

#### sample_questions
```sql
CREATE TABLE sample_questions (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice',
  options TEXT,                         -- JSON array
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  tags TEXT,                            -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

#### user_preferences (NEW)
```sql
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  preference_key TEXT NOT NULL,      -- e.g., "preferred_difficulty", "ai_style"
  preference_value TEXT,             -- JSON or string value
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE(category_id, preference_key)
);
```

#### question_performance (NEW)
```sql
CREATE TABLE question_performance (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  times_answered INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  last_answered DATETIME,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

#### notebook_entries
```sql
CREATE TABLE notebook_entries (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  quiz_session_id TEXT,
  user_answer TEXT,
  correct_answer TEXT NOT NULL,
  notes TEXT,
  reviewed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_session_id) REFERENCES quiz_sessions(id) ON DELETE SET NULL
);
```

#### ai_analysis_results (NEW)
```sql
CREATE TABLE ai_analysis_results (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  analysis_type TEXT NOT NULL,      -- 'sample_questions'
  patterns TEXT,                     -- JSON: language_style, question_structure, etc.
  style_guide TEXT,                  -- JSON: tone, vocabulary_level, formatting_rules
  recommendations TEXT,              -- JSON array of recommendations
  analyzed_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

#### agent_messages
```sql
CREATE TABLE agent_messages (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  from_agent TEXT NOT NULL,          -- 'analysis_agent', 'generation_agent', 'controller_agent'
  to_agent TEXT NOT NULL,
  message_type TEXT NOT NULL,        -- 'analysis_request', 'analysis_complete', 'generation_request'
  payload TEXT,                       -- JSON message content
  status TEXT DEFAULT 'pending',      -- 'pending', 'processed'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

#### handwritten_answers (NEW)
```sql
CREATE TABLE handwritten_answers (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  original_name TEXT,
  recognized_text TEXT,              -- AI-recognized text from handwriting
  confidence_score REAL DEFAULT 0,   -- Recognition confidence (0-1)
  user_corrections TEXT,             -- JSON array of corrections
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
```

#### handwriting_corrections (NEW)
```sql
CREATE TABLE handwriting_corrections (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  original_text TEXT NOT NULL,       -- What AI recognized
  corrected_text TEXT NOT NULL,      -- What user corrected to
  context TEXT,                       -- Additional context for learning
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

#### partial_credit_grades (NEW)
```sql
CREATE TABLE partial_credit_grades (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  total_points REAL DEFAULT 1.0,
  earned_points REAL DEFAULT 0,
  breakdown TEXT,                     -- JSON: [{component, points, earned, correct}]
  feedback TEXT,                      -- AI feedback for partial credit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
```

#### exam_focus_events (NEW)
```sql
CREATE TABLE exam_focus_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,           -- 'focus_lost', 'tab_switch', 'window_blur'
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  details TEXT,                        -- JSON with event details
  FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE
);
```

---

## Backend Services

### 1. aiService.js
**Purpose**: Multi-provider AI client for content generation

**Key Methods**:
```javascript
// Generate quiz questions
generateQuestions(content, options = {
  count: 10,
  difficulty: 'medium',
  questionTypes: ['multiple_choice'],
  sampleQuestions: [],
  customDirections: '',
  aiInsights: null              // NEW: Personalization data
})

// Generate flashcards
generateFlashcards(content, options = {
  count: 10,
  customDirections: ''
})

// Extract key topics
extractKeyTopics(content)

// Health check
healthCheck()
```

**Provider Configuration**:
```javascript
// Environment variables
AI_PROVIDER=nvidia              // Provider name
AI_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1
NVIDIA_API_KEY=your_key
GROQ_API_KEY=your_key
TOGETHER_API_KEY=your_key
OLLAMA_BASE_URL=http://localhost:11434/v1
```

**AI Insights Integration** (NEW):
The AI service now accepts `aiInsights` parameter containing:
- `highlyRated`: Questions rated 4-5 stars (style guidance)
- `poorlyRated`: Questions rated 1-2 stars (patterns to avoid)
- `weakTopics`: Question types/difficulties with low accuracy
- `performance`: Overall stats (accuracy, attempts)
- `preferredTypes`: Question types with highest ratings

### 2. userPreferencesService.js (NEW)
**Purpose**: Track user performance and generate AI personalization insights

**Key Methods**:
```javascript
// Preference Management
setPreference(categoryId, key, value)
getPreference(categoryId, key)
getAllPreferences(categoryId)

// Performance Tracking
recordQuestionAnswer(questionId, categoryId, isCorrect)
getWeakQuestions(categoryId, threshold = 0.5)    // Low accuracy
getStrongQuestions(categoryId, threshold = 0.8)  // High accuracy
getPerformanceStats(categoryId)

// AI Learning
getAIInsights(categoryId)  // Returns comprehensive insights for AI
```

**AI Insights Structure**:
```javascript
{
  highlyRated: [
    { id, question_text, question_type, difficulty, rating, options, explanation }
  ],
  poorlyRated: [
    { id, question_text, question_type, difficulty, rating }
  ],
  weakTopics: [
    { question_type, difficulty, question_count, avg_accuracy }
  ],
  preferredTypes: [
    { question_type, count, avg_rating }
  ],
  preferences: { key: value },
  performance: {
    total_questions_attempted,
    total_answers,
    total_correct,
    avg_accuracy
  }
}
```

### 3. quizService.js
**Purpose**: Quiz session management and question bank operations

**Key Methods**:
```javascript
// Question Bank
addQuestion(questionData)
addBulkQuestions(questions, categoryId, documentId)
getQuestionById(id)
getQuestionsByCategory(categoryId, filters)
updateQuestion(id, data)
deleteQuestion(id)
rateQuestion(id, rating)

// Quiz Sessions
createQuizSession(categoryId, settings)
selectQuestionsForQuiz(categoryId, settings)  // Mixed or custom mode
submitQuizAnswers(sessionId, answers)         // Auto-records performance
getQuizSession(sessionId)
getQuizHistory(categoryId)

// Stats
getQuestionStats(categoryId)  // Returns by_type counts

// Focus Event Tracking (NEW)
recordFocusEvent(sessionId, eventType, details)
getFocusEvents(sessionId)
getFocusEventCount(sessionId, eventType)
getExamIntegrityReport(sessionId)
```

**Quiz Modes** (NEW):
```javascript
static MODES = {
  PRACTICE: 'practice',  // No timer, relaxed learning
  TIMED: 'timed',        // Customizable timer
  EXAM: 'exam'           // Focus tracking, strict simulation
};
```

**Quiz Settings**:
```javascript
{
  mode: 'practice' | 'timed' | 'exam',   // NEW
  difficulty: 'mixed' | 'easy' | 'medium' | 'hard',
  selectionMode: 'mixed' | 'custom',
  // Timer settings (NEW)
  timerType: 'total' | 'per_question',
  totalTimeMinutes: 30,
  perQuestionSeconds: 60,
  // Advanced options (NEW)
  allowPartialCredit: true,
  allowHandwrittenUpload: true,
  // Mixed mode
  totalQuestions: 10,
  // Custom mode
  multipleChoice: 5,
  trueFalse: 3,
  writtenAnswer: 2,
  fillInBlank: 0
}
```

**Exam Integrity Report**:
```javascript
{
  sessionId: "uuid",
  totalViolations: 3,
  focusLostCount: 1,
  tabSwitchCount: 1,
  windowBlurCount: 1,
  events: [...],
  integrityScore: 85  // 100 - (violations * 5)
}
```

### 4. flashcardService.js
**Purpose**: Flashcard management with spaced repetition

**Key Methods**:
```javascript
addFlashcard(flashcardData)
addBulkFlashcards(flashcards, categoryId, documentId)
getFlashcardById(id)
getFlashcardsByCategory(categoryId, options)
updateFlashcard(id, updates)
deleteFlashcard(id)
rateFlashcard(id, rating)        // NEW

// Spaced Repetition
updateProgress(flashcardId, categoryId, confidence)  // 0-5
getFlashcardsForReview(categoryId)  // Due for review
getFlashcardStats(categoryId)
getStudyProgress(categoryId)
```

**Spaced Repetition Algorithm**:
```javascript
// Days until next review = 2^confidence
// confidence 0: 1 day
// confidence 1: 2 days
// confidence 2: 4 days
// confidence 3: 8 days
// confidence 4: 16 days
// confidence 5: 32 days
```

### 5. documentService.js
**Purpose**: Document upload and text extraction

**Key Methods**:
```javascript
saveDocument(categoryId, file, storagePath, contentText)
getDocumentsByCategory(categoryId)
deleteDocument(id)
processDocument(filePath, fileType)        // Extract text
getCombinedContentForCategory(categoryId)  // All docs merged
```

**Supported Formats**:
- PDF: pdf-parse
- DOCX: mammoth
- TXT: direct read
- MD: markdown-it

### 6. sampleQuestionService.js
**Purpose**: Manage user-provided style examples

**Key Methods**:
```javascript
addSampleQuestion(categoryId, questionData)
addBulkSampleQuestions(categoryId, questions)
getSampleQuestionsByCategory(categoryId)
getSampleQuestionsForAI(categoryId)  // Formatted for AI prompt
updateSampleQuestion(id, data)
deleteSampleQuestion(id)
getSampleQuestionCount(categoryId)
```

### 7. storageService.js
**Purpose**: File storage management

**Key Methods**:
```javascript
uploadFile(file, categoryId)  // Returns { path, filename }
```

---

## Multi-Agent AI System

### Overview
The multi-agent system separates AI responsibilities into specialized agents that communicate through a shared database. This architecture improves question generation quality by allowing dedicated pattern analysis.

```
┌─────────────────────────────────────────────────────────────┐
│                    Controller Agent                          │
│  - Coordinates workflow between agents                       │
│  - Manages generation requests                               │
│  - Triggers analysis when needed                             │
│  - Aggregates results                                        │
└───────────────┬───────────────────────────┬─────────────────┘
                │                           │
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│     Analysis Agent        │   │    Generation Agent        │
│  - Analyzes sample Qs     │   │  - Generates questions     │
│  - Detects patterns       │   │  - Uses analysis patterns  │
│  - Creates style guides   │   │  - Applies user insights   │
│  - Stores to database     │   │  - Supports all Q types    │
└───────────────────────────┘   └───────────────────────────┘
                │                           │
                └─────────┬─────────────────┘
                          ▼
              ┌───────────────────────┐
              │  Shared Database       │
              │  - ai_analysis_results │
              │  - agent_messages      │
              └───────────────────────┘
```

### 1. Controller Agent (controllerAgent.js)
**Purpose**: Main coordinator for the multi-agent system

**Responsibilities**:
- Route requests to appropriate agents
- Trigger analysis before generation if needed
- Manage workflow and coordination
- Log all agent activity

**Key Methods**:
```javascript
// Trigger pattern analysis
triggerAnalysis(categoryId)
// Returns: { success, analysis, analyzedCount }

// Generate questions with coordination
generateQuestions(content, options = {
  categoryId,
  count: 10,
  difficulty: 'medium',
  questionType: 'multiple_choice',
  customDirections: '',
  useAnalysis: true,
  useSampleQuestions: true
})
// Auto-triggers analysis if samples exist but no analysis

// Get analysis status
getAnalysisStatus(categoryId)
// Returns: { hasAnalysis, analysis, sampleCount, samplesByType, lastUpdated }

// Get agent activity log
getAgentActivity(categoryId, limit = 20)
// Returns: [{ id, from, to, type, payload, status, createdAt, processedAt }]

// Clear analysis (force re-analysis)
clearAnalysis(categoryId)

// Get system stats
getSystemStats(categoryId)
// Returns: { analysisCount, messageStats, recentActivity }
```

### 2. Analysis Agent (analysisAgent.js)
**Purpose**: Specialized agent for analyzing sample question patterns

**Responsibilities**:
- Analyze sample questions to detect patterns
- Generate style guides for question generation
- Identify language patterns, structure, and format
- Store analysis results in database
- Communicate with generation agent

**Key Methods**:
```javascript
// Analyze sample questions
analyzeSampleQuestions(categoryId, sampleQuestions)
// Returns: { success, analysis, analyzedCount }

// Get stored analysis
getAnalysis(categoryId)
// Returns: { id, categoryId, patterns, styleGuide, recommendations, analyzedCount, updatedAt }

// Store analysis results
storeAnalysis(categoryId, analysis, analyzedCount)

// Send results to generation agent
sendToGenerationAgent(categoryId, analysis)
```

**Analysis Output Structure**:
```javascript
{
  patterns: {
    language_style: "Formal academic tone with technical vocabulary",
    question_structure: "Direct questions with clear stems",
    option_format: "Concise options with parallel structure",
    answer_patterns: "Single correct answer, plausible distractors",
    difficulty_indicators: "Complexity of concepts, specificity required",
    subject_focus: "Chemistry, molecular structures"
  },
  style_guide: {
    tone: "Educational and precise",
    vocabulary_level: "Advanced undergraduate",
    question_length: "Medium (15-30 words)",
    option_count: 4,
    explanation_style: "Concise with key concept reference",
    formatting_rules: [
      "Use scientific notation for formulas",
      "Include units where applicable",
      "Avoid negative phrasing"
    ]
  },
  by_type: {
    multiple_choice: { count: 5, patterns: "...", examples: "..." },
    true_false: { count: 2, patterns: "...", examples: "..." },
    written_answer: { count: 1, patterns: "...", examples: "..." },
    fill_in_blank: { count: 2, patterns: "...", examples: "..." }
  },
  recommendations: [
    "Maintain consistent option length",
    "Include explanations for all answers",
    "Vary difficulty within topics"
  ],
  quality_indicators: {
    strengths: ["Clear question stems", "Good distractor quality"],
    areas_to_improve: ["Add more explanations"]
  }
}
```

### 3. Generation Agent (generationAgent.js)
**Purpose**: Specialized agent for generating questions using analysis patterns

**Responsibilities**:
- Generate questions based on content
- Use style guides from analysis agent
- Apply user preferences and performance insights
- Support all question types (MC, T/F, Written, Fill-in-blank)
- Log generation activity

**Key Methods**:
```javascript
// Generate questions
generateQuestions(content, options = {
  categoryId,
  count: 10,
  difficulty: 'medium',
  questionType: 'multiple_choice',
  customDirections: '',
  aiInsights: null
})
// Returns: [{ question_text, question_type, difficulty, options, correct_answer, explanation, tags }]

// Get analysis from database
getAnalysisFromDB(categoryId)
// Returns: { patterns, styleGuide, recommendations }

// Build insights section for prompt
buildInsightsSection(aiInsights)
// Returns: Formatted string for AI prompt

// Get pending messages from analysis agent
getPendingMessages(categoryId)

// Mark message as processed
markMessageProcessed(messageId)

// Log generation activity
logGeneration(categoryId, questionType, count)
```

### Agent Communication Flow

```
1. User clicks "Generate Questions"
   │
   ▼
2. Controller Agent receives request
   │
   ├── Check if analysis exists
   │   │
   │   ├── No analysis but samples exist?
   │   │   └── Trigger Analysis Agent
   │   │       │
   │   │       └── Analysis Agent analyzes samples
   │   │           │
   │   │           ├── Store results in ai_analysis_results
   │   │           │
   │   │           └── Send message to Generation Agent
   │   │
   │   └── Analysis exists or no samples
   │
   ▼
3. Controller delegates to Generation Agent
   │
   ├── Generation Agent retrieves analysis from DB
   │
   ├── Builds prompt with style guide
   │
   ├── Gets AI insights from user preferences
   │
   └── Generates questions
       │
       ▼
4. Questions returned to Controller
   │
   ▼
5. Controller logs activity and returns to user
```

### API Endpoints for Multi-Agent System

```
POST   /api/categories/:categoryId/analyze-samples    # Trigger analysis
GET    /api/categories/:categoryId/analysis-status    # Get analysis status
DELETE /api/categories/:categoryId/analysis           # Clear analysis
GET    /api/categories/:categoryId/agent-activity     # Get activity log
```

**Trigger Analysis Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "analysis": { "patterns": {...}, "style_guide": {...}, ... },
    "analyzedCount": 10
  }
}
```

**Analysis Status Response**:
```json
{
  "success": true,
  "data": {
    "hasAnalysis": true,
    "analysis": {
      "id": "uuid",
      "categoryId": "uuid",
      "patterns": {...},
      "styleGuide": {...},
      "recommendations": [...],
      "analyzedCount": 10,
      "updatedAt": "2025-01-20T..."
    },
    "sampleCount": 10,
    "samplesByType": {
      "multiple_choice": 5,
      "true_false": 2,
      "written_answer": 1,
      "fill_in_blank": 2
    },
    "lastUpdated": "2025-01-20T..."
  }
}
```

### Frontend Integration

The CategoryDashboard includes an analysis button in the Sample Questions section:

```javascript
// Analysis button states
- Purple (Brain icon): No analysis yet, click to analyze
- Green (CheckCircle icon): Analysis complete, click to re-analyze
- Spinning loader: Analysis in progress

// Analysis status banner
- Shows when analysis is complete
- Displays sample count and last updated date
- Shows detected language style preview

// Question type badges on samples
- Multiple Choice: Blue
- True/False: Purple
- Written Answer: Green
- Fill in Blank: Orange
```

### 4. Handwriting Agent (handwritingAgent.js) (NEW)
**Purpose**: Process handwritten PDF answers and recognize text using AI

**Responsibilities**:
- Process uploaded PDF files
- Extract text/images from PDFs
- Use AI to recognize handwriting
- Store recognized text in database
- Learn from user corrections

**Key Methods**:
```javascript
// Process uploaded handwritten answer
processHandwrittenAnswer(sessionId, questionId, filePath, originalName)
// Returns: { id, sessionId, questionId, recognizedText, confidence }

// Get handwritten answers for a session
getSessionHandwrittenAnswers(sessionId)
// Returns: [{ id, questionId, recognizedText, confidence, ... }]

// Update recognized text with user correction
updateRecognizedText(handwrittenId, correctedText, corrections)

// Learn from a correction
learnCorrection(categoryId, originalText, correctedText, context)
// Stores correction for future AI improvement
```

**Handwriting Recognition Flow**:
```
1. User uploads PDF → multer saves to uploads/handwritten/
2. handwritingAgent.processHandwrittenAnswer() called
3. PDF parsed with pdf-parse
4. AI prompt sent with content + recognition request
5. Recognized text stored in handwritten_answers table
6. During results review, user can correct recognition
7. Corrections stored in handwriting_corrections for learning
```

### 5. Grading Agent (gradingAgent.js) (NEW)
**Purpose**: Provide partial credit grading for complex questions using AI

**Responsibilities**:
- Analyze answer components
- Grade written answers with partial credit
- Handle handwritten answer grading
- Provide detailed feedback
- Store grading breakdown

**Key Methods**:
```javascript
// Grade an answer with partial credit
gradeAnswer(sessionId, questionId, userAnswer, options = {})
// Returns: { questionId, totalPoints, earnedPoints, breakdown, feedback, partialCredit }

// Determine if question needs partial credit
needsPartialCredit(question)
// Returns: true for written_answer, fill_in_blank, or hard difficulty

// Get session grades
getSessionGrades(sessionId)
// Returns: [{ questionId, earnedPoints, totalPoints, breakdown, feedback }]

// Check if answer is semantically correct
isAnswerCorrect(userAnswer, correctAnswer, questionType)
// Returns: boolean (handles variations for T/F, etc.)

// Check mathematical equivalence
checkMathEquivalence(userAnswer, correctAnswer)
// Returns: boolean (handles different formats)
```

**Partial Credit Structure**:
```javascript
{
  questionId: "uuid",
  totalPoints: 1.0,
  earnedPoints: 0.7,
  breakdown: [
    { component: "Key concept A", points: 0.3, earned: 0.3, correct: true },
    { component: "Key concept B", points: 0.3, earned: 0.3, correct: true },
    { component: "Supporting detail", points: 0.2, earned: 0.1, correct: false },
    { component: "Explanation", points: 0.2, earned: 0.0, correct: false }
  ],
  feedback: "Good understanding of main concepts. Missing some supporting details.",
  partialCredit: true
}
```

**Grading Flow**:
```
1. Quiz submitted with partial credit enabled
2. For each question:
   a. Check if needs partial credit (written/fill-in-blank/hard)
   b. If yes: Send to AI for component analysis
   c. AI breaks down into components, grades each
   d. Store breakdown in partial_credit_grades table
3. Results show detailed breakdown with feedback
```

### Benefits of Multi-Agent Architecture

1. **Separation of Concerns**: Each agent has a single responsibility
2. **Reusable Analysis**: Analysis results are cached and reused
3. **Improved Quality**: Style guides ensure consistent question generation
4. **Transparency**: Agent messages provide audit trail
5. **Flexibility**: Easy to add new agents
6. **Scalability**: Agents can be distributed in future
7. **Specialized Processing**: Handwriting and grading agents handle complex tasks

---

## Frontend Components

### Pages

#### 1. Home.jsx
**Purpose**: Landing page with category management

**Features**:
- Create new categories
- View all categories as cards
- Color-coded categories
- Navigate to category dashboard
- Delete categories

#### 2. CategoryDashboard.jsx
**Purpose**: Category overview and content generation hub

**Features**:
- Document upload (PDF, TXT, DOCX, MD)
- AI content generation (unified interface)
- Content type selector: Multiple Choice, True/False, Written Answer, Flashcards
- Difficulty selector (hidden for flashcards)
- Custom AI directions textarea
- Sample question upload
- Quick action cards: Quiz, Flashcards, Question Bank, Notebook
- Document list with delete
- Statistics display

**Content Generation**:
```javascript
const [generateOptions, setGenerateOptions] = useState({
  contentType: 'multiple_choice',  // multiple_choice, true_false, written_answer, fill_in_blank, flashcards
  count: 10,
  difficulty: 'medium',
  customDirections: ''
});
```

#### 3. QuizPage.jsx
**Purpose**: Quiz configuration and history

**Features**:
- **Quiz Mode Selection** (NEW): Practice, Timed, Exam cards with icons
- **Timer Settings** (NEW): Total time or per-question timer (for timed/exam modes)
- **Selection Mode Toggle**: Mixed vs Custom
- **Mixed Mode**: Single total questions input, random from all types
- **Custom Mode**: Individual inputs for each question type (MC, T/F, Written, Fill-in-blank)
- **Difficulty Filter**: Mixed, Easy, Medium, Hard
- **Advanced Options** (NEW): Partial credit toggle, Handwritten upload toggle
- **Exam Mode Warning**: Alert about focus tracking
- **Quiz History**: Recent attempts with scores, percentages, and mode badges

**Settings State**:
```javascript
const [settings, setSettings] = useState({
  mode: 'practice',            // NEW: 'practice', 'timed', 'exam'
  difficulty: 'mixed',
  selectionMode: 'mixed',      // 'mixed' or 'custom'
  multipleChoice: 5,
  trueFalse: 3,
  writtenAnswer: 2,
  fillInBlank: 0,
  totalQuestions: 10,
  // Timer settings (NEW)
  timerType: 'total',          // 'total' or 'per_question'
  totalTimeMinutes: 30,
  perQuestionSeconds: 60,
  // Advanced options (NEW)
  allowPartialCredit: true,
  allowHandwrittenUpload: true
});
```

#### 4. QuizSession.jsx
**Purpose**: Active quiz interface

**Features**:
- Question navigation (prev/next)
- Progress indicator
- Multiple choice: Radio buttons
- True/False: Radio buttons
- Written answer: Textarea with ScientificInput
- Fill-in-blank: Inline answer input
- **Timer Display** (NEW): Color-coded countdown (green > 50%, yellow > 25%, red)
- **Mode Badge** (NEW): Shows current mode (timed/exam)
- **Focus Tracking** (NEW): Detects tab switches, window blur, mouse leave
- **Focus Warning Overlay** (NEW): Red overlay when violation detected
- **Violation Counter** (NEW): Shows focus violation count in exam mode
- **Handwritten Upload** (NEW): PDF upload button for written answers
- **Auto-Submit** (NEW): Submits automatically when time runs out

**State Management**:
```javascript
// Timer state
const [timeRemaining, setTimeRemaining] = useState(null);
const [questionTimeRemaining, setQuestionTimeRemaining] = useState(null);

// Focus tracking for exam mode
const [focusViolations, setFocusViolations] = useState(0);
const [showFocusWarning, setShowFocusWarning] = useState(false);

// Handwritten uploads
const [handwrittenFiles, setHandwrittenFiles] = useState({});
const [uploadingHandwritten, setUploadingHandwritten] = useState(false);
```

**Focus Event Listeners** (Exam Mode):
```javascript
document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('blur', handleWindowBlur);
document.addEventListener('mouseleave', handleMouseLeave);
```

#### 5. QuizResults.jsx
**Purpose**: Quiz results and review

**Features**:
- Score display with percentage (supports decimal points for partial credit)
- Color-coded performance (green >70%, yellow >50%, red <50%)
- **Mode Badge** (NEW): Shows quiz mode with icon
- **Exam Integrity Report** (NEW): Focus violation summary for exam mode
- Question-by-question breakdown
- Correct/incorrect indicators
- **Partial Credit Display** (NEW): Shows point breakdown with component details
- **Handwritten Answer Section** (NEW): Shows recognized text with confidence
- **Correction Interface** (NEW): Edit recognized text, "Save & Learn" button
- Show explanations
- For written answers: Show user answer vs model answer
- Retake quiz button

**Partial Credit UI**:
```javascript
// Shows breakdown for each component
{result.partial_credit.breakdown.map(item => (
  <div>
    {item.correct ? <CheckCircle /> : <XCircle />}
    {item.component}: {item.earned}/{item.points} pts
  </div>
))}
```

**Handwriting Correction Flow**:
```javascript
// User clicks "Correct Recognition"
handleStartCorrection(handwritten) → setEditingHandwritten(id)
// User edits text and clicks "Save & Learn"
handleSaveCorrection(id) → quizEnhancedApi.updateHandwrittenRecognition()
// AI learns from the correction for future recognition
```

#### 6. QuestionBank.jsx (NEW)
**Purpose**: Comprehensive question management

**Features**:
- **View All Questions**: Paginated list
- **Filter by Type**: All, Multiple Choice, True/False, Written Answer
- **Filter by Difficulty**: All, Easy, Medium, Hard
- **Inline Editing**:
  - Edit mode toggle per question
  - Edit question text, type, difficulty, options, correct answer, explanation
  - Save/Cancel buttons
- **Individual Delete**: Delete button per question
- **Bulk Selection**: Checkboxes with "Select All"
- **Bulk Delete**: Delete all selected questions
- **Bulk Difficulty Change**: Change difficulty for all selected
- **Star Rating**: 1-5 stars per question (for AI learning)
- **Question Type Badges**: Color-coded
- **Difficulty Badges**: Color-coded

**UI Components**:
```javascript
const [questions, setQuestions] = useState([]);
const [editingId, setEditingId] = useState(null);
const [editForm, setEditForm] = useState({});
const [selectedQuestions, setSelectedQuestions] = useState(new Set());
const [filter, setFilter] = useState({ type: 'all', difficulty: 'all' });
```

#### 7. FlashcardsPage.jsx
**Purpose**: Flashcard study with spaced repetition

**Features**:
- Card flip animation (front/back)
- Confidence rating (0-5)
- Due for review filtering
- Progress tracking
- Statistics display

#### 8. NotebookPage.jsx
**Purpose**: Wrong answer review

**Features**:
- View incorrect quiz answers
- Add notes
- Mark as reviewed
- Filter by reviewed status

### Components

#### Layout.jsx
**Purpose**: Main application wrapper

**Features**:
- Header with branding
- Navigation
- Content area
- Responsive design

#### CategoryForm.jsx
**Purpose**: Category creation modal

**Features**:
- Name input
- Description textarea
- Color picker (custom palette)
- Validation

#### ScientificInput.jsx (NEW)
**Purpose**: Rich text input component for scientific notation

**Features**:
- **Toggle Format Buttons**: Superscript (x²) and Subscript (H₂O) buttons with visual feedback
- **Auto-Convert `^` to Superscripts**: Type `x^2` → `x²`, `10^-5` → `10⁻⁵`
- **Auto-Convert `/` to Fractions**: Type `3/4` → `³⁄₄` (numerator as superscript, denominator as subscript)
- **Format Mode**: Toggle buttons activate persistent formatting for continuous typing
- **Selection Conversion**: Select text and click format button to convert
- **Arrows**: → ← ↑ ↓ ↔ ⇌ ⇒ ⇐ (8 symbols)
- **Greek Letters**: α β γ δ ε θ λ μ π σ τ φ Δ Σ Ω (15 symbols)
- **Extended Character Support**:
  - Superscript: ⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ and letters ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ
  - Subscript: ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ and letters ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ
- **Help Text**: Inline tips showing keyboard shortcuts and examples
- **Use Cases**: Chemistry formulas (H₂SO₄), math expressions (x²+y²=r²), physics equations (E=mc²), fractions (³⁄₄)

**Usage**:
```javascript
<ScientificInput
  value={answer}
  onChange={setAnswer}
  placeholder="Enter your answer..."
/>
```

---

## API Reference

### Categories

```
GET    /api/categories                  # List all categories
POST   /api/categories                  # Create category
GET    /api/categories/:id              # Get category by ID
PUT    /api/categories/:id              # Update category
DELETE /api/categories/:id              # Delete category
```

### Documents

```
GET    /api/categories/:categoryId/documents              # List documents
POST   /api/categories/:categoryId/documents              # Upload document (multipart/form-data)
DELETE /api/documents/:id                                 # Delete document
POST   /api/categories/:categoryId/generate-questions     # Generate questions from docs
POST   /api/categories/:categoryId/generate-flashcards    # Generate flashcards from docs
```

**Generate Questions Body**:
```json
{
  "count": 10,
  "difficulty": "medium",
  "questionType": "multiple_choice",
  "customDirections": "Optional custom instructions"
}
```

### Questions

```
GET    /api/categories/:categoryId/questions              # List questions
POST   /api/categories/:categoryId/questions              # Add question
GET    /api/categories/:categoryId/questions/stats        # Question stats
PUT    /api/questions/:id                                 # Update question (NEW)
DELETE /api/questions/:id                                 # Delete question
POST   /api/questions/:id/rate                            # Rate question (NEW)
```

**Update Question Body**:
```json
{
  "question_text": "Updated question?",
  "question_type": "multiple_choice",
  "difficulty": "hard",
  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
  "correct_answer": "A",
  "explanation": "Explanation here"
}
```

**Rate Question Body**:
```json
{
  "rating": 5  // 1-5 stars
}
```

### Quiz Sessions

```
POST   /api/categories/:categoryId/quiz                   # Create quiz session
POST   /api/quiz/:sessionId/submit                        # Submit quiz answers
GET    /api/quiz/:sessionId                               # Get quiz session
GET    /api/categories/:categoryId/quiz/history           # Quiz history

# Enhanced Quiz Features (NEW)
POST   /api/quiz/:sessionId/focus-event                   # Record focus violation
GET    /api/quiz/:sessionId/focus-events                  # Get focus events
GET    /api/quiz/:sessionId/integrity-report              # Get exam integrity report
POST   /api/quiz/:sessionId/question/:questionId/handwritten  # Upload handwritten PDF
GET    /api/quiz/:sessionId/handwritten-answers           # Get handwritten answers
PUT    /api/handwritten/:handwrittenId/correction         # Update recognition
POST   /api/quiz/:sessionId/question/:questionId/grade    # Grade with partial credit
GET    /api/quiz/:sessionId/partial-grades                # Get partial credit grades
POST   /api/quiz/:sessionId/submit-graded                 # Submit with grading
```

**Create Quiz Body**:
```json
{
  "difficulty": "mixed",
  "selectionMode": "custom",
  "multipleChoice": 5,
  "trueFalse": 3,
  "writtenAnswer": 2
}
```

**Submit Answers Body**:
```json
{
  "answers": {
    "question-id-1": "A",
    "question-id-2": "B",
    "question-id-3": "User's written answer..."
  }
}
```

### Flashcards

```
GET    /api/categories/:categoryId/flashcards             # List flashcards
POST   /api/categories/:categoryId/flashcards             # Create flashcard
GET    /api/categories/:categoryId/flashcards/review      # Get due flashcards
GET    /api/categories/:categoryId/flashcards/stats       # Flashcard stats
GET    /api/flashcards/:id                                # Get flashcard
PUT    /api/flashcards/:id                                # Update flashcard
DELETE /api/flashcards/:id                                # Delete flashcard
POST   /api/flashcards/:id/rate                           # Rate flashcard (NEW)
POST   /api/flashcards/:id/progress                       # Update progress
```

**Rate Flashcard Body**:
```json
{
  "rating": 4  // 1-5 stars
}
```

**Update Progress Body**:
```json
{
  "confidence": 3,      // 0-5 (affects next review date)
  "categoryId": "uuid"
}
```

### Sample Questions

```
GET    /api/categories/:categoryId/sample-questions       # List samples
POST   /api/categories/:categoryId/sample-questions       # Create sample
POST   /api/categories/:categoryId/sample-questions/bulk  # Bulk create
POST   /api/categories/:categoryId/sample-questions/upload # Upload JSON file
GET    /api/categories/:categoryId/sample-questions/count # Count samples
GET    /api/sample-questions/:id                          # Get sample
PUT    /api/sample-questions/:id                          # Update sample
DELETE /api/sample-questions/:id                          # Delete sample
```

### Notebook

```
GET    /api/categories/:categoryId/notebook               # List entries
GET    /api/notebook/:id                                  # Get entry
PUT    /api/notebook/:id                                  # Update entry (notes, reviewed)
DELETE /api/notebook/:id                                  # Delete entry
```

---

## AI Integration

### Prompt Engineering

#### Question Generation Prompt Structure
```
Based on the following content, generate ${count} quiz questions.

Requirements:
- Difficulty level: ${difficulty}
- Question type: ${questionType}
- Type-specific instructions...
- Each question should test different concepts
- Provide clear, unambiguous questions

[SAMPLE QUESTIONS SECTION - if provided]
IMPORTANT - Style Guide from Sample Questions:
Analyze characteristics and match:
- Question phrasing style and tone
- Option format and length
- Level of detail in explanations
...

[CUSTOM DIRECTIONS SECTION - if provided]
CUSTOM INSTRUCTIONS FROM USER:
${customDirections}
Follow these carefully...

[AI INSIGHTS SECTION - NEW - if available]
PERSONALIZATION INSIGHTS:

USER-PREFERRED QUESTION STYLE (Based on 4-5 star ratings):
- Highly rated examples...

AVOID THESE PATTERNS (Based on 1-2 star ratings):
- Poorly rated patterns...

USER'S WEAK AREAS (Need more practice):
- Question types with low accuracy...

USER PERFORMANCE OVERVIEW:
- Overall accuracy: ${accuracy}%
- Adaptive suggestions based on performance...

Content:
${content}

Return JSON format:
{
  "questions": [{ question_text, question_type, difficulty, options, correct_answer, explanation, tags }]
}
```

### AI Personalization Flow

```
User Rates Question (1-5 stars)
        ↓
Rating Stored in Database
        ↓
Quiz Answer Submitted
        ↓
Performance Tracked (correct/incorrect, times_answered, accuracy)
        ↓
Next Content Generation Request
        ↓
userPreferencesService.getAIInsights(categoryId)
        ↓
AI Service Receives:
  - Highly rated questions (style examples)
  - Poorly rated questions (patterns to avoid)
  - Weak topics (focus areas)
  - Performance stats (difficulty adjustment)
        ↓
AI Generates Personalized Content
```

### Provider-Specific Configuration

#### NVIDIA Nemotron (Default)
```bash
AI_PROVIDER=nvidia
AI_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1
NVIDIA_API_KEY=your_key
```

#### Groq (Recommended for Production)
```bash
AI_PROVIDER=groq
AI_MODEL=mixtral-8x7b-32768
GROQ_API_KEY=your_key
```

#### Together.ai
```bash
AI_PROVIDER=together
AI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
TOGETHER_API_KEY=your_key
```

#### Ollama (Local)
```bash
AI_PROVIDER=ollama
AI_MODEL=mistral
OLLAMA_BASE_URL=http://localhost:11434/v1
```

---

## Personalization System

### Overview
The personalization system tracks user behavior and adapts AI-generated content over time.

### Components

#### 1. Rating System
- Users rate questions/flashcards 1-5 stars
- Ratings stored in `questions.rating` and `flashcards.rating` columns
- AI learns from highly-rated (4-5) and poorly-rated (1-2) content

#### 2. Performance Tracking
- Every quiz answer recorded in `question_performance` table
- Tracks: `times_answered`, `times_correct`, `last_answered`
- Calculates accuracy per question: `times_correct / times_answered`

#### 3. Strength/Weakness Detection
- **Strong Questions**: Accuracy ≥ 80% with ≥2 attempts
- **Weak Questions**: Accuracy < 50% with ≥2 attempts
- **Weak Topics**: Question types/difficulties with avg accuracy < 60%

#### 4. AI Insights Generation
```javascript
const insights = userPreferencesService.getAIInsights(categoryId);
// Returns comprehensive data for AI personalization
```

#### 5. Adaptive Content Generation
AI adjusts based on:
- **Style**: Mimics highly-rated questions
- **Avoidance**: Skips poorly-rated patterns
- **Focus**: Emphasizes weak topic areas
- **Difficulty**:
  - <70% accuracy → Easier questions + foundational concepts
  - 70-85% accuracy → Balanced difficulty
  - >85% accuracy → More challenging questions

### Performance Metrics

#### Category-Level Stats
```javascript
{
  total_questions_attempted: 50,
  total_answers: 250,           // Sum of all times_answered
  total_correct: 180,           // Sum of all times_correct
  avg_accuracy: 0.72            // 72%
}
```

#### Question-Level Stats
```javascript
{
  question_id: "uuid",
  times_answered: 5,
  times_correct: 3,
  accuracy: 0.60                // 60%
}
```

### User Preferences Storage
Flexible key-value storage for future enhancements:
```javascript
userPreferencesService.setPreference(categoryId, 'preferred_question_type', 'multiple_choice');
userPreferencesService.setPreference(categoryId, 'study_schedule', JSON.stringify({ frequency: 'daily', time: '19:00' }));
```

---

## Development Setup

### Option 1: Docker (Recommended)

**Prerequisites**:
- Docker Desktop installed
- API key for AI provider (NVIDIA, Groq, etc.)

**Quick Start**:
```bash
cd quiz-flashcard-app

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# At minimum, set one AI provider key (e.g., OPENAI_API_KEY or GROQ_API_KEY)

# Start all services
docker-compose up

# Access the application:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs (auto-generated!)
# - Database: localhost:5432

# Stop all services
docker-compose down
```

**Docker Architecture**:
```
┌─────────────────────────────────────────────────────┐
│              docker-compose.yml                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────┐    ┌──────────────────┐       │
│  │   backend        │    │   postgres       │       │
│  │   (FastAPI)      │◄──►│   (Database)     │       │
│  │   Python 3.11    │    │   PostgreSQL 15  │       │
│  │   Port 8000      │    │   Port 5432      │       │
│  └──────────────────┘    └──────────────────┘       │
│           ▲                                          │
│           │ API calls                                │
│  ┌────────┴─────────┐    ┌──────────────────┐       │
│  │   frontend       │    │   volumes        │       │
│  │   (React/Vite)   │    │   ./uploads      │       │
│  │   Port 5173      │    │   postgres_data  │       │
│  └──────────────────┘    └──────────────────┘       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Useful Docker Commands**:
```bash
# Rebuild after code changes
docker-compose up --build

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Run backend tests
docker-compose exec backend pytest

# Access PostgreSQL CLI
docker-compose exec postgres psql -U scholarly -d scholarly

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up
```

### Option 2: Manual Setup (Legacy Node.js Backend)

> Note: The Node.js backend is being migrated to Python. Use Docker for new development.

**Prerequisites**:
- Node.js 18+ and npm
- Text editor (VS Code recommended)
- API key for AI provider (NVIDIA, Groq, etc.)

**Backend Setup**:
```bash
cd quiz-flashcard-app/backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=5000
NODE_ENV=development
AI_PROVIDER=nvidia
NVIDIA_API_KEY=your_nvidia_api_key_here
AI_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1
AI_MAX_RETRIES=3
AI_RETRY_DELAY=1000
EOF

# Start development server
npm run dev
```

**Frontend Setup**:
```bash
cd quiz-flashcard-app/frontend

# Install dependencies
npm install

# Create .env file (optional)
cat > .env << EOF
VITE_API_URL=http://localhost:5000/api
EOF

# Start development server
npm run dev
```

### Testing the Setup
1. Open http://localhost:5173 in browser
2. Create a test category
3. Upload a sample document (PDF/TXT)
4. Generate questions
5. Take a quiz
6. Check Question Bank

---

## Deployment

### Environment Variables (Production)

#### Backend
```bash
PORT=5000
NODE_ENV=production
AI_PROVIDER=groq                  # Recommended for production
GROQ_API_KEY=your_groq_key
AI_MODEL=mixtral-8x7b-32768
AI_MAX_RETRIES=5
AI_RETRY_DELAY=2000
```

#### Frontend
```bash
VITE_API_URL=https://your-backend-domain.com/api
```

### Deployment Options

#### Option 1: Vercel (Recommended)
**Frontend**:
```bash
cd frontend
npm install -g vercel
vercel
```

**Backend**:
```bash
cd backend
vercel
# Add environment variables in Vercel dashboard
```

#### Option 2: Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Backend
cd backend
railway login
railway init
railway up

# Frontend
cd frontend
railway init
railway up
```

#### Option 3: Docker

**Backend Dockerfile**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

**Frontend Dockerfile**:
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - AI_PROVIDER=groq
      - GROQ_API_KEY=${GROQ_API_KEY}
    volumes:
      - ./backend/data:/app/data
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use production AI provider (Groq recommended)
- [ ] Configure CORS for production domain
- [ ] Set up persistent storage for database and uploads
- [ ] Enable HTTPS
- [ ] Set up monitoring (e.g., Sentry)
- [ ] Configure rate limiting
- [ ] Set up backups for SQLite database
- [ ] Add logging (e.g., Winston)
- [ ] Configure CDN for static assets (optional)

---

## Key Features Implementation Details

### 1. Question Bank Bulk Operations
**Location**: `frontend/src/pages/QuestionBank.jsx`

**State Management**:
```javascript
const [selectedQuestions, setSelectedQuestions] = useState(new Set());

// Select/deselect question
const handleSelectQuestion = (questionId) => {
  setSelectedQuestions(prev => {
    const newSet = new Set(prev);
    if (newSet.has(questionId)) {
      newSet.delete(questionId);
    } else {
      newSet.add(questionId);
    }
    return newSet;
  });
};

// Select all
const handleSelectAll = () => {
  if (selectedQuestions.size === filteredQuestions.length) {
    setSelectedQuestions(new Set());
  } else {
    setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)));
  }
};
```

**Bulk Delete**:
```javascript
const handleBulkDelete = async () => {
  if (selectedQuestions.size === 0) return;
  if (window.confirm(`Delete ${selectedQuestions.size} selected questions?`)) {
    await Promise.all(
      Array.from(selectedQuestions).map(id => quizApi.deleteQuestion(id))
    );
    setSelectedQuestions(new Set());
    loadData();
  }
};
```

### 2. Multi-Type Quiz Selection
**Location**: `backend/src/services/quizService.js`

**Mixed Mode** (Random from all types):
```javascript
if (selectionMode === 'mixed') {
  let query = 'SELECT * FROM questions WHERE category_id = ?';
  const params = [categoryId];

  if (difficulty && difficulty !== 'mixed') {
    query += ' AND difficulty = ?';
    params.push(difficulty);
  }

  query += ' ORDER BY RANDOM() LIMIT ?';
  params.push(totalQuestions);

  selectedQuestions = stmt.all(...params);
}
```

**Custom Mode** (Specific counts per type):
```javascript
if (selectionMode === 'custom') {
  if (multipleChoice > 0) {
    selectedQuestions.push(...getQuestionsByTypeAndCount(
      categoryId, 'multiple_choice', multipleChoice, difficulty
    ));
  }
  if (trueFalse > 0) {
    selectedQuestions.push(...getQuestionsByTypeAndCount(
      categoryId, 'true_false', trueFalse, difficulty
    ));
  }
  if (writtenAnswer > 0) {
    selectedQuestions.push(...getQuestionsByTypeAndCount(
      categoryId, 'written_answer', writtenAnswer, difficulty
    ));
  }
  selectedQuestions = shuffleArray(selectedQuestions);
}
```

### 3. Spaced Repetition Algorithm
**Location**: `backend/src/services/flashcardService.js`

```javascript
updateProgress(flashcardId, categoryId, confidence) {
  // confidence: 0-5
  // Days until next review = 2^confidence
  const daysUntilNext = Math.pow(2, confidence);

  if (existing) {
    const stmt = db.prepare(`
      UPDATE flashcard_progress
      SET confidence_level = ?,
          times_reviewed = times_reviewed + 1,
          last_reviewed = CURRENT_TIMESTAMP,
          next_review = datetime('now', '+' || ? || ' days')
      WHERE flashcard_id = ?
    `);
    stmt.run(confidence, daysUntilNext, flashcardId);
  } else {
    // Insert new progress record
    stmt.run(id, flashcardId, categoryId, confidence, daysUntilNext);
  }
}
```

**Review Selection**:
```sql
SELECT f.*, fp.confidence_level, fp.times_reviewed, fp.last_reviewed
FROM flashcards f
LEFT JOIN flashcard_progress fp ON f.id = fp.flashcard_id
WHERE f.category_id = ?
  AND (fp.next_review IS NULL OR fp.next_review <= datetime('now'))
ORDER BY fp.confidence_level ASC NULLS FIRST, RANDOM()
```

### 4. Performance Tracking
**Location**: `backend/src/services/quizService.js:submitQuizAnswers`

```javascript
for (const questionId of questionIds) {
  const question = this.getQuestionById(questionId);
  const userAnswer = safeAnswers[questionId] || '';
  const isCorrect = userAnswer === question.correct_answer;

  // Record performance for AI learning
  userPreferencesService.recordQuestionAnswer(
    questionId,
    session.category_id,
    isCorrect
  );

  results.push({
    question_id: questionId,
    is_correct: isCorrect,
    // ...
  });
}
```

### 5. AI Style Learning from Samples
**Location**: `backend/src/services/aiService.js`

```javascript
if (sampleQuestions.length > 0) {
  sampleSection = `
IMPORTANT - Style Guide from Sample Questions:
Analyze their characteristics carefully and match:
- Question phrasing style and tone
- Option format and length
- Level of detail in explanations

Sample Questions to Learn From:
${sampleQuestions.map((sq, i) => `
Example ${i + 1}:
Question: ${sq.question_text}
Type: ${sq.question_type}
Options: ${JSON.stringify(sq.options)}
Correct Answer: ${sq.correct_answer}
Explanation: ${sq.explanation || 'N/A'}
`).join('\n')}

Generate new questions that match this style while covering different concepts.
`;
}
```

---

## Troubleshooting

### Common Issues

#### 1. Frontend-Backend API Mismatch (v5.3.0 Fixes)
**Symptom**: Various errors like "Cannot read properties of undefined reading 'length'" or 400 errors
**Root Cause**: Data structure mismatch between frontend expectations and backend responses
**Solutions**:
- Use response unwrapping: `const data = response.data.data || response.data;`
- Handle field naming: `data.snake_case || data.camelCase || defaultValue`
- Check route paths match exactly between frontend and backend
- See "API Contract Validation Guidelines" section for detailed patterns

#### 2. Database Connection Errors
**Symptom**: "Cannot read property 'prepare' of null"
**Solution**: Ensure database is initialized before use
```javascript
// In server.js
const { initializeDatabase } = require('./config/database');
await initializeDatabase();
```

#### 2. AI Generation Fails
**Symptom**: "Failed to generate questions: 404 status code"
**Solutions**:
- Check AI_PROVIDER and AI_MODEL in .env
- Verify API key is valid
- Check provider endpoint availability
- Review error logs for specific provider issues

#### 3. File Upload Errors
**Symptom**: "No file uploaded" or "ENOENT: no such file or directory"
**Solutions**:
- Ensure uploads directory exists: `mkdir -p backend/uploads`
- Check file size limits in multer config
- Verify multipart/form-data content type

#### 4. Quiz Session Not Found
**Symptom**: "Quiz session not found"
**Solutions**:
- Database may have been reset
- Check session ID in URL
- Ensure database persists between restarts

#### 5. Performance Tracking Not Working
**Symptom**: AI insights empty despite taking quizzes
**Solutions**:
- Ensure migrations ran successfully (rating columns added)
- Check that submitQuizAnswers calls recordQuestionAnswer
- Verify question_performance table exists

---

## Future Enhancements

### Planned Features
1. **User Authentication**: Multi-user support with JWT
2. **Collaborative Learning**: Share categories and questions
3. **Advanced Analytics**:
   - Learning curves
   - Time spent per question
   - Retention rates
4. **Export/Import**: JSON/CSV export of questions and results
5. **Mobile App**: React Native version
6. **Gamification**:
   - Achievements
   - Streaks
   - Leaderboards
7. **Advanced AI Features**:
   - Automatic difficulty adjustment
   - Learning path recommendations
   - Concept gap detection
8. **Rich Text Editor**: Format questions with images/code
9. **Voice Mode**: Audio questions and answers
10. **Offline Mode**: PWA with service worker

### Technical Debt
- [ ] Add comprehensive unit tests (Jest)
- [ ] Add integration tests (Supertest)
- [ ] Implement proper error boundaries in React
- [ ] Add TypeScript for type safety
- [ ] Optimize database queries with indexes
- [ ] Implement caching layer (Redis)
- [ ] Add request validation with Joi/Zod
- [ ] Set up CI/CD pipeline
- [ ] Add API documentation with Swagger
- [ ] Implement rate limiting per user

---

## Contributing

### Code Style
- **Backend**: Standard JavaScript, async/await
- **Frontend**: React functional components with hooks
- **Naming**: camelCase for variables, PascalCase for components
- **Comments**: JSDoc for functions, inline for complex logic

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add your feature description"

# Push and create PR
git push origin feature/your-feature-name
```

### Testing Checklist
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test mobile responsiveness
- [ ] Test with empty states (no docs, no questions)
- [ ] Test error handling (invalid files, AI failures)
- [ ] Test bulk operations with 10+ items
- [ ] Test different question types in quiz
- [ ] Verify rating system updates AI behavior
- [ ] Check performance with large datasets

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues, questions, or contributions:
- GitHub Issues: [Project Repository]
- Email: support@scholarly.example.com
- Documentation: This file

---

## Migration Status

**Current Status**: Migrating from Node.js/SQLite to Python/PostgreSQL

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Docker + PostgreSQL setup |
| Phase 1.1 | ✅ Complete | Frontend port fix (5173 → 3000) |
| Phase 2 | ✅ Complete | Python backend structure (FastAPI) |
| Phase 3.1 | ✅ Complete | Categories API (CRUD with stats) |
| Phase 3.2 | ✅ Complete | Documents API (upload, process, delete) |
| Phase 3.3 | ✅ Complete | All 16 database models created |
| Phase 3.4 | ✅ Complete | Flashcards API with spaced repetition |
| Phase 3.5 | ✅ Complete | Questions/Quiz API (sessions, focus events) |
| Phase 3.6 | ✅ Complete | Notebook API (wrong answer tracking) |
| Phase 3.7 | ✅ Complete | Sample Questions API (file upload) |
| Phase 3.8 | ✅ Complete | AI Service (NVIDIA + OpenAI vision) |
| Phase 4 | ✅ Complete | Database schema migration (Alembic) |
| Phase 5 | ✅ Complete | Frontend-backend integration (API URL + endpoint fixes) |
| Phase 5.1 | ✅ Complete | AI Multi-Agent System Migration |
| Phase 6 | ⏳ Pending | Authentication & Privacy (RLS) |

**New Stack**:
- Backend: Python 3.11 + FastAPI (replacing Node.js + Express)
- Database: PostgreSQL 15 (replacing SQLite)
- Dev Environment: Docker Compose
- Monitoring: Sentry.io integration
- Privacy: PostgreSQL Row-Level Security

**AI Model Configuration**:
- Primary (Controller, Analysis, Generation, Grading): NVIDIA `llama-3.1-nemotron-nano-4b-v1.1`
- Vision (Handwriting Recognition): OpenAI `gpt-4o`

**Current Docker Services**:
| Service | Port | Status |
|---------|------|--------|
| PostgreSQL | 5432 | ✅ Running |
| FastAPI Backend | 8000 | ✅ Running (Categories + Documents API) |
| React Frontend | 3000 | ✅ Running |

**Python Backend Structure** (Phase 4 Complete):
```
backend-python/
├── main.py                    # FastAPI app entry point
├── entrypoint.sh             # Docker entrypoint (runs migrations)
├── alembic.ini               # Alembic configuration
├── alembic/
│   ├── env.py                # Migration environment
│   ├── script.py.mako        # Migration template
│   └── versions/             # Migration scripts
│       └── 001_initial_schema.py  # All 16 tables
├── config/
│   ├── settings.py           # Pydantic settings (env vars)
│   └── database.py           # SQLAlchemy async engine
├── models/                    # 16 SQLAlchemy models
│   ├── category.py           # ✅ Categories
│   ├── document.py           # ✅ Documents
│   ├── question.py           # ✅ Questions
│   ├── flashcard.py          # ✅ Flashcards
│   ├── quiz_session.py       # ✅ Quiz sessions
│   ├── notebook_entry.py     # ✅ Wrong answer tracking
│   ├── flashcard_progress.py # ✅ Spaced repetition
│   ├── sample_question.py    # ✅ AI learning samples
│   ├── ai_analysis.py        # ✅ AI analysis + agent messages
│   ├── user_preferences.py   # ✅ Preferences + performance
│   ├── handwriting.py        # ✅ Handwritten answers + corrections
│   └── grading.py            # ✅ Partial credit + focus events
├── schemas/
│   ├── category.py           # ✅ Category schemas
│   ├── document.py           # ✅ Document schemas
│   ├── flashcard.py          # ✅ Flashcard schemas
│   ├── question.py           # ✅ Question schemas
│   ├── quiz.py               # ✅ Quiz session schemas
│   ├── notebook.py           # ✅ Notebook schemas
│   └── sample_question.py    # ✅ Sample question schemas
├── routers/
│   ├── health.py             # ✅ Health check
│   ├── categories.py         # ✅ Categories CRUD
│   ├── documents.py          # ✅ Documents upload/delete
│   ├── flashcards.py         # ✅ Flashcards + spaced repetition
│   ├── quiz.py               # ✅ Questions + quiz sessions
│   ├── notebook.py           # ✅ Wrong answer tracking
│   ├── sample_questions.py   # ✅ Sample questions + file upload
│   └── ai.py                 # ✅ AI endpoints (analysis, generation, grading, handwriting)
├── services/
│   ├── ai_service.py         # ✅ Multi-provider AI (NVIDIA + OpenAI)
│   ├── category_service.py   # ✅ Category business logic
│   ├── document_service.py   # ✅ Document processing
│   ├── flashcard_service.py  # ✅ Flashcard + spaced repetition
│   ├── quiz_service.py       # ✅ Quiz session + focus events
│   ├── notebook_service.py   # ✅ Notebook tracking
│   └── sample_question_service.py # ✅ Sample question management
└── agents/
    ├── __init__.py           # ✅ Agent exports
    ├── base_agent.py         # ✅ Base class for agents
    ├── controller_agent.py   # ✅ Orchestrates multi-agent system
    ├── analysis_agent.py     # ✅ Analyzes sample questions for patterns
    ├── generation_agent.py   # ✅ Generates questions and flashcards
    ├── grading_agent.py      # ✅ Grades answers with partial credit
    └── handwriting_agent.py  # ✅ Recognizes handwritten answers (OpenAI Vision)
```

**Implemented API Endpoints**:
| Method | Endpoint | Status |
|--------|----------|--------|
| **Categories** | | |
| GET | `/api/categories` | ✅ Working |
| GET | `/api/categories/{id}` | ✅ Working |
| POST | `/api/categories` | ✅ Working |
| PUT | `/api/categories/{id}` | ✅ Working |
| DELETE | `/api/categories/{id}` | ✅ Working |
| **Documents** | | |
| GET | `/api/categories/{id}/documents` | ✅ Working |
| POST | `/api/categories/{id}/documents` | ✅ Working |
| DELETE | `/api/documents/{id}` | ✅ Working |
| POST | `/api/categories/{id}/generate-questions` | ⏳ Stub |
| POST | `/api/categories/{id}/generate-flashcards` | ⏳ Stub |
| **Flashcards** | | |
| GET | `/api/categories/{id}/flashcards` | ✅ Working |
| POST | `/api/categories/{id}/flashcards` | ✅ Working |
| POST | `/api/categories/{id}/flashcards/bulk` | ✅ Working |
| GET | `/api/categories/{id}/flashcards/review` | ✅ Working |
| GET | `/api/categories/{id}/flashcards/stats` | ✅ Working |
| GET | `/api/flashcards/{id}` | ✅ Working |
| PUT | `/api/flashcards/{id}` | ✅ Working |
| DELETE | `/api/flashcards/{id}` | ✅ Working |
| POST | `/api/flashcards/{id}/rate` | ✅ Working |
| POST | `/api/categories/{id}/flashcards/{id}/progress` | ✅ Working |
| **Questions** | | |
| GET | `/api/categories/{id}/questions` | ✅ Working |
| POST | `/api/categories/{id}/questions` | ✅ Working |
| POST | `/api/categories/{id}/questions/bulk` | ✅ Working |
| GET | `/api/categories/{id}/questions/stats` | ✅ Working |
| GET | `/api/questions/{id}` | ✅ Working |
| PUT | `/api/questions/{id}` | ✅ Working |
| DELETE | `/api/questions/{id}` | ✅ Working |
| POST | `/api/questions/{id}/rate` | ✅ Working |
| **Quiz Sessions** | | |
| POST | `/api/categories/{id}/quiz` | ✅ Working |
| GET | `/api/quiz/{id}` | ✅ Working |
| POST | `/api/quiz/{id}/submit` | ✅ Working |
| GET | `/api/categories/{id}/quiz/history` | ✅ Working |
| POST | `/api/quiz/{id}/focus-event` | ✅ Working |
| GET | `/api/quiz/{id}/focus-events` | ✅ Working |
| GET | `/api/quiz/{id}/integrity-report` | ✅ Working |
| **Notebook** | | |
| GET | `/api/categories/{id}/notebook` | ✅ Working |
| POST | `/api/categories/{id}/notebook` | ✅ Working |
| GET | `/api/notebook/{id}` | ✅ Working |
| PUT | `/api/notebook/{id}` | ✅ Working |
| DELETE | `/api/notebook/{id}` | ✅ Working |
| POST | `/api/notebook/{id}/reviewed` | ✅ Working |
| GET | `/api/categories/{id}/notebook/stats` | ✅ Working |
| GET | `/api/categories/{id}/notebook/most-missed` | ✅ Working |
| DELETE | `/api/categories/{id}/notebook/clear` | ✅ Working |
| **Sample Questions** | | |
| GET | `/api/categories/{id}/sample-questions` | ✅ Working |
| POST | `/api/categories/{id}/sample-questions` | ✅ Working |
| POST | `/api/categories/{id}/sample-questions/bulk` | ✅ Working |
| POST | `/api/categories/{id}/sample-questions/upload` | ✅ Working |
| GET | `/api/categories/{id}/sample-questions/count` | ✅ Working |
| GET | `/api/sample-questions/{id}` | ✅ Working |
| PUT | `/api/sample-questions/{id}` | ✅ Working |
| DELETE | `/api/sample-questions/{id}` | ✅ Working |
| **AI - Analysis** | | |
| POST | `/api/categories/{id}/analyze-samples` | ✅ Working |
| GET | `/api/categories/{id}/analysis-status` | ✅ Working |
| DELETE | `/api/categories/{id}/analysis` | ✅ Working |
| GET | `/api/categories/{id}/agent-activity` | ✅ Working |
| GET | `/api/categories/{id}/ai-stats` | ✅ Working |
| **AI - Generation** | | |
| POST | `/api/categories/{id}/generate-questions` | ✅ Working |
| POST | `/api/categories/{id}/generate-flashcards` | ✅ Working |
| **AI - Grading** | | |
| POST | `/api/quiz/{id}/question/{qid}/grade` | ✅ Working |
| GET | `/api/quiz/{id}/partial-grades` | ✅ Working |
| **AI - Handwriting** | | |
| POST | `/api/quiz/{id}/question/{qid}/handwritten` | ✅ Working |
| GET | `/api/quiz/{id}/handwritten-answers` | ✅ Working |
| PUT | `/api/handwritten/{id}/correction` | ✅ Working |
| GET | `/api/handwritten/{id}` | ✅ Working |

**Known Limitations** (current):
- None - all core features are implemented

**Alembic Migration Commands**:
```bash
# Run migrations (done automatically on Docker startup)
docker-compose exec backend alembic upgrade head

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Show migration history
docker-compose exec backend alembic history

# Rollback one migration
docker-compose exec backend alembic downgrade -1
```

---

**Last Updated**: 2025-11-25
**Version**: 5.3.0 (API Contract Validation + Bug Fixes)

---

## API Contract Validation Guidelines

### CRITICAL: Frontend-Backend Data Structure Alignment

When making changes to API endpoints (backend) or API calls (frontend), ALWAYS verify that the data structures match between frontend expectations and backend responses.

**See**: `.claude/skills/api-contract-validation.md` for detailed guidelines

### Common Issues Fixed (v5.3.0)

#### 1. Response Wrapper Mismatch
**Problem**: Frontend expected `response.data.data.field` but backend returns `{ field: value }` directly.

**Solution** (implemented in `frontend/src/services/api.js`):
```javascript
// Response interceptor normalizes format
api.interceptors.response.use(
  (response) => {
    if (response.data && !response.data.data && typeof response.data === 'object') {
      const needsWrapping = !Array.isArray(response.data) &&
        (response.data.categories !== undefined || ...);
      if (needsWrapping) {
        response.data = { data: response.data };
      }
    }
    return response;
  }
);
```

#### 2. Field Naming Convention Mismatch
**Problem**: Backend uses `snake_case` (Python), frontend expects `camelCase` (JavaScript).

**Solution**: Use fallback patterns in frontend components:
```javascript
// Handle both naming conventions
const score = data.integrity_score || data.integrityScore || 0;
const count = data.total_violations || data.totalViolations || 0;
const reviewed = stats?.reviewed_cards || stats?.reviewed || 0;
```

#### 3. Error Format Normalization
**Problem**: FastAPI returns `{ detail: "error" }`, frontend expects `{ error: "error" }`.

**Solution** (implemented in `frontend/src/services/api.js`):
```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.detail) {
      error.response.data.error = error.response.data.detail;
    }
    return Promise.reject(error);
  }
);
```

#### 4. Route Path Mismatch
**Problem**: Flashcard progress route `/flashcards/{id}/progress` vs `/categories/{categoryId}/flashcards/{id}/progress`.

**Solution** (implemented in `frontend/src/services/api.js`):
```javascript
updateProgress: (id, data) => {
  const categoryId = data.categoryId || data.category_id;
  return api.post(`/categories/${categoryId}/flashcards/${id}/progress`, {
    confidence_level: data.confidence || data.confidence_level
  });
}
```

#### 5. Array Response Handling
**Problem**: Backend returns `{ flashcards: [...] }` but frontend accessed it as direct array.

**Solution**: Use defensive unwrapping patterns:
```javascript
const cardsData = cardsResponse.data.data || cardsResponse.data;
setFlashcards(cardsData.flashcards || cardsData || []);
```

### Files Modified for API Contract Fixes

| File | Changes |
|------|---------|
| `frontend/src/services/api.js` | Added response interceptor, fixed updateProgress route |
| `frontend/src/pages/Home.jsx` | Fixed categories data unwrapping |
| `frontend/src/pages/CategoryDashboard.jsx` | Fixed documents, samples, analysis data unwrapping |
| `frontend/src/pages/QuizPage.jsx` | Fixed category, stats, history data unwrapping |
| `frontend/src/pages/QuizSession.jsx` | Fixed session, questions, handwritten data unwrapping |
| `frontend/src/pages/QuizResults.jsx` | Fixed integrity report, partial grades, handwritten answers handling |
| `frontend/src/pages/FlashcardsPage.jsx` | Fixed cards, stats data unwrapping and field naming |
| `frontend/src/pages/NotebookPage.jsx` | Fixed entries, stats, most-missed data unwrapping |
| `backend-python/routers/ai.py` | Made analyze-samples request body optional |
| `backend-python/routers/documents.py` | Connected generate endpoints to AI agents |
| `backend-python/agents/controller_agent.py` | Fixed Document model field names |
| `backend-python/schemas/document.py` | Added missing request fields |

### Validation Checklist

Before committing any API-related change:

- [ ] Route paths match between `frontend/src/services/api.js` and `backend-python/routers/*.py`
- [ ] Request body field names match backend Pydantic schema in `backend-python/schemas/*.py`
- [ ] Response structure matches frontend component expectations
- [ ] Field names handled (snake_case vs camelCase fallbacks)
- [ ] Response wrapping handled (`response.data.data || response.data`)
- [ ] Error format normalized (FastAPI `detail` → frontend `error`)
- [ ] Arrays properly unwrapped (`data.items || data || []`)
