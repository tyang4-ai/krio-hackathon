import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  HelpCircle,
  BookOpen,
  ClipboardList,
  Trash2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { categoryApi, documentApi } from '../services/api';

function CategoryDashboard() {
  const { categoryId } = useParams();
  const [category, setCategory] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState({ questions: false, flashcards: false });
  const [generateOptions, setGenerateOptions] = useState({
    questionCount: 10,
    flashcardCount: 10,
    difficulty: 'medium'
  });

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      const [catResponse, docsResponse] = await Promise.all([
        categoryApi.getById(categoryId),
        documentApi.getByCategory(categoryId)
      ]);
      setCategory(catResponse.data.data);
      setDocuments(docsResponse.data.data);
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
        difficulty: generateOptions.difficulty
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
        count: generateOptions.flashcardCount
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!category) {
    return <div>Category not found</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
        <p className="text-gray-600 mt-1">{category.description || 'No description'}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to={`/category/${categoryId}/quiz`}
          className="card hover:shadow-md transition-shadow flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <HelpCircle className="h-6 w-6 text-blue-600" />
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
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-green-600" />
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
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-orange-600" />
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
                    className="text-gray-400 hover:text-red-600"
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
    </div>
  );
}

export default CategoryDashboard;
