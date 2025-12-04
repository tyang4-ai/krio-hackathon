import React from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  BarChart3,
  FileText,
  Zap,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Target,
  TrendingUp,
  Shield,
  Star,
  Github,
  Linkedin,
  Mail,
  Sun,
  Moon,
  Plus,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, StaggerReveal } from '../components/ScrollReveal';

// Data
const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Generation',
    description: 'Upload any document and watch AI create quizzes and flashcards automatically. Supports PDF, DOCX, PPT, and text files.',
  },
  {
    icon: Brain,
    title: 'Spaced Repetition',
    description: 'SM-2 algorithm schedules reviews at optimal intervals for maximum retention. Study smarter, not harder.',
  },
  {
    icon: BarChart3,
    title: 'Smart Analytics',
    description: 'AI Learning Score tracks your progress across accuracy, consistency, improvement, and difficulty.',
  },
  {
    icon: Target,
    title: 'Adaptive Learning',
    description: 'Questions adapt to your skill level. Focus on weak areas with targeted practice from your notebook.',
  },
];

const stats = [
  { label: 'Question Types', value: '4+', icon: FileText },
  { label: 'AI Agents', value: '6', icon: Zap },
  { label: 'Study Modes', value: '3', icon: BookOpen },
  { label: 'Exam Integrity', value: '100%', icon: Shield },
];

const steps = [
  {
    step: '01',
    title: 'Upload Your Materials',
    description: 'Drop any PDF, DOCX, PPT, or text file. Our AI analyzes and understands your content.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'AI Forges Content',
    description: 'Advanced AI creates personalized quizzes and flashcards tailored to your material.',
    icon: Sparkles,
  },
  {
    step: '03',
    title: 'Master & Progress',
    description: 'Study with spaced repetition and track your improvement with smart analytics.',
    icon: TrendingUp,
  },
];

const capabilities = [
  'Multiple choice, true/false, written, and fill-in-the-blank questions',
  'Handwriting recognition for written answers',
  'Conversational AI explanations for every question',
  'Exam proctoring with focus tracking',
  'PDF export for analytics and results',
  'Dark mode for late-night studying',
];

const reviews = [
  {
    name: 'Sarah Chen',
    role: 'Medical Student',
    rating: 5,
    text: 'StudyForge transformed how I prepare for exams. The AI-generated questions are incredibly relevant!',
  },
  {
    name: 'Marcus Johnson',
    role: 'Law Student',
    rating: 5,
    text: 'The spaced repetition feature helped me retain case law details I would have forgotten otherwise.',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Engineering Major',
    rating: 5,
    text: 'Finally, a study tool that understands technical content. The flashcards are perfect for formulas.',
  },
  {
    name: 'David Kim',
    role: 'High School Senior',
    rating: 5,
    text: 'My SAT prep became so much easier. I improved my score by 200 points using StudyForge!',
  },
];

