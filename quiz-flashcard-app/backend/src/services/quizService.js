const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

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
      questionCount = 10,
      difficulty = null,
      questionTypes = ['multiple_choice']
    } = settings;

    let query = 'SELECT * FROM questions WHERE category_id = ?';
    const params = [categoryId];

    if (difficulty && difficulty !== 'mixed') {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }

    if (questionTypes && questionTypes.length > 0) {
      query += ' AND question_type IN (' + questionTypes.map(() => '?').join(',') + ')';
      params.push(...questionTypes);
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(questionCount);

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
        SUM(CASE WHEN difficulty = 'hard' THEN 1 ELSE 0 END) as hard
      FROM questions
      WHERE category_id = ?
    `);
    return stmt.get(categoryId);
  }
}

module.exports = new QuizService();
