# StudyForge Frontend Developer Documentation

## Overview

The StudyForge frontend is a React/TypeScript application built with Vite, featuring a modern design system, dark mode support, scroll animations, and comprehensive API integration with the FastAPI backend.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI Framework |
| TypeScript | 5.9.3 | Type Safety |
| Vite | 5.0.0 | Build Tool |
| Tailwind CSS | 3.3.5 | Styling |
| Axios | 1.6.2 | API Client |
| React Router DOM | 6.20.0 | Routing |
| Lucide React | 0.294.0 | Icons |
| ECharts | 6.0.0 | Charts (Analytics) |
| jsPDF | 3.0.4 | PDF Export |
| html2canvas | 1.4.1 | Screenshot for PDF |
| Framer Motion | 12.23.25 | Animations |

---

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Layout.tsx           # Main layout wrapper
│   │   ├── ScrollReveal.tsx     # Scroll animation component
│   │   ├── ErrorBoundary.tsx    # Error handling wrapper
│   │   ├── Toast.tsx            # Toast notifications
│   │   ├── TourOverlay.tsx      # Onboarding tour
│   │   ├── AILoadingIndicator.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ExplanationChat.tsx  # AI chat for explanations
│   │   └── ScientificInput.tsx  # Special input for formulas
│   │
│   ├── contexts/         # React Context providers
│   │   ├── AuthContext.tsx      # Authentication state
│   │   ├── ThemeContext.tsx     # Dark/Light mode
│   │   ├── ErrorContext.tsx     # Global error handling
│   │   └── TourContext.tsx      # Onboarding tour state
│   │
│   ├── hooks/            # Custom React hooks
│   │   └── useScrollAnimation.ts  # Intersection Observer hooks
│   │
│   ├── pages/            # Route components
│   │   ├── LandingPage.tsx      # Public landing (Swiss design)
│   │   ├── Home.tsx             # Categories dashboard
│   │   ├── LoginPage.tsx        # Auth page
│   │   ├── CategoryDashboard.tsx
│   │   ├── QuizPage.tsx         # Quiz setup
│   │   ├── QuizSession.tsx      # Active quiz
│   │   ├── QuizResults.tsx      # Results with PDF export
│   │   ├── QuestionBank.tsx     # Question management
│   │   ├── FlashcardsPage.tsx   # Spaced repetition study
│   │   ├── NotebookPage.tsx     # Wrong answers review
│   │   ├── AnalyticsDashboard.tsx # Learning analytics
│   │   └── NotFoundPage.tsx
│   │
│   ├── services/         # API layer
│   │   ├── api.ts               # Axios client + API functions
│   │   └── pdfExport.ts         # PDF generation service
│   │
│   ├── styles/
│   │   └── index.css            # Global styles + animations
│   │
│   ├── types/
│   │   └── index.ts             # TypeScript interfaces
│   │
│   ├── config/
│   │   └── tourSteps.ts         # Onboarding configuration
│   │
│   ├── App.tsx                  # Root component + routes
│   └── main.tsx                 # Entry point
│
├── .env                  # Development config
├── .env.test             # Test environment config
├── .env.production       # Production config
├── tailwind.config.js    # Tailwind + custom theme
├── vite.config.ts
└── package.json
```

---

## Design System

### Color Palette

The app uses a custom color palette defined in `tailwind.config.js`:

**Primary (Teal/Dark Blue)**
- `primary-500`: #033B4C (main)
- Range: 50-900

**Accent (Burgundy/Red)**
- `accent-500`: #801E2D (main)
- Range: 50-900

**Gold (Warm accent)**
- `gold-500`: #F3C677 (main)
- Range: 50-900

### Dark Mode Colors

Dark mode uses a separate palette with:
- **Surface colors**: `dark-surface-10` to `dark-surface-60` (neutral grays)
- **Tonal colors**: `dark-tonal-10` to `dark-tonal-60` (blue-tinted grays)
- **Primary tints**: `dark-primary-10` to `dark-primary-60` (blue accents)

### Semantic Colors
- **Success**: Green tones (#22946e, #47d5a6, #9ae8ce)
- **Warning**: Amber tones (#a87a2a, #d7ac61, #ecd7b2)
- **Danger**: Red tones (#9c2121, #d94a4a, #eb9e9e)
- **Info**: Purple tones (#65218a, #9e40d1, #c892e5)

---

## Swiss Design System (Landing Page)

The landing page uses Swiss International Typographic Style (Bauhaus-inspired):

### Typography Classes
```css
.swiss-heading     /* Massive uppercase, tight tracking */
.swiss-section-number  /* Section labels like "01. FEATURES" */
.swiss-btn         /* Square buttons, uppercase text */
```

### Responsive Typography
```javascript
'swiss-hero': ['clamp(4rem, 12vw, 10rem)', { lineHeight: '0.85' }]
'swiss-title': ['clamp(2.5rem, 6vw, 5rem)', { lineHeight: '0.9' }]
'swiss-subtitle': ['clamp(1.5rem, 3vw, 2.5rem)', { lineHeight: '1' }]
```

### Background Patterns
- `.swiss-grid-pattern` - 24px grid lines
- `.swiss-dots` - 16px dot matrix
- `.swiss-diagonal` - 45-degree stripes
- `.swiss-noise` - Subtle paper grain texture

---

## Scroll Animations

### ScrollReveal Component

Located at `src/components/ScrollReveal.tsx`:

```tsx
import { ScrollReveal } from '../components/ScrollReveal';

