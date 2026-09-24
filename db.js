import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'database.sqlite');

export const db = new Database(dbPath);

// Enable WAL mode for high performance concurrent reads and writes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
export function initSchema() {
  db.exec(`
    -- ========================================
    -- CORE: Người dùng & Phân quyền
    -- ========================================
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'parent', 'admin')),
      name TEXT NOT NULL,
      code TEXT,
      phone TEXT,
      avatar TEXT,
      must_change_password INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- HỌC VỤ: Môn học, Lớp, Phân công
    -- ========================================
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade_level INTEGER NOT NULL,
      academic_year TEXT NOT NULL,
      homeroom_teacher_id TEXT,
      max_students INTEGER DEFAULT 45,
      FOREIGN KEY (homeroom_teacher_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      class_id TEXT NOT NULL,
      parent_id TEXT,
      gpa REAL DEFAULT 0,
      class_rank TEXT,
      attendance_rate REAL DEFAULT 100,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS teacher_assignments (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(teacher_id, class_id, subject_id, academic_year)
    );

    -- ========================================
    -- GIẢNG DẠY: Bài tập, Câu hỏi, Nộp bài
    -- ========================================
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'quiz' CHECK(type IN ('quiz', 'essay', 'attachment')),
      instructions TEXT,
      target_classes TEXT NOT NULL,
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
      options TEXT NOT NULL,
      explanation TEXT,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('in_progress', 'submitted', 'graded')),
      score REAL,
      student_answers TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      teacher_feedback TEXT,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id),
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    -- ========================================
    -- ĐIỂM SỐ & NĂNG LỰC
    -- ========================================
    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      test_name TEXT NOT NULL,
      score REAL NOT NULL,
      max_score REAL DEFAULT 10,
      coefficient REAL DEFAULT 1.0,
      semester INTEGER DEFAULT 1,
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

    -- ========================================
    -- ĐIỂM DANH
    -- ========================================
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'present' CHECK(status IN ('present', 'absent', 'late', 'excused')),
      note TEXT,
      recorded_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (recorded_by) REFERENCES users(id),
      UNIQUE(student_id, date)
    );

    -- ========================================
    -- THỜI KHOÁ BIỂU
    -- ========================================
    CREATE TABLE IF NOT EXISTS timetable (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      subject_id TEXT,
      subject_name TEXT NOT NULL,
      teacher_id TEXT,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 2 AND 7),
      period INTEGER NOT NULL CHECK(period BETWEEN 1 AND 10),
      room TEXT,
      academic_year TEXT NOT NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (teacher_id) REFERENCES users(id),
      UNIQUE(class_id, day_of_week, period, academic_year)
    );

    -- ========================================
    -- TÀI CHÍNH: Học phí
    -- ========================================
    CREATE TABLE IF NOT EXISTS tuition_invoices (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      period TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'paid', 'overdue')),
      paid_at DATETIME,
      items TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      account_name TEXT NOT NULL,
      transfer_memo TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    -- ========================================
    -- THÔNG BÁO & GIAO TIẾP
    -- ========================================
    CREATE TABLE IF NOT EXISTS school_notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('teacher', 'school', 'system')),
      tag TEXT,
      tag_type TEXT DEFAULT 'info',
      sender TEXT NOT NULL,
      can_confirm INTEGER DEFAULT 0,
      confirmed_by_users TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      student_id TEXT,
      subject TEXT,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );

    -- ========================================
    -- ĐƠN XIN PHÉP
    -- ========================================
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      reviewed_by TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (parent_id) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );

    -- ========================================
    -- AI TUTOR
    -- ========================================
    CREATE TABLE IF NOT EXISTS ai_tutor_messages (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      sender TEXT NOT NULL CHECK(sender IN ('ai', 'user')),
      text TEXT,
      has_image INTEGER DEFAULT 0,
      image_caption TEXT,
      ocr_status TEXT,
      ai_content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    -- ========================================
    -- HỌC LIỆU
    -- ========================================
    CREATE TABLE IF NOT EXISTS study_resources (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('pdf', 'video', 'exam', 'slides')),
      file_size TEXT,
      grade_level INTEGER NOT NULL,
      download_url TEXT,
      downloads_count INTEGER DEFAULT 0,
      uploaded_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- AUDIT LOG
    -- ========================================
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_name TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      badge TEXT,
      badge_type TEXT DEFAULT 'neutral',
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (actor_id) REFERENCES users(id)
    );

    -- ========================================
    -- INDEXES for performance
    -- ========================================
    CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
    CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
    CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
    CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_student ON leave_requests(student_id);
    CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable(class_id, academic_year);
  `);
  console.log('SQLite Schema initialized (baseline tables)');

  // ── G25: Production Announcements ──────────────────────────────────────────
  // Use ALTER TABLE for existing tables (idempotent — ignores error if column exists).
  // This ensures new columns are added to any pre-existing database.

  // Core announcements table (add missing columns to existing table)
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      school_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      scope TEXT DEFAULT 'all' CHECK(scope IN ('all','student','teacher','parent','admin','class')),
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('normal','important','urgent')),
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
      class_id TEXT,
      subject_id TEXT,
      scheduled_publish_at DATETIME,
      published_at DATETIME,
      published_by TEXT,
      author_id TEXT,
      author_name TEXT,
      attachments TEXT DEFAULT '[]',
      target_roles TEXT,
      target_class_ids TEXT,
      category_id TEXT,
      is_active INTEGER DEFAULT 1,
      archived_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Add missing columns to existing announcements table (ignore errors if already present)
  try { db.exec("ALTER TABLE announcements ADD COLUMN status TEXT DEFAULT 'draft'"); } catch (_) {}
  try { db.exec("ALTER TABLE announcements ADD COLUMN scheduled_publish_at DATETIME"); } catch (_) {}
  try { db.exec("ALTER TABLE announcements ADD COLUMN archived_at DATETIME"); } catch (_) {}
  try { db.exec("ALTER TABLE announcements ADD COLUMN published_by TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE announcements ADD COLUMN target_roles TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE announcements ADD COLUMN target_class_ids TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE announcements ADD COLUMN author_name TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE announcements ADD COLUMN summary TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE announcements ADD COLUMN attachments TEXT DEFAULT '[]'"); } catch (_) {}
  try { db.exec("ALTER TABLE announcements ADD COLUMN category_id TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE announcements ADD COLUMN is_active INTEGER DEFAULT 1"); } catch (_) {}

  // Announcement reads tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcement_reads (
      id TEXT PRIMARY KEY,
      announcement_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(announcement_id, user_id)
    )
  `);

  // Announcement categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcement_categories (
      id TEXT PRIMARY KEY,
      school_id TEXT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#1C6FA8',
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default categories (idempotent)
  try {
    const catStmt = db.prepare(`
      INSERT OR IGNORE INTO announcement_categories
        (id, school_id, name, color, icon, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const cats = [
      ['cat_general', 'sch_bacau', 'Thong bao chung', '#1C6FA8', 'megaphone', 1],
      ['cat_academic', 'sch_bacau', 'Hoc vu', '#2E8B57', 'book-open', 2],
      ['cat_event', 'sch_bacau', 'Su kien', '#9333EA', 'calendar', 3],
      ['cat_urgent', 'sch_bacau', 'Khan cap', '#DC2626', 'alert-triangle', 4],
      ['cat_parent', 'sch_bacau', 'Phu huynh', '#D97706', 'users', 5],
    ];
    for (const cat of cats) catStmt.run(...cat);
  } catch (_) {}

  // Indexes for announcements
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_ann_status ON announcements(status)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_ann_status_school ON announcements(status, school_id)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_ann_school_scope ON announcements(school_id, scope)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_ann_published ON announcements(published_at DESC)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_reads_user_ann ON announcement_reads(user_id, announcement_id)"); } catch (_) {}

  // ── G24: Parent-Student Links ─────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS parent_student_links (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      relationship TEXT NOT NULL,
      is_primary_contact INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      verified_at DATETIME,
      verified_by TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE(parent_id, student_id)
    )
  `);
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent ON parent_student_links(parent_id, is_active)"); } catch (_) {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_parent_student_links_student ON parent_student_links(student_id, is_active)"); } catch (_) {}

  // Seed sample announcements
  const schoolId = 'sch_bacau';
  const sampleAnn = db.prepare(`
    INSERT OR IGNORE INTO announcements
      (id, school_id, title, content, scope, priority, status, author_name, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  try {
    sampleAnn.run('ann_seed_001', schoolId,
      'Chao mung nam hoc 2024-2025',
      'Truong THPT Nguyen Viet Xuan chao muc nam hoc moi 2024-2025. Tat ca hoc sinh can co mat luc 7h00 ngay 01/09/2024.',
      'all', 'important', 'published', 'Hieu truong', now);
    sampleAnn.run('ann_seed_002', schoolId,
      'Lich thi giua ky HK1',
      'Lich thi giua ky hoc ky I nam hoc 2024-2025. Chi tiet xem tai phong giao vu.',
      'student', 'urgent', 'published', 'Giao vu', now);
    sampleAnn.run('ann_seed_003', schoolId,
      'Hop phu huynh cuoi nam',
      'Truong to chuc hop phu huynh cuoi nam hoc vao ngay 25/05/2025. Quy phu huynh vui long sac mat tham du.',
      'parent', 'normal', 'published', 'Hieu truong', now);
  } catch (_) {}

  console.log('G25 Production Announcements tables initialized');
}

// Initialize database
initSchema();

export default db;
