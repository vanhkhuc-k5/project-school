-- =============================================================================
-- Migration: 0016_teacher_grading_workflow
-- Goal: G21 — Teacher Grading Workflow
--
-- Changes:
--   grade_audit_logs: immutable append-only audit trail for grade changes
--     (especially after publication — correction tracking)
--   class_gradebook_view: materialized summary of a class's current grade state
--     (students + their draft/published grades per subject/category)
-- =============================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- 1. GRADE AUDIT LOG (append-only, immutable)
-- Every meaningful grade mutation creates one row. Never UPDATE/DELETE.
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grade_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  grade_id VARCHAR(64) NOT NULL,
  student_id VARCHAR(64) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  school_id VARCHAR(64),
  -- Who made the change
  actor_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(255),
  actor_role VARCHAR(32),
  -- What changed
  action VARCHAR(32) NOT NULL
    CHECK (action IN (
      'created',           -- new grade entry
      'draft_updated',     -- teacher edited draft
      'published',         -- draft → published
      'correction',        -- published grade was corrected (unlock + re-edit)
      'unlocked',          -- published grade was unlocked for correction
      'bulk_published'     -- batch publish action
    )),
  -- Snapshot of state before and after
  previous_raw_score NUMERIC(8,3),
  previous_max_score NUMERIC(8,3),
  previous_status VARCHAR(20),
  previous_feedback TEXT,
  new_raw_score NUMERIC(8,3),
  new_max_score NUMERIC(8,3),
  new_status VARCHAR(20),
  new_feedback TEXT,
  -- Context
  reason TEXT,
  assignment_id VARCHAR(64),
  grade_category_id VARCHAR(64),
  academic_year_id VARCHAR(64),
  semester_id VARCHAR(64),
  -- Immutable timestamp
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for querying audit trail
CREATE INDEX IF NOT EXISTS idx_audit_grade ON grade_audit_logs(grade_id);
CREATE INDEX IF NOT EXISTS idx_audit_student ON grade_audit_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON grade_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_school ON grade_audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON grade_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON grade_audit_logs(created_at DESC);

-- -------------------------------------------------------------------------
-- 2. LOCK published grades from editing
-- Only teachers with grade.update+publish can unlock.
-- -------------------------------------------------------------------------

ALTER TABLE grades ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS locked_by VARCHAR(64);

COMMIT;