// Basic usage
<ScrollReveal animation="fade-up">
  <div>Content fades up when scrolled into view</div>
</ScrollReveal>

// With options
<ScrollReveal
  animation="fade-left"
  delay={200}
  duration="slow"
  threshold={0.2}
>
  <div>Custom animated content</div>
</ScrollReveal>
```

### Available Animations
| Animation | Description |
|-----------|-------------|
| `fade-up` | Fade in + slide up |
| `fade-down` | Fade in + slide down |
| `fade-left` | Fade in + slide from right |
| `fade-right` | Fade in + slide from left |
| `scale-up` | Fade in + scale from smaller |
| `scale-in` | Fade in + scale from larger |
| `rotate-in` | Fade in + rotate |
| `blur-in` | Fade in + blur clear |
| `clip-up` | Clip reveal from bottom |
| `clip-left` | Clip reveal from right |
| `bar-grow` | Horizontal bar growth |

### Duration Options
- `fast` - 0.3s
- `normal` - 0.6s (default)
- `slow` - 1s
- `slower` - 1.5s

### Delay Options
Delays: 100, 200, 300, 400, 500, 600, 700, 800ms

### useScrollAnimation Hook

For custom implementations:

```tsx
import { useScrollAnimation, useStaggeredAnimation, useParallax } from '../hooks/useScrollAnimation';

// Basic visibility detection
const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

// Staggered children animation
const { ref, getItemStyle } = useStaggeredAnimation(items.length, { staggerDelay: 100 });

// Parallax scrolling
const { ref, offset } = useParallax(0.5);
```

### Accessibility
All animations respect `prefers-reduced-motion: reduce` system preference.

---

## Dark Mode

### ThemeContext

```tsx
import { useTheme } from '../contexts/ThemeContext';

function Component() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <button onClick={toggleTheme}>
      {isDarkMode ? 'Light' : 'Dark'}
    </button>
  );
}
```

### Behavior
- Persists to localStorage (`scholarly-theme`)
- Respects system preference on first visit
- Listens for system theme changes

### CSS Usage
```css
/* Light mode (default) */
.card { @apply bg-white border-gray-200; }

/* Dark mode override */
.dark .card {
  background-color: #282828;
  border-color: #3f3f3f;
}
```

---

## API Integration

### API Client (`src/services/api.ts`)

The API client handles:
- Base URL configuration from environment
- JWT token injection
- Response normalization (wrapping/unwrapping)
- Error format normalization (FastAPI `detail` → `error`)

### API Modules

| Module | Purpose |
|--------|---------|
| `categoryApi` | CRUD for study categories |
| `documentApi` | Upload/manage documents, generate content |
| `quizApi` | Questions, sessions, quiz flow |
| `flashcardApi` | Flashcard CRUD, spaced repetition |
| `notebookApi` | Wrong answer tracking |
| `sampleQuestionApi` | Sample question management |
| `analysisApi` | AI analysis triggers |
| `quizEnhancedApi` | Focus tracking, handwriting, partial credit |
| `authApi` | Google OAuth, guest login |
| `analyticsApi` | Dashboard stats, trends, learning score |
| `aiApi` | AI explanations |

### Example Usage

```tsx
import { categoryApi, quizApi } from '../services/api';

// Get categories
const response = await categoryApi.getAll();
const categories = response.data.data.categories;

