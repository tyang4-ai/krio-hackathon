import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCcw, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Meh, ArrowLeft } from 'lucide-react';
import { flashcardApi, categoryApi } from '../services/api';

function FlashcardsPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [studyMode, setStudyMode] = useState('all'); // 'all' or 'review'

  useEffect(() => {
    loadData();
  }, [categoryId, studyMode]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catResponse, statsResponse] = await Promise.all([
        categoryApi.getById(categoryId),
        flashcardApi.getStats(categoryId)
      ]);
      setCategory(catResponse.data.data || catResponse.data);
      setStats(statsResponse.data.data || statsResponse.data);

      // Load flashcards based on study mode
      let cardsResponse;
      if (studyMode === 'review') {
        cardsResponse = await flashcardApi.getForReview(categoryId);
      } else {
        cardsResponse = await flashcardApi.getByCategory(categoryId);
      }
      const cardsData = cardsResponse.data.data || cardsResponse.data;
      // Handle both array response and {flashcards: [...]} response
      setFlashcards(cardsData.flashcards || cardsData || []);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleConfidence = async (level) => {
    const currentCard = flashcards[currentIndex];
    try {
      await flashcardApi.updateProgress(currentCard.id, {
        confidence: level,
        categoryId
      });
      handleNext();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleShuffle = () => {
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
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back
      </button>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Flashcards - {category?.name}</h1>
          <p className="text-gray-600 mt-1">
            {stats?.total || 0} total cards • {stats?.reviewed_cards || stats?.reviewed || 0} reviewed
          </p>
        </div>
        <div className="flex space-x-2">
          <select
            className="select w-auto"
            value={studyMode}
            onChange={(e) => setStudyMode(e.target.value)}
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
            {studyMode === 'review'
              ? 'No cards due for review. Switch to "All Cards" mode.'
              : 'Generate flashcards from your documents to get started.'}
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-4 text-center text-sm text-gray-600">
            Card {currentIndex + 1} of {flashcards.length}
          </div>

          {/* Flashcard */}
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

          {/* Navigation & Confidence */}
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

          {/* Difficulty indicator */}
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
