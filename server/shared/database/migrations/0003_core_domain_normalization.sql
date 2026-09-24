-- ========================================================================
-- Migration 0003: Core Domain Normalization & Multi-tenant Schema Foundation
-- Defines full normalized entities for Tenancy, Academic Time, Identity/RBAC,
-- People, Academic Structure, Learning, Assessment, Attendance, Communication,
-- Operations, System Audit, and AI.
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. TENANCY
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schools (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(32),
  address TEXT,
  province VARCHAR(100),
  district VARCHAR(100),
  ward VARCHAR(100),
  principal_name VARCHAR(255),
  website VARCHAR(255),
  logo_url TEXT,
  status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed default root school
INSERT INTO schools (id, code, name, short_name, email, phone, address, principal_name, status)
VALUES (
  'sch_bacau',
  'BACAU_THPT',
  'Trường THPT Chuyên Bắc Âu',
  'THPT Bắc Âu',
  'bgh@school.edu.vn',
  '024.3855.9999',
  'Số 124 Đường Đại Học Số, Khu Đô Thị Giáo Dục, Hà Nội',
  'Thầy Lê Hoàng Minh',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------
-- 2. ACADEMIC TIME
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_years (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS semesters (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id VARCHAR(64) NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  semester_number INTEGER NOT NULL CHECK (semester_number IN (1, 2, 3)),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(academic_year_id, semester_number)
);

-- Seed current academic year and semesters
INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_current)
VALUES (
  'ay_2024_2025',
  'sch_bacau',
  '2024 - 2025',
  '2024-09-05',
  '2025-05-31',
  TRUE
) ON CONFLICT (id) DO NOTHING;

INSERT INTO semesters (id, school_id, academic_year_id, name, semester_number, start_date, end_date, is_current)
VALUES 
  ('sem_2024_1', 'sch_bacau', 'ay_2024_2025', 'Học kỳ I', 1, '2024-09-05', '2025-01-15', TRUE),
  ('sem_2024_2', 'sch_bacau', 'ay_2024_2025', 'Học kỳ II', 2, '2025-01-16', '2025-05-31', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------
-- 3. IDENTITY & RBAC
-- ------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Backfill school_id on existing users
UPDATE users SET school_id = 'sch_bacau' WHERE school_id IS NULL;

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  module VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id VARCHAR(64) PRIMARY KEY,
  role_id VARCHAR(64) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id VARCHAR(64) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR(64) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role_id, school_id)
);

-- Seed standard system roles
INSERT INTO roles (id, name, display_name, description, is_system)
VALUES
  ('role_admin', 'admin', 'Quản trị viên', 'Toàn quyền quản trị hệ thống trường học', TRUE),
  ('role_principal', 'principal', 'Hiệu trưởng', 'Ban Giám Hiệu, phê duyệt và giám sát toàn trường', TRUE),
  ('role_vice_principal', 'vice_principal', 'Hiệu phó', 'Phụ trách chuyên môn hoặc cơ sở vật chất', TRUE),
  ('role_dept_head', 'department_head', 'Trưởng bộ môn', 'Quản lý tổ chuyên môn và duyệt học liệu', TRUE),
  ('role_teacher', 'teacher', 'Giáo viên', 'Giảng dạy, quản lý lớp, chấm điểm và chuyên cần', TRUE),
  ('role_student', 'student', 'Học sinh', 'Học tập, nộp bài, xem điểm và tương tác AI', TRUE),
  ('role_parent', 'parent', 'Phụ huynh', 'Theo dõi học tập con cái, học phí và đơn nghỉ', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed baseline permissions
INSERT INTO permissions (id, code, module, description)
VALUES
  ('perm_users_manage', 'users:manage', 'users', 'Quản lý tài khoản và phân quyền'),
  ('perm_classes_manage', 'classes:manage', 'academic', 'Tạo và phân công lớp học'),
  ('perm_grades_edit', 'grades:edit', 'grades', 'Nhập và chỉnh sửa điểm số'),
  ('perm_grades_lock', 'grades:lock', 'grades', 'Khóa bảng điểm học kỳ'),
  ('perm_attendance_mark', 'attendance:mark', 'attendance', 'Ghi nhận điểm danh học sinh'),
  ('perm_finance_manage', 'finance:manage', 'finance', 'Quản lý hóa đơn và học phí')
ON CONFLICT (id) DO NOTHING;

-- Map admin role permissions
INSERT INTO role_permissions (id, role_id, permission_id)
VALUES
  ('rp_1', 'role_admin', 'perm_users_manage'),
  ('rp_2', 'role_admin', 'perm_classes_manage'),
  ('rp_3', 'role_admin', 'perm_grades_edit'),
  ('rp_4', 'role_admin', 'perm_grades_lock'),
  ('rp_5', 'role_admin', 'perm_attendance_mark'),
  ('rp_6', 'role_admin', 'perm_finance_manage')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------
-- 4. PEOPLE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  head_teacher_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, name)
);

