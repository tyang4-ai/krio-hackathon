import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, History, Settings, ArrowLeft } from 'lucide-react';
import { quizApi, categoryApi } from '../services/api';

function QuizPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    difficulty: 'mixed',
    selectionMode: 'mixed', // 'mixed' or 'custom'
    multipleChoice: 5,
    trueFalse: 3,
    writtenAnswer: 2,
    totalQuestions: 10
  });

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      const [catResponse, statsResponse, historyResponse] = await Promise.all([
        categoryApi.getById(categoryId),
        quizApi.getStats(categoryId),
        quizApi.getHistory(categoryId)
      ]);
      setCategory(catResponse.data.data);
      setStats(statsResponse.data.data);
      setHistory(historyResponse.data.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    try {
      const response = await quizApi.createSession(categoryId, settings);
      navigate(`/category/${categoryId}/quiz/session/${response.data.data.session_id}`);
    } catch (error) {
      console.error('Error starting quiz:', error);
      alert('Error starting quiz: ' + (error.response?.data?.error || error.message));
    }
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
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz - {category?.name}</h1>
      <p className="text-gray-600 mb-8">Test your knowledge with customized quizzes</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quiz Settings */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold">Quiz Settings</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Selection
              </label>
              <select
                className="select"
                value={settings.selectionMode}
                onChange={(e) => setSettings({ ...settings, selectionMode: e.target.value })}
              >
                <option value="mixed">Mixed & Randomized (All Types)</option>
                <option value="custom">Custom Selection</option>
              </select>
            </div>

            {settings.selectionMode === 'mixed' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Questions
                </label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  max={stats?.total || 50}
                  value={settings.totalQuestions}
                  onChange={(e) => setSettings({ ...settings, totalQuestions: parseInt(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {stats?.total || 0} questions (all types)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Multiple Choice Questions
                  </label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    max={stats?.by_type?.multiple_choice || 0}
                    value={settings.multipleChoice}
                    onChange={(e) => setSettings({ ...settings, multipleChoice: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {stats?.by_type?.multiple_choice || 0}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    True/False Questions
                  </label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    max={stats?.by_type?.true_false || 0}
                    value={settings.trueFalse}
                    onChange={(e) => setSettings({ ...settings, trueFalse: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {stats?.by_type?.true_false || 0}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Written Answer Questions
                  </label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    max={stats?.by_type?.written_answer || 0}
                    value={settings.writtenAnswer}
                    onChange={(e) => setSettings({ ...settings, writtenAnswer: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {stats?.by_type?.written_answer || 0}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700">
                    Total: {settings.multipleChoice + settings.trueFalse + settings.writtenAnswer} questions
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                className="select"
                value={settings.difficulty}
                onChange={(e) => setSettings({ ...settings, difficulty: e.target.value })}
              >
                <option value="mixed">Mixed</option>
                <option value="easy">Easy ({stats?.easy || 0})</option>
                <option value="medium">Medium ({stats?.medium || 0})</option>
                <option value="hard">Hard ({stats?.hard || 0})</option>
              </select>
            </div>

            <button
              onClick={handleStartQuiz}
              disabled={!stats?.total}
              className="w-full btn-primary flex items-center justify-center space-x-2 mt-6"
            >
              <Play className="h-5 w-5" />
              <span>Start Quiz</span>
            </button>

            {!stats?.total && (
              <p className="text-sm text-accent-500 text-center">
                No questions available. Generate questions from your documents first.
              </p>
            )}
          </div>
        </div>

        {/* Quiz History */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <History className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-semibold">Recent Quizzes</h2>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No quiz history yet</p>
              <p className="text-sm">Start a quiz to see your results here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 10).map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => navigate(`/category/${categoryId}/quiz/results/${quiz.id}`)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">
                        {quiz.score}/{quiz.total_questions} correct
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(quiz.completed_at).toLocaleDateString()} at{' '}
                        {new Date(quiz.completed_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className={`text-lg font-bold ${
                      (quiz.score / quiz.total_questions) >= 0.7
                        ? 'text-primary-600'
                        : (quiz.score / quiz.total_questions) >= 0.5
                        ? 'text-gold-600'
                        : 'text-accent-600'
                    }`}>
                      {Math.round((quiz.score / quiz.total_questions) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuizPage;
