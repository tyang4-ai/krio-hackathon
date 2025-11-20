const notebookService = require('../services/notebookService');

const notebookController = {
  getByCategory: (req, res) => {
    try {
      const { categoryId } = req.params;
      const { reviewed, limit } = req.query;

      const options = {};
      if (reviewed !== undefined) options.reviewed = reviewed === 'true';
      if (limit) options.limit = parseInt(limit);

      const entries = notebookService.getEntriesByCategory(categoryId, options);
      res.json({ success: true, data: entries });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getById: (req, res) => {
    try {
      const entry = notebookService.getEntryById(req.params.id);
      if (!entry) {
        return res.status(404).json({ success: false, error: 'Entry not found' });
      }
      res.json({ success: true, data: entry });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  update: (req, res) => {
    try {
      const entry = notebookService.updateEntry(req.params.id, req.body);
      if (!entry) {
        return res.status(404).json({ success: false, error: 'Entry not found' });
      }
      res.json({ success: true, data: entry });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  markReviewed: (req, res) => {
    try {
      const entry = notebookService.markAsReviewed(req.params.id);
      res.json({ success: true, data: entry });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  delete: (req, res) => {
    try {
      notebookService.deleteEntry(req.params.id);
      res.json({ success: true, message: 'Entry deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getStats: (req, res) => {
    try {
      const stats = notebookService.getNotebookStats(req.params.categoryId);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getMostMissed: (req, res) => {
    try {
      const { categoryId } = req.params;
      const { limit = 10 } = req.query;
      const questions = notebookService.getMostMissedQuestions(categoryId, parseInt(limit));
      res.json({ success: true, data: questions });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  clearCategory: (req, res) => {
    try {
      notebookService.clearCategory(req.params.categoryId);
      res.json({ success: true, message: 'Notebook cleared successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = notebookController;
