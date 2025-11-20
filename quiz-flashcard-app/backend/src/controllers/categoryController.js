const categoryService = require('../services/categoryService');

const categoryController = {
  getAll: (req, res) => {
    try {
      const categories = categoryService.getAllCategoriesWithStats();
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getById: (req, res) => {
    try {
      const category = categoryService.getCategoryWithStats(req.params.id);
      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      res.json({ success: true, data: category });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  create: (req, res) => {
    try {
      const { name, description, color } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }
      const category = categoryService.createCategory(name, description, color);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  update: (req, res) => {
    try {
      const category = categoryService.updateCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      res.json({ success: true, data: category });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  delete: (req, res) => {
    try {
      categoryService.deleteCategory(req.params.id);
      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = categoryController;
