const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');
const userPreferencesService = require('./userPreferencesService');

class QuizService {
  // Question Bank Methods
  addQuestion(questionData) {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO questions (id, category_id, document_id, question_text, question_type, difficulty, options, correct_answer, explanation, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      questionData.category_id,
      questionData.document_id || null,
      questionData.question_text,
      questionData.question_type || 'multiple_choice',
      questionData.difficulty || 'medium',
      JSON.stringify(questionData.options || []),
      questionData.correct_answer,
      questionData.explanation || '',
      JSON.stringify(questionData.tags || [])
    );

    return this.getQuestionById(id);
  }

  addBulkQuestions(questions, categoryId, documentId = null) {
    const results = [];
    for (const q of questions) {
      const id = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO questions (id, category_id, document_id, question_text, question_type, difficulty, options, correct_answer, explanation, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        categoryId,
        documentId,
        q.question_text,
        q.question_type || 'multiple_choice',
        q.difficulty || 'medium',
        JSON.stringify(q.options || []),
        q.correct_answer,
        q.explanation || '',
        JSON.stringify(q.tags || [])
      );
      results.push(id);
    }
    return results;
  }

  getQuestionById(id) {
    const stmt = db.prepare('SELECT * FROM questions WHERE id = ?');
    const question = stmt.get(id);
    if (question) {
      question.options = JSON.parse(question.options);
      question.tags = JSON.parse(question.tags);
    }
    return question;
  }

