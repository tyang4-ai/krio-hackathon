const flashcardService = require('../services/flashcardService');

const flashcardController = {
  getByCategory: (req, res) => {
    try {
      const { categoryId } = req.params;
      const { difficulty, limit } = req.query;

      const options = {};
      if (difficulty) options.difficulty = difficulty;
      if (limit) options.limit = parseInt(limit);

      const flashcards = flashcardService.getFlashcardsByCategory(categoryId, options);
      res.json({ success: true, data: flashcards });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getById: (req, res) => {
    try {
      const flashcard = flashcardService.getFlashcardById(req.params.id);
      if (!flashcard) {
        return res.status(404).json({ success: false, error: 'Flashcard not found' });
      }
      res.json({ success: true, data: flashcard });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  create: (req, res) => {
    try {
      const { categoryId } = req.params;
      const flashcardData = { ...req.body, category_id: categoryId };
      const flashcard = flashcardService.addFlashcard(flashcardData);
      res.status(201).json({ success: true, data: flashcard });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  update: (req, res) => {
    try {
      const flashcard = flashcardService.updateFlashcard(req.params.id, req.body);
      if (!flashcard) {
        return res.status(404).json({ success: false, error: 'Flashcard not found' });
      }
      res.json({ success: true, data: flashcard });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  delete: (req, res) => {
    try {
      flashcardService.deleteFlashcard(req.params.id);
      res.json({ success: true, message: 'Flashcard deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getForReview: (req, res) => {
    try {
      const flashcards = flashcardService.getFlashcardsForReview(req.params.categoryId);
      res.json({ success: true, data: flashcards });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  updateProgress: (req, res) => {
    try {
      const { id } = req.params;
      const { confidence, categoryId } = req.body;

      flashcardService.updateProgress(id, categoryId, confidence);
      res.json({ success: true, message: 'Progress updated' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getStats: (req, res) => {
    try {
      const stats = flashcardService.getFlashcardStats(req.params.categoryId);
      const progress = flashcardService.getStudyProgress(req.params.categoryId);
      res.json({ success: true, data: { ...stats, ...progress } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = flashcardController;
