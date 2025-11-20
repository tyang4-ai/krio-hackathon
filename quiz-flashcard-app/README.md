# Scholarly - AI Study Platform

An elegant, AI-powered study platform that transforms your documents into interactive quizzes and flashcards. Master any subject with intelligent question generation, spaced repetition, and adaptive learning from PDFs, Word documents, and text files.

## Features

- **Document Upload**: Upload PDF, DOC, DOCX, TXT, or MD files
- **AI-Powered Generation**: Automatically generate quiz questions and flashcards from your documents
- **Customizable Quizzes**:
  - Set number of questions
  - Choose difficulty level (easy, medium, hard, mixed)
  - Random question selection from your question bank
- **Flashcard System**:
  - Spaced repetition for effective learning
  - Confidence-based review scheduling
  - Study all cards or only those due for review
- **Category Organization**: Organize content by class or subject
- **Notebook**: Track wrong answers for targeted review
- **Quiz History**: Review past quiz performance
- **AWS S3 Support**: Optional cloud storage for documents

## Tech Stack

### Backend
- Node.js with Express.js
- SQLite database (easily upgradable to PostgreSQL)
- NVIDIA Nemotron API for content generation (using Llama 3.1 Nemotron 70B)
- AWS S3 (optional) for file storage

### Frontend
- React 18
- React Router for navigation
- Tailwind CSS for styling
- Axios for API calls
- Lucide React for icons

## Project Structure

```
quiz-flashcard-app/
├── backend/
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── routes/       # API routes
│   │   └── index.js      # Entry point
│   ├── data/             # SQLite database
│   └── uploads/          # Uploaded files
└── frontend/
    └── src/
        ├── components/   # Reusable components
        ├── pages/        # Page components
        ├── services/     # API service layer
        └── styles/       # CSS styles
```

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- NVIDIA API key (get one at https://build.nvidia.com/)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd quiz-flashcard-app/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your configuration:
   ```
   PORT=3001
   NVIDIA_API_KEY=your_nvidia_api_key_here

   # Optional: AWS S3 configuration
   USE_S3_STORAGE=false
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your-bucket-name
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd quiz-flashcard-app/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

## Usage Guide

### 1. Create a Category
- Click "New Category" on the home page
- Enter a name, description, and choose a color
- Categories help organize your study materials by class or subject

### 2. Upload Documents
- Open a category dashboard
- Click "Upload" to add PDF, Word, or text documents
- Documents are automatically processed to extract text

### 3. Generate Content
- Set the difficulty level and number of items
- Click "Generate Questions" to create quiz questions
- Click "Generate Flashcards" to create study cards

### 4. Take Quizzes
- Go to the Quiz section
- Configure quiz settings (number of questions, difficulty)
- Click "Start Quiz" to begin
- Review your results and see explanations

### 5. Study Flashcards
- Go to the Flashcards section
- Click cards to flip between front and back
- Rate your confidence (hard, medium, easy)
- Cards you struggle with will appear more frequently

### 6. Review Notebook
- Go to the Notebook section
- See all questions you got wrong
- Mark items as reviewed once you've studied them
- View your most missed questions

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `GET /api/categories/:id` - Get category by ID
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Documents
- `GET /api/categories/:id/documents` - Get documents
- `POST /api/categories/:id/documents` - Upload document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/categories/:id/generate-questions` - Generate questions
- `POST /api/categories/:id/generate-flashcards` - Generate flashcards

### Quiz
- `GET /api/categories/:id/questions` - Get questions
- `POST /api/categories/:id/quiz` - Create quiz session
- `POST /api/quiz/:sessionId/submit` - Submit quiz answers
- `GET /api/categories/:id/quiz/history` - Get quiz history

### Flashcards
- `GET /api/categories/:id/flashcards` - Get flashcards
- `POST /api/flashcards/:id/progress` - Update study progress
- `GET /api/categories/:id/flashcards/review` - Get cards due for review

### Notebook
- `GET /api/categories/:id/notebook` - Get notebook entries
- `POST /api/notebook/:id/reviewed` - Mark as reviewed
- `GET /api/categories/:id/notebook/most-missed` - Get most missed questions

## Modular Architecture

The application is designed with a modular architecture for easy maintenance and upgrades:

- **Services Layer**: Business logic separated into individual services
  - `aiService.js` - NVIDIA Nemotron AI integration
  - `documentService.js` - Document processing
  - `quizService.js` - Quiz management
  - `flashcardService.js` - Flashcard system
  - `notebookService.js` - Wrong answer tracking
  - `categoryService.js` - Category management
  - `storageService.js` - File storage (local/S3)

- **Controllers**: Handle HTTP requests and responses
- **Routes**: Define API endpoints
- **Database**: SQLite with simple upgrade path to PostgreSQL

## Future Enhancements

- User authentication and multi-user support
- Export/import question banks
- More question types (true/false, fill-in-the-blank)
- Study statistics and analytics
- Mobile app version
- Collaborative study groups
- Integration with other AI providers

## License

MIT License
