import express from 'express';
import { db } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get parent children and data
router.get('/children', optionalAuth, (req, res) => {
  // Query students belonging to parent
  const children = db.prepare(`
    SELECT s.*, u.name, u.code, u.avatar, c.name as class_name
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN classes c ON s.class_id = c.id
    WHERE s.parent_id = 'usr_parent_1' OR s.id IN ('std_khoi', 'std_chau')
  `).all();

  const formattedChildren = children.map((c) => {
    // Get tuition
    const invoice = db.prepare('SELECT * FROM tuition_invoices WHERE student_id = ? LIMIT 1').get(c.id);
    // Get recent grades
    const grades = db.prepare('SELECT * FROM grades WHERE student_id = ? ORDER BY graded_at DESC LIMIT 4').all(c.id);

    return {
      id: c.id,
      name: c.name,
      badge: 'Đang học kỳ 2 (2024-2025)',
      class: c.class_name.includes('7') ? `Lớp ${c.class_name} • Khối THCS` : `Lớp ${c.class_name} • Chuyên Toán - Tin`,
      code: c.code,
      gvcn: c.class_name.includes('7') ? 'Thầy Trần Đình Trọng' : 'Cô Lê Hoàng Lan',
      avatar: c.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120&h=120',
      gpa: c.gpa,
      gpaRank: c.gpa >= 9.0 ? 'Học lực Xuất sắc' : 'Học lực Giỏi',
      classRank: c.class_rank || '03',
      totalStudents: 38,
      attendanceRate: `${c.attendance_rate}%`,
      attendanceNote: c.attendance_rate < 100 ? 'Nghỉ có phép: 1' : 'Đi học chuyên cần',
      scoreTrend: [8.2, 8.4, 8.6, 8.5, 8.8, c.gpa],
      recentSubjects: grades.map((g) => ({
        initial: g.subject.charAt(0),
        name: g.subject,
        test: `${g.test_name} • ${g.graded_at}`,
        score: g.score,
        rank: g.score >= 9.0 ? 'Đạt xuất sắc' : g.score >= 8.0 ? 'Giỏi' : 'Khá',
        rankType: g.score >= 9.0 ? 'success' : g.score >= 8.0 ? 'info' : 'neutral',
      })),
      tuition: invoice ? {
        id: invoice.id,
        period: invoice.period,
        total: invoice.total_amount.toLocaleString('vi-VN'),
        dueDate: `Hạn: ${invoice.due_date}`,
        countdown: invoice.status === 'paid' ? 'Đã thanh toán' : 'Còn 5 ngày',
        status: invoice.status,
        items: JSON.parse(invoice.items || '[]'),
        qrInfo: {
          bank: invoice.bank_name,
          accountNumber: invoice.account_number,
          accountName: invoice.account_name,
          amount: invoice.total_amount,
          description: invoice.transfer_memo,
        }
      } : {
        period: 'Kỳ thu: Tháng 11/2024',
        total: '3.250.000',
        dueDate: 'Hạn: 10/11/2024',
        countdown: 'Còn 5 ngày',
        items: [],
      },
      schedule: [
        { period: 'Tiết 1 - 2', time: '07:30 - 09:00', subject: 'Toán nâng cao', room: 'Phòng 302 • Thầy Tiến Minh Tuấn' },
        { period: 'Tiết 3 - 4', time: '09:15 - 10:45', subject: 'Ngữ văn', room: 'Phòng 302 • Cô Lê Hoàng Lan' },
        { period: 'Buổi chiều', time: '14:00 - 16:00', subject: 'Tin học Python', room: 'Phòng Lab 2 • Thực hành lập trình' },
      ],
      examAlert: {
        title: 'Thi Giữa Kỳ I • Môn Vật Lý',
        time: 'Thời gian: Thứ Ba, 05/11/2024 • 08:00 (Phòng thi 12)',
        duration: 'Thời lượng: 60 phút',
        linkText: 'Xem đề cương ôn tập →',
      }
    };
  });

  // Query notices
  const notices = db.prepare('SELECT * FROM school_notices ORDER BY created_at DESC LIMIT 5').all();
  const formattedNotices = notices.map((n) => ({
    id: n.id,
    category: n.category,
    tag: n.tag,
    tagType: n.tag_type,
    title: n.title,
    content: n.content,
    sender: n.sender,
    time: 'Hôm nay',
    canConfirm: n.can_confirm === 1,
    confirmed: (JSON.parse(n.confirmed_by_users || '[]')).includes('usr_parent_1'),
  }));

  res.json({
    success: true,
    children: formattedChildren,
    data: {
      currentChildId: formattedChildren[0]?.id || 'std_khoi',
      children: formattedChildren,
      notifications: formattedNotices,
    },
  });
});