  getQuestionsByCategory(categoryId, filters = {}) {
    let query = 'SELECT * FROM questions WHERE category_id = ?';
    const params = [categoryId];

    if (filters.difficulty) {
      query += ' AND difficulty = ?';
      params.push(filters.difficulty);
    }

    if (filters.tags && filters.tags.length > 0) {
      // SQLite JSON search
      query += ' AND (' + filters.tags.map(() => 'tags LIKE ?').join(' OR ') + ')';
      filters.tags.forEach(tag => params.push(`%${tag}%`));
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    const questions = stmt.all(...params);

    return questions.map(q => ({
      ...q,
      options: JSON.parse(q.options),
      tags: JSON.parse(q.tags)
    }));
  }

  // Quiz Session Methods
  createQuizSession(categoryId, settings) {
    const questions = this.selectQuestionsForQuiz(categoryId, settings);

    if (questions.length === 0) {
      throw new Error('No questions available for quiz');
    }

    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO quiz_sessions (id, category_id, settings, questions, total_questions)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      categoryId,
      JSON.stringify(settings),
      JSON.stringify(questions.map(q => q.id)),
      questions.length
    );

    return {
      session_id: id,
      questions: questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        difficulty: q.difficulty,
        options: q.options
      })),
      total_questions: questions.length,
      settings
    };
  }

  selectQuestionsForQuiz(categoryId, settings) {
    const {
      difficulty = null,
      selectionMode = 'mixed',
      multipleChoice = 0,
      trueFalse = 0,
      writtenAnswer = 0,
      totalQuestions = 10
    } = settings;

    let selectedQuestions = [];

    if (selectionMode === 'custom') {
      // Custom mode: get specific counts of each type
      if (multipleChoice > 0) {
        const mcQuestions = this.getQuestionsByTypeAndCount(
          categoryId,
          'multiple_choice',
          multipleChoice,
          difficulty
        );
        selectedQuestions.push(...mcQuestions);
      }

      if (trueFalse > 0) {
        const tfQuestions = this.getQuestionsByTypeAndCount(
          categoryId,
          'true_false',
          trueFalse,
          difficulty
        );
        selectedQuestions.push(...tfQuestions);
      }

      if (writtenAnswer > 0) {
        const waQuestions = this.getQuestionsByTypeAndCount(
          categoryId,
          'written_answer',
          writtenAnswer,
          difficulty
        );
        selectedQuestions.push(...waQuestions);
      }

      // Shuffle the combined array
      selectedQuestions = this.shuffleArray(selectedQuestions);
    } else {
      // Mixed mode: get random questions from all types
      let query = 'SELECT * FROM questions WHERE category_id = ?';
      const params = [categoryId];

      if (difficulty && difficulty !== 'mixed') {
        query += ' AND difficulty = ?';
        params.push(difficulty);
      }

      query += ' ORDER BY RANDOM() LIMIT ?';
      params.push(totalQuestions);

      const stmt = db.prepare(query);
      selectedQuestions = stmt.all(...params);
    }

    return selectedQuestions.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      tags: typeof q.tags === 'string' ? JSON.parse(q.tags) : q.tags
    }));
  }

  getQuestionsByTypeAndCount(categoryId, questionType, count, difficulty) {
    let query = 'SELECT * FROM questions WHERE category_id = ? AND question_type = ?';
    const params = [categoryId, questionType];

    if (difficulty && difficulty !== 'mixed') {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(count);

    const stmt = db.prepare(query);
    const questions = stmt.all(...params);

    return questions.map(q => ({
      ...q,
      options: JSON.parse(q.options),
      tags: JSON.parse(q.tags)
    }));
  }

  submitQuizAnswers(sessionId, answers) {
    const session = this.getQuizSession(sessionId);
    if (!session) {
      throw new Error('Quiz session not found');
    }

    const questionIds = JSON.parse(session.questions);
    const results = [];
    let correctCount = 0;

    // Ensure answers is an object
    const safeAnswers = answers || {};

    for (const questionId of questionIds) {
      const question = this.getQuestionById(questionId);
      // Handle undefined answers - treat as empty string
      const userAnswer = safeAnswers[questionId] !== undefined ? safeAnswers[questionId] : '';
      const isCorrect = userAnswer === question.correct_answer;

      if (isCorrect) {
        correctCount++;
      }

      // Record performance for AI learning
      userPreferencesService.recordQuestionAnswer(questionId, session.category_id, isCorrect);

      results.push({
        question_id: questionId,
        question_text: question.question_text,
        user_answer: userAnswer,
        correct_answer: question.correct_answer,
        is_correct: isCorrect,
        explanation: question.explanation,
        options: question.options
      });
    }

    // Update session - ensure we're passing valid data
    const updateStmt = db.prepare(`
      UPDATE quiz_sessions
      SET answers = ?, score = ?, completed = 1, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(JSON.stringify(safeAnswers), correctCount, sessionId);

    return {
      session_id: sessionId,
      score: correctCount,
      total: questionIds.length,
      percentage: Math.round((correctCount / questionIds.length) * 100),
      results
    };
  }

  getQuizSession(sessionId) {
    const stmt = db.prepare('SELECT * FROM quiz_sessions WHERE id = ?');
    return stmt.get(sessionId);
  }

  getQuizHistory(categoryId) {
    const stmt = db.prepare(`
      SELECT * FROM quiz_sessions
      WHERE category_id = ? AND completed = 1
      ORDER BY completed_at DESC
      LIMIT 50
    `);
    const sessions = stmt.all(categoryId);

    return sessions.map(s => ({
      ...s,
      settings: JSON.parse(s.settings),
      questions: JSON.parse(s.questions),
      answers: s.answers ? JSON.parse(s.answers) : null
    }));
  }

  deleteQuestion(id) {
    const stmt = db.prepare('DELETE FROM questions WHERE id = ?');
    return stmt.run(id);
  }

  getQuestionStats(categoryId) {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN difficulty = 'easy' THEN 1 ELSE 0 END) as easy,
        SUM(CASE WHEN difficulty = 'medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN difficulty = 'hard' THEN 1 ELSE 0 END) as hard,
        SUM(CASE WHEN question_type = 'multiple_choice' THEN 1 ELSE 0 END) as multiple_choice,
        SUM(CASE WHEN question_type = 'true_false' THEN 1 ELSE 0 END) as true_false,
        SUM(CASE WHEN question_type = 'written_answer' THEN 1 ELSE 0 END) as written_answer
      FROM questions
      WHERE category_id = ?
    `);
    const stats = stmt.get(categoryId);

    // Format with by_type object
    return {
      total: stats.total,
      easy: stats.easy,
      medium: stats.medium,
      hard: stats.hard,
      by_type: {
        multiple_choice: stats.multiple_choice,
        true_false: stats.true_false,
        written_answer: stats.written_answer
      }
    };
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  updateQuestion(id, data) {
    const stmt = db.prepare(`
      UPDATE questions
      SET question_text = ?, question_type = ?, difficulty = ?, options = ?, correct_answer = ?, explanation = ?
      WHERE id = ?
    `);

    stmt.run(
      data.question_text,
      data.question_type,
      data.difficulty,
      JSON.stringify(data.options || []),
      data.correct_answer,
      data.explanation || '',
      id
    );

    return this.getQuestionById(id);
  }

  rateQuestion(id, rating) {
    const stmt = db.prepare('UPDATE questions SET rating = ? WHERE id = ?');
    stmt.run(rating, id);
  }
}

module.exports = new QuizService();
