import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
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
  Star,
  Quote,
  Github,
  Linkedin,
  Mail,
  ChevronDown,
  Flame,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(243, 198, 119, 0.3)',
      '0 0 40px rgba(243, 198, 119, 0.5)',
      '0 0 20px rgba(243, 198, 119, 0.3)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// Animated Section Component
function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Floating Particle Component
function FloatingParticle({ delay = 0, size = 4, x = 0, duration = 20 }: { delay?: number; size?: number; x?: number; duration?: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-gold-500/30"
      style={{ width: size, height: size, left: `${x}%` }}
      animate={{
        y: [800, -100],
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1, 1, 0.5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

// Forge Ember Component (for dark mode - night embers)
function ForgeEmber({ delay = 0 }: { delay?: number }) {
  const x = Math.random() * 100;
  const size = Math.random() * 6 + 2;
  const duration = Math.random() * 10 + 15;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        background: `radial-gradient(circle, #F3C677 0%, #801E2D 50%, transparent 100%)`,
      }}
      animate={{
        y: [600, -50],
        x: [0, Math.random() * 100 - 50],
        opacity: [0, 1, 0.8, 0],
        scale: [0.2, 1, 0.8, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

// Subtle Burning Flame Component (for light mode - day)
function BurningFlame({ delay = 0 }: { delay?: number }) {
  const x = Math.random() * 100;
  const size = Math.random() * 8 + 4;
  const duration = Math.random() * 8 + 10;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        bottom: 0,
        background: `radial-gradient(circle, rgba(251, 191, 36, 0.8) 0%, rgba(249, 115, 22, 0.5) 40%, transparent 100%)`,
      }}
      animate={{
        y: [0, -150, -300],
        x: [0, Math.random() * 40 - 20],
        opacity: [0, 0.6, 0.3, 0],
        scale: [0.5, 1, 0.6, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

// Floating Cloud Component (for light mode)
function FloatingCloud({ x = 0, y = 0, size = 100, delay = 0 }: { x?: number; y?: number; size?: number; delay?: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-white/20 blur-xl"
      style={{
        width: size,
        height: size * 0.6,
        left: `${x}%`,
        top: `${y}%`,
      }}
      animate={{
        x: [0, 30, 0],
        opacity: [0.2, 0.4, 0.2],
      }}
      transition={{
        duration: 20,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// Twinkling Star Component (for dark mode)
function TwinklingStar({ x = 0, y = 0, size = 2, delay = 0 }: { x?: number; y?: number; size?: number; delay?: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-white"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
      }}
      animate={{
        opacity: [0.2, 1, 0.2],
        scale: [0.8, 1.2, 0.8],
      }}
      transition={{
        duration: 2 + Math.random() * 2,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

function LandingPage(): React.ReactElement {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Generation',
      description: 'Upload any document and watch AI create quizzes and flashcards automatically. Supports PDF, DOCX, PPT, and text files.',
      color: '#F3C677',
    },
    {
      icon: Brain,
      title: 'Spaced Repetition',
      description: 'SM-2 algorithm schedules reviews at optimal intervals for maximum retention. Study smarter, not harder.',
      color: '#801E2D',
    },
    {
      icon: BarChart3,
      title: 'Smart Analytics',
      description: 'AI Learning Score tracks your progress across accuracy, consistency, improvement, and difficulty.',
      color: '#033B4C',
    },
    {
      icon: Target,
      title: 'Adaptive Learning',
      description: 'Questions adapt to your skill level. Focus on weak areas with targeted practice from your notebook.',
      color: '#407dc7',
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

  const reviews = [
    {
      name: 'Sarah Chen',
      role: 'Medical Student',
      avatar: '👩‍⚕️',
      rating: 5,
      text: 'StudyForge transformed how I prepare for exams. The AI-generated questions are incredibly relevant!',
    },
    {
      name: 'Marcus Johnson',
      role: 'Law Student',
      avatar: '👨‍⚖️',
      rating: 5,
      text: 'The spaced repetition feature helped me retain case law details I would have forgotten otherwise.',
    },
    {
      name: 'Emily Rodriguez',
      role: 'Engineering Major',
      avatar: '👩‍💻',
      rating: 5,
      text: 'Finally, a study tool that understands technical content. The flashcards are perfect for formulas.',
    },
    {
      name: 'David Kim',
      role: 'High School Senior',
      avatar: '📚',
      rating: 5,
      text: 'My SAT prep became so much easier. I improved my score by 200 points using StudyForge!',
    },
  ];

  // Generate random star positions for dark mode
  const starPositions = React.useMemo(() =>
    [...Array(50)].map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3,
    })), []
  );

  return (
    <div className={`min-h-screen overflow-hidden transition-colors duration-500 ${
      isDarkMode
        ? 'bg-dark-surface-10 text-white'
        : 'bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-100 text-gray-900'
    }`}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* DARK MODE - Night Sky with Stars and Embers */}
        {isDarkMode && (
          <>
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(243, 198, 119, 0.5) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(243, 198, 119, 0.5) 1px, transparent 1px)`,
                backgroundSize: '50px 50px',
              }}
            />

            {/* Twinkling Stars */}
            {starPositions.map((star, i) => (
              <TwinklingStar key={`star-${i}`} x={star.x} y={star.y} size={star.size} delay={star.delay} />
            ))}

            {/* Forge embers rising */}
            {[...Array(20)].map((_, i) => (
              <ForgeEmber key={i} delay={i * 0.8} />
            ))}

            {/* Moon glow */}
            <motion.div
              className="absolute top-20 right-20 w-32 h-32 bg-gray-100 rounded-full blur-sm"
              animate={{
                opacity: [0.15, 0.25, 0.15],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute top-20 right-20 w-40 h-40 bg-blue-200/20 rounded-full blur-xl"
              animate={{ opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Dark gradient orbs - subtle */}
            <motion.div
              className="absolute top-1/4 -left-32 w-96 h-96 bg-gold-500/5 rounded-full blur-[120px]"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.15, 0.25, 0.15],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute top-1/2 -right-32 w-96 h-96 bg-accent-500/5 rounded-full blur-[120px]"
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.15, 0.25, 0.15],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            />
            <motion.div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-96 bg-primary-500/10 rounded-full blur-[150px]"
              animate={{ opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        )}

        {/* LIGHT MODE - Warm Day with Subtle Flames */}
        {!isDarkMode && (
          <>
            {/* Sky gradient overlay - brighter */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-100/40 via-orange-50/30 to-yellow-100/50" />

            {/* Floating Clouds */}
            <FloatingCloud x={10} y={15} size={180} delay={0} />
            <FloatingCloud x={60} y={10} size={150} delay={5} />
            <FloatingCloud x={80} y={25} size={120} delay={10} />
            <FloatingCloud x={30} y={5} size={100} delay={15} />

            {/* Subtle burning flames rising from bottom */}
            {[...Array(15)].map((_, i) => (
              <BurningFlame key={i} delay={i * 0.6} />
            ))}

          </>
        )}
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-colors duration-500 ${
          isDarkMode
            ? 'bg-dark-surface-10/80 border-gold-500/10'
            : 'bg-white/70 border-amber-200/50'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <motion.div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-gold-500 to-accent-500'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500'
                }`}
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Flame className={`h-7 w-7 ${isDarkMode ? 'text-dark-surface-10' : 'text-white'}`} />
              </motion.div>
              <span className={`text-2xl font-bold bg-clip-text text-transparent ${
                isDarkMode
                  ? 'bg-gradient-to-r from-gold-400 to-gold-600'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600'
              }`}>
                StudyForge
              </span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gold-400' : 'text-gray-600 hover:text-amber-600'}`}>Features</a>
              <a href="#how-it-works" className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gold-400' : 'text-gray-600 hover:text-amber-600'}`}>How It Works</a>
              <a href="#reviews" className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gold-400' : 'text-gray-600 hover:text-amber-600'}`}>Reviews</a>
              <a href="#about" className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gold-400' : 'text-gray-600 hover:text-amber-600'}`}>About</a>
            </nav>
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={toggleTheme}
                className={`p-3 rounded-xl transition-all ${
                  isDarkMode
                    ? 'text-gray-400 hover:text-gold-400 hover:bg-dark-surface-30'
                    : 'text-amber-500 hover:text-amber-600 hover:bg-amber-100'
                }`}
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
              >
                <span className="text-xl">{isDarkMode ? '☀️' : '🌙'}</span>
              </motion.button>
              <Link to="/dashboard">
                <motion.button
                  className={`px-6 py-3 font-semibold rounded-xl ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-dark-surface-10'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  {...glowPulse}
                >
                  Get Started
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section - The Forge */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20">
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="relative z-10 text-center px-4 max-w-6xl mx-auto"
        >
          {/* Forge Sign */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mb-8"
          >
            <div className="inline-block relative">
              {/* Glow effect behind text - only in dark mode */}
              {isDarkMode && (
                <div className="absolute inset-0 blur-3xl rounded-full bg-gold-500/30" />
              )}

              {/* Main title */}
              <motion.h1
                className={`relative text-7xl sm:text-8xl lg:text-9xl font-black tracking-tight bg-clip-text text-transparent ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-gold-400 via-gold-100 via-50% to-accent-500'
                    : 'bg-gradient-to-br from-amber-600 via-amber-400 via-50% to-orange-600'
                }`}
                style={isDarkMode ? { textShadow: '0 0 80px rgba(243, 198, 119, 0.5)' } : undefined}
              >
                STUDYFORGE
              </motion.h1>

              {/* Animated underline */}
              <motion.div
                className={`h-1 bg-gradient-to-r from-transparent to-transparent mt-4 ${isDarkMode ? 'via-gold-500' : 'via-amber-500'}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
              />
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mb-6"
          >
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm ${
              isDarkMode
                ? 'bg-gold-500/10 border border-gold-500/30 text-gold-400'
                : 'bg-amber-500/10 border border-amber-400/40 text-amber-700'
            }`}>
              <Sparkles className="h-4 w-4 mr-2" />
              Where Knowledge Is Forged
            </span>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className={`text-xl sm:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Transform your study materials into powerful learning tools.
            <span className={isDarkMode ? 'text-gold-400' : 'text-amber-600 font-semibold'}> AI-powered</span> quizzes and flashcards,
            forged for <span className={isDarkMode ? 'text-gold-400' : 'text-amber-600 font-semibold'}>mastery</span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link to="/dashboard">
              <motion.button
                className={`group px-8 py-4 font-bold text-lg rounded-xl flex items-center space-x-2 shadow-2xl ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-dark-surface-10 shadow-gold-500/25'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/30'
                }`}
                whileHover={{ scale: 1.05, boxShadow: isDarkMode ? '0 0 60px rgba(243, 198, 119, 0.4)' : '0 0 60px rgba(251, 146, 60, 0.4)' }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Enter the Forge</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
            <a href="#features">
              <motion.button
                className={`px-8 py-4 border font-semibold text-lg rounded-xl transition-all ${
                  isDarkMode
                    ? 'border-gray-600 text-gray-300 hover:border-gold-500/50 hover:text-gold-400'
                    : 'border-amber-300 text-gray-700 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Explore Features
              </motion.button>
            </a>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className={`backdrop-blur-sm rounded-xl p-4 transition-colors ${
                  isDarkMode
                    ? 'bg-dark-surface-20/50 border border-dark-surface-30 hover:border-gold-500/30'
                    : 'bg-white/60 border border-amber-200/50 hover:border-amber-400/50 shadow-lg'
                }`}
                whileHover={{ y: -5 }}
              >
                <stat.icon className={`h-6 w-6 mx-auto mb-2 ${isDarkMode ? 'text-gold-500' : 'text-amber-500'}`} />
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{stat.value}</div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className={`h-8 w-8 ${isDarkMode ? 'text-gold-500/50' : 'text-amber-500/60'}`} />
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 relative">
        <AnimatedSection className="max-w-7xl mx-auto">
          <motion.div variants={fadeInUp} className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              <span className={`bg-clip-text text-transparent ${
                isDarkMode
                  ? 'bg-gradient-to-r from-white to-gray-400'
                  : 'bg-gradient-to-r from-gray-800 to-gray-600'
              }`}>
                Forge Your Knowledge
              </span>
            </h2>
            <p className={`text-xl max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Powerful AI tools designed to transform how you learn and retain information
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className={`group relative p-8 backdrop-blur-sm rounded-2xl transition-all duration-500 ${
                  isDarkMode
                    ? 'bg-dark-surface-20/50 border border-dark-surface-30 hover:border-gold-500/30'
                    : 'bg-white/70 border border-amber-200/50 hover:border-amber-400/50 shadow-lg hover:shadow-xl'
                }`}
                whileHover={{ y: -10 }}
              >
                {/* Glow effect on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at center, ${feature.color}10 0%, transparent 70%)`,
                  }}
                />

                <div className="relative z-10">
                  <motion.div
                    className="w-16 h-16 rounded-xl flex items-center justify-center mb-6"
                    style={{ backgroundColor: feature.color + '20' }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <feature.icon className="h-8 w-8" style={{ color: feature.color }} />
                  </motion.div>
                  <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{feature.title}</h3>
                  <p className={`leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className={`py-32 px-4 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-dark-surface-20/30' : 'bg-gradient-to-b from-amber-50/50 to-orange-50/50'}`}>
        <AnimatedSection className="max-w-7xl mx-auto">
          <motion.div variants={fadeInUp} className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              <span className={`bg-clip-text text-transparent ${
                isDarkMode
                  ? 'bg-gradient-to-r from-white to-gray-400'
                  : 'bg-gradient-to-r from-gray-800 to-gray-600'
              }`}>
                The Forging Process
              </span>
            </h2>
            <p className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Three steps to academic mastery
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting lines between steps */}
            <div className="hidden md:block absolute top-10 left-1/2 -translate-x-1/2 w-2/3 h-0.5">
              <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-r from-gold-500 via-gold-500 to-gold-500' : 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400'}`} />
            </div>

            {[
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
                icon: Flame,
              },
              {
                step: '03',
                title: 'Master & Progress',
                description: 'Study with spaced repetition and track your improvement with smart analytics.',
                icon: TrendingUp,
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="relative text-center z-10"
              >
                <motion.div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl relative z-10 ${
                    isDarkMode
                      ? 'bg-gradient-to-br from-gold-500 to-accent-500 shadow-gold-500/25'
                      : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30'
                  }`}
                  whileHover={{ scale: 1.1 }}
                >
                  <item.icon className={`h-10 w-10 ${isDarkMode ? 'text-dark-surface-10' : 'text-white'}`} />
                </motion.div>
                <h3 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.title}</h3>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{item.description}</p>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* Capabilities Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-br from-primary-600/20 to-accent-500/20' : 'bg-gradient-to-br from-amber-100/50 to-orange-100/50'}`} />

        <AnimatedSection className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeInLeft}>
              <h2 className={`text-4xl sm:text-5xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Packed with
                <span className={`block ${isDarkMode ? 'text-gold-400' : 'text-amber-600'}`}>Powerful Features</span>
              </h2>
              <p className={`text-xl mb-10 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Everything you need for effective studying, powered by a multi-agent AI system.
              </p>
              <ul className="space-y-4">
                {capabilities.map((capability, index) => (
                  <motion.li
                    key={index}
                    className="flex items-start space-x-4"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <CheckCircle className={`h-6 w-6 flex-shrink-0 mt-0.5 ${isDarkMode ? 'text-gold-400' : 'text-amber-500'}`} />
                    <span className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>{capability}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div variants={fadeInRight} className="relative">
              <div className={`rounded-2xl p-8 shadow-2xl ${isDarkMode ? 'bg-dark-surface-20 border border-dark-surface-30' : 'bg-white/80 border border-amber-200/50'}`}>
                <div className="space-y-4">
                  {[
                    { label: 'Quiz Completed', value: '85%', color: 'green', icon: CheckCircle },
                    { label: 'Learning Score', value: '78', color: 'purple', icon: Brain },
                    { label: 'Study Streak', value: '5 days', color: 'orange', icon: Clock },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-xl ${isDarkMode ? 'bg-dark-surface-10' : 'bg-gray-50'}`}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.2 }}
                      viewport={{ once: true }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 bg-${item.color}-500/20 rounded-xl flex items-center justify-center`}>
                          <item.icon className={`h-6 w-6 text-${item.color}-400`} />
                        </div>
                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.label}</span>
                      </div>
                      <span className={`text-${item.color}-400 font-bold text-xl`}>{item.value}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Decorative elements */}
              <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl ${isDarkMode ? 'bg-gold-500/10' : 'bg-amber-300/20'}`} />
              <div className={`absolute -bottom-4 -left-4 w-32 h-32 rounded-full blur-2xl ${isDarkMode ? 'bg-accent-500/10' : 'bg-orange-300/20'}`} />
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className={`py-32 px-4 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-dark-surface-20/30' : 'bg-gradient-to-b from-orange-50/50 to-amber-50/50'}`}>
        <AnimatedSection className="max-w-7xl mx-auto">
          <motion.div variants={fadeInUp} className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              <span className={`bg-clip-text text-transparent ${
                isDarkMode
                  ? 'bg-gradient-to-r from-white to-gray-400'
                  : 'bg-gradient-to-r from-gray-800 to-gray-600'
              }`}>
                Voices from the Forge
              </span>
            </h2>
            <p className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              See what students are saying about their experience
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {reviews.map((review, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className={`backdrop-blur-sm rounded-2xl p-6 transition-all ${
                  isDarkMode
                    ? 'bg-dark-surface-20/50 border border-dark-surface-30 hover:border-gold-500/30'
                    : 'bg-white/70 border border-amber-200/50 hover:border-amber-400/50 shadow-lg'
                }`}
                whileHover={{ y: -5 }}
              >
                <Quote className={`h-8 w-8 mb-4 ${isDarkMode ? 'text-gold-500/30' : 'text-amber-400/40'}`} />
                <p className={`mb-6 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>"{review.text}"</p>
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{review.avatar}</div>
                  <div>
                    <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{review.name}</div>
                    <div className="text-sm text-gray-500">{review.role}</div>
                  </div>
                </div>
                <div className="flex mt-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${isDarkMode ? 'text-gold-500 fill-gold-500' : 'text-amber-500 fill-amber-500'}`} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="max-w-6xl mx-auto">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              <span className={`bg-clip-text text-transparent ${
                isDarkMode
                  ? 'bg-gradient-to-r from-white to-gray-400'
                  : 'bg-gradient-to-r from-gray-800 to-gray-600'
              }`}>
                About the Creator
              </span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Author Card */}
            <motion.div
              variants={fadeInLeft}
              className={`lg:col-span-2 backdrop-blur-sm rounded-2xl p-8 ${
                isDarkMode
                  ? 'bg-dark-surface-20/50 border border-dark-surface-30'
                  : 'bg-white/70 border border-amber-200/50 shadow-lg'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start gap-8">
                <div className={`w-32 h-32 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-gold-500 to-accent-500'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500'
                }`}>
                  <span className="text-5xl">👨‍💻</span>
                </div>
                <div>
                  <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>[Your Name]</h3>
                  <p className={`mb-4 ${isDarkMode ? 'text-gold-400' : 'text-amber-600'}`}>Creator & Developer</p>
                  <p className={`leading-relaxed mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    [Your bio will go here. Share your story, your passion for education technology,
                    and what inspired you to build StudyForge. Talk about your background, your
                    vision for the project, and what drives you to help students learn more effectively.]
                  </p>
                  <div className="flex space-x-4">
                    <motion.a
                      href="#"
                      className={`p-3 rounded-xl transition-all ${
                        isDarkMode
                          ? 'bg-dark-surface-30 text-gray-400 hover:text-gold-400 hover:bg-dark-surface-40'
                          : 'bg-amber-100 text-gray-500 hover:text-amber-600 hover:bg-amber-200'
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Github className="h-5 w-5" />
                    </motion.a>
                    <motion.a
                      href="#"
                      className={`p-3 rounded-xl transition-all ${
                        isDarkMode
                          ? 'bg-dark-surface-30 text-gray-400 hover:text-gold-400 hover:bg-dark-surface-40'
                          : 'bg-amber-100 text-gray-500 hover:text-amber-600 hover:bg-amber-200'
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Linkedin className="h-5 w-5" />
                    </motion.a>
                    <motion.a
                      href="#"
                      className={`p-3 rounded-xl transition-all ${
                        isDarkMode
                          ? 'bg-dark-surface-30 text-gray-400 hover:text-gold-400 hover:bg-dark-surface-40'
                          : 'bg-amber-100 text-gray-500 hover:text-amber-600 hover:bg-amber-200'
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Mail className="h-5 w-5" />
                    </motion.a>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* For the Hackathon Card */}
            <motion.div
              variants={fadeInRight}
              className={`rounded-2xl p-8 ${
                isDarkMode
                  ? 'bg-gradient-to-br from-gold-500/10 to-accent-500/10 border border-gold-500/30'
                  : 'bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-300/50 shadow-lg'
              }`}
            >
              <div className="flex items-center space-x-3 mb-6">
                <Flame className={`h-6 w-6 ${isDarkMode ? 'text-gold-500' : 'text-amber-500'}`} />
                <h3 className={`text-xl font-bold ${isDarkMode ? 'text-gold-400' : 'text-amber-700'}`}>For the Hackathon</h3>
              </div>
              <p className={`leading-relaxed mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                StudyForge was built for [Hackathon Name]. This project represents
                [X hours/days] of passionate development, combining cutting-edge AI
                with thoughtful UX design to revolutionize how students learn.
              </p>
              <div className="space-y-3 text-sm">
                <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className={`w-24 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Tech Stack:</span>
                  <span>React, FastAPI, PostgreSQL, AI/LLM</span>
                </div>
                <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className={`w-24 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Category:</span>
                  <span>Education Technology</span>
                </div>
                <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className={`w-24 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Status:</span>
                  <span className="text-green-500 font-medium">Live & Running</span>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-t from-dark-surface-10 via-transparent to-dark-surface-10' : 'bg-gradient-to-t from-amber-50 via-transparent to-amber-50'}`} />
          <motion.div
            className="absolute inset-0"
            style={{
              background: isDarkMode
                ? 'radial-gradient(circle at center, rgba(243, 198, 119, 0.15) 0%, transparent 50%)'
                : 'radial-gradient(circle at center, rgba(251, 191, 36, 0.2) 0%, transparent 50%)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <AnimatedSection className="max-w-4xl mx-auto text-center relative z-10">
          <motion.h2
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8"
          >
            <span className={`bg-clip-text text-transparent ${
              isDarkMode
                ? 'bg-gradient-to-r from-white via-gold-200 to-gold-400'
                : 'bg-gradient-to-r from-gray-800 via-amber-600 to-orange-500'
            }`}>
              Ready to Forge Your Future?
            </span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className={`text-xl mb-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Join students who are transforming their study habits with AI-powered learning.
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Link to="/dashboard">
              <motion.button
                className={`group px-12 py-5 font-bold text-xl rounded-xl flex items-center space-x-3 mx-auto shadow-2xl ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-dark-surface-10'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                }`}
                whileHover={{ scale: 1.05, boxShadow: isDarkMode ? '0 0 80px rgba(243, 198, 119, 0.5)' : '0 0 80px rgba(251, 146, 60, 0.5)' }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Start Learning Now</span>
                <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </motion.button>
            </Link>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className={`py-12 px-4 sm:px-6 lg:px-8 border-t ${isDarkMode ? 'border-dark-surface-30' : 'border-amber-200'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDarkMode
                  ? 'bg-gradient-to-br from-gold-500 to-accent-500'
                  : 'bg-gradient-to-br from-amber-400 to-orange-500'
              }`}>
                <Flame className={`h-6 w-6 ${isDarkMode ? 'text-dark-surface-10' : 'text-white'}`} />
              </div>
              <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>StudyForge</span>
            </div>
            <p className="text-gray-500 text-center">
              Where Knowledge Is Forged • Built with passion for learners everywhere
            </p>
            <div className="flex space-x-4">
              <a href="#" className={`transition-colors ${isDarkMode ? 'text-gray-500 hover:text-gold-400' : 'text-gray-400 hover:text-amber-600'}`}>
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className={`transition-colors ${isDarkMode ? 'text-gray-500 hover:text-gold-400' : 'text-gray-400 hover:text-amber-600'}`}>
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
