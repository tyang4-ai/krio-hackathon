import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { CheckCircle, Trash2, AlertTriangle, Filter, ArrowLeft } from 'lucide-react';
import { notebookApi, categoryApi } from '../services/api';
import { Category, NotebookEntry } from '../types';

interface NotebookStats {
  total_entries: number;
  reviewed_entries: number;
  unreviewed_entries: number;
}

interface MostMissedItem {
  id: number;
  question_text: string;
  times_missed: number;
}

interface NotebookEntryExtended extends Omit<NotebookEntry, 'question'> {
  question_text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[];
  explanation?: string;
}

type FilterType = 'all' | 'reviewed' | 'unreviewed';

function NotebookPage(): React.ReactElement {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check if we came from analytics (via highlight param or referrer state)
  const cameFromAnalytics = searchParams.get('highlight') !== null || location.state?.from === 'analytics';
  const [category, setCategory] = useState<Category | null>(null);
  const [entries, setEntries] = useState<NotebookEntryExtended[]>([]);
  const [mostMissed, setMostMissed] = useState<MostMissedItem[]>([]);
  const [stats, setStats] = useState<NotebookStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<number | null>(null);
  const entryRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadData();
  }, [categoryId, filter]);

  // Handle highlight parameter from URL
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      setHighlightedQuestionId(Number(highlightId));
      // Clear the highlight parameter from URL after a delay
      setTimeout(() => {
        setSearchParams({});
      }, 5000);
    }
  }, [searchParams, setSearchParams]);

  // Scroll to highlighted entry when entries are loaded
  useEffect(() => {
    if (highlightedQuestionId && entries.length > 0 && !loading) {
      // Find entry with matching question_id
      const entry = entries.find(e => e.question_id === highlightedQuestionId);
      if (entry) {
        const ref = entryRefs.current.get(entry.id);
        if (ref) {
          setTimeout(() => {
            ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    }
  }, [highlightedQuestionId, entries, loading]);

  // Clear highlight after animation
  useEffect(() => {
    if (highlightedQuestionId) {
      const timer = setTimeout(() => {
        setHighlightedQuestionId(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightedQuestionId]);

  // Scroll to specific question by ID (used by Most Missed Questions)
  const scrollToQuestion = (questionId: number): void => {
    const entry = entries.find(e => e.question_id === questionId);
    if (entry) {
      const ref = entryRefs.current.get(entry.id);
      if (ref) {
        setHighlightedQuestionId(questionId);
        ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const loadData = async (): Promise<void> => {
    try {
      const [catResponse, statsResponse, missedResponse] = await Promise.all([
        categoryApi.getById(categoryId!),
        notebookApi.getStats(categoryId!),
        notebookApi.getMostMissed(categoryId!, 5)
      ]);
      // Handle both wrapped and unwrapped response formats
      const catData = catResponse.data.data || catResponse.data;
      if (!catData || !catData.id) {
        setError('Category not found');
        return;
      }
      setCategory(catData);
      setStats(statsResponse.data.data || statsResponse.data);
      const missedData = missedResponse.data.data || missedResponse.data;
      setMostMissed((missedData as any).questions || missedData || []);

      // Load entries with filter
      const options: { reviewed?: boolean } = {};
      if (filter === 'reviewed') options.reviewed = true;
      if (filter === 'unreviewed') options.reviewed = false;

      const entriesResponse = await notebookApi.getByCategory(categoryId!, options);
      const entriesData = entriesResponse.data.data || entriesResponse.data;
      setEntries((entriesData as any).entries || entriesData || []);
    } catch (err: any) {
      console.error('Error loading data:', err);
      if (err.response?.status === 404) {
        setError('Category not found');
      } else {
        setError('Failed to load data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReviewed = async (id: number): Promise<void> => {
    try {
      await notebookApi.markReviewed(id);
      loadData();
    } catch (error) {
      console.error('Error marking as reviewed:', error);
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await notebookApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  const handleClearAll = async (): Promise<void> => {
    if (window.confirm('Are you sure you want to clear all notebook entries? This cannot be undone.')) {
      try {
        await notebookApi.clear(categoryId!);
        loadData();
      } catch (error) {
        console.error('Error clearing notebook:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{error}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The category you're looking for may have been deleted or doesn't exist.
        </p>
        <button
          onClick={() => navigate('/analytics')}
          className="btn-primary"
        >
          Back to Analytics
        </button>
      </div>
    );
  }

  const handleBack = () => {
    if (cameFromAnalytics) {
      navigate('/analytics');
    } else {
      navigate(`/category/${categoryId}`);
    }
  };

  return (
    <div>
      <button
        onClick={handleBack}
        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        {cameFromAnalytics ? 'Back to Analytics' : 'Back to Dashboard'}
      </button>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notebook - {category?.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track questions you got wrong for targeted review
          </p>
        </div>
        {entries.length > 0 && (
          <button onClick={handleClearAll} className="btn-danger text-sm">
            Clear All
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.total_entries || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Entries</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.reviewed_entries || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Reviewed</div>
        </div>
        <div className="card">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats?.unreviewed_entries || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Need Review</div>
        </div>
      </div>

      {/* Most Missed Questions */}
      {mostMissed.length > 0 && (
        <div className="card mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-orange-500 dark:text-orange-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Most Missed Questions</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Click to jump to the question below</p>
          <div className="space-y-2">
            {mostMissed.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToQuestion(item.id)}
                className="w-full flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-surface-20 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-30 transition-colors cursor-pointer text-left"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                    {item.question_text}
                  </p>
                </div>
                <span className="ml-4 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                  {item.times_missed}x
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <select
          className="select w-auto"
          value={filter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value as FilterType)}
        >
          <option value="all">All Entries</option>
          <option value="unreviewed">Need Review</option>
          <option value="reviewed">Already Reviewed</option>
        </select>
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-2">No entries yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Wrong answers from quizzes will appear here for review
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const isHighlighted = highlightedQuestionId === entry.question_id;
            return (
            <div
              key={entry.id}
              ref={(el) => {
                if (el) entryRefs.current.set(entry.id, el);
                else entryRefs.current.delete(entry.id);
              }}
              className={`card transition-all duration-500 ${entry.reviewed ? 'opacity-60' : ''} ${
                isHighlighted
                  ? 'ring-2 ring-primary-500 dark:ring-dark-primary-20 ring-offset-2 dark:ring-offset-dark-surface-10 bg-primary-50 dark:bg-dark-tonal-10'
                  : ''
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-1 text-xs rounded ${
                  entry.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                  entry.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {entry.difficulty}
                </span>
                <div className="flex space-x-2">
                  {!entry.reviewed && (
                    <button
                      onClick={() => handleMarkReviewed(entry.id)}
                      className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                      title="Mark as reviewed"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <p className="font-medium text-gray-900 dark:text-white mb-3">{entry.question_text}</p>

              {entry.options && entry.options.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {entry.options.map((option, index) => {
                    const letter = option.charAt(0);
                    const isUserAnswer = entry.user_answer === letter;
                    const isCorrectAnswer = entry.correct_answer === letter;

                    return (
                      <div
                        key={index}
                        className={`p-2 rounded ${
                          isCorrectAnswer
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : isUserAnswer
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            : 'bg-gray-50 dark:bg-dark-surface-30 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {option}
                        {isCorrectAnswer && ' ✓'}
                        {isUserAnswer && !isCorrectAnswer && ' ✗'}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="p-2 rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                    Your answer: {entry.user_answer || '(no answer)'}
                  </div>
                  <div className="p-2 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                    Correct answer: {entry.correct_answer}
                  </div>
                </div>
              )}

              {entry.explanation && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-800 dark:text-blue-300">
                  <strong>Explanation:</strong> {entry.explanation}
                </div>
              )}

              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Added: {new Date(entry.created_at).toLocaleDateString()}
                {entry.reviewed && ' • Reviewed'}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotebookPage;
