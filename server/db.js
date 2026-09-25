import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ':memory:' is a SQLite sentinel — pass it directly without path resolution
const dbPath = process.env.DB_PATH
  ? (process.env.DB_PATH === ':memory:'
      ? ':memory:'
      : path.resolve(process.env.DB_PATH))
  : path.join(__dirname, '..', 'database.sqlite');

export const db = new Database(dbPath);

// Enable WAL mode for high performance concurrent reads and writes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
export function initSchema() {
  db.exec(`
    -- ========================================
    -- CORE: Trường học đa tenant
    -- ========================================
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      short_name TEXT,
      address TEXT,
      district TEXT,
      ward TEXT,
      province TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      logo_url TEXT,
      principal_name TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
      school_id TEXT,
      status TEXT DEFAULT 'active',
      must_change_password INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      token_version INTEGER DEFAULT 1,
      password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
    );

    -- ========================================
    -- PROFILES: Giáo viên, Phụ huynh
    -- ========================================
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      school_id TEXT,
      department_id TEXT,
      homeroom_class_id TEXT,
      specialty TEXT,
      degree TEXT,
      employee_id TEXT,
      subjects TEXT,
      status TEXT DEFAULT 'active',
      hire_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS parents (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      school_id TEXT,
      occupation TEXT,
      workplace TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
    );

    -- ========================================
    -- HỌC VỤ: Môn học, Lớp, Niên khóa, Học kỳ
    -- ========================================
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      school_id TEXT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      department TEXT,
      department_id TEXT,
      grade_level TEXT,
      grade_levels TEXT,
      weekly_periods INTEGER,
      credits INTEGER,
      status TEXT DEFAULT 'active',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade_level INTEGER NOT NULL,
      academic_year TEXT NOT NULL,
      academic_year_id TEXT,
      school_id TEXT,
      homeroom_teacher_id TEXT,
      max_students INTEGER DEFAULT 45,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (homeroom_teacher_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS academic_years (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      name TEXT NOT NULL,
      start_date DATE,
      end_date DATE,
      is_current INTEGER DEFAULT 0,
      semester_number INTEGER DEFAULT 2,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS semesters (
      id TEXT PRIMARY KEY,
      academic_year_id TEXT NOT NULL,
      school_id TEXT NOT NULL,
      name TEXT NOT NULL,
      semester_number INTEGER DEFAULT 1,
      start_date DATE,
      end_date DATE,
      is_current INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      school_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      code TEXT,
      head_teacher_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
    );

    -- ========================================
    -- ENROLLMENT: Ghi danh học sinh
    -- ========================================
    CREATE TABLE IF NOT EXISTS class_enrollments (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      academic_year_id TEXT,
      enrollment_date DATE DEFAULT CURRENT_DATE,
      start_date DATE,
      end_date DATE,
      reason TEXT,
      notes TEXT,
      status TEXT DEFAULT 'enrolled',
      is_current INTEGER DEFAULT 1,
      school_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      class_id TEXT,
      school_id TEXT,
      current_class_id TEXT,
      student_code TEXT,
      parent_id TEXT,
      grade_level INTEGER,
      gpa REAL DEFAULT 0,
      class_rank TEXT,
      total_students INTEGER DEFAULT 38,
      attendance_rate REAL DEFAULT 100,
      dob TEXT,
      gender TEXT DEFAULT 'male',
      address TEXT,
      enrollment_status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS parent_students (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      relationship TEXT,
      is_primary_contact INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- ========================================
    -- PHÂN CÔNG GIẢNG DẠY
    -- ========================================
    CREATE TABLE IF NOT EXISTS teacher_assignments (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      academic_year_id TEXT,
      semester_id TEXT,
      school_id TEXT,
      role TEXT DEFAULT 'subject',
      status TEXT DEFAULT 'active',
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
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
      school_id TEXT,
      semester_id TEXT,
      academic_year_id TEXT,
      status TEXT DEFAULT 'draft',
      total_score REAL DEFAULT 10,
      teacher_feedback TEXT,
      allow_resubmit INTEGER DEFAULT 0,
      max_resubmit_count INTEGER DEFAULT 3,
      published_at DATETIME,
      updated_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS assignment_questions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      question_order INTEGER NOT NULL,
      question_type TEXT DEFAULT 'multiple_choice',
      prompt TEXT NOT NULL,
      points REAL DEFAULT 1.0,
      max_score REAL,
      correct_answer TEXT,
      has_plot INTEGER DEFAULT 0,
      plot_data TEXT,
      options TEXT NOT NULL,
      explanation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      is_late INTEGER DEFAULT 0,
      draft_answers TEXT,
      updated_at DATETIME,
      resubmit_count INTEGER DEFAULT 0,
      is_final INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
      status TEXT DEFAULT 'draft',
      published_at DATETIME,
      published_by TEXT,
      school_id TEXT,
      academic_year_id TEXT,
      semester_id TEXT,
      raw_score REAL,
      subject_id TEXT,
      assignment_id TEXT,
      class_id TEXT,
      grade_category_id TEXT,
      teacher_feedback TEXT,
      locked_at DATETIME,
      locked_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
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
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id TEXT PRIMARY KEY,
      school_id TEXT,
      class_id TEXT NOT NULL,
      subject_id TEXT,
      teacher_id TEXT NOT NULL,
      date TEXT NOT NULL,
      period INTEGER NOT NULL,
      session_type TEXT DEFAULT 'daily',
      status TEXT DEFAULT 'active',
      semester_id TEXT,
      notes TEXT,
      recorded_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'present' CHECK(status IN ('present', 'absent', 'late', 'excused')),
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

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
      school_id TEXT,
      class_id TEXT NOT NULL,
      subject_id TEXT,
      subject_name TEXT NOT NULL,
      teacher_id TEXT,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7),
      period INTEGER NOT NULL CHECK(period BETWEEN 1 AND 10),
      start_time TEXT,
      end_time TEXT,
      room TEXT,
      academic_year TEXT NOT NULL,
      semester_id TEXT,
      academic_year_id TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- ========================================
    -- TÀI CHÍNH: Học phí
    -- ========================================
    CREATE TABLE IF NOT EXISTS tuition_invoices (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      school_id TEXT,
      academic_year_id TEXT,
      semester_id TEXT,
      invoice_number TEXT,
      billing_period TEXT,
      period TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','unpaid','partial','paid','overdue','cancelled','waived','refunded')),
      payment_reference TEXT,
      issued_at DATETIME,
      paid_at DATETIME,
      cancelled_at DATETIME,
      cancelled_by TEXT,
      cancellation_reason TEXT,
      notes TEXT,
      items TEXT DEFAULT '[]',
      bank_name TEXT,
      account_number TEXT,
      account_name TEXT,
      transfer_memo TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS invoice_line_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      quantity REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL,
      amount TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES tuition_invoices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tuition_payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT,
      transaction_reference TEXT,
      paid_by TEXT,
      paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'completed',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES tuition_invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (paid_by) REFERENCES users(id)
    );

    -- ========================================
    -- THÔNG BÁO & GIAO TIẾP
    -- ========================================
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      school_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      scope TEXT DEFAULT 'all',
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'draft',
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS announcement_reads (
      id TEXT PRIMARY KEY,
      announcement_id TEXT,
      user_id TEXT,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      content TEXT,
      link TEXT,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      student_id TEXT,
      parent_id TEXT,
      subject TEXT,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS parent_student_links (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      relationship TEXT,
      is_primary_contact INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS school_notices (
      id TEXT PRIMARY KEY,
      school_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      notice_type TEXT DEFAULT 'info',
      category TEXT DEFAULT 'school',
      tag TEXT,
      tag_type TEXT,
      sender TEXT,
      can_confirm INTEGER DEFAULT 0,
      confirmed_by_users TEXT DEFAULT '[]',
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'draft',
      published_at DATETIME,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS message_conversations (
      id TEXT PRIMARY KEY,
      participant_ids TEXT NOT NULL,
      student_id TEXT,
      teacher_id TEXT,
      parent_id TEXT,
      status TEXT DEFAULT 'active',
      last_message_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS parent_teacher_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      sender_id TEXT,
      receiver_id TEXT,
      student_id TEXT,
      parent_id TEXT,
      sender_role TEXT,
      sender_name TEXT,
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
      school_id TEXT,
      academic_year_id TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason_type TEXT,
      reason_detail TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      emergency_phone TEXT,
      review_note TEXT,
      cancellation_reason TEXT,
      reviewed_by TEXT,
      reviewed_at DATETIME,
      updated_at DATETIME,
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
      actor_name TEXT,
      role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      school_id TEXT,
      severity TEXT,
      badge TEXT,
      badge_type TEXT DEFAULT 'neutral',
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (actor_id) REFERENCES users(id)
    );

    -- ========================================
    -- PAYMENT WEBHOOKS
    -- ========================================
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id TEXT PRIMARY KEY,
      event TEXT,
      payload TEXT,
      processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS payment_idempotency (
      id TEXT PRIMARY KEY,
      transaction_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ========================================
    -- AUTH: Refresh Tokens & Password Resets
    -- ========================================
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      family_id TEXT,
      is_revoked INTEGER DEFAULT 0,
      expires_at DATETIME NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ========================================
    -- INDEXES for performance
    -- ========================================
    CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
    CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
    CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
    CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
    CREATE INDEX IF NOT EXISTS idx_grades_school ON grades(school_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
    CREATE INDEX IF NOT EXISTS idx_assignments_school ON assignments(school_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_student ON leave_requests(student_id);
    CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable(class_id, academic_year);
    CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable(teacher_id, academic_year);
    CREATE INDEX IF NOT EXISTS idx_tuition_student ON tuition_invoices(student_id);
    CREATE INDEX IF NOT EXISTS idx_tuition_status ON tuition_invoices(status);
    CREATE INDEX IF NOT EXISTS idx_announcements_school ON announcements(school_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_class_enrollments_student ON class_enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);
    CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON parent_students(parent_id);
    CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class ON attendance_sessions(class_id, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);
    -- Auth-specific indexes for fast login queries
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_code ON users(code);
    CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
    CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year_id);
    CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

    -- ========================================
    -- Individual column migrations for existing DB files
    -- ========================================
  `);

  const addCol = (table, colDef) => { try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef}`); } catch (_) {} };
  const createTable = (sql) => { try { db.exec(sql); } catch (_) {} };

  // Users: security columns
  addCol('users', 'failed_login_attempts INTEGER DEFAULT 0');
  addCol('users', 'locked_until DATETIME');
  addCol('users', 'school_id TEXT');
  addCol('users', 'status TEXT DEFAULT \'active\'');
  addCol('users', 'token_version INTEGER DEFAULT 1');
  addCol('users', 'password_changed_at DATETIME');
    addCol('classes', 'school_id TEXT');
    addCol('classes', 'status TEXT DEFAULT \'active\'');
    addCol('classes', 'academic_year_id TEXT');
    addCol('classes', 'grade_level_id TEXT');
  addCol('subjects', 'school_id TEXT');
  addCol('subjects', 'grade_levels TEXT');
  addCol('subjects', 'is_active INTEGER DEFAULT 1');
  addCol('assignments', 'school_id TEXT');
  addCol('assignments', 'semester_id TEXT');
  addCol('assignments', 'academic_year_id TEXT');
  addCol('assignments', 'status TEXT DEFAULT \'draft\'');
  addCol('assignments', 'total_score REAL DEFAULT 10');
  addCol('assignments', 'teacher_feedback TEXT');
  addCol('grades', 'status TEXT DEFAULT \'draft\'');
  addCol('grades', 'published_at DATETIME');
  addCol('grades', 'published_by TEXT');
  addCol('grades', 'school_id TEXT');
  addCol('grades', 'academic_year_id TEXT');
  addCol('grades', 'semester_id TEXT');
  addCol('grades', 'raw_score REAL');
  addCol('grades', 'subject_id TEXT');
  addCol('grades', 'assignment_id TEXT');
  addCol('grades', 'class_id TEXT');
  addCol('grades', 'teacher_feedback TEXT');
  addCol('grades', 'locked_at TEXT');
  addCol('grades', 'locked_by TEXT');
  addCol('timetable', 'school_id TEXT');
  addCol('timetable', 'created_at TEXT');
  addCol('timetable', 'updated_at TEXT');
  addCol('timetable', 'start_time TEXT');
  addCol('timetable', 'end_time TEXT');
  addCol('timetable', 'semester_id TEXT');
  addCol('timetable', 'academic_year_id TEXT');
  addCol('timetable', 'status TEXT DEFAULT \'active\'');
  addCol('messages', 'subject TEXT');
  addCol('leave_requests', 'reason_type TEXT');
  addCol('leave_requests', 'reason_detail TEXT');
  addCol('leave_requests', 'emergency_phone TEXT');
  addCol('teacher_assignments', 'school_id TEXT');
  addCol('teacher_assignments', 'status TEXT DEFAULT \'active\'');
  addCol('students', 'school_id TEXT');
  addCol('students', 'current_class_id TEXT');
  addCol('students', 'student_code TEXT');
  addCol('students', 'dob TEXT');
  addCol('students', 'gender TEXT DEFAULT \'male\'');
  addCol('students', 'enrollment_status TEXT DEFAULT \'active\'');
  addCol('tuition_invoices', 'school_id TEXT');
  addCol('tuition_invoices', 'academic_year_id TEXT');
  addCol('tuition_invoices', 'semester_id TEXT');
  addCol('tuition_invoices', 'period TEXT');
  addCol('tuition_invoices', 'total_amount REAL NOT NULL DEFAULT 0');
  addCol('tuition_invoices', 'items TEXT DEFAULT \'[]\'');
  addCol('tuition_invoices', 'bank_name TEXT');
  addCol('tuition_invoices', 'account_number TEXT');
  addCol('tuition_invoices', 'account_name TEXT');
  addCol('tuition_invoices', 'transfer_memo TEXT');
  // Teacher: homeroom class tracking
  addCol('teachers', 'homeroom_class_id TEXT');
  // Class: room
  addCol('classes', 'room TEXT');
  // Attendance records: updated_at for parent attendance history
  addCol('attendance_records', 'updated_at DATETIME');
  // Parent student links: parent_id (may not exist in old schema)
  addCol('parent_student_links', 'parent_id TEXT');
  addCol('parent_student_links', 'is_verified INTEGER DEFAULT 0');
  addCol('parent_student_links', 'is_primary_contact INTEGER DEFAULT 0');
  addCol('parent_student_links', 'is_active INTEGER DEFAULT 1');
  addCol('parent_student_links', 'relationship TEXT');
  addCol('parent_student_links', 'created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  // School notices: category column
  addCol('school_notices', 'category TEXT');
  // Teachers: missing columns
  addCol('teachers', 'homeroom_class_id TEXT');
  addCol('teachers', 'employee_id TEXT');
  addCol('teachers', 'specialty TEXT');
  addCol('teachers', 'degree TEXT');
  // Classes: room
  addCol('classes', 'room TEXT');
  addCol('classes', 'max_students INTEGER DEFAULT 45');
  // Students: max_students (if missing)
  addCol('students', 'max_students INTEGER DEFAULT 45');
  // Students: grade_level (if missing)
  addCol('students', 'grade_level INTEGER');
  addCol('students', 'total_students INTEGER DEFAULT 38');
  // Students: parent_id for direct parent reference
  addCol('students', 'parent_id TEXT');
  // Parent students: extra columns
  addCol('parent_students', 'is_active INTEGER DEFAULT 1');
  addCol('parent_students', 'created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  // Attendance records: updated_at
  addCol('attendance_records', 'updated_at DATETIME');
  // Attendance sessions: session_type
  addCol('attendance_sessions', 'session_type TEXT DEFAULT \'daily\'');
  addCol('attendance_sessions', 'school_id TEXT');
  addCol('attendance_sessions', 'semester_id TEXT');
  addCol('attendance_sessions', 'notes TEXT');
  addCol('attendance_sessions', 'recorded_by TEXT');
  addCol('attendance_sessions', 'updated_at DATETIME');
  // Announcements: sender_id alias for author_id
  addCol('announcements', 'sender_id TEXT');
  addCol('announcements', 'sender_name TEXT');
  // G39: Emergency broadcast columns
  addCol('announcements', 'is_emergency INTEGER DEFAULT 0');
  addCol('announcements', 'requires_acknowledgment INTEGER DEFAULT 0');
  // Schools: short_name
  addCol('schools', 'short_name TEXT');
  // Create announcement_categories table
  createTable(`CREATE TABLE IF NOT EXISTS announcement_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // Create grade_categories table
  createTable(`CREATE TABLE IF NOT EXISTS grade_categories (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    weight REAL NOT NULL,
    academic_year_id TEXT,
    semester_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // Subjects: department_id
  addCol('subjects', 'department_id TEXT');
  // Classes: max_capacity
  addCol('classes', 'max_capacity INTEGER DEFAULT 45');
  // Assignments: allow_resubmit, published_at
  addCol('assignments', 'allow_resubmit INTEGER DEFAULT 0');
  addCol('assignments', 'published_at DATETIME');
  // Leave requests: school_id
  addCol('leave_requests', 'school_id TEXT');
  // Notifications: read_at
  addCol('notifications', 'read_at DATETIME');
  // Message conversations: teacher_id
  addCol('message_conversations', 'teacher_id TEXT');
  // Parent teacher messages: parent_id
  addCol('parent_teacher_messages', 'parent_id TEXT');
  // Create invoice_line_items table
  createTable(`CREATE TABLE IF NOT EXISTS invoice_line_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    label TEXT,
    description TEXT,
    quantity REAL DEFAULT 1,
    unit_price REAL,
    amount REAL NOT NULL,
    discount REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // Create payment_transactions table
  createTable(`CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY,
    invoice_id TEXT,
    amount REAL NOT NULL,
    method TEXT,
    status TEXT DEFAULT 'pending',
    transaction_id TEXT,
    webhook_id TEXT,
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // Audit logs: school_id
  addCol('audit_logs', 'school_id TEXT');
  // Dashboard metrics: school_id
  addCol('dashboard_metrics', 'school_id TEXT');
  // Academic years: semester_number
  addCol('academic_years', 'semester_number INTEGER DEFAULT 2');
  // Semesters: semester_number
  addCol('semesters', 'semester_number INTEGER DEFAULT 1');
  // Departments: description, updated_at
  addCol('departments', 'description TEXT');
  addCol('departments', 'updated_at DATETIME');
  // Schools: province, district, ward
  addCol('schools', 'province TEXT');
  addCol('schools', 'district TEXT');
  addCol('schools', 'ward TEXT');
  // Students: address, updated_at
  addCol('students', 'address TEXT');
  addCol('students', 'updated_at DATETIME');
  // Subjects: department_id, grade_level, weekly_periods, credits
  addCol('subjects', 'department_id TEXT');
  addCol('subjects', 'grade_level TEXT');
  addCol('subjects', 'weekly_periods INTEGER');
  addCol('subjects', 'credits INTEGER');
  // Class enrollments: reason, notes, updated_at, start_date
  addCol('class_enrollments', 'reason TEXT');
  addCol('class_enrollments', 'notes TEXT');
  addCol('class_enrollments', 'updated_at DATETIME');
  addCol('class_enrollments', 'start_date DATE');
  addCol('class_enrollments', 'end_date DATE');
  addCol('class_enrollments', 'academic_year_id TEXT');
  // Messages: parent_id
  addCol('messages', 'parent_id TEXT');
  // Assignments: allow_resubmit, max_resubmit_count, published_at, updated_at
  addCol('assignments', 'allow_resubmit INTEGER DEFAULT 0');
  addCol('assignments', 'max_resubmit_count INTEGER DEFAULT 3');
  addCol('assignments', 'published_at DATETIME');
  addCol('assignments', 'updated_at DATETIME');
  // Assignment questions: question_type, max_score
  addCol('assignment_questions', 'question_type TEXT DEFAULT \'multiple_choice\'');
  addCol('assignment_questions', 'max_score REAL');
  // Leave requests: school_id, academic_year_id
  addCol('leave_requests', 'school_id TEXT');
  addCol('leave_requests', 'academic_year_id TEXT');
  // Notifications: read_at
  addCol('notifications', 'read_at DATETIME');
  // Message conversations: teacher_id, status
  addCol('message_conversations', 'teacher_id TEXT');
  addCol('message_conversations', 'status TEXT DEFAULT \'active\'');
  // Parent teacher messages: parent_id
  addCol('parent_teacher_messages', 'parent_id TEXT');
  // Announcement categories: school_id, sort_order
  addCol('announcement_categories', 'school_id TEXT');
  addCol('announcement_categories', 'sort_order INTEGER DEFAULT 0');
  // Schools: principal_name, website
  addCol('schools', 'principal_name TEXT');
  addCol('schools', 'website TEXT');
  // Subjects: description
  addCol('subjects', 'description TEXT');
  // Assignment questions: max_score, correct_answer
  addCol('assignment_questions', 'max_score REAL');
  addCol('assignment_questions', 'correct_answer TEXT');
  // Grades: grade_category_id
  addCol('grades', 'grade_category_id TEXT');
  // Leave requests: updated_at, review_note, cancellation_reason, cancelled_by
  addCol('leave_requests', 'updated_at DATETIME');
  addCol('leave_requests', 'review_note TEXT');
  addCol('leave_requests', 'cancellation_reason TEXT');
  addCol('leave_requests', 'cancelled_by TEXT');
  // Schools: logo_url
  addCol('schools', 'logo_url TEXT');
  // Payment transactions: webhook_id
  addCol('payment_transactions', 'webhook_id TEXT');
  // Audit logs: severity, school_id
  addCol('audit_logs', 'severity TEXT');
  addCol('audit_logs', 'school_id TEXT');
  addCol('audit_logs', 'actor_name TEXT');
  addCol('audit_logs', 'role TEXT');
  // Invoice line items: fix NOT NULL constraints
  addCol('invoice_line_items', 'label TEXT');

  // Backfill defaults for safety
  // Create dashboard_metrics table if not exists
  createTable(`CREATE TABLE IF NOT EXISTS dashboard_metrics (
    id TEXT PRIMARY KEY,
    school_id TEXT,
    metric_type TEXT NOT NULL,
    metric_value REAL,
    metric_data TEXT,
    period TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Backfill defaults for safety
  try { db.exec("UPDATE teacher_assignments SET status = 'active' WHERE status IS NULL"); } catch (_) {}
  try { db.exec("UPDATE teacher_assignments SET academic_year_id = academic_year WHERE academic_year_id IS NULL AND academic_year IS NOT NULL"); } catch (_) {}

  console.log('✅ SQLite Schema initialized (35 tables + indexes)');
}
