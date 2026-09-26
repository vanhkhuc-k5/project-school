-- =============================================================================
-- Migration: G28 — Student Leave Requests Lifecycle
-- Enhances leave_requests with complete auditable lifecycle, status management,
-- and authorization-aware review workflow.
-- =============================================================================

-- 1. Add missing columns to existing leave_requests table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
    -- Add reason_type if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'leave_requests' AND column_name = 'reason_type'
    ) THEN
      ALTER TABLE leave_requests ADD COLUMN reason_type VARCHAR(50) DEFAULT 'family_event';
      ALTER TABLE leave_requests ADD COLUMN reason_detail TEXT;
      ALTER TABLE leave_requests ADD COLUMN emergency_phone VARCHAR(20);
      ALTER TABLE leave_requests ADD COLUMN review_note TEXT;
      ALTER TABLE leave_requests ADD COLUMN cancellation_reason TEXT;
      ALTER TABLE leave_requests ADD COLUMN cancelled_by VARCHAR(64);
      ALTER TABLE leave_requests ADD COLUMN cancelled_at TIMESTAMPTZ;
      ALTER TABLE leave_requests ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Rename status CHECK constraint if needed (add 'cancelled')
    -- Note: Adding 'cancelled' to existing constraint requires dropping and recreating
  END IF;
END
$$;

-- 2. Create the leave_requests table if it doesn't exist (fresh installs)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
    CREATE TABLE leave_requests (
      id VARCHAR(64) PRIMARY KEY,
      school_id VARCHAR(64),
      student_id VARCHAR(64) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      parent_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      academic_year_id VARCHAR(64),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason_type VARCHAR(50) DEFAULT 'family_event',
      reason_detail TEXT,
      emergency_phone VARCHAR(20),
      status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('draft','submitted','approved','rejected','cancelled')),
      review_note TEXT,
      reviewed_by VARCHAR(64) REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      cancellation_reason TEXT,
      cancelled_by VARCHAR(64),
      cancelled_at TIMESTAMPTZ,
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX idx_leave_req_student_status ON leave_requests(student_id, status);
    CREATE INDEX idx_leave_req_status ON leave_requests(status);
    CREATE INDEX idx_leave_req_parent ON leave_requests(parent_id);
    CREATE INDEX idx_leave_req_school_status ON leave_requests(school_id, status);
    CREATE INDEX idx_leave_req_created ON leave_requests(created_at DESC);
  END IF;
END
$$;
