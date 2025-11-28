import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Save, X, Star, CheckSquare, Square } from 'lucide-react';
import { quizApi, categoryApi } from '../services/api';
import { Question, QuestionType, Difficulty, Category } from '../types';

interface EditForm {
  question_text: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface FilterState {
  type: QuestionType | 'all';
  difficulty: Difficulty | 'all';
}

function QuestionBank(): React.ReactElement {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    question_text: '',
    question_type: 'multiple_choice',
    difficulty: 'medium',
    options: [],
    correct_answer: '',
    explanation: ''
  });
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<FilterState>({ type: 'all', difficulty: 'all' });

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async (): Promise<void> => {
    try {
      const [catResponse, questionsResponse] = await Promise.all([
        categoryApi.getById(categoryId!),
        quizApi.getQuestions(categoryId!)
      ]);
      // Handle both wrapped and unwrapped response formats
      setCategory(catResponse.data.data || catResponse.data);
      const questionsData = questionsResponse.data.data || questionsResponse.data;
      // Handle both {questions: [...]} and direct array response
      setQuestions((questionsData as any).questions || questionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (question: Question): void => {
    setEditingId(question.id);
    setEditForm({
      question_text: question.question_text,
      question_type: question.question_type,
      difficulty: question.difficulty,
      options: question.options ? [...question.options] : [],
      correct_answer: question.correct_answer,
      explanation: question.explanation || ''
    });
  };

  const handleSave = async (id: number): Promise<void> => {
    try {
      await quizApi.updateQuestion(id, editForm);
      setEditingId(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating question:', error);
      alert('Error updating question: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await quizApi.deleteQuestion(id);
        loadData();
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
  };

  const handleBulkDelete = async (): Promise<void> => {
    if (selectedQuestions.size === 0) {
      alert('No questions selected');
      return;
    }

    if (window.confirm(`Delete ${selectedQuestions.size} selected questions?`)) {
      try {
        await Promise.all(
          Array.from(selectedQuestions).map(id => quizApi.deleteQuestion(id))
        );
        setSelectedQuestions(new Set());
        loadData();
      } catch (error: any) {
        console.error('Error deleting questions:', error);
        alert('Error deleting questions: ' + error.message);
      }
    }
  };

  const handleBulkUpdateDifficulty = async (newDifficulty: Difficulty): Promise<void> => {
    if (selectedQuestions.size === 0) {
      alert('No questions selected');
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedQuestions).map(id => {
          const question = questions.find(q => q.id === id);
          return quizApi.updateQuestion(id, { ...question, difficulty: newDifficulty });
        })
      );
      setSelectedQuestions(new Set());
      loadData();
    } catch (error: any) {
      console.error('Error updating questions:', error);
      alert('Error updating questions: ' + error.message);
    }
  };

  const handleRating = async (questionId: number, rating: number): Promise<void> => {
    try {
      await quizApi.rateQuestion(questionId, rating);
      loadData();
    } catch (error) {
      console.error('Error rating question:', error);
    }
  };

  const toggleSelection = (id: number): void => {
    const newSelection = new Set(selectedQuestions);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedQuestions(newSelection);
  };

  const toggleSelectAll = (): void => {
    if (selectedQuestions.size === filteredQuestions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const updateOption = (index: number, value: string): void => {
    const newOptions = [...editForm.options];
    newOptions[index] = value;
    setEditForm({ ...editForm, options: newOptions });
  };

  // Ensure questions is an array before filtering
  const filteredQuestions = (Array.isArray(questions) ? questions : []).filter(q => {
    if (filter.type !== 'all' && q.question_type !== filter.type) return false;
    if (filter.difficulty !== 'all' && q.difficulty !== filter.difficulty) return false;
    return true;
  });

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

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Question Bank - {category?.name}</h1>
      <p className="text-gray-600 mb-6">Manage and edit your questions</p>

      {/* Filters and Bulk Actions */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Type</label>
              <select
                className="select w-auto"
                value={filter.type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter({ ...filter, type: e.target.value as QuestionType | 'all' })}
              >
                <option value="all">All Types</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
                <option value="written_answer">Written Answer</option>
                <option value="fill_in_blank">Fill in the Blank</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Difficulty</label>
              <select
                className="select w-auto"
                value={filter.difficulty}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter({ ...filter, difficulty: e.target.value as Difficulty | 'all' })}
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {selectedQuestions.size > 0 && (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600">{selectedQuestions.size} selected</span>
              <select
                className="select w-auto"
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  if (e.target.value) {
                    handleBulkUpdateDifficulty(e.target.value as Difficulty);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
              >
                <option value="">Change Difficulty...</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <button onClick={handleBulkDelete} className="btn-danger text-sm">
                Delete Selected
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Question List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600">No questions found</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                {selectedQuestions.size === filteredQuestions.length ? (
                  <CheckSquare className="h-4 w-4 mr-1" />
                ) : (
                  <Square className="h-4 w-4 mr-1" />
                )}
                Select All
              </button>
              <span className="text-xs text-gray-500">
                ({filteredQuestions.length} questions)
              </span>
            </div>

            {filteredQuestions.map((question) => (
              <div key={question.id} className="card">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.has(question.id)}
                    onChange={() => toggleSelection(question.id)}
                    className="mt-1"
                  />

                  <div className="flex-1">
                    {editingId === question.id ? (
                      /* Edit Mode */
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Question
                          </label>
                          <textarea
                            className="input min-h-[80px]"
                            value={editForm.question_text}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditForm({ ...editForm, question_text: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Type
                            </label>
                            <select
                              className="select"
                              value={editForm.question_type}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm({ ...editForm, question_type: e.target.value as QuestionType })}
                            >
                              <option value="multiple_choice">Multiple Choice</option>
                              <option value="true_false">True/False</option>
                              <option value="written_answer">Written Answer</option>
                              <option value="fill_in_blank">Fill in the Blank</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Difficulty
                            </label>
                            <select
                              className="select"
                              value={editForm.difficulty}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm({ ...editForm, difficulty: e.target.value as Difficulty })}
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                          </div>
                        </div>

                        {editForm.question_type !== 'written_answer' && editForm.question_type !== 'fill_in_blank' && editForm.options && editForm.options.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Options
                            </label>
                            <div className="space-y-2">
                              {editForm.options.map((option, index) => (
                                <input
                                  key={index}
                                  type="text"
                                  className="input"
                                  value={option}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(index, e.target.value)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Correct Answer
                          </label>
                          <input
                            type="text"
                            className="input"
                            value={editForm.correct_answer}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, correct_answer: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Explanation
                          </label>
                          <textarea
                            className="input min-h-[60px]"
                            value={editForm.explanation}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditForm({ ...editForm, explanation: e.target.value })}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => handleSave(question.id)} className="btn-primary flex items-center gap-1">
                            <Save className="h-4 w-4" />
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="btn-secondary flex items-center gap-1">
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {question.difficulty}
                          </span>
                          <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                            {question.question_type.replace('_', ' ')}
                          </span>
                        </div>

                        <p className="font-medium text-gray-900 mb-3">{question.question_text}</p>

                        {question.question_type !== 'written_answer' && question.options && question.options.length > 0 && (
                          <div className="space-y-1 mb-3">
                            {question.options.map((option, index) => {
                              const letter = option.charAt(0);
                              const isCorrect = question.correct_answer === letter;
                              return (
                                <div
                                  key={index}
                                  className={`p-2 rounded text-sm ${
                                    isCorrect ? 'bg-green-100 text-green-800' : 'bg-gray-50 text-gray-600'
                                  }`}
                                >
                                  {option} {isCorrect && '✓'}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {question.explanation && (
                          <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-3">
                            <strong>Explanation:</strong> {question.explanation}
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => handleRating(question.id, star)}
                                className="text-gold-500 hover:text-gold-600"
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    star <= (question.rating || 0) ? 'fill-current' : ''
                                  }`}
                                />
                              </button>
                            ))}
                            {question.rating && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({question.rating}/5)
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleEdit(question)}
                            className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(question.id)}
                            className="text-accent-600 hover:text-accent-700 flex items-center gap-1 text-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default QuestionBank;
