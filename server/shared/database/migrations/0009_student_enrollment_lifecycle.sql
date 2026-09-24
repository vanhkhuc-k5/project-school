-- Migration 0009: Student Enrollment Lifecycle (G14)
-- Adds fields for class transfer, withdrawal, timeline tracking, and active enrollment invariants.

-- 1. ENHANCE CLASS_ENROLLMENTS TABLE
ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE SET NULL;
ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE class_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. BACKFILL SCHOOL_ID FROM STUDENTS / CLASSES
UPDATE class_enrollments ce
SET school_id = s.school_id
FROM students s
WHERE ce.student_id = s.id AND ce.school_id IS NULL;

UPDATE class_enrollments ce
SET school_id = c.school_id
FROM classes c
WHERE ce.class_id = c.id AND ce.school_id IS NULL;

UPDATE class_enrollments
SET school_id = 'sch_bacau'
WHERE school_id IS NULL;

-- 3. UPDATE STATUS CHECK CONSTRAINT (SUPPORTING WITHDRAWN AND TRANSFERRED)
ALTER TABLE class_enrollments DROP CONSTRAINT IF EXISTS class_enrollments_status_check;
ALTER TABLE class_enrollments ADD CONSTRAINT class_enrollments_status_check 
  CHECK (status IN ('enrolled', 'completed', 'dropped', 'transferred', 'withdrawn', 'suspended'));

-- 4. INVARIANT INDEX: MAXIMUM ONE ACTIVE ENROLLMENT PER STUDENT (REPLACES STATIC UNIQUE CONSTRAINT)
ALTER TABLE class_enrollments DROP CONSTRAINT IF EXISTS class_enrollments_class_id_student_id_academic_year_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_enrollment_per_student 
  ON class_enrollments(student_id) 
  WHERE (is_current = true AND status = 'enrolled');

-- 5. PERFORMANCE AND ROSTER INDEXES
CREATE INDEX IF NOT EXISTS idx_enrollments_school_year ON class_enrollments(school_id, academic_year_id);

-- 5. DERIVED MEMBERSHIP: MAKE LEGACY STUDENTS.CLASS_ID NULLABLE (CLASS IS DERIVED FROM ENROLLMENTS)
ALTER TABLE students ALTER COLUMN class_id DROP NOT NULL;

-- 6. INDEXES FOR FAST TIMELINE & ROSTER QUERIES
CREATE INDEX IF NOT EXISTS idx_class_enrollments_active ON class_enrollments(class_id, is_current, status);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_timeline ON class_enrollments(student_id, start_date DESC);
