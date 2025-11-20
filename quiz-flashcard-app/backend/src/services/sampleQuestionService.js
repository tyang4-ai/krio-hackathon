const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

class SampleQuestionService {
  addSampleQuestion(sampleData) {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO sample_questions (id, category_id, question_text, question_type, options, correct_answer, explanation, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      sampleData.category_id,
      sampleData.question_text,
      sampleData.question_type || 'multiple_choice',
      JSON.stringify(sampleData.options || []),
      sampleData.correct_answer,
      sampleData.explanation || null,
      JSON.stringify(sampleData.tags || [])
    );

    return this.getSampleQuestionById(id);
  }

  addBulkSampleQuestions(samples, categoryId) {
    const results = [];
    for (const s of samples) {
      const id = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO sample_questions (id, category_id, question_text, question_type, options, correct_answer, explanation, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        categoryId,
        s.question_text,
        s.question_type || 'multiple_choice',
        JSON.stringify(s.options || []),
        s.correct_answer,
        s.explanation || null,
        JSON.stringify(s.tags || [])
      );
      results.push(id);
    }
    return results;
  }

  getSampleQuestionById(id) {
    const stmt = db.prepare('SELECT * FROM sample_questions WHERE id = ?');
    const sample = stmt.get(id);
    if (sample) {
      sample.options = JSON.parse(sample.options);
      sample.tags = JSON.parse(sample.tags);
    }
    return sample;
  }

  getSampleQuestionsByCategory(categoryId) {
    const stmt = db.prepare('SELECT * FROM sample_questions WHERE category_id = ? ORDER BY created_at DESC');
    const samples = stmt.all(categoryId);

    return samples.map(s => ({
      ...s,
      options: JSON.parse(s.options),
      tags: JSON.parse(s.tags)
    }));
  }

  updateSampleQuestion(id, updates) {
    const fields = [];
    const values = [];

    if (updates.question_text !== undefined) {
      fields.push('question_text = ?');
      values.push(updates.question_text);
    }
    if (updates.question_type !== undefined) {
      fields.push('question_type = ?');
      values.push(updates.question_type);
    }
    if (updates.options !== undefined) {
      fields.push('options = ?');
      values.push(JSON.stringify(updates.options));
    }
    if (updates.correct_answer !== undefined) {
      fields.push('correct_answer = ?');
      values.push(updates.correct_answer);
    }
    if (updates.explanation !== undefined) {
      fields.push('explanation = ?');
      values.push(updates.explanation);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }

    if (fields.length === 0) return this.getSampleQuestionById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE sample_questions SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getSampleQuestionById(id);
  }

  deleteSampleQuestion(id) {
    const stmt = db.prepare('DELETE FROM sample_questions WHERE id = ?');
    return stmt.run(id);
  }

  getSampleQuestionCount(categoryId) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM sample_questions WHERE category_id = ?');
    const result = stmt.get(categoryId);
    return result.count;
  }

  // Get sample questions formatted for AI prompt
  getSampleQuestionsForAI(categoryId) {
    const samples = this.getSampleQuestionsByCategory(categoryId);
    return samples.map(s => ({
      question_text: s.question_text,
      question_type: s.question_type,
      options: s.options,
      correct_answer: s.correct_answer,
      explanation: s.explanation
    }));
  }
}

module.exports = new SampleQuestionService();