function LandingPage(): React.ReactElement {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-dark-surface-10 text-gray-100' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 border-b-4 ${
        isDarkMode ? 'bg-dark-surface-10 border-dark-primary-10' : 'bg-white border-accent-500'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="group">
              <span className={`text-2xl font-black uppercase tracking-tight transition-colors duration-200 ${
                isDarkMode
                  ? 'text-dark-primary-10 group-hover:text-white'
                  : 'text-accent-500 group-hover:text-primary-500'
              }`}>
                STUDYFORGE
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center">
              {['FEATURES', 'METHOD', 'REVIEWS', 'ABOUT'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className={`px-6 py-2 text-sm font-bold uppercase tracking-widest border-b-2 border-transparent transition-all duration-200 ${
                    isDarkMode
                      ? 'text-gray-400 hover:text-dark-primary-10 hover:border-dark-primary-10'
                      : 'text-gray-600 hover:text-accent-500 hover:border-accent-500'
                  }`}
                >
                  {item}
                </a>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className={`p-3 border-2 transition-all duration-200 ${
                  isDarkMode
                    ? 'border-gray-600 text-gray-400 hover:border-dark-primary-10 hover:text-dark-primary-10'
                    : 'border-gray-300 text-gray-600 hover:border-accent-500 hover:text-accent-500'
                }`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <Link
                to="/dashboard"
                className={`hidden sm:block px-6 py-3 font-bold uppercase tracking-wider transition-colors duration-200 ${
                  isDarkMode
                    ? 'bg-dark-primary-10 text-white hover:bg-white hover:text-dark-surface-10'
                    : 'bg-accent-500 text-white hover:bg-primary-500'
                }`}
              >
                START
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen pt-20 relative overflow-hidden">
        <div className="relative min-h-[calc(100vh-5rem)]">
          {/* Left Content Area */}
          <div className="relative z-10 px-4 sm:px-6 lg:px-12 xl:px-20 pt-16 sm:pt-24 lg:pt-32 swiss-grid-pattern max-w-[50%] lg:max-w-[55%]">
            <div className="max-w-3xl">
              <p className={`swiss-section-number mb-4 animate-swiss-slide-up opacity-0 ${
                isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'
              }`} style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                01. SYSTEM
              </p>
              <h1 className={`text-swiss-hero font-black uppercase tracking-tighter mb-8 animate-swiss-slide-up opacity-0 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`} style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
                STUDY
                <br />
                FORGE
              </h1>

              {/* Accent bar */}
              <div className={`w-24 h-2 mb-8 animate-swiss-bar opacity-0 ${
                isDarkMode ? 'bg-dark-primary-10' : 'bg-accent-500'
              }`} style={{ animationDelay: '400ms', animationFillMode: 'forwards' }} />

              <p className={`text-xl font-medium mb-12 max-w-lg animate-swiss-slide-up opacity-0 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`} style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
                Transform documents into mastery. AI-powered learning tools that adapt to how you study.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 mb-16 animate-swiss-slide-up opacity-0" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
                <Link
                  to="/dashboard"
                  className={`group px-8 py-4 font-bold uppercase tracking-wider border-2 flex items-center transition-all duration-200 hover:scale-[1.02] ${
                    isDarkMode
                      ? 'bg-dark-primary-10 text-white border-dark-primary-10 hover:bg-transparent hover:text-dark-primary-10'
                      : 'bg-accent-500 text-white border-accent-500 hover:bg-transparent hover:text-accent-500'
                  }`}
                >
                  ENTER THE FORGE
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
                <a
                  href="#features"
                  className={`px-8 py-4 font-bold uppercase tracking-wider border-2 transition-all duration-200 hover:scale-[1.02] ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-300 hover:border-dark-primary-10 hover:text-dark-primary-10'
                      : 'border-gray-400 text-gray-700 hover:border-accent-500 hover:text-accent-500'
                  }`}
                >
                  EXPLORE
                </a>
              </div>

              {/* Stats Row */}
              <div className={`inline-flex border-2 animate-swiss-slide-up opacity-0 ${
                isDarkMode ? 'border-dark-primary-10' : 'border-accent-500'
              }`} style={{ animationDelay: '700ms', animationFillMode: 'forwards' }}>
                {stats.map((stat, i) => (
                  <div
                    key={i}
                    className={`px-6 py-4 transition-all duration-200 group cursor-default hover:scale-105 ${
                      i !== stats.length - 1 ? (isDarkMode ? 'border-r border-dark-primary-10/30' : 'border-r border-accent-500/30') : ''
                    } ${
                      isDarkMode
                        ? 'hover:bg-dark-primary-10 hover:text-dark-surface-10'
                        : 'hover:bg-accent-500 hover:text-white'
                    }`}
                  >
                    <div className="text-2xl font-black">{stat.value}</div>
                    <div className={`text-xs uppercase tracking-widest ${
                      isDarkMode ? 'text-gray-500 group-hover:text-dark-surface-10/70' : 'text-gray-500 group-hover:text-white/70'
                    }`}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Geometric Panel - Bauhaus Eye Composition */}
          <div className="hidden lg:block absolute right-0 top-0 w-[50%] xl:w-[55%] h-full pointer-events-none">
            <div className="relative w-full h-full overflow-hidden">

              {/* === LAYER 1: CENTER BAR (behind eye) === */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[90px] h-full animate-swiss-fade-in opacity-0 ${
                isDarkMode ? 'bg-gray-100/90' : 'bg-gray-900/90'
              }`} style={{ animationDelay: '300ms', animationFillMode: 'forwards' }} />

              {/* === LAYER 2: EYE SHAPE === */}
              <svg
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 animate-swiss-pulse"
                width="500"
                height="280"
                viewBox="0 0 500 280"
                style={{ animationDuration: '6s' }}
              >
                <ellipse cx="250" cy="140" rx="240" ry="120" fill={isDarkMode ? '#e5e5e5' : '#FFF8E7'} />
              </svg>

              {/* === LAYER 3: CENTER CIRCLE (pupil) === */}
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130px] h-[130px] rounded-full z-20 animate-swiss-pulse ${
                isDarkMode ? 'bg-dark-primary-10' : 'bg-accent-500'
              }`} style={{ animationDuration: '4s', animationDelay: '500ms' }} />

              {/* === LAYER 4: CURVES - wrapping OUTSIDE the eye === */}

              {/* Accent C-curve - wrapping around RIGHT tip of eye */}
              <svg
                className="absolute top-1/2 -translate-y-1/2 z-30 animate-swiss-float"
                style={{ left: 'calc(50% + 140px)', animationDuration: '5s', animationDelay: '200ms' }}
                width="260"
                height="260"
                viewBox="0 0 260 260"
              >
                <circle
                  cx="130"
                  cy="130"
                  r="100"
                  fill="none"
                  stroke={isDarkMode ? '#407dc7' : '#801E2D'}
                  strokeWidth="32"
                  strokeLinecap="butt"
                  strokeDasharray="314 314"
                  strokeDashoffset="78"
                />
              </svg>

              {/* Primary arc - wrapping around LEFT tip of eye */}
              <svg
                className="absolute top-1/2 -translate-y-1/2 z-30 animate-swiss-float"
                style={{ right: 'calc(50% + 140px)', animationDuration: '6s', animationDelay: '400ms' }}
                width="240"
                height="240"
                viewBox="0 0 240 240"
              >
                <circle
                  cx="120"
                  cy="120"
                  r="90"
                  fill="none"
                  stroke={isDarkMode ? '#407dc7' : '#033B4C'}
                  strokeWidth="28"
                  strokeLinecap="butt"
                  strokeDasharray="283 283"
                  strokeDashoffset="-141"
                />
              </svg>

              {/* Black arc - BOTTOM of composition */}
              <svg
                className="absolute left-1/2 -translate-x-1/2 z-30 animate-swiss-float"
                style={{ top: 'calc(50% + 90px)', animationDuration: '4.5s', animationDelay: '600ms' }}
                width="180"
                height="180"
                viewBox="0 0 180 180"
              >
                <circle
                  cx="90"
                  cy="90"
                  r="65"
                  fill="none"
                  stroke={isDarkMode ? '#e5e5e5' : '#1a1a2e'}
                  strokeWidth="24"
                  strokeLinecap="butt"
                  strokeDasharray="102 306"
                  strokeDashoffset="25"
                />
              </svg>

              {/* === LAYER 5: ACCENT ELEMENTS === */}

              {/* Solid primary square - top left area */}
              <div className={`absolute z-5 animate-swiss-float ${
                isDarkMode ? 'bg-dark-primary-10/80' : 'bg-primary-500/80'
              }`} style={{ top: 'calc(50% - 160px)', right: 'calc(50% + 80px)', width: '90px', height: '90px', animationDuration: '7s' }} />

              {/* Grid pattern - dynamic parallelograms */}
              <div className="absolute top-[18%] left-1/2 -translate-x-1/2 z-40 animate-swiss-pulse" style={{ animationDuration: '5s' }}>
                <div className="grid grid-cols-5 gap-[6px]">
                  {[...Array(25)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-[10px] h-[10px] transition-all duration-300 ${
                        isDarkMode ? 'bg-dark-primary-10' : 'bg-gold-400'
                      }`}
                      style={{
                        transform: 'skewX(-12deg)',
                        animationDelay: `${i * 30}ms`
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* === DECORATIVE ELEMENTS === */}

              {/* Top right corner - split triangle */}
              <div className="absolute top-20 right-10 w-[80px] h-[80px] z-50 animate-swiss-slide-left opacity-0" style={{ animationDelay: '800ms', animationFillMode: 'forwards' }}>
                <div
                  className={`absolute inset-0 ${isDarkMode ? 'bg-gray-100/80' : 'bg-gray-900/80'}`}
                  style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
                />
                <div
                  className={`absolute inset-0 ${isDarkMode ? 'bg-dark-primary-10/80' : 'bg-primary-500/80'}`}
                  style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }}
                />
              </div>

              {/* Horizontal stripes - bottom right */}
              <div className="absolute bottom-16 right-10 flex flex-col items-end gap-[8px] z-50">
                {[100, 80, 60, 40].map((width, i) => (
                  <div
                    key={i}
                    className={`h-[8px] animate-swiss-bar opacity-0 ${isDarkMode ? 'bg-dark-primary-10/70' : 'bg-accent-500/70'}`}
                    style={{ width: `${width}px`, animationDelay: `${900 + i * 100}ms`, animationFillMode: 'forwards' }}
                  />
                ))}
              </div>

              {/* Color bars - top left */}
              <div className="absolute top-16 left-8 flex gap-[5px] z-50">
                {[
                  { width: 60, color: isDarkMode ? 'bg-gray-100/70' : 'bg-gold-200/70' },
                  { width: 30, color: isDarkMode ? 'bg-dark-primary-10/70' : 'bg-accent-500/70' },
                  { width: 20, color: isDarkMode ? 'bg-gray-300/70' : 'bg-gray-900/70' },
                  { width: 30, color: isDarkMode ? 'bg-dark-primary-10/70' : 'bg-primary-500/70' },
                ].map((bar, i) => (
                  <div
                    key={i}
                    className={`h-[10px] animate-swiss-bar opacity-0 ${bar.color}`}
                    style={{ width: `${bar.width}px`, animationDelay: `${700 + i * 80}ms`, animationFillMode: 'forwards' }}
                  />
                ))}
              </div>

              {/* Diagonal parallelograms - top right area */}
              <div className="absolute top-24 right-32 flex gap-[4px] z-50">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-[8px] h-[24px] animate-swiss-slide-up opacity-0 ${isDarkMode ? 'bg-gray-100/50' : 'bg-gold-200/50'}`}
                    style={{ transform: 'skewX(-15deg)', animationDelay: `${1000 + i * 100}ms`, animationFillMode: 'forwards' }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative swiss-dots"
      >
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Section Header */}
          <ScrollReveal animation="fade-up" className="mb-16 lg:mb-20">
            <p className={`swiss-section-number mb-2 ${
              isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'
            }`}>
              02. FEATURES
            </p>
            <h2 className={`text-swiss-title font-black uppercase tracking-tight ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              FORGE YOUR
              <br />
              KNOWLEDGE
            </h2>
          </ScrollReveal>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {features.map((feature, index) => (
              <ScrollReveal
                key={index}
                animation={index % 2 === 0 ? 'fade-right' : 'fade-left'}
                delay={(index % 2) * 200 as 0 | 200}
              >
                <div
                  className={`p-8 border-2 group transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${
                    isDarkMode
                      ? 'border-gray-700 hover:bg-dark-primary-10 hover:border-dark-primary-10'
                      : 'border-gray-300 hover:bg-accent-500 hover:border-accent-500'
                  }`}
                >
                  <feature.icon className={`h-12 w-12 mb-6 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110 ${
                    isDarkMode
                      ? 'text-dark-primary-10 group-hover:text-dark-surface-10'
                      : 'text-accent-500 group-hover:text-white'
                  }`} />
                  <h3 className={`text-2xl font-black uppercase tracking-tight mb-4 transition-colors duration-200 ${
                    isDarkMode
                      ? 'text-white group-hover:text-dark-surface-10'
                      : 'text-gray-900 group-hover:text-white'
                  }`}>
                    {feature.title}
                  </h3>
                  <p className={`transition-colors duration-200 ${
                    isDarkMode
                      ? 'text-gray-400 group-hover:text-dark-surface-10/80'
                      : 'text-gray-600 group-hover:text-white/80'
                  }`}>
                    {feature.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="method"
        className={`py-24 lg:py-32 px-4 sm:px-6 lg:px-8 ${
          isDarkMode ? 'bg-dark-surface-20' : 'bg-gray-100'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <ScrollReveal animation="fade-up">
            <p className={`swiss-section-number mb-2 ${
              isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'
            }`}>
              03. METHOD
            </p>
            <h2 className={`text-swiss-title font-black uppercase tracking-tight mb-16 lg:mb-20 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              THE FORGING
              <br />
              PROCESS
            </h2>
          </ScrollReveal>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {steps.map((step, index) => (
              <ScrollReveal
                key={index}
                animation="fade-up"
                delay={(index * 200) as 0 | 200 | 400 | 600}
              >
                <div
                  className={`p-8 border-l-4 relative group transition-all duration-300 hover:scale-[1.02] ${
                    isDarkMode
                      ? 'border-dark-primary-10 hover:bg-dark-primary-10'
                      : 'border-accent-500 hover:bg-accent-500'
                  }`}
                >
                  {/* Large Step Number */}
                  <span className={`absolute top-4 right-4 text-8xl font-black transition-all duration-300 group-hover:scale-110 ${
                    isDarkMode
                      ? 'text-gray-800 group-hover:text-dark-surface-10/20'
                      : 'text-gray-200 group-hover:text-white/20'
                  }`}>
                    {step.step}
                  </span>

                  <step.icon className={`h-10 w-10 mb-6 relative z-10 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110 ${
                    isDarkMode
                      ? 'text-dark-primary-10 group-hover:text-dark-surface-10'
                      : 'text-accent-500 group-hover:text-white'
                  }`} />
                  <h3 className={`text-xl font-black uppercase tracking-tight mb-4 relative z-10 transition-colors duration-200 ${
                    isDarkMode
                      ? 'text-white group-hover:text-dark-surface-10'
                      : 'text-gray-900 group-hover:text-white'
                  }`}>
                    {step.title}
                  </h3>
                  <p className={`relative z-10 transition-colors duration-200 ${
                    isDarkMode
                      ? 'text-gray-400 group-hover:text-dark-surface-10/80'
                      : 'text-gray-600 group-hover:text-white/80'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section
        className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 relative swiss-diagonal"
      >
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left: Checklist */}
            <div>
              <ScrollReveal animation="fade-right">
                <p className={`swiss-section-number mb-2 ${
                  isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'
                }`}>
                  04. ADVANTAGES
                </p>
                <h2 className={`text-swiss-title font-black uppercase tracking-tight mb-12 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  PACKED WITH
                  <br />
                  <span className={isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'}>
                    POWERFUL FEATURES
                  </span>
                </h2>
              </ScrollReveal>

              <ul className="space-y-4">
                {capabilities.map((capability, index) => (
                  <ScrollReveal
                    key={index}
                    animation="fade-right"
                    delay={(index * 100) as 0 | 100 | 200 | 300 | 400 | 500 | 600}
                  >
                    <li className="flex items-start space-x-4 transition-all duration-300 hover:translate-x-2">
                      <CheckCircle className={`h-6 w-6 flex-shrink-0 mt-0.5 transition-transform duration-300 hover:scale-110 ${
                        isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'
                      }`} />
                      <span className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>
                        {capability}
                      </span>
                    </li>
                  </ScrollReveal>
                ))}
              </ul>
            </div>

            {/* Right: Demo Card */}
            <ScrollReveal animation="fade-left" delay={200}>
              <div className={`p-8 border-2 transition-all duration-300 hover:scale-[1.02] ${
                isDarkMode ? 'bg-dark-surface-20 border-gray-700' : 'bg-white border-gray-300'
              }`}>
                <div className="space-y-4">
                  {[
                    { label: 'Quiz Completed', value: '85%', color: 'green' },
                    { label: 'Learning Score', value: '78', color: 'blue' },
                    { label: 'Study Streak', value: '5 days', color: 'orange' },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-4 border-l-4 transition-all duration-300 hover:translate-x-1 ${
                        isDarkMode ? 'bg-dark-surface-10' : 'bg-gray-50'
                      } ${
                        item.color === 'green'
                          ? isDarkMode ? 'border-success' : 'border-green-500'
                          : item.color === 'blue'
                          ? isDarkMode ? 'border-dark-primary-10' : 'border-primary-500'
                          : isDarkMode ? 'border-warning' : 'border-orange-500'
                      }`}
                    >
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {item.label}
                      </span>
                      <span className={`font-bold text-xl ${
                        item.color === 'green'
                          ? isDarkMode ? 'text-success' : 'text-green-500'
                          : item.color === 'blue'
                          ? isDarkMode ? 'text-dark-primary-10' : 'text-primary-500'
                          : isDarkMode ? 'text-warning' : 'text-orange-500'
                      }`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section
        id="reviews"
        className={`py-24 lg:py-32 px-4 sm:px-6 lg:px-8 ${
          isDarkMode ? 'bg-dark-surface-20' : 'bg-gray-100'
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <ScrollReveal animation="fade-up">
            <p className={`swiss-section-number mb-2 ${
              isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'
            }`}>
              05. TESTIMONIALS
            </p>
            <h2 className={`text-swiss-title font-black uppercase tracking-tight mb-16 lg:mb-20 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              VOICES FROM
              <br />
              THE FORGE
            </h2>
          </ScrollReveal>

          {/* Review Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reviews.map((review, index) => (
              <ScrollReveal
                key={index}
                animation="scale-up"
                delay={(index * 100) as 0 | 100 | 200 | 300}
              >
                <div
                  className={`p-6 border-2 border-t-4 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 h-full ${
                    isDarkMode
                      ? 'border-gray-700 border-t-dark-primary-10 hover:border-dark-primary-10'
                      : 'border-gray-300 border-t-accent-500 hover:border-accent-500'
                  }`}
                >
                  {/* Rating */}
                  <div className={`flex mb-4 ${isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'}`}>
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current transition-transform duration-200 hover:scale-125" />
                    ))}
                  </div>

                  <p className={`mb-6 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    "{review.text}"
                  </p>

                  <div className={`border-t pt-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className={`font-bold uppercase tracking-wider text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {review.name}
                    </div>
                    <div className={`text-xs uppercase tracking-widest ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {review.role}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-6xl mx-auto">
          <ScrollReveal animation="fade-up">
            <p className={`swiss-section-number mb-2 ${
              isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'
            }`}>
              06. ABOUT
            </p>
            <h2 className={`text-swiss-title font-black uppercase tracking-tight mb-12 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              ABOUT THE
              <br />
              CREATOR
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Author Card */}
            <ScrollReveal animation="fade-right" className="lg:col-span-2">
              <div className={`p-8 border-2 transition-all duration-300 hover:scale-[1.01] h-full ${
                isDarkMode ? 'border-gray-700' : 'border-gray-300'
              }`}>
                <div className="flex flex-col md:flex-row items-start gap-8">
                  <div className={`w-32 h-32 flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105 ${
                    isDarkMode ? 'bg-dark-primary-10' : 'bg-accent-500'
                  }`}>
                    <span className="text-5xl">👨‍💻</span>
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      [Your Name]
                    </h3>
                    <p className={`mb-4 ${isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'}`}>
                      Creator & Developer
                    </p>
                    <p className={`leading-relaxed mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      [Your bio will go here. Share your story, your passion for education technology,
                      and what inspired you to build StudyForge. Talk about your background, your
                      vision for the project, and what drives you to help students learn more effectively.]
                    </p>
                    <div className="flex space-x-4">
                      {[Github, Linkedin, Mail].map((Icon, i) => (
                        <a
                          key={i}
                          href="#"
                          className={`p-3 border-2 transition-all duration-200 hover:scale-110 ${
                            isDarkMode
                              ? 'border-gray-600 text-gray-400 hover:border-dark-primary-10 hover:text-dark-primary-10'
                              : 'border-gray-300 text-gray-500 hover:border-accent-500 hover:text-accent-500'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Hackathon Card */}
            <ScrollReveal animation="fade-left" delay={200}>
              <div className={`p-8 border-2 transition-all duration-300 hover:scale-[1.02] h-full ${
                isDarkMode
                  ? 'border-dark-primary-10 bg-dark-primary-10/10'
                  : 'border-accent-500 bg-accent-500/10'
              }`}>
                <div className="flex items-center space-x-3 mb-6">
                  <Plus className={`h-6 w-6 transition-transform duration-300 hover:rotate-90 ${isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'}`} />
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'}`}>
                    For the Hackathon
                  </h3>
                </div>
                <p className={`leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  StudyForge was built for [Hackathon Name]. This project represents
                  [X hours/days] of passionate development, combining cutting-edge AI
                  with thoughtful UX design to revolutionize how students learn.
                </p>
                <div className="space-y-3 text-sm">
                  <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    <span className={`inline-block w-24 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Tech Stack:
                    </span>
                    <span>React, FastAPI, PostgreSQL, AI/LLM</span>
                  </div>
                  <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    <span className={`inline-block w-24 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Category:
                    </span>
                    <span>Education Technology</span>
                  </div>
                  <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    <span className={`inline-block w-24 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Status:
                    </span>
                    <span className={`font-medium ${isDarkMode ? 'text-success' : 'text-green-500'}`}>
                      Live & Running
                    </span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section
        className={`py-24 lg:py-32 px-4 sm:px-6 lg:px-8 ${
          isDarkMode ? 'bg-dark-primary-10 text-dark-surface-10' : 'bg-accent-500 text-white'
        }`}
      >
        <div className="max-w-4xl mx-auto text-center">
          <ScrollReveal animation="scale-up">
            <p className={`swiss-section-number mb-4 ${
              isDarkMode ? 'text-dark-surface-10/60' : 'text-white/60'
            }`}>
              07. ACTION
            </p>
            <h2 className="text-swiss-title font-black uppercase tracking-tight mb-8">
              READY TO
              <br />
              FORGE YOUR
              <br />
              FUTURE?
            </h2>
            <p className={`text-xl mb-12 max-w-2xl mx-auto ${
              isDarkMode ? 'text-dark-surface-10/80' : 'text-white/80'
            }`}>
              Join students transforming study habits with AI-powered learning.
            </p>
            <Link
              to="/dashboard"
              className={`inline-flex items-center px-12 py-5 font-bold uppercase tracking-wider text-lg transition-all duration-300 hover:scale-105 ${
                isDarkMode
                  ? 'bg-dark-surface-10 text-dark-primary-10 hover:bg-white'
                  : 'bg-white text-accent-500 hover:bg-primary-500 hover:text-white'
              }`}
            >
              START LEARNING NOW
              <ArrowRight className="ml-3 h-6 w-6 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 px-4 sm:px-6 lg:px-8 border-t-4 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-300'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-8 items-center">
            <div className="col-span-12 md:col-span-4">
              <span className={`text-xl font-black uppercase tracking-tight ${
                isDarkMode ? 'text-dark-primary-10' : 'text-accent-500'
              }`}>
                STUDYFORGE
              </span>
            </div>
            <div className="col-span-12 md:col-span-4 text-center">
              <p className={`text-sm uppercase tracking-widest ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Where Knowledge Is Forged
              </p>
            </div>
            <div className="col-span-12 md:col-span-4 flex justify-start md:justify-end space-x-4">
              {[Github, Linkedin, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className={`p-2 border-2 transition-colors duration-200 ${
                    isDarkMode
                      ? 'border-gray-600 text-gray-400 hover:border-dark-primary-10 hover:text-dark-primary-10'
                      : 'border-gray-300 text-gray-400 hover:border-accent-500 hover:text-accent-500'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
