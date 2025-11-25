const quizService = require('../services/quizService');
const notebookService = require('../services/notebookService');
const handwritingAgent = require('../services/agents/handwritingAgent');
const gradingAgent = require('../services/agents/gradingAgent');
const path = require('path');
const fs = require('fs');

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
  },

  // Focus event tracking for exam simulation mode
  recordFocusEvent: (req, res) => {
    try {
      const { sessionId } = req.params;
      const { eventType, details } = req.body;

      const eventId = quizService.recordFocusEvent(sessionId, eventType, details);
      res.json({ success: true, data: { eventId } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getFocusEvents: (req, res) => {
    try {
      const { sessionId } = req.params;
      const events = quizService.getFocusEvents(sessionId);
      res.json({ success: true, data: events });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getExamIntegrityReport: (req, res) => {
    try {
      const { sessionId } = req.params;
      const report = quizService.getExamIntegrityReport(sessionId);
      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Handwritten answer upload and processing
  uploadHandwrittenAnswer: async (req, res) => {
    try {
      const { sessionId, questionId } = req.params;

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const result = await handwritingAgent.processHandwrittenAnswer(
        sessionId,
        questionId,
        req.file.path,
        req.file.originalname
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error processing handwritten answer:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getHandwrittenAnswers: (req, res) => {
    try {
      const { sessionId } = req.params;
      const answers = handwritingAgent.getSessionHandwrittenAnswers(sessionId);
      res.json({ success: true, data: answers });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  updateHandwrittenRecognition: (req, res) => {
    try {
      const { handwrittenId } = req.params;
      const { correctedText, corrections } = req.body;

      handwritingAgent.updateRecognizedText(handwrittenId, correctedText, corrections);
      res.json({ success: true, message: 'Recognition updated and corrections learned' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Partial credit grading
  gradeWithPartialCredit: async (req, res) => {
    try {
      const { sessionId, questionId } = req.params;
      const { userAnswer, isHandwritten, recognizedText } = req.body;

      const grade = await gradingAgent.gradeAnswer(sessionId, questionId, userAnswer, {
        isHandwritten,
        recognizedText
      });

      res.json({ success: true, data: grade });
    } catch (error) {
      console.error('Error grading with partial credit:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getPartialCreditGrades: (req, res) => {
    try {
      const { sessionId } = req.params;
      const grades = gradingAgent.getSessionGrades(sessionId);
      res.json({ success: true, data: grades });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // Enhanced submit with partial credit support
  submitQuizWithGrading: async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { answers, usePartialCredit = false } = req.body;

      console.log('Submitting quiz with grading:', sessionId);

      // Get the session to check mode
      const session = quizService.getQuizSession(sessionId);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }

      const settings = JSON.parse(session.settings);
      const questionIds = JSON.parse(session.questions);

      // Grade each answer
      const results = [];
      let totalEarned = 0;
      let totalPossible = 0;

      for (const questionId of questionIds) {
        const userAnswer = answers[questionId] || '';

        // Check for handwritten answer
        const handwrittenAnswers = handwritingAgent.getSessionHandwrittenAnswers(sessionId);
        const handwritten = handwrittenAnswers.find(h => h.question_id === questionId);

        let grade;
        if (usePartialCredit || settings.mode === 'exam') {
          grade = await gradingAgent.gradeAnswer(sessionId, questionId, userAnswer, {
            isHandwritten: !!handwritten,
            recognizedText: handwritten?.recognized_text
          });
        } else {
          // Simple grading
          const question = quizService.getQuestionById(questionId);
          const isCorrect = userAnswer === question?.correct_answer;
          grade = {
            questionId,
            totalPoints: 1.0,
            earnedPoints: isCorrect ? 1.0 : 0,
            isCorrect,
            breakdown: [],
            feedback: isCorrect ? 'Correct!' : `Expected: ${question?.correct_answer}`,
            partialCredit: false
          };
        }

        totalPossible += grade.totalPoints;
        totalEarned += grade.earnedPoints;

        results.push({
          question_id: questionId,
          user_answer: userAnswer,
          is_correct: grade.earnedPoints >= grade.totalPoints * 0.9,
          earned_points: grade.earnedPoints,
          total_points: grade.totalPoints,
          breakdown: grade.breakdown,
          feedback: grade.feedback,
          partial_credit: grade.partialCredit,
          handwritten: handwritten ? {
            recognized_text: handwritten.recognized_text,
            confidence: handwritten.confidence_score
          } : null
        });
      }

      // Update session
      const updateStmt = require('../config/database').db.prepare(`
        UPDATE quiz_sessions
        SET answers = ?, score = ?, completed = 1, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateStmt.run(JSON.stringify(answers), Math.round(totalEarned), sessionId);

      // Add wrong answers to notebook
      const wrongAnswers = results.filter(r => !r.is_correct);
      if (wrongAnswers.length > 0 && session) {
        const entries = wrongAnswers.map(wa => ({
          category_id: session.category_id,
          question_id: wa.question_id,
          quiz_session_id: sessionId,
          user_answer: wa.user_answer,
          correct_answer: wa.feedback
        }));
        notebookService.addBulkEntries(entries);
      }

      // Get integrity report for exam mode
      let integrityReport = null;
      if (settings.mode === 'exam') {
        integrityReport = quizService.getExamIntegrityReport(sessionId);
      }

      res.json({
        success: true,
        data: {
          session_id: sessionId,
          score: Math.round(totalEarned),
          total: totalPossible,
          percentage: Math.round((totalEarned / totalPossible) * 100),
          results,
          integrityReport
        }
      });
    } catch (error) {
      console.error('Error in submitQuizWithGrading:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = quizController;
