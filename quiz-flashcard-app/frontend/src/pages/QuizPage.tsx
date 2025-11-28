import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, History, Settings, ArrowLeft, Clock, Monitor, BookOpen, AlertTriangle } from 'lucide-react';
import { quizApi, categoryApi } from '../services/api';
import type { Category, QuizSession, QuizMode, TimerType, QuestionType, Difficulty, QuestionStats } from '../types';

interface CategoryWithStats extends Category {
  stats?: {
    question_count?: number;
  };
}

interface QuizSettings {
  mode: QuizMode;
  difficulty: Difficulty | 'mixed';
  selectionMode: 'mixed' | 'custom';
  multipleChoice: number;
  trueFalse: number;
  writtenAnswer: number;
  fillInBlank: number;
  totalQuestions: number;
  timerType: TimerType;
  totalTimeMinutes: number;
  perQuestionSeconds: number;
  allowPartialCredit: boolean;
  allowHandwrittenUpload: boolean;
  chapter: string;
}

function QuizPage(): React.ReactElement {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryWithStats | null>(null);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [history, setHistory] = useState<QuizSession[]>([]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<QuizSettings>({
    mode: 'practice',
    difficulty: 'mixed',
    selectionMode: 'mixed',
    multipleChoice: 5,
    trueFalse: 3,
    writtenAnswer: 2,
    fillInBlank: 0,
    totalQuestions: 10,
    timerType: 'total',
    totalTimeMinutes: 30,
    perQuestionSeconds: 60,
    allowPartialCredit: true,
    allowHandwrittenUpload: true,
    chapter: ''
  });

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async (): Promise<void> => {
    if (!categoryId) return;

    try {
      const [catResponse, statsResponse, historyResponse, chaptersResponse] = await Promise.all([
        categoryApi.getById(Number(categoryId)),
        quizApi.getStats(Number(categoryId)),
        quizApi.getHistory(Number(categoryId)),
        quizApi.getChapters(Number(categoryId))
      ]);

      setCategory(catResponse.data.data || catResponse.data);
      setStats(statsResponse.data.data || statsResponse.data);
      const historyData = historyResponse.data.data || historyResponse.data;
      setHistory((historyData as any).sessions || historyData || []);
      const chaptersData = chaptersResponse.data.data || chaptersResponse.data;
      setChapters((chaptersData as any).chapters || chaptersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async (): Promise<void> => {
    if (!categoryId) return;

    try {
      const response = await quizApi.createSession(Number(categoryId), settings as any);
      const data = response.data.data || response.data;
      navigate(`/category/${categoryId}/quiz/session/${(data as any).session_id}`);
    } catch (error: any) {
      console.error('Error starting quiz:', error);
      alert('Error starting quiz: ' + (error.response?.data?.error || error.message));
    }
  };

  const getModeIcon = (mode: QuizMode): React.ReactElement => {
    switch (mode) {
      case 'practice': return <BookOpen className="h-6 w-6" />;
      case 'timed': return <Clock className="h-6 w-6" />;
      case 'exam': return <Monitor className="h-6 w-6" />;
      default: return <BookOpen className="h-6 w-6" />;
    }
  };

  const getModeDescription = (mode: QuizMode): string => {
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
        onClick={() => navigate(`/category/${categoryId}`)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Dashboard
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
                {(['practice', 'timed', 'exam'] as QuizMode[]).map((mode) => (
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
                  <span className="block text-sm font-medium text-gray-700 mb-2">
                    Timer Type
                  </span>
                  <div className="flex space-x-4">
                    <label htmlFor="timerType-total" className="flex items-center">
                      <input
                        type="radio"
                        id="timerType-total"
                        name="timerType"
                        value="total"
                        checked={settings.timerType === 'total'}
                        onChange={(e) => setSettings({ ...settings, timerType: e.target.value as TimerType })}
                        className="mr-2"
                      />
                      <span className="text-sm">Total Time</span>
                    </label>
                    <label htmlFor="timerType-per_question" className="flex items-center">
                      <input
                        type="radio"
                        id="timerType-per_question"
                        name="timerType"
                        value="per_question"
                        checked={settings.timerType === 'per_question'}
                        onChange={(e) => setSettings({ ...settings, timerType: e.target.value as TimerType })}
                        className="mr-2"
                      />
                      <span className="text-sm">Per Question</span>
                    </label>
                  </div>
                </div>

                {settings.timerType === 'total' ? (
                  <div>
                    <label htmlFor="totalTimeMinutes" className="block text-sm font-medium text-gray-700 mb-1">
                      Total Time (minutes)
                    </label>
                    <input
                      type="number"
                      id="totalTimeMinutes"
                      name="totalTimeMinutes"
                      className="input"
                      min="1"
                      max="180"
                      value={settings.totalTimeMinutes}
                      onChange={(e) => setSettings({ ...settings, totalTimeMinutes: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="perQuestionSeconds" className="block text-sm font-medium text-gray-700 mb-1">
                      Time Per Question (seconds)
                    </label>
                    <input
                      type="number"
                      id="perQuestionSeconds"
                      name="perQuestionSeconds"
                      className="input"
                      min="10"
                      max="600"
                      value={settings.perQuestionSeconds}
                      onChange={(e) => setSettings({ ...settings, perQuestionSeconds: parseInt(e.target.value) || 10 })}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Question Selection Mode */}
            <div>
              <label htmlFor="selectionMode" className="block text-sm font-medium text-gray-700 mb-1">
                Question Selection
              </label>
              <select
                id="selectionMode"
                name="selectionMode"
                className="select"
                value={settings.selectionMode}
                onChange={(e) => setSettings({ ...settings, selectionMode: e.target.value as 'mixed' | 'custom' })}
              >
                <option value="mixed">Mixed & Randomized (All Types)</option>
                <option value="custom">Custom Selection</option>
              </select>
            </div>

            {settings.selectionMode === 'mixed' ? (
              <div>
                <label htmlFor="totalQuestions" className="block text-sm font-medium text-gray-700 mb-1">
                  Total Questions
                </label>
                <input
                  type="number"
                  id="totalQuestions"
                  name="totalQuestions"
                  className="input"
                  min="1"
                  max={stats?.total || 50}
                  value={settings.totalQuestions}
                  onChange={(e) => setSettings({ ...settings, totalQuestions: parseInt(e.target.value) || 1 })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {stats?.total || 0} questions (all types)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label htmlFor="multipleChoice" className="block text-sm font-medium text-gray-700 mb-1">
                    Multiple Choice Questions
                  </label>
                  <input
                    type="number"
                    id="multipleChoice"
                    name="multipleChoice"
                    className="input"
                    min="0"
                    max={stats?.by_type?.multiple_choice || 0}
                    value={settings.multipleChoice}
                    onChange={(e) => setSettings({ ...settings, multipleChoice: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {stats?.by_type?.multiple_choice || 0}
                  </p>
                </div>

                <div>
                  <label htmlFor="trueFalse" className="block text-sm font-medium text-gray-700 mb-1">
                    True/False Questions
                  </label>
                  <input
                    type="number"
                    id="trueFalse"
                    name="trueFalse"
                    className="input"
                    min="0"
                    max={stats?.by_type?.true_false || 0}
                    value={settings.trueFalse}
                    onChange={(e) => setSettings({ ...settings, trueFalse: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {stats?.by_type?.true_false || 0}
                  </p>
                </div>

                <div>
                  <label htmlFor="writtenAnswer" className="block text-sm font-medium text-gray-700 mb-1">
                    Written Answer Questions
                  </label>
                  <input
                    type="number"
                    id="writtenAnswer"
                    name="writtenAnswer"
                    className="input"
                    min="0"
                    max={(stats?.by_type as any)?.written || (stats?.by_type as any)?.written_answer || 0}
                    value={settings.writtenAnswer}
                    onChange={(e) => setSettings({ ...settings, writtenAnswer: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {(stats?.by_type as any)?.written || (stats?.by_type as any)?.written_answer || 0}
                  </p>
                </div>

                <div>
                  <label htmlFor="fillInBlank" className="block text-sm font-medium text-gray-700 mb-1">
                    Fill in the Blank Questions
                  </label>
                  <input
                    type="number"
                    id="fillInBlank"
                    name="fillInBlank"
                    className="input"
                    min="0"
                    max={stats?.by_type?.fill_in_blank || 0}
                    value={settings.fillInBlank}
                    onChange={(e) => setSettings({ ...settings, fillInBlank: parseInt(e.target.value) || 0 })}
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
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                className="select"
                value={settings.difficulty}
                onChange={(e) => setSettings({ ...settings, difficulty: e.target.value as Difficulty | 'mixed' })}
              >
                <option value="mixed">Mixed</option>
                <option value="easy">Easy ({(stats as any)?.easy || 0})</option>
                <option value="medium">Medium ({(stats as any)?.medium || 0})</option>
                <option value="hard">Hard ({(stats as any)?.hard || 0})</option>
              </select>
            </div>

            {/* Chapter Filter */}
            {chapters.length > 0 && (
              <div>
                <label htmlFor="chapter" className="block text-sm font-medium text-gray-700 mb-1">
                  Chapter/Topic Filter
                </label>
                <select
                  id="chapter"
                  name="chapter"
                  className="select"
                  value={settings.chapter}
                  onChange={(e) => setSettings({ ...settings, chapter: e.target.value })}
                >
                  <option value="">Random (All Chapters)</option>
                  {chapters.map((chapter) => (
                    <option key={chapter} value={chapter}>{chapter}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a chapter to filter questions, or leave as "Random" for all
                </p>
              </div>
            )}

            {/* Advanced Options */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Advanced Options</h3>
              <div className="space-y-3">
                <label htmlFor="allowPartialCredit" className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="allowPartialCredit"
                    name="allowPartialCredit"
                    checked={settings.allowPartialCredit}
                    onChange={(e) => setSettings({ ...settings, allowPartialCredit: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    Enable partial credit for complex questions
                  </span>
                </label>
                <label htmlFor="allowHandwrittenUpload" className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="allowHandwrittenUpload"
                    name="allowHandwrittenUpload"
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
                const quizSettings = quiz.settings || {} as any;
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
                          {new Date(quiz.completed_at || quiz.started_at).toLocaleDateString()} at{' '}
                          {new Date(quiz.completed_at || quiz.started_at).toLocaleTimeString()}
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
