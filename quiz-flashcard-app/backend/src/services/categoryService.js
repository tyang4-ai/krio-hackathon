const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

class CategoryService {
  createCategory(name, description = '', color = '#3B82F6') {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO categories (id, name, description, color)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, name, description, color);
    return this.getCategoryById(id);
  }

  getCategoryById(id) {
    const stmt = db.prepare('SELECT * FROM categories WHERE id = ?');
    return stmt.get(id);
  }

  getAllCategories() {
    const stmt = db.prepare('SELECT * FROM categories ORDER BY created_at DESC');
    return stmt.all();
  }

  updateCategory(id, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    if (fields.length === 1) return this.getCategoryById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getCategoryById(id);
  }

  deleteCategory(id) {
    const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
    return stmt.run(id);
  }

  getCategoryStats(id) {
    const questionsStmt = db.prepare('SELECT COUNT(*) as count FROM questions WHERE category_id = ?');
    const flashcardsStmt = db.prepare('SELECT COUNT(*) as count FROM flashcards WHERE category_id = ?');
    const documentsStmt = db.prepare('SELECT COUNT(*) as count FROM documents WHERE category_id = ?');
    const notebookStmt = db.prepare('SELECT COUNT(*) as count FROM notebook_entries WHERE category_id = ?');

    return {
      questions: questionsStmt.get(id).count,
      flashcards: flashcardsStmt.get(id).count,
      documents: documentsStmt.get(id).count,
      notebook_entries: notebookStmt.get(id).count
    };
  }

  getCategoryWithStats(id) {
    const category = this.getCategoryById(id);
    if (!category) return null;

    return {
      ...category,
      stats: this.getCategoryStats(id)
    };
  }

  getAllCategoriesWithStats() {
    const categories = this.getAllCategories();
    return categories.map(cat => ({
      ...cat,
      stats: this.getCategoryStats(cat.id)
    }));
  }
}

module.exports = new CategoryService();
