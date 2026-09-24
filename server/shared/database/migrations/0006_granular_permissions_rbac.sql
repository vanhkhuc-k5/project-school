-- Migration 0006: Centralized RBAC & Granular Permissions Engine
-- Registers standard roles, dot-notation permissions, and role_permissions mappings.

-- 1. Ensure all standard system roles exist
INSERT INTO roles (id, name, display_name, description, is_system)
VALUES
  ('role_super_admin', 'super_admin', 'Quản trị viên Cấp cao', 'Toàn quyền quản trị toàn hệ thống đa trường', TRUE),
  ('role_school_admin', 'school_admin', 'Quản trị viên Trường học', 'Toàn quyền quản trị một cơ sở trường học', TRUE),
  ('role_admin', 'admin', 'Quản trị viên', 'Toàn quyền quản trị hệ thống trường học (Legacy Alias)', TRUE),
  ('role_principal', 'principal', 'Hiệu trưởng', 'Ban Giám Hiệu, phê duyệt và giám sát toàn trường', TRUE),
  ('role_vice_principal', 'vice_principal', 'Hiệu phó', 'Phụ trách chuyên môn hoặc cơ sở vật chất', TRUE),
  ('role_dept_head', 'department_head', 'Trưởng bộ môn', 'Quản lý tổ chuyên môn và duyệt học liệu', TRUE),
  ('role_teacher', 'teacher', 'Giáo viên', 'Giảng dạy, quản lý lớp, chấm điểm và chuyên cần', TRUE),
  ('role_student', 'student', 'Học sinh', 'Học tập, nộp bài, xem điểm và tương tác AI', TRUE),
  ('role_parent', 'parent', 'Phụ huynh', 'Theo dõi học tập con cái, học phí và đơn nghỉ', TRUE)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;

-- 2. Register granular permissions with dot-notation
INSERT INTO permissions (id, code, module, description)
VALUES
  -- User management
  ('perm_user_read', 'user.read', 'users', 'Xem danh sách và thông tin người dùng'),
  ('perm_user_create', 'user.create', 'users', 'Tạo tài khoản người dùng mới'),
  ('perm_user_update', 'user.update', 'users', 'Cập nhật thông tin tài khoản người dùng'),
  ('perm_user_disable', 'user.disable', 'users', 'Vô hiệu hóa hoặc khóa tài khoản người dùng'),

  -- Student management
  ('perm_student_read', 'student.read', 'students', 'Xem thông tin hồ sơ học sinh và học bạ'),
  ('perm_student_update', 'student.update', 'students', 'Cập nhật thông tin học sinh'),

  -- Teacher management
  ('perm_teacher_read', 'teacher.read', 'teachers', 'Xem danh sách giáo viên và tổ chuyên môn'),
  ('perm_teacher_manage', 'teacher.manage', 'teachers', 'Quản lý phân công giảng dạy của giáo viên'),

  -- Class & Academic management
  ('perm_class_read', 'class.read', 'academic', 'Xem thông tin lớp học, danh sách lớp và môn học'),
  ('perm_class_manage', 'class.manage', 'academic', 'Tạo, sửa đổi và quản lý lớp học'),

  -- Attendance
  ('perm_attendance_read', 'attendance.read', 'attendance', 'Xem dữ liệu chuyên cần và điểm danh'),
  ('perm_attendance_take', 'attendance.take', 'attendance', 'Thực hiện điểm danh học sinh hàng ngày'),
  ('perm_attendance_correct', 'attendance.correct', 'attendance', 'Điều chỉnh và sửa đổi nhật ký điểm danh'),

  -- Assignments
  ('perm_assignment_read', 'assignment.read', 'assignments', 'Xem danh sách đề bài tập và câu hỏi'),
  ('perm_assignment_create', 'assignment.create', 'assignments', 'Tạo và giao bài kiểm tra / bài tập mới'),
  ('perm_assignment_submit', 'assignment.submit', 'assignments', 'Nộp bài tập cá nhân'),
  ('perm_assignment_grade', 'assignment.grade', 'assignments', 'Chấm điểm và nhận xét bài nộp'),

  -- Grades
  ('perm_grade_read', 'grade.read', 'grades', 'Xem bảng điểm và học bạ điện tử'),
  ('perm_grade_create', 'grade.create', 'grades', 'Nhập điểm thành phần cho học sinh'),
  ('perm_grade_update', 'grade.update', 'grades', 'Chỉnh sửa điểm số'),
  ('perm_grade_publish', 'grade.publish', 'grades', 'Khóa sổ và công bố điểm tổng kết'),

  -- Announcements
  ('perm_announcement_read', 'announcement.read', 'announcements', 'Xem thông báo nhà trường'),
  ('perm_announcement_publish', 'announcement.publish', 'announcements', 'Soạn và phát thông báo toàn trường/lớp'),

  -- Tuition & Finance
  ('perm_tuition_read', 'tuition.read', 'tuition', 'Xem học phí và hóa đơn điện tử'),
  ('perm_tuition_pay', 'tuition.pay', 'tuition', 'Thanh toán học phí qua cổng VietQR'),
  ('perm_tuition_manage', 'tuition.manage', 'tuition', 'Quản lý thu học phí, kế toán và tài chính'),

  -- Audit & Operations
  ('perm_audit_read', 'audit.read', 'audit', 'Xem nhật ký kiểm toán và sự kiện an ninh'),
  ('perm_school_manage', 'school.manage', 'school', 'Cấu hình trường học, năm học và đồng bộ MOET'),

  -- Leave Requests
  ('perm_leave_read', 'leave_request.read', 'operations', 'Xem danh sách đơn xin nghỉ phép'),
  ('perm_leave_create', 'leave_request.create', 'operations', 'Nộp đơn xin nghỉ phép trực tuyến'),
  ('perm_leave_manage', 'leave_request.manage', 'operations', 'Duyệt hoặc từ chối đơn xin phép nghỉ'),

  -- Messaging
  ('perm_message_read', 'message.read', 'messaging', 'Xem tin nhắn trao đổi phụ huynh - giáo viên'),
  ('perm_message_send', 'message.send', 'messaging', 'Gửi tin nhắn trao đổi'),

  -- AI Socratic Tutor
  ('perm_ai_read', 'ai_tutor.read', 'ai', 'Xem lịch sử đàm thoại AI Tutor'),
  ('perm_ai_chat', 'ai_tutor.chat', 'ai', 'Đàm thoại với gia sư Socratic AI')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  module = EXCLUDED.module;

