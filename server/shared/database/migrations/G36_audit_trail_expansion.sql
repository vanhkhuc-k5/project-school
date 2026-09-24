-- =============================================================================
-- Migration: G36_audit_trail_expansion
-- Goal: Expand audit_logs table for centralized audit trail
--
-- Changes:
--   - Add severity, category columns for filtering
--   - Add before_state, after_state for change tracking
--   - Add correlation_id for request tracing
--   - Add metadata for flexible event data
--   - Add indexes for efficient querying
-- =============================================================================

-- -------------------------------------------------------------------------
-- 1. Add new columns to audit_logs
-- -------------------------------------------------------------------------

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'INFO';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_state TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_state TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata TEXT;

-- -------------------------------------------------------------------------
-- 2. Set default severity based on existing badge_type
-- -------------------------------------------------------------------------

UPDATE audit_logs SET severity = 'WARNING' WHERE badge_type = 'warning' OR badge_type = 'danger';
UPDATE audit_logs SET severity = 'CRITICAL' WHERE badge_type = 'critical';
UPDATE audit_logs SET severity = 'INFO' WHERE severity IS NULL OR severity = '';

-- -------------------------------------------------------------------------
-- 3. Set category based on action patterns
-- -------------------------------------------------------------------------

UPDATE audit_logs SET category = 'AUTHENTICATION' 
  WHERE action LIKE 'LOGIN%' OR action LIKE 'LOGOUT%' OR action LIKE 'TOKEN%' OR action LIKE 'PASSWORD%';

UPDATE audit_logs SET category = 'USER_MANAGEMENT' 
  WHERE action LIKE 'USER_%' OR action LIKE 'ACCOUNT_%';

UPDATE audit_logs SET category = 'ENROLLMENT' 
  WHERE action LIKE '%ENROLL%' OR action LIKE '%TRANSFER%' OR action LIKE '%WITHDRAW%';

UPDATE audit_logs SET category = 'ATTENDANCE' 
  WHERE action LIKE '%ATTENDANCE%';

UPDATE audit_logs SET category = 'GRADE' 
  WHERE action LIKE '%GRADE%' OR action LIKE '%SCORE%';

UPDATE audit_logs SET category = 'TUITION' 
  WHERE action LIKE '%INVOICE%' OR action LIKE '%PAYMENT%' OR action LIKE '%TUITION%';

UPDATE audit_logs SET category = 'PERMISSION' 
  WHERE action LIKE '%PERMISSION%' OR action LIKE '%ROLE%';

UPDATE audit_logs SET category = 'SYSTEM' 
  WHERE category IS NULL;

-- -------------------------------------------------------------------------
-- 4. Add indexes for common query patterns
-- -------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_role ON audit_logs(actor_role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_severity ON audit_logs(created_at DESC, severity);

-- -------------------------------------------------------------------------
-- 5. Add composite indexes for common filter combinations
-- -------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_audit_logs_school_severity ON audit_logs(school_id, severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_category ON audit_logs(school_id, category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- -------------------------------------------------------------------------
-- 6. Ensure NOT NULL constraints on critical columns
-- -------------------------------------------------------------------------

ALTER TABLE audit_logs ALTER COLUMN severity SET DEFAULT 'INFO';
ALTER TABLE audit_logs ALTER COLUMN severity SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN category SET NOT NULL;

-- -------------------------------------------------------------------------
-- 7. Create audit_log schema version for tracking
-- -------------------------------------------------------------------------

INSERT INTO schema_migrations (version, applied_at)
VALUES ('G36_audit_trail_expansion', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;
