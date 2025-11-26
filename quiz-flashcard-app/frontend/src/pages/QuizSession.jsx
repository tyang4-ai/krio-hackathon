import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Send, Clock, ArrowLeft, AlertTriangle, Upload, FileText, X } from 'lucide-react';
import { quizApi, quizEnhancedApi } from '../services/api';
import ScientificInput from '../components/ScientificInput';

function QuizSession() {
  const { categoryId, sessionId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [settings, setSettings] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(null);
  const timerRef = useRef(null);

  // Focus tracking for exam mode
  const [focusViolations, setFocusViolations] = useState(0);
  const [showFocusWarning, setShowFocusWarning] = useState(false);

  // Handwritten uploads
  const [handwrittenFiles, setHandwrittenFiles] = useState({});
  const [uploadingHandwritten, setUploadingHandwritten] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadQuiz();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionId]);

  // Focus tracking for exam mode
  useEffect(() => {
    if (settings?.mode === 'exam') {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          recordFocusEvent('tab_switch');
        }
      };

      const handleWindowBlur = () => {
        recordFocusEvent('window_blur');
        setShowFocusWarning(true);
        setTimeout(() => setShowFocusWarning(false), 3000);
      };

      const handleMouseLeave = (e) => {
        if (e.clientY <= 0 || e.clientX <= 0 ||
            e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          recordFocusEvent('focus_lost', { x: e.clientX, y: e.clientY });
          setShowFocusWarning(true);
          setTimeout(() => setShowFocusWarning(false), 3000);
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

  const recordFocusEvent = async (eventType, details = {}) => {
    try {
      await quizEnhancedApi.recordFocusEvent(sessionId, eventType, details);
      setFocusViolations(prev => prev + 1);
    } catch (error) {
      console.error('Error recording focus event:', error);
    }
  };

  // Initialize timer values when settings are loaded
  useEffect(() => {
    if (!settings || settings.mode === 'practice') return;

    console.log('Timer initialization - mode:', settings.mode, 'timerType:', settings.timerType);

    // Set initial timer value based on timer type
    if (settings.timerType === 'total') {
      const totalSeconds = (settings.totalTimeMinutes || 30) * 60;
      console.log('Setting total time:', totalSeconds, 'seconds');
      setTimeRemaining(totalSeconds);
    } else if (settings.timerType === 'per_question') {
      const perQuestionSecs = settings.perQuestionSeconds || 60;
      console.log('Setting per-question time:', perQuestionSecs, 'seconds');
      setQuestionTimeRemaining(perQuestionSecs);
    }
  }, [settings?.mode, settings?.timerType, settings?.totalTimeMinutes, settings?.perQuestionSeconds]);

  // Timer countdown effect - MUST run after initialization
  useEffect(() => {
    // Only start timer for timed/exam modes
    if (!settings || settings.mode === 'practice') {
      console.log('Timer not starting - practice mode or no settings');
      return;
    }

    // Check if we have timer values initialized
    const isTotalTimer = settings.timerType === 'total';
    const isPerQuestionTimer = settings.timerType === 'per_question';

    if (!isTotalTimer && !isPerQuestionTimer) {
      console.log('Timer not starting - no timer type set');
      return;
    }

    // Wait for timer to be initialized
    if (isTotalTimer && timeRemaining === null) {
      console.log('Waiting for total timer initialization...');
      return;
    }
    if (isPerQuestionTimer && questionTimeRemaining === null) {
      console.log('Waiting for per-question timer initialization...');
      return;
    }

    console.log('Starting timer countdown - type:', settings.timerType);

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      if (settings.timerType === 'total') {
        setTimeRemaining(prev => {
          if (prev === null || prev === undefined) return prev;
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit(true); // Auto-submit
            return 0;
          }
          return prev - 1;
        });
      } else if (settings.timerType === 'per_question') {
        setQuestionTimeRemaining(prev => {
          if (prev === null || prev === undefined) return prev;
          if (prev <= 1) {
            // Move to next question or submit
            if (currentIndex < quiz?.questions?.length - 1) {
              setCurrentIndex(i => i + 1);
              return settings.perQuestionSeconds || 60;
            } else {
              clearInterval(timerRef.current);
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

  // Reset per-question timer when changing questions
  useEffect(() => {
    if (settings?.timerType === 'per_question' && settings?.perQuestionSeconds) {
      setQuestionTimeRemaining(settings.perQuestionSeconds);
    }
  }, [currentIndex, settings?.timerType, settings?.perQuestionSeconds]);

  const loadQuiz = async () => {
    try {
      const response = await quizApi.getSession(sessionId);
      const session = response.data.data || response.data;

      if (session.completed) {
        navigate(`/category/${categoryId}/quiz/results/${sessionId}`);
        return;
      }

      // Handle settings - could be string or object
      const parsedSettings = typeof session.settings === 'string'
        ? JSON.parse(session.settings)
        : session.settings;
      setSettings(parsedSettings);

      // Handle questions - could be string or object/array
      const questionIds = typeof session.questions === 'string'
        ? JSON.parse(session.questions)
        : session.questions;
      const questionsResponse = await quizApi.getQuestions(categoryId);
      const questionsData = questionsResponse.data.data || questionsResponse.data;
      const allQuestions = questionsData.questions || questionsData || [];

      const sessionQuestions = questionIds
        .map(id => allQuestions.find(q => q.id === id))
        .filter(q => q);

      setQuiz({
        ...session,
        questions: sessionQuestions
      });

      // Load existing handwritten answers
      try {
        const handwrittenResponse = await quizEnhancedApi.getHandwrittenAnswers(sessionId);
        const handwrittenData = handwrittenResponse.data.data || handwrittenResponse.data;
        const handwrittenArray = Array.isArray(handwrittenData) ? handwrittenData : (handwrittenData.answers || []);
        const handwritten = {};
        handwrittenArray.forEach(h => {
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

  const handleSelectAnswer = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleHandwrittenUpload = async (questionId, file) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setUploadingHandwritten(true);
    try {
      const response = await quizEnhancedApi.uploadHandwrittenAnswer(sessionId, questionId, file);
      setHandwrittenFiles({
        ...handwrittenFiles,
        [questionId]: response.data.data
      });
    } catch (error) {
      console.error('Error uploading handwritten answer:', error);
      alert('Error uploading file: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadingHandwritten(false);
    }
  };

  const removeHandwrittenFile = (questionId) => {
    const updated = { ...handwrittenFiles };
    delete updated[questionId];
    setHandwrittenFiles(updated);
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      const unanswered = quiz.questions.filter(q => !answers[q.id] && !handwrittenFiles[q.id]).length;
      if (unanswered > 0) {
        if (!window.confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) {
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      // Use enhanced submit if partial credit is enabled
      if (settings?.allowPartialCredit) {
        await quizEnhancedApi.submitWithGrading(sessionId, answers, true);
      } else {
        await quizApi.submitAnswers(sessionId, answers);
      }
      navigate(`/category/${categoryId}/quiz/results/${sessionId}`);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Error submitting quiz: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (seconds, total) => {
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
  const totalTime = settings?.timerType === 'total' ? settings.totalTimeMinutes * 60 : settings?.perQuestionSeconds;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Focus Warning Overlay */}
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

      {/* Timer and Mode Display */}
      {settings?.mode !== 'practice' && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Total or Per-Question Timer */}
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 ${
              getTimerColor(
                settings.timerType === 'total' ? timeRemaining : questionTimeRemaining,
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

            {/* Mode Badge */}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              settings.mode === 'exam'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {settings.mode} mode
            </span>
          </div>

          {/* Focus Violations Counter (Exam Mode) */}
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

      {/* Progress Bar */}
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

      {/* Question Card */}
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

        {currentQuestion.question_type === 'written_answer' ? (
          <div className="space-y-4">
            <ScientificInput
              value={answers[currentQuestion.id] || ''}
              onChange={(newValue) => handleSelectAnswer(currentQuestion.id, newValue)}
              placeholder="Type your answer here..."
              disabled={!!handwrittenFiles[currentQuestion.id]}
            />

            {/* Handwritten Upload Option */}
            {settings?.allowHandwrittenUpload && (
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
                            Recognized: "{handwrittenFiles[currentQuestion.id].recognized_text.substring(0, 50)}..."
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
                        if (e.target.files[0]) {
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
            <ScientificInput
              value={answers[currentQuestion.id] || ''}
              onChange={(newValue) => handleSelectAnswer(currentQuestion.id, newValue)}
              placeholder="Enter the answer to fill in the blank..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Fill in the blank with the appropriate answer. Use the toolbar for scientific notation, formulas, and symbols.
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

      {/* Navigation */}
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
