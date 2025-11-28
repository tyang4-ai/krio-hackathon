import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  Category,
  Document,
  Question,
  Flashcard,
  QuizSession,
  QuizSettings,
  FlashcardProgress,
  NotebookEntry,
  SampleQuestion,
  QuestionStats,
  FlashcardStats,
  NotebookStats,
  IntegrityReport,
  HandwrittenAnswer,
  PartialCreditGrade,
  AnalysisResult,
  AgentActivity,
  GenerateOptions,
  FocusEventType,
  User,
  AuthResponse,
  AnalyticsDashboard,
} from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'studyforge_access_token';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token to all requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to normalize response format
// The Python backend returns data directly, not wrapped in { data: ... }
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Wrap response data to match expected format if not already wrapped
    // This ensures frontend code expecting response.data.data works correctly
    if (response.data && !response.data.data && typeof response.data === 'object') {
      // Check if this looks like it should be wrapped
      const data = response.data as Record<string, unknown>;
      const needsWrapping = !Array.isArray(response.data) &&
        (data.categories !== undefined ||
         data.documents !== undefined ||
         data.questions !== undefined ||
         data.flashcards !== undefined ||
         data.samples !== undefined ||
         data.sessions !== undefined ||
         data.session_id !== undefined ||
         data.success !== undefined ||
         data.id !== undefined ||
         data.name !== undefined ||
         data.hasAnalysis !== undefined ||
         data.has_analysis !== undefined ||
         data.message !== undefined);

      if (needsWrapping) {
        response.data = { data: response.data };
      }
    }
    return response;
  },
  (error: AxiosError) => {
    // Normalize error format - FastAPI uses 'detail', frontend expects 'error'
    if (error.response?.data) {
      const errorData = error.response.data as Record<string, unknown>;
      if (errorData.detail) {
        errorData.error = errorData.detail;
      }
    }
    return Promise.reject(error);
  }
);

// Type definitions for API responses
interface CategoriesResponse {
  categories: Category[];
}

interface DocumentsResponse {
  documents: Document[];
}

interface QuestionsResponse {
  questions: Question[];
}

interface FlashcardsResponse {
  flashcards: Flashcard[];
}

interface SamplesResponse {
  samples: SampleQuestion[];
}

interface SessionsResponse {
  sessions: QuizSession[];
}

interface ChaptersResponse {
  chapters: string[];
}

interface CountResponse {
  count: number;
}

interface MessageResponse {
  message: string;
  success?: boolean;
}

interface CreateSessionResponse {
  session_id: number;
  questions: Question[];
}