// Get Parent Dashboard Overview Data
router.get('/dashboard', optionalAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      parentName: 'Bác Nguyễn Văn Hồi',
      phone: '0912 345 678',
      childrenCount: 2,
      activeTerm: 'Học kỳ I (2024 - 2025)',
    },
  });
});

// Get Tuition details
router.get('/tuition', optionalAuth, (req, res) => {
  const childId = req.query.childId || 'std_khoi';
  const invoice = db.prepare('SELECT * FROM tuition_invoices WHERE student_id = ? LIMIT 1').get(childId);
  res.json({
    success: true,
    invoice: invoice
      ? {
          id: invoice.id,
          period: invoice.period,
          totalAmount: invoice.total_amount,
          dueDate: invoice.due_date,
          status: invoice.status,
          bankName: invoice.bank_name || 'Vietcombank',
          accountNumber: invoice.account_number || '1903456789012',
          accountName: invoice.account_name || 'TRUONG THPT CHUYEN EDUPORTAL',
          transferMemo: invoice.transfer_memo,
        }
      : {
          id: 'inv_default',
          period: 'Tháng 11/2024',
          totalAmount: 3250000,
          dueDate: '10/11/2024',
          status: 'pending',
          bankName: 'Vietcombank',
          accountNumber: '1903456789012',
          accountName: 'TRUONG THPT CHUYEN EDUPORTAL',
          transferMemo: 'HOCPHI KHOI 10A1',
        },
  });
});

// Pay tuition
router.post('/tuition/:id/pay', optionalAuth, (req, res) => {
  const invoiceId = req.params.id;
  db.prepare(`
    UPDATE tuition_invoices
    SET status = 'paid', paid_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(invoiceId);

  // Log audit
  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type)
    VALUES (?, ?, 'parent', 'Đã đóng học phí trực tuyến qua cổng VietQR Napas.', 'Đã thanh toán', 'success')
  `).run(`log_${Date.now()}`, 'Phụ huynh Nguyễn Văn Hồi');

  res.json({ success: true, message: 'Xác nhận thanh toán học phí thành công!' });
});

// Schema initialization for Phase 3
db.exec(`
  CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    parent_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason_type TEXT NOT NULL,
    reason_detail TEXT NOT NULL,
    emergency_phone TEXT,
    medical_note_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    teacher_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS parent_teacher_messages (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    parent_id TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial leave request if none exists
try {
  const countLeave = db.prepare('SELECT COUNT(*) as count FROM leave_requests').get()?.count || 0;
  if (countLeave === 0) {
    db.prepare(`
      INSERT INTO leave_requests (id, student_id, parent_id, start_date, end_date, reason_type, reason_detail, emergency_phone, status, teacher_note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-5 days'))
    `).run(
      'leave_sample_1',
      'std_khoi',
      'usr_parent_1',
      '2024-10-15',
      '2024-10-15',
      'Bệnh/Sức khỏe',
      'Cháu Khôi bị sốt phát ban nhẹ, gia đình xin phép cho cháu nghỉ 1 ngày để theo dõi và đi khám bác sĩ.',
      '0912 345 678',
      'approved',
      'Cô đã nhận được thông tin từ gia đình. Chúc em Khôi mau khỏe và sớm quay lại trường.'
    );
  }

  const countMsg = db.prepare('SELECT COUNT(*) as count FROM parent_teacher_messages').get()?.count || 0;
  if (countMsg === 0) {
    const insertMsg = db.prepare(`
      INSERT INTO parent_teacher_messages (id, student_id, parent_id, sender_role, sender_name, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);
    insertMsg.run(
      'msg_1',
      'std_khoi',
      'usr_parent_1',
      'teacher',
      'Cô Lê Hoàng Lan (GVCN 10A1)',
      'Chào gia đình, tuần này em Khôi học rất tập trung và tích cực phát biểu xây dựng bài trong các tiết Đại số.',
      '-2 days'
    );
    insertMsg.run(
      'msg_2',
      'std_khoi',
      'usr_parent_1',
      'parent',
      'Bác Nguyễn Văn Thành (Phụ huynh)',
      'Dạ vâng, cảm ơn cô Lan đã tận tình chỉ dạy cháu ạ. Gia đình sẽ tiếp tục đôn đốc cháu ôn thi giữa kỳ môn Toán và Vật lý.',
      '-1 days'
    );
    insertMsg.run(
      'msg_3',
      'std_khoi',
      'usr_parent_1',
      'teacher',
      'Cô Lê Hoàng Lan (GVCN 10A1)',
      'Dạ không có gì ạ! Nhắc nhở thêm phụ huynh Chủ Nhật tuần này trường có buổi Họp phụ huynh giữa kỳ lúc 08:30 tại phòng 302 nhé gia đình.',
      '-4 hours'
    );
  }
} catch (e) {
  console.error('Error seeding parent tables:', e);
}

