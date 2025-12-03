# StudyForge - AI-Powered Quiz & Flashcard Generator

**Built for the Krio Hackathon**

An intelligent study companion that transforms your documents into interactive quizzes and flashcards using AI. Features a multi-agent architecture, spaced repetition learning, handwriting recognition, semantic document chunking with RAG, and comprehensive learning analytics.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [AI Agent System](#ai-agent-system)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

### Document Processing
- **Multi-format Upload**: PDF, DOCX, TXT, Markdown, and images
- **Semantic Chunking**: AI-powered topic detection and boundary refinement using MC-Indexing/SCAN algorithms
- **RAG Pipeline**: Vector embeddings with pgvector for similarity search
- **Concept Mapping**: Automatic knowledge graph generation from documents

### AI-Powered Content Generation
- **Smart Question Generation**: Multiple choice, true/false, written answer, fill-in-the-blank
- **Style Learning**: Analyzes sample questions to match your preferred format
- **Flashcard Creation**: Auto-generates study cards from document content
- **Difficulty Levels**: Easy, medium, and hard questions with proper distribution

### Study Modes
- **Interactive Quizzes**: Practice, timed, and exam modes with configurable settings
- **Flashcard Study**: Flip cards with SM-2 spaced repetition scheduling
- **Question Bank**: Browse, filter, edit, and rate questions
- **Notebook**: Track wrong answers for targeted review

### Advanced Features
- **Handwriting Recognition**: Upload handwritten answers via GPT-4o Vision
- **Partial Credit Grading**: AI-assisted grading with detailed feedback breakdown
- **Explanation Chat**: Multi-turn conversations to understand concepts
- **Exam Integrity**: Focus/tab-switch detection for proctored assessments
- **Chapter Organization**: AI-powered document grouping and study guide generation

### Analytics & Progress
- **Learning Score**: AI-calculated score based on accuracy, consistency, improvement, and difficulty mastery
- **Performance Charts**: Interactive visualizations with ECharts
- **Category Breakdown**: Track progress across subjects
- **Hardest Questions**: Identify and focus on challenging topics
- **PDF Export**: Download analytics reports

### User Experience
- **Google OAuth**: Secure authentication
- **Dark Mode**: Eye-friendly theme
- **Guided Tours**: Interactive walkthroughs for new users
- **Responsive Design**: Works on desktop and mobile
- **User Isolation**: Each user sees only their own data

## Architecture

### Multi-Agent AI System

```
                    ┌─────────────────────┐
                    │  Controller Agent   │
                    │   (Orchestrator)    │
                    └──────────┬──────────┘
                               │
       ┌───────────┬───────────┼───────────┬───────────┐
       │           │           │           │           │
       ▼           ▼           ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Analysis │ │Generation│ │ Grading  │ │Handwriting│ │Explanation│
│  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
     │              │           │           │            │
     │              │           │           │            │
     ▼              ▼           ▼           ▼            ▼
  Extracts      Creates     Grades      Recognizes    Provides
  Patterns    Questions    Answers     Handwriting  Explanations
```

### Content Generation Pipeline

1. **Document Upload** → Text extraction (PDF, DOCX, etc.)
2. **Semantic Chunking** → AI topic detection with 1000-token chunks
3. **Embedding Generation** → Vector storage in pgvector
4. **Style Analysis** → Extract patterns from sample questions
5. **Content Generation** → Questions/flashcards matching your style
6. **Storage** → Persist to PostgreSQL with full metadata

### Spaced Repetition (SM-2 Algorithm)

- **Easiness Factor (EF)**: Starts at 2.5, adjusted based on recall quality
- **Interval Growth**: 1 day → 6 days → interval × EF (exponential)
- **Quality Rating**: 0-5 scale (0-2 = forgot, 3-5 = remembered)
- **Smart Scheduling**: Cards appear when optimal for retention

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| Tailwind CSS | Styling |
| React Router | Navigation |
| ECharts | Data visualization |
| Axios | HTTP client |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | API framework |
| SQLAlchemy | Async ORM |
| PostgreSQL | Database |
| pgvector | Vector similarity search |
| Alembic | Migrations |
| Pydantic | Validation |
| structlog | Structured logging |

### AI Providers (Configurable)
| Provider | Models |
|----------|--------|
| Anthropic | Claude Haiku, Sonnet |
| OpenAI | GPT-4, GPT-4o (vision) |
| Moonshot | Kimi K2 |
| Groq | Mixtral |
| Together AI | Various |
| AWS Bedrock | Claude models |

### Embedding Providers
| Provider | Model | Dimensions |
|----------|-------|------------|
| OpenAI | text-embedding-ada-002 | 1536 |
| Moonshot | moonshot-v1-embedding | 1024 |
| Voyage AI | voyage-3 | 1024 |

### Infrastructure
| Service | Purpose |
|---------|---------|
| AWS Elastic Beanstalk | Backend hosting |
| AWS S3 | Frontend hosting |
| AWS RDS | PostgreSQL database |
| Sentry | Error tracking |
| Docker | Containerization |

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- Docker (optional)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/yourusername/studyforge.git
cd studyforge/quiz-flashcard-app

# Create environment file
cp .env.example .env
# Edit .env with your API keys

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Local Development

#### Backend
```bash
cd quiz-flashcard-app/backend-python

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --reload --port 8000
```

#### Frontend
```bash
cd quiz-flashcard-app/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Environment Variables

### Backend Configuration

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/studyforge

# Environment
ENVIRONMENT=development  # or production
DEBUG=true

# AI Provider (choose one)
AI_PROVIDER=moonshot  # moonshot, openai, anthropic, groq, bedrock
AI_MODEL=kimi-k2-0711-preview

# Provider API Keys
MOONSHOT_API_KEY=your-key
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key

# Vision (for handwriting recognition)
VISION_PROVIDER=openai
VISION_MODEL=gpt-4o

# Embeddings
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-ada-002

# Authentication
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET_KEY=your-secret-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

### Frontend Configuration

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-client-id
```

## API Reference

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create category |
| GET | `/api/categories/{id}` | Get category with stats |
| PUT | `/api/categories/{id}` | Update category |
| DELETE | `/api/categories/{id}` | Delete category (cascades) |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories/{id}/documents` | List documents |
| POST | `/api/categories/{id}/documents` | Upload document |
| DELETE | `/api/documents/{id}` | Delete document |
| POST | `/api/documents/{id}/chunk` | Semantic chunking |
| POST | `/api/documents/{id}/embed` | Generate embeddings |
| GET | `/api/documents/{id}/concept-map` | Get concept graph |
| POST | `/api/categories/{id}/search-chunks` | Vector search |
| POST | `/api/categories/{id}/organize` | AI organization |

### Questions & Quizzes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories/{id}/questions` | List questions |
| POST | `/api/categories/{id}/questions` | Create question |
| POST | `/api/categories/{id}/questions/bulk` | Bulk create |
| PUT | `/api/questions/{id}` | Update question |
| DELETE | `/api/questions/{id}` | Delete question |
| POST | `/api/categories/{id}/quiz` | Start quiz session |
| POST | `/api/quiz/{id}/submit` | Submit answers |
| GET | `/api/quiz/{id}/integrity-report` | Get integrity score |

### Flashcards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories/{id}/flashcards` | List flashcards |
| POST | `/api/categories/{id}/flashcards` | Create flashcard |
| POST | `/api/flashcards/{id}/review` | Record review (SM-2) |
| POST | `/api/categories/{id}/flashcards/due` | Get due cards |

### AI Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/categories/{id}/generate-questions` | Generate questions |
| POST | `/api/categories/{id}/generate-flashcards` | Generate flashcards |
| POST | `/api/categories/{id}/analyze-samples` | Analyze style |
| POST | `/api/quiz/{id}/question/{qid}/grade` | Grade answer |
| POST | `/api/quiz/{id}/question/{qid}/handwritten` | Upload handwriting |
| POST | `/api/explain` | Get explanation |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Full dashboard |
| GET | `/api/analytics/overview` | Summary stats |
| GET | `/api/analytics/trend` | Trend data |
| GET | `/api/analytics/learning-score` | AI learning score |
| GET | `/api/analytics/hardest` | Hardest questions |

## AI Agent System

### Agent Descriptions

| Agent | Role | Capabilities |
|-------|------|--------------|
| **Controller** | Orchestrator | Coordinates agents, manages pipelines, logs communication |
| **Analysis** | Pattern Extraction | Analyzes samples, creates style guides, identifies patterns |
| **Generation** | Content Creation | Creates questions/flashcards, uses style guides, supports all types |
| **Grading** | Answer Evaluation | Partial credit, component breakdown, suggestions |
| **Handwriting** | OCR | Vision API integration, confidence scores, user corrections |
| **Explanation** | Help System | Multi-turn chat, concept explanations, follow-ups |
| **Chapter** | Organization | Document grouping, topic detection, PDF generation |

### Agent Communication

Agents communicate via the `AgentMessage` model stored in the database:
- Full audit trail of agent interactions
- Role, content, metadata, and timestamps
- Supports multi-turn conversations
- Accessible via `/api/categories/{id}/agent-activity`

## Project Structure

```
quiz-flashcard-app/
├── backend-python/
│   ├── agents/               # AI agent implementations
│   │   ├── base_agent.py     # Abstract base class
│   │   ├── analysis_agent.py # Pattern extraction
│   │   ├── generation_agent.py # Q/A creation
│   │   ├── grading_agent.py  # Answer evaluation
│   │   ├── handwriting_agent.py # OCR
│   │   ├── explanation_agent.py # Help system
│   │   ├── chapter_agent.py  # Document organization
│   │   └── controller_agent.py # Orchestrator
│   ├── alembic/              # Database migrations
│   ├── config/               # Settings and configuration
│   ├── models/               # SQLAlchemy models
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── document.py
│   │   ├── question.py
│   │   ├── flashcard.py
│   │   ├── quiz_session.py
│   │   ├── document_chunk.py # RAG chunks
│   │   └── ...
│   ├── routers/              # API endpoints
│   │   ├── auth.py
│   │   ├── categories.py
│   │   ├── documents.py
│   │   ├── quiz.py
│   │   ├── flashcards.py
│   │   ├── ai.py
│   │   ├── analytics.py
│   │   └── notebook.py
│   ├── schemas/              # Pydantic schemas
│   ├── services/             # Business logic
│   │   ├── ai_service.py     # LLM integration
│   │   ├── embedding_service.py # Vector embeddings
│   │   ├── chunking_service.py # Semantic chunking
│   │   ├── analytics_service.py # Learning score
│   │   └── ...
│   ├── main.py               # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI
│   │   │   ├── Layout.tsx
│   │   │   ├── ExplanationChat.tsx
│   │   │   └── ...
│   │   ├── contexts/         # React contexts
│   │   │   ├── AuthContext.tsx
│   │   │   ├── ThemeContext.tsx
│   │   │   └── ...
│   │   ├── pages/            # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── QuizSession.tsx
│   │   │   ├── FlashcardsPage.tsx
│   │   │   ├── AnalyticsDashboard.tsx
│   │   │   └── ...
│   │   ├── services/         # API client
│   │   │   └── api.ts
│   │   └── types/            # TypeScript types
│   ├── index.html
│   └── package.json
├── dev/                      # Development docs
├── docker-compose.yml
└── README.md
```

## Database Models

### Core Entities
- **User** - Google OAuth profile
- **Category** - Study subjects with color/icon
- **Document** - Uploaded study materials
- **Question** - Quiz questions (all types)
- **Flashcard** - Study cards
- **QuizSession** - Quiz attempts
- **FlashcardProgress** - SM-2 scheduling data

### AI/Analysis
- **AIAnalysisResult** - Style patterns
- **PartialCreditGrade** - Grading breakdown
- **Handwriting** - OCR results
- **AgentMessage** - Agent communication logs

### RAG Pipeline
- **DocumentChunk** - Semantic chunks with embeddings
- **DocumentTopic** - Detected topics
- **DocumentConceptMap** - Knowledge graph

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| AI Generate | 100/minute |
| AI Grade | 200/minute |
| Upload | 50/minute |
| General | 1000/minute |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `pytest` (backend) / `npm test` (frontend)
5. Commit: `git commit -m 'Add my feature'`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [SuperMemo 2 Algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2) for spaced repetition
- [MC-Indexing / SCAN](https://arxiv.org/abs/2407.21831) for semantic chunking research
- [OpenAI](https://openai.com/) for AI models
- [Anthropic](https://anthropic.com/) for Claude models
- Built with Claude Code assistance
