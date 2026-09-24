-- ========================================================================
-- Migration 0011: Timetable Scheduling Domain (G16)
-- Features:
-- - Multi-tenant isolation (school_id)
-- - Academic year & semester scoping
-- - Start and end time support for flexible periods
-- - Day of week extended (2 to 8)
-- - Conflict prevention:
--     * Class collision (max 1 subject per class per slot)
--     * Teacher collision (max 1 class per teacher per slot)
--     * Room collision (max 1 class per room per slot)
-- - Seed canonical timetable for cls_10A1
-- ========================================================================

-- 1. ADD TIMETABLE SCOPING & ATTRIBUTE COLUMNS
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS semester_id VARCHAR(64) REFERENCES semesters(id) ON DELETE CASCADE;
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS academic_year_id VARCHAR(64) REFERENCES academic_years(id) ON DELETE CASCADE;
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS start_time VARCHAR(16);
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS end_time VARCHAR(16);
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE timetable ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. UPDATE CHECK CONSTRAINTS SAFELY
DO $$
BEGIN
  -- Drop old day_of_week check constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'timetable_day_of_week_check'
  ) THEN
    ALTER TABLE timetable DROP CONSTRAINT timetable_day_of_week_check;
  END IF;

  -- Add updated check allowing Sunday (day 8 or 1, standardized 2 to 8)
  ALTER TABLE timetable ADD CONSTRAINT timetable_day_of_week_check
    CHECK (day_of_week BETWEEN 2 AND 8);

  -- Drop old period check constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'timetable_period_check'
  ) THEN
    ALTER TABLE timetable DROP CONSTRAINT timetable_period_check;
  END IF;

  -- Add updated check for periods 1 to 10
  ALTER TABLE timetable ADD CONSTRAINT timetable_period_check
    CHECK (period BETWEEN 1 AND 10);
END $$;

-- 3. DROP LEGACY UNIQUE CONSTRAINT
ALTER TABLE timetable DROP CONSTRAINT IF EXISTS timetable_class_id_day_of_week_period_academic_year_key;

-- 4. CONFLICT PREVENTION INDEXES
-- A. Class Collision: A class cannot have multiple subjects at the same (class, semester, day, period)
CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_class_slot
  ON timetable (class_id, COALESCE(semester_id, 'ALL'), day_of_week, period);

-- B. Teacher Collision: A teacher cannot teach multiple classes at the same (teacher, semester, day, period)
CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_teacher_slot
  ON timetable (teacher_id, COALESCE(semester_id, 'ALL'), day_of_week, period)
  WHERE (teacher_id IS NOT NULL);

-- C. Room Collision: A room cannot be occupied by multiple classes at the same (school, room, semester, day, period)
CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_room_slot
  ON timetable (school_id, room, COALESCE(semester_id, 'ALL'), day_of_week, period)
  WHERE (room IS NOT NULL AND room != '');

-- 5. PERFORMANCE LOOKUP INDEXES
CREATE INDEX IF NOT EXISTS idx_timetable_school ON timetable (school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable (class_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON timetable (teacher_id, semester_id);

-- 6. CANONICAL INITIAL TIMETABLE SEED FOR CLASS 10A1 (BẮC ÂU)
INSERT INTO timetable (
  id, school_id, class_id, subject_id, subject_name, teacher_id, day_of_week, period, start_time, end_time, room, academic_year_id, academic_year, semester_id
) VALUES
  -- Thứ Hai (Day 2)
  ('tt_10a1_d2_p1', 'sch_bacau', 'cls_10A1', 'sub_gdcd', 'Chào cờ & Sinh hoạt tuần', 'usr_teacher_1', 2, 1, '07:30', '08:15', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d2_p2', 'sch_bacau', 'cls_10A1', 'sub_toan', 'Toán học (Đại số)', 'usr_teacher_1', 2, 2, '08:20', '09:05', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d2_p3', 'sch_bacau', 'cls_10A1', 'sub_toan', 'Toán học (Đại số)', 'usr_teacher_1', 2, 3, '09:20', '10:05', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d2_p4', 'sch_bacau', 'cls_10A1', 'sub_nguvan', 'Ngữ văn 10', NULL, 2, 4, '10:10', '10:55', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),

  -- Thứ Ba (Day 3)
  ('tt_10a1_d3_p1', 'sch_bacau', 'cls_10A1', 'sub_hoahoc', 'Hóa học 10', NULL, 3, 1, '07:30', '08:15', 'Phòng Lab 1', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d3_p2', 'sch_bacau', 'cls_10A1', 'sub_sinhhoc', 'Sinh học 10', NULL, 3, 2, '08:20', '09:05', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d3_p3', 'sch_bacau', 'cls_10A1', 'sub_tienganh', 'Tiếng Anh 10', NULL, 3, 3, '09:20', '10:05', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d3_p4', 'sch_bacau', 'cls_10A1', 'sub_tienganh', 'Tiếng Anh 10', NULL, 3, 4, '10:10', '10:55', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),

  -- Thứ Tư (Day 4)
  ('tt_10a1_d4_p1', 'sch_bacau', 'cls_10A1', 'sub_vatly', 'Vật lý 10', NULL, 4, 1, '07:30', '08:15', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d4_p2', 'sch_bacau', 'cls_10A1', 'sub_vatly', 'Vật lý 10', NULL, 4, 2, '08:20', '09:05', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d4_p3', 'sch_bacau', 'cls_10A1', 'sub_nguvan', 'Ngữ văn 10', NULL, 4, 3, '09:20', '10:05', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d4_p4', 'sch_bacau', 'cls_10A1', 'sub_lichsu', 'Lịch sử 10', NULL, 4, 4, '10:10', '10:55', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),

  -- Thứ Năm (Day 5)
  ('tt_10a1_d5_p1', 'sch_bacau', 'cls_10A1', 'sub_toan', 'Toán học (Hình học)', 'usr_teacher_1', 5, 1, '07:30', '08:15', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d5_p2', 'sch_bacau', 'cls_10A1', 'sub_toan', 'Toán học (Hình học)', 'usr_teacher_1', 5, 2, '08:20', '09:05', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d5_p6', 'sch_bacau', 'cls_10A1', 'sub_tinhoc', 'Tin học Python', NULL, 5, 6, '13:30', '14:15', 'Phòng máy Lab 2', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d5_p7', 'sch_bacau', 'cls_10A1', 'sub_tinhoc', 'Tin học Python', NULL, 5, 7, '14:20', '15:05', 'Phòng máy Lab 2', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),

  -- Thứ Sáu (Day 6)
  ('tt_10a1_d6_p1', 'sch_bacau', 'cls_10A1', 'sub_theduc', 'Giáo dục thể chất', NULL, 6, 1, '07:30', '08:15', 'Sân bóng', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d6_p2', 'sch_bacau', 'cls_10A1', 'sub_theduc', 'Giáo dục thể chất', NULL, 6, 2, '08:20', '09:05', 'Sân bóng', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d6_p3', 'sch_bacau', 'cls_10A1', 'sub_tienganh', 'Tiếng Anh 10', NULL, 6, 3, '09:20', '10:05', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1'),
  ('tt_10a1_d6_p4', 'sch_bacau', 'cls_10A1', 'sub_gdcd', 'Sinh hoạt lớp & Đạo đức', 'usr_teacher_1', 6, 4, '10:10', '10:55', 'Phòng 201', 'ay_2024_2025', '2024 - 2025', 'sem_2024_1')
ON CONFLICT (id) DO NOTHING;
