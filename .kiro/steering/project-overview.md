---
inclusion: always
---

# StudyForge - Project Overview

## Project Identity
**Name**: StudyForge (Scholarly)
**Type**: AI-Powered Quiz & Flashcard Generator
**Tagline**: "Craft smarter quizzes and flashcards from any doc"

## Architecture
This is a **full-stack web application** with:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI (Python 3.11+) with async SQLAlchemy
- **Database**: PostgreSQL 15
- **AI Integration**: Multi-provider support (Moonshot/Kimi, OpenAI, NVIDIA, Groq, etc.)
- **Deployment**: Docker Compose for local development

## Core Features
1. **Document Processing**: Upload PDFs, DOCX, TXT, MD files
2. **AI Content Generation**: Questions (multiple choice, true/false, written, fill-in-blank) and flashcards
3. **Multi-Agent AI System**: Specialized agents for analysis, generation, handwriting recognition, and grading
4. **Spaced Repetition**: SM-2 algorithm for flashcard scheduling
5. **Quiz Modes**: Practice, Timed, Exam (with focus tracking)
6. **Partial Credit Grading**: AI-powered component breakdown
7. **Handwriting Recognition**: Upload handwritten PDFs with AI text extraction
8. **Analytics Dashboard**: Performance tracking, learning scores, progress charts
9. **Question Bank**: Full CRUD with ratings, bulk operations
10. **Personalization**: AI learns from user ratings and performance

## Key Technologies
- **Backend**: FastAPI, SQLAlchemy (async), Alembic, Pydantic, Structlog, Sentry
- **Frontend**: React, TypeScript, React Router, Axios, ECharts, Lucide Icons
- **AI**: OpenAI SDK (multi-provider compatible), Moonshot AI, GPT-4o for vision
- **Infrastructure**: Docker, PostgreSQL, Uvicorn

## Project Structure
```
quiz-flashcard-app/
├── backend-python/          # FastAPI backend
│   ├── agents/              # Multi-agent AI system
│   ├── models/              # SQLAlchemy models
│   ├── routers/             # API endpoints
│   ├── services/            # Business logic
│   ├── schemas/             # Pydantic schemas
│   ├── middleware/          # Auth, logging, rate limiting
│   └── main.py              # Application entry point
├── frontend/                # React + TypeScript frontend
│   └── src/
│       ├── pages/           # Page components
│       ├── components/      # Reusable UI components
│       ├── contexts/        # React contexts (Auth, Theme, Tour)
│       ├── services/        # API client
│       └── types/           # TypeScript types
└── docker-compose.yml       # Container orchestration
```

## Development Workflow
1. **Local Development**: Use Docker Compose (`docker-compose up`)
2. **Backend**: FastAPI with hot reload on port 8000
3. **Frontend**: Vite dev server on port 3000 (in Docker) or 5173 (local)
4. **Database**: PostgreSQL on port 5432
5. **API Docs**: Auto-generated at http://localhost:8000/docs

## Important Notes
- The project uses **async/await** patterns throughout the backend
- All database operations use **SQLAlchemy async sessions**
- AI providers are **swappable** via environment variables
- The frontend uses **TypeScript** - maintain type safety
- **Sentry** is integrated for error tracking
- **Rate limiting** is enabled on API endpoints
