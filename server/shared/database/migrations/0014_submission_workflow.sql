-- =============================================================================
-- Migration: 0014_submission_workflow
-- Goal: G19 — Student Assignment Submission Workflow
--
-- Schema enhancements for full submission workflow:
--   - Late submission tracking
--   - Submission history (resubmission support)
--   - Lock_after_due enforcement (per-assignment)
--   - Draft save support (in_progress)
--   - Teacher override for late submissions
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. ADD LATE TRACKING & POLICY COLUMNS TO assignment_submissions
-- -----------------------------------------------------------------------------

ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS draft_answers TEXT;        -- in-progress draft
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS resubmit_count INTEGER DEFAULT 0;
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT TRUE; -- locks final submission

-- Backfill: existing submissions are final, not late (they were submitted)
UPDATE assignment_submissions SET is_final = TRUE WHERE is_final IS NULL;
UPDATE assignment_submissions SET is_late = FALSE WHERE is_late IS NULL;

-- -----------------------------------------------------------------------------
-- 2. ADD SUBMISSION POLICY TO assignments
-- -----------------------------------------------------------------------------

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS lock_after_due BOOLEAN DEFAULT TRUE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS allow_resubmit BOOLEAN DEFAULT FALSE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_resubmit_count INTEGER DEFAULT 1;

-- Backfill: existing assignments lock after due
UPDATE assignments SET lock_after_due = TRUE WHERE lock_after_due IS NULL;
UPDATE assignments SET allow_resubmit = FALSE WHERE allow_resubmit IS NULL;

-- -----------------------------------------------------------------------------
-- 3. ADD PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student
  ON assignment_submissions(assignment_id, student_id);

CREATE INDEX IF NOT EXISTS idx_submissions_student_status
  ON assignment_submissions(student_id, status);

CREATE INDEX IF NOT EXISTS idx_assignments_lock_due
  ON assignments(id, lock_after_due, due_date, due_time);

COMMIT;