// Confirm meeting notice
router.post('/notices/:id/confirm', optionalAuth, (req, res) => {
  const noticeId = req.params.id;
  const notice = db.prepare('SELECT * FROM school_notices WHERE id = ?').get(noticeId);
  if (!notice) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });

  const currentUsers = JSON.parse(notice.confirmed_by_users || '[]');
  const userId = 'usr_parent_1';
  let confirmed = false;

  if (currentUsers.includes(userId)) {
    const updated = currentUsers.filter((u) => u !== userId);
    db.prepare('UPDATE school_notices SET confirmed_by_users = ? WHERE id = ?').run(JSON.stringify(updated), noticeId);
    confirmed = false;
  } else {
    currentUsers.push(userId);
    db.prepare('UPDATE school_notices SET confirmed_by_users = ? WHERE id = ?').run(JSON.stringify(currentUsers), noticeId);
    confirmed = true;
  }

  res.json({ success: true, confirmed });
});

// Leave requests endpoints
router.get('/leave-requests', optionalAuth, (req, res) => {
  const studentId = req.query.studentId || 'std_khoi';
  const requests = db.prepare(`
    SELECT lr.*, u.name as student_name, c.name as class_name
    FROM leave_requests lr
    JOIN students s ON lr.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN classes c ON s.class_id = c.id
    WHERE lr.student_id = ?
    ORDER BY lr.created_at DESC
  `).all(studentId);

  res.json({ success: true, requests });
});

router.post('/leave-requests', optionalAuth, (req, res) => {
  const { studentId, startDate, endDate, emergencyPhone } = req.body;
  const reasonType = req.body.reasonType || req.body.reason || 'Việc gia đình';
  const reasonDetail = req.body.reasonDetail || req.body.reason || 'Xin phép nghỉ học';

  if (!studentId || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin đơn nghỉ học' });
  }
  const newId = `leave_${Date.now()}`;
  db.prepare(`
    INSERT INTO leave_requests (id, student_id, parent_id, start_date, end_date, reason, reason_type, reason_detail, emergency_phone, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(newId, studentId, 'usr_parent_1', startDate, endDate, reasonDetail, reasonType, reasonDetail, emergencyPhone || '');

  // Query student info
  const student = db.prepare(`
    SELECT u.name, c.name as class_name
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?
  `).get(studentId);

  const studentName = student ? student.name : 'Học sinh';
  const className = student ? student.class_name : '10A1';

  db.prepare(`
    INSERT INTO school_notices (id, title, content, category, tag, tag_type, sender)
    VALUES (?, ?, ?, 'teacher', 'Đơn xin nghỉ', 'warning', 'Sổ liên lạc phụ huynh')
  `).run(
    `notif_${Date.now()}`,
    `Đơn xin nghỉ học mới từ PH em ${studentName} (${className})`,
    `Phụ huynh xin phép cho em ${studentName} nghỉ từ ngày ${startDate} đến ${endDate}. Lý do: ${reasonType}. ${reasonDetail ? `Ghi chú: ${reasonDetail}` : ''}`
  );

  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type)
    VALUES (?, ?, 'parent', ?, 'Đơn phép', 'info')
  `).run(
    `log_${Date.now()}`,
    'Phụ huynh Nguyễn Văn Thành',
    `Gửi đơn xin nghỉ học trực tuyến cho em ${studentName} (${startDate} -> ${endDate})`
  );

  res.json({ success: true, message: 'Đơn xin nghỉ học đã được gửi tới Giáo viên Chủ nhiệm thành công!', id: newId });
});

