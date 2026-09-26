-- Migration: 0017_fix_grades_teacher_feedback
-- Add missing teacher_feedback column to grades table if not exists

BEGIN;

-- Add teacher_feedback column to grades table
ALTER TABLE grades ADD COLUMN IF NOT EXISTS teacher_feedback TEXT;

-- Also add missing locked_at and locked_by columns if not exists
ALTER TABLE grades ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS locked_by VARCHAR(64);

COMMIT;
