import bcrypt from 'bcryptjs';
import { db, initSchema } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

/**
 * Seed database — 2 chế độ:
 *   mode='demo': Tạo dữ liệu demo đầy đủ để dev/test
 *   mode='init': Chỉ tạo 1 admin mặc định, trường trống để nhập liệu thật
 *
 * Chạy: node server/seed.js          → demo mode
 *        node server/seed.js --init   → init mode (production)
 */
export function seedDatabase(mode = 'demo') {
  initSchema();

  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count > 0) {
    console.log(`ℹ️  Database đã có ${existingUsers.count} users — bỏ qua seed.`);
    return;
  }

  if (mode === 'init') {
    seedInitMode();
  } else {
    seedDemoMode();
  }
}

// ============================================================
// INIT MODE: Chỉ admin mặc định + cấu trúc trống
// ============================================================
function seedInitMode() {
  console.log('🏫 Seed INIT mode: tạo admin mặc định...');
  const hash = bcrypt.hashSync('admin@2026', BCRYPT_ROUNDS);

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, name, code, phone, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('usr_admin_root', 'admin', 'admin@school.edu.vn', hash, 'admin', 'Quản trị viên hệ thống', 'ADMIN-001', null, 1);

  // Seed môn học chuẩn THPT
  seedSubjects();

  console.log('✅ Init mode hoàn tất. Đăng nhập: admin / admin@2026 (phải đổi mật khẩu lần đầu)');
}

