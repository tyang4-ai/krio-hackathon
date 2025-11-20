const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/quiz_flashcard.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database tables
function initializeDatabase() {
  // Categories table
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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
  db.exec(`
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

  console.log('Database initialized successfully');
}

module.exports = { db, initializeDatabase };