// Categories
export const categoryApi = {
  getAll: (): Promise<AxiosResponse<{ data: CategoriesResponse }>> =>
    api.get('/categories'),
  getById: (id: number): Promise<AxiosResponse<{ data: Category }>> =>
    api.get(`/categories/${id}`),
  create: (data: Partial<Category>): Promise<AxiosResponse<{ data: Category }>> =>
    api.post('/categories', data),
  update: (id: number, data: Partial<Category>): Promise<AxiosResponse<{ data: Category }>> =>
    api.put(`/categories/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<{ data: MessageResponse }>> =>
    api.delete(`/categories/${id}`)
};

// Documents
export const documentApi = {
  getByCategory: (categoryId: number): Promise<AxiosResponse<{ data: DocumentsResponse }>> =>
    api.get(`/categories/${categoryId}/documents`),
  upload: (categoryId: number, file: File, chapter: string | null = null): Promise<AxiosResponse<{ data: Document }>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (chapter) {
      formData.append('chapter', chapter);
    }
    return api.post(`/categories/${categoryId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  updateChapter: (documentId: number, chapter: string): Promise<AxiosResponse<{ data: Document }>> =>
    api.patch(`/documents/${documentId}/chapter`, { chapter }),
  getChapters: (categoryId: number): Promise<AxiosResponse<{ data: ChaptersResponse }>> =>
    api.get(`/categories/${categoryId}/documents/chapters`),
  analyzeChapters: (documentId: number): Promise<AxiosResponse<{ data: MessageResponse }>> =>
    api.post(`/documents/${documentId}/analyze-chapters`),
  delete: (id: number): Promise<AxiosResponse<{ data: MessageResponse }>> =>
    api.delete(`/documents/${id}`),
  generateQuestions: (categoryId: number, options: GenerateOptions): Promise<AxiosResponse<{ data: QuestionsResponse }>> =>
    api.post(`/categories/${categoryId}/generate-questions`, options),
  generateFlashcards: (categoryId: number, options: GenerateOptions): Promise<AxiosResponse<{ data: FlashcardsResponse }>> =>
    api.post(`/categories/${categoryId}/generate-flashcards`, options)
};

// Quiz
export const quizApi = {
  getQuestions: (categoryId: number, filters?: Record<string, unknown>): Promise<AxiosResponse<{ data: QuestionsResponse }>> =>
    api.get(`/categories/${categoryId}/questions`, { params: filters }),
  addQuestion: (categoryId: number, data: Partial<Question>): Promise<AxiosResponse<{ data: Question }>> =>
    api.post(`/categories/${categoryId}/questions`, data),
  updateQuestion: (id: number, data: Partial<Question>): Promise<AxiosResponse<{ data: Question }>> =>
    api.put(`/questions/${id}`, data),
  deleteQuestion: (id: number): Promise<AxiosResponse<{ data: MessageResponse }>> =>
    api.delete(`/questions/${id}`),
  rateQuestion: (id: number, rating: number): Promise<AxiosResponse<{ data: Question }>> =>
    api.post(`/questions/${id}/rate`, { rating }),
  getStats: (categoryId: number): Promise<AxiosResponse<{ data: QuestionStats }>> =>
    api.get(`/categories/${categoryId}/questions/stats`),
  getChapters: (categoryId: number): Promise<AxiosResponse<{ data: ChaptersResponse }>> =>
    api.get(`/categories/${categoryId}/questions/chapters`),
  createSession: (categoryId: number, settings: QuizSettings): Promise<AxiosResponse<{ data: CreateSessionResponse }>> =>
    api.post(`/categories/${categoryId}/quiz`, settings),
  submitAnswers: (sessionId: number, answers: Record<number, string>, timePerQuestion?: Record<number, number>): Promise<AxiosResponse<{ data: QuizSession }>> =>
    api.post(`/quiz/${sessionId}/submit`, { answers, time_per_question: timePerQuestion }),
  getSession: (sessionId: number): Promise<AxiosResponse<{ data: QuizSession }>> =>
    api.get(`/quiz/${sessionId}`),
  getHistory: (categoryId: number): Promise<AxiosResponse<{ data: SessionsResponse }>> =>
    api.get(`/categories/${categoryId}/quiz/history`)
};

// Flashcards
export const flashcardApi = {
  getByCategory: (categoryId: number, options?: Record<string, unknown>): Promise<AxiosResponse<{ data: FlashcardsResponse }>> =>
    api.get(`/categories/${categoryId}/flashcards`, { params: options }),
  getById: (id: number): Promise<AxiosResponse<{ data: Flashcard }>> =>
    api.get(`/flashcards/${id}`),
  create: (categoryId: number, data: Partial<Flashcard>): Promise<AxiosResponse<{ data: Flashcard }>> =>
    api.post(`/categories/${categoryId}/flashcards`, data),
  update: (id: number, data: Partial<Flashcard>): Promise<AxiosResponse<{ data: Flashcard }>> =>
    api.put(`/flashcards/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<{ data: MessageResponse }>> =>
    api.delete(`/flashcards/${id}`),
  rateFlashcard: (id: number, rating: number): Promise<AxiosResponse<{ data: Flashcard }>> =>
    api.post(`/flashcards/${id}/rate`, { rating }),
  getForReview: (categoryId: number, options?: Record<string, unknown>): Promise<AxiosResponse<{ data: FlashcardsResponse }>> =>
    api.get(`/categories/${categoryId}/flashcards/review`, { params: options }),
  updateProgress: (id: number, data: { categoryId?: number; category_id?: number; confidence?: number; confidence_level?: number }): Promise<AxiosResponse<{ data: FlashcardProgress }>> => {
    // Backend route requires category_id in path
    const categoryId = data.categoryId || data.category_id;
    return api.post(`/categories/${categoryId}/flashcards/${id}/progress`, {
      confidence_level: data.confidence || data.confidence_level
    });
  },
  getStats: (categoryId: number): Promise<AxiosResponse<{ data: FlashcardStats }>> =>
    api.get(`/categories/${categoryId}/flashcards/stats`),
  getChapters: (categoryId: number): Promise<AxiosResponse<{ data: ChaptersResponse }>> =>
    api.get(`/categories/${categoryId}/flashcards/chapters`)
};

// Notebook
export const notebookApi = {
  getByCategory: (categoryId: number, options?: Record<string, unknown>): Promise<AxiosResponse<{ data: { entries: NotebookEntry[] } }>> =>
    api.get(`/categories/${categoryId}/notebook`, { params: options }),
  getById: (id: number): Promise<AxiosResponse<{ data: NotebookEntry }>> =>
    api.get(`/notebook/${id}`),
  update: (id: number, data: Partial<NotebookEntry>): Promise<AxiosResponse<{ data: NotebookEntry }>> =>
    api.put(`/notebook/${id}`, data),
  markReviewed: (id: number): Promise<AxiosResponse<{ data: NotebookEntry }>> =>
    api.post(`/notebook/${id}/reviewed`),
  delete: (id: number): Promise<AxiosResponse<{ data: MessageResponse }>> =>
    api.delete(`/notebook/${id}`),
  getStats: (categoryId: number): Promise<AxiosResponse<{ data: NotebookStats }>> =>
    api.get(`/categories/${categoryId}/notebook/stats`),
  getMostMissed: (categoryId: number, limit?: number): Promise<AxiosResponse<{ data: { questions: Question[] } }>> =>
    api.get(`/categories/${categoryId}/notebook/most-missed`, { params: { limit } }),
  clear: (categoryId: number): Promise<AxiosResponse<{ data: MessageResponse }>> =>
    api.delete(`/categories/${categoryId}/notebook/clear`)
};

// Sample Questions
export const sampleQuestionApi = {
  getByCategory: (categoryId: number): Promise<AxiosResponse<{ data: SamplesResponse }>> =>
    api.get(`/categories/${categoryId}/sample-questions`),
  getById: (id: number): Promise<AxiosResponse<{ data: SampleQuestion }>> =>
    api.get(`/sample-questions/${id}`),
  create: (categoryId: number, data: Partial<SampleQuestion>): Promise<AxiosResponse<{ data: SampleQuestion }>> =>
    api.post(`/categories/${categoryId}/sample-questions`, data),
  createBulk: (categoryId: number, samples: Partial<SampleQuestion>[]): Promise<AxiosResponse<{ data: SamplesResponse }>> =>
    api.post(`/categories/${categoryId}/sample-questions/bulk`, { samples }),
  uploadFile: (categoryId: number, file: File): Promise<AxiosResponse<{ data: SamplesResponse }>> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/categories/${categoryId}/sample-questions/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id: number, data: Partial<SampleQuestion>): Promise<AxiosResponse<{ data: SampleQuestion }>> =>
    api.put(`/sample-questions/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<{ data: MessageResponse }>> =>
    api.delete(`/sample-questions/${id}`),
  getCount: (categoryId: number): Promise<AxiosResponse<{ data: CountResponse }>> =>
    api.get(`/categories/${categoryId}/sample-questions/count`)
};

// AI Analysis (Multi-Agent System)
export const analysisApi = {
  triggerAnalysis: (categoryId: number): Promise<AxiosResponse<{ data: MessageResponse }>> =>
    api.post(`/categories/${categoryId}/analyze-samples`),
  getAnalysisStatus: (categoryId: number): Promise<AxiosResponse<{ data: { hasAnalysis: boolean; analysis?: AnalysisResult } }>> =>
    api.get(`/categories/${categoryId}/analysis-status`),
  clearAnalysis: (categoryId: number): Promise<AxiosResponse<{ data: MessageResponse }>> =>
    api.delete(`/categories/${categoryId}/analysis`),
  getAgentActivity: (categoryId: number, limit: number = 20): Promise<AxiosResponse<{ data: { activities: AgentActivity[] } }>> =>
    api.get(`/categories/${categoryId}/agent-activity`, { params: { limit } })
};

// Quiz Enhanced Features
export const quizEnhancedApi = {
  // Focus tracking for exam simulation
  recordFocusEvent: (sessionId: number, eventType: FocusEventType, details: Record<string, unknown> = {}): Promise<AxiosResponse<{ data: MessageResponse }>> =>
    api.post(`/quiz/${sessionId}/focus-event`, { event_type: eventType, details }),
  getFocusEvents: (sessionId: number): Promise<AxiosResponse<{ data: { events: unknown[] } }>> =>
    api.get(`/quiz/${sessionId}/focus-events`),
  getIntegrityReport: (sessionId: number): Promise<AxiosResponse<{ data: IntegrityReport }>> =>
    api.get(`/quiz/${sessionId}/integrity-report`),

  // Handwritten answers
  uploadHandwrittenAnswer: (sessionId: number, questionId: number, file: File): Promise<AxiosResponse<{ data: HandwrittenAnswer }>> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/quiz/${sessionId}/question/${questionId}/handwritten`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getHandwrittenAnswers: (sessionId: number): Promise<AxiosResponse<{ data: { answers: HandwrittenAnswer[] } }>> =>
    api.get(`/quiz/${sessionId}/handwritten-answers`),
  updateHandwrittenRecognition: (handwrittenId: number, correctedText: string, corrections: Record<string, string>): Promise<AxiosResponse<{ data: HandwrittenAnswer }>> =>
    api.put(`/handwritten/${handwrittenId}/correction`, { corrected_text: correctedText, corrections }),

  // Partial credit grading
  gradeWithPartialCredit: (
    sessionId: number,
    questionId: number,
    userAnswer: string,
    isHandwritten: boolean = false,
    recognizedText: string | null = null
  ): Promise<AxiosResponse<{ data: PartialCreditGrade }>> =>
    api.post(`/quiz/${sessionId}/question/${questionId}/grade`, {
      user_answer: userAnswer,
      is_handwritten: isHandwritten,
      recognized_text: recognizedText,
      use_partial_credit: true
    }),
  getPartialCreditGrades: (sessionId: number): Promise<AxiosResponse<{ data: { grades: PartialCreditGrade[] } }>> =>
    api.get(`/quiz/${sessionId}/partial-grades`),

  // Enhanced submit
  submitWithGrading: (sessionId: number, answers: Record<number, string>, usePartialCredit: boolean = false): Promise<AxiosResponse<{ data: QuizSession }>> =>
    api.post(`/quiz/${sessionId}/submit-graded`, { answers, usePartialCredit })
};

// Authentication
export const authApi = {
  googleLogin: (credential: string): Promise<AxiosResponse<{ data: AuthResponse }>> =>
    api.post('/auth/google', { credential }),
  verifyToken: (token: string): Promise<AxiosResponse<{ data: User }>> =>
    api.get('/auth/verify', { params: { token } }),
  getCurrentUser: (): Promise<AxiosResponse<{ data: User }>> =>
    api.get('/auth/me'),
  logout: (): Promise<AxiosResponse<{ data: { message: string } }>> =>
    api.post('/auth/logout')
};

// Analytics
export const analyticsApi = {
  getDashboard: (categoryId?: number, days: number = 30): Promise<AxiosResponse<{ data: AnalyticsDashboard }>> =>
    api.get('/analytics/dashboard', { params: { category_id: categoryId, days } }),
  getOverview: (categoryId?: number, days: number = 30): Promise<AxiosResponse<{ data: { total_attempts: number; correct_count: number; accuracy: number; total_time_minutes: number; avg_time_per_question: number; sessions_completed: number; streak_days: number; period_days: number } }>> =>
    api.get('/analytics/overview', { params: { category_id: categoryId, days } }),
  getCategoryPerformance: (days: number = 30): Promise<AxiosResponse<{ data: { categories: Array<{ category_id: number; category_name: string; color: string; total_attempts: number; correct_count: number; accuracy: number; avg_time: number; mastery_score: number }> } }>> =>
    api.get('/analytics/categories', { params: { days } }),
  getTrendData: (categoryId?: number, days: number = 30): Promise<AxiosResponse<{ data: { trends: Array<{ date: string; attempts: number; correct: number; accuracy: number }> } }>> =>
    api.get('/analytics/trends', { params: { category_id: categoryId, days } }),
  getLearningScore: (categoryId?: number, days: number = 30): Promise<AxiosResponse<{ data: { total_score: number; accuracy_score: number; consistency_score: number; improvement_score: number; difficulty_score: number; grade: string; recommendation: string } }>> =>
    api.get('/analytics/learning-score', { params: { category_id: categoryId, days } })
};

export default api;
