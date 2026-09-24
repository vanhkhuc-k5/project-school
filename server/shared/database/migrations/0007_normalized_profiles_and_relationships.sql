-- ========================================================================
-- Migration 0007: Normalized Profiles and Relationships
-- Establishes separation between Identity Accounts (users) and Domain
-- Profiles (teachers, students, parents), one-to-many guardian relationships
-- (parent_students), and class enrollments.
-- ========================================================================

-- 1. TEACHERS PROFILE ENHANCEMENTS
CREATE TABLE IF NOT EXISTS teachers (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL,
  homeroom_class_id VARCHAR(64) REFERENCES classes(id) ON DELETE SET NULL,
  specialty VARCHAR(100),
  qualification VARCHAR(255),
  status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'resigned')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS employee_id VARCHAR(64);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS subjects TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(32);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS office_room VARCHAR(64);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 2. STUDENTS PROFILE ENHANCEMENTS
CREATE TABLE IF NOT EXISTS students (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id),
  parent_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  gpa NUMERIC(4,2) DEFAULT 0,
  class_rank VARCHAR(32),
  attendance_rate NUMERIC(5,2) DEFAULT 100
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS current_class_id VARCHAR(64) REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_code VARCHAR(64);
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(16) DEFAULT 'male' CHECK (gender IN ('male', 'female', 'other'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_status VARCHAR(32) DEFAULT 'enrolled' CHECK (enrollment_status IN ('enrolled', 'active', 'graduated', 'suspended', 'transferred'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 3. PARENTS PROFILE ENHANCEMENTS
CREATE TABLE IF NOT EXISTS parents (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  occupation VARCHAR(100),
  workplace VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE parents ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(32);
ALTER TABLE parents ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE parents ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE parents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 4. PARENT_STUDENTS GUARDIAN RELATIONSHIPS
CREATE TABLE IF NOT EXISTS parent_students (
  id VARCHAR(64) PRIMARY KEY,
  parent_id VARCHAR(64) NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship VARCHAR(50) NOT NULL DEFAULT 'guardian' CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
  is_primary_contact BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(parent_id, student_id)
);

ALTER TABLE parent_students ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;

-- 5. CLASS ENROLLMENTS
CREATE TABLE IF NOT EXISTS class_enrollments (
  id VARCHAR(64) PRIMARY KEY,
  class_id VARCHAR(64) NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id VARCHAR(64) NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(32) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped', 'transferred')),
  UNIQUE(class_id, student_id, academic_year_id)
);

ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT TRUE;

-- 6. INDEXES FOR HIGH-EFFICIENCY LOOKUPS & RBAC TENANCY
CREATE INDEX IF NOT EXISTS idx_teachers_user ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_department ON teachers(department_id);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_current_class ON students(current_class_id);
CREATE INDEX IF NOT EXISTS idx_parents_user ON parents(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_school ON parents(school_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_current ON class_enrollments(student_id, is_current);

-- 7. BACKFILL DOMAIN PROFILES FOR EXISTING USERS

-- 7.1 Backfill Teachers
INSERT INTO teachers (id, user_id, school_id, department_id, homeroom_class_id, specialty, qualification, status, employee_id, contact_email, contact_phone, subjects)
SELECT 
  'tch_' || u.id,
  u.id,
  COALESCE(u.school_id, 'sch_bacau'),
  'dept_math_it',
  'cls_10A1',
  'Toán học',
  'Thạc sĩ Sư phạm Toán học',
  'active',
  COALESCE(u.code, 'GV-TOAN-014'),
  u.email,
  u.phone,
  '["Toán 10", "Toán 11"]'
FROM users u
WHERE u.role = 'teacher'
ON CONFLICT (user_id) DO UPDATE SET
  employee_id = COALESCE(teachers.employee_id, EXCLUDED.employee_id),
  school_id = COALESCE(teachers.school_id, EXCLUDED.school_id);

-- 7.2 Backfill Students (ensure student_code and enrollment_status)
UPDATE students s
SET 
  student_code = COALESCE(s.student_code, u.code, 'HS-' || s.id),
  dob = COALESCE(s.dob, '2008-05-15'::date),
  gender = COALESCE(s.gender, 'male'),
  address = COALESCE(s.address, 'Hà Nội, Việt Nam'),
  enrollment_status = 'active',
  current_class_id = COALESCE(s.current_class_id, s.class_id, 'cls_10A1'),
  school_id = COALESCE(s.school_id, u.school_id, 'sch_bacau')
FROM users u
WHERE s.user_id = u.id;

-- Ensure all users with role 'student' have a student record
INSERT INTO students (id, user_id, class_id, current_class_id, school_id, student_code, dob, gender, enrollment_status, gpa, class_rank, attendance_rate)
SELECT 
  'std_' || u.id,
  u.id,
  'cls_10A1',
  'cls_10A1',
  COALESCE(u.school_id, 'sch_bacau'),
  COALESCE(u.code, 'HS-' || u.id),
  '2008-05-15'::date,
  'male',
  'active',
  8.0,
  '15/38',
  100
FROM users u
WHERE u.role = 'student'
ON CONFLICT (user_id) DO NOTHING;

-- 7.3 Backfill Parents
INSERT INTO parents (id, user_id, school_id, occupation, workplace, contact_phone, contact_email, status)
SELECT 
  'prt_' || u.id,
  u.id,
  COALESCE(u.school_id, 'sch_bacau'),
  'Kỹ sư phần mềm',
  'Tập đoàn Viễn thông & Công nghệ FPT',
  u.phone,
  u.email,
  'active'
FROM users u
WHERE u.role = 'parent'
ON CONFLICT (user_id) DO UPDATE SET
  school_id = COALESCE(parents.school_id, EXCLUDED.school_id);

-- 7.4 Backfill Parent-Student Relationships
-- Link usr_parent_1 to std_khoi and std_chau
INSERT INTO parent_students (id, parent_id, student_id, relationship, is_primary_contact, is_verified)
SELECT 
  'ps_' || p.id || '_' || s.id,
  p.id,
  s.id,
  'father',
  TRUE,
  TRUE
FROM parents p, students s
WHERE p.user_id = 'usr_parent_1' 
  AND s.id IN ('std_khoi', 'std_chau')
ON CONFLICT (parent_id, student_id) DO UPDATE SET
  is_verified = TRUE,
  relationship = EXCLUDED.relationship;

-- Also support any student where students.parent_id points to users.id
INSERT INTO parent_students (id, parent_id, student_id, relationship, is_primary_contact, is_verified)
SELECT 
  'ps_' || p.id || '_' || s.id,
  p.id,
  s.id,
  'guardian',
  TRUE,
  TRUE
FROM parents p
JOIN students s ON s.parent_id = p.user_id
WHERE s.id NOT IN ('std_khoi', 'std_chau')
ON CONFLICT (parent_id, student_id) DO NOTHING;

-- 7.5 Backfill Class Enrollments
INSERT INTO class_enrollments (id, class_id, student_id, academic_year_id, enrollment_date, status, is_current)
SELECT 
  'ce_' || s.id || '_' || s.class_id,
  s.class_id,
  s.id,
  'ay_2024_2025',
  '2024-09-05'::date,
  'enrolled',
  TRUE
FROM students s
WHERE s.class_id IS NOT NULL
ON CONFLICT (class_id, student_id, academic_year_id) DO UPDATE SET
  is_current = TRUE;
