-- ========================================================================
-- Migration 0012: Production Attendance Management (G17)
-- Features:
-- - Multi-tenant isolation (school_id)
-- - Attendance session:
--     * school_id, class_id, subject_id, teacher_id, date, period, semester_id, status, session_type, notes
-- - Attendance record:
--     * session_id, student_id, status (PRESENT, ABSENT, LATE, EXCUSED), note, recorded_by, created_at, updated_at
-- - Uniqueness and Slot Constraints
-- - Fast query indexes for student history, parent child history, school reporting
-- ========================================================================

-- 1. UPGRADE ATTENDANCE_SESSIONS
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS subject_id VARCHAR(64) REFERENCES subjects(id) ON DELETE SET NULL;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS semester_id VARCHAR(64) REFERENCES semesters(id) ON DELETE SET NULL;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'completed';
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Drop legacy unique constraint on (class_id, date, session_type) if exists to allow multiple periods/subjects per day
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_sessions_class_id_date_session_type_key'
  ) THEN
    ALTER TABLE attendance_sessions DROP CONSTRAINT attendance_sessions_class_id_date_session_type_key;
  END IF;
END $$;

-- Add unique slot index: (class_id, date, COALESCE(period, 0), COALESCE(session_type, 'daily'))
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_sessions_slot
  ON attendance_sessions (class_id, date, COALESCE(period, 0), COALESCE(session_type, 'daily'));

-- 2. UPGRADE ATTENDANCE_RECORDS
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update status check constraint to support both uppercase and lowercase standard codes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_records_status_check'
  ) THEN
    ALTER TABLE attendance_records DROP CONSTRAINT attendance_records_status_check;
  END IF;

  ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_status_check
    CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'present', 'absent', 'late', 'excused'));
END $$;

-- 3. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_school_date ON attendance_sessions(school_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_date ON attendance_sessions(class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_teacher ON attendance_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);

-- 4. SEED CANONICAL SAMPLE SESSIONS & RECORDS FOR CLASS cls_10A1 (BẮC ÂU)
INSERT INTO attendance_sessions (
  id, school_id, class_id, subject_id, teacher_id, date, period, semester_id, status, session_type, recorded_by, created_at, updated_at
) VALUES
  ('ses_10a1_20260918', 'sch_bacau', 'cls_10A1', 'sub_toan', 'usr_teacher_1', '2026-09-18', 1, 'sem_2024_1', 'completed', 'daily', 'usr_teacher_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ses_10a1_20260919', 'sch_bacau', 'cls_10A1', 'sub_toan', 'usr_teacher_1', '2026-09-19', 1, 'sem_2024_1', 'completed', 'daily', 'usr_teacher_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ses_10a1_20260920', 'sch_bacau', 'cls_10A1', 'sub_toan', 'usr_teacher_1', '2026-09-20', 1, 'sem_2024_1', 'completed', 'daily', 'usr_teacher_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Seed records for std_khang, std_khoi, std_chau in these sessions
INSERT INTO attendance_records (id, session_id, student_id, status, note, recorded_by, created_at, updated_at)
VALUES
  ('rec_10a1_20260918_khang', 'ses_10a1_20260918', 'std_khang', 'PRESENT', 'Đúng giờ', 'usr_teacher_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rec_10a1_20260918_khoi',  'ses_10a1_20260918', 'std_khoi',  'PRESENT', 'Đúng giờ', 'usr_teacher_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rec_10a1_20260919_khang', 'ses_10a1_20260919', 'std_khang', 'PRESENT', 'Đúng giờ', 'usr_teacher_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rec_10a1_20260919_khoi',  'ses_10a1_20260919', 'std_khoi',  'LATE',    'Đến muộn 5 phút do mưa', 'usr_teacher_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rec_10a1_20260920_khang', 'ses_10a1_20260920', 'std_khang', 'EXCUSED', 'Nghỉ ốm có phép từ PH', 'usr_teacher_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rec_10a1_20260920_khoi',  'ses_10a1_20260920', 'std_khoi',  'PRESENT', 'Đúng giờ', 'usr_teacher_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (session_id, student_id) DO NOTHING;