// Direct messaging endpoints
router.get('/messages', optionalAuth, (req, res) => {
  const studentId = req.query.studentId || 'std_khoi';
  const messages = db.prepare(`
    SELECT * FROM parent_teacher_messages
    WHERE student_id = ?
    ORDER BY created_at ASC
  `).all(studentId);

  res.json({ success: true, messages });
});

router.post('/messages', optionalAuth, (req, res) => {
  const { studentId, content, senderName } = req.body;
  if (!studentId || !content) {
    return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống' });
  }
  const newId = `msg_${Date.now()}`;
  const sender = senderName || 'Bác Nguyễn Văn Thành (Phụ huynh)';
  db.prepare(`
    INSERT INTO parent_teacher_messages (id, student_id, parent_id, sender_role, sender_name, content)
    VALUES (?, ?, 'usr_parent_1', 'parent', ?, ?)
  `).run(newId, studentId, sender, content);

  res.json({
    success: true,
    message: {
      id: newId,
      student_id: studentId,
      parent_id: 'usr_parent_1',
      sender_role: 'parent',
      sender_name: sender,
      content,
      created_at: new Date().toISOString()
    }
  });
});

// Detailed gradebook for all subjects
router.get('/grades-detail', optionalAuth, (req, res) => {
  const studentId = req.query.studentId || 'std_khoi';
  const isMiddleSchool = studentId === 'std_chau';

  const subjects = isMiddleSchool ? [
    { code: 'TOAN', name: 'Toán học 7', teacher: 'Thầy Trần Đình Trọng', oral: [9.0], m15: [9.5, 9.0], m45: [9.5], midterm: 9.5, final: 9.2, avg: 9.3, rank: 'Tốt', remarks: 'Tư duy logic rất nhanh, nắm vững kiến thức đại số và hình.' },
    { code: 'VAN', name: 'Ngữ văn 7', teacher: 'Cô Đỗ Thị Mai', oral: [8.5], m15: [8.5, 9.0], m45: [8.5], midterm: 8.8, final: 9.0, avg: 8.8, rank: 'Tốt', remarks: 'Diễn đạt lưu loát, bài làm giàu cảm xúc và hình ảnh.' },
    { code: 'ANH', name: 'Tiếng Anh 7', teacher: 'Cô Sarah Jenkins', oral: [9.5], m15: [10, 9.5], m45: [9.5], midterm: 9.8, final: 9.5, avg: 9.6, rank: 'Tốt', remarks: 'Kỹ năng nghe nói tự nhiên, vốn từ vựng phong phú.' },
    { code: 'KHTN', name: 'Khoa học tự nhiên', teacher: 'Cô Trần Thu Thủy', oral: [9.0], m15: [9.0, 9.5], m45: [9.0], midterm: 9.2, final: 9.0, avg: 9.1, rank: 'Tốt', remarks: 'Thực hành thí nghiệm khéo léo, hiểu bản chất hiện tượng.' },
    { code: 'LS_DL', name: 'Lịch sử & Địa lý', teacher: 'Thầy Vũ Hoài Nam', oral: [8.5], m15: [9.0], m45: [8.5], midterm: 8.8, final: 9.0, avg: 8.8, rank: 'Tốt', remarks: 'Có ý thức tự đọc tài liệu tham khảo và hiểu bài sâu.' },
    { code: 'TIN', name: 'Tin học', teacher: 'Thầy Lê Quốc Tuấn', oral: [10], m15: [9.5, 10], m45: [9.5], midterm: 9.5, final: 9.5, avg: 9.6, rank: 'Tốt', remarks: 'Hoàn thành bài thực hành Scratch và thuật toán xuất sắc.' },
    { code: 'GDCD', name: 'GDCD', teacher: 'Cô Nguyễn Thị Sen', oral: [9.0], m15: [9.0], m45: [9.5], midterm: 9.0, final: 9.5, avg: 9.2, rank: 'Tốt', remarks: 'Gương mẫu, tích cực tham gia các phong trào của lớp.' },
    { code: 'GDTC', name: 'Giáo dục thể chất', teacher: 'Thầy Phạm Văn Đức', oral: [9.0], m15: [9.0], m45: [9.0], midterm: 9.0, final: 9.0, avg: 9.0, rank: 'Đạt', remarks: 'Thể lực tốt, hoàn thành đầy đủ các cự ly chạy và bật xa.' },
  ] : [
    { code: 'TOAN', name: 'Toán Chuyên 10', teacher: 'Thầy Phan Hoàng Tuấn', oral: [9.5], m15: [9.0, 9.5], m45: [9.5], midterm: 9.5, final: 9.2, avg: 9.4, rank: 'Xuất sắc', remarks: 'Tư duy đại số và hình giải tích xuất sắc, giải quyết bài khó tốt.' },
    { code: 'LY', name: 'Vật Lý 10', teacher: 'Thầy Nguyễn Quang Dũng', oral: [8.5], m15: [8.5, 9.0], m45: [8.5], midterm: 8.8, final: 8.8, avg: 8.7, rank: 'Giỏi', remarks: 'Nắm chắc định luật cơ học Newton, thực hành thí nghiệm chuẩn xác.' },
    { code: 'HOA', name: 'Hóa Học 10', teacher: 'Cô Vũ Minh Hạnh', oral: [8.0], m15: [8.5, 8.0], m45: [8.5], midterm: 8.2, final: 8.5, avg: 8.3, rank: 'Giỏi', remarks: 'Cần chú ý cân bằng phương trình oxi hóa - khử phức tạp.' },
    { code: 'VAN', name: 'Ngữ Văn 10', teacher: 'Cô Lê Hoàng Lan', oral: [8.0], m15: [8.0, 8.5], m45: [8.0], midterm: 8.4, final: 8.5, avg: 8.3, rank: 'Giỏi', remarks: 'Lập luận nghị luận văn học mạch lạc, dẫn chứng phong phú.' },
    { code: 'ANH', name: 'Tiếng Anh 10', teacher: 'Thầy Robert Miller', oral: [9.0], m15: [9.0, 9.5], m45: [9.0], midterm: 9.2, final: 9.0, avg: 9.1, rank: 'Xuất sắc', remarks: 'Khả năng thuyết trình tiếng Anh lưu loát, phát âm chuẩn.' },
    { code: 'TIN', name: 'Tin học (Python)', teacher: 'Thầy Lê Quốc Tuấn', oral: [10], m15: [9.5, 10], m45: [9.5], midterm: 9.8, final: 9.5, avg: 9.7, rank: 'Xuất sắc', remarks: 'Kỹ năng thuật toán và cấu trúc dữ liệu tốt, hoàn thành bài tập dự án sớm.' },
    { code: 'SINH', name: 'Sinh học 10', teacher: 'Cô Nguyễn Thu Hà', oral: [8.5], m15: [8.5, 8.5], m45: [8.5], midterm: 8.5, final: 8.8, avg: 8.6, rank: 'Giỏi', remarks: 'Nắm vững kiến thức sinh học tế bào và phân bào.' },
    { code: 'SU', name: 'Lịch sử 10', teacher: 'Thầy Vũ Hoài Nam', oral: [8.0], m15: [8.5], m45: [8.5], midterm: 8.2, final: 8.5, avg: 8.4, rank: 'Giỏi', remarks: 'Có hứng thú học tập và liên hệ tốt các sự kiện lịch sử.' },
    { code: 'DIA', name: 'Địa lý 10', teacher: 'Cô Trần Mai Phương', oral: [8.5], m15: [8.5], m45: [8.5], midterm: 8.5, final: 8.5, avg: 8.5, rank: 'Giỏi', remarks: 'Đọc bản đồ và phân tích số liệu địa lý tốt.' },
    { code: 'GDCD', name: 'Giáo dục kinh tế & pháp luật', teacher: 'Cô Nguyễn Thị Sen', oral: [9.0], m15: [9.0], m45: [9.0], midterm: 9.0, final: 9.2, avg: 9.1, rank: 'Xuất sắc', remarks: 'Hiểu biết pháp luật tốt, tích cực trao đổi thảo luận tình huống.' },
  ];

  res.json({
    success: true,
    data: {
      studentId,
      academicYear: '2024 - 2025',
      term: 'Học kỳ I',
      gpa: isMiddleSchool ? 9.2 : 8.8,
      conduct: 'Tốt',
      academicRank: isMiddleSchool ? 'Học sinh Xuất sắc' : 'Học sinh Giỏi',
      classRank: isMiddleSchool ? '01 / 35' : '03 / 38',
      subjects,
    }
  });
});

