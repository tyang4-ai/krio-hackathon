import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  HelpCircle,
  BookOpen,
  ClipboardList,
  Trash2,
  Sparkles,
  Loader2,
  Plus,
  X,
  Lightbulb,
  ArrowLeft
} from 'lucide-react';
import { categoryApi, documentApi, sampleQuestionApi } from '../services/api';

function CategoryDashboard() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [sampleQuestions, setSampleQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState({ questions: false, flashcards: false });
  const [generateOptions, setGenerateOptions] = useState({
    questionCount: 10,
    flashcardCount: 10,
    difficulty: 'medium',
    customDirections: ''
  });
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [newSample, setNewSample] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['A) ', 'B) ', 'C) ', 'D) '],
    correct_answer: 'A',
    explanation: ''
  });
  const [savingSample, setSavingSample] = useState(false);
  const [uploadingSamples, setUploadingSamples] = useState(false);

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      const [catResponse, docsResponse, samplesResponse] = await Promise.all([
        categoryApi.getById(categoryId),
        documentApi.getByCategory(categoryId),
        sampleQuestionApi.getByCategory(categoryId)
      ]);
      setCategory(catResponse.data.data);
      setDocuments(docsResponse.data.data);
      setSampleQuestions(samplesResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      await documentApi.upload(categoryId, file);
      loadData();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await documentApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const handleGenerateQuestions = async () => {
    setGenerating({ ...generating, questions: true });
    try {
      const response = await documentApi.generateQuestions(categoryId, {
        count: generateOptions.questionCount,
        difficulty: generateOptions.difficulty,
        customDirections: generateOptions.customDirections
      });
      alert(`Generated ${response.data.data.generated} questions!`);
      loadData();
    } catch (error) {
      console.error('Error generating questions:', error);
      alert('Error generating questions: ' + (error.response?.data?.error || error.message));
    } finally {
      setGenerating({ ...generating, questions: false });
    }
  };

  const handleGenerateFlashcards = async () => {
    setGenerating({ ...generating, flashcards: true });
    try {
      const response = await documentApi.generateFlashcards(categoryId, {
        count: generateOptions.flashcardCount,
        customDirections: generateOptions.customDirections
      });
      alert(`Generated ${response.data.data.generated} flashcards!`);
      loadData();
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert('Error generating flashcards: ' + (error.response?.data?.error || error.message));
    } finally {
      setGenerating({ ...generating, flashcards: false });
    }
  };

  const handleAddSampleQuestion = async () => {
    if (!newSample.question_text.trim()) {
      alert('Please enter a question');
      return;
    }

    setSavingSample(true);
    try {
      await sampleQuestionApi.create(categoryId, newSample);
      setShowSampleModal(false);
      setNewSample({
        question_text: '',
        question_type: 'multiple_choice',
        options: ['A) ', 'B) ', 'C) ', 'D) '],
        correct_answer: 'A',
        explanation: ''
      });
      loadData();
    } catch (error) {
      console.error('Error adding sample question:', error);
      alert('Error adding sample question: ' + (error.response?.data?.error || error.message));
    } finally {
      setSavingSample(false);
    }
  };

  const handleDeleteSampleQuestion = async (id) => {
    if (window.confirm('Are you sure you want to delete this sample question?')) {
      try {
        await sampleQuestionApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting sample question:', error);
      }
    }
  };

  const handleSampleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingSamples(true);
    try {
      const response = await sampleQuestionApi.uploadFile(categoryId, file);
      alert(response.data.message || `Imported ${response.data.samples?.length || 0} sample questions`);
      loadData();
    } catch (error) {
      console.error('Error uploading sample questions:', error);
      alert('Error uploading file: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadingSamples(false);
      e.target.value = '';
    }
  };

  const updateSampleOption = (index, value) => {
    const newOptions = [...newSample.options];
    newOptions[index] = value;
    setNewSample({ ...newSample, options: newOptions });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!category) {
    return <div>Category not found</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
        <p className="text-gray-600 mt-1">{category.description || 'No description'}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to={`/category/${categoryId}/quiz`}
          className="card hover:shadow-md transition-shadow flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <HelpCircle className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Take Quiz</h3>
            <p className="text-sm text-gray-600">{category.stats?.questions || 0} questions</p>
          </div>
        </Link>

        <Link
          to={`/category/${categoryId}/flashcards`}
          className="card hover:shadow-md transition-shadow flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-gold-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Study Flashcards</h3>
            <p className="text-sm text-gray-600">{category.stats?.flashcards || 0} cards</p>
          </div>
        </Link>

        <Link
          to={`/category/${categoryId}/notebook`}
          className="card hover:shadow-md transition-shadow flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-accent-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">View Notebook</h3>
            <p className="text-sm text-gray-600">{category.stats?.notebook_entries || 0} entries</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Documents Section */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Documents</h2>
            <label className="btn-primary cursor-pointer flex items-center space-x-2">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{uploading ? 'Uploading...' : 'Upload'}</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">Upload PDF, DOC, or TXT files</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.original_name}</p>
                      <p className="text-xs text-gray-500">
                        {(doc.file_size / 1024).toFixed(1)} KB
                        {doc.processed && ' • Processed'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-gray-400 hover:text-accent-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate Content Section */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Generate Content</h2>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Directions (optional)
              </label>
              <textarea
                className="input min-h-[80px]"
                placeholder="Add custom instructions for the AI (e.g., 'Focus on practical examples', 'Include historical context', 'Make questions more challenging')..."
                value={generateOptions.customDirections}
                onChange={(e) => setGenerateOptions({ ...generateOptions, customDirections: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to generate using standard settings
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                className="select"
                value={generateOptions.difficulty}
                onChange={(e) => setGenerateOptions({ ...generateOptions, difficulty: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Questions
                </label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  max="50"
                  value={generateOptions.questionCount}
                  onChange={(e) => setGenerateOptions({ ...generateOptions, questionCount: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flashcards
                </label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  max="50"
                  value={generateOptions.flashcardCount}
                  onChange={(e) => setGenerateOptions({ ...generateOptions, flashcardCount: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGenerateQuestions}
              disabled={generating.questions || documents.length === 0}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              {generating.questions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>{generating.questions ? 'Generating...' : 'Generate Questions'}</span>
            </button>

            <button
              onClick={handleGenerateFlashcards}
              disabled={generating.flashcards || documents.length === 0}
              className="w-full btn-secondary flex items-center justify-center space-x-2"
            >
              {generating.flashcards ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>{generating.flashcards ? 'Generating...' : 'Generate Flashcards'}</span>
            </button>
          </div>

          {documents.length === 0 && (
            <p className="text-sm text-gray-500 mt-3 text-center">
              Upload documents first to generate content
            </p>
          )}
        </div>
      </div>

      {/* Sample Questions Section */}
      <div className="mt-8 card">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">Sample Questions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload example questions to help the AI match your preferred style
            </p>
          </div>
          <div className="flex space-x-2">
            <label className="btn-secondary cursor-pointer flex items-center space-x-2">
              {uploadingSamples ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{uploadingSamples ? 'Uploading...' : 'Upload File'}</span>
              <input
                type="file"
                className="hidden"
                accept=".json,.csv,.pdf,.docx"
                onChange={handleSampleFileUpload}
                disabled={uploadingSamples}
              />
            </label>
            <button
              onClick={() => setShowSampleModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Manual</span>
            </button>
          </div>
        </div>

        {sampleQuestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Lightbulb className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No sample questions yet</p>
            <p className="text-sm">Add examples manually or upload JSON/CSV/PDF/DOCX file</p>
            <p className="text-xs mt-2 text-gray-400">AI will extract questions from documents and learn your style</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sampleQuestions.map((sample) => (
              <div
                key={sample.id}
                className="p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2">{sample.question_text}</p>
                    <div className="space-y-1 text-sm text-gray-600">
                      {sample.options.map((opt, i) => (
                        <p key={i} className={opt.startsWith(sample.correct_answer + ')') ? 'text-primary-600 font-medium' : ''}>
                          {opt}
                        </p>
                      ))}
                    </div>
                    {sample.explanation && (
                      <p className="mt-2 text-sm text-gray-500 italic">
                        Explanation: {sample.explanation}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteSampleQuestion(sample.id)}
                    className="ml-4 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sampleQuestions.length > 0 && (
          <p className="text-sm text-gray-500 mt-4">
            {sampleQuestions.length} sample{sampleQuestions.length !== 1 ? 's' : ''} will be used to guide question generation style
          </p>
        )}
      </div>

      {/* Add Sample Question Modal */}
      {showSampleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowSampleModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Sample Question</h3>
              <button
                onClick={() => setShowSampleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question
                </label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="Enter your sample question..."
                  value={newSample.question_text}
                  onChange={(e) => setNewSample({ ...newSample, question_text: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Options
                </label>
                <div className="space-y-2">
                  {newSample.options.map((opt, index) => (
                    <input
                      key={index}
                      type="text"
                      className="input"
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      value={opt}
                      onChange={(e) => updateSampleOption(index, e.target.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correct Answer
                </label>
                <select
                  className="select"
                  value={newSample.correct_answer}
                  onChange={(e) => setNewSample({ ...newSample, correct_answer: e.target.value })}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Explanation (optional)
                </label>
                <textarea
                  className="input min-h-[60px]"
                  placeholder="Why is this the correct answer..."
                  value={newSample.explanation}
                  onChange={(e) => setNewSample({ ...newSample, explanation: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSampleModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSampleQuestion}
                disabled={savingSample}
                className="btn-primary flex items-center space-x-2"
              >
                {savingSample ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>{savingSample ? 'Saving...' : 'Add Sample'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryDashboard;
