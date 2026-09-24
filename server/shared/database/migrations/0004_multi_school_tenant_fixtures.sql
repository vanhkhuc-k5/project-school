-- ========================================================================
-- Migration 0004: Multi-School Tenant Isolation & Test Fixtures
-- Seeds second tenant (School B: Trường THPT Hoa Sen - sch_hoasen)
-- and tenant-aware unique constraints.
-- ========================================================================

-- 1. Tenant-aware unique constraint on classes (same class name allowed across schools, unique within school)
CREATE UNIQUE INDEX IF NOT EXISTS uq_classes_school_name ON classes(school_id, name);

-- 2. Seed School B: THPT Hoa Sen
INSERT INTO schools (id, code, name, short_name, email, phone, address, principal_name, status)
VALUES (
  'sch_hoasen',
  'HOASEN_THPT',
  'Trường THPT Hoa Sen',
  'THPT Hoa Sen',
  'bgh@hoasen.edu.vn',
  '028.3812.3456',
  'Số 45 Đường Hoa Sen, Quận 1, TP. Hồ Chí Minh',
  'Thầy Lê Quốc Tuấn',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- 3. Academic Year for School B
INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_current)
VALUES (
  'ay_hoasen_2024',
  'sch_hoasen',
  '2024 - 2025',
  '2024-09-05',
  '2025-05-31',
  TRUE
) ON CONFLICT (id) DO NOTHING;

INSERT INTO semesters (id, school_id, academic_year_id, name, semester_number, start_date, end_date, is_current)
VALUES 
  ('sem_hoasen_1', 'sch_hoasen', 'ay_hoasen_2024', 'Học kỳ I', 1, '2024-09-05', '2025-01-15', TRUE),
  ('sem_hoasen_2', 'sch_hoasen', 'ay_hoasen_2024', 'Học kỳ II', 2, '2025-01-16', '2025-05-31', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 4. Users in School B (Default password hash corresponds to '123456')
-- Admin School B
INSERT INTO users (id, username, email, password_hash, role, name, code, phone, avatar, must_change_password, is_active, school_id)
VALUES (
  'usr_admin_hoasen',
  'admin_hoasen',
  'admin@hoasen.edu.vn',
  '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i',
  'admin',
  'Quản trị viên THPT Hoa Sen',
  'HS-ADM-01',
  '0909000001',
  NULL,
  FALSE,
  TRUE,
  'sch_hoasen'
) ON CONFLICT (id) DO UPDATE SET school_id = 'sch_hoasen';

-- Teacher School B
INSERT INTO users (id, username, email, password_hash, role, name, code, phone, avatar, must_change_password, is_active, school_id)
VALUES (
  'usr_teacher_hoasen',
  'teacher_hoasen',
  'teacher@hoasen.edu.vn',
  '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i',
  'teacher',
  'Thầy Trần Quốc Toản',
  'HS-GV-01',
  '0909000002',
  NULL,
  FALSE,
  TRUE,
  'sch_hoasen'
) ON CONFLICT (id) DO UPDATE SET school_id = 'sch_hoasen';

-- Student School B
INSERT INTO users (id, username, email, password_hash, role, name, code, phone, avatar, must_change_password, is_active, school_id)
VALUES (
  'usr_student_hoasen_1',
  'student_hoasen',
  'student@hoasen.edu.vn',
  '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i',
  'student',
  'Trần Văn An',
  'HS-HS-01',
  '0909000003',
  NULL,
  FALSE,
  TRUE,
  'sch_hoasen'
) ON CONFLICT (id) DO UPDATE SET school_id = 'sch_hoasen';

-- Parent School B
INSERT INTO users (id, username, email, password_hash, role, name, code, phone, avatar, must_change_password, is_active, school_id)
VALUES (
  'usr_parent_hoasen',
  'parent_hoasen',
  'parent@hoasen.edu.vn',
  '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i',
  'parent',
  'Trần Văn Bình',
  'HS-PH-01',
  '0909000004',
  NULL,
  FALSE,
  TRUE,
  'sch_hoasen'
) ON CONFLICT (id) DO UPDATE SET school_id = 'sch_hoasen';

-- 5. Class in School B
INSERT INTO classes (id, name, grade_level, academic_year, homeroom_teacher_id, max_students, school_id, academic_year_id)
VALUES (
  'cls_hoasen_10A1',
  '10A1-HoaSen',
  10,
  '2024-2025',
  'usr_teacher_hoasen',
  40,
  'sch_hoasen',
  'ay_hoasen_2024'
) ON CONFLICT (id) DO UPDATE SET school_id = 'sch_hoasen';

-- 6. Student record in School B
INSERT INTO students (id, user_id, class_id, parent_id, gpa, class_rank, attendance_rate, school_id, current_class_id, status)
VALUES (
  'std_hoasen_1',
  'usr_student_hoasen_1',
  'cls_hoasen_10A1',
  'usr_parent_hoasen',
  8.8,
  'Giỏi',
  98.5,
  'sch_hoasen',
  'cls_hoasen_10A1',
  'active'
) ON CONFLICT (id) DO UPDATE SET school_id = 'sch_hoasen';

-- 7. Parent & Student Relationship in School B
INSERT INTO parents (id, user_id, school_id, occupation, workplace)
VALUES (
  'par_hoasen_1',
  'usr_parent_hoasen',
  'sch_hoasen',
  'Kỹ sư',
  'Công ty Công nghệ ABC'
) ON CONFLICT (id) DO UPDATE SET school_id = 'sch_hoasen';

INSERT INTO parent_students (id, parent_id, student_id, relationship, is_primary_contact)
VALUES (
  'ps_hoasen_1',
  'par_hoasen_1',
  'std_hoasen_1',
  'father',
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- 8. Teacher record in School B
INSERT INTO teachers (id, user_id, school_id, homeroom_class_id, specialty, qualification, status)
VALUES (
  'tch_hoasen_1',
  'usr_teacher_hoasen',
  'sch_hoasen',
  'cls_hoasen_10A1',
  'Toán học',
  'Thạc sĩ Toán',
  'active'
) ON CONFLICT (id) DO UPDATE SET school_id = 'sch_hoasen';

-- 9. Assignment & Submission in School B
INSERT INTO assignments (id, title, subject, type, instructions, target_classes, due_date, due_time, duration_minutes, grading_scale, lock_after_due, shuffle_questions, created_by, school_id, academic_year_id, semester_id)
VALUES (
  'asg_hoasen_1',
  'Bài kiểm tra Toán Hoa Sen',
  'Toán học',
  'quiz',
  'Kiểm tra định kỳ môn Toán lớp 10A1 Trường Hoa Sen',
  '["cls_hoasen_10A1"]',
  '2025-12-31',
  '23:59',
  45,
  'Thang 10 (Hệ số 1)',
  TRUE,
  TRUE,
  'usr_teacher_hoasen',
  'sch_hoasen',
  'ay_hoasen_2024',
  'sem_hoasen_1'
) ON CONFLICT (id) DO UPDATE SET school_id = 'sch_hoasen';

INSERT INTO assignment_submissions (id, assignment_id, student_id, status, score, student_answers, teacher_feedback)
VALUES (
  'sub_hoasen_1',
  'asg_hoasen_1',
  'std_hoasen_1',
  'submitted',
  9.0,
  '{"1": "A", "2": "B"}',
  'Làm bài tốt'
) ON CONFLICT (id) DO NOTHING;
