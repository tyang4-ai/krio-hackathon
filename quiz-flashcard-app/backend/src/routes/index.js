const express = require('express');
const multer = require('multer');
const path = require('path');

const categoryController = require('../controllers/categoryController');
const documentController = require('../controllers/documentController');
const quizController = require('../controllers/quizController');
const flashcardController = require('../controllers/flashcardController');
const notebookController = require('../controllers/notebookController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/temp'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT, MD'));
    }
  }
});

// ===== Category Routes =====
router.get('/categories', categoryController.getAll);
router.get('/categories/:id', categoryController.getById);
router.post('/categories', categoryController.create);
router.put('/categories/:id', categoryController.update);
router.delete('/categories/:id', categoryController.delete);

// ===== Document Routes =====
router.get('/categories/:categoryId/documents', documentController.getByCategory);
router.post('/categories/:categoryId/documents', upload.single('file'), documentController.upload);
router.delete('/documents/:id', documentController.delete);
router.post('/categories/:categoryId/generate-questions', documentController.generateQuestions);
router.post('/categories/:categoryId/generate-flashcards', documentController.generateFlashcards);

// ===== Quiz Routes =====
router.get('/categories/:categoryId/questions', quizController.getQuestions);
router.post('/categories/:categoryId/questions', quizController.addQuestion);
router.delete('/questions/:id', quizController.deleteQuestion);
router.get('/categories/:categoryId/questions/stats', quizController.getQuestionStats);

// Quiz Sessions
router.post('/categories/:categoryId/quiz', quizController.createQuiz);
router.post('/quiz/:sessionId/submit', quizController.submitQuiz);
router.get('/quiz/:sessionId', quizController.getQuizSession);
router.get('/categories/:categoryId/quiz/history', quizController.getQuizHistory);

// ===== Flashcard Routes =====
router.get('/categories/:categoryId/flashcards', flashcardController.getByCategory);
router.get('/flashcards/:id', flashcardController.getById);
router.post('/categories/:categoryId/flashcards', flashcardController.create);
router.put('/flashcards/:id', flashcardController.update);
router.delete('/flashcards/:id', flashcardController.delete);
router.get('/categories/:categoryId/flashcards/review', flashcardController.getForReview);
router.post('/flashcards/:id/progress', flashcardController.updateProgress);
router.get('/categories/:categoryId/flashcards/stats', flashcardController.getStats);

// ===== Notebook Routes =====
router.get('/categories/:categoryId/notebook', notebookController.getByCategory);
router.get('/notebook/:id', notebookController.getById);
router.put('/notebook/:id', notebookController.update);
router.post('/notebook/:id/reviewed', notebookController.markReviewed);
router.delete('/notebook/:id', notebookController.delete);
router.get('/categories/:categoryId/notebook/stats', notebookController.getStats);
router.get('/categories/:categoryId/notebook/most-missed', notebookController.getMostMissed);
router.delete('/categories/:categoryId/notebook/clear', notebookController.clearCategory);

module.exports = router;
