import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, History, Settings, ArrowLeft, Clock, Monitor, BookOpen, AlertTriangle } from 'lucide-react';
import { quizApi, categoryApi } from '../services/api';

function QuizPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    mode: 'practice', // 'practice', 'timed', 'exam'
    difficulty: 'mixed',
    selectionMode: 'mixed', // 'mixed' or 'custom'
    multipleChoice: 5,
    trueFalse: 3,
    writtenAnswer: 2,
    fillInBlank: 0,
    totalQuestions: 10,
    // Timer settings
    timerType: 'total', // 'total' or 'per_question'
    totalTimeMinutes: 30,
    perQuestionSeconds: 60,
    // Advanced options
    allowPartialCredit: true,
    allowHandwrittenUpload: true
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
      // Handle both wrapped and unwrapped response formats
      setCategory(catResponse.data.data || catResponse.data);
      setStats(statsResponse.data.data || statsResponse.data);
      // History response has 'sessions' array, not 'data'
      const historyData = historyResponse.data.data || historyResponse.data;
      setHistory(historyData.sessions || historyData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    try {
      const response = await quizApi.createSession(categoryId, settings);
      const data = response.data.data || response.data;
      navigate(`/category/${categoryId}/quiz/session/${data.session_id}`);
    } catch (error) {
      console.error('Error starting quiz:', error);
      alert('Error starting quiz: ' + (error.response?.data?.error || error.message));
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'practice': return <BookOpen className="h-6 w-6" />;
      case 'timed': return <Clock className="h-6 w-6" />;
      case 'exam': return <Monitor className="h-6 w-6" />;
      default: return <BookOpen className="h-6 w-6" />;
    }
  };

  const getModeDescription = (mode) => {
    switch (mode) {
      case 'practice': return 'No timer, learn at your own pace';
      case 'timed': return 'Race against the clock';
      case 'exam': return 'Simulates real exam conditions';
      default: return '';
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

          <div className="space-y-6">
            {/* Quiz Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Quiz Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['practice', 'timed', 'exam'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSettings({ ...settings, mode })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      settings.mode === mode
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`flex flex-col items-center space-y-2 ${
                      settings.mode === mode ? 'text-primary-700' : 'text-gray-600'
                    }`}>
                      {getModeIcon(mode)}
                      <span className="font-medium capitalize">{mode}</span>
                      <span className="text-xs text-center">{getModeDescription(mode)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Exam Mode Warning */}
            {settings.mode === 'exam' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">Exam Simulation Mode</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      This mode tracks when you leave the window or switch tabs. Your focus events will be recorded and shown in results. Treat this like a real exam!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Timer Settings (for timed and exam modes) */}
            {(settings.mode === 'timed' || settings.mode === 'exam') && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-800">Timer Settings</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timer Type
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="timerType"
                        value="total"
                        checked={settings.timerType === 'total'}
                        onChange={(e) => setSettings({ ...settings, timerType: e.target.value })}
                        className="mr-2"
                      />
                      <span className="text-sm">Total Time</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="timerType"
                        value="per_question"
                        checked={settings.timerType === 'per_question'}
                        onChange={(e) => setSettings({ ...settings, timerType: e.target.value })}
                        className="mr-2"
                      />
                      <span className="text-sm">Per Question</span>
                    </label>
                  </div>
                </div>

                {settings.timerType === 'total' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Time (minutes)
                    </label>
                    <input
                      type="number"
                      className="input"
                      min="1"
                      max="180"
                      value={settings.totalTimeMinutes}
                      onChange={(e) => setSettings({ ...settings, totalTimeMinutes: parseInt(e.target.value) })}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Per Question (seconds)
                    </label>
                    <input
                      type="number"
                      className="input"
                      min="10"
                      max="600"
                      value={settings.perQuestionSeconds}
                      onChange={(e) => setSettings({ ...settings, perQuestionSeconds: parseInt(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Question Selection Mode */}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fill in the Blank Questions
                  </label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    max={stats?.by_type?.fill_in_blank || 0}
                    value={settings.fillInBlank}
                    onChange={(e) => setSettings({ ...settings, fillInBlank: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {stats?.by_type?.fill_in_blank || 0}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700">
                    Total: {settings.multipleChoice + settings.trueFalse + settings.writtenAnswer + settings.fillInBlank} questions
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

            {/* Advanced Options */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Advanced Options</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.allowPartialCredit}
                    onChange={(e) => setSettings({ ...settings, allowPartialCredit: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    Enable partial credit for complex questions
                  </span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.allowHandwrittenUpload}
                    onChange={(e) => setSettings({ ...settings, allowHandwrittenUpload: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    Allow handwritten answer uploads (PDF)
                  </span>
                </label>
              </div>
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
              {history.slice(0, 10).map((quiz) => {
                const quizSettings = quiz.settings || {};
                return (
                  <div
                    key={quiz.id}
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => navigate(`/category/${categoryId}/quiz/results/${quiz.id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">
                            {quiz.score}/{quiz.total_questions} correct
                          </p>
                          {quizSettings.mode && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              quizSettings.mode === 'exam' ? 'bg-purple-100 text-purple-700' :
                              quizSettings.mode === 'timed' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {quizSettings.mode}
                            </span>
                          )}
                        </div>
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuizPage;