// Start quiz
const { data } = await quizApi.createSession(categoryId, {
  question_count: 10,
  question_types: ['multiple_choice', 'true_false'],
  use_spaced_repetition: true
});
```

---

## Environment Configuration

### Development (`.env`)
```env
VITE_GOOGLE_CLIENT_ID=...
# API defaults to localhost via vite proxy
```

### Test (`.env.test`)
```env
VITE_API_URL=http://Studyforge-test-backend.eba-rufp4rir.us-west-1.elasticbeanstalk.com
VITE_GOOGLE_CLIENT_ID=...
```

### Production (`.env.production`)
```env
VITE_API_URL=http://studyforge-backend-v2.eba-rufp4rir.us-west-1.elasticbeanstalk.com
VITE_GOOGLE_CLIENT_ID=...
```

### Building for Environments

```bash
# Development
npm run dev

# Test deployment
cp .env.test .env.production.local && npm run build

# Production deployment
npm run build
```

---

## Deployment

### AWS S3 Static Hosting

**Test Environment:**
```bash
aws s3 sync dist s3://studyforge-frontend-test --delete
```
URL: http://studyforge-frontend-test.s3-website-us-west-1.amazonaws.com

**Production Environment:**
```bash
aws s3 sync dist s3://studyforge-frontend --delete
```
URL: http://studyforge-frontend.s3-website-us-west-1.amazonaws.com

---

## Routing

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | LandingPage | Public landing page |
| `/login` | LoginPage | Authentication |
| `/dashboard` | Home | Category overview |
| `/analytics` | AnalyticsDashboard | Learning stats |
| `/category/:id` | CategoryDashboard | Category detail |
| `/category/:id/quiz` | QuizPage | Quiz setup |
| `/category/:id/quiz/session/:sid` | QuizSession | Active quiz |
| `/category/:id/quiz/results/:sid` | QuizResults | Quiz results |
| `/category/:id/question-bank` | QuestionBank | Manage questions |
| `/category/:id/flashcards` | FlashcardsPage | Study flashcards |
| `/category/:id/notebook` | NotebookPage | Review mistakes |

---

## Key Features

### 1. AI-Powered Content Generation
- Upload documents (PDF, DOCX, PPT, TXT)
- AI generates quizzes and flashcards
- Multi-agent analysis system

### 2. Quiz System
- Multiple question types (MC, T/F, written, fill-blank)
- Focus tracking for exam simulation
- Handwriting recognition
- Partial credit grading
- PDF export of results

### 3. Spaced Repetition Flashcards
- SM-2 algorithm scheduling
- Confidence-based progression
- Chapter filtering

### 4. Analytics Dashboard
- Learning score (accuracy, consistency, improvement, difficulty)
- Performance trends over time
- Category comparisons
- Study recommendations

### 5. Dark Mode
- System preference detection
- Persistent user preference
- Complete theme support

### 6. Onboarding Tour
- Guided walkthrough for new users
- Step-by-step feature introduction

---

## Common Patterns

### Loading States
```tsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchData().finally(() => setLoading(false));
}, []);

if (loading) return <div>Loading...</div>;
```

### Error Handling
```tsx
import { useError } from '../contexts/ErrorContext';

const { showError } = useError();

try {
  await api.call();
} catch (error) {
  showError(error.response?.data?.error || 'Something went wrong');
}
```

### Protected Routes
All routes under `<Layout />` require authentication via `AuthContext`.

---

## Development Commands

```bash
# Start dev server (localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## CSS Class Reference

### Buttons
- `.btn-primary` - Primary action button
- `.btn-secondary` - Secondary action
- `.btn-danger` - Destructive action
- `.swiss-btn-primary` - Swiss style primary
- `.swiss-btn-secondary` - Swiss style secondary

### Cards
- `.card` - Standard card with shadow and border

### Forms
- `.input` - Text input styling
- `.select` - Select dropdown styling

### Animations
- `.animate-swiss-slide-up` - Entry animation
- `.animate-swiss-fade-in` - Fade entry
- `.animate-swiss-float` - Floating effect
- `.animate-swiss-pulse` - Pulse effect
- `.scroll-fade-up.visible` - Scroll-triggered fade

---

## Troubleshooting

### CORS Issues
Ensure backend has proper CORS configuration for the frontend origin.

### API Response Mismatch
The `api.ts` interceptor handles wrapping. If issues persist, check:
- Backend returns expected field names
- Response structure matches TypeScript interfaces

### Dark Mode Not Persisting
Check localStorage for `scholarly-theme` key.

### Animations Not Working
1. Check for `prefers-reduced-motion` system setting
2. Verify element has proper ref attachment
3. Check CSS classes are applied

---

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md) - API contract validation guidelines
- Backend API docs in `backend-python/`
