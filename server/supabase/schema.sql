-- ============================================================
-- EDUPORTAL - SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Chạy toàn bộ file này trong: Supabase Dashboard -> SQL Editor
-- ============================================================

-- Bật extension mở rộng nếu cần
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS & PHÂN QUYỀN
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
    name TEXT NOT NULL,
    code TEXT,
    phone TEXT,
    avatar TEXT,
    must_change_password BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. MÔN HỌC & HỌC VỤ
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade_level INTEGER NOT NULL,
    academic_year TEXT NOT NULL,
    homeroom_teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    max_students INTEGER DEFAULT 45
);

CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    parent_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    gpa DOUBLE PRECISION DEFAULT 0,
    class_rank TEXT,
    attendance_rate DOUBLE PRECISION DEFAULT 100
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    UNIQUE(teacher_id, class_id, subject_id, academic_year)
);

-- ============================================================
-- 3. BÀI TẬP & KIỂM TRA
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'quiz' CHECK (type IN ('quiz', 'essay', 'attachment')),
    instructions TEXT,
    target_classes JSONB NOT NULL DEFAULT '[]'::jsonb,
    due_date TEXT NOT NULL,
    due_time TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 45,
    grading_scale TEXT DEFAULT 'Thang 10 (Hệ số 1)',
    lock_after_due BOOLEAN DEFAULT TRUE,
    shuffle_questions BOOLEAN DEFAULT TRUE,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignment_questions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    points DOUBLE PRECISION DEFAULT 1.0,
    has_plot BOOLEAN DEFAULT FALSE,
    plot_data TEXT,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    explanation TEXT
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('in_progress', 'submitted', 'graded')),
    score DOUBLE PRECISION,
    student_answers JSONB,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    teacher_feedback TEXT
);

-- ============================================================
-- 4. ĐIỂM SỐ & NĂNG LỰC
-- ============================================================
CREATE TABLE IF NOT EXISTS grades (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    test_name TEXT NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    max_score DOUBLE PRECISION DEFAULT 10,
    coefficient DOUBLE PRECISION DEFAULT 1.0,
    semester INTEGER DEFAULT 1,
    teacher_name TEXT NOT NULL,
    comment TEXT,
    graded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_competencies (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    proficiency_percent INTEGER NOT NULL,
    is_strength BOOLEAN NOT NULL DEFAULT TRUE,
    hint TEXT
);

-- ============================================================
-- 5. ĐIỂM DANH & THỜI KHÓA BIỂU
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    note TEXT,
    recorded_by TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS timetable (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    subject_name TEXT NOT NULL,
    teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 2 AND 7),
    period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 10),
    room TEXT,
    academic_year TEXT NOT NULL,
    UNIQUE(class_id, day_of_week, period, academic_year)
);

-- ============================================================
-- 6. TÀI CHÍNH: HỌC PHÍ
-- ============================================================
CREATE TABLE IF NOT EXISTS tuition_invoices (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    period TEXT NOT NULL,
    total_amount BIGINT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue')),
    paid_at TIMESTAMPTZ,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    transfer_memo TEXT NOT NULL
);

-- ============================================================
-- 7. THÔNG BÁO & TIN NHẮN & NGHỈ PHÉP
-- ============================================================
CREATE TABLE IF NOT EXISTS school_notices (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('teacher', 'school', 'system')),
    tag TEXT,
    tag_type TEXT DEFAULT 'info',
    sender TEXT NOT NULL,
    can_confirm BOOLEAN DEFAULT FALSE,
    confirmed_by_users JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id TEXT,
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. AI TUTOR & HỌC LIỆU & AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_tutor_messages (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('ai', 'user')),
    text TEXT,
    has_image BOOLEAN DEFAULT FALSE,
    image_caption TEXT,
    ocr_status TEXT,
    ai_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_resources (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'video', 'exam', 'slides')),
    file_size TEXT,
    grade_level INTEGER NOT NULL,
    download_url TEXT,
    downloads_count INTEGER DEFAULT 0,
    uploaded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    badge TEXT,
    badge_type TEXT DEFAULT 'neutral',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. INDEXES TỐI ƯU HIỆU NĂNG TRUY VẤN
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_leave_requests_student ON leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable(class_id, academic_year);

-- ============================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- Cấu hình bảo mật dữ liệu, cho phép service_role truy cập đầy đủ
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Cho phép Express Backend (Service Role) truy cập mọi bảng
DO $$
BEGIN
    DROP POLICY IF EXISTS "Service role access all users" ON users;
    CREATE POLICY "Service role access all users" ON users FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all subjects" ON subjects;
    CREATE POLICY "Service role access all subjects" ON subjects FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all classes" ON classes;
    CREATE POLICY "Service role access all classes" ON classes FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all students" ON students;
    CREATE POLICY "Service role access all students" ON students FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all teacher_assignments" ON teacher_assignments;
    CREATE POLICY "Service role access all teacher_assignments" ON teacher_assignments FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all assignments" ON assignments;
    CREATE POLICY "Service role access all assignments" ON assignments FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all questions" ON assignment_questions;
    CREATE POLICY "Service role access all questions" ON assignment_questions FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all submissions" ON assignment_submissions;
    CREATE POLICY "Service role access all submissions" ON assignment_submissions FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all grades" ON grades;
    CREATE POLICY "Service role access all grades" ON grades FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all competencies" ON student_competencies;
    CREATE POLICY "Service role access all competencies" ON student_competencies FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all attendance" ON attendance;
    CREATE POLICY "Service role access all attendance" ON attendance FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all timetable" ON timetable;
    CREATE POLICY "Service role access all timetable" ON timetable FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all tuition" ON tuition_invoices;
    CREATE POLICY "Service role access all tuition" ON tuition_invoices FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all notices" ON school_notices;
    CREATE POLICY "Service role access all notices" ON school_notices FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all messages" ON messages;
    CREATE POLICY "Service role access all messages" ON messages FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all leave_requests" ON leave_requests;
    CREATE POLICY "Service role access all leave_requests" ON leave_requests FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all ai_tutor" ON ai_tutor_messages;
    CREATE POLICY "Service role access all ai_tutor" ON ai_tutor_messages FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all resources" ON study_resources;
    CREATE POLICY "Service role access all resources" ON study_resources FOR ALL TO service_role USING (true);

    DROP POLICY IF EXISTS "Service role access all audit_logs" ON audit_logs;
    CREATE POLICY "Service role access all audit_logs" ON audit_logs FOR ALL TO service_role USING (true);
END $$;
