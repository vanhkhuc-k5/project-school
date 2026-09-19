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
    data: {
      currentChildId: formattedChildren[0]?.id || 'std_khoi',
      children: formattedChildren,
      notifications: formattedNotices,
    }
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

export default router;
