import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCcw, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Meh, ArrowLeft, Brain, Calendar, Award, Info, X } from 'lucide-react';
import { flashcardApi, categoryApi } from '../services/api';
import type { Flashcard, Category, FlashcardStats, FlashcardProgress } from '../types';

interface CategoryWithStats extends Category {
  stats?: {
    flashcard_count?: number;
  };
}

interface StudyProgress {
  total_cards: number;
  reviewed_count: number;
  average_confidence: number;
  completion_percentage: number;
  average_easiness_factor: number;
  average_interval_days: number;
  mastered_count: number;
  due_for_review: number;
  mastery_percentage: number;
}

// SM-2 explanation content
const sm2Explanation = {
  title: 'SM-2 Spaced Repetition Algorithm',
  description: 'This flashcard system uses the SM-2 algorithm, developed by Piotr Wozniak, which optimizes your learning by spacing reviews at scientifically calculated intervals.',
  howItWorks: [
    'Each card has an "Easiness Factor" (EF) that starts at 2.5 and adjusts based on your performance.',
    'When you mark a card as "Easy", the interval until next review grows exponentially (1 → 6 → 15 → 37 days...).',
    'When you mark a card as "Hard", it resets and you\'ll see it again tomorrow.',
    'Cards with intervals over 21 days are considered "Mastered".'
  ],
  buttons: {
    hard: 'Card is difficult. You\'ll see it again tomorrow. EF decreases.',
    medium: 'Card is somewhat difficult. Interval grows moderately.',
    easy: 'Perfect recall! Interval grows significantly. EF increases.'
  }
};

