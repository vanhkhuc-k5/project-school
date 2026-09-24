-- =============================================================================
-- Migration: 0015_production_gradebook
-- Goal: G20 — Production Gradebook Domain
--
-- Changes:
--   grades:     raw_score, max_score, status (draft/published), coefficient_snapshot,
--               category_coefficient_snapshot, grading_period, weight,
--               published_at, published_by, calculation_version
--   grade_categories: weight (decimal multiplier, e.g. 0.2 = 20% of final grade)
--   grade_calculation_configs: per-school/academic_year/semester, stores
--               category coefficients at the time grades were calculated, reproducible
--   grade_calculation_snapshots: frozen intermediate results (immutable audit trail)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. ENRICH grade_categories WITH WEIGHT
-- -----------------------------------------------------------------------------

ALTER TABLE grade_categories ADD COLUMN IF NOT EXISTS weight NUMERIC(4,3) DEFAULT 1.000;
ALTER TABLE grade_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE grade_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Backfill default weights (equal distribution)
UPDATE grade_categories SET weight = 1.000 WHERE weight IS NULL;

-- -----------------------------------------------------------------------------
-- 2. EXTEND grades TABLE WITH PRODUCTION FIELDS
-- -----------------------------------------------------------------------------

-- Raw / max score (always stored — never recomputed from percentage)
ALTER TABLE grades ADD COLUMN IF NOT EXISTS raw_score NUMERIC(8,3);
ALTER TABLE grades ADD COLUMN IF NOT EXISTS max_score NUMERIC(8,3) DEFAULT 10.0;

-- Status: draft (teacher entering) vs published (final, locked)
ALTER TABLE grades ADD COLUMN IF NOT EXISTS status VARCHAR(20)
  DEFAULT 'draft'
  CHECK (status IN ('draft', 'published'));

-- Frozen snapshot of category coefficients at time of last calculation
-- (reproducible even if grade_categories weight changes later)
ALTER TABLE grades ADD COLUMN IF NOT EXISTS coefficient_snapshot NUMERIC(3,2);
ALTER TABLE grades ADD COLUMN IF NOT EXISTS category_weight_snapshot NUMERIC(4,3);
ALTER TABLE grades ADD COLUMN IF NOT EXISTS calculation_version INTEGER DEFAULT 1;

-- Grading period (month-based grouping within a semester)
ALTER TABLE grades ADD COLUMN IF NOT EXISTS grading_period VARCHAR(20)
  DEFAULT 'regular'
  CHECK (grading_period IN ('regular', 'midterm', 'final', 'special'));

-- Weight: how much this entry counts within its category (0.0–1.0)
ALTER TABLE grades ADD COLUMN IF NOT EXISTS weight NUMERIC(3,2) DEFAULT 1.00;

-- Published audit trail
ALTER TABLE grades ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS published_by VARCHAR(64);
ALTER TABLE grades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Title / test_name rename: use assignment_id FK
ALTER TABLE grades ADD COLUMN IF NOT EXISTS assignment_id VARCHAR(64);
ALTER TABLE grades ADD COLUMN IF NOT EXISTS subject_id VARCHAR(64);

-- Backfill: promote existing score as raw_score
UPDATE grades SET raw_score = score, max_score = 10.0 WHERE raw_score IS NULL;
UPDATE grades SET status = 'published' WHERE status IS NULL; -- existing grades are published

-- Migrate test_name to assignment_id if it looks like an assignment ID
UPDATE grades SET assignment_id = id WHERE id LIKE 'asg_%';

-- -----------------------------------------------------------------------------
-- 3. GRADE CALCULATION CONFIG (immutable once period closes)
-- Stores category weights as they existed when a period was calculated.
-- This is the key to reproducibility: change weights → new config row.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grade_calculation_configs (
  id VARCHAR(64) PRIMARY KEY,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id VARCHAR(64) NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_id VARCHAR(64) NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  -- Human-readable period identifier
  period_label VARCHAR(50) NOT NULL,
  -- JSONB snapshot: { "category_code": weight_float }
  -- e.g. { "MIENG": 0.10, "15P": 0.10, "1TIET": 0.20, "GIUA_KY": 0.25, "CUOI_KY": 0.35 }
  category_weights JSONB NOT NULL,
  -- Computed minimum entries per category at time of config
  min_entries JSONB NOT NULL,
  -- Coefficient used to scale final score (usually 10.0 or 4.0)
  scale_factor NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  -- Whether this config has been applied to any student
  is_applied BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, academic_year_id, semester_id, period_label)
);

-- Default configs seeded from grade_categories (run after grade_categories exist)
INSERT INTO grade_calculation_configs (
  id, school_id, academic_year_id, semester_id, period_label,
  category_weights, min_entries, scale_factor, is_applied
)
SELECT
  'gcc_' || gc.code || '_' || ay.id,
  gc.school_id,
  ay.id,
  sem.id,
  'Semester ' || sem.term_number,
  jsonb_object_agg(gc.code, gc.weight),
  jsonb_object_agg(gc.code, COALESCE(gc.min_entries_per_semester, 1)),
  10.00,
  FALSE
FROM grade_categories gc
CROSS JOIN academic_years ay
CROSS JOIN semesters sem
WHERE gc.is_active = TRUE OR gc.is_active IS NULL
GROUP BY gc.school_id, ay.id, sem.id, sem.term_number, gc.code
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. GRADE CALCULATION SNAPSHOTS (immutable, append-only)
-- Created whenever a student's semester grade is computed.
-- Never deleted or updated after creation.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grade_calculation_snapshots (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id VARCHAR(64) NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id VARCHAR(64) NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_id VARCHAR(64) NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  subject_id VARCHAR(64),
  -- Config snapshot used (deterministic — stores weights as frozen JSON)
  config_snapshot JSONB NOT NULL,
  -- Per-category average (before weighting)
  category_averages JSONB NOT NULL,
  -- Final weighted score
  final_score NUMERIC(8,3) NOT NULL,
  -- Scale factor applied
  scale_factor NUMERIC(5,2) NOT NULL,
  -- Version increment (1, 2, …)
  version INTEGER NOT NULL DEFAULT 1,
  -- Audit trail
  computed_by VARCHAR(64),
  computed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  -- UNIQUE so we never recompute the same version for the same student/term
  UNIQUE(student_id, academic_year_id, semester_id, subject_id, version)
);

-- -----------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_grades_student_category
  ON grades(student_id, grade_category_id, academic_year_id, semester_id);

CREATE INDEX IF NOT EXISTS idx_grades_status
  ON grades(status);

CREATE INDEX IF NOT EXISTS idx_grades_published
  ON grades(student_id, academic_year_id, semester_id, status);

CREATE INDEX IF NOT EXISTS idx_grades_assignment
  ON grades(assignment_id);

CREATE INDEX IF NOT EXISTS idx_grade_categories_school
  ON grade_categories(school_id);

CREATE INDEX IF NOT EXISTS idx_snapshots_student
  ON grade_calculation_snapshots(student_id, academic_year_id, semester_id);

CREATE INDEX IF NOT EXISTS idx_configs_school_year_sem
  ON grade_calculation_configs(school_id, academic_year_id, semester_id);

COMMIT;