-- 3. Populate role_permissions mapping
-- Super Admin / School Admin / Admin
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_' || substr(md5(r.id || ':' || p.id), 1, 24), r.id, p.id
FROM roles r, permissions p
WHERE r.name IN ('super_admin', 'school_admin', 'admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Principal (Hiệu trưởng)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_' || substr(md5(r.id || ':' || p.id), 1, 24), r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'principal'
  AND p.code IN (
    'user.read', 'user.create', 'user.update',
    'student.read', 'student.update',
    'teacher.read', 'teacher.manage',
    'class.read', 'class.manage',
    'attendance.read', 'attendance.correct',
    'assignment.read',
    'grade.read', 'grade.publish',
    'announcement.read', 'announcement.publish',
    'tuition.read', 'tuition.manage',
    'audit.read',
    'school.manage',
    'leave_request.read', 'leave_request.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Vice Principal (Hiệu phó)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_' || substr(md5(r.id || ':' || p.id), 1, 24), r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'vice_principal'
  AND p.code IN (
    'user.read',
    'student.read', 'student.update',
    'teacher.read',
    'class.read', 'class.manage',
    'attendance.read', 'attendance.correct',
    'assignment.read',
    'grade.read', 'grade.publish',
    'announcement.read', 'announcement.publish',
    'audit.read',
    'leave_request.read', 'leave_request.manage'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Department Head (Trưởng bộ môn)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_' || substr(md5(r.id || ':' || p.id), 1, 24), r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'department_head'
  AND p.code IN (
    'user.read',
    'student.read',
    'teacher.read',
    'class.read',
    'assignment.read', 'assignment.create', 'assignment.grade',
    'grade.read', 'grade.create', 'grade.update',
    'attendance.read',
    'announcement.read', 'announcement.publish'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Teacher (Giáo viên)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_' || substr(md5(r.id || ':' || p.id), 1, 24), r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'teacher'
  AND p.code IN (
    'student.read',
    'teacher.read',
    'class.read',
    'attendance.read', 'attendance.take',
    'assignment.read', 'assignment.create', 'assignment.grade',
    'grade.read', 'grade.create', 'grade.update',
    'announcement.read', 'announcement.publish',
    'leave_request.read', 'leave_request.manage',
    'message.read', 'message.send',
    'ai_tutor.read', 'ai_tutor.chat'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Student (Học sinh)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_' || substr(md5(r.id || ':' || p.id), 1, 24), r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'student'
  AND p.code IN (
    'student.read',
    'class.read',
    'attendance.read',
    'assignment.read', 'assignment.submit',
    'grade.read',
    'announcement.read',
    'ai_tutor.read', 'ai_tutor.chat'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Parent (Phụ huynh)
INSERT INTO role_permissions (id, role_id, permission_id)
SELECT 'rp_' || substr(md5(r.id || ':' || p.id), 1, 24), r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'parent'
  AND p.code IN (
    'student.read',
    'grade.read',
    'attendance.read',
    'announcement.read',
    'tuition.read', 'tuition.pay',
    'leave_request.read', 'leave_request.create',
    'message.read', 'message.send'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
