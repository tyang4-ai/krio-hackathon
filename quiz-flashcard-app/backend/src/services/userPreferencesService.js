const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

class UserPreferencesService {
  // User Preferences Management
  setPreference(categoryId, key, value) {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO user_preferences (id, category_id, preference_key, preference_value, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(category_id, preference_key)
      DO UPDATE SET preference_value = ?, updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(id, categoryId, key, value, value);
  }

  getPreference(categoryId, key) {
    const stmt = db.prepare('SELECT preference_value FROM user_preferences WHERE category_id = ? AND preference_key = ?');
    const result = stmt.get(categoryId, key);
    return result ? result.preference_value : null;
  }

  getAllPreferences(categoryId) {
    const stmt = db.prepare('SELECT preference_key, preference_value FROM user_preferences WHERE category_id = ?');
    const results = stmt.all(categoryId);
    const preferences = {};
    results.forEach(row => {
      preferences[row.preference_key] = row.preference_value;
    });
    return preferences;
  }

  // Question Performance Tracking
  recordQuestionAnswer(questionId, categoryId, isCorrect) {
    const existing = db.prepare('SELECT * FROM question_performance WHERE question_id = ?').get(questionId);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE question_performance
        SET times_answered = times_answered + 1,
            times_correct = times_correct + ?,
            last_answered = CURRENT_TIMESTAMP
        WHERE question_id = ?
      `);
      stmt.run(isCorrect ? 1 : 0, questionId);
    } else {
      const id = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO question_performance (id, question_id, category_id, times_answered, times_correct, last_answered)
        VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(id, questionId, categoryId, isCorrect ? 1 : 0);
    }
  }

  // Get questions user struggles with (low accuracy)
  getWeakQuestions(categoryId, threshold = 0.5) {
    const stmt = db.prepare(`
      SELECT
        qp.question_id,
        q.question_text,
        q.question_type,
        q.difficulty,
        qp.times_answered,
        qp.times_correct,
        CAST(qp.times_correct AS FLOAT) / qp.times_answered as accuracy
      FROM question_performance qp
      JOIN questions q ON qp.question_id = q.id
      WHERE qp.category_id = ?
        AND qp.times_answered >= 2
        AND CAST(qp.times_correct AS FLOAT) / qp.times_answered < ?
      ORDER BY accuracy ASC
      LIMIT 20
    `);
    return stmt.all(categoryId, threshold);
  }

  // Get questions user excels at (high accuracy)
  getStrongQuestions(categoryId, threshold = 0.8) {
    const stmt = db.prepare(`
      SELECT
        qp.question_id,
        q.question_text,
        q.question_type,
        q.difficulty,
        qp.times_answered,
        qp.times_correct,
        CAST(qp.times_correct AS FLOAT) / qp.times_answered as accuracy
      FROM question_performance qp
      JOIN questions q ON qp.question_id = q.id
      WHERE qp.category_id = ?
        AND qp.times_answered >= 2
        AND CAST(qp.times_correct AS FLOAT) / qp.times_answered >= ?
      ORDER BY accuracy DESC
      LIMIT 20
    `);
    return stmt.all(categoryId, threshold);
  }

  // Get overall performance stats
  getPerformanceStats(categoryId) {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_questions_attempted,
        SUM(times_answered) as total_answers,
        SUM(times_correct) as total_correct,
        AVG(CAST(times_correct AS FLOAT) / NULLIF(times_answered, 0)) as avg_accuracy
      FROM question_performance
      WHERE category_id = ?
    `);
    return stmt.get(categoryId);
  }

  // Get AI learning insights for content generation
  getAIInsights(categoryId) {
    // Get highly rated questions for style guidance
    const highlyRatedStmt = db.prepare(`
      SELECT id, question_text, question_type, difficulty, options, explanation, rating
      FROM questions
      WHERE category_id = ? AND rating >= 4
      ORDER BY rating DESC, created_at DESC
      LIMIT 10
    `);
    const highlyRated = highlyRatedStmt.all(categoryId).map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : []
    }));

    // Get poorly rated questions to avoid similar patterns
    const poorlyRatedStmt = db.prepare(`
      SELECT id, question_text, question_type, difficulty, rating
      FROM questions
      WHERE category_id = ? AND rating > 0 AND rating <= 2
      ORDER BY rating ASC, created_at DESC
      LIMIT 5
    `);
    const poorlyRated = poorlyRatedStmt.all(categoryId);

    // Get weak topics/question types
    const weakTopicsStmt = db.prepare(`
      SELECT
        q.question_type,
        q.difficulty,
        COUNT(*) as question_count,
        AVG(CAST(qp.times_correct AS FLOAT) / NULLIF(qp.times_answered, 0)) as avg_accuracy
      FROM question_performance qp
      JOIN questions q ON qp.question_id = q.id
      WHERE qp.category_id = ?
      GROUP BY q.question_type, q.difficulty
      HAVING avg_accuracy < 0.6 AND question_count >= 2
    `);
    const weakTopics = weakTopicsStmt.all(categoryId);

    // Get preferred question types (based on ratings)
    const preferredTypesStmt = db.prepare(`
      SELECT
        question_type,
        COUNT(*) as count,
        AVG(rating) as avg_rating
      FROM questions
      WHERE category_id = ? AND rating > 0
      GROUP BY question_type
      ORDER BY avg_rating DESC
    `);
    const preferredTypes = preferredTypesStmt.all(categoryId);

    return {
      highlyRated,
      poorlyRated,
      weakTopics,
      preferredTypes,
      preferences: this.getAllPreferences(categoryId),
      performance: this.getPerformanceStats(categoryId)
    };
  }
}

module.exports = new UserPreferencesService();
