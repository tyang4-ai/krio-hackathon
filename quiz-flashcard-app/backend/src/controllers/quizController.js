const quizService = require('../services/quizService');
const notebookService = require('../services/notebookService');

const quizController = {
  // Questions
  getQuestions: (req, res) => {
    try {
      const { categoryId } = req.params;
      const { difficulty, tags } = req.query;

      const filters = {};
      if (difficulty) filters.difficulty = difficulty;
      if (tags) filters.tags = tags.split(',');

      const questions = quizService.getQuestionsByCategory(categoryId, filters);
      res.json({ success: true, data: questions });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  addQuestion: (req, res) => {
    try {
      const { categoryId } = req.params;
      const questionData = { ...req.body, category_id: categoryId };
      const question = quizService.addQuestion(questionData);
      res.status(201).json({ success: true, data: question });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  deleteQuestion: (req, res) => {
    try {
      quizService.deleteQuestion(req.params.id);
      res.json({ success: true, message: 'Question deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getQuestionStats: (req, res) => {
    try {
      const stats = quizService.getQuestionStats(req.params.categoryId);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Quiz Sessions
  createQuiz: (req, res) => {
    try {
      const { categoryId } = req.params;
      const settings = req.body;

      const quiz = quizService.createQuizSession(categoryId, settings);
      res.status(201).json({ success: true, data: quiz });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  submitQuiz: (req, res) => {
    try {
      const { sessionId } = req.params;
      const { answers } = req.body;

      console.log('Submitting quiz:', sessionId, 'with answers:', Object.keys(answers).length);

      const results = quizService.submitQuizAnswers(sessionId, answers);

      // Add wrong answers to notebook
      const wrongAnswers = results.results.filter(r => !r.is_correct);
      if (wrongAnswers.length > 0) {
        const session = quizService.getQuizSession(sessionId);
        if (session) {
          const entries = wrongAnswers.map(wa => ({
            category_id: session.category_id,
            question_id: wa.question_id,
            quiz_session_id: sessionId,
            user_answer: wa.user_answer,
            correct_answer: wa.correct_answer
          }));
          notebookService.addBulkEntries(entries);
        }
      }

      res.json({ success: true, data: results });
    } catch (error) {
      console.error('Error in submitQuiz:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getQuizHistory: (req, res) => {
    try {
      const history = quizService.getQuizHistory(req.params.categoryId);
      res.json({ success: true, data: history });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getQuizSession: (req, res) => {
    try {
      const session = quizService.getQuizSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Quiz session not found' });
      }
      res.json({ success: true, data: session });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  updateQuestion: (req, res) => {
    try {
      const { id } = req.params;
      const updated = quizService.updateQuestion(id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  rateQuestion: (req, res) => {
    try {
      const { id } = req.params;
      const { rating } = req.body;
      quizService.rateQuestion(id, rating);
      res.json({ success: true, message: 'Question rated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = quizController;
