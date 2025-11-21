import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Send, Clock, ArrowLeft } from 'lucide-react';
import { quizApi } from '../services/api';

function QuizSession() {
  const { categoryId, sessionId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [sessionId]);

  const loadQuiz = async () => {
    try {
      // The quiz session contains the questions
      const response = await quizApi.getSession(sessionId);
      const session = response.data.data;

      // If already completed, redirect to results
      if (session.completed) {
        navigate(`/category/${categoryId}/quiz/results/${sessionId}`);
        return;
      }

      // Parse the questions from the session
      const questionIds = JSON.parse(session.questions);

      // Get full questions from the category
      const questionsResponse = await quizApi.getQuestions(categoryId);
      const allQuestions = questionsResponse.data.data;

      // Filter to just the questions in this session
      const sessionQuestions = questionIds
        .map(id => allQuestions.find(q => q.id === id))
        .filter(q => q);

      setQuiz({
        ...session,
        questions: sessionQuestions
      });
    } catch (error) {
      console.error('Error loading quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    const unanswered = quiz.questions.filter(q => !answers[q.id]).length;
    if (unanswered > 0) {
      if (!window.confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      await quizApi.submitAnswers(sessionId, answers);
      navigate(`/category/${categoryId}/quiz/results/${sessionId}`);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Error submitting quiz: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return <div>Quiz not found or has no questions</div>;
  }

  const currentQuestion = quiz.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate(`/category/${categoryId}/quiz`)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Quiz Settings
      </button>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Question {currentIndex + 1} of {quiz.questions.length}</span>
          <span>{answeredCount} answered</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
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
        </div>

        <h2 className="text-xl font-medium text-gray-900 mb-6">
          {currentQuestion.question_text}
        </h2>

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

        <div className="flex space-x-2">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium ${
                index === currentIndex
                  ? 'bg-blue-600 text-white'
                  : answers[quiz.questions[index].id]
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
            onClick={handleSubmit}
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
