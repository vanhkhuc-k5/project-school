-- ============================================================
-- EDUPORTAL - SUPABASE SEED DATA
-- Chạy file này trong Supabase SQL Editor sau khi đã chạy schema.sql
-- Mật khẩu mặc định: 123456
-- Mật khẩu tài khoản admin@school.edu.vn: admin@2026
-- ============================================================

-- 1. USERS
INSERT INTO users (id, username, email, password_hash, role, name, code, phone, avatar, must_change_password) VALUES
('usr_admin_root', 'admin', 'admin@school.edu.vn', '$2b$10$iX4FdWoTyVlEMrhA4b90dew/j07OZyNpstsq7AxJElXSnSGjgLrfK', 'admin', 'Quản trị viên hệ thống', 'ADMIN-001', '0901112233', NULL, FALSE),
('usr_admin_1', 'hoainam', 'bgh.hoainam@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'admin', 'GS.TS Vũ Hoài Nam', 'BGH-001', '0901234567', NULL, FALSE),
('usr_teacher_1', 'mailan', 'mailan@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'teacher', 'Cô Mai Lan', 'GV-TOAN-014', '0987654321', NULL, FALSE),
('usr_student_1', 'minhkhang', 'minhkhang@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Nguyễn Minh Khang', 'HS-2024-889', '0912345678', NULL, FALSE),
('usr_student_khoi', 'minhkhoi', 'minhkhoi@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Nguyễn Minh Khôi', 'HS10A1-042', '0911223344', NULL, FALSE),
('usr_student_chau', 'minhchau', 'minhchau@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Nguyễn Minh Châu', 'HS07B-019', '0922334455', NULL, FALSE),
('usr_parent_1', 'vanhoi', 'vanhoi@parent.school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'parent', 'Nguyễn Văn Hồi', 'PH-10A1-042', '0903456789', NULL, FALSE),
('usr_sample_1', 'student_1', 'hs110042@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Trần Minh Khoa', 'HS110042', NULL, NULL, FALSE),
('usr_sample_2', 'student_2', 'hs110018@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Nguyễn Hoàng Yến', 'HS110018', NULL, NULL, FALSE),
('usr_sample_3', 'student_3', 'hs110008@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Lê Quốc Bảo', 'HS110008', NULL, NULL, FALSE),
('usr_sample_4', 'student_4', 'hs110029@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Phạm Thu Hà', 'HS110029', NULL, NULL, FALSE),
('usr_sample_5', 'student_5', 'hs110005@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Vũ Quang Huy', 'HS110005', NULL, NULL, FALSE),
('usr_sample_6', 'student_6', 'hs110051@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Đặng Thùy Linh', 'HS110051', NULL, NULL, FALSE),
('usr_sample_7', 'student_7', 'hs110012@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Bùi Gia Khiêm', 'HS110012', NULL, NULL, FALSE),
('usr_sample_8', 'student_8', 'hs110034@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Đỗ Phương Nga', 'HS110034', NULL, NULL, FALSE),
('usr_sample_9', 'student_9', 'hs110023@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Phan Tuấn Kiệt', 'HS110023', NULL, NULL, FALSE),
('usr_sample_10', 'student_10', 'hs110067@school.edu.vn', '$2b$10$9QLlYbV1nXC3L5/XytpZZOzrMddAtaxPSUaXoSuxYWE0fHWJHMD2i', 'student', 'Hoàng Mỹ Duyên', 'HS110067', NULL, NULL, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 2. SUBJECTS
INSERT INTO subjects (id, name, code, department) VALUES
('sub_toan', 'Toán học', 'TOAN', 'Khoa học tự nhiên'),
('sub_vatly', 'Vật lý', 'VATLY', 'Khoa học tự nhiên'),
('sub_hoahoc', 'Hóa học', 'HOAHOC', 'Khoa học tự nhiên'),
('sub_sinhhoc', 'Sinh học', 'SINHHOC', 'Khoa học tự nhiên'),
('sub_nguvan', 'Ngữ văn', 'NGUVAN', 'Khoa học xã hội'),
('sub_lichsu', 'Lịch sử', 'LICHSU', 'Khoa học xã hội'),
('sub_dialy', 'Địa lý', 'DIALY', 'Khoa học xã hội'),
('sub_gdcd', 'GDCD/GDKTPL', 'GDCD', 'Khoa học xã hội'),
('sub_tienganh', 'Tiếng Anh', 'TIENGANH', 'Ngoại ngữ'),
('sub_tinhoc', 'Tin học', 'TINHOC', 'Khoa học tự nhiên'),
('sub_congnghe', 'Công nghệ', 'CONGNGHE', 'Kỹ thuật'),
('sub_theduc', 'Thể dục', 'THEDUC', 'Thể chất & Nghệ thuật'),
('sub_amnhac', 'Âm nhạc', 'AMNHAC', 'Thể chất & Nghệ thuật'),
('sub_mythuat', 'Mỹ thuật', 'MYTHUAT', 'Thể chất & Nghệ thuật')
ON CONFLICT (id) DO NOTHING;

-- 3. CLASSES
INSERT INTO classes (id, name, grade_level, academic_year, homeroom_teacher_id, max_students) VALUES
('cls_10A1', '10A1', 10, '2024-2025', 'usr_teacher_1', 45),
('cls_10A2', '10A2', 10, '2024-2025', 'usr_teacher_1', 45),
('cls_11A1', '11A1', 11, '2024-2025', NULL, 45),
('cls_07B', '7B', 7, '2024-2025', NULL, 40)
ON CONFLICT (id) DO NOTHING;

-- 4. STUDENTS
INSERT INTO students (id, user_id, class_id, parent_id, gpa, class_rank, attendance_rate) VALUES
('std_khang', 'usr_student_1', 'cls_11A1', NULL, 8.8, '04/40', 99.0),
('std_khoi', 'usr_student_khoi', 'cls_10A1', 'usr_parent_1', 8.8, '03/38', 98.5),
('std_chau', 'usr_student_chau', 'cls_07B', 'usr_parent_1', 9.2, '01/35', 100.0),
('std_sample_1', 'usr_sample_1', 'cls_10A1', NULL, 4.8, '05/42', 60.0),
('std_sample_2', 'usr_sample_2', 'cls_10A1', NULL, 5.2, '06/42', 72.0),
('std_sample_3', 'usr_sample_3', 'cls_10A1', NULL, 5.6, '07/42', 80.0),
('std_sample_4', 'usr_sample_4', 'cls_10A1', NULL, 6.2, '08/42', 85.0),
('std_sample_5', 'usr_sample_5', 'cls_10A1', NULL, 8.4, '09/42', 98.0),
('std_sample_6', 'usr_sample_6', 'cls_10A1', NULL, 9.1, '10/42', 100.0),
('std_sample_7', 'usr_sample_7', 'cls_10A1', NULL, 7.8, '11/42', 92.0),
('std_sample_8', 'usr_sample_8', 'cls_10A1', NULL, 8.6, '12/42', 96.0),
('std_sample_9', 'usr_sample_9', 'cls_10A1', NULL, 6.8, '13/42', 88.0),
('std_sample_10', 'usr_sample_10', 'cls_10A1', NULL, 8.9, '14/42', 100.0)
ON CONFLICT (id) DO NOTHING;

-- 5. TEACHER ASSIGNMENTS
INSERT INTO teacher_assignments (id, teacher_id, class_id, subject_id, academic_year) VALUES
('ta_1', 'usr_teacher_1', 'cls_10A1', 'sub_toan', '2024-2025'),
('ta_2', 'usr_teacher_1', 'cls_10A2', 'sub_toan', '2024-2025'),
('ta_3', 'usr_teacher_1', 'cls_11A1', 'sub_toan', '2024-2025')
ON CONFLICT (id) DO NOTHING;

-- 6. ASSIGNMENTS
INSERT INTO assignments (id, title, subject, type, instructions, target_classes, due_date, due_time, duration_minutes, grading_scale, lock_after_due, shuffle_questions, created_by) VALUES
('asg_toan_10', 'Kiểm tra 15 phút: Đại số chương 2 - Hàm số bậc hai', 'Toán học - Khối 10', 'quiz', 'Học sinh được phép sử dụng máy tính cầm tay.', '["10A1", "10A2"]'::jsonb, '2024-10-25', '23:59', 45, 'Thang 10 (Hệ số 1)', TRUE, TRUE, 'usr_teacher_1'),
('asg_toan_11', 'Đạo hàm hàm số lượng giác & ứng dụng', 'Toán giải tích', 'quiz', '20 câu trắc nghiệm và tự luận.', '["11A1"]'::jsonb, '2024-10-24', '17:00', 45, 'Thang 10', TRUE, FALSE, 'usr_teacher_1'),
('asg_ly_11', 'Định luật Ôm cho toàn mạch', 'Vật lý 11', 'quiz', 'Hoàn thành trước hạn chót.', '["11A1"]'::jsonb, '2024-10-25', '20:00', 45, 'Thang 10', TRUE, FALSE, 'usr_teacher_1'),
('asg_van_11', 'Phân tích hình tượng người lính trong Tây Tiến', 'Ngữ văn', 'essay', 'Bài tối thiểu 1200 từ.', '["11A1"]'::jsonb, '2024-10-26', '23:59', 90, 'Thang 10', TRUE, FALSE, 'usr_teacher_1')
ON CONFLICT (id) DO NOTHING;

-- 7. ASSIGNMENT QUESTIONS
INSERT INTO assignment_questions (id, assignment_id, question_order, prompt, points, has_plot, plot_data, options, explanation) VALUES
('q_10_1', 'asg_toan_10', 1, 'Cho hàm số bậc hai y = ax² + bx + c (a ≠ 0). Tọa độ đỉnh I của parabol là?', 1.0, FALSE, NULL, '[{"id": "A", "text": "A. I(-b/2a ; -Δ/4a)", "isCorrect": true}, {"id": "B", "text": "B. I(b/2a ; -Δ/4a)", "isCorrect": false}, {"id": "C", "text": "C. I(-b/a ; -Δ/2a)", "isCorrect": false}, {"id": "D", "text": "D. I(-b/2a ; -Δ/2a)", "isCorrect": false}]'::jsonb, 'Theo SGK Toán 10 Tập 1, trang 51.'),
('q_10_2', 'asg_toan_10', 2, 'Đồ thị hình bên dưới là hàm số bậc hai nào?', 1.0, TRUE, 'Đỉnh Parabol I(1; -2)', '[{"id": "A", "text": "A. y = -x² + 2x - 1", "isCorrect": false}, {"id": "B", "text": "B. y = x² - 2x - 1", "isCorrect": true}, {"id": "C", "text": "C. y = 2x² - 4x + 1", "isCorrect": false}, {"id": "D", "text": "D. y = x² - x - 2", "isCorrect": false}]'::jsonb, 'Parabol lõm quay lên, a > 0.'),
('q_10_3', 'asg_toan_10', 3, 'Trục đối xứng của y = 2x² - 4x + 5 là?', 1.0, FALSE, NULL, '[{"id": "A", "text": "A. x = 1", "isCorrect": true}, {"id": "B", "text": "B. x = -1", "isCorrect": false}, {"id": "C", "text": "C. x = 2", "isCorrect": false}, {"id": "D", "text": "D. x = -2", "isCorrect": false}]'::jsonb, 'x = -b/(2a) = 4/4 = 1'),
('q_10_4', 'asg_toan_10', 4, 'Tập nghiệm của x² - 5x + 6 ≤ 0 là?', 1.0, FALSE, NULL, '[{"id": "A", "text": "A. [2 ; 3]", "isCorrect": true}, {"id": "B", "text": "B. (2 ; 3)", "isCorrect": false}, {"id": "C", "text": "C. (-∞ ; 2] ∪ [3 ; +∞)", "isCorrect": false}, {"id": "D", "text": "D. (-∞ ; 2) ∪ (3 ; +∞)", "isCorrect": false}]'::jsonb, 'f(x) có nghiệm x1=2, x2=3, a>0.'),
('q_10_5', 'asg_toan_10', 5, 'Quả bóng h(t) = -5t² + 20t + 1. Đạt cực đại tại t = ?', 1.0, FALSE, NULL, '[{"id": "A", "text": "A. t = 2 giây", "isCorrect": true}, {"id": "B", "text": "B. t = 4 giây", "isCorrect": false}, {"id": "C", "text": "C. t = 1.5 giây", "isCorrect": false}, {"id": "D", "text": "D. t = 2.5 giây", "isCorrect": false}]'::jsonb, 't = -20/(2×(-5)) = 2s, h_max = 21m.')
ON CONFLICT (id) DO NOTHING;

-- 8. GRADES
INSERT INTO grades (id, student_id, subject, test_name, score, max_score, coefficient, semester, teacher_name, comment, graded_at) VALUES
('grd_1', 'std_khang', 'Toán học', 'KT 15 phút - Hàm số bậc hai', 9.0, 10, 1, 1, 'Cô Mai Lan', 'Vẽ đồ thị chính xác.', '2024-10-24'),
('grd_2', 'std_khang', 'Vật lý', 'KT 1 tiết - Định luật Newton', 8.5, 10, 2, 1, 'Thầy Hữu Bình', 'Nắm vững phân tích lực.', '2024-10-23'),
('grd_3', 'std_khang', 'Hóa học', 'KT 1 tiết - Oxi hóa khử', 9.5, 10, 2, 1, 'Thầy Tuấn Anh', 'Lập luận chặt chẽ.', '2024-10-23'),
('grd_4', 'std_khang', 'Tiếng Anh', 'Unit 4 Reading', 8.0, 10, 1, 1, 'Cô Mai', 'Cần rèn từ vựng.', '2024-10-22'),
('grd_5', 'std_khang', 'Ngữ văn', 'Bài viết Nghị luận', 7.75, 10, 2, 1, 'Cô Thanh Hằng', 'Cảm thụ sâu sắc.', '2024-10-21'),
('grd_6', 'std_khang', 'Lịch sử', 'KT thường xuyên', 8.5, 10, 1, 1, 'Thầy Hùng', 'Nắm vững sự kiện.', '2024-10-20'),
('grd_7', 'std_khang', 'Sinh học', 'Thực hành tế bào', 9.0, 10, 1, 1, 'Cô Quỳnh Nga', 'Kỹ năng kính hiển vi tốt.', '2024-10-18'),
('grd_8', 'std_khang', 'Tin học', 'Python: Sắp xếp & Tìm kiếm', 10.0, 10, 2, 1, 'Thầy Quang Minh', 'Code tối ưu O(n log n).', '2024-10-16'),
('grd_k1', 'std_khoi', 'Toán Chuyên', 'KT 1 tiết', 9.5, 10, 2, 1, 'Cô Mai Lan', 'Xuất sắc.', '2024-10-23'),
('grd_k2', 'std_khoi', 'Vật Lý', 'Thực hành đo gia tốc', 8.5, 10, 1, 1, 'Thầy Bình', 'Nắm vững nguyên lý.', '2024-10-22'),
('grd_k3', 'std_khoi', 'Hóa Học', 'KT 15 phút', 8.0, 10, 1, 1, 'Thầy Tuấn Anh', 'Tốt.', '2024-10-20'),
('grd_k4', 'std_khoi', 'Tiếng Anh', 'Thuyết trình nhóm', 9.0, 10, 1, 1, 'Cô Mai', 'Phát âm chuẩn.', '2024-10-19')
ON CONFLICT (id) DO NOTHING;

-- 9. COMPETENCIES
INSERT INTO student_competencies (id, student_id, subject, topic, proficiency_percent, is_strength, hint) VALUES
('cmp_1', 'std_khang', 'Toán', 'Đại số & Lượng giác', 92, TRUE, NULL),
('cmp_2', 'std_khang', 'Tiếng Anh', 'Đọc hiểu', 88, TRUE, NULL),
('cmp_3', 'std_khang', 'Hóa học', 'Hóa vô cơ', 85, TRUE, NULL),
('cmp_4', 'std_khang', 'Toán', 'Hình học không gian', 64, FALSE, 'Ôn lại góc giữa 2 mặt phẳng'),
('cmp_5', 'std_khang', 'Tiếng Anh', 'Từ vựng Unit 4', 70, FALSE, 'Ôn 30 từ vựng chuyên đề')
ON CONFLICT (id) DO NOTHING;

-- 10. ATTENDANCE
INSERT INTO attendance (id, student_id, class_id, date, status, recorded_by) VALUES
('att_std_sample_1_2024-10-21', 'std_sample_1', 'cls_10A1', '2024-10-21', 'present', 'usr_teacher_1'),
('att_std_sample_1_2024-10-22', 'std_sample_1', 'cls_10A1', '2024-10-22', 'present', 'usr_teacher_1'),
('att_std_sample_1_2024-10-23', 'std_sample_1', 'cls_10A1', '2024-10-23', 'absent', 'usr_teacher_1'),
('att_std_sample_1_2024-10-24', 'std_sample_1', 'cls_10A1', '2024-10-24', 'present', 'usr_teacher_1'),
('att_std_sample_2_2024-10-21', 'std_sample_2', 'cls_10A1', '2024-10-21', 'present', 'usr_teacher_1'),
('att_std_sample_2_2024-10-22', 'std_sample_2', 'cls_10A1', '2024-10-22', 'present', 'usr_teacher_1'),
('att_std_sample_2_2024-10-23', 'std_sample_2', 'cls_10A1', '2024-10-23', 'present', 'usr_teacher_1'),
('att_std_sample_2_2024-10-24', 'std_sample_2', 'cls_10A1', '2024-10-24', 'late', 'usr_teacher_1'),
('att_std_sample_3_2024-10-21', 'std_sample_3', 'cls_10A1', '2024-10-21', 'present', 'usr_teacher_1'),
('att_std_sample_3_2024-10-22', 'std_sample_3', 'cls_10A1', '2024-10-22', 'present', 'usr_teacher_1'),
('att_std_sample_3_2024-10-23', 'std_sample_3', 'cls_10A1', '2024-10-23', 'present', 'usr_teacher_1'),
('att_std_sample_3_2024-10-24', 'std_sample_3', 'cls_10A1', '2024-10-24', 'present', 'usr_teacher_1')
ON CONFLICT (id) DO NOTHING;

-- 11. TUITION INVOICES
INSERT INTO tuition_invoices (id, student_id, period, total_amount, due_date, status, items, bank_name, account_number, account_name, transfer_memo) VALUES
('inv_khoi_t11', 'std_khoi', 'Tháng 11/2024', 3250000, '2024-11-10', 'unpaid', '[{"label": "Học phí chính khóa", "amount": "1.800.000 đ"}, {"label": "Bán trú & Dinh dưỡng", "amount": "1.150.000 đ"}, {"label": "Quỹ hoạt động", "amount": "300.000 đ"}]'::jsonb, 'Vietcombank', '1029384756', 'TRUONG THPT CHUYEN BAC AU', 'HOCPHI KHOI HS10A1-042 T11'),
('inv_chau_t11', 'std_chau', 'Tháng 11/2024', 2800000, '2024-11-10', 'unpaid', '[{"label": "Học phí THCS", "amount": "1.500.000 đ"}, {"label": "Bán trú & Ăn trưa", "amount": "1.050.000 đ"}, {"label": "CLB Tiếng Anh", "amount": "250.000 đ"}]'::jsonb, 'Vietcombank', '1029384756', 'TRUONG THPT CHUYEN BAC AU', 'HOCPHI CHAU HS07B-019 T11')
ON CONFLICT (id) DO NOTHING;

-- 12. NOTICES
INSERT INTO school_notices (id, title, content, category, tag, tag_type, sender, can_confirm) VALUES
('notif_1', 'Họp phụ huynh giữa HK I', 'Thời gian: 08:30 Chủ Nhật 27/10/2024 tại phòng 302.', 'teacher', 'Cần phản hồi', 'warning', 'GVCN: Cô Lê Hoàng Lan', TRUE),
('notif_2', 'Khen thưởng: Minh Khôi đạt giải Nhất Robot', 'Nhà trường biểu dương thành tích xuất sắc lớp 10A1.', 'school', 'Chúc mừng', 'success', 'Ban Giám Hiệu', FALSE),
('notif_3', 'Khám sức khỏe định kỳ khối 10', 'Phòng Y tế tổ chức khám ngày 29/10/2024.', 'school', 'Kế hoạch', 'info', 'Phòng Y tế', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 13. STUDY RESOURCES
INSERT INTO study_resources (id, subject, title, type, file_size, grade_level, download_url, downloads_count, uploaded_by) VALUES
('res_1', 'Toán học', 'Đề cương ôn thi HK I: Hàm số bậc hai', 'pdf', '3.4 MB', 10, '#', 142, 'Cô Mai Lan'),
('res_2', 'Toán học', '100 câu TN: Hệ thức lượng tam giác', 'exam', '1.8 MB', 10, '#', 98, 'Tổ Toán'),
('res_3', 'Vật lý', 'Lý thuyết & Công thức: Động lực học', 'pdf', '2.6 MB', 10, '#', 115, 'Thầy Bình'),
('res_4', 'Vật lý', 'Video: Ma sát mặt phẳng nghiêng', 'video', '185 MB', 10, '#', 76, 'Thầy Bình'),
('res_5', 'Tiếng Anh', 'Đề thi thử IELTS Reading B2', 'exam', '4.2 MB', 10, '#', 210, 'Cô Mai'),
('res_6', 'Hóa học', 'Sơ đồ tư duy: Bảng tuần hoàn', 'pdf', '5.1 MB', 10, '#', 84, 'Thầy Tuấn Anh'),
('res_7', 'Ngữ văn', 'Kỹ năng viết Nghị luận xã hội', 'pdf', '1.2 MB', 10, '#', 165, 'Cô Hương'),
('res_8', 'Tin học', 'Giáo trình Python cơ bản–nâng cao', 'pdf', '8.9 MB', 10, '#', 190, 'Thầy Quang Minh')
ON CONFLICT (id) DO NOTHING;

-- 14. LEAVE REQUESTS
INSERT INTO leave_requests (id, student_id, parent_id, start_date, end_date, reason, status) VALUES
('lr_1', 'std_khoi', 'usr_parent_1', '2024-10-28', '2024-10-28', 'Con bị sốt, xin nghỉ 1 ngày.', 'approved')
ON CONFLICT (id) DO NOTHING;

-- 15. MESSAGES
INSERT INTO messages (id, sender_id, receiver_id, student_id, subject, content, is_read) VALUES
('msg_1', 'usr_parent_1', 'usr_teacher_1', 'std_khoi', 'Hỏi về kết quả kiểm tra', 'Chào cô, em muốn hỏi về bài kiểm tra 1 tiết Toán vừa rồi của con em. Cảm ơn cô.', FALSE)
ON CONFLICT (id) DO NOTHING;
