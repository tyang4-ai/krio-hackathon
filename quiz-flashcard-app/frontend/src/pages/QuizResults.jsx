import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle, XCircle, ArrowLeft, RotateCcw, AlertTriangle,
  FileText, Edit3, Check, X, Award, TrendingUp
} from 'lucide-react';
import { quizApi, quizEnhancedApi } from '../services/api';

function QuizResults() {
  const { categoryId, sessionId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [settings, setSettings] = useState(null);
  const [integrityReport, setIntegrityReport] = useState(null);
  const [handwrittenAnswers, setHandwrittenAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Handwriting correction state
  const [editingHandwritten, setEditingHandwritten] = useState(null);
  const [correctedText, setCorrectedText] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);

  useEffect(() => {
    loadResults();
  }, [sessionId]);

  const loadResults = async () => {
    try {
      // Get the session data
      const sessionResponse = await quizApi.getSession(sessionId);
      const session = sessionResponse.data.data || sessionResponse.data;
      // Handle settings - could be string or object
      const parsedSettings = typeof session.settings === 'string'
        ? JSON.parse(session.settings)
        : session.settings;
      setSettings(parsedSettings);

      // Get all questions for this category
      const questionsResponse = await quizApi.getQuestions(categoryId);
      const questionsData = questionsResponse.data.data || questionsResponse.data;
      const allQuestions = questionsData.questions || questionsData || [];

      // Parse session data - handle both string and object formats
      const questionIds = typeof session.questions === 'string'
        ? JSON.parse(session.questions)
        : session.questions;
      const answers = typeof session.answers === 'string'
        ? JSON.parse(session.answers)
        : (session.answers || {});

      // Try to get partial credit grades
      let partialGrades = {};
      try {
        const gradesResponse = await quizEnhancedApi.getPartialCreditGrades(sessionId);
        const gradesData = gradesResponse.data.data || gradesResponse.data;
        // Handle both array response and {grades: [...]} response
        const gradesArray = Array.isArray(gradesData) ? gradesData : (gradesData.grades || []);
        gradesArray.forEach(g => {
          partialGrades[g.question_id] = g;
        });
      } catch (e) {
        // No partial grades available
      }

      // Try to get handwritten answers
      try {
        const handwrittenResponse = await quizEnhancedApi.getHandwrittenAnswers(sessionId);
        const handwrittenData = handwrittenResponse.data.data || handwrittenResponse.data;
        // Handle both array response and {answers: [...]} response
        const handwrittenArray = Array.isArray(handwrittenData) ? handwrittenData : (handwrittenData.answers || []);
        setHandwrittenAnswers(handwrittenArray);
      } catch (e) {
        // No handwritten answers
      }

      // Helper function to normalize answer for comparison
      const normalizeAnswer = (answer) => {
        if (!answer) return '';
        let normalized = answer.toString().trim().toUpperCase();
        // Extract just the letter if format is "A)" or "A) Option"
        if (normalized.length > 0 && normalized[0].match(/[A-Z]/)) {
          if (normalized.length > 1 && [')', '.', ':'].includes(normalized[1])) {
            return normalized[0];
          }
        }
        return normalized;
      };

      // Build results
      const resultsList = questionIds.map(id => {
        const question = allQuestions.find(q => q.id === id);
        const userAnswer = answers[id];
        const partialGrade = partialGrades[id];

        // Determine correctness based on partial credit if available, or normalized comparison
        const userNormalized = normalizeAnswer(userAnswer);
        const correctNormalized = normalizeAnswer(question?.correct_answer);
        const isCorrect = partialGrade
          ? partialGrade.earned_points >= partialGrade.total_points * 0.9
          : userNormalized === correctNormalized;

        return {
          question_id: id,
          question_text: question?.question_text || 'Question not found',
          question_type: question?.question_type || 'multiple_choice',
          options: question?.options || [],
          user_answer: userAnswer,
          correct_answer: question?.correct_answer,
          is_correct: isCorrect,
          explanation: question?.explanation,
          difficulty: question?.difficulty,
          // Partial credit info
          partial_credit: partialGrade ? {
            earned_points: partialGrade.earned_points,
            total_points: partialGrade.total_points,
            breakdown: partialGrade.breakdown ? JSON.parse(partialGrade.breakdown) : [],
            feedback: partialGrade.feedback
          } : null
        };
      });

      // Use the score from the session if available, otherwise calculate
      const sessionScore = session.score;
      let totalEarned = 0;
      let totalPossible = 0;

      resultsList.forEach(r => {
        if (r.partial_credit) {
          totalEarned += r.partial_credit.earned_points;
          totalPossible += r.partial_credit.total_points;
        } else {
          totalPossible += 1;
          if (r.is_correct) totalEarned += 1;
        }
      });

      // Prefer session score for consistency with backend calculation
      const finalScore = sessionScore !== null && sessionScore !== undefined ? sessionScore : totalEarned;
      const finalTotal = totalPossible || questionIds.length;

      setResults({
        score: Math.round(finalScore * 10) / 10,
        total: finalTotal,
        percentage: Math.round((finalScore / finalTotal) * 100),
        results: resultsList
      });

      // Get integrity report for exam mode
      if (parsedSettings.mode === 'exam') {
        try {
          const integrityResponse = await quizEnhancedApi.getIntegrityReport(sessionId);
          setIntegrityReport(integrityResponse.data.data);
        } catch (e) {
          // No integrity report
        }
      }
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCorrection = (handwritten) => {
    setEditingHandwritten(handwritten.id);
    setCorrectedText(handwritten.recognized_text || '');
  };

  const handleSaveCorrection = async (handwrittenId) => {
    setSavingCorrection(true);
    try {
      // Find the original text for learning
      const original = handwrittenAnswers.find(h => h.id === handwrittenId);
      const corrections = [];

      if (original?.recognized_text && correctedText !== original.recognized_text) {
        corrections.push({
          original: original.recognized_text,
          corrected: correctedText
        });
      }

      await quizEnhancedApi.updateHandwrittenRecognition(handwrittenId, correctedText, corrections);

      // Update local state
      setHandwrittenAnswers(prev =>
        prev.map(h =>
          h.id === handwrittenId
            ? { ...h, recognized_text: correctedText, user_corrections: JSON.stringify(corrections) }
            : h
        )
      );

      setEditingHandwritten(null);
      setCorrectedText('');
    } catch (error) {
      console.error('Error saving correction:', error);
      alert('Error saving correction: ' + (error.response?.data?.error || error.message));
    } finally {
      setSavingCorrection(false);
    }
  };

  const getHandwrittenForQuestion = (questionId) => {
    return handwrittenAnswers.find(h => h.question_id === questionId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!results) {
    return <div>Results not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate(`/category/${categoryId}/quiz`)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Quiz
      </button>

      {/* Score Summary */}
      <div className="card text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Quiz Complete!</h1>
        <div className={`text-6xl font-bold mb-2 ${
          results.percentage >= 70 ? 'text-primary-600' :
          results.percentage >= 50 ? 'text-gold-600' :
          'text-accent-600'
        }`}>
          {results.percentage}%
        </div>
        <p className="text-gray-600">
          You scored {results.score} out of {results.total} points
        </p>

        {/* Mode Badge */}
        {settings?.mode && (
          <div className="mt-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              settings.mode === 'exam' ? 'bg-purple-100 text-purple-700' :
              settings.mode === 'timed' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {settings.mode === 'exam' && <Award className="h-4 w-4 mr-1" />}
              {settings.mode.charAt(0).toUpperCase() + settings.mode.slice(1)} Mode
            </span>
          </div>
        )}

        <div className="flex justify-center space-x-4 mt-6">
          <Link
            to={`/category/${categoryId}/quiz`}
            className="btn-secondary flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </Link>
          <Link
            to={`/category/${categoryId}`}
            className="btn-primary flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Exam Integrity Report */}
      {integrityReport && (
        <div className={`card mb-8 ${
          (integrityReport.total_violations || integrityReport.totalViolations || 0) === 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className={`h-6 w-6 ${
              (integrityReport.total_violations || integrityReport.totalViolations || 0) === 0 ? 'text-green-600' : 'text-red-600'
            }`} />
            <h2 className="text-lg font-semibold">Exam Integrity Report</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className={`text-2xl font-bold ${
                (integrityReport.integrity_score || integrityReport.integrityScore || 0) >= 80 ? 'text-green-600' :
                (integrityReport.integrity_score || integrityReport.integrityScore || 0) >= 50 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {integrityReport.integrity_score || integrityReport.integrityScore || 0}%
              </p>
              <p className="text-sm text-gray-600">Integrity Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {integrityReport.total_violations || integrityReport.totalViolations || 0}
              </p>
              <p className="text-sm text-gray-600">Total Violations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {integrityReport.tab_switch_count || integrityReport.tabSwitchCount || 0}
              </p>
              <p className="text-sm text-gray-600">Tab Switches</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {integrityReport.focus_lost_count || integrityReport.focusLostCount || 0}
              </p>
              <p className="text-sm text-gray-600">Focus Lost</p>
            </div>
          </div>

          {(integrityReport.total_violations || integrityReport.totalViolations || 0) === 0 && (
            <p className="text-sm text-green-700 mt-4 text-center">
              Excellent! You maintained focus throughout the exam.
            </p>
          )}
        </div>
      )}

      {/* Detailed Results */}
      <h2 className="text-xl font-semibold mb-4">Question Review</h2>
      <div className="space-y-4">
        {results.results.map((result, index) => {
          const handwritten = getHandwrittenForQuestion(result.question_id);
          const isEditing = editingHandwritten === handwritten?.id;

          return (
            <div
              key={index}
              className={`card border-l-4 ${
                result.is_correct ? 'border-l-green-500' : 'border-l-red-500'
              }`}
            >
              <div className="flex items-start space-x-3">
                {result.is_correct ? (
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-3">
                    {index + 1}. {result.question_text}
                  </p>

                  {/* Partial Credit Display */}
                  {result.partial_credit && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-800 flex items-center">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Partial Credit
                        </span>
                        <span className={`text-sm font-bold ${
                          result.partial_credit.earned_points >= result.partial_credit.total_points * 0.9
                            ? 'text-green-600'
                            : result.partial_credit.earned_points > 0
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}>
                          {result.partial_credit.earned_points} / {result.partial_credit.total_points} points
                        </span>
                      </div>

                      {result.partial_credit.breakdown && result.partial_credit.breakdown.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {result.partial_credit.breakdown.map((item, i) => (
                            <div key={i} className="flex items-center text-xs">
                              {item.earned > 0 ? (
                                <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500 mr-1" />
                              )}
                              <span className={item.earned > 0 ? 'text-green-700' : 'text-red-700'}>
                                {item.component}: {item.earned}/{item.points} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {result.partial_credit.feedback && (
                        <p className="text-xs text-blue-700 mt-2 italic">
                          {result.partial_credit.feedback}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Handwritten Answer Section */}
                  {handwritten && (
                    <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-800 flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          Handwritten Answer
                        </span>
                        {!isEditing && (
                          <button
                            onClick={() => handleStartCorrection(handwritten)}
                            className="text-xs text-purple-600 hover:text-purple-800 flex items-center"
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Correct Recognition
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={correctedText}
                            onChange={(e) => setCorrectedText(e.target.value)}
                            className="w-full p-2 text-sm border border-purple-300 rounded focus:ring-2 focus:ring-purple-500"
                            rows={3}
                            placeholder="Enter corrected text..."
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSaveCorrection(handwritten.id)}
                              disabled={savingCorrection}
                              className="flex items-center px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              {savingCorrection ? 'Saving...' : 'Save & Learn'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingHandwritten(null);
                                setCorrectedText('');
                              }}
                              className="flex items-center px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </button>
                          </div>
                          <p className="text-xs text-purple-600">
                            Your corrections help the AI learn to recognize handwriting better!
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-purple-700 font-mono">
                            "{handwritten.recognized_text || 'Unable to recognize'}"
                          </p>
                          {handwritten.confidence_score && (
                            <p className="text-xs text-purple-500 mt-1">
                              Confidence: {Math.round(handwritten.confidence_score * 100)}%
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {result.question_type === 'written_answer' || result.question_type === 'fill_in_blank' ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Your Answer:</p>
                        <div className="p-3 bg-gray-50 rounded text-sm text-gray-700 font-mono whitespace-pre-wrap">
                          {result.user_answer || <span className="text-gray-400 italic">No answer provided</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">
                          {result.question_type === 'fill_in_blank' ? 'Correct Answer:' : 'Model Answer:'}
                        </p>
                        <div className="p-3 bg-green-50 rounded text-sm text-green-800 font-mono whitespace-pre-wrap">
                          {result.correct_answer}
                        </div>
                      </div>
                      {result.explanation && (
                        <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                          <strong>{result.question_type === 'fill_in_blank' ? 'Explanation:' : 'Key Points:'}</strong> {result.explanation}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 mb-3">
                      {result.options.map((option, optIndex) => {
                        const letter = option.charAt(0);
                        const isUserAnswer = result.user_answer === letter;
                        const isCorrectAnswer = result.correct_answer === letter;

                        return (
                          <div
                            key={optIndex}
                            className={`p-2 rounded text-sm ${
                              isCorrectAnswer
                                ? 'bg-green-100 text-green-800'
                                : isUserAnswer
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            {option}
                            {isCorrectAnswer && ' ✓'}
                            {isUserAnswer && !isCorrectAnswer && ' (your answer)'}
                          </div>
                        );
                      })}
                      {result.explanation && (
                        <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mt-3">
                          <strong>Explanation:</strong> {result.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default QuizResults;
