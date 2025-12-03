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
  Eye,
  FolderOpen,
  Download,
  Check,
  Tag
} from 'lucide-react';
import { categoryApi, documentApi, sampleQuestionApi, analysisApi } from '../services/api';
import { useTour } from '../contexts/TourContext';
import AILoadingIndicator, { type AILoadingStage } from '../components/AILoadingIndicator';
import type { Category, Document, SampleQuestion, QuestionType, Difficulty } from '../types';

interface CategoryStats {
  document_count?: number;
  question_count?: number;
  flashcard_count?: number;
  notebook_count?: number;
}

interface CategoryWithStats extends Category {
  stats?: CategoryStats;
}

interface GenerateOptions {
  contentType: QuestionType | 'flashcards';
  count: number;
  difficulty: Difficulty | 'concepts' | '';
  customDirections: string;
  chapter: string;
}

interface NewSample {
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface AnalysisStatus {
  hasAnalysis: boolean;
  analysis?: {
    style_guide?: {
      tone?: string;
      vocabulary_level?: string;
      question_length?: string;
      explanation_style?: string;
    };
    patterns?: {
      language_style?: string;
      common_themes?: string[] | string;
      difficulty_distribution?: Record<string, number>;
    };
    recommendations?: string[];
  };
  sampleCount?: number;
  sample_count?: number;
  lastUpdated?: string;
}

function CategoryDashboard(): React.ReactElement {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { startTour, isTourCompleted, activeTour } = useTour();
  const [category, setCategory] = useState<CategoryWithStats | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sampleQuestions, setSampleQuestions] = useState<SampleQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<{ questions: boolean; flashcards: boolean }>({
    questions: false,
    flashcards: false
  });
  const [generateOptions, setGenerateOptions] = useState<GenerateOptions>({
    contentType: 'multiple_choice',
    count: 10,
    difficulty: 'medium',
    customDirections: '',
    chapter: ''
  });

  const [uploadChapter, setUploadChapter] = useState<string>('');
  const [showSampleModal, setShowSampleModal] = useState<boolean>(false);
  const [newSample, setNewSample] = useState<NewSample>({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['A) ', 'B) ', 'C) ', 'D) '],
    correct_answer: 'A',
    explanation: ''
  });
  const [savingSample, setSavingSample] = useState<boolean>(false);
  const [uploadingSamples, setUploadingSamples] = useState<boolean>(false);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState<boolean>(false);
  const [organizing, setOrganizing] = useState<boolean>(false);
  const [organizeProgress, setOrganizeProgress] = useState<number>(0);

