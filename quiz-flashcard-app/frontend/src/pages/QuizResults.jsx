import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { quizApi } from '../services/api';

function QuizResults() {
  const { categoryId, sessionId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [sessionId]);

  const loadResults = async () => {
    try {
      // Get the session data
      const sessionResponse = await quizApi.getSession(sessionId);
      const session = sessionResponse.data.data;

      // Get all questions for this category
      const questionsResponse = await quizApi.getQuestions(categoryId);
      const allQuestions = questionsResponse.data.data;

      // Parse session data
      const questionIds = JSON.parse(session.questions);
      const answers = session.answers ? JSON.parse(session.answers) : {};

      // Build results
      const results = questionIds.map(id => {
        const question = allQuestions.find(q => q.id === id);
        const userAnswer = answers[id];
        const isCorrect = userAnswer === question?.correct_answer;

        return {
          question_id: id,
          question_text: question?.question_text || 'Question not found',
          options: question?.options || [],
          user_answer: userAnswer,
          correct_answer: question?.correct_answer,
          is_correct: isCorrect,
          explanation: question?.explanation,
          difficulty: question?.difficulty
        };
      });

      setResults({
        score: session.score,
        total: session.total_questions,
        percentage: Math.round((session.score / session.total_questions) * 100),
        results
      });
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
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
          You got {results.score} out of {results.total} questions correct
        </p>

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

      {/* Detailed Results */}
      <h2 className="text-xl font-semibold mb-4">Question Review</h2>
      <div className="space-y-4">
        {results.results.map((result, index) => (
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
                </div>

                {result.explanation && (
                  <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                    <strong>Explanation:</strong> {result.explanation}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuizResults;
