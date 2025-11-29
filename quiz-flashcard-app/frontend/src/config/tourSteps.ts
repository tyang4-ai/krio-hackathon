export interface DemoAsset {
  label: string;
  filename: string;
}

export interface TourStep {
  target: string | null; // data-tour attribute, null = centered modal
  title: string;
  content: string;
  details?: string;
  technicalDetails?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  demoAssets?: DemoAsset[];
}

export const HOME_TOUR_STEPS: TourStep[] = [
  {
    target: null, // Centered welcome modal
    title: 'Welcome to StudyForge!',
    content: 'Your AI-powered study companion. Transform your notes into quizzes and flashcards.',
    details: `StudyForge uses advanced AI to transform your study materials into interactive quizzes and flashcards.

HOW IT WORKS:
1. Upload your notes, textbooks, or lecture slides
2. AI analyzes the content and extracts key concepts
3. Generate personalized quizzes and flashcards
4. Track your progress with detailed analytics
5. Use spaced repetition for optimal retention`,
    technicalDetails: `ARCHITECTURE OVERVIEW

FRONTEND: React 18 + TypeScript + Vite
- React Router v6 for navigation
- TailwindCSS for styling
- Context API for state management
- ECharts for analytics visualization

BACKEND: FastAPI + Python 3.11
- Async/await throughout
- SQLAlchemy (async) ORM
- PostgreSQL database
- Pydantic for validation

AI INTEGRATION:
- OpenAI GPT-4 / Anthropic Claude
- Configurable via environment
- Structured output parsing

STACK: React | FastAPI | PostgreSQL | OpenAI`,
    position: 'bottom',
  },
  {
    target: 'new-category-btn',
    title: 'Create Categories',
    content: 'Organize your study materials by subject or course.',
    details: `Categories keep your materials organized. Each category has its own:
- Documents (notes, textbooks, slides)
- Generated questions
- Flashcards
- Notebook entries

Great for separating courses or topics. Choose from 21 icons and custom colors!`,
    technicalDetails: `BACKEND: FastAPI + SQLAlchemy

POST /api/categories
\`\`\`python
# routers/categories.py
@router.post("")
async def create_category(
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_db)
):
    category = Category(
        name=category_data.name,
        description=category_data.description,
        color=category_data.color,
        icon=category_data.icon
    )
    db.add(category)
    await db.flush()
    return CategoryResponse(...)
\`\`\`

DATABASE: PostgreSQL
- categories table with icon, color fields
- Cascading deletes to related content

STACK: SQLAlchemy (async) | Pydantic | PostgreSQL`,
    position: 'bottom',
  },
  {
    target: 'category-card',
    title: 'Your Study Hub',
    content: 'Click any category to access all its content.',
    details: `Each card shows live statistics:
- Documents uploaded
- Questions generated
- Flashcards created

The icon and color help you identify categories quickly. Click to enter the category dashboard.`,
    technicalDetails: `FRONTEND: React + TypeScript

\`\`\`typescript
// Home.tsx - Dynamic icon rendering
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Folder, GraduationCap, BookMarked,
  Beaker, Calculator, Globe, Music,
  // ... 21 total icons
};

const IconComponent = getCategoryIcon(category.icon);
return <IconComponent style={{ color: category.color }} />;
\`\`\`

API: GET /api/categories
- Returns categories with stats
- Stats computed via COUNT queries
- Sorted by created_at DESC

STACK: lucide-react | React Router | Axios`,
    position: 'right',
  },
  {
    target: 'analytics-btn',
    title: 'Track Progress',
    content: 'View your AI Learning Score and detailed analytics.',
    details: `DATA PIPELINE:
1. Your quiz attempts are recorded with timestamps
2. Performance metrics are calculated (accuracy, time, streak)
3. AI analyzes your learning patterns
4. Personalized score (0-100) based on:
   - Accuracy (40%)
   - Consistency/streak (20%)
   - Improvement trend (20%)
   - Difficulty progression (20%)`,
    technicalDetails: `BACKEND: Analytics Service

\`\`\`python
# services/analytics_service.py
async def calculate_learning_score(
    user_id: int,
    category_id: Optional[int] = None
) -> dict:
    overview = await self.get_user_overview(
        user_id, days=30, category_id=category_id
    )
    trend = await self.get_trend_data(...)
    difficulty = await self.get_difficulty_breakdown(...)

    # Weighted scoring algorithm
    accuracy_score = min(40, overview["accuracy"] * 0.4)
    consistency_score = min(20, streak * 2)
    improvement_score = calculate_improvement(trend)
    difficulty_score = calculate_difficulty_bonus(...)

    return {
        "score": total_score,
        "grade": self._score_to_grade(total_score),
        "recommendation": self._get_recommendation(...)
    }
\`\`\`

DATABASE: QuestionAttempt table
- user_id, question_id, is_correct
- time_spent_seconds, answered_at

STACK: SQLAlchemy | async/await | PostgreSQL`,
    position: 'bottom',
  },
  {
    target: 'theme-toggle',
    title: 'Dark Mode',
    content: 'Easy on the eyes. Switch between light and dark themes.',
    details: `Switch between light and dark themes anytime.

Your preference is:
- Saved automatically to localStorage
- Respects system preference by default
- Applies custom color palette optimized for readability`,
    technicalDetails: `FRONTEND: React Context API

\`\`\`typescript
// contexts/ThemeContext.tsx
const [theme, setThemeState] = useState<Theme>(() => {
  // Check localStorage first
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored as Theme;

  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
});

useEffect(() => {
  // Apply theme to document
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(THEME_KEY, theme);
}, [theme]);
\`\`\`

CSS: TailwindCSS dark mode
- darkMode: 'class' in config
- Custom dark-surface, dark-tonal, dark-primary palettes

STACK: TailwindCSS | localStorage | CSS Variables`,
    position: 'bottom',
  },
  {
    target: null,
    title: "You're Ready!",
    content: "Create your first category to start organizing your study materials!",
    details: `Get started by:
1. Click "New Category" to create your first subject
2. Upload your notes or textbooks
3. Generate AI-powered quizzes and flashcards
4. Track your progress in Analytics

Pro tip: Use the "?" button in the header to restart this tour anytime!`,
    technicalDetails: `FULL TECH STACK

FRONTEND:
- React 18.2 + TypeScript 5.x
- Vite 5.x build system
- TailwindCSS 3.x
- React Router v6
- Axios for HTTP
- ECharts for charts
- jsPDF + html2canvas for PDF export
- lucide-react for icons

BACKEND:
- FastAPI 0.100+
- Python 3.11
- SQLAlchemy 2.x (async)
- PostgreSQL 15
- Alembic for migrations
- Pydantic v2
- structlog for logging
- slowapi for rate limiting

AI PROVIDERS:
- OpenAI GPT-4 / GPT-3.5
- Anthropic Claude 3
- Configurable via settings

ALGORITHMS:
- SM-2 Spaced Repetition
- AI Learning Score (custom)
- Pattern analysis for style matching`,
    position: 'bottom',
  },
];

