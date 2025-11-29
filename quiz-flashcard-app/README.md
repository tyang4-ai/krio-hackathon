# StudyForge - AI-Powered Quiz & Flashcard Generator

An intelligent study companion that transforms your documents into interactive quizzes and flashcards using AI. Built with React, FastAPI, and PostgreSQL.

## Features

### Core Functionality
- **Document Upload**: Upload PDFs, images, or text documents to generate study materials
- **AI-Powered Generation**: Automatically creates quizzes and flashcards from your content
- **Multiple Question Types**: Supports multiple choice, true/false, short answer, and written response questions
- **Spaced Repetition (SM-2)**: Smart flashcard scheduling based on the SuperMemo 2 algorithm for optimal retention

### Study Tools
- **Interactive Quizzes**: Take quizzes with instant feedback and detailed explanations
- **Flashcard Mode**: Study with flip cards featuring spaced repetition scheduling
- **Notebook**: Track wrong answers for targeted review
- **Question Bank**: Browse, edit, and manage all generated questions

### Analytics & Progress Tracking
- **Learning Score**: AI-calculated score based on quiz performance and study habits
- **Performance Charts**: Visualize your progress over time with interactive graphs
- **Hardest Questions**: Identify and focus on challenging topics
- **Category Statistics**: Track progress across different study subjects

### Organization
- **Categories**: Organize study materials by subject or topic
- **Chapters**: Group documents within categories for structured learning
- **Custom Icons & Colors**: Personalize your categories for easy identification

### User Experience
- **Dark Mode**: Eye-friendly dark theme for late-night study sessions
- **Guided Tour**: Interactive walkthrough for new users
- **PDF Export**: Export analytics and progress reports as PDFs
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **ECharts** for data visualization
- **Lucide React** for icons

### Backend
- **FastAPI** (Python 3.11)
- **SQLAlchemy** with async support
- **PostgreSQL** database
- **Alembic** for database migrations
- **Pydantic** for data validation
- **Structlog** for structured logging

### AI Integration
- **Moonshot AI** (Kimi) for content analysis and question generation
- **OpenAI GPT-4o** for vision/image processing
- Multi-agent architecture for specialized tasks

### Infrastructure
- **Docker & Docker Compose** for containerization
- **Sentry** for error tracking and monitoring
- **Rate limiting** for API protection

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Quick Start with Docker

1. Clone the repository:
```bash
git clone https://github.com/yourusername/quiz-flashcard-app.git
cd quiz-flashcard-app
```

2. Create environment files:
```bash
# Create .env in quiz-flashcard-app/
cp .env.example .env
# Edit .env with your API keys
```

3. Start the application:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/docs

### Local Development

#### Backend
```bash
cd backend-python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 3000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend
| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `MOONSHOT_API_KEY` | Moonshot AI API key | Yes |
| `OPENAI_API_KEY` | OpenAI API key (for vision) | Yes |
| `SENTRY_DSN` | Sentry DSN for error tracking | No |
| `ENVIRONMENT` | `development` or `production` | No |

### Frontend
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_BASE_URL` | Backend API URL | Yes |

## Project Structure

```
quiz-flashcard-app/
├── backend-python/
│   ├── agents/           # AI agent implementations
│   ├── alembic/          # Database migrations
│   ├── config/           # Configuration settings
│   ├── models/           # SQLAlchemy models
│   ├── routers/          # API route handlers
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   └── main.py           # Application entry point
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client
│   │   └── types/        # TypeScript types
│   └── index.html
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create a new category
- `GET /api/categories/{id}` - Get category details
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category and all related data

### Documents
- `POST /api/documents/upload` - Upload a document
- `GET /api/documents/{category_id}` - List documents in category

### Quizzes
- `POST /api/quiz/generate` - Generate questions from documents
- `GET /api/quiz/questions/{category_id}` - Get questions for category
- `POST /api/quiz/submit` - Submit quiz answers

### Flashcards
- `GET /api/flashcards/{category_id}` - Get flashcards
- `POST /api/flashcards/{id}/review` - Record flashcard review (SM-2)

### Analytics
- `GET /api/analytics/dashboard` - Get analytics dashboard data
- `GET /api/analytics/category/{id}` - Get category-specific analytics

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [SuperMemo 2 Algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2) for spaced repetition
- [Moonshot AI](https://www.moonshot.cn/) for AI content generation
- [OpenAI](https://openai.com/) for vision capabilities