function FlashcardsPage(): React.ReactElement {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryWithStats | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [studyProgress, setStudyProgress] = useState<StudyProgress | null>(null);
  const [studyMode, setStudyMode] = useState<'all' | 'review'>('all');
  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [lastReviewResult, setLastReviewResult] = useState<FlashcardProgress | null>(null);
  const [showSm2Info, setShowSm2Info] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [categoryId, studyMode, selectedChapter]);

  const loadData = async (): Promise<void> => {
    if (!categoryId) return;

    setLoading(true);
    try {
      const [catResponse, statsResponse, chaptersResponse, progressResponse] = await Promise.all([
        categoryApi.getById(Number(categoryId)),
        flashcardApi.getStats(Number(categoryId)),
        flashcardApi.getChapters(Number(categoryId)),
        flashcardApi.getStudyProgress(Number(categoryId))
      ]);
      setCategory(catResponse.data.data || catResponse.data);
      setStats(statsResponse.data.data || statsResponse.data);
      const chaptersData = chaptersResponse.data.data || chaptersResponse.data;
      setChapters((chaptersData as any).chapters || chaptersData || []);
      setStudyProgress(progressResponse.data.data || progressResponse.data);

      const options: Record<string, any> = {};
      if (selectedChapter) {
        options.tags = [selectedChapter];
      }

      let cardsResponse;
      if (studyMode === 'review') {
        cardsResponse = await flashcardApi.getForReview(Number(categoryId), options);
      } else {
        cardsResponse = await flashcardApi.getByCategory(Number(categoryId), options);
      }
      const cardsData = cardsResponse.data.data || cardsResponse.data;
      let loadedCards = (cardsData as any).flashcards || cardsData || [];

      if (selectedChapter && loadedCards.length > 0) {
        loadedCards = loadedCards.filter((card: Flashcard) =>
          card.tags && card.tags.includes(selectedChapter)
        );
      }

      setFlashcards(loadedCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setLastReviewResult(null);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = (): void => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = (): void => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setLastReviewResult(null);
    }
  };

  const handlePrev = (): void => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setLastReviewResult(null);
    }
  };

  const handleConfidence = async (level: number): Promise<void> => {
    if (!categoryId) return;

    const currentCard = flashcards[currentIndex];
    try {
      const response = await flashcardApi.updateProgress(currentCard.id, {
        confidence: level,
        categoryId: Number(categoryId)
      });
      const progressData = response.data.data || response.data;
      setLastReviewResult(progressData);

      // Update study progress
      const progressResponse = await flashcardApi.getStudyProgress(Number(categoryId));
      setStudyProgress(progressResponse.data.data || progressResponse.data);

      // Auto-advance after a short delay to show the result
      setTimeout(() => {
        handleNext();
      }, 1500);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleShuffle = (): void => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setLastReviewResult(null);
  };

  const formatNextReview = (days: number): string => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `In ${days} days`;
    if (days < 30) return `In ${Math.round(days / 7)} week${Math.round(days / 7) > 1 ? 's' : ''}`;
    return `In ${Math.round(days / 30)} month${Math.round(days / 30) > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate(`/category/${categoryId}`)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Dashboard
      </button>

      {/* Header with SM-2 Stats */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Flashcards - {category?.name}</h1>
            <button
              onClick={() => setShowSm2Info(true)}
              className="text-gray-400 hover:text-indigo-600 transition-colors"
              title="Learn about SM-2 algorithm"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600 mt-1">
            {stats?.total || 0} total cards • {studyProgress?.due_for_review || 0} due for review
          </p>
        </div>
        <div className="flex space-x-2">
          {chapters.length > 0 && (
            <select
              className="select w-auto"
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
            >
              <option value="">All Chapters</option>
              {chapters.map((chapter) => (
                <option key={chapter} value={chapter}>{chapter}</option>
              ))}
            </select>
          )}
          <select
            className="select w-auto"
            value={studyMode}
            onChange={(e) => setStudyMode(e.target.value as 'all' | 'review')}
          >
            <option value="all">All Cards</option>
            <option value="review">Due for Review ({studyProgress?.due_for_review || 0})</option>
          </select>
          <button onClick={handleShuffle} className="btn-secondary">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SM-2 Progress Stats Bar */}
      {studyProgress && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-indigo-500" />
              <span className="text-sm text-gray-500">Mastery</span>
            </div>
            <div className="text-xl font-bold text-indigo-600">
              {studyProgress.mastery_percentage.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">
              {studyProgress.mastered_count} cards mastered
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-500">Avg Interval</span>
            </div>
            <div className="text-xl font-bold text-blue-600">
              {studyProgress.average_interval_days.toFixed(1)} days
            </div>
            <div className="text-xs text-gray-400">
              Between reviews
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-500">Easiness Factor</span>
            </div>
            <div className="text-xl font-bold text-green-600">
              {studyProgress.average_easiness_factor.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400">
              {studyProgress.average_easiness_factor >= 2.5 ? 'Easy cards!' : studyProgress.average_easiness_factor >= 2.0 ? 'Moderate' : 'Challenging'}
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-500">Reviewed</span>
            </div>
            <div className="text-xl font-bold text-orange-600">
              {studyProgress.completion_percentage.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">
              {studyProgress.reviewed_count} of {studyProgress.total_cards} cards
            </div>
          </div>
        </div>
      )}

      {flashcards.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-2">No flashcards available</p>
          <p className="text-sm text-gray-500">
            {selectedChapter
              ? `No flashcards found for chapter "${selectedChapter}". Try selecting "All Chapters".`
              : studyMode === 'review'
              ? 'No cards due for review. Great job! Switch to "All Cards" mode to study ahead.'
              : 'Generate flashcards from your documents to get started.'}
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 text-center text-sm text-gray-600">
            Card {currentIndex + 1} of {flashcards.length}
          </div>

          <div
            onClick={handleFlip}
            className="card min-h-[300px] cursor-pointer flex items-center justify-center text-center mb-6 transition-all transform hover:scale-[1.01]"
          >
            <div className="p-6">
              {!isFlipped ? (
                <div>
                  <p className="text-xs text-gray-500 mb-4">FRONT</p>
                  <p className="text-xl font-medium text-gray-900">
                    {flashcards[currentIndex].front_text}
                  </p>
                  <p className="text-sm text-gray-500 mt-6">Click to flip</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 mb-4">BACK</p>
                  <p className="text-lg text-gray-700">
                    {flashcards[currentIndex].back_text}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SM-2 Result Feedback */}
          {lastReviewResult && (
            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-center animate-fade-in">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <span className="font-medium text-indigo-900">
                  Next review: {formatNextReview(lastReviewResult.interval_days || 1)}
                </span>
              </div>
              <div className="text-sm text-indigo-700">
                EF: {(lastReviewResult.easiness_factor || 2.5).toFixed(2)} •
                Rep #{lastReviewResult.repetition_count || 1} •
                Interval: {lastReviewResult.interval_days || 1} day{(lastReviewResult.interval_days || 1) > 1 ? 's' : ''}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="btn-secondary flex items-center space-x-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>

            {isFlipped && !lastReviewResult && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleConfidence(1)}
                  className="p-3 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex flex-col items-center"
                  title={sm2Explanation.buttons.hard}
                >
                  <ThumbsDown className="h-5 w-5" />
                  <span className="text-xs mt-1">Hard</span>
                </button>
                <button
                  onClick={() => handleConfidence(3)}
                  className="p-3 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-600 flex flex-col items-center"
                  title={sm2Explanation.buttons.medium}
                >
                  <Meh className="h-5 w-5" />
                  <span className="text-xs mt-1">Medium</span>
                </button>
                <button
                  onClick={() => handleConfidence(5)}
                  className="p-3 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 flex flex-col items-center"
                  title={sm2Explanation.buttons.easy}
                >
                  <ThumbsUp className="h-5 w-5" />
                  <span className="text-xs mt-1">Easy</span>
                </button>
              </div>
            )}

            <button
              onClick={handleNext}
              disabled={currentIndex === flashcards.length - 1}
              className="btn-primary flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 text-center">
            <span className={`px-2 py-1 text-xs rounded ${
              flashcards[currentIndex].difficulty === 'easy' ? 'bg-green-100 text-green-700' :
              flashcards[currentIndex].difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {flashcards[currentIndex].difficulty}
            </span>
          </div>
        </div>
      )}

      {/* SM-2 Info Modal */}
      {showSm2Info && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSm2Info(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <Brain className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {sm2Explanation.title}
                </h3>
              </div>
              <button
                onClick={() => setShowSm2Info(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              {sm2Explanation.description}
            </p>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">How it works:</h4>
              <ul className="space-y-2">
                {sm2Explanation.howItWorks.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium mt-0.5">
                      {index + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">Button meanings:</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <ThumbsDown className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-gray-600">{sm2Explanation.buttons.hard}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Meh className="h-4 w-4 text-yellow-600" />
                  </div>
                  <span className="text-gray-600">{sm2Explanation.buttons.medium}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-gray-600">{sm2Explanation.buttons.easy}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSm2Info(false)}
              className="w-full btn-primary"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlashcardsPage;
