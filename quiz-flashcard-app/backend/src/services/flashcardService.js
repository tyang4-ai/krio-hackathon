const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

class FlashcardService {
  addFlashcard(flashcardData) {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO flashcards (id, category_id, document_id, front_text, back_text, difficulty, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      flashcardData.category_id,
      flashcardData.document_id || null,
      flashcardData.front_text,
      flashcardData.back_text,
      flashcardData.difficulty || 'medium',
      JSON.stringify(flashcardData.tags || [])
    );

    return this.getFlashcardById(id);
  }

  addBulkFlashcards(flashcards, categoryId, documentId = null) {
    const stmt = db.prepare(`
      INSERT INTO flashcards (id, category_id, document_id, front_text, back_text, difficulty, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((flashcards) => {
      const results = [];
      for (const f of flashcards) {
        const id = uuidv4();
        stmt.run(
          id,
          categoryId,
          documentId,
          f.front_text,
          f.back_text,
          f.difficulty || 'medium',
          JSON.stringify(f.tags || [])
        );
        results.push(id);
      }
      return results;
    });

    return insertMany(flashcards);
  }

  getFlashcardById(id) {
    const stmt = db.prepare('SELECT * FROM flashcards WHERE id = ?');
    const flashcard = stmt.get(id);
    if (flashcard) {
      flashcard.tags = JSON.parse(flashcard.tags);
    }
    return flashcard;
  }

  getFlashcardsByCategory(categoryId, options = {}) {
    let query = 'SELECT * FROM flashcards WHERE category_id = ?';
    const params = [categoryId];

    if (options.difficulty) {
      query += ' AND difficulty = ?';
      params.push(options.difficulty);
    }

    query += ' ORDER BY created_at DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = db.prepare(query);
    const flashcards = stmt.all(...params);

    return flashcards.map(f => ({
      ...f,
      tags: JSON.parse(f.tags)
    }));
  }

  updateFlashcard(id, updates) {
    const fields = [];
    const values = [];

    if (updates.front_text !== undefined) {
      fields.push('front_text = ?');
      values.push(updates.front_text);
    }
    if (updates.back_text !== undefined) {
      fields.push('back_text = ?');
      values.push(updates.back_text);
    }
    if (updates.difficulty !== undefined) {
      fields.push('difficulty = ?');
      values.push(updates.difficulty);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }

    if (fields.length === 0) return this.getFlashcardById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE flashcards SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getFlashcardById(id);
  }

  deleteFlashcard(id) {
    const stmt = db.prepare('DELETE FROM flashcards WHERE id = ?');
    return stmt.run(id);
  }

  // Progress tracking
  updateProgress(flashcardId, categoryId, confidence) {
    const existingStmt = db.prepare('SELECT * FROM flashcard_progress WHERE flashcard_id = ?');
    const existing = existingStmt.get(flashcardId);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE flashcard_progress
        SET confidence_level = ?, times_reviewed = times_reviewed + 1, last_reviewed = CURRENT_TIMESTAMP,
            next_review = datetime('now', '+' || ? || ' days')
        WHERE flashcard_id = ?
      `);

      // Spaced repetition: higher confidence = longer interval
      const daysUntilNext = Math.pow(2, confidence);
      stmt.run(confidence, daysUntilNext, flashcardId);
    } else {
      const id = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO flashcard_progress (id, flashcard_id, category_id, confidence_level, times_reviewed, last_reviewed, next_review)
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, datetime('now', '+' || ? || ' days'))
      `);

      const daysUntilNext = Math.pow(2, confidence);
      stmt.run(id, flashcardId, categoryId, confidence, daysUntilNext);
    }
  }

  getFlashcardsForReview(categoryId) {
    const stmt = db.prepare(`
      SELECT f.*, fp.confidence_level, fp.times_reviewed, fp.last_reviewed
      FROM flashcards f
      LEFT JOIN flashcard_progress fp ON f.id = fp.flashcard_id
      WHERE f.category_id = ?
        AND (fp.next_review IS NULL OR fp.next_review <= datetime('now'))
      ORDER BY fp.confidence_level ASC NULLS FIRST, RANDOM()
    `);

    const flashcards = stmt.all(categoryId);

    return flashcards.map(f => ({
      ...f,
      tags: JSON.parse(f.tags)
    }));
  }

  getFlashcardStats(categoryId) {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN difficulty = 'easy' THEN 1 ELSE 0 END) as easy,
        SUM(CASE WHEN difficulty = 'medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN difficulty = 'hard' THEN 1 ELSE 0 END) as hard
      FROM flashcards
      WHERE category_id = ?
    `);
    return stmt.get(categoryId);
  }

  getStudyProgress(categoryId) {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_cards,
        SUM(CASE WHEN fp.times_reviewed > 0 THEN 1 ELSE 0 END) as reviewed_cards,
        AVG(fp.confidence_level) as avg_confidence
      FROM flashcards f
      LEFT JOIN flashcard_progress fp ON f.id = fp.flashcard_id
      WHERE f.category_id = ?
    `);
    return stmt.get(categoryId);
  }
}

module.exports = new FlashcardService();
