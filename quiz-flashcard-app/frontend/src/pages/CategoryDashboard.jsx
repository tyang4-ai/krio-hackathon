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
  ArrowLeft,
  Database,
  Brain,
  CheckCircle,
  RefreshCw,
  Eye
} from 'lucide-react';
import { categoryApi, documentApi, sampleQuestionApi, analysisApi } from '../services/api';

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
    contentType: 'multiple_choice', // 'multiple_choice', 'flashcards', 'true_false', 'written_answer', 'fill_in_blank'
    count: 10,
    difficulty: 'medium',
    customDirections: '',
    chapter: '' // Chapter filter for generation
  });

  // Chapter for document upload
  const [uploadChapter, setUploadChapter] = useState('');
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
  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);

  // Progress tracking
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sampleUploadProgress, setSampleUploadProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      // Load category, documents, and samples - these are required
      const [catResponse, docsResponse, samplesResponse] = await Promise.all([
        categoryApi.getById(categoryId),
        documentApi.getByCategory(categoryId),
        sampleQuestionApi.getByCategory(categoryId),
      ]);
      // Handle both wrapped and unwrapped response formats
      const catData = catResponse.data.data || catResponse.data;
      const docsData = docsResponse.data.data || docsResponse.data;
      const samplesData = samplesResponse.data.data || samplesResponse.data;

      setCategory(catData);
      setDocuments(docsData.documents || docsData || []);
      setSampleQuestions(samplesData.samples || samplesData || []);

      // Analysis status is optional - endpoint may not exist yet
      try {
        const analysisResponse = await analysisApi.getAnalysisStatus(categoryId);
        const analysisData = analysisResponse.data.data || analysisResponse.data;
        setAnalysisStatus(analysisData);
      } catch {
        // Analysis endpoint not implemented yet - ignore
        setAnalysisStatus(null);
      }
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
    setUploadProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      await documentApi.upload(categoryId, file, uploadChapter || null);
      setUploadProgress(100);
      setTimeout(() => {
        loadData();
        setUploadProgress(0);
        setUploadChapter(''); // Reset chapter after upload
      }, 500);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file: ' + error.message);
      setUploadProgress(0);
    } finally {
      clearInterval(progressInterval);
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

  const handleGenerateContent = async () => {
    const isFlashcards = generateOptions.contentType === 'flashcards';
    const generatingKey = isFlashcards ? 'flashcards' : 'questions';

    setGenerating({ ...generating, [generatingKey]: true });
    setGenerationProgress(0);

    // Simulate progress - AI generation takes time
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 85) return prev;
        return prev + Math.random() * 8;
      });
    }, 500);

    try {
      let response;
      if (isFlashcards) {
        response = await documentApi.generateFlashcards(categoryId, {
          count: generateOptions.count,
          difficulty: generateOptions.difficulty,
          custom_directions: generateOptions.customDirections,
          chapter: generateOptions.chapter || null
        });
        const data = response.data.data || response.data;
        const count = data.generated || data.flashcards?.length || 0;
        setGenerationProgress(100);
        setTimeout(() => {
          alert(`Generated ${count} flashcards!`);
          setGenerationProgress(0);
        }, 300);
      } else {
        response = await documentApi.generateQuestions(categoryId, {
          count: generateOptions.count,
          difficulty: generateOptions.difficulty,
          question_type: generateOptions.contentType,
          custom_directions: generateOptions.customDirections,
          chapter: generateOptions.chapter || null
        });
        const data = response.data.data || response.data;
        const count = data.generated || data.questions?.length || 0;
        setGenerationProgress(100);
        setTimeout(() => {
          alert(`Generated ${count} questions!`);
          setGenerationProgress(0);
        }, 300);
      }
      loadData();
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Error generating content: ' + (error.response?.data?.error || error.message));
      setGenerationProgress(0);
    } finally {
      clearInterval(progressInterval);
      setGenerating({ ...generating, [generatingKey]: false });
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
    setSampleUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setSampleUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const response = await sampleQuestionApi.uploadFile(categoryId, file);
      // Handle both wrapped and unwrapped response formats
      const data = response.data.data || response.data;
      const count = data.samples?.length || 0;
      const message = data.message || `Imported ${count} sample questions`;
      setSampleUploadProgress(100);
      setTimeout(() => {
        alert(message);
        setSampleUploadProgress(0);
      }, 300);
      loadData();
    } catch (error) {
      console.error('Error uploading sample questions:', error);
      alert('Error uploading file: ' + (error.response?.data?.detail || error.response?.data?.error || error.message));
      setSampleUploadProgress(0);
    } finally {
      clearInterval(progressInterval);
      setUploadingSamples(false);
      e.target.value = '';
    }
  };

  const updateSampleOption = (index, value) => {
    const newOptions = [...newSample.options];
    newOptions[index] = value;
    setNewSample({ ...newSample, options: newOptions });
  };

  const handleTriggerAnalysis = async () => {
    if (sampleQuestions.length === 0) {
      alert('Add some sample questions first to analyze patterns');
      return;
    }

    setAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate progress for AI analysis
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 85) return prev;
        return prev + Math.random() * 10;
      });
    }, 400);

    try {
      const response = await analysisApi.triggerAnalysis(categoryId);
      const data = response.data.data || response.data;
      if (data.success) {
        const count = data.analyzed_count || data.analyzedCount || sampleQuestions.length;
        setAnalysisProgress(100);
        setTimeout(() => {
          alert(`Analysis complete! Analyzed ${count} sample questions.`);
          setAnalysisProgress(0);
        }, 300);
        // Refresh analysis status
        const statusResponse = await analysisApi.getAnalysisStatus(categoryId);
        const statusData = statusResponse.data.data || statusResponse.data;
        setAnalysisStatus(statusData);
      }
    } catch (error) {
      console.error('Error triggering analysis:', error);
      alert('Error analyzing samples: ' + (error.response?.data?.error || error.message));
      setAnalysisProgress(0);
    } finally {
      clearInterval(progressInterval);
      setAnalyzing(false);
    }
  };

  const handleClearAnalysis = async () => {
    if (window.confirm('Clear analysis and force re-analysis next time?')) {
      try {
        await analysisApi.clearAnalysis(categoryId);
        setAnalysisStatus({ ...analysisStatus, hasAnalysis: false, analysis: null });
      } catch (error) {
        console.error('Error clearing analysis:', error);
      }
    }
  };

  const handleQuestionTypeChange = (type) => {
    let options = [];
    let correctAnswer = '';

    switch (type) {
      case 'multiple_choice':
        options = ['A) ', 'B) ', 'C) ', 'D) '];
        correctAnswer = 'A';
        break;
      case 'true_false':
        options = ['A) True', 'B) False'];
        correctAnswer = 'A';
        break;
      case 'written_answer':
      case 'fill_in_blank':
        options = [];
        correctAnswer = '';
        break;
      default:
        options = ['A) ', 'B) ', 'C) ', 'D) '];
        correctAnswer = 'A';
    }

    setNewSample({
      ...newSample,
      question_type: type,
      options,
      correct_answer: correctAnswer
    });
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
          onClick={() => navigate('/')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Categories
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
        <p className="text-gray-600 mt-1">{category.description || 'No description'}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          to={`/category/${categoryId}/quiz`}
          className="card hover:shadow-md transition-shadow flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <HelpCircle className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Take Quiz</h3>
            <p className="text-sm text-gray-600">{category.stats?.question_count || 0} questions</p>
          </div>
        </Link>

        <Link
          to={`/category/${categoryId}/question-bank`}
          className="card hover:shadow-md transition-shadow flex items-center space-x-4"
        >
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <Database className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Question Bank</h3>
            <p className="text-sm text-gray-600">Manage questions</p>
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
            <p className="text-sm text-gray-600">{category.stats?.flashcard_count || 0} cards</p>
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
            <p className="text-sm text-gray-600">{category.stats?.notebook_count || 0} entries</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Documents Section */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Documents</h2>
            <label htmlFor="documentUpload" className="btn-primary cursor-pointer flex items-center space-x-2">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{uploading ? 'Uploading...' : 'Upload'}</span>
              <input
                type="file"
                id="documentUpload"
                name="documentUpload"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Chapter Input for Upload */}
          <div className="mb-4">
            <label htmlFor="uploadChapter" className="block text-sm font-medium text-gray-700 mb-1">
              Chapter/Topic (optional)
            </label>
            <input
              type="text"
              id="uploadChapter"
              name="uploadChapter"
              className="input"
              placeholder="e.g., Chapter 1, Unit 3, Photosynthesis..."
              value={uploadChapter}
              onChange={(e) => setUploadChapter(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Organize notes by chapter. When generating, you can filter by chapter to only use relevant content.
            </p>
          </div>

          {/* Document Upload Progress Bar */}
          {uploading && uploadProgress > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Uploading document...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

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
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                        {doc.processed && <span>• Processed</span>}
                        {doc.chapter && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {doc.chapter}
                          </span>
                        )}
                      </div>
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
              <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-1">
                Content Type
              </label>
              <select
                id="contentType"
                name="contentType"
                className="select"
                value={generateOptions.contentType}
                onChange={(e) => setGenerateOptions({ ...generateOptions, contentType: e.target.value })}
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
                <option value="written_answer">Written Answer</option>
                <option value="fill_in_blank">Fill in the Blank</option>
                <option value="flashcards">Flashcards</option>
              </select>
            </div>

            <div>
              <label htmlFor="generateDifficulty" className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                id="generateDifficulty"
                name="generateDifficulty"
                className="select"
                value={generateOptions.difficulty}
                onChange={(e) => setGenerateOptions({ ...generateOptions, difficulty: e.target.value })}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                {(generateOptions.contentType === 'flashcards' || generateOptions.contentType === 'multiple_choice') && (
                  <option value="concepts">Concepts Only</option>
                )}
              </select>
              {generateOptions.difficulty === 'concepts' && (
                <p className="text-xs text-blue-600 mt-1">
                  {generateOptions.contentType === 'flashcards'
                    ? 'Focus on key terms and definitions (e.g., "Structure with 5 bonding pairs, 1 lone pair")'
                    : 'Focus on testing key terminology, definitions, and core concepts'}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="generateCount" className="block text-sm font-medium text-gray-700 mb-1">
                Count
              </label>
              <input
                type="number"
                id="generateCount"
                name="generateCount"
                className="input"
                min="1"
                max="50"
                value={generateOptions.count}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setGenerateOptions({ ...generateOptions, count: isNaN(value) ? 1 : value });
                }}
              />
            </div>

            <div>
              <label htmlFor="generateChapter" className="block text-sm font-medium text-gray-700 mb-1">
                Chapter/Topic Filter (optional)
              </label>
              <input
                type="text"
                id="generateChapter"
                name="generateChapter"
                className="input"
                placeholder="e.g., Chapter 1, Photosynthesis, Unit 3..."
                value={generateOptions.chapter}
                onChange={(e) => setGenerateOptions({ ...generateOptions, chapter: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Only use documents tagged with this chapter. Generated content will also be tagged.
              </p>
            </div>

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
          </div>

          <button
            onClick={handleGenerateContent}
            disabled={generating.questions || generating.flashcards || documents.length === 0}
            className="w-full btn-primary flex items-center justify-center space-x-2"
          >
            {(generating.questions || generating.flashcards) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>
              {(generating.questions || generating.flashcards)
                ? 'Generating...'
                : `Generate ${generateOptions.contentType === 'flashcards' ? 'Flashcards' : 'Questions'}`
              }
            </span>
          </button>

          {/* Generation Progress Bar */}
          {(generating.questions || generating.flashcards) && generationProgress > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Generating {generateOptions.contentType === 'flashcards' ? 'flashcards' : 'questions'}...</span>
                <span>{Math.round(generationProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}

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
            {/* Analysis Button with Eye Icon */}
            <div className="flex">
              <button
                onClick={handleTriggerAnalysis}
                disabled={analyzing || sampleQuestions.length === 0}
                className={`flex items-center space-x-2 px-3 py-2 rounded-l-lg border transition-colors ${
                  analysisStatus?.hasAnalysis
                    ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                    : 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={analysisStatus?.hasAnalysis ? 'Re-analyze patterns' : 'Analyze patterns'}
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : analysisStatus?.hasAnalysis ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {analyzing ? 'Analyzing...' : analysisStatus?.hasAnalysis ? 'Analyzed' : 'Analyze'}
                </span>
              </button>
              {/* Eye icon button - always next to analyze button when analysis exists */}
              {analysisStatus?.hasAnalysis && (
                <button
                  onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
                  className={`flex items-center px-2 py-2 rounded-r-lg border border-l-0 transition-colors ${
                    showAnalysisDetails
                      ? 'bg-blue-100 border-blue-400 text-blue-700'
                      : 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100'
                  }`}
                  title="View analysis details"
                >
                  <Eye className="h-5 w-5" />
                </button>
              )}
            </div>

            {analysisStatus?.hasAnalysis && (
              <button
                onClick={handleClearAnalysis}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear analysis"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}

            <label htmlFor="sampleFileUpload" className="btn-secondary cursor-pointer flex items-center space-x-2">
              {uploadingSamples ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{uploadingSamples ? 'Uploading...' : 'Upload File'}</span>
              <input
                type="file"
                id="sampleFileUpload"
                name="sampleFileUpload"
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

        {/* Sample Upload Progress Bar */}
        {uploadingSamples && sampleUploadProgress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Uploading sample questions...</span>
              <span>{Math.round(sampleUploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${sampleUploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Analysis Progress Bar */}
        {analyzing && analysisProgress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Analyzing sample questions...</span>
              <span>{Math.round(analysisProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Analysis Status Banner */}
        {analysisStatus?.hasAnalysis && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Pattern analysis complete
                </span>
              </div>
              <span className="text-xs text-green-600">
                {analysisStatus.sampleCount || analysisStatus.sample_count || 0} samples analyzed
                {analysisStatus.lastUpdated && ` • Updated ${new Date(analysisStatus.lastUpdated).toLocaleDateString()}`}
              </span>
            </div>
          </div>
        )}

        {/* Analysis Details Panel */}
        {showAnalysisDetails && analysisStatus?.analysis && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-blue-900">Analysis Details</h3>
              <button
                onClick={() => setShowAnalysisDetails(false)}
                className="text-blue-400 hover:text-blue-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Style Guide */}
            {analysisStatus.analysis.style_guide && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Detected Style Guide</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {analysisStatus.analysis.style_guide.tone && (
                    <div className="bg-white p-2 rounded">
                      <span className="text-gray-500">Tone:</span>{' '}
                      <span className="text-gray-900">{analysisStatus.analysis.style_guide.tone}</span>
                    </div>
                  )}
                  {analysisStatus.analysis.style_guide.vocabulary_level && (
                    <div className="bg-white p-2 rounded">
                      <span className="text-gray-500">Vocabulary:</span>{' '}
                      <span className="text-gray-900">{analysisStatus.analysis.style_guide.vocabulary_level}</span>
                    </div>
                  )}
                  {analysisStatus.analysis.style_guide.question_length && (
                    <div className="bg-white p-2 rounded">
                      <span className="text-gray-500">Question Length:</span>{' '}
                      <span className="text-gray-900">{analysisStatus.analysis.style_guide.question_length}</span>
                    </div>
                  )}
                  {analysisStatus.analysis.style_guide.explanation_style && (
                    <div className="bg-white p-2 rounded">
                      <span className="text-gray-500">Explanation Style:</span>{' '}
                      <span className="text-gray-900">{analysisStatus.analysis.style_guide.explanation_style}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Patterns */}
            {analysisStatus.analysis.patterns && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Detected Patterns</h4>
                <div className="text-xs text-gray-700 bg-white p-3 rounded space-y-2">
                  {analysisStatus.analysis.patterns.language_style && (
                    <p><span className="font-medium">Language Style:</span> {analysisStatus.analysis.patterns.language_style}</p>
                  )}
                  {analysisStatus.analysis.patterns.common_themes && (
                    <p><span className="font-medium">Common Themes:</span> {Array.isArray(analysisStatus.analysis.patterns.common_themes) ? analysisStatus.analysis.patterns.common_themes.join(', ') : analysisStatus.analysis.patterns.common_themes}</p>
                  )}
                  {analysisStatus.analysis.patterns.difficulty_distribution && (
                    <p><span className="font-medium">Difficulty Distribution:</span> {JSON.stringify(analysisStatus.analysis.patterns.difficulty_distribution)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysisStatus.analysis.recommendations && analysisStatus.analysis.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-2">Recommendations</h4>
                <ul className="text-xs text-gray-700 bg-white p-3 rounded list-disc list-inside space-y-1">
                  {analysisStatus.analysis.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-blue-600 mt-3">
              These patterns will be applied when generating new questions.
            </p>
          </div>
        )}

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
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        sample.question_type === 'multiple_choice' ? 'bg-blue-100 text-blue-700' :
                        sample.question_type === 'true_false' ? 'bg-purple-100 text-purple-700' :
                        sample.question_type === 'written_answer' ? 'bg-green-100 text-green-700' :
                        sample.question_type === 'fill_in_blank' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {sample.question_type === 'multiple_choice' ? 'Multiple Choice' :
                         sample.question_type === 'true_false' ? 'True/False' :
                         sample.question_type === 'written_answer' ? 'Written Answer' :
                         sample.question_type === 'fill_in_blank' ? 'Fill in Blank' :
                         sample.question_type}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 mb-2">{sample.question_text}</p>
                    {sample.options && sample.options.length > 0 && (
                      <div className="space-y-1 text-sm text-gray-600">
                        {sample.options.map((opt, i) => (
                          <p key={i} className={opt.startsWith(sample.correct_answer + ')') ? 'text-primary-600 font-medium' : ''}>
                            {opt}
                          </p>
                        ))}
                      </div>
                    )}
                    {(sample.question_type === 'written_answer' || sample.question_type === 'fill_in_blank') && (
                      <p className="text-sm text-primary-600 font-medium">
                        Answer: {sample.correct_answer}
                      </p>
                    )}
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
              {/* Question Type Selector */}
              <div>
                <label htmlFor="sampleQuestionType" className="block text-sm font-medium text-gray-700 mb-1">
                  Question Type
                </label>
                <select
                  id="sampleQuestionType"
                  name="sampleQuestionType"
                  className="select"
                  value={newSample.question_type}
                  onChange={(e) => handleQuestionTypeChange(e.target.value)}
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                  <option value="written_answer">Written Answer</option>
                  <option value="fill_in_blank">Fill in the Blank</option>
                </select>
              </div>

              <div>
                <label htmlFor="sampleQuestionText" className="block text-sm font-medium text-gray-700 mb-1">
                  Question
                </label>
                <textarea
                  id="sampleQuestionText"
                  name="sampleQuestionText"
                  className="input min-h-[80px]"
                  placeholder={newSample.question_type === 'fill_in_blank'
                    ? "Enter your question with _____ for the blank (e.g., 'The chemical formula for water is _____.')"
                    : "Enter your sample question..."}
                  value={newSample.question_text}
                  onChange={(e) => setNewSample({ ...newSample, question_text: e.target.value })}
                />
              </div>

              {/* Options - Only for multiple choice and true/false */}
              {(newSample.question_type === 'multiple_choice' || newSample.question_type === 'true_false') && (
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1">
                    Options
                  </span>
                  <div className="space-y-2">
                    {newSample.options.map((opt, index) => (
                      <input
                        key={index}
                        type="text"
                        id={`sampleOption${index}`}
                        name={`sampleOption${index}`}
                        className="input"
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        value={opt}
                        onChange={(e) => updateSampleOption(index, e.target.value)}
                        disabled={newSample.question_type === 'true_false'}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer */}
              <div>
                <label htmlFor="sampleCorrectAnswer" className="block text-sm font-medium text-gray-700 mb-1">
                  Correct Answer
                </label>
                {(newSample.question_type === 'multiple_choice' || newSample.question_type === 'true_false') ? (
                  <select
                    id="sampleCorrectAnswer"
                    name="sampleCorrectAnswer"
                    className="select"
                    value={newSample.correct_answer}
                    onChange={(e) => setNewSample({ ...newSample, correct_answer: e.target.value })}
                  >
                    {newSample.question_type === 'multiple_choice' ? (
                      <>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </>
                    ) : (
                      <>
                        <option value="A">True</option>
                        <option value="B">False</option>
                      </>
                    )}
                  </select>
                ) : (
                  <textarea
                    id="sampleCorrectAnswer"
                    name="sampleCorrectAnswer"
                    className="input min-h-[60px]"
                    placeholder={newSample.question_type === 'fill_in_blank'
                      ? "Enter the text that fills the blank (e.g., 'H₂O')"
                      : "Enter the model answer for this question..."}
                    value={newSample.correct_answer}
                    onChange={(e) => setNewSample({ ...newSample, correct_answer: e.target.value })}
                  />
                )}
              </div>

              <div>
                <label htmlFor="sampleExplanation" className="block text-sm font-medium text-gray-700 mb-1">
                  Explanation (optional)
                </label>
                <textarea
                  id="sampleExplanation"
                  name="sampleExplanation"
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
