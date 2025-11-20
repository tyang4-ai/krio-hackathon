const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

class NotebookService {
  addEntry(entryData) {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO notebook_entries (id, category_id, question_id, quiz_session_id, user_answer, correct_answer, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entryData.category_id,
      entryData.question_id,
      entryData.quiz_session_id || null,
      entryData.user_answer,
      entryData.correct_answer,
      entryData.notes || ''
    );

    return this.getEntryById(id);
  }

  addBulkEntries(entries) {
    const stmt = db.prepare(`
      INSERT INTO notebook_entries (id, category_id, question_id, quiz_session_id, user_answer, correct_answer, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((entries) => {
      const results = [];
      for (const entry of entries) {
        const id = uuidv4();
        stmt.run(
          id,
          entry.category_id,
          entry.question_id,
          entry.quiz_session_id || null,
          entry.user_answer,
          entry.correct_answer,
          entry.notes || ''
        );
        results.push(id);
      }
      return results;
    });

    return insertMany(entries);
  }

  getEntryById(id) {
    const stmt = db.prepare(`
      SELECT ne.*, q.question_text, q.options, q.explanation
      FROM notebook_entries ne
      JOIN questions q ON ne.question_id = q.id
      WHERE ne.id = ?
    `);
    const entry = stmt.get(id);
    if (entry) {
      entry.options = JSON.parse(entry.options);
    }
    return entry;
  }

  getEntriesByCategory(categoryId, options = {}) {
    let query = `
      SELECT ne.*, q.question_text, q.options, q.explanation, q.difficulty
      FROM notebook_entries ne
      JOIN questions q ON ne.question_id = q.id
      WHERE ne.category_id = ?
    `;
    const params = [categoryId];

    if (options.reviewed !== undefined) {
      query += ' AND ne.reviewed = ?';
      params.push(options.reviewed ? 1 : 0);
    }

    query += ' ORDER BY ne.created_at DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = db.prepare(query);
    const entries = stmt.all(...params);

    return entries.map(e => ({
      ...e,
      options: JSON.parse(e.options)
    }));
  }

  updateEntry(id, updates) {
    const fields = [];
    const values = [];

    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.reviewed !== undefined) {
      fields.push('reviewed = ?');
      values.push(updates.reviewed ? 1 : 0);
    }

    if (fields.length === 0) return this.getEntryById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE notebook_entries SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getEntryById(id);
  }

  deleteEntry(id) {
    const stmt = db.prepare('DELETE FROM notebook_entries WHERE id = ?');
    return stmt.run(id);
  }

  markAsReviewed(id) {
    return this.updateEntry(id, { reviewed: true });
  }

  getNotebookStats(categoryId) {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_entries,
        SUM(CASE WHEN reviewed = 1 THEN 1 ELSE 0 END) as reviewed_entries,
        SUM(CASE WHEN reviewed = 0 THEN 1 ELSE 0 END) as unreviewed_entries
      FROM notebook_entries
      WHERE category_id = ?
    `);
    return stmt.get(categoryId);
  }

  // Get entries grouped by question for analysis
  getMostMissedQuestions(categoryId, limit = 10) {
    const stmt = db.prepare(`
      SELECT
        q.id,
        q.question_text,
        q.difficulty,
        COUNT(ne.id) as times_missed
      FROM notebook_entries ne
      JOIN questions q ON ne.question_id = q.id
      WHERE ne.category_id = ?
      GROUP BY q.id
      ORDER BY times_missed DESC
      LIMIT ?
    `);
    return stmt.all(categoryId, limit);
  }

  // Clear all entries for a category
  clearCategory(categoryId) {
    const stmt = db.prepare('DELETE FROM notebook_entries WHERE category_id = ?');
    return stmt.run(categoryId);
  }
}

module.exports = new NotebookService();
