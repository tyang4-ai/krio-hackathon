const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/quiz_flashcard.db');

let db = null;
let SQL = null;

// Initialize database
async function initializeDatabase() {
  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize SQL.js
  SQL = await initSqlJs();

  // Load existing database or create new one
  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
  } catch (error) {
    console.error('Error loading database, creating new one:', error);
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3B82F6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Documents table
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      storage_path TEXT NOT NULL,
      content_text TEXT,
      processed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Questions table (question bank)
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      document_id TEXT,
      question_text TEXT NOT NULL,
      question_type TEXT DEFAULT 'multiple_choice',
      difficulty TEXT DEFAULT 'medium',
      options TEXT,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
    )
  `);

  // Flashcards table
  db.run(`
    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      document_id TEXT,
      front_text TEXT NOT NULL,
      back_text TEXT NOT NULL,
      difficulty TEXT DEFAULT 'medium',
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
    )
  `);

  // Quiz sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      settings TEXT NOT NULL,
      questions TEXT NOT NULL,
      answers TEXT,
      score INTEGER,
      total_questions INTEGER,
      completed BOOLEAN DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Notebook entries (wrong answers)
  db.run(`
    CREATE TABLE IF NOT EXISTS notebook_entries (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      quiz_session_id TEXT,
      user_answer TEXT,
      correct_answer TEXT NOT NULL,
      notes TEXT,
      reviewed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (quiz_session_id) REFERENCES quiz_sessions(id) ON DELETE SET NULL
    )
  `);

  // Flashcard progress tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS flashcard_progress (
      id TEXT PRIMARY KEY,
      flashcard_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      confidence_level INTEGER DEFAULT 0,
      times_reviewed INTEGER DEFAULT 0,
      last_reviewed DATETIME,
      next_review DATETIME,
      FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Sample questions table (for AI to learn question style)
  db.run(`
    CREATE TABLE IF NOT EXISTS sample_questions (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT DEFAULT 'multiple_choice',
      options TEXT,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Save database to file
  saveDatabase();

  console.log('Database initialized successfully');
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Database wrapper to provide better-sqlite3-like interface
const dbWrapper = {
  prepare: (sql) => {
    return {
      run: (...params) => {
        try {
          const stmt = db.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
          stmt.step();
          stmt.free();
          saveDatabase();
          return { changes: db.getRowsModified() };
        } catch (error) {
          console.error('SQL Error in run:', error.message, 'SQL:', sql);
          throw error;
        }
      },
      get: (...params) => {
        try {
          const stmt = db.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
          let row = undefined;
          if (stmt.step()) {
            row = stmt.getAsObject();
          }
          stmt.free();
          return row;
        } catch (error) {
          console.error('SQL Error in get:', error.message, 'SQL:', sql);
          throw error;
        }
      },
      all: (...params) => {
        try {
          const results = [];
          const stmt = db.prepare(sql);
          if (params.length > 0) {
            stmt.bind(params);
          }
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (error) {
          console.error('SQL Error in all:', error.message, 'SQL:', sql);
          throw error;
        }
      }
    };
  },
  exec: (sql) => {
    db.run(sql);
    saveDatabase();
  },
  transaction: (fn) => {
    // For sql.js, we'll just execute the function without explicit transactions
    // since each operation auto-saves. This provides a compatible interface.
    return (...args) => {
      const result = fn(...args);
      saveDatabase();
      return result;
    };
  },
  pragma: (pragma) => {
    db.run(`PRAGMA ${pragma}`);
  },
  getRowsModified: () => db.getRowsModified()
};

module.exports = { db: dbWrapper, initializeDatabase, saveDatabase };
