-- ========================================================================
-- Migration 0001: Baseline Schema
-- Idempotent PostgreSQL DDL defining all 19 core tables for EduPortal.
-- ========================================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin', 'principal', 'vice_principal', 'department_head')),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64),
  phone VARCHAR(32),
  avatar TEXT,
  must_change_password BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) UNIQUE NOT NULL,
  department VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Classes
CREATE TABLE IF NOT EXISTS classes (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  grade_level INTEGER NOT NULL,
  academic_year VARCHAR(32) NOT NULL,
  homeroom_teacher_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  max_students INTEGER DEFAULT 45
);

-- 4. Students
CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id),
  parent_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  gpa NUMERIC(4,2) DEFAULT 0,
  class_rank VARCHAR(32),
  attendance_rate NUMERIC(5,2) DEFAULT 100
);

-- 5. Teacher Assignments
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id VARCHAR(64) PRIMARY KEY,
  teacher_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year VARCHAR(32) NOT NULL,
  UNIQUE (teacher_id, class_id, subject_id, academic_year)
);

-- 6. Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'quiz' CHECK (type IN ('quiz', 'essay', 'attachment')),
  instructions TEXT,
  target_classes TEXT NOT NULL,
  due_date VARCHAR(32) NOT NULL,
  due_time VARCHAR(16) NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  grading_scale VARCHAR(64) DEFAULT 'Thang 10 (Hệ số 1)',
  lock_after_due BOOLEAN DEFAULT TRUE,
  shuffle_questions BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(64) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Assignment Questions
CREATE TABLE IF NOT EXISTS assignment_questions (
  id VARCHAR(64) PRIMARY KEY,
  assignment_id VARCHAR(64) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  points NUMERIC(4,2) DEFAULT 1.0,
  has_plot BOOLEAN DEFAULT FALSE,
  plot_data TEXT,
  options TEXT NOT NULL,
  explanation TEXT
);

-- 8. Assignment Submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id VARCHAR(64) PRIMARY KEY,
  assignment_id VARCHAR(64) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'submitted' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  score NUMERIC(4,2),
  student_answers TEXT,
  submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  teacher_feedback TEXT
);

-- 9. Grades
CREATE TABLE IF NOT EXISTS grades (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  score NUMERIC(4,2) NOT NULL,
  max_score NUMERIC(4,2) DEFAULT 10,
  coefficient NUMERIC(3,1) DEFAULT 1.0,
  semester INTEGER DEFAULT 1,
  teacher_name VARCHAR(255) NOT NULL,
  comment TEXT,
  graded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Student Competencies
CREATE TABLE IF NOT EXISTS student_competencies (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  proficiency_percent INTEGER NOT NULL,
  is_strength BOOLEAN NOT NULL DEFAULT TRUE,
  hint TEXT
);

-- 11. Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date VARCHAR(16) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  note TEXT,
  recorded_by VARCHAR(64) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, date)
);

-- 12. Timetable
CREATE TABLE IF NOT EXISTS timetable (
  id VARCHAR(64) PRIMARY KEY,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id VARCHAR(64),
  subject_name VARCHAR(100) NOT NULL,
  teacher_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 2 AND 7),
  period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 10),
  room VARCHAR(64),
  academic_year VARCHAR(32) NOT NULL,
  UNIQUE (class_id, day_of_week, period, academic_year)
);

-- 13. Tuition Invoices
CREATE TABLE IF NOT EXISTS tuition_invoices (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  period VARCHAR(64) NOT NULL,
  total_amount INTEGER NOT NULL,
  due_date VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  items TEXT NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(64) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  transfer_memo VARCHAR(255) NOT NULL
);

-- 14. School Notices
CREATE TABLE IF NOT EXISTS school_notices (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(32) NOT NULL CHECK (category IN ('teacher', 'school', 'system')),
  tag VARCHAR(64),
  tag_type VARCHAR(32) DEFAULT 'info',
  sender VARCHAR(255) NOT NULL,
  can_confirm BOOLEAN DEFAULT FALSE,
  confirmed_by_users TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. Messages
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id VARCHAR(64),
  subject VARCHAR(255),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date VARCHAR(32) NOT NULL,
  end_date VARCHAR(32) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. AI Tutor Messages
CREATE TABLE IF NOT EXISTS ai_tutor_messages (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic VARCHAR(255) NOT NULL,
  sender VARCHAR(32) NOT NULL CHECK (sender IN ('ai', 'user')),
  text TEXT,
  has_image BOOLEAN DEFAULT FALSE,
  image_caption TEXT,
  ocr_status VARCHAR(64),
  ai_content TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 18. Study Resources
CREATE TABLE IF NOT EXISTS study_resources (
  id VARCHAR(64) PRIMARY KEY,
  subject VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL CHECK (type IN ('pdf', 'video', 'exam', 'slides')),
  file_size VARCHAR(32),
  grade_level INTEGER NOT NULL,
  download_url TEXT,
  downloads_count INTEGER DEFAULT 0,
  uploaded_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 19. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(64),
  entity_id VARCHAR(64),
  details TEXT,
  badge VARCHAR(64),
  badge_type VARCHAR(32) DEFAULT 'neutral',
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
