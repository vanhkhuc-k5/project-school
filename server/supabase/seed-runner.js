import { supabase, isSupabaseConfigured } from '../supabase.js';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

async function runSeed() {
  if (!isSupabaseConfigured()) {
    console.error('❌ Lỗi: Chưa cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong file .env');
    console.log('👉 Vui lòng điền thông tin Supabase vào .env trước khi chạy lệnh này.');
    process.exit(1);
  }

  console.log('🚀 Bắt đầu nạp dữ liệu (seed) lên Supabase...');

  const passwordHash = bcrypt.hashSync('123456', BCRYPT_ROUNDS);
  const adminHash = bcrypt.hashSync('admin@2026', BCRYPT_ROUNDS);

  try {
    // 1. Users
    console.log('1. Nạp người dùng (users)...');
    const users = [
      { id: 'usr_admin_root', username: 'admin', email: 'admin@school.edu.vn', password_hash: adminHash, role: 'admin', name: 'Quản trị viên hệ thống', code: 'ADMIN-001', phone: '0901112233', must_change_password: false },
      { id: 'usr_admin_1', username: 'hoainam', email: 'bgh.hoainam@school.edu.vn', password_hash: passwordHash, role: 'admin', name: 'GS.TS Vũ Hoài Nam', code: 'BGH-001', phone: '0901234567', must_change_password: false },
      { id: 'usr_teacher_1', username: 'mailan', email: 'mailan@school.edu.vn', password_hash: passwordHash, role: 'teacher', name: 'Cô Mai Lan', code: 'GV-TOAN-014', phone: '0987654321', must_change_password: false },
      { id: 'usr_student_1', username: 'minhkhang', email: 'minhkhang@school.edu.vn', password_hash: passwordHash, role: 'student', name: 'Nguyễn Minh Khang', code: 'HS-2024-889', phone: '0912345678', must_change_password: false },
      { id: 'usr_student_khoi', username: 'minhkhoi', email: 'minhkhoi@school.edu.vn', password_hash: passwordHash, role: 'student', name: 'Nguyễn Minh Khôi', code: 'HS10A1-042', phone: '0911223344', must_change_password: false },
      { id: 'usr_student_chau', username: 'minhchau', email: 'minhchau@school.edu.vn', password_hash: passwordHash, role: 'student', name: 'Nguyễn Minh Châu', code: 'HS07B-019', phone: '0922334455', must_change_password: false },
      { id: 'usr_parent_1', username: 'vanhoi', email: 'vanhoi@parent.school.edu.vn', password_hash: passwordHash, role: 'parent', name: 'Nguyễn Văn Hồi', code: 'PH-10A1-042', phone: '0903456789', must_change_password: false },
    ];
    const { error: errUsers } = await supabase.from('users').upsert(users, { onConflict: 'id' });
    if (errUsers) throw errUsers;

    // 2. Subjects
    console.log('2. Nạp môn học (subjects)...');
    const subjects = [
      { id: 'sub_toan', name: 'Toán học', code: 'TOAN', department: 'Khoa học tự nhiên' },
      { id: 'sub_vatly', name: 'Vật lý', code: 'VATLY', department: 'Khoa học tự nhiên' },
      { id: 'sub_hoahoc', name: 'Hóa học', code: 'HOAHOC', department: 'Khoa học tự nhiên' },
      { id: 'sub_sinhhoc', name: 'Sinh học', code: 'SINHHOC', department: 'Khoa học tự nhiên' },
      { id: 'sub_nguvan', name: 'Ngữ văn', code: 'NGUVAN', department: 'Khoa học xã hội' },
      { id: 'sub_lichsu', name: 'Lịch sử', code: 'LICHSU', department: 'Khoa học xã hội' },
      { id: 'sub_dialy', name: 'Địa lý', code: 'DIALY', department: 'Khoa học xã hội' },
      { id: 'sub_gdcd', name: 'GDCD/GDKTPL', code: 'GDCD', department: 'Khoa học xã hội' },
      { id: 'sub_tienganh', name: 'Tiếng Anh', code: 'TIENGANH', department: 'Ngoại ngữ' },
      { id: 'sub_tinhoc', name: 'Tin học', code: 'TINHOC', department: 'Khoa học tự nhiên' },
      { id: 'sub_congnghe', name: 'Công nghệ', code: 'CONGNGHE', department: 'Kỹ thuật' },
      { id: 'sub_theduc', name: 'Thể dục', code: 'THEDUC', department: 'Thể chất & Nghệ thuật' },
      { id: 'sub_amnhac', name: 'Âm nhạc', code: 'AMNHAC', department: 'Thể chất & Nghệ thuật' },
      { id: 'sub_mythuat', name: 'Mỹ thuật', code: 'MYTHUAT', department: 'Thể chất & Nghệ thuật' },
    ];
    const { error: errSubj } = await supabase.from('subjects').upsert(subjects, { onConflict: 'id' });
    if (errSubj) throw errSubj;

    // 3. Classes
    console.log('3. Nạp lớp học (classes)...');
    const classes = [
      { id: 'cls_10A1', name: '10A1', grade_level: 10, academic_year: '2024-2025', homeroom_teacher_id: 'usr_teacher_1', max_students: 45 },
      { id: 'cls_10A2', name: '10A2', grade_level: 10, academic_year: '2024-2025', homeroom_teacher_id: 'usr_teacher_1', max_students: 45 },
      { id: 'cls_11A1', name: '11A1', grade_level: 11, academic_year: '2024-2025', homeroom_teacher_id: null, max_students: 45 },
      { id: 'cls_07B', name: '7B', grade_level: 7, academic_year: '2024-2025', homeroom_teacher_id: null, max_students: 40 },
    ];
    const { error: errClasses } = await supabase.from('classes').upsert(classes, { onConflict: 'id' });
    if (errClasses) throw errClasses;

    // 4. Students
    console.log('4. Nạp học sinh (students)...');
    const students = [
      { id: 'std_khang', user_id: 'usr_student_1', class_id: 'cls_11A1', parent_id: null, gpa: 8.8, class_rank: '04/40', attendance_rate: 99.0 },
      { id: 'std_khoi', user_id: 'usr_student_khoi', class_id: 'cls_10A1', parent_id: 'usr_parent_1', gpa: 8.8, class_rank: '03/38', attendance_rate: 98.5 },
      { id: 'std_chau', user_id: 'usr_student_chau', class_id: 'cls_07B', parent_id: 'usr_parent_1', gpa: 9.2, class_rank: '01/35', attendance_rate: 100.0 },
    ];
    const { error: errStudents } = await supabase.from('students').upsert(students, { onConflict: 'id' });
    if (errStudents) throw errStudents;

    // 5. Teacher assignments
    console.log('5. Nạp phân công (teacher_assignments)...');
    const tas = [
      { id: 'ta_1', teacher_id: 'usr_teacher_1', class_id: 'cls_10A1', subject_id: 'sub_toan', academic_year: '2024-2025' },
      { id: 'ta_2', teacher_id: 'usr_teacher_1', class_id: 'cls_10A2', subject_id: 'sub_toan', academic_year: '2024-2025' },
      { id: 'ta_3', teacher_id: 'usr_teacher_1', class_id: 'cls_11A1', subject_id: 'sub_toan', academic_year: '2024-2025' },
    ];
    const { error: errTAs } = await supabase.from('teacher_assignments').upsert(tas, { onConflict: 'id' });
    if (errTAs) throw errTAs;

    // 6. Assignments
    console.log('6. Nạp bài tập (assignments)...');
    const assignments = [
      { id: 'asg_toan_10', title: 'Kiểm tra 15 phút: Đại số chương 2 - Hàm số bậc hai', subject: 'Toán học - Khối 10', type: 'quiz', instructions: 'Học sinh được phép sử dụng máy tính cầm tay.', target_classes: ['10A1', '10A2'], due_date: '2024-10-25', due_time: '23:59', duration_minutes: 45, grading_scale: 'Thang 10 (Hệ số 1)', lock_after_due: true, shuffle_questions: true, created_by: 'usr_teacher_1' },
      { id: 'asg_toan_11', title: 'Đạo hàm hàm số lượng giác & ứng dụng', subject: 'Toán giải tích', type: 'quiz', instructions: '20 câu trắc nghiệm và tự luận.', target_classes: ['11A1'], due_date: '2024-10-24', due_time: '17:00', duration_minutes: 45, grading_scale: 'Thang 10', lock_after_due: true, shuffle_questions: false, created_by: 'usr_teacher_1' },
      { id: 'asg_ly_11', title: 'Định luật Ôm cho toàn mạch', subject: 'Vật lý 11', type: 'quiz', instructions: 'Hoàn thành trước hạn chót.', target_classes: ['11A1'], due_date: '2024-10-25', due_time: '20:00', duration_minutes: 45, grading_scale: 'Thang 10', lock_after_due: true, shuffle_questions: false, created_by: 'usr_teacher_1' },
      { id: 'asg_van_11', title: 'Phân tích hình tượng người lính trong Tây Tiến', subject: 'Ngữ văn', type: 'essay', instructions: 'Bài tối thiểu 1200 từ.', target_classes: ['11A1'], due_date: '2024-10-26', due_time: '23:59', duration_minutes: 90, grading_scale: 'Thang 10', lock_after_due: true, shuffle_questions: false, created_by: 'usr_teacher_1' },
    ];
    const { error: errAsg } = await supabase.from('assignments').upsert(assignments, { onConflict: 'id' });
    if (errAsg) throw errAsg;

    // 7. Questions
    console.log('7. Nạp câu hỏi (assignment_questions)...');
    const questions = [
      { id: 'q_10_1', assignment_id: 'asg_toan_10', question_order: 1, prompt: 'Cho hàm số bậc hai y = ax² + bx + c (a ≠ 0). Tọa độ đỉnh I của parabol là?', points: 1.0, has_plot: false, options: [{ id: 'A', text: 'A. I(-b/2a ; -Δ/4a)', isCorrect: true }, { id: 'B', text: 'B. I(b/2a ; -Δ/4a)', isCorrect: false }], explanation: 'Theo SGK Toán 10 Tập 1, trang 51.' },
      { id: 'q_10_2', assignment_id: 'asg_toan_10', question_order: 2, prompt: 'Đồ thị hình bên dưới là hàm số bậc hai nào?', points: 1.0, has_plot: true, plot_data: 'Đỉnh Parabol I(1; -2)', options: [{ id: 'A', text: 'A. y = -x² + 2x - 1', isCorrect: false }, { id: 'B', text: 'B. y = x² - 2x - 1', isCorrect: true }], explanation: 'Parabol lõm quay lên, a > 0.' },
    ];
    const { error: errQ } = await supabase.from('assignment_questions').upsert(questions, { onConflict: 'id' });
    if (errQ) throw errQ;

    // 8. Grades
    console.log('8. Nạp điểm số (grades)...');
    const grades = [
      { id: 'grd_1', student_id: 'std_khang', subject: 'Toán học', test_name: 'KT 15 phút - Hàm số bậc hai', score: 9.0, max_score: 10, coefficient: 1, semester: 1, teacher_name: 'Cô Mai Lan', comment: 'Vẽ đồ thị chính xác.' },
      { id: 'grd_2', student_id: 'std_khang', subject: 'Vật lý', test_name: 'KT 1 tiết - Định luật Newton', score: 8.5, max_score: 10, coefficient: 2, semester: 1, teacher_name: 'Thầy Hữu Bình', comment: 'Nắm vững phân tích lực.' },
      { id: 'grd_3', student_id: 'std_khang', subject: 'Hóa học', test_name: 'KT 1 tiết - Oxi hóa khử', score: 9.5, max_score: 10, coefficient: 2, semester: 1, teacher_name: 'Thầy Tuấn Anh', comment: 'Lập luận chặt chẽ.' },
      { id: 'grd_k1', student_id: 'std_khoi', subject: 'Toán Chuyên', test_name: 'KT 1 tiết', score: 9.5, max_score: 10, coefficient: 2, semester: 1, teacher_name: 'Cô Mai Lan', comment: 'Xuất sắc.' },
    ];
    const { error: errGrades } = await supabase.from('grades').upsert(grades, { onConflict: 'id' });
    if (errGrades) throw errGrades;

    // 9. Notices
    console.log('9. Nạp thông báo (school_notices)...');
    const notices = [
      { id: 'notif_1', title: 'Họp phụ huynh giữa HK I', content: 'Thời gian: 08:30 Chủ Nhật 27/10/2024 tại phòng 302.', category: 'teacher', tag: 'Cần phản hồi', tag_type: 'warning', sender: 'GVCN: Cô Lê Hoàng Lan', can_confirm: true },
      { id: 'notif_2', title: 'Khen thưởng: Minh Khôi đạt giải Nhất Robot', content: 'Nhà trường biểu dương thành tích xuất sắc lớp 10A1.', category: 'school', tag: 'Chúc mừng', tag_type: 'success', sender: 'Ban Giám Hiệu', can_confirm: false },
    ];
    const { error: errNotices } = await supabase.from('school_notices').upsert(notices, { onConflict: 'id' });
    if (errNotices) throw errNotices;

    // 10. Study Resources
    console.log('10. Nạp học liệu (study_resources)...');
    const resources = [
      { id: 'res_1', subject: 'Toán học', title: 'Đề cương ôn thi HK I: Hàm số bậc hai', type: 'pdf', file_size: '3.4 MB', grade_level: 10, download_url: '#', downloads_count: 142, uploaded_by: 'Cô Mai Lan' },
      { id: 'res_2', subject: 'Vật lý', title: 'Lý thuyết & Công thức: Động lực học', type: 'pdf', file_size: '2.6 MB', grade_level: 10, download_url: '#', downloads_count: 115, uploaded_by: 'Thầy Bình' },
    ];
    const { error: errRes } = await supabase.from('study_resources').upsert(resources, { onConflict: 'id' });
    if (errRes) throw errRes;

    console.log('✅ Hoàn thành nạp dữ liệu mẫu lên Supabase thành công!');
  } catch (err) {
    console.error('❌ Lỗi trong quá trình nạp dữ liệu Supabase:', err.message || err);
    process.exit(1);
  }
}

runSeed();