// ============================================================
// DEMO MODE: Dữ liệu demo đầy đủ
// ============================================================
function seedDemoMode() {
  console.log('🎓 Seed DEMO mode: tạo dữ liệu demo đầy đủ...');

  const passwordHash = bcrypt.hashSync('123456', BCRYPT_ROUNDS);

  // ──── 1. Users ────
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, name, code, phone, avatar, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('usr_student_1', 'minhkhang', 'minhkhang@school.edu.vn', passwordHash, 'student', 'Nguyễn Minh Khang', 'HS-2024-889', '0912345678', null, 0);
  insertUser.run('usr_teacher_1', 'mailan', 'mailan@school.edu.vn', passwordHash, 'teacher', 'Cô Mai Lan', 'GV-TOAN-014', '0987654321', null, 0);
  insertUser.run('usr_parent_1', 'vanhoi', 'vanhoi@parent.school.edu.vn', passwordHash, 'parent', 'Nguyễn Văn Hồi', 'PH-10A1-042', '0903456789', null, 0);
  insertUser.run('usr_admin_1', 'hoainam', 'bgh.hoainam@school.edu.vn', passwordHash, 'admin', 'GS.TS Vũ Hoài Nam', 'BGH-001', '0901234567', null, 0);

  // ──── 2. Môn học ────
  seedSubjects();

  // ──── 3. Classes ────
  const insertClass = db.prepare(`
    INSERT INTO classes (id, name, grade_level, academic_year, homeroom_teacher_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertClass.run('cls_10A1', '10A1', 10, '2024-2025', 'usr_teacher_1');
  insertClass.run('cls_10A2', '10A2', 10, '2024-2025', 'usr_teacher_1');
  insertClass.run('cls_11A1', '11A1', 11, '2024-2025', null);
  insertClass.run('cls_07B', '7B', 7, '2024-2025', null);

  // ──── 4. Students ────
  const insertStudent = db.prepare(`
    INSERT INTO students (id, user_id, class_id, parent_id, gpa, class_rank, attendance_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertStudent.run('std_khang', 'usr_student_1', 'cls_11A1', null, 8.8, '04/40', 99.0);

  // Children of parent
  insertUser.run('usr_student_khoi', 'minhkhoi', 'minhkhoi@school.edu.vn', passwordHash, 'student', 'Nguyễn Minh Khôi', 'HS10A1-042', '0911223344', null, 0);
  insertStudent.run('std_khoi', 'usr_student_khoi', 'cls_10A1', 'usr_parent_1', 8.8, '03/38', 98.5);

  insertUser.run('usr_student_chau', 'minhchau', 'minhchau@school.edu.vn', passwordHash, 'student', 'Nguyễn Minh Châu', 'HS07B-019', '0922334455', null, 0);
  insertStudent.run('std_chau', 'usr_student_chau', 'cls_07B', 'usr_parent_1', 9.2, '01/35', 100.0);

  // ──── 5. Sample class 10A1 students ────
  const sampleNames = [
    { name: 'Trần Minh Khoa', code: 'HS110042', gpa: 4.8, rate: 60 },
    { name: 'Nguyễn Hoàng Yến', code: 'HS110018', gpa: 5.2, rate: 72 },
    { name: 'Lê Quốc Bảo', code: 'HS110008', gpa: 5.6, rate: 80 },
    { name: 'Phạm Thu Hà', code: 'HS110029', gpa: 6.2, rate: 85 },
    { name: 'Vũ Quang Huy', code: 'HS110005', gpa: 8.4, rate: 98 },
    { name: 'Đặng Thùy Linh', code: 'HS110051', gpa: 9.1, rate: 100 },
    { name: 'Bùi Gia Khiêm', code: 'HS110012', gpa: 7.8, rate: 92 },
    { name: 'Đỗ Phương Nga', code: 'HS110034', gpa: 8.6, rate: 96 },
    { name: 'Phan Tuấn Kiệt', code: 'HS110023', gpa: 6.8, rate: 88 },
    { name: 'Hoàng Mỹ Duyên', code: 'HS110067', gpa: 8.9, rate: 100 },
  ];

  sampleNames.forEach((s, idx) => {
    const uId = `usr_sample_${idx + 1}`;
    insertUser.run(uId, `student_${idx + 1}`, `${s.code.toLowerCase()}@school.edu.vn`, passwordHash, 'student', s.name, s.code, null, null, 0);
    insertStudent.run(`std_sample_${idx + 1}`, uId, 'cls_10A1', null, s.gpa, `${idx + 5}/42`, s.rate);
  });

  // ──── 6. Teacher-Class Assignments ────
  const insertTA = db.prepare(`
    INSERT OR IGNORE INTO teacher_assignments (id, teacher_id, class_id, subject_id, academic_year)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertTA.run('ta_1', 'usr_teacher_1', 'cls_10A1', 'sub_toan', '2024-2025');
  insertTA.run('ta_2', 'usr_teacher_1', 'cls_10A2', 'sub_toan', '2024-2025');
  insertTA.run('ta_3', 'usr_teacher_1', 'cls_11A1', 'sub_toan', '2024-2025');

  // ──── 7. Assignments ────
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (id, title, subject, type, instructions, target_classes, due_date, due_time, duration_minutes, grading_scale, lock_after_due, shuffle_questions, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAssignment.run('asg_toan_10', 'Kiểm tra 15 phút: Đại số chương 2 - Hàm số bậc hai', 'Toán học - Khối 10', 'quiz', 'Học sinh được phép sử dụng máy tính cầm tay.', JSON.stringify(['10A1', '10A2']), '2024-10-25', '23:59', 45, 'Thang 10 (Hệ số 1)', 1, 1, 'usr_teacher_1');
  insertAssignment.run('asg_toan_11', 'Đạo hàm hàm số lượng giác & ứng dụng', 'Toán giải tích', 'quiz', '20 câu trắc nghiệm và tự luận.', JSON.stringify(['11A1']), '2024-10-24', '17:00', 45, 'Thang 10', 1, 0, 'usr_teacher_1');
  insertAssignment.run('asg_ly_11', 'Định luật Ôm cho toàn mạch', 'Vật lý 11', 'quiz', 'Hoàn thành trước hạn chót.', JSON.stringify(['11A1']), '2024-10-25', '20:00', 45, 'Thang 10', 1, 0, 'usr_teacher_1');
  insertAssignment.run('asg_van_11', 'Phân tích hình tượng người lính trong Tây Tiến', 'Ngữ văn', 'essay', 'Bài tối thiểu 1200 từ.', JSON.stringify(['11A1']), '2024-10-26', '23:59', 90, 'Thang 10', 1, 0, 'usr_teacher_1');

  // ──── 8. Assignment Questions ────
  const insertQuestion = db.prepare(`
    INSERT INTO assignment_questions (id, assignment_id, question_order, prompt, points, has_plot, plot_data, options, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertQuestion.run('q_10_1', 'asg_toan_10', 1, 'Cho hàm số bậc hai y = ax² + bx + c (a ≠ 0). Tọa độ đỉnh I của parabol là?', 1.0, 0, null, JSON.stringify([
    { id: 'A', text: 'A. I(-b/2a ; -Δ/4a)', isCorrect: true },
    { id: 'B', text: 'B. I(b/2a ; -Δ/4a)', isCorrect: false },
    { id: 'C', text: 'C. I(-b/a ; -Δ/2a)', isCorrect: false },
    { id: 'D', text: 'D. I(-b/2a ; -Δ/2a)', isCorrect: false },
  ]), 'Theo SGK Toán 10 Tập 1, trang 51.');

  insertQuestion.run('q_10_2', 'asg_toan_10', 2, 'Đồ thị hình bên dưới là hàm số bậc hai nào?', 1.0, 1, 'Đỉnh Parabol I(1; -2)', JSON.stringify([
    { id: 'A', text: 'A. y = -x² + 2x - 1', isCorrect: false },
    { id: 'B', text: 'B. y = x² - 2x - 1', isCorrect: true },
    { id: 'C', text: 'C. y = 2x² - 4x + 1', isCorrect: false },
    { id: 'D', text: 'D. y = x² - x - 2', isCorrect: false },
  ]), 'Parabol lõm quay lên, a > 0.');

  insertQuestion.run('q_10_3', 'asg_toan_10', 3, 'Trục đối xứng của y = 2x² - 4x + 5 là?', 1.0, 0, null, JSON.stringify([
    { id: 'A', text: 'A. x = 1', isCorrect: true },
    { id: 'B', text: 'B. x = -1', isCorrect: false },
    { id: 'C', text: 'C. x = 2', isCorrect: false },
    { id: 'D', text: 'D. x = -2', isCorrect: false },
  ]), 'x = -b/(2a) = 4/4 = 1');

  insertQuestion.run('q_10_4', 'asg_toan_10', 4, 'Tập nghiệm của x² - 5x + 6 ≤ 0 là?', 1.0, 0, null, JSON.stringify([
    { id: 'A', text: 'A. [2 ; 3]', isCorrect: true },
    { id: 'B', text: 'B. (2 ; 3)', isCorrect: false },
    { id: 'C', text: 'C. (-∞ ; 2] ∪ [3 ; +∞)', isCorrect: false },
    { id: 'D', text: 'D. (-∞ ; 2) ∪ (3 ; +∞)', isCorrect: false },
  ]), 'f(x) có nghiệm x1=2, x2=3, a>0.');

  insertQuestion.run('q_10_5', 'asg_toan_10', 5, 'Quả bóng h(t) = -5t² + 20t + 1. Đạt cực đại tại t = ?', 1.0, 0, null, JSON.stringify([
    { id: 'A', text: 'A. t = 2 giây', isCorrect: true },
    { id: 'B', text: 'B. t = 4 giây', isCorrect: false },
    { id: 'C', text: 'C. t = 1.5 giây', isCorrect: false },
    { id: 'D', text: 'D. t = 2.5 giây', isCorrect: false },
  ]), 't = -20/(2×(-5)) = 2s, h_max = 21m.');

  // ──── 9. Grades ────
  const insertGrade = db.prepare(`
    INSERT INTO grades (id, student_id, subject, test_name, score, max_score, coefficient, semester, teacher_name, comment, graded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertGrade.run('grd_1', 'std_khang', 'Toán học', 'KT 15 phút - Hàm số bậc hai', 9.0, 10, 1, 1, 'Cô Mai Lan', 'Vẽ đồ thị chính xác.', '2024-10-24');
  insertGrade.run('grd_2', 'std_khang', 'Vật lý', 'KT 1 tiết - Định luật Newton', 8.5, 10, 2, 1, 'Thầy Hữu Bình', 'Nắm vững phân tích lực.', '2024-10-23');
  insertGrade.run('grd_3', 'std_khang', 'Hóa học', 'KT 1 tiết - Oxi hóa khử', 9.5, 10, 2, 1, 'Thầy Tuấn Anh', 'Lập luận chặt chẽ.', '2024-10-23');
  insertGrade.run('grd_4', 'std_khang', 'Tiếng Anh', 'Unit 4 Reading', 8.0, 10, 1, 1, 'Cô Mai', 'Cần rèn từ vựng.', '2024-10-22');
  insertGrade.run('grd_5', 'std_khang', 'Ngữ văn', 'Bài viết Nghị luận', 7.75, 10, 2, 1, 'Cô Thanh Hằng', 'Cảm thụ sâu sắc.', '2024-10-21');
  insertGrade.run('grd_6', 'std_khang', 'Lịch sử', 'KT thường xuyên', 8.5, 10, 1, 1, 'Thầy Hùng', 'Nắm vững sự kiện.', '2024-10-20');
  insertGrade.run('grd_7', 'std_khang', 'Sinh học', 'Thực hành tế bào', 9.0, 10, 1, 1, 'Cô Quỳnh Nga', 'Kỹ năng kính hiển vi tốt.', '2024-10-18');
  insertGrade.run('grd_8', 'std_khang', 'Tin học', 'Python: Sắp xếp & Tìm kiếm', 10.0, 10, 2, 1, 'Thầy Quang Minh', 'Code tối ưu O(n log n).', '2024-10-16');

  insertGrade.run('grd_k1', 'std_khoi', 'Toán Chuyên', 'KT 1 tiết', 9.5, 10, 2, 1, 'Cô Mai Lan', 'Xuất sắc.', '2024-10-23');
  insertGrade.run('grd_k2', 'std_khoi', 'Vật Lý', 'Thực hành đo gia tốc', 8.5, 10, 1, 1, 'Thầy Bình', 'Nắm vững nguyên lý.', '2024-10-22');
  insertGrade.run('grd_k3', 'std_khoi', 'Hóa Học', 'KT 15 phút', 8.0, 10, 1, 1, 'Thầy Tuấn Anh', 'Tốt.', '2024-10-20');
  insertGrade.run('grd_k4', 'std_khoi', 'Tiếng Anh', 'Thuyết trình nhóm', 9.0, 10, 1, 1, 'Cô Mai', 'Phát âm chuẩn.', '2024-10-19');

  // ──── 10. Competencies ────
  const insertComp = db.prepare(`
    INSERT INTO student_competencies (id, student_id, subject, topic, proficiency_percent, is_strength, hint)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertComp.run('cmp_1', 'std_khang', 'Toán', 'Đại số & Lượng giác', 92, 1, null);
  insertComp.run('cmp_2', 'std_khang', 'Tiếng Anh', 'Đọc hiểu', 88, 1, null);
  insertComp.run('cmp_3', 'std_khang', 'Hóa học', 'Hóa vô cơ', 85, 1, null);
  insertComp.run('cmp_4', 'std_khang', 'Toán', 'Hình học không gian', 64, 0, 'Ôn lại góc giữa 2 mặt phẳng');
  insertComp.run('cmp_5', 'std_khang', 'Tiếng Anh', 'Từ vựng Unit 4', 70, 0, 'Ôn 30 từ vựng chuyên đề');

  // ──── 11. Tuition Invoices ────
  const insertTuition = db.prepare(`
    INSERT INTO tuition_invoices (id, student_id, period, total_amount, due_date, status, items, bank_name, account_number, account_name, transfer_memo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTuition.run('inv_khoi_t11', 'std_khoi', 'Tháng 11/2024', 3250000, '2024-11-10', 'unpaid', JSON.stringify([
    { label: 'Học phí chính khóa', amount: '1.800.000 đ' },
    { label: 'Bán trú & Dinh dưỡng', amount: '1.150.000 đ' },
    { label: 'Quỹ hoạt động', amount: '300.000 đ' },
  ]), 'Vietcombank', '1029384756', 'TRUONG THPT CHUYEN BAC AU', 'HOCPHI KHOI HS10A1-042 T11');

  insertTuition.run('inv_chau_t11', 'std_chau', 'Tháng 11/2024', 2800000, '2024-11-10', 'unpaid', JSON.stringify([
    { label: 'Học phí THCS', amount: '1.500.000 đ' },
    { label: 'Bán trú & Ăn trưa', amount: '1.050.000 đ' },
    { label: 'CLB Tiếng Anh', amount: '250.000 đ' },
  ]), 'Vietcombank', '1029384756', 'TRUONG THPT CHUYEN BAC AU', 'HOCPHI CHAU HS07B-019 T11');

  // ──── 12. Notices ────
  const insertNotice = db.prepare(`
    INSERT INTO school_notices (id, title, content, category, tag, tag_type, sender, can_confirm)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertNotice.run('notif_1', 'Họp phụ huynh giữa HK I', 'Thời gian: 08:30 Chủ Nhật 27/10/2024 tại phòng 302.', 'teacher', 'Cần phản hồi', 'warning', 'GVCN: Cô Lê Hoàng Lan', 1);
  insertNotice.run('notif_2', 'Khen thưởng: Minh Khôi đạt giải Nhất Robot', 'Nhà trường biểu dương thành tích xuất sắc lớp 10A1.', 'school', 'Chúc mừng', 'success', 'Ban Giám Hiệu', 0);
  insertNotice.run('notif_3', 'Khám sức khỏe định kỳ khối 10', 'Phòng Y tế tổ chức khám ngày 29/10/2024.', 'school', 'Kế hoạch', 'info', 'Phòng Y tế', 0);

  // ──── 13. Study Resources ────
  const insertResource = db.prepare(`
    INSERT INTO study_resources (id, subject, title, type, file_size, grade_level, download_url, downloads_count, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertResource.run('res_1', 'Toán học', 'Đề cương ôn thi HK I: Hàm số bậc hai', 'pdf', '3.4 MB', 10, '#', 142, 'Cô Mai Lan');
  insertResource.run('res_2', 'Toán học', '100 câu TN: Hệ thức lượng tam giác', 'exam', '1.8 MB', 10, '#', 98, 'Tổ Toán');
  insertResource.run('res_3', 'Vật lý', 'Lý thuyết & Công thức: Động lực học', 'pdf', '2.6 MB', 10, '#', 115, 'Thầy Bình');
  insertResource.run('res_4', 'Vật lý', 'Video: Ma sát mặt phẳng nghiêng', 'video', '185 MB', 10, '#', 76, 'Thầy Bình');
  insertResource.run('res_5', 'Tiếng Anh', 'Đề thi thử IELTS Reading B2', 'exam', '4.2 MB', 10, '#', 210, 'Cô Mai');
  insertResource.run('res_6', 'Hóa học', 'Sơ đồ tư duy: Bảng tuần hoàn', 'pdf', '5.1 MB', 10, '#', 84, 'Thầy Tuấn Anh');
  insertResource.run('res_7', 'Ngữ văn', 'Kỹ năng viết Nghị luận xã hội', 'pdf', '1.2 MB', 10, '#', 165, 'Cô Hương');
  insertResource.run('res_8', 'Tin học', 'Giáo trình Python cơ bản–nâng cao', 'pdf', '8.9 MB', 10, '#', 190, 'Thầy Quang Minh');

  // ──── 14. Attendance demo ────
  const insertAttendance = db.prepare(`
    INSERT INTO attendance (id, student_id, class_id, date, status, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const demoStudents = ['std_sample_1', 'std_sample_2', 'std_sample_3', 'std_sample_4', 'std_sample_5'];
  const demoDates = ['2024-10-21', '2024-10-22', '2024-10-23', '2024-10-24'];
  demoDates.forEach(date => {
    demoStudents.forEach((sid, i) => {
      const status = i === 0 && date === '2024-10-23' ? 'absent' : i === 1 && date === '2024-10-24' ? 'late' : 'present';
      insertAttendance.run(`att_${sid}_${date}`, sid, 'cls_10A1', date, status, 'usr_teacher_1');
    });
  });

  // ──── 15. Leave requests demo ────
  db.prepare(`
    INSERT INTO leave_requests (id, student_id, parent_id, start_date, end_date, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('lr_1', 'std_khoi', 'usr_parent_1', '2024-10-28', '2024-10-28', 'Con bị sốt, xin nghỉ 1 ngày.', 'approved');

  // ──── 16. Messages demo ────
  db.prepare(`
    INSERT INTO messages (id, sender_id, receiver_id, student_id, subject, content, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('msg_1', 'usr_parent_1', 'usr_teacher_1', 'std_khoi', 'Hỏi về kết quả kiểm tra', 'Chào cô, em muốn hỏi về bài kiểm tra 1 tiết Toán vừa rồi của con em. Cảm ơn cô.', 0);

  console.log('✅ Demo seed hoàn tất: 17 users, 4 classes, 4 assignments, 12 grades, 20 attendance records.');
}

// ============================================================
// Seed Subjects (dùng chung cho cả 2 mode)
// ============================================================
function seedSubjects() {
  const insertSubject = db.prepare(`
    INSERT OR IGNORE INTO subjects (id, name, code, department) VALUES (?, ?, ?, ?)
  `);

  const subjects = [
    ['sub_toan', 'Toán học', 'TOAN', 'Khoa học tự nhiên'],
    ['sub_vatly', 'Vật lý', 'VATLY', 'Khoa học tự nhiên'],
    ['sub_hoahoc', 'Hóa học', 'HOAHOC', 'Khoa học tự nhiên'],
    ['sub_sinhhoc', 'Sinh học', 'SINHHOC', 'Khoa học tự nhiên'],
    ['sub_nguvan', 'Ngữ văn', 'NGUVAN', 'Khoa học xã hội'],
    ['sub_lichsu', 'Lịch sử', 'LICHSU', 'Khoa học xã hội'],
    ['sub_dialy', 'Địa lý', 'DIALY', 'Khoa học xã hội'],
    ['sub_gdcd', 'GDCD/GDKTPL', 'GDCD', 'Khoa học xã hội'],
    ['sub_tienganh', 'Tiếng Anh', 'TIENGANH', 'Ngoại ngữ'],
    ['sub_tinhoc', 'Tin học', 'TINHOC', 'Khoa học tự nhiên'],
    ['sub_congnghe', 'Công nghệ', 'CONGNGHE', 'Kỹ thuật'],
    ['sub_theduc', 'Thể dục', 'THEDUC', 'Thể chất & Nghệ thuật'],
    ['sub_amnhac', 'Âm nhạc', 'AMNHAC', 'Thể chất & Nghệ thuật'],
    ['sub_mythuat', 'Mỹ thuật', 'MYTHUAT', 'Thể chất & Nghệ thuật'],
  ];

  subjects.forEach(s => insertSubject.run(...s));
  console.log(`📚 Seeded ${subjects.length} môn học theo chương trình THPT.`);
}

// ============================================================
// CLI Runner
// ============================================================
const isDirectRun = process.argv[1]?.endsWith('seed.js');
if (isDirectRun) {
  const mode = process.argv.includes('--init') ? 'init' : 'demo';
  console.log(`\n🔧 Running seed in "${mode}" mode...\n`);
  seedDatabase(mode);
}
