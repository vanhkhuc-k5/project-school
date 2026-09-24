-- =============================================================================
-- Migration: 0013_assignments_authoring
-- Goal: G18 — Assignment Authoring
-- Schema enhancements for production-grade assignment creation workflow
--
-- Changes:
--   assignments:   status, total_score, school_id, semester_id, academic_year_id,
--                  published_at, updated_at
--   assignment_questions: question_type (multiple_choice | short_answer | essay),
--                       correct_answer, max_score
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. ADD SCOPING & LIFECYCLE COLUMNS TO assignments
-- -----------------------------------------------------------------------------

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(20)
  DEFAULT 'draft'
  CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS total_score REAL DEFAULT 10.0;

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS school_id VARCHAR(64)
  REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS semester_id VARCHAR(64)
  REFERENCES semesters(id) ON DELETE SET NULL;

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(64)
  REFERENCES academic_years(id) ON DELETE SET NULL;

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
  DEFAULT CURRENT_TIMESTAMP;

-- Backfill
UPDATE assignments SET school_id = 'sch_bacau' WHERE school_id IS NULL;
UPDATE assignments SET status = 'published' WHERE status IS NULL;  -- existing ones are published
UPDATE assignments SET total_score = 10.0 WHERE total_score IS NULL;

-- -----------------------------------------------------------------------------
-- 2. ADD QUESTION TYPE & CORRECT ANSWER TO assignment_questions
-- -----------------------------------------------------------------------------

ALTER TABLE assignment_questions ADD COLUMN IF NOT EXISTS question_type VARCHAR(20)
  DEFAULT 'multiple_choice'
  CHECK (question_type IN ('multiple_choice', 'short_answer', 'essay'));

ALTER TABLE assignment_questions ADD COLUMN IF NOT EXISTS correct_answer TEXT;  -- e.g. "A" for MC, text for short_answer

ALTER TABLE assignment_questions ADD COLUMN IF NOT EXISTS max_score REAL DEFAULT 1.0;

-- Backfill: existing quiz questions are multiple_choice
UPDATE assignment_questions SET question_type = 'multiple_choice' WHERE question_type IS NULL;
UPDATE assignment_questions SET max_score = points WHERE max_score IS NULL;

-- -----------------------------------------------------------------------------
-- 3. ADD PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_assignments_status
  ON assignments(status);

CREATE INDEX IF NOT EXISTS idx_assignments_created_by_status
  ON assignments(created_by, status);

CREATE INDEX IF NOT EXISTS idx_assignments_school_year
  ON assignments(school_id, academic_year_id);

CREATE INDEX IF NOT EXISTS idx_assignments_school_status
  ON assignments(school_id, status);

CREATE INDEX IF NOT EXISTS idx_assignment_questions_type
  ON assignment_questions(assignment_id, question_type);

COMMIT;
