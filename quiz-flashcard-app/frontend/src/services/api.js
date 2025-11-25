import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Categories
export const categoryApi = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`)
};

// Documents
export const documentApi = {
  getByCategory: (categoryId) => api.get(`/categories/${categoryId}/documents`),
  upload: (categoryId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/categories/${categoryId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/documents/${id}`),
  generateQuestions: (categoryId, options) =>
    api.post(`/categories/${categoryId}/generate-questions`, options),
  generateFlashcards: (categoryId, options) =>
    api.post(`/categories/${categoryId}/generate-flashcards`, options)
};

// Quiz
export const quizApi = {
  getQuestions: (categoryId, filters) =>
    api.get(`/categories/${categoryId}/questions`, { params: filters }),
  addQuestion: (categoryId, data) =>
    api.post(`/categories/${categoryId}/questions`, data),
  updateQuestion: (id, data) => api.put(`/questions/${id}`, data),
  deleteQuestion: (id) => api.delete(`/questions/${id}`),
  rateQuestion: (id, rating) => api.post(`/questions/${id}/rate`, { rating }),
  getStats: (categoryId) =>
    api.get(`/categories/${categoryId}/questions/stats`),
  createSession: (categoryId, settings) =>
    api.post(`/categories/${categoryId}/quiz`, settings),
  submitAnswers: (sessionId, answers) =>
    api.post(`/quiz/${sessionId}/submit`, { answers }),
  getSession: (sessionId) => api.get(`/quiz/${sessionId}`),
  getHistory: (categoryId) =>
    api.get(`/categories/${categoryId}/quiz/history`)
};

// Flashcards
export const flashcardApi = {
  getByCategory: (categoryId, options) =>
    api.get(`/categories/${categoryId}/flashcards`, { params: options }),
  getById: (id) => api.get(`/flashcards/${id}`),
  create: (categoryId, data) =>
    api.post(`/categories/${categoryId}/flashcards`, data),
  update: (id, data) => api.put(`/flashcards/${id}`, data),
  delete: (id) => api.delete(`/flashcards/${id}`),
  rateFlashcard: (id, rating) => api.post(`/flashcards/${id}/rate`, { rating }),
  getForReview: (categoryId) =>
    api.get(`/categories/${categoryId}/flashcards/review`),
  updateProgress: (id, data) =>
    api.post(`/flashcards/${id}/progress`, data),
  getStats: (categoryId) =>
    api.get(`/categories/${categoryId}/flashcards/stats`)
};

// Notebook
export const notebookApi = {
  getByCategory: (categoryId, options) =>
    api.get(`/categories/${categoryId}/notebook`, { params: options }),
  getById: (id) => api.get(`/notebook/${id}`),
  update: (id, data) => api.put(`/notebook/${id}`, data),
  markReviewed: (id) => api.post(`/notebook/${id}/reviewed`),
  delete: (id) => api.delete(`/notebook/${id}`),
  getStats: (categoryId) =>
    api.get(`/categories/${categoryId}/notebook/stats`),
  getMostMissed: (categoryId, limit) =>
    api.get(`/categories/${categoryId}/notebook/most-missed`, { params: { limit } }),
  clear: (categoryId) =>
    api.delete(`/categories/${categoryId}/notebook/clear`)
};

// Sample Questions
export const sampleQuestionApi = {
  getByCategory: (categoryId) =>
    api.get(`/categories/${categoryId}/sample-questions`),
  getById: (id) => api.get(`/sample-questions/${id}`),
  create: (categoryId, data) =>
    api.post(`/categories/${categoryId}/sample-questions`, data),
  createBulk: (categoryId, samples) =>
    api.post(`/categories/${categoryId}/sample-questions/bulk`, { samples }),
  uploadFile: (categoryId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/categories/${categoryId}/sample-questions/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, data) => api.put(`/sample-questions/${id}`, data),
  delete: (id) => api.delete(`/sample-questions/${id}`),
  getCount: (categoryId) =>
    api.get(`/categories/${categoryId}/sample-questions/count`)
};

// AI Analysis (Multi-Agent System)
export const analysisApi = {
  triggerAnalysis: (categoryId) =>
    api.post(`/categories/${categoryId}/analyze-samples`),
  getAnalysisStatus: (categoryId) =>
    api.get(`/categories/${categoryId}/analysis-status`),
  clearAnalysis: (categoryId) =>
    api.delete(`/categories/${categoryId}/analysis`),
  getAgentActivity: (categoryId, limit = 20) =>
    api.get(`/categories/${categoryId}/agent-activity`, { params: { limit } })
};

// Quiz Enhanced Features
export const quizEnhancedApi = {
  // Focus tracking for exam simulation
  recordFocusEvent: (sessionId, eventType, details = {}) =>
    api.post(`/quiz/${sessionId}/focus-event`, { eventType, details }),
  getFocusEvents: (sessionId) =>
    api.get(`/quiz/${sessionId}/focus-events`),
  getIntegrityReport: (sessionId) =>
    api.get(`/quiz/${sessionId}/integrity-report`),

  // Handwritten answers
  uploadHandwrittenAnswer: (sessionId, questionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/quiz/${sessionId}/question/${questionId}/handwritten`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getHandwrittenAnswers: (sessionId) =>
    api.get(`/quiz/${sessionId}/handwritten-answers`),
  updateHandwrittenRecognition: (handwrittenId, correctedText, corrections) =>
    api.put(`/handwritten/${handwrittenId}/correction`, { correctedText, corrections }),

  // Partial credit grading
  gradeWithPartialCredit: (sessionId, questionId, userAnswer, isHandwritten = false, recognizedText = null) =>
    api.post(`/quiz/${sessionId}/question/${questionId}/grade`, { userAnswer, isHandwritten, recognizedText }),
  getPartialCreditGrades: (sessionId) =>
    api.get(`/quiz/${sessionId}/partial-grades`),

  // Enhanced submit
  submitWithGrading: (sessionId, answers, usePartialCredit = false) =>
    api.post(`/quiz/${sessionId}/submit-graded`, { answers, usePartialCredit })
};

export default api;
