-- ========================================================================
-- Migration 0010: Teacher Assignment Lifecycle (G15)
-- Features:
-- - Semester scope & academic year scoping
-- - Primary, secondary, assistant, and substitute teacher roles
-- - Lifecycle statuses (active, inactive, transferred, revoked)
-- - Conflict prevention: max 1 active primary teacher per class + subject + term
-- - Fast lookup indexes for teacher classes and class rosters
-- ========================================================================

-- 1. ADD LIFECYCLE AND SCOPING COLUMNS
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS semester_id VARCHAR(64) REFERENCES semesters(id) ON DELETE SET NULL;
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT 'primary';
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active';
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. CHECK CONSTRAINTS FOR ROLE AND STATUS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_assignments_role_check'
  ) THEN
    ALTER TABLE teacher_assignments ADD CONSTRAINT teacher_assignments_role_check
      CHECK (role IN ('primary', 'secondary', 'assistant', 'substitute'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_assignments_status_check'
  ) THEN
    ALTER TABLE teacher_assignments ADD CONSTRAINT teacher_assignments_status_check
      CHECK (status IN ('active', 'inactive', 'transferred', 'revoked'));
  END IF;
END $$;

-- 3. BACKFILL DEFAULTS FOR EXISTING RECORDS
UPDATE teacher_assignments SET school_id = 'sch_bacau' WHERE school_id IS NULL;
UPDATE teacher_assignments SET academic_year_id = 'ay_2024_2025' WHERE academic_year_id IS NULL;
UPDATE teacher_assignments SET role = 'primary' WHERE role IS NULL;
UPDATE teacher_assignments SET status = 'active' WHERE status IS NULL;
UPDATE teacher_assignments SET academic_year = '2024-2025' WHERE academic_year IS NULL;

-- 4. DROP LEGACY UNIQUE CONSTRAINT (TO ALLOW HISTORICAL REASSIGNMENT & MULTI-SEMESTER/SECONDARY ROLES)
ALTER TABLE teacher_assignments DROP CONSTRAINT IF EXISTS teacher_assignments_teacher_id_class_id_subject_id_academic_year_key;

-- 5. CONFLICT PREVENTION INDEXES
-- Enforce at most 1 active primary teacher per (class, subject, academic_year, semester)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_primary_assignment 
  ON teacher_assignments (class_id, subject_id, academic_year_id, COALESCE(semester_id, 'ALL'))
  WHERE (role = 'primary' AND status = 'active');

-- Enforce no duplicate active assignment for the same teacher on the same class + subject + term
CREATE UNIQUE INDEX IF NOT EXISTS idx_no_duplicate_active_teacher_assignment
  ON teacher_assignments (teacher_id, class_id, subject_id, academic_year_id, COALESCE(semester_id, 'ALL'))
  WHERE (status = 'active');

-- 6. PERFORMANCE & ROSTER QUERY INDEXES
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher_status ON teacher_assignments(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class_status ON teacher_assignments(class_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject_status ON teacher_assignments(subject_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school_year ON teacher_assignments(school_id, academic_year_id);
