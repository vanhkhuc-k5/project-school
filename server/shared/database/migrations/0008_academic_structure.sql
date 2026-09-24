-- ========================================================================
-- Migration 0008: Academic Structure (Departments, Subjects, Classes)
-- Enhances subjects, departments, and classes with normalized relationships,
-- foreign keys, status life-cycles, room & capacity attributes, and indexes.
-- ========================================================================

-- 1. DEPARTMENTS TABLE ENHANCEMENTS
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(64),
  description TEXT,
  head_teacher_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, name)
);

ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_departments_school ON departments(school_id);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(school_id, code);

-- 2. SUBJECTS TABLE ENHANCEMENTS
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS department_id VARCHAR(64) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS grade_level INTEGER;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS weekly_periods INTEGER DEFAULT 3;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS credits NUMERIC(3,1) DEFAULT 2.0;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department_id);
CREATE INDEX IF NOT EXISTS idx_subjects_grade ON subjects(grade_level);
CREATE INDEX IF NOT EXISTS idx_subjects_status ON subjects(status);

-- 3. CLASSES TABLE ENHANCEMENTS
ALTER TABLE classes ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(64) REFERENCES academic_years(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS room VARCHAR(64);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS max_capacity INTEGER DEFAULT 45;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade_level);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_classes_school_year_name ON classes(school_id, academic_year_id, name);

-- 4. SEED & BACKFILL STANDARD DEPARTMENTS (THPT Chuyên Bắc Âu)
INSERT INTO departments (id, school_id, name, code, description, head_teacher_id)
VALUES 
  ('dept_math_it', 'sch_bacau', 'Tổ Toán - Tin học', 'TOAN_TIN', 'Phụ trách chuyên môn Toán học và Tin học ứng dụng', 'usr_teacher_1'),
  ('dept_natural_sciences', 'sch_bacau', 'Tổ Khoa học Tự nhiên', 'KHTN', 'Phụ trách Vật lý, Hóa học và Sinh học thực nghiệm', NULL),
  ('dept_social_sciences', 'sch_bacau', 'Tổ Khoa học Xã hội', 'KHXH', 'Phụ trách Ngữ văn, Lịch sử, Địa lý và GDCD', NULL),
  ('dept_foreign_languages', 'sch_bacau', 'Tổ Ngoại ngữ', 'NGOAINGU', 'Phụ trách Tiếng Anh chuẩn đầu ra quốc tế và Ngoại ngữ 2', NULL),
  ('dept_arts_physical', 'sch_bacau', 'Tổ Thể chất & Nghệ thuật', 'TC_NT', 'Phụ trách Giáo dục Thể chất, Âm nhạc và Mỹ thuật', NULL)
ON CONFLICT (school_id, name) DO UPDATE 
SET code = EXCLUDED.code, description = EXCLUDED.description;

-- Seed Hoa Sen School departments
INSERT INTO departments (id, school_id, name, code, description, head_teacher_id)
VALUES 
  ('dept_hoasen_general', 'sch_hoasen', 'Tổ Chuyên môn Tổng hợp', 'CM_TH', 'Tổ bộ môn trường Hoa Sen', NULL)
ON CONFLICT (school_id, name) DO NOTHING;

-- 5. BACKFILL SUBJECTS
UPDATE subjects
SET school_id = 'sch_bacau'
WHERE school_id IS NULL;

UPDATE subjects
SET department_id = 'dept_math_it', weekly_periods = 4, credits = 3.0
WHERE code IN ('TOAN', 'TINHOC') AND (department_id IS NULL OR department_id = '');

UPDATE subjects
SET department_id = 'dept_natural_sciences', weekly_periods = 3, credits = 2.5
WHERE code IN ('VATLY', 'HOAHOC', 'SINHHOC') AND (department_id IS NULL OR department_id = '');

UPDATE subjects
SET department_id = 'dept_social_sciences', weekly_periods = 3, credits = 2.5
WHERE code IN ('NGUVAN', 'LICHSU', 'DIALY', 'GDCD') AND (department_id IS NULL OR department_id = '');

UPDATE subjects
SET department_id = 'dept_foreign_languages', weekly_periods = 3, credits = 2.5
WHERE code = 'TIENGANH' AND (department_id IS NULL OR department_id = '');

UPDATE subjects
SET department_id = 'dept_arts_physical', weekly_periods = 2, credits = 1.5
WHERE code IN ('CONGNGHE', 'THEDUC', 'AMNHAC', 'MYTHUAT') AND (department_id IS NULL OR department_id = '');

-- 6. BACKFILL CLASSES
UPDATE classes
SET school_id = 'sch_bacau'
WHERE school_id IS NULL;

UPDATE classes
SET academic_year_id = 'ay_2024_2025'
WHERE academic_year = '2024-2025' AND (academic_year_id IS NULL OR academic_year_id = '');

UPDATE classes
SET max_capacity = COALESCE(max_students, 45)
WHERE max_capacity IS NULL;

UPDATE classes
SET room = CASE 
  WHEN id = 'cls_10A1' THEN 'Phòng 301'
  WHEN id = 'cls_10A2' THEN 'Phòng 302'
  WHEN id = 'cls_11A1' THEN 'Phòng 401'
  WHEN id = 'cls_07B' THEN 'Phòng 201'
  ELSE 'Phòng học'
END
WHERE room IS NULL OR room = '';
