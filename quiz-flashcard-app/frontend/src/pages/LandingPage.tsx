import React from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  BarChart3,
  Clock,
  FileText,
  Zap,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Target,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

function LandingPage(): React.ReactElement {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Generation',
      description: 'Upload any document and watch AI create quizzes and flashcards automatically. Supports PDF, DOCX, and text files.',
      color: '#8B5CF6',
    },
    {
      icon: Brain,
      title: 'Spaced Repetition',
      description: 'SM-2 algorithm schedules reviews at optimal intervals for maximum retention. Study smarter, not harder.',
      color: '#EC4899',
    },
    {
      icon: BarChart3,
      title: 'Smart Analytics',
      description: 'AI Learning Score tracks your progress across accuracy, consistency, improvement, and difficulty.',
      color: '#3B82F6',
    },
    {
      icon: Target,
      title: 'Adaptive Learning',
      description: 'Questions adapt to your skill level. Focus on weak areas with targeted practice from your notebook.',
      color: '#10B981',
    },
  ];

  const stats = [
    { label: 'Question Types', value: '4+', icon: FileText },
    { label: 'AI Agents', value: '6', icon: Zap },
    { label: 'Study Modes', value: '3', icon: BookOpen },
    { label: 'Exam Integrity', value: '100%', icon: Shield },
  ];

  const capabilities = [
    'Multiple choice, true/false, written, and fill-in-the-blank questions',
    'Handwriting recognition for written answers',
    'Conversational AI explanations for every question',
    'Exam proctoring with focus tracking',
    'PDF export for analytics and results',
    'Dark mode for late-night studying',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-dark-surface-10 dark:via-dark-surface-10 dark:to-dark-surface-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-dark-surface-10/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-surface-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 dark:from-dark-primary-10 dark:to-dark-primary-20 rounded-xl flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">StudyForge</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-30 transition-colors"
                title={isDarkMode ? 'Light mode' : 'Dark mode'}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <Link
                to="/dashboard"
                className="btn-primary"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-primary-100 dark:bg-dark-tonal-20 text-primary-700 dark:text-dark-primary-10 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4 mr-2" />
            Powered by Advanced AI
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Transform Your Notes Into
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400 dark:from-dark-primary-10 dark:to-dark-primary-30">
              Interactive Learning
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-3xl mx-auto">
            Upload any document and let AI generate personalized quizzes and flashcards.
            Track your progress with smart analytics and master any subject faster.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="btn-primary text-lg px-8 py-4 flex items-center space-x-2 shadow-lg hover:shadow-xl transition-shadow"
            >
              <span>Start Learning Free</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#features"
              className="btn-secondary text-lg px-8 py-4"
            >
              See How It Works
            </a>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white dark:bg-dark-surface-20 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-surface-30"
              >
                <stat.icon className="h-6 w-6 text-primary-500 dark:text-dark-primary-20 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-dark-surface-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Study Smarter
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Built with cutting-edge AI technology to maximize your learning efficiency
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 bg-gray-50 dark:bg-dark-surface-10 rounded-2xl hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-dark-surface-30"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: feature.color + '20' }}
                >
                  <feature.icon className="h-7 w-7" style={{ color: feature.color }} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Upload Your Content',
                description: 'Drop any PDF, DOCX, or text file. Our AI extracts and analyzes the content automatically.',
                icon: FileText,
              },
              {
                step: '2',
                title: 'AI Generates Content',
                description: 'Choose question types and difficulty. AI creates quizzes and flashcards tailored to your material.',
                icon: Sparkles,
              },
              {
                step: '3',
                title: 'Study & Track Progress',
                description: 'Take quizzes, review flashcards, and watch your AI Learning Score improve over time.',
                icon: TrendingUp,
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 dark:from-dark-primary-10 dark:to-dark-primary-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <item.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary-100 dark:bg-dark-tonal-20 rounded-full flex items-center justify-center text-primary-700 dark:text-dark-primary-10 font-bold text-sm md:hidden">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary-300 to-transparent dark:from-dark-primary-30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-600 to-primary-700 dark:from-dark-primary-10 dark:to-dark-primary-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Packed with Powerful Features
              </h2>
              <p className="text-primary-100 dark:text-gray-300 text-lg mb-8">
                Everything you need for effective studying, powered by a multi-agent AI system.
              </p>
              <ul className="space-y-4">
                {capabilities.map((capability, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircle className="h-6 w-6 text-primary-200 dark:text-dark-primary-30 flex-shrink-0 mt-0.5" />
                    <span className="text-white">{capability}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white dark:bg-dark-surface-20 rounded-2xl p-8 shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface-10 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Quiz Completed</span>
                  </div>
                  <span className="text-green-600 dark:text-green-400 font-semibold">85%</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface-10 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Learning Score</span>
                  </div>
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">78</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface-10 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Study Streak</span>
                  </div>
                  <span className="text-orange-600 dark:text-orange-400 font-semibold">5 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-dark-surface-10">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">
            Built With Modern Technology
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {['React', 'TypeScript', 'FastAPI', 'PostgreSQL', 'SQLAlchemy', 'Tailwind CSS', 'AI/LLM'].map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 bg-white dark:bg-dark-surface-20 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-surface-30"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Transform Your Study Routine?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-10">
            Join thousands of students using AI to learn faster and retain more.
          </p>
          <Link
            to="/dashboard"
            className="btn-primary text-lg px-10 py-4 inline-flex items-center space-x-2 shadow-lg hover:shadow-xl transition-shadow"
          >
            <span>Get Started Now</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-dark-surface-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-primary-500 dark:text-dark-primary-20" />
            <span className="font-semibold text-gray-900 dark:text-white">StudyForge</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Built for the future of learning
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