// Full invoices history
router.get('/invoices', optionalAuth, (req, res) => {
  const studentId = req.query.studentId || 'std_khoi';
  const invoice = db.prepare('SELECT * FROM tuition_invoices WHERE student_id = ?').get(studentId);

  const pastInvoices = [
    {
      id: `inv_${studentId}_t10`,
      period: 'Kỳ thu: Tháng 10/2024',
      total: studentId === 'std_chau' ? '2.800.000' : '3.250.000',
      totalAmount: studentId === 'std_chau' ? 2800000 : 3250000,
      status: 'paid',
      paidAt: '05/10/2024 14:22',
      paymentMethod: 'VietQR Napas 24/7 (Vietcombank)',
      receiptNo: `BL-2024-10-${studentId === 'std_chau' ? '0812' : '0421'}`,
      items: studentId === 'std_chau' ? [
        { label: 'Học phí chính khóa THCS', amount: '1.500.000 đ' },
        { label: 'Bán trú & Ăn trưa học đường', amount: '1.050.000 đ' },
        { label: 'CLB Tiếng Anh cuối tuần', amount: '250.000 đ' },
      ] : [
        { label: 'Học phí chính khóa', amount: '1.800.000 đ' },
        { label: 'Bán trú & Dinh dưỡng', amount: '1.150.000 đ' },
        { label: 'Quỹ hoạt động & Ngoại khóa', amount: '300.000 đ' },
      ],
    },
    {
      id: `inv_${studentId}_t09`,
      period: 'Kỳ thu: Tháng 09/2024 (Đầu năm học)',
      total: studentId === 'std_chau' ? '4.200.000' : '4.850.000',
      totalAmount: studentId === 'std_chau' ? 4200000 : 4850000,
      status: 'paid',
      paidAt: '02/09/2024 09:15',
      paymentMethod: 'VietQR Napas 24/7 (MB Bank)',
      receiptNo: `BL-2024-09-${studentId === 'std_chau' ? '0104' : '0098'}`,
      items: studentId === 'std_chau' ? [
        { label: 'Học phí chính khóa THCS (T9)', amount: '1.500.000 đ' },
        { label: 'Bảo hiểm y tế học sinh (12 tháng)', amount: '972.000 đ' },
        { label: 'Quỹ cơ sở vật chất năm học', amount: '678.000 đ' },
        { label: 'Bán trú & Ăn trưa tháng 9', amount: '1.050.000 đ' },
      ] : [
        { label: 'Học phí chính khóa (T9)', amount: '1.800.000 đ' },
        { label: 'Bảo hiểm y tế học sinh (12 tháng)', amount: '972.000 đ' },
        { label: 'Cơ sở vật chất & Thư viện số', amount: '928.000 đ' },
        { label: 'Bán trú & Dinh dưỡng tháng 9', amount: '1.150.000 đ' },
      ],
    }
  ];

  res.json({
    success: true,
    currentInvoice: invoice ? {
      id: invoice.id,
      period: invoice.period,
      total: invoice.total_amount.toLocaleString('vi-VN'),
      totalAmount: invoice.total_amount,
      dueDate: invoice.due_date,
      status: invoice.status,
      paidAt: invoice.paid_at,
      items: JSON.parse(invoice.items || '[]'),
      qrInfo: {
        bank: invoice.bank_name,
        accountNumber: invoice.account_number,
        accountName: invoice.account_name,
        amount: invoice.total_amount,
        description: invoice.transfer_memo,
      }
    } : null,
    pastInvoices
  });
});

export default router;
