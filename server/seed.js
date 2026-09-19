import bcrypt from 'bcryptjs';
import { db, initSchema } from './db.js';

export function seedDatabase() {
  initSchema();

  // Check if already seeded
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count === 0) {
    console.log('Seeding fresh database with authentic school data...');
  const passwordHash = bcrypt.hashSync('123456', 10);

  // 1. Insert Core Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role, name, code, phone, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    'usr_student_1',
    'minhkhang',
    'minhkhang@school.edu.vn',
    passwordHash,
    'student',
    'Nguyễn Minh Khang',
    'HS-2024-889',
    '0912345678',
    '/assets/student_avatar.png'
  );

  insertUser.run(
    'usr_teacher_1',
    'mailan',
    'mailan@school.edu.vn',
    passwordHash,
    'teacher',
    'Cô Mai Lan',
    'GV-TOAN-014',
    '0987654321',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120&h=120'
  );

  insertUser.run(
    'usr_parent_1',
    'vanhoi',
    'vanhoi@parent.school.edu.vn',
    passwordHash,
    'parent',
    'Nguyễn Văn Hồi',
    'PH-10A1-042',
    '0903456789',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120'
  );

  insertUser.run(
    'usr_admin_1',
    'hoainam',
    'bgh.hoainam@school.edu.vn',
    passwordHash,
    'admin',
    'GS.TS Vũ Hoài Nam',
    'BGH-001',
    '0901234567',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120&h=120'
  );

  // 2. Insert Classes
  const insertClass = db.prepare(`
    INSERT INTO classes (id, name, grade_level, academic_year, homeroom_teacher_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertClass.run('cls_10A1', '10A1', 10, '2024-2025', 'usr_teacher_1');
  insertClass.run('cls_10A2', '10A2', 10, '2024-2025', 'usr_teacher_1');
  insertClass.run('cls_11A1', '11A1', 11, '2024-2025', null);
  insertClass.run('cls_07B', '7B', 7, '2024-2025', null);

  // 3. Insert Students
  const insertStudent = db.prepare(`
    INSERT INTO students (id, user_id, class_id, parent_id, gpa, class_rank, attendance_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertStudent.run('std_khang', 'usr_student_1', 'cls_11A1', null, 8.8, '04/40', 99.0);

  // Child 1: Minh Khôi
  insertUser.run(
    'usr_student_khoi',
    'minhkhoi',
    'minhkhoi@school.edu.vn',
    passwordHash,
    'student',
    'Nguyễn Minh Khôi',
    'HS10A1-042',
    '0911223344',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120&h=120'
  );
  insertStudent.run('std_khoi', 'usr_student_khoi', 'cls_10A1', 'usr_parent_1', 8.8, '03/38', 98.5);

  // Child 2: Minh Châu
  insertUser.run(
    'usr_student_chau',
    'minhchau',
    'minhchau@school.edu.vn',
    passwordHash,
    'student',
    'Nguyễn Minh Châu',
    'HS07B-019',
    '0922334455',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120&h=120'
  );
  insertStudent.run('std_chau', 'usr_student_chau', 'cls_07B', 'usr_parent_1', 9.2, '01/35', 100.0);

  // 4. Seed 40 class 10A1 students for Teacher Analytics Roster
  const sampleNames = [
    { name: 'Trần Minh Khoa', code: 'HS110042', gpa: 4.8, rate: 60, risk: 'high', topics: 'Hình không gian, Lượng giác' },
    { name: 'Nguyễn Hoàng Yến', code: 'HS110018', gpa: 5.2, rate: 72, risk: 'high', topics: 'Mệnh đề & Tập hợp' },
    { name: 'Lê Quốc Bảo', code: 'HS110008', gpa: 5.6, rate: 80, risk: 'warning', topics: 'Hình không gian' },
    { name: 'Phạm Thu Hà', code: 'HS110029', gpa: 6.2, rate: 85, risk: 'warning', topics: 'Lượng giác' },
    { name: 'Vũ Quang Huy', code: 'HS110005', gpa: 8.4, rate: 98, risk: 'good', topics: 'Thế mạnh toàn diện' },
    { name: 'Đặng Thùy Linh', code: 'HS110051', gpa: 9.1, rate: 100, risk: 'good', topics: 'Đại số & Hình học' },
    { name: 'Bùi Gia Khiêm', code: 'HS110012', gpa: 7.8, rate: 92, risk: 'good', topics: 'Toán giải tích' },
    { name: 'Đỗ Phương Nga', code: 'HS110034', gpa: 8.6, rate: 96, risk: 'good', topics: 'Hóa học vô cơ' },
    { name: 'Phan Tuấn Kiệt', code: 'HS110023', gpa: 6.8, rate: 88, risk: 'good', topics: 'Hình không gian' },
    { name: 'Hoàng Mỹ Duyên', code: 'HS110067', gpa: 8.9, rate: 100, risk: 'good', topics: 'Lượng giác' },
  ];

  sampleNames.forEach((s, idx) => {
    const uId = `usr_sample_${idx + 1}`;
    insertUser.run(uId, `student_${idx + 1}`, `${s.code.toLowerCase()}@school.edu.vn`, passwordHash, 'student', s.name, s.code, null, null);
    insertStudent.run(`std_sample_${idx + 1}`, uId, 'cls_10A1', null, s.gpa, `${idx + 5}/42`, s.rate);
  });

  // 5. Seed Assignments
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (id, title, subject, type, instructions, target_classes, due_date, due_time, duration_minutes, grading_scale, lock_after_due, shuffle_questions, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAssignment.run(
    'asg_toan_10',
    'Kiểm tra 15 phút: Đại số chương 2 - Hàm số bậc hai',
    'Toán học - Khối 10',
    'quiz',
    'Học sinh được phép sử dụng máy tính cầm tay Casio fx-580VN X. Đọc kỹ đề bài trước khi chọn phương án trả lời cuối cùng.',
    JSON.stringify(['10A1', '10A2']),
    '2024-10-25',
    '23:59',
    45,
    'Thang 10 (Hệ số 1)',
    1,
    1,
    'usr_teacher_1'
  );

  insertAssignment.run(
    'asg_toan_11',
    'Đạo hàm hàm số lượng giác & ứng dụng thực tế',
    'Toán giải tích',
    'quiz',
    '20 câu hỏi trắc nghiệm và tự luận vận dụng cao.',
    JSON.stringify(['11A1']),
    '2024-10-24',
    '17:00',
    45,
    'Thang 10',
    1,
    0,
    'usr_teacher_1'
  );

  insertAssignment.run(
    'asg_ly_11',
    'Định luật Ôm cho toàn mạch và đoạn mạch chứa nguồn',
    'Vật lý 11',
    'quiz',
    'Đã làm 6/15 câu. Hoàn thành trước hạn chót.',
    JSON.stringify(['11A1']),
    '2024-10-25',
    '20:00',
    45,
    'Thang 10',
    1,
    0,
    'usr_teacher_1'
  );

  insertAssignment.run(
    'asg_van_11',
    'Phân tích hình tượng người lính trong bài thơ Tây Tiến',
    'Ngữ văn',
    'essay',
    'Bài thu hoạch viết tay tối thiểu 1200 từ, nộp file ảnh chụp hoặc bản PDF.',
    JSON.stringify(['11A1']),
    '2024-10-26',
    '23:59',
    90,
    'Thang 10',
    1,
    0,
    'usr_teacher_1'
  );

  // 6. Seed Assignment Questions
  const insertQuestion = db.prepare(`
    INSERT INTO assignment_questions (id, assignment_id, question_order, prompt, points, has_plot, plot_data, options, explanation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertQuestion.run(
    'q_10_1',
    'asg_toan_10',
    1,
    'Cho hàm số bậc hai y = ax² + bx + c (a ≠ 0). Tọa độ đỉnh I của parabol tương ứng là điểm nào sau đây?',
    1.0,
    0,
    null,
    JSON.stringify([
      { id: 'A', text: 'A.  I(-b/2a ; -Δ/4a)', isCorrect: true },
      { id: 'B', text: 'B.  I(b/2a ; -Δ/4a)', isCorrect: false },
      { id: 'C', text: 'C.  I(-b/a ; -Δ/2a)', isCorrect: false },
      { id: 'D', text: 'D.  I(-b/2a ; -Δ/2a)', isCorrect: false },
    ]),
    'Theo công thức chuẩn SGK Toán 10 Tập 1 (Trang 51 định nghĩa đỉnh Parabol).'
  );

  insertQuestion.run(
    'q_10_2',
    'asg_toan_10',
    2,
    'Đồ thị hình bên dưới là của hàm số bậc hai nào trong các phương án cho sẵn?',
    1.0,
    1,
    'Đỉnh Parabol I(1; -2), đi qua (0; -1) và (2; -1)',
    JSON.stringify([
      { id: 'A', text: 'A.  y = -x² + 2x - 1', isCorrect: false },
      { id: 'B', text: 'B.  y = x² - 2x - 1', isCorrect: true },
      { id: 'C', text: 'C.  y = 2x² - 4x + 1', isCorrect: false },
      { id: 'D', text: 'D.  y = x² - x - 2', isCorrect: false },
    ]),
    'Parabol có bề lõm quay lên nên a > 0. Đỉnh I(1; -2).'
  );

  insertQuestion.run(
    'q_10_3',
    'asg_toan_10',
    3,
    'Trục đối xứng của đồ thị hàm số y = 2x² - 4x + 5 là đường thẳng nào sau đây?',
    1.0,
    0,
    null,
    JSON.stringify([
      { id: 'A', text: 'A.  x = 1', isCorrect: true },
      { id: 'B', text: 'B.  x = -1', isCorrect: false },
      { id: 'C', text: 'C.  x = 2', isCorrect: false },
      { id: 'D', text: 'D.  x = -2', isCorrect: false },
    ]),
    'Trục đối xứng là đường thẳng x = -b / (2a) = -(-4) / (2 * 2) = 1.'
  );

  insertQuestion.run(
    'q_10_4',
    'asg_toan_10',
    4,
    'Tập nghiệm của bất phương trình x² - 5x + 6 ≤ 0 là đoạn hoặc khoảng nào?',
    1.0,
    0,
    null,
    JSON.stringify([
      { id: 'A', text: 'A.  [2 ; 3]', isCorrect: true },
      { id: 'B', text: 'B.  (2 ; 3)', isCorrect: false },
      { id: 'C', text: 'C.  (-∞ ; 2] ∪ [3 ; +∞)', isCorrect: false },
      { id: 'D', text: 'D.  (-∞ ; 2) ∪ (3 ; +∞)', isCorrect: false },
    ]),
    'Tam thức f(x) = x² - 5x + 6 có 2 nghiệm phân biệt x1 = 2, x2 = 3. Hệ số a = 1 > 0 nên trong khoảng hai nghiệm f(x) ≤ 0.'
  );

  insertQuestion.run(
    'q_10_5',
    'asg_toan_10',
    5,
    'Một quả bóng được ném lên theo phương trình độ cao h(t) = -5t² + 20t + 1 (m). Hỏi bóng đạt độ cao cực đại tại thời điểm nào?',
    1.0,
    0,
    null,
    JSON.stringify([
      { id: 'A', text: 'A.  t = 2 giây', isCorrect: true },
      { id: 'B', text: 'B.  t = 4 giây', isCorrect: false },
      { id: 'C', text: 'C.  t = 1.5 giây', isCorrect: false },
      { id: 'D', text: 'D.  t = 2.5 giây', isCorrect: false },
    ]),
    'Độ cao cực đại đạt tại đỉnh parabol: t = -b / (2a) = -20 / (2 * (-5)) = 2 (s). Khi đó h_max = 21m.'
  );

  // 7. Seed Grades
  const insertGrade = db.prepare(`
    INSERT INTO grades (id, student_id, subject, test_name, score, max_score, teacher_name, comment, graded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertGrade.run('grd_1', 'std_khang', 'Toán học 10', 'Kiểm tra 15 phút - Khảo sát hàm số bậc hai', 9.0, 10, 'Cô Mai Lan', 'Vẽ đồ thị chính xác, xác định trục đối xứng và tìm cực trị thành thạo.', '2024-10-24');
  insertGrade.run('grd_2', 'std_khang', 'Vật lý 10', 'Kiểm tra 1 tiết - Định luật II Newton', 8.5, 10, 'Thầy Hữu Bình', 'Nắm vững các dạng bài phân tích lực, giải bài tập ma sát tốt.', '2024-10-23');
  insertGrade.run('grd_3', 'std_khang', 'Hóa học 10', 'Kiểm tra 1 tiết - Cân bằng phản ứng oxi hóa khử', 9.5, 10, 'Thầy Tuấn Anh', 'Lập luận chặt chẽ, xác định đúng số oxi hóa và cân bằng nhanh xuất sắc.', '2024-10-23');
  insertGrade.run('grd_4', 'std_khang', 'Tiếng Anh 10', 'Unit 4: Reading Comprehension & Lexicon', 8.0, 10, 'Cô Mai', 'Kỹ năng skimming tốt, cần rèn luyện thêm phần từ vựng chuyên ngành.', '2024-10-22');
  insertGrade.run('grd_5', 'std_khang', 'Ngữ văn 10', 'Bài viết số 2: Nghị luận văn học', 7.75, 10, 'Cô Thanh Hằng', 'Cảm thụ tác phẩm sâu sắc, hành văn mạch lạc, cần mở rộng dẫn chứng liên hệ.', '2024-10-21');
  insertGrade.run('grd_6', 'std_khang', 'Lịch sử 10', 'Bài kiểm tra thường xuyên số 2', 8.5, 10, 'Thầy Hùng', 'Nắm vững các mốc sự kiện quan trọng, trình bày mạch lạc.', '2024-10-20');
  insertGrade.run('grd_7', 'std_khang', 'Sinh học 10', 'Thực hành cấu trúc tế bào nhân thực', 9.0, 10, 'Cô Quỳnh Nga', 'Kỹ năng soi kính hiển vi quang học chuẩn xác, bản vẽ chú thích rõ ràng.', '2024-10-18');
  insertGrade.run('grd_8', 'std_khang', 'Tin học 10', 'Lập trình Python: Thuật toán sắp xếp & Tìm kiếm', 10.0, 10, 'Thầy Quang Minh', 'Code tối ưu độ phức tạp thời gian O(n log n), tư duy logic rất tốt.', '2024-10-16');

  // Grades for Minh Khôi (Parent portal)
  insertGrade.run('grd_k1', 'std_khoi', 'Toán Chuyên', 'Kiểm tra 1 tiết', 9.5, 10, 'Cô Mai Lan', 'Đạt xuất sắc, giải bài sáng tạo.', '2024-10-23');
  insertGrade.run('grd_k2', 'std_khoi', 'Vật Lý', 'Bài tập thực hành đo gia tốc', 8.5, 10, 'Thầy Bình', 'Nắm vững nguyên lý thí nghiệm.', '2024-10-22');
  insertGrade.run('grd_k3', 'std_khoi', 'Hóa Học', 'Kiểm tra 15 phút định kỳ', 8.0, 10, 'Thầy Tuấn Anh', 'Kết quả tốt.', '2024-10-20');
  insertGrade.run('grd_k4', 'std_khoi', 'Tiếng Anh', 'Thuyết trình nhóm dự án AI', 9.0, 10, 'Cô Mai', 'Phát âm chuẩn và tự tin.', '2024-10-19');

  // 8. Seed Competencies
  const insertComp = db.prepare(`
    INSERT INTO student_competencies (id, student_id, subject, topic, proficiency_percent, is_strength, hint)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertComp.run('cmp_1', 'std_khang', 'Toán', 'Đại số & Lượng giác', 92, 1, null);
  insertComp.run('cmp_2', 'std_khang', 'Tiếng Anh', 'Đọc hiểu Tiếng Anh', 88, 1, null);
  insertComp.run('cmp_3', 'std_khang', 'Hóa học', 'Hóa vô cơ', 85, 1, null);
  insertComp.run('cmp_4', 'std_khang', 'Toán', 'Hình học không gian', 64, 0, 'Gợi ý: Ôn lại góc giữa 2 mặt phẳng');
  insertComp.run('cmp_5', 'std_khang', 'Tiếng Anh', 'Từ vựng chuyên đề Anh 11', 70, 0, 'Gợi ý: Ôn lại 30 từ vựng Unit 4');

  // 9. Seed Tuition Invoices
  const insertTuition = db.prepare(`
    INSERT INTO tuition_invoices (id, student_id, period, total_amount, due_date, status, items, bank_name, account_number, account_name, transfer_memo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTuition.run(
    'inv_khoi_t11',
    'std_khoi',
    'Kỳ thu: Tháng 11/2024',
    3250000,
    '10/11/2024',
    'unpaid',
    JSON.stringify([
      { label: 'Học phí chính khóa', amount: '1.800.000 đ' },
      { label: 'Bán trú & Dinh dưỡng', amount: '1.150.000 đ' },
      { label: 'Quỹ hoạt động & Ngoại khóa', amount: '300.000 đ' },
    ]),
    'Vietcombank',
    '1029384756',
    'TRUONG THPT CHUYEN BAC AU',
    'HOCPHI KHOI HS10A1-042 T11'
  );

  insertTuition.run(
    'inv_chau_t11',
    'std_chau',
    'Kỳ thu: Tháng 11/2024',
    2800000,
    '10/11/2024',
    'unpaid',
    JSON.stringify([
      { label: 'Học phí chính khóa THCS', amount: '1.500.000 đ' },
      { label: 'Bán trú & Ăn trưa học đường', amount: '1.050.000 đ' },
      { label: 'CLB Tiếng Anh cuối tuần', amount: '250.000 đ' },
    ]),
    'Vietcombank',
    '1029384756',
    'TRUONG THPT CHUYEN BAC AU',
    'HOCPHI CHAU HS07B-019 T11'
  );

  // 10. Seed Notices
  const insertNotice = db.prepare(`
    INSERT INTO school_notices (id, title, content, category, tag, tag_type, sender, can_confirm, confirmed_by_users)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotice.run(
    'notif_1',
    'Nhắc nhở họp phụ huynh giữa học kỳ I',
    'Thời gian: 08:30 sáng Chủ Nhật (27/10/2024) tại phòng 302. Kính mời phụ huynh tham dự trao đổi định hướng ôn thi và kế hoạch học tập của học sinh.',
    'teacher',
    'Cần phản hồi',
    'warning',
    'GVCN: Cô Lê Hoàng Lan',
    1,
    JSON.stringify([])
  );

  insertNotice.run(
    'notif_2',
    'Khen thưởng: Em Minh Khôi đạt giải Nhất cuộc thi Sáng tạo Robot cấp trường',
    'Nhà trường biểu dương thành tích xuất sắc của đội thi lớp 10A1 và tiếp tục cử đội diện tham gia vòng Chung kết Thành phố vào tháng 12 tới.',
    'school',
    'Chúc mừng',
    'success',
    'Ban Giám Hiệu',
    0,
    JSON.stringify([])
  );

  insertNotice.run(
    'notif_3',
    'Kế hoạch khám sức khỏe định kỳ học sinh khối 10',
    'Phòng Y tế phối hợp cùng Bệnh viện Đa khoa tổ chức khám mắt, nha khoa và thể lực tổng quát vào ngày 29/10/2024.',
    'school',
    'Kế hoạch trường',
    'info',
    'Phòng Y tế trường',
    0,
    JSON.stringify([])
  );
}

  // 12. Seed Study Resources
  const existingResources = db.prepare('SELECT COUNT(*) as count FROM study_resources').get();
  if (existingResources.count === 0) {
    const insertResource = db.prepare(`
      INSERT INTO study_resources (id, subject, title, type, file_size, grade_level, download_url, downloads_count, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertResource.run('res_1', 'Toán học', 'Đề cương ôn thi Học kỳ I: Hàm số bậc hai & Bất phương trình', 'pdf', '3.4 MB', 10, '#download-res-1', 142, 'Cô Mai Lan');
    insertResource.run('res_2', 'Toán học', 'Tuyển tập 100 câu trắc nghiệm chuyên đề Hệ thức lượng trong tam giác', 'exam', '1.8 MB', 10, '#download-res-2', 98, 'Tổ Toán - Tin');
    insertResource.run('res_3', 'Vật lý', 'Tóm tắt lý thuyết & Công thức giải nhanh: Động lực học chất điểm', 'pdf', '2.6 MB', 10, '#download-res-3', 115, 'Thầy Trần Hữu Bình');
    insertResource.run('res_4', 'Vật lý', 'Video bài giảng: Phân tích lực ma sát và chuyển động trên mặt phẳng nghiêng', 'video', '185 MB', 10, '#download-res-4', 76, 'Thầy Trần Hữu Bình');
    insertResource.run('res_5', 'Tiếng Anh', 'Bộ đề thi thử IELTS Reading & Vocab Academic B2 (Khối 10 & 11)', 'exam', '4.2 MB', 10, '#download-res-5', 210, 'Cô Lê Thanh Mai');
    insertResource.run('res_6', 'Hóa học', 'Sơ đồ tư duy: Bảng tuần hoàn các nguyên tố & Liên kết hóa học', 'pdf', '5.1 MB', 10, '#download-res-6', 84, 'Thầy Tuấn Anh');
    insertResource.run('res_7', 'Ngữ văn', 'Tài liệu hướng dẫn kỹ năng viết bài văn Nghị luận xã hội 600 từ', 'pdf', '1.2 MB', 10, '#download-res-7', 165, 'Cô Nguyễn Mai Hương');
    insertResource.run('res_8', 'Tin học', 'Giáo trình thực hành lập trình Python cơ bản đến nâng cao (THPT)', 'pdf', '8.9 MB', 10, '#download-res-8', 190, 'Thầy Quang Minh');
  }

  console.log('Database seeded successfully with authentic school records.');
}