export const CATEGORY_TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: 'Category Dashboard',
    content: 'Your study command center. Manage all content for this subject.',
    details: `This is where you manage all content for this category:
- Upload documents (PDFs, notes, textbooks)
- Generate AI questions and flashcards
- Track progress with quick actions
- Add sample questions to guide AI style`,
    technicalDetails: `ARCHITECTURE: Single Page Application

\`\`\`typescript
// CategoryDashboard.tsx
const { categoryId } = useParams<{ categoryId: string }>();

useEffect(() => {
  loadData();
}, [categoryId]);

const loadData = async () => {
  const [catResponse, docsResponse, samplesResponse] =
    await Promise.all([
      categoryApi.getById(Number(categoryId)),
      documentApi.getByCategory(Number(categoryId)),
      sampleQuestionApi.getByCategory(Number(categoryId)),
    ]);
  // Update state...
};
\`\`\`

ROUTES:
- /category/:id - Dashboard
- /category/:id/quiz - Take Quiz
- /category/:id/flashcards - Study Cards
- /category/:id/notebook - Review Notes

STACK: React Router | Axios | async/await`,
    position: 'bottom',
  },
  {
    target: 'upload-section',
    title: 'Upload Documents',
    content: 'Upload PDFs, notes, or textbook pages to generate content.',
    details: `SUPPORTED FORMATS:
- PDF (.pdf) - Text extraction with PyPDF2
- Word (.docx) - Parsed with python-docx
- Text (.txt, .md) - Direct text reading

PIPELINE:
1. File uploaded to backend
2. Text extracted based on file type
3. Content stored in database
4. Ready for AI analysis and generation

Organize by chapter/topic for filtered generation!`,
    technicalDetails: `BACKEND: FastAPI File Upload

\`\`\`python
# routers/documents.py
@router.post("/{category_id}/documents")
async def upload_document(
    category_id: int,
    file: UploadFile = File(...),
    chapter: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    # Validate file type
    if not file.filename.endswith(('.pdf', '.docx', '.txt', '.md')):
        raise HTTPException(400, "Unsupported file type")

    # Extract text based on type
    if file.filename.endswith('.pdf'):
        text = extract_pdf_text(file)  # PyPDF2
    elif file.filename.endswith('.docx'):
        text = extract_docx_text(file)  # python-docx
    else:
        text = await file.read()

    # Store in database
    doc = Document(
        category_id=category_id,
        original_name=file.filename,
        content=text,
        chapter=chapter
    )
    db.add(doc)
\`\`\`

STACK: FastAPI | PyPDF2 | python-docx | PostgreSQL`,
    position: 'bottom',
    demoAssets: [
      { label: 'Download Sample Notes', filename: 'sample-biology-notes.txt' },
    ],
  },
  {
    target: 'generate-content-section',
    title: 'AI Question Generation',
    content: 'AI analyzes your documents and creates quiz questions.',
    details: `GENERATION OPTIONS:
- Question Types: Multiple Choice, True/False, Written, Fill-in-Blank
- Difficulty: Easy, Medium, Hard, or Concepts-only
- Count: 1-50 questions per generation
- Chapter Filter: Only use specific documents
- Custom Directions: Guide the AI style

The AI identifies key concepts and creates varied questions!`,
    technicalDetails: `BACKEND: AI Generation Pipeline

\`\`\`python
# services/ai_service.py
async def generate_questions(
    category_id: int,
    count: int,
    difficulty: str,
    question_type: str,
    chapter: Optional[str] = None,
    custom_directions: Optional[str] = None
) -> list[Question]:
    # 1. Fetch documents (filtered by chapter)
    documents = await get_documents(category_id, chapter)

    # 2. Get sample question analysis (if available)
    analysis = await get_sample_analysis(category_id)

    # 3. Build AI prompt
    prompt = build_generation_prompt(
        documents, analysis,
        count, difficulty, question_type,
        custom_directions
    )

    # 4. Call AI provider (OpenAI/Anthropic)
    response = await ai_client.generate(prompt)

    # 5. Parse and validate structured output
    questions = parse_questions(response)

    # 6. Store in database
    for q in questions:
        db.add(Question(category_id=category_id, **q))

    return questions
\`\`\`

AI PROVIDERS:
- OpenAI: gpt-4, gpt-3.5-turbo
- Anthropic: claude-3-opus, claude-3-sonnet

STACK: OpenAI API | Anthropic API | Pydantic | async`,
    position: 'bottom',
  },
  {
    target: 'generate-flashcards-btn',
    title: 'AI Flashcards',
    content: 'Generate flashcards with spaced repetition learning.',
    details: `FLASHCARD GENERATION:
- AI extracts key concepts from your documents
- Creates front (question) / back (answer) pairs
- Supports "Concepts" mode for definitions

SPACED REPETITION (SM-2 Algorithm):
- Cards scheduled based on your performance
- Easier cards shown less frequently
- Difficult cards repeated more often
- Optimizes long-term retention`,
    technicalDetails: `BACKEND: SM-2 Algorithm Implementation

\`\`\`python
# services/flashcard_service.py
def calculate_sm2(
    quality: int,  # 0-5 rating
    repetitions: int,
    easiness: float,
    interval: int
) -> tuple[int, float, int]:
    """
    SM-2 Spaced Repetition Algorithm
    Returns: (new_repetitions, new_easiness, new_interval)
    """
    if quality >= 3:  # Correct response
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * easiness)

        repetitions += 1
        easiness = max(1.3, easiness + (0.1 - (5-quality) * (0.08 + (5-quality) * 0.02)))
    else:  # Incorrect response
        repetitions = 0
        interval = 1

    return repetitions, easiness, interval

# Database: FlashcardProgress table
# - easiness_factor (default 2.5)
# - repetitions, interval_days
# - next_review_date
\`\`\`

FRONTEND: Rating UI (1-5 scale)
- Again (1) - Complete blackout
- Hard (2) - Significant difficulty
- Good (3) - Correct with hesitation
- Easy (4) - Perfect response

STACK: SM-2 | PostgreSQL | SQLAlchemy`,
    position: 'bottom',
  },
  {
    target: 'quick-actions',
    title: 'Quick Actions',
    content: 'Take Quiz, Study Flashcards, or View Notebook.',
    details: `QUICK ACCESS TO:

TAKE QUIZ:
- Select question count and types
- Timed or untimed mode
- Immediate feedback with explanations

STUDY FLASHCARDS:
- Spaced repetition scheduling
- Rate your recall (1-5)
- Track mastery progress

VIEW NOTEBOOK:
- All saved explanations
- Missed questions review
- Study notes and highlights`,
    technicalDetails: `FRONTEND: React Router Links

\`\`\`typescript
// Quick action cards with routing
<Link to={\`/category/\${categoryId}/quiz\`}>
  <HelpCircle /> Take Quiz
  <span>{stats?.question_count || 0} questions</span>
</Link>

<Link to={\`/category/\${categoryId}/flashcards\`}>
  <BookOpen /> Study Flashcards
  <span>{stats?.flashcard_count || 0} cards</span>
</Link>

<Link to={\`/category/\${categoryId}/notebook\`}>
  <ClipboardList /> View Notebook
  <span>{stats?.notebook_count || 0} entries</span>
</Link>
\`\`\`

BACKEND ENDPOINTS:
- GET /api/categories/:id/quiz/start
- GET /api/categories/:id/flashcards/due
- GET /api/categories/:id/notebook

STACK: React Router v6 | lucide-react`,
    position: 'top',
  },
  {
    target: 'sample-questions-section',
    title: 'Sample Questions',
    content: 'Add example questions to guide AI generation style.',
    details: `TEACH THE AI YOUR STYLE:

Upload or manually add sample questions that show:
- Your preferred question format
- Typical difficulty level
- Phrasing and vocabulary
- Explanation style

The AI analyzes these patterns and applies them when generating new questions!`,
    technicalDetails: `BACKEND: Pattern Analysis Pipeline

\`\`\`python
# services/analysis_service.py
async def analyze_sample_questions(
    category_id: int
) -> AnalysisResult:
    samples = await get_sample_questions(category_id)

    # Build analysis prompt
    prompt = f"""
    Analyze these sample questions and extract:
    1. Writing style (formal/casual, technical level)
    2. Question patterns (length, structure)
    3. Common themes
    4. Difficulty distribution

    Samples:
    {format_samples(samples)}
    """

    # Call AI for analysis
    response = await ai_client.analyze(prompt)

    # Store analysis results
    analysis = SampleAnalysis(
        category_id=category_id,
        style_guide=response.style_guide,
        patterns=response.patterns,
        recommendations=response.recommendations
    )
    db.add(analysis)

    return analysis
\`\`\`

SUPPORTED FORMATS:
- JSON array of questions
- CSV with question columns
- PDF/DOCX (AI extracts questions)

STACK: OpenAI/Anthropic | Pydantic | PostgreSQL`,
    position: 'top',
    demoAssets: [
      { label: 'Download Sample Questions', filename: 'sample-questions.json' },
    ],
  },
  {
    target: null,
    title: 'Start Learning!',
    content: 'Upload a document to begin generating AI-powered content.',
    details: `YOU'RE ALL SET!

Next steps:
1. Upload your study materials (or use our sample files)
2. Click "Generate" to create questions or flashcards
3. Take quizzes to test your knowledge
4. Track progress in the Analytics dashboard

The more you study, the smarter the recommendations become!`,
    technicalDetails: `COMPLETE DATA FLOW

1. DOCUMENT UPLOAD
   Frontend -> POST /api/categories/:id/documents
   -> Text extraction -> PostgreSQL storage

2. AI GENERATION
   Frontend -> POST /api/categories/:id/generate-questions
   -> Document retrieval -> Sample analysis
   -> AI prompt building -> OpenAI/Anthropic call
   -> Structured parsing -> Database storage

3. QUIZ FLOW
   Frontend -> GET /api/categories/:id/quiz/start
   -> Question selection -> QuizSession creation
   POST /api/quiz/:id/question/:id/answer
   -> Answer validation -> QuestionAttempt logging
   -> Score calculation

4. ANALYTICS
   Frontend -> GET /api/analytics/dashboard
   -> QuestionAttempt aggregation
   -> Learning score calculation
   -> Trend analysis -> Response

5. SPACED REPETITION
   Frontend -> GET /api/categories/:id/flashcards/due
   -> SM-2 scheduling query
   POST /api/flashcards/:id/review
   -> SM-2 recalculation -> Next review date

INFRASTRUCTURE:
- Docker Compose orchestration
- PostgreSQL container
- FastAPI backend container
- Vite dev server / Nginx production`,
    position: 'bottom',
  },
];

export function getTourSteps(tourName: 'home' | 'category'): TourStep[] {
  return tourName === 'home' ? HOME_TOUR_STEPS : CATEGORY_TOUR_STEPS;
}