  // Batch selection state
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());
  const [batchChapter, setBatchChapter] = useState<string>('');
  const [showBatchChapterModal, setShowBatchChapterModal] = useState<boolean>(false);
  const [batchUpdating, setBatchUpdating] = useState<boolean>(false);

  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [sampleUploadProgress, setSampleUploadProgress] = useState<number>(0);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);

  // Helper to determine AI loading stage based on progress
  const getAILoadingStage = (progress: number): AILoadingStage => {
    if (progress >= 100) return 'complete';
    if (progress >= 75) return 'validating';
    if (progress >= 40) return 'generating';
    if (progress >= 15) return 'analyzing';
    return 'extracting';
  };

  useEffect(() => {
    loadData();
  }, [categoryId]);

  // Start category tour on first ever category visit (not per-category)
  useEffect(() => {
    if (!loading && categoryId && !isTourCompleted('category') && !activeTour) {
      const timeout = setTimeout(() => {
        startTour('category', Number(categoryId));
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [loading, categoryId, isTourCompleted, startTour, activeTour]);

  const loadData = async (): Promise<void> => {
    if (!categoryId) return;

    try {
      const results = await Promise.allSettled([
        categoryApi.getById(Number(categoryId)),
        documentApi.getByCategory(Number(categoryId)),
        sampleQuestionApi.getByCategory(Number(categoryId)),
      ]);

      // Extract results - category is required, others are optional
      const catResult = results[0];
      const docsResult = results[1];
      const samplesResult = results[2];

      if (catResult.status === 'rejected') {
        console.error('Failed to load category:', catResult.reason);
        throw catResult.reason; // Category is required
      }

      const catData = catResult.value.data.data || catResult.value.data;
      setCategory(catData);

      if (docsResult.status === 'fulfilled') {
        const docsData = docsResult.value.data.data || docsResult.value.data;
        setDocuments(docsData.documents || docsData || []);
      } else {
        console.error('Failed to load documents:', docsResult.reason);
        setDocuments([]);
      }

      if (samplesResult.status === 'fulfilled') {
        const samplesData = samplesResult.value.data.data || samplesResult.value.data;
        setSampleQuestions(samplesData.samples || samplesData || []);
      } else {
        console.error('Failed to load samples:', samplesResult.reason);
        setSampleQuestions([]);
      }

      try {
        const analysisResponse = await analysisApi.getAnalysisStatus(Number(categoryId));
        const analysisData = analysisResponse.data.data || analysisResponse.data;
        setAnalysisStatus(analysisData);
      } catch {
        setAnalysisStatus(null);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (): Promise<void> => {
    if (!categoryId) return;
    try {
      const docsResponse = await documentApi.getByCategory(Number(categoryId));
      const docsData = docsResponse.data.data || docsResponse.data;
      setDocuments(docsData.documents || docsData || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file || !categoryId) return;

    setUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      await documentApi.upload(Number(categoryId), file, uploadChapter || null);
      setUploadProgress(100);
      setTimeout(() => {
        loadData();
        setUploadProgress(0);
        setUploadChapter('');
      }, 500);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert('Error uploading file: ' + error.message);
      setUploadProgress(0);
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (id: number): Promise<void> => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await documentApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  // Batch selection handlers
  const toggleDocSelection = (id: number): void => {
    const newSelected = new Set(selectedDocIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDocIds(newSelected);
  };

  const toggleSelectAll = (): void => {
    if (selectedDocIds.size === documents.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(documents.map(d => d.id)));
    }
  };

  const handleBatchDelete = async (): Promise<void> => {
    if (selectedDocIds.size === 0) return;

    if (window.confirm(`Are you sure you want to delete ${selectedDocIds.size} document(s)?`)) {
      setBatchUpdating(true);
      try {
        await Promise.all(Array.from(selectedDocIds).map(id => documentApi.delete(id)));
        setSelectedDocIds(new Set());
        loadData();
      } catch (error) {
        console.error('Error batch deleting documents:', error);
        alert('Error deleting some documents');
      } finally {
        setBatchUpdating(false);
      }
    }
  };

  const handleBatchDownload = (): void => {
    if (selectedDocIds.size === 0) return;

    // Download each selected document
    Array.from(selectedDocIds).forEach((docId) => {
      const downloadUrl = documentApi.getDownloadUrl(docId);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleBatchAssignChapter = async (): Promise<void> => {
    if (selectedDocIds.size === 0 || !batchChapter.trim()) return;

    setBatchUpdating(true);
    const count = selectedDocIds.size;
    try {
      await Promise.all(
        Array.from(selectedDocIds).map(id =>
          documentApi.updateChapter(id, batchChapter.trim())
        )
      );
      setSelectedDocIds(new Set());
      setBatchChapter('');
      setShowBatchChapterModal(false);
      loadData();
      alert(`Updated chapter tag for ${count} document(s)`);
    } catch (error) {
      console.error('Error batch updating documents:', error);
      alert('Error updating some documents');
    } finally {
      setBatchUpdating(false);
    }
  };

  const handleGenerateContent = async (): Promise<void> => {
    if (!categoryId) return;

    const isFlashcards = generateOptions.contentType === 'flashcards';
    const generatingKey = isFlashcards ? 'flashcards' : 'questions';

    setGenerating({ ...generating, [generatingKey]: true });
    setGenerationProgress(0);

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 85) return prev;
        return prev + Math.random() * 8;
      });
    }, 500);

    try {
      let response;
      if (isFlashcards) {
        response = await documentApi.generateFlashcards(Number(categoryId), {
          count: generateOptions.count,
          difficulty: generateOptions.difficulty as any,
          customDirections: generateOptions.customDirections,
          chapter: generateOptions.chapter || undefined
        });
        const data = response.data.data || response.data;
        const count = (data as any).generated || (data as any).flashcards?.length || 0;
        setGenerationProgress(100);
        setTimeout(() => {
          alert(`Generated ${count} flashcards!`);
          setGenerationProgress(0);
        }, 300);
      } else {
        response = await documentApi.generateQuestions(Number(categoryId), {
          count: generateOptions.count,
          difficulty: generateOptions.difficulty as any,
          contentType: generateOptions.contentType as QuestionType,
          customDirections: generateOptions.customDirections,
          chapter: generateOptions.chapter || undefined
        });
        const data = response.data.data || response.data;
        const count = (data as any).generated || (data as any).questions?.length || 0;
        setGenerationProgress(100);
        setTimeout(() => {
          alert(`Generated ${count} questions!`);
          setGenerationProgress(0);
        }, 300);
      }
      loadData();
    } catch (error: any) {
      console.error('Error generating content:', error);
      alert('Error generating content: ' + (error.response?.data?.error || error.message));
      setGenerationProgress(0);
    } finally {
      clearInterval(progressInterval);
      setGenerating({ ...generating, [generatingKey]: false });
    }
  };

  const handleAddSampleQuestion = async (): Promise<void> => {
    if (!categoryId || !newSample.question_text.trim()) {
      alert('Please enter a question');
      return;
    }

    setSavingSample(true);
    try {
      await sampleQuestionApi.create(Number(categoryId), newSample);
      setShowSampleModal(false);
      setNewSample({
        question_text: '',
        question_type: 'multiple_choice',
        options: ['A) ', 'B) ', 'C) ', 'D) '],
        correct_answer: 'A',
        explanation: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Error adding sample question:', error);
      alert('Error adding sample question: ' + (error.response?.data?.error || error.message));
    } finally {
      setSavingSample(false);
    }
  };

  const handleDeleteSampleQuestion = async (id: number): Promise<void> => {
    if (window.confirm('Are you sure you want to delete this sample question?')) {
      try {
        await sampleQuestionApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting sample question:', error);
      }
    }
  };

  const handleSampleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file || !categoryId) return;

    setUploadingSamples(true);
    setSampleUploadProgress(0);

    const progressInterval = setInterval(() => {
      setSampleUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const response = await sampleQuestionApi.uploadFile(Number(categoryId), file);
      const data = response.data.data || response.data;
      const count = (data as any).samples?.length || 0;
      const message = (data as any).message || `Imported ${count} sample questions`;
      setSampleUploadProgress(100);
      setTimeout(() => {
        alert(message);
        setSampleUploadProgress(0);
      }, 300);
      loadData();
    } catch (error: any) {
      console.error('Error uploading sample questions:', error);
      alert('Error uploading file: ' + (error.response?.data?.detail || error.response?.data?.error || error.message));
      setSampleUploadProgress(0);
    } finally {
      clearInterval(progressInterval);
      setUploadingSamples(false);
      e.target.value = '';
    }
  };

  const updateSampleOption = (index: number, value: string): void => {
    const newOptions = [...newSample.options];
    newOptions[index] = value;
    setNewSample({ ...newSample, options: newOptions });
  };

  const handleTriggerAnalysis = async (): Promise<void> => {
    if (!categoryId || sampleQuestions.length === 0) {
      alert('Add some sample questions first to analyze patterns');
      return;
    }

    setAnalyzing(true);
    setAnalysisProgress(0);

    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 85) return prev;
        return prev + Math.random() * 10;
      });
    }, 400);

    try {
      const response = await analysisApi.triggerAnalysis(Number(categoryId));
      const data = response.data.data || response.data;
      console.log('Analysis response:', data);

      if ((data as any).success) {
        const count = (data as any).analyzed_count || (data as any).analyzedCount || sampleQuestions.length;
        setAnalysisProgress(100);
        setTimeout(() => {
          alert(`Analysis complete! Analyzed ${count} sample questions.`);
          setAnalysisProgress(0);
        }, 300);
      } else {
        const errorMsg = (data as any).error || 'Unknown error during analysis';
        alert('Analysis failed: ' + errorMsg);
        setAnalysisProgress(0);
      }

      // Always refresh status after analysis attempt
      const statusResponse = await analysisApi.getAnalysisStatus(Number(categoryId));
      const statusData = statusResponse.data.data || statusResponse.data;
      console.log('Analysis status:', statusData);
      setAnalysisStatus(statusData);
    } catch (error: any) {
      console.error('Error triggering analysis:', error);
      alert('Error analyzing samples: ' + (error.response?.data?.detail || error.response?.data?.error || error.message));
      setAnalysisProgress(0);

      // Still try to refresh status
      try {
        const statusResponse = await analysisApi.getAnalysisStatus(Number(categoryId));
        const statusData = statusResponse.data.data || statusResponse.data;
        setAnalysisStatus(statusData);
      } catch {
        // Ignore status fetch error
      }
    } finally {
      clearInterval(progressInterval);
      setAnalyzing(false);
    }
  };

  const handleClearAnalysis = async (): Promise<void> => {
    if (!categoryId) return;

    if (window.confirm('Clear analysis and force re-analysis next time?')) {
      try {
        await analysisApi.clearAnalysis(Number(categoryId));
        setAnalysisStatus({ ...analysisStatus, hasAnalysis: false, analysis: undefined } as AnalysisStatus);
      } catch (error) {
        console.error('Error clearing analysis:', error);
      }
    }
  };

  const handleOrganize = async (): Promise<void> => {
    if (!categoryId || documents.length === 0) {
      alert('Upload some documents first to organize');
      return;
    }

    setOrganizing(true);
    setOrganizeProgress(0);

    const progressInterval = setInterval(() => {
      setOrganizeProgress(prev => {
        if (prev >= 85) return prev;
        return prev + Math.random() * 8;
      });
    }, 500);

    try {
      const response = await documentApi.organize(Number(categoryId));
      const data = response.data.data || response.data;

      if ((data as any).success) {
        setOrganizeProgress(100);

        // Check for new format with chapter_pdfs (multiple PDFs)
        const chapterPdfs = (data as any).chapter_pdfs;
        if (chapterPdfs && Array.isArray(chapterPdfs) && chapterPdfs.length > 0) {
          // Count chapters (no auto-download - PDFs are auto-uploaded as documents)
          const chapterCount = chapterPdfs.filter((ch: any) => ch.pdf_base64).length;

          // Refresh documents to show updated chapter tags AND new organized chapter documents
          await fetchDocuments();

          // Check if new chapter documents were created
          const createdDocs = (data as any).created_chapter_documents || [];
          const createdCount = createdDocs.length;

          setTimeout(() => {
            const message = (data as any).message || `Organized into ${chapterCount} chapters!`;
            let fullMessage = message;
            if (createdCount > 0) {
              fullMessage += `\n\n${createdCount} organized chapter document(s) have been automatically added to your notes!`;
            }
            alert(fullMessage);
            setOrganizeProgress(0);
          }, 300);
        }
        // Fallback for old format with single pdf_base64
        else if ((data as any).pdf_base64) {
          const pdfData = (data as any).pdf_base64;
          const filename = (data as any).pdf_filename || 'StudyGuide.pdf';

          const dataUrl = `data:application/pdf;base64,${pdfData}`;
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => {
            alert('Study guide organized and downloaded!');
            setOrganizeProgress(0);
          }, 300);
        } else {
          alert('Organization complete but no PDFs were generated.');
          setOrganizeProgress(0);
        }
      } else {
        const errorMsg = (data as any).error || 'Organization failed';
        alert('Error: ' + errorMsg);
        setOrganizeProgress(0);
      }
    } catch (error: any) {
      console.error('Error organizing:', error);
      alert('Error organizing documents: ' + (error.response?.data?.detail || error.message));
      setOrganizeProgress(0);
    } finally {
      clearInterval(progressInterval);
      setOrganizing(false);
    }
  };

  const handleQuestionTypeChange = (type: QuestionType): void => {
    let options: string[] = [];
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
      case 'written':
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
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Categories
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{category.name}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{category.description || 'No description'}</p>
      </div>

      {/* Quick Actions */}
      <div data-tour="quick-actions" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        <div data-tour="upload-section" className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Documents</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleOrganize}
                disabled={organizing || documents.length === 0}
                className="btn-secondary flex items-center space-x-2"
                title="AI organizes your notes into chapters/units and downloads a PDF study guide"
              >
                {organizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="h-4 w-4" />
                )}
                <span>{organizing ? 'Organizing...' : 'Organize'}</span>
              </button>
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
                  accept=".pdf,.doc,.docx,.txt,.md,.pptx,.ppt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

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

          <AILoadingIndicator
            isVisible={organizing}
            progress={organizeProgress}
            currentStage={getAILoadingStage(organizeProgress)}
            contentType="organize"
          />

          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">Upload PDF, DOC, or TXT files</p>
            </div>
          ) : (
            <>
              {/* Batch Actions Bar */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleSelectAll}
                    className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${
                      selectedDocIds.size === documents.length
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : selectedDocIds.size > 0
                        ? 'bg-primary-200 border-primary-500'
                        : 'border-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {selectedDocIds.size === documents.length && <Check className="h-3 w-3" />}
                  </button>
                  <span className="text-sm text-gray-600">
                    {selectedDocIds.size > 0
                      ? `${selectedDocIds.size} selected`
                      : 'Select all'}
                  </span>
                </div>
                {selectedDocIds.size > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleBatchDownload}
                      disabled={batchUpdating}
                      className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={() => setShowBatchChapterModal(true)}
                      disabled={batchUpdating}
                      className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Tag className="h-4 w-4" />
                      <span>Assign Chapter</span>
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      disabled={batchUpdating}
                      className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      {batchUpdating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      selectedDocIds.has(doc.id)
                        ? 'bg-primary-50 border border-primary-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleDocSelection(doc.id)}
                        className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${
                          selectedDocIds.has(doc.id)
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-gray-300 hover:border-primary-400'
                        }`}
                      >
                        {selectedDocIds.has(doc.id) && <Check className="h-3 w-3" />}
                      </button>
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.original_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{((doc as any).file_size / 1024).toFixed(1)} KB</span>
                          {(doc as any).processed && <span>• Processed</span>}
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
            </>
          )}
        </div>

        {/* Generate Content Section */}
        <div data-tour="generate-content-section" className="card">
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
                onChange={(e) => setGenerateOptions({ ...generateOptions, contentType: e.target.value as any })}
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
                <option value="written">Written Answer</option>
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
                onChange={(e) => setGenerateOptions({ ...generateOptions, difficulty: e.target.value as any })}
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

          <AILoadingIndicator
            isVisible={generating.questions || generating.flashcards}
            progress={generationProgress}
            currentStage={getAILoadingStage(generationProgress)}
            contentType={generateOptions.contentType === 'flashcards' ? 'flashcards' : 'questions'}
            count={generateOptions.count}
          />

          {documents.length === 0 && (
            <p className="text-sm text-gray-500 mt-3 text-center">
              Upload documents first to generate content
            </p>
          )}
        </div>
      </div>

      {/* Sample Questions Section - continuing in next part due to length */}
      <div data-tour="sample-questions-section" className="mt-8 card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold">Sample Questions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload example questions to help the AI match your preferred style
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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

        {analyzing && (
          <AILoadingIndicator
            isVisible={true}
            progress={analysisProgress}
            currentStage={getAILoadingStage(analysisProgress)}
            contentType="analysis"
            count={sampleQuestions.length}
          />
        )}

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
                        sample.question_type === 'written' ? 'bg-green-100 text-green-700' :
                        sample.question_type === 'fill_in_blank' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {sample.question_type === 'multiple_choice' ? 'Multiple Choice' :
                         sample.question_type === 'true_false' ? 'True/False' :
                         sample.question_type === 'written' ? 'Written Answer' :
                         sample.question_type === 'fill_in_blank' ? 'Fill in Blank' :
                         sample.question_type}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 mb-2">{sample.question_text}</p>
                    {(sample as any).options && (sample as any).options.length > 0 && (
                      <div className="space-y-1 text-sm text-gray-600">
                        {(sample as any).options.map((opt: string, i: number) => (
                          <p key={i} className={(opt.startsWith((sample as any).correct_answer + ')') ? 'text-primary-600 font-medium' : '')}>
                            {opt}
                          </p>
                        ))}
                      </div>
                    )}
                    {(sample.question_type === 'written' || sample.question_type === 'fill_in_blank') && sample.answer_text && (
                      <p className="text-sm text-primary-600 font-medium">
                        Answer: {sample.answer_text}
                      </p>
                    )}
                    {(sample as any).explanation && (
                      <p className="mt-2 text-sm text-gray-500 italic">
                        Explanation: {(sample as any).explanation}
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
                <label htmlFor="sampleQuestionType" className="block text-sm font-medium text-gray-700 mb-1">
                  Question Type
                </label>
                <select
                  id="sampleQuestionType"
                  name="sampleQuestionType"
                  className="select"
                  value={newSample.question_type}
                  onChange={(e) => handleQuestionTypeChange(e.target.value as QuestionType)}
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                  <option value="written">Written Answer</option>
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

      {/* Batch Assign Chapter Modal */}
      {showBatchChapterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowBatchChapterModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Chapter Tag</h3>
              <button
                onClick={() => setShowBatchChapterModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Assign a chapter tag to {selectedDocIds.size} selected document{selectedDocIds.size !== 1 ? 's' : ''}.
            </p>

            <div className="mb-6">
              <label htmlFor="batchChapterInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chapter/Topic
              </label>
              <input
                type="text"
                id="batchChapterInput"
                name="batchChapterInput"
                className="input"
                placeholder="e.g., Chapter 1, Unit 3, Photosynthesis..."
                value={batchChapter}
                onChange={(e) => setBatchChapter(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This will replace any existing chapter tags on the selected documents.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBatchChapterModal(false);
                  setBatchChapter('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchAssignChapter}
                disabled={batchUpdating || !batchChapter.trim()}
                className="btn-primary flex items-center space-x-2"
              >
                {batchUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Tag className="h-4 w-4" />
                )}
                <span>{batchUpdating ? 'Updating...' : 'Assign Chapter'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoryDashboard;