INSERT INTO departments (id, school_id, name, code)
VALUES
  ('dept_math_it', 'sch_bacau', 'Tổ Toán - Tin học', 'TOAN_TIN'),
  ('dept_literature', 'sch_bacau', 'Tổ Ngữ văn', 'NGU_VAN'),
  ('dept_natural_sciences', 'sch_bacau', 'Tổ Khoa học Tự nhiên', 'KHTN'),
  ('dept_foreign_languages', 'sch_bacau', 'Tổ Ngoại ngữ', 'NGOAI_NGU')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS teachers (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL,
  homeroom_class_id VARCHAR(64),
  specialty VARCHAR(100),
  qualification VARCHAR(100),
  status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'resigned')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parents (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  occupation VARCHAR(100),
  workplace VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parent_students (
  id VARCHAR(64) PRIMARY KEY,
  parent_id VARCHAR(64) NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship VARCHAR(50) NOT NULL CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
  is_primary_contact BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, student_id)
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_class_id VARCHAR(64) REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_date DATE DEFAULT '2024-09-05';
ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'suspended', 'transferred'));

UPDATE students SET school_id = 'sch_bacau' WHERE school_id IS NULL;
UPDATE students SET current_class_id = class_id WHERE current_class_id IS NULL AND class_id IS NOT NULL;

-- ------------------------------------------------------------------------
-- 5. ACADEMIC STRUCTURE
-- ------------------------------------------------------------------------
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(64) REFERENCES academic_years(id) ON DELETE SET NULL;
UPDATE classes SET school_id = 'sch_bacau' WHERE school_id IS NULL;
UPDATE classes SET academic_year_id = 'ay_2024_2025' WHERE academic_year_id IS NULL;

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL;
UPDATE subjects SET school_id = 'sch_bacau' WHERE school_id IS NULL;

ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(64) REFERENCES academic_years(id) ON DELETE SET NULL;
UPDATE teacher_assignments SET school_id = 'sch_bacau' WHERE school_id IS NULL;
UPDATE teacher_assignments SET academic_year_id = 'ay_2024_2025' WHERE academic_year_id IS NULL;

