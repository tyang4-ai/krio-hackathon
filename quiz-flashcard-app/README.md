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

## AI Provider Options

Scholarly supports multiple AI providers for maximum flexibility and easy deployment:

### Available Providers

| Provider | Best For | Cost | Setup Time |
|----------|----------|------|------------|
| **Groq** ⭐ | Vercel deployment | Free tier + $0.10/M tokens | 2 min |
| **Together.ai** | Production balance | $0.20-$2/M tokens | 2 min |
| **Ollama** | Local development | FREE (self-hosted) | 10 min |
| **NVIDIA Nemotron** | Current default | ~$1-2/M tokens | 5 min |
| **AWS Bedrock** | Enterprise/AWS | $0.0006-$0.024/1K tokens | 30 min |
| **HuggingFace** | Max flexibility | Varies | 5 min |

### Quick Provider Switch

Change providers by updating a single environment variable:

```bash
# In your .env file
AI_PROVIDER=groq  # or together, ollama, nvidia, bedrock, huggingface
```

No code changes required! See `.env.example` for detailed configuration.

## Deployment Guide

### Option 1: Vercel Deployment (Recommended)

**Best AI Provider: Groq** (fastest, serverless-friendly, generous free tier)

1. **Prepare your repository:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Set up Groq API key:**
   - Visit https://console.groq.com/
   - Create free account
   - Generate API key

3. **Deploy to Vercel:**
   ```bash
   # Install Vercel CLI
   npm install -g vercel

   # Deploy
   cd quiz-flashcard-app
   vercel
   ```

4. **Configure environment variables in Vercel:**
   - Go to your project settings
   - Add environment variables:
     ```
     AI_PROVIDER=groq
     GROQ_API_KEY=your_groq_api_key
     PORT=3001
     NODE_ENV=production
     ```

5. **Redeploy:**
   ```bash
   vercel --prod
   ```

**Cost:** ~$0-5/month (free tier covers most usage)

### Option 2: AWS Deployment

**Best AI Provider: AWS Bedrock** (enterprise features, AWS integration)

#### Using AWS Elastic Beanstalk:

1. **Install AWS CLI and EB CLI:**
   ```bash
   pip install awscli awsebcli
   aws configure
   ```

2. **Initialize Elastic Beanstalk:**
   ```bash
   cd quiz-flashcard-app
   eb init -p node.js scholarly-app
   ```

3. **Create environment:**
   ```bash
   eb create scholarly-production
   ```

4. **Set environment variables:**
   ```bash
   eb setenv AI_PROVIDER=bedrock \
     AWS_ACCESS_KEY_ID=your_key \
     AWS_SECRET_ACCESS_KEY=your_secret \
     AWS_REGION=us-east-1 \
     NODE_ENV=production
   ```

5. **Deploy:**
   ```bash
   eb deploy
   ```

#### Using AWS Lambda + API Gateway:

1. **Package application:**
   ```bash
   cd backend
   npm install --production
   zip -r function.zip .
   ```

2. **Create Lambda function via AWS Console**
3. **Set up API Gateway to route to Lambda**
4. **Configure environment variables in Lambda**

**Cost:** ~$20-100/month depending on usage

### Option 3: Local Development with Ollama (FREE)

**Perfect for development with zero API costs**

1. **Install Ollama:**
   ```bash
   # macOS
   brew install ollama

   # Linux
   curl -fsSL https://ollama.com/install.sh | sh

   # Windows
   # Download from https://ollama.com/download
   ```

2. **Start Ollama and download a model:**
   ```bash
   ollama serve
   ollama pull mistral  # or llama3.2, phi3.5
   ```

3. **Update your .env:**
   ```bash
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434/v1
   ```

4. **Run the application:**
   ```bash
   cd backend && npm start
   cd frontend && npm run dev
   ```

**Cost:** $0 (only electricity/hardware)

### Option 4: Traditional VPS (DigitalOcean, Linode, etc.)

1. **Create a Droplet/Server (Ubuntu 22.04)**

2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and setup:**
   ```bash
   git clone your-repo-url
   cd quiz-flashcard-app/backend
   npm install
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your provider settings
   ```

5. **Use PM2 for process management:**
   ```bash
   sudo npm install -g pm2
   pm2 start src/index.js --name scholarly-backend
   pm2 save
   pm2 startup
   ```

6. **Setup nginx as reverse proxy** (optional but recommended)

**Cost:** $5-20/month + AI provider costs

## Environment-Specific Recommendations

### Development Environment
```bash
AI_PROVIDER=ollama
# FREE, fast iteration, no API costs
```

### Staging/Testing
```bash
AI_PROVIDER=groq
GROQ_API_KEY=your_key
# Free tier sufficient for testing
```

### Production (Small Scale)
```bash
AI_PROVIDER=groq  # or together
GROQ_API_KEY=your_key
# Cost: $0-10/month
```

### Production (Enterprise)
```bash
AI_PROVIDER=bedrock
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
# Better economics at scale with provisioned throughput
```

## Monitoring & Cost Tracking

The AI service now includes:
- Automatic retry with exponential backoff
- Provider-specific error messages
- Usage logging for cost tracking
- Health check endpoint

Monitor costs by checking backend logs:
```bash
# Logs show: "Generated X questions using <provider>"
tail -f logs/app.log | grep "Generated"
```

## Performance Comparison

Based on typical quiz generation (10 questions):

| Provider | Avg Latency | Cost per 1K Gen | Reliability |
|----------|-------------|-----------------|-------------|
| Groq | 500ms ⚡ | $0.001 | Excellent |
| Together.ai | 2s | $0.002 | Excellent |
| Ollama (local) | 1-5s* | $0 | Good |
| NVIDIA | 2-3s | $0.003 | Good |
| AWS Bedrock | 2-3s | $0.002 | Excellent |

*Depends on local hardware

## Future Enhancements

- User authentication and multi-user support
- Export/import question banks
- More question types (true/false, fill-in-the-blank)
- Study statistics and analytics
- Mobile app version
- Collaborative study groups
- ✅ Integration with multiple AI providers (IMPLEMENTED)

## License

MIT License
