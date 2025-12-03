import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Send, Clock, ArrowLeft, AlertTriangle, Upload, FileText, X } from 'lucide-react';
import { quizApi, quizEnhancedApi } from '../services/api';
import type { Question, QuizSession as QuizSessionType, QuizSettings, FocusEventType, HandwrittenAnswer } from '../types';

interface QuizWithQuestions extends QuizSessionType {
  questions: Question[];
}

function QuizSession(): React.ReactElement {
  const { categoryId, sessionId } = useParams<{ categoryId: string; sessionId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [settings, setSettings] = useState<QuizSettings | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [focusViolations, setFocusViolations] = useState<number>(0);
  const [showFocusWarning, setShowFocusWarning] = useState<boolean>(false);

  const [handwrittenFiles, setHandwrittenFiles] = useState<Record<number, HandwrittenAnswer>>({});
  const [uploadingHandwritten, setUploadingHandwritten] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Time tracking per question
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState<Record<number, number>>({});

  useEffect(() => {
    loadQuiz();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [sessionId]);

  useEffect(() => {
    if (settings?.mode === 'exam') {
      const handleVisibilityChange = (): void => {
        if (document.hidden) {
          recordFocusEvent('tab_switch');
        }
      };

      const handleWindowBlur = (): void => {
        recordFocusEvent('window_blur');
        setShowFocusWarning(true);
        if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = setTimeout(() => setShowFocusWarning(false), 3000);
      };

      const handleMouseLeave = (e: MouseEvent): void => {
        if (e.clientY <= 0 || e.clientX <= 0 ||
            e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          recordFocusEvent('focus_lost', { x: e.clientX, y: e.clientY });
          setShowFocusWarning(true);
          if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
          warningTimeoutRef.current = setTimeout(() => setShowFocusWarning(false), 3000);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);
      document.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleWindowBlur);
        document.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [settings?.mode, sessionId]);

  const recordFocusEvent = async (eventType: FocusEventType, details: Record<string, unknown> = {}): Promise<void> => {
    if (!sessionId) return;

    try {
      await quizEnhancedApi.recordFocusEvent(Number(sessionId), eventType, details);
      setFocusViolations(prev => prev + 1);
    } catch (error) {
      console.error('Error recording focus event:', error);
    }
  };

  useEffect(() => {
    if (!settings || settings.mode === 'practice') return;

    if (settings.timerType === 'total') {
      const totalSeconds = ((settings as any).totalTimeMinutes || 30) * 60;
      setTimeRemaining(totalSeconds);
    } else if (settings.timerType === 'per_question') {
      const perQuestionSecs = (settings as any).perQuestionSeconds || 60;
      setQuestionTimeRemaining(perQuestionSecs);
    }
  }, [settings?.mode, settings?.timerType, (settings as any)?.totalTimeMinutes, (settings as any)?.perQuestionSeconds]);

  useEffect(() => {
    if (!settings || settings.mode === 'practice') {
      return;
    }

    const isTotalTimer = settings.timerType === 'total';
    const isPerQuestionTimer = settings.timerType === 'per_question';

    if (!isTotalTimer && !isPerQuestionTimer) {
      return;
    }

    if (isTotalTimer && timeRemaining === null) {
      return;
    }
    if (isPerQuestionTimer && questionTimeRemaining === null) {
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      if (settings.timerType === 'total') {
        setTimeRemaining(prev => {
          if (prev === null || prev === undefined) return prev;
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      } else if (settings.timerType === 'per_question') {
        setQuestionTimeRemaining(prev => {
          if (prev === null || prev === undefined) return prev;
          if (prev <= 1) {
            if (currentIndex < (quiz?.questions?.length || 0) - 1) {
              setCurrentIndex(i => i + 1);
              return (settings as any).perQuestionSeconds || 60;
            } else {
              if (timerRef.current) clearInterval(timerRef.current);
              handleSubmit(true);
              return 0;
            }
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [settings?.mode, settings?.timerType, timeRemaining !== null, questionTimeRemaining !== null, quiz?.questions?.length]);

  useEffect(() => {
    if (settings?.timerType === 'per_question' && (settings as any)?.perQuestionSeconds) {
      setQuestionTimeRemaining((settings as any).perQuestionSeconds);
    }
  }, [currentIndex, settings?.timerType, (settings as any)?.perQuestionSeconds]);

  // Track time spent on each question when navigating
  useEffect(() => {
    if (!quiz?.questions?.length) return;

    const currentQuestion = quiz.questions[currentIndex];
    if (!currentQuestion) return;

    // Record time spent on previous question when moving to new question
    return () => {
      const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
      if (timeSpent > 0 && currentQuestion) {
        setTimeSpentPerQuestion(prev => ({
          ...prev,
          [currentQuestion.id]: (prev[currentQuestion.id] || 0) + timeSpent
        }));
      }
    };
  }, [currentIndex, quiz?.questions]);

  // Reset start time when question changes
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  const loadQuiz = async (): Promise<void> => {
    if (!sessionId || !categoryId) return;

    try {
      const response = await quizApi.getSession(Number(sessionId));
      const session = response.data.data || response.data;

      if (session.completed) {
        navigate(`/category/${categoryId}/quiz/results/${sessionId}`);
        return;
      }

      const parsedSettings = typeof session.settings === 'string'
        ? JSON.parse(session.settings)
        : session.settings;
      setSettings(parsedSettings);

      const questionIds = typeof session.questions === 'string'
        ? JSON.parse(session.questions)
        : session.questions;
      const questionsResponse = await quizApi.getQuestions(Number(categoryId));
      const questionsData = questionsResponse.data.data || questionsResponse.data;
      const allQuestions = (questionsData as any).questions || questionsData || [];

      const sessionQuestions = questionIds
        .map((id: number) => allQuestions.find((q: Question) => q.id === id))
        .filter((q: Question) => q);

      setQuiz({
        ...session,
        questions: sessionQuestions
      });

      try {
        const handwrittenResponse = await quizEnhancedApi.getHandwrittenAnswers(Number(sessionId));
        const handwrittenData = handwrittenResponse.data.data || handwrittenResponse.data;
        const handwrittenArray = Array.isArray(handwrittenData) ? handwrittenData : ((handwrittenData as any).answers || []);
        const handwritten: Record<number, HandwrittenAnswer> = {};
        handwrittenArray.forEach((h: HandwrittenAnswer) => {
          handwritten[h.question_id] = h;
        });
        setHandwrittenFiles(handwritten);
      } catch (e) {
        // No handwritten answers yet
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId: number, answer: string): void => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleHandwrittenUpload = async (questionId: number, file: File): Promise<void> => {
    if (!file || file.type !== 'application/pdf' || !sessionId) {
      alert('Please upload a PDF file');
      return;
    }

    setUploadingHandwritten(true);
    try {
      const response = await quizEnhancedApi.uploadHandwrittenAnswer(Number(sessionId), questionId, file);
      setHandwrittenFiles({
        ...handwrittenFiles,
        [questionId]: response.data.data
      });
    } catch (error: any) {
      console.error('Error uploading handwritten answer:', error);
      alert('Error uploading file: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadingHandwritten(false);
    }
  };

  const removeHandwrittenFile = (questionId: number): void => {
    const updated = { ...handwrittenFiles };
    delete updated[questionId];
    setHandwrittenFiles(updated);
  };

  const handleSubmit = async (autoSubmit: boolean = false): Promise<void> => {
    if (!sessionId || !categoryId || !quiz) return;

    if (!autoSubmit) {
      const unanswered = quiz.questions.filter(q => !answers[q.id] && !handwrittenFiles[q.id]).length;
      if (unanswered > 0) {
        if (!window.confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) {
          return;
        }
      }
    }

    // Capture time spent on current question before submitting
    const currentQuestion = quiz.questions[currentIndex];
    const finalTimeSpent = { ...timeSpentPerQuestion };
    if (currentQuestion) {
      const timeOnCurrent = Math.round((Date.now() - questionStartTime) / 1000);
      finalTimeSpent[currentQuestion.id] = (finalTimeSpent[currentQuestion.id] || 0) + timeOnCurrent;
    }

    setSubmitting(true);
    try {
      // Note: submitWithGrading endpoint not yet implemented in Python backend
      // Always use the regular submit endpoint for now
      await quizApi.submitAnswers(Number(sessionId), answers, finalTimeSpent);
      navigate(`/category/${categoryId}/quiz/results/${sessionId}`);
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      alert('Error submitting quiz: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (seconds: number, total: number): string => {
    const percentage = seconds / total;
    if (percentage > 0.5) return 'text-green-600';
    if (percentage > 0.25) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return <div>Quiz not found or has no questions</div>;
  }

  const currentQuestion = quiz.questions[currentIndex];
  const answeredCount = Object.keys(answers).length + Object.keys(handwrittenFiles).length;
  const totalTime = settings?.timerType === 'total' ? (settings as any).totalTimeMinutes * 60 : (settings as any)?.perQuestionSeconds;

  return (
    <div className="max-w-3xl mx-auto">
      {showFocusWarning && settings?.mode === 'exam' && (
        <div className="fixed inset-0 bg-red-500 bg-opacity-20 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-red-600 text-white px-8 py-4 rounded-lg shadow-xl flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6" />
            <span className="text-lg font-medium">Focus violation detected!</span>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          if (window.confirm('Are you sure you want to leave? Your progress will be lost.')) {
            navigate(`/category/${categoryId}/quiz`);
          }
        }}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Quiz Settings
      </button>

      {settings?.mode !== 'practice' && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 ${
              getTimerColor(
                settings.timerType === 'total' ? (timeRemaining || 0) : (questionTimeRemaining || 0),
                totalTime
              )
            }`}>
              <Clock className="h-5 w-5" />
              <span className="font-mono text-lg font-bold">
                {settings.timerType === 'total'
                  ? formatTime(timeRemaining || 0)
                  : formatTime(questionTimeRemaining || 0)
                }
              </span>
              <span className="text-sm text-gray-500">
                {settings.timerType === 'total' ? 'total' : 'this question'}
              </span>
            </div>

            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              settings.mode === 'exam'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {settings.mode} mode
            </span>
          </div>

          {settings.mode === 'exam' && (
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
              focusViolations === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {focusViolations} focus {focusViolations === 1 ? 'violation' : 'violations'}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentIndex + 1} of {quiz.questions.length}</span>
          <span>{answeredCount} answered</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className={`px-2 py-1 text-xs rounded ${
            currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
            currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {currentQuestion.difficulty}
          </span>
          <span className="text-xs text-gray-500 capitalize">
            {currentQuestion.question_type.replace('_', ' ')}
          </span>
        </div>

        <h2 className="text-xl font-medium text-gray-900 mb-6">
          {currentQuestion.question_text}
        </h2>

        {(currentQuestion.question_type === 'written' || currentQuestion.question_type === 'written_answer') ? (
          <div className="space-y-4">
            <textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleSelectAnswer(currentQuestion.id, e.target.value)}
              placeholder="Type your answer here..."
              disabled={!!handwrittenFiles[currentQuestion.id]}
              className="input min-h-[150px]"
            />

            {(settings as any)?.allowHandwrittenUpload && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">Or upload a handwritten answer (PDF):</p>

                {handwrittenFiles[currentQuestion.id] ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          {handwrittenFiles[currentQuestion.id].original_name || 'Handwritten answer uploaded'}
                        </p>
                        {handwrittenFiles[currentQuestion.id].recognized_text && (
                          <p className="text-xs text-green-600 mt-1">
                            Recognized: "{handwrittenFiles[currentQuestion.id].recognized_text?.substring(0, 50)}..."
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeHandwrittenFile(currentQuestion.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="application/pdf"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleHandwrittenUpload(currentQuestion.id, e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingHandwritten}
                      className="flex items-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
                    >
                      <Upload className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {uploadingHandwritten ? 'Uploading...' : 'Upload PDF'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500">
              Write a comprehensive answer. You'll see a model answer after submitting.
            </p>
          </div>
        ) : currentQuestion.question_type === 'fill_in_blank' ? (
          <div>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {currentQuestion.question_text}
              </p>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Answer:
            </label>
            <input
              type="text"
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleSelectAnswer(currentQuestion.id, e.target.value)}
              placeholder="Enter the answer to fill in the blank..."
              className="input"
            />
            <p className="text-xs text-gray-500 mt-2">
              Fill in the blank with the appropriate answer.
            </p>
          </div>
        ) : currentQuestion.options && currentQuestion.options.length > 0 ? (
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const letter = option.charAt(0);
              const isSelected = answers[currentQuestion.id] === letter;

              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(currentQuestion.id, letter)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>This question has no answer options configured.</p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="btn-secondary flex items-center space-x-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        <div className="flex space-x-2 overflow-x-auto max-w-md">
          {quiz.questions.map((q, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium flex-shrink-0 ${
                index === currentIndex
                  ? 'bg-primary-500 text-white'
                  : answers[q.id] || handwrittenFiles[q.id]
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {currentIndex === quiz.questions.length - 1 ? (
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="btn-primary flex items-center space-x-1"
          >
            <Send className="h-4 w-4" />
            <span>{submitting ? 'Submitting...' : 'Submit'}</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(Math.min(quiz.questions.length - 1, currentIndex + 1))}
            className="btn-primary flex items-center space-x-1"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default QuizSession;
