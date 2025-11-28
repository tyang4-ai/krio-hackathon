import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCcw, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Meh, ArrowLeft } from 'lucide-react';
import { flashcardApi, categoryApi } from '../services/api';
import type { Flashcard, Category, FlashcardStats } from '../types';

interface CategoryWithStats extends Category {
  stats?: {
    flashcard_count?: number;
  };
}

function FlashcardsPage(): React.ReactElement {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryWithStats | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [studyMode, setStudyMode] = useState<'all' | 'review'>('all');
  const [chapters, setChapters] = useState<string[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [categoryId, studyMode, selectedChapter]);

  const loadData = async (): Promise<void> => {
    if (!categoryId) return;

    setLoading(true);
    try {
      const [catResponse, statsResponse, chaptersResponse] = await Promise.all([
        categoryApi.getById(Number(categoryId)),
        flashcardApi.getStats(Number(categoryId)),
        flashcardApi.getChapters(Number(categoryId))
      ]);
      setCategory(catResponse.data.data || catResponse.data);
      setStats(statsResponse.data.data || statsResponse.data);
      const chaptersData = chaptersResponse.data.data || chaptersResponse.data;
      setChapters((chaptersData as any).chapters || chaptersData || []);

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
    }
  };

  const handlePrev = (): void => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleConfidence = async (level: number): Promise<void> => {
    if (!categoryId) return;

    const currentCard = flashcards[currentIndex];
    try {
      await flashcardApi.updateProgress(currentCard.id, {
        confidence: level,
        categoryId: Number(categoryId)
      });
      handleNext();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleShuffle = (): void => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Flashcards - {category?.name}</h1>
          <p className="text-gray-600 mt-1">
            {stats?.total || 0} total cards • {(stats as any)?.reviewed_cards || (stats as any)?.reviewed || 0} reviewed
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
            <option value="review">Due for Review</option>
          </select>
          <button onClick={handleShuffle} className="btn-secondary">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {flashcards.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-2">No flashcards available</p>
          <p className="text-sm text-gray-500">
            {selectedChapter
              ? `No flashcards found for chapter "${selectedChapter}". Try selecting "All Chapters".`
              : studyMode === 'review'
              ? 'No cards due for review. Switch to "All Cards" mode.'
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

          <div className="flex justify-between items-center">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="btn-secondary flex items-center space-x-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>

            {isFlipped && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleConfidence(1)}
                  className="p-3 rounded-lg bg-red-100 hover:bg-red-200 text-red-600"
                  title="Hard - show again soon"
                >
                  <ThumbsDown className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleConfidence(3)}
                  className="p-3 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-600"
                  title="Medium - show later"
                >
                  <Meh className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleConfidence(5)}
                  className="p-3 rounded-lg bg-green-100 hover:bg-green-200 text-green-600"
                  title="Easy - show much later"
                >
                  <ThumbsUp className="h-5 w-5" />
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
    </div>
  );
}

export default FlashcardsPage;