CREATE TABLE IF NOT EXISTS class_enrollments (
  id VARCHAR(64) PRIMARY KEY,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id VARCHAR(64) NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(32) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped', 'transferred')),
  UNIQUE(class_id, student_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS class_subjects (
  id VARCHAR(64) PRIMARY KEY,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id VARCHAR(64) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  academic_year_id VARCHAR(64) NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  coefficient NUMERIC(3,1) DEFAULT 1.0,
  UNIQUE(class_id, subject_id, academic_year_id)
);

-- Backfill class_enrollments from existing students
INSERT INTO class_enrollments (id, class_id, student_id, academic_year_id, enrollment_date, status)
SELECT 
  'enr_' || s.id || '_' || s.class_id,
  s.class_id,
  s.id,
  'ay_2024_2025',
  CURRENT_DATE,
  'enrolled'
FROM students s
WHERE s.class_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------
-- 6. LEARNING & ASSESSMENT
-- ------------------------------------------------------------------------
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(64) REFERENCES academic_years(id) ON DELETE SET NULL;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS semester_id VARCHAR(64) REFERENCES semesters(id) ON DELETE SET NULL;
UPDATE assignments SET school_id = 'sch_bacau' WHERE school_id IS NULL;
UPDATE assignments SET academic_year_id = 'ay_2024_2025' WHERE academic_year_id IS NULL;
UPDATE assignments SET semester_id = 'sem_2024_1' WHERE semester_id IS NULL;

CREATE TABLE IF NOT EXISTS grade_categories (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  coefficient NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  min_entries_per_semester INTEGER DEFAULT 1,
  UNIQUE(school_id, code)
);

INSERT INTO grade_categories (id, school_id, name, code, coefficient, min_entries_per_semester)
VALUES
  ('gc_oral', 'sch_bacau', 'Kiểm tra miệng', 'MIENG', 1.0, 1),
  ('gc_15p', 'sch_bacau', 'Kiểm tra 15 phút', '15P', 1.0, 2),
  ('gc_1t', 'sch_bacau', 'Kiểm tra 1 tiết (Định kỳ)', '1TIET', 2.0, 1),
  ('gc_mid', 'sch_bacau', 'Giữa học kỳ', 'GIUA_KY', 2.0, 1),
  ('gc_final', 'sch_bacau', 'Cuối học kỳ', 'CUOI_KY', 3.0, 1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE grades ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS grade_category_id VARCHAR(64) REFERENCES grade_categories(id) ON DELETE SET NULL;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(64) REFERENCES academic_years(id) ON DELETE SET NULL;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS semester_id VARCHAR(64) REFERENCES semesters(id) ON DELETE SET NULL;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

UPDATE grades SET school_id = 'sch_bacau' WHERE school_id IS NULL;
UPDATE grades SET academic_year_id = 'ay_2024_2025' WHERE academic_year_id IS NULL;
UPDATE grades SET semester_id = 'sem_2024_1' WHERE semester_id IS NULL;

-- ------------------------------------------------------------------------
-- 7. ATTENDANCE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year_id VARCHAR(64) REFERENCES academic_years(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  period INTEGER,
  session_type VARCHAR(32) DEFAULT 'daily' CHECK (session_type IN ('daily', 'period', 'exam')),
  recorded_by VARCHAR(64) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, date, session_type)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  note TEXT,
  UNIQUE(session_id, student_id)
);

-- ------------------------------------------------------------------------
-- 8. COMMUNICATION & OPERATIONS
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  scope VARCHAR(32) NOT NULL DEFAULT 'school' CHECK (scope IN ('school', 'class', 'grade', 'department', 'teachers', 'parents', 'students')),
  target_id VARCHAR(64),
  sender_id VARCHAR(64) NOT NULL REFERENCES users(id),
  sender_name VARCHAR(255) NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  recipient_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'assignment', 'grade', 'attendance', 'tuition', 'urgent')),
  link VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parent_teacher_messages (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id VARCHAR(64) REFERENCES students(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tuition_invoices ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE tuition_invoices ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(64) REFERENCES academic_years(id) ON DELETE SET NULL;
ALTER TABLE tuition_invoices ADD COLUMN IF NOT EXISTS semester_id VARCHAR(64) REFERENCES semesters(id) ON DELETE SET NULL;
UPDATE tuition_invoices SET school_id = 'sch_bacau' WHERE school_id IS NULL;
UPDATE tuition_invoices SET academic_year_id = 'ay_2024_2025' WHERE academic_year_id IS NULL;
UPDATE tuition_invoices SET semester_id = 'sem_2024_1' WHERE semester_id IS NULL;

CREATE TABLE IF NOT EXISTS tuition_payments (
  id VARCHAR(64) PRIMARY KEY,
  invoice_id VARCHAR(64) NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('vietqr', 'bank_transfer', 'cash', 'card')),
  transaction_code VARCHAR(100),
  paid_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(32) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  notes TEXT
);

ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(64) REFERENCES academic_years(id) ON DELETE SET NULL;
UPDATE leave_requests SET school_id = 'sch_bacau' WHERE school_id IS NULL;
UPDATE leave_requests SET academic_year_id = 'ay_2024_2025' WHERE academic_year_id IS NULL;

ALTER TABLE study_resources ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
UPDATE study_resources SET school_id = 'sch_bacau' WHERE school_id IS NULL;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE SET NULL;
UPDATE audit_logs SET school_id = 'sch_bacau' WHERE school_id IS NULL;

-- ------------------------------------------------------------------------
-- 9. AI SOCRATIC TUTOR
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100),
  topic VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  sender VARCHAR(32) NOT NULL CHECK (sender IN ('user', 'ai', 'system')),
  content TEXT NOT NULL,
  has_image BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  ocr_text TEXT,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes for New Entities
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_school ON academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_semesters_academic_year ON semesters(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_departments_school ON departments(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_user ON parents(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_school_scope ON announcements(school_id, scope);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_student ON ai_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
