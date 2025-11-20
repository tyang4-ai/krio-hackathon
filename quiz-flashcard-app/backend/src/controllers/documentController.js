const documentService = require('../services/documentService');
const storageService = require('../services/storageService');
const aiService = require('../services/aiService');
const quizService = require('../services/quizService');
const flashcardService = require('../services/flashcardService');
const path = require('path');

const documentController = {
  upload: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const { categoryId } = req.params;
      const file = req.file;

      // Store file
      const storage = await storageService.uploadFile(file, categoryId);

      // Get file extension
      const fileType = path.extname(file.originalname).substring(1);

      // Process document to extract text
      let contentText = null;
      try {
        contentText = await documentService.processDocument(storage.path, fileType);
      } catch (err) {
        console.error('Error processing document:', err);
      }

      // Save to database
      const document = documentService.saveDocument(
        categoryId,
        file,
        storage.path,
        contentText
      );

      res.status(201).json({ success: true, data: document });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getByCategory: (req, res) => {
    try {
      const documents = documentService.getDocumentsByCategory(req.params.categoryId);
      res.json({ success: true, data: documents });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  delete: (req, res) => {
    try {
      documentService.deleteDocument(req.params.id);
      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  generateQuestions: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { count = 10, difficulty = 'medium' } = req.body;

      // Get combined content from all documents in category
      const content = documentService.getCombinedContentForCategory(categoryId);

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'No processed documents found in this category'
        });
      }

      // Generate questions using AI
      const questions = await aiService.generateQuestions(content, {
        count,
        difficulty
      });

      // Save questions to database
      const questionIds = quizService.addBulkQuestions(questions, categoryId);

      res.json({
        success: true,
        data: {
          generated: questions.length,
          question_ids: questionIds
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  generateFlashcards: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const { count = 10 } = req.body;

      // Get combined content from all documents in category
      const content = documentService.getCombinedContentForCategory(categoryId);

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'No processed documents found in this category'
        });
      }

      // Generate flashcards using AI
      const flashcards = await aiService.generateFlashcards(content, { count });

      // Save flashcards to database
      const flashcardIds = flashcardService.addBulkFlashcards(flashcards, categoryId);

      res.json({
        success: true,
        data: {
          generated: flashcards.length,
          flashcard_ids: flashcardIds
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = documentController;
