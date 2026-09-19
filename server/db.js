import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'database.sqlite');
export const db = new Database(dbPath);

// Enable WAL mode for high performance concurrent reads and writes
db.pragma('journal_mode = WAL');

// Initialize schema
export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL, -- 'student', 'teacher', 'parent', 'admin'
      name TEXT NOT NULL,
      code TEXT,
      phone TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL, -- '10A1', '10A2', '11A1'
      grade_level INTEGER NOT NULL, -- 10, 11, 12
      academic_year TEXT NOT NULL,
      homeroom_teacher_id TEXT,
      FOREIGN KEY (homeroom_teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      class_id TEXT NOT NULL,
      parent_id TEXT,
      gpa REAL DEFAULT 0,
      class_rank TEXT,
      attendance_rate REAL DEFAULT 100,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (parent_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'quiz', -- 'quiz', 'essay', 'attachment'
      instructions TEXT,
      target_classes TEXT NOT NULL, -- JSON array string: ["10A1", "10A2"]
      due_date TEXT NOT NULL,
      due_time TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 45,
      grading_scale TEXT DEFAULT 'Thang 10 (Hệ số 1)',
      lock_after_due INTEGER DEFAULT 1,
      shuffle_questions INTEGER DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS assignment_questions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      question_order INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      points REAL DEFAULT 1.0,
      has_plot INTEGER DEFAULT 0,
      plot_data TEXT,
      options TEXT NOT NULL, -- JSON array of options: [{"id":"A","text":"...","isCorrect":true}]
      explanation TEXT,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted', -- 'in_progress', 'submitted', 'graded'
      score REAL,
      student_answers TEXT, -- JSON map
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      teacher_feedback TEXT,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id),
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      test_name TEXT NOT NULL,
      score REAL NOT NULL,
      max_score REAL DEFAULT 10,
      teacher_name TEXT NOT NULL,
      comment TEXT,
      graded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS student_competencies (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      proficiency_percent INTEGER NOT NULL,
      is_strength INTEGER NOT NULL DEFAULT 1,
      hint TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS tuition_invoices (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      period TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'paid'
      paid_at DATETIME,
      items TEXT NOT NULL, -- JSON array of [{label, amount}]
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      account_name TEXT NOT NULL,
      transfer_memo TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS school_notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL, -- 'teacher', 'school'
      tag TEXT,
      tag_type TEXT DEFAULT 'info',
      sender TEXT NOT NULL,
      can_confirm INTEGER DEFAULT 0,
      confirmed_by_users TEXT DEFAULT '[]', -- JSON array of user IDs
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_name TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      badge TEXT,
      badge_type TEXT DEFAULT 'neutral',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_tutor_messages (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      sender TEXT NOT NULL, -- 'ai', 'user'
      text TEXT,
      has_image INTEGER DEFAULT 0,
      image_caption TEXT,
      ocr_status TEXT,
      ai_content TEXT, -- JSON string of Socratic structure
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS study_resources (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL, -- 'pdf', 'video', 'exam'
      file_size TEXT,
      grade_level INTEGER NOT NULL,
      download_url TEXT,
      downloads_count INTEGER DEFAULT 0,
      uploaded_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('SQLite Schema initialized successfully.');
}
