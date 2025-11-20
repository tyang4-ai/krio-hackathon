const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

class DocumentService {
  async processDocument(filePath, fileType) {
    let content = '';

    try {
      switch (fileType.toLowerCase()) {
        case 'pdf':
          content = await this.extractPdfText(filePath);
          break;
        case 'docx':
        case 'doc':
          content = await this.extractWordText(filePath);
          break;
        case 'txt':
        case 'md':
          content = fs.readFileSync(filePath, 'utf-8');
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      return content;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  async extractPdfText(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  async extractWordText(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  saveDocument(categoryId, file, storagePath, contentText = null) {
    const id = uuidv4();
    const fileExtension = path.extname(file.originalname).substring(1);

    const stmt = db.prepare(`
      INSERT INTO documents (id, category_id, filename, original_name, file_type, file_size, storage_path, content_text, processed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      categoryId,
      file.filename,
      file.originalname,
      fileExtension,
      file.size,
      storagePath,
      contentText,
      contentText ? 1 : 0
    );

    return this.getDocumentById(id);
  }

  getDocumentById(id) {
    const stmt = db.prepare('SELECT * FROM documents WHERE id = ?');
    return stmt.get(id);
  }

  getDocumentsByCategory(categoryId) {
    const stmt = db.prepare('SELECT * FROM documents WHERE category_id = ? ORDER BY created_at DESC');
    return stmt.all(categoryId);
  }

  updateDocumentContent(id, contentText) {
    const stmt = db.prepare(`
      UPDATE documents SET content_text = ?, processed = 1 WHERE id = ?
    `);
    stmt.run(contentText, id);
    return this.getDocumentById(id);
  }

  deleteDocument(id) {
    const doc = this.getDocumentById(id);
    if (doc) {
      // Delete file from storage
      if (fs.existsSync(doc.storage_path)) {
        fs.unlinkSync(doc.storage_path);
      }

      const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
      stmt.run(id);
    }
    return doc;
  }

  getCombinedContentForCategory(categoryId) {
    const stmt = db.prepare(`
      SELECT content_text FROM documents
      WHERE category_id = ? AND processed = 1 AND content_text IS NOT NULL
    `);
    const documents = stmt.all(categoryId);
    return documents.map(d => d.content_text).join('\n\n---\n\n');
  }
}

module.exports = new DocumentService();
