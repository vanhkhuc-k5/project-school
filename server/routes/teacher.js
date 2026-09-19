import express from 'express';
import { db } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get Teacher Analytics Data
router.get('/analytics', (req, res) => {
  // Query all students in Class 10A1
  const students = db.prepare(`
    SELECT s.*, u.name, u.code, u.avatar
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE s.class_id = 'cls_10A1'
    ORDER BY s.gpa ASC
  `).all();

  const formattedStudents = students.map((s) => {
    let riskLevel = 'good';
    let riskText = 'Xuất sắc';
    let riskBadgeType = 'success';

    if (s.gpa < 5.5) {
      riskLevel = 'high';
      riskText = s.gpa < 5.0 ? 'Nguy cơ tụt hạng' : 'Hay quên nộp bài';
      riskBadgeType = 'danger';
    } else if (s.gpa < 6.5) {
      riskLevel = 'warning';
      riskText = 'Cần chú ý';
      riskBadgeType = 'warning';
    } else if (s.gpa < 8.5) {
      riskLevel = 'good';
      riskText = 'Tiến bộ';
      riskBadgeType = 'success';
    }

    const nameParts = s.name.split(' ');
    const initials = (nameParts[0][0] + (nameParts[nameParts.length - 1]?.[0] || '')).toUpperCase();

    return {
      id: s.id,
      code: s.code || 'HS110000',
      name: s.name,
      initials,
      avatarColor: riskLevel === 'high' ? 'bg-red-100 text-red-700' : riskLevel === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
      gpa: s.gpa,
      gpaDiff: '+0.2',
      submissionRate: Math.round(s.attendance_rate || 85),
      riskLevel,
      riskText,
      riskBadgeType,
      keyTopics: riskLevel === 'high' ? ['Hình không gian', 'Lượng giác'] : ['Thế mạnh toàn diện'],
    };
  });

  const highRiskCount = formattedStudents.filter((s) => s.riskLevel === 'high').length;
  const warningCount = formattedStudents.filter((s) => s.riskLevel === 'warning').length;
  const goodCount = formattedStudents.filter((s) => s.riskLevel === 'good').length;

  res.json({
    success: true,
    data: {
      currentClass: 'Lớp 10A1 (Toán học)',
      classes: ['Lớp 10A1 (Toán học)', 'Lớp 10A2 (Toán học)', 'Lớp 11A3 (Đại số)'],
      currentTerm: 'Học kỳ I - Năm học 2023 - 2024',
      terms: ['Học kỳ I - Năm học 2023 - 2024', 'Học kỳ II - Năm học 2023 - 2024'],
      topics: ['Tất cả chuyên đề', 'Đại số', 'Hình học không gian', 'Lượng giác', 'Xác suất thống kê'],
      lastUpdated: 'Cập nhật thời gian thực từ Database',
      kpis: {
        proficiency: { value: '76.4%', change: '+3.2%', note: 'So với đợt đánh giá giữa kỳ' },
        passing: { current: goodCount, total: formattedStudents.length, percent: `${Math.round((goodCount / formattedStudents.length) * 100)}%`, note: 'Nắm vững trọng tâm học phần' },
        monitoring: { count: `0${warningCount}`, note: 'Hổng kiến thức hình học không gian', tag: 'Mức độ 2' },
        danger: { count: `0${highRiskCount}`, note: 'Cần lập kế hoạch phụ đạo gấp', tag: 'Báo động' },
      },
      radarTopics: [
        { label: 'Hàm số & Đồ thị', classScore: 88, standardScore: 75 },
        { label: 'PT & BPT', classScore: 80, standardScore: 72 },
        { label: 'Hình không gian', classScore: 54, standardScore: 70 },
        { label: 'Lượng giác', classScore: 72, standardScore: 68 },
        { label: 'Xác suất TK', classScore: 78, standardScore: 70 },
      ],
      radarInsights: {
        strength: {
          percent: '88% đạt chuẩn',
          title: 'Điểm mạnh nổi bật',
          desc: 'Chuyên đề Hàm số & Khảo sát đồ thị: Đa số học sinh nắm chắc dạng toán biện luận tham số m.',
        },
        weakness: {
          percent: '54% đạt chuẩn',
          title: 'Chuyên đề thiếu hụt kiến thức',
          desc: 'Hình học không gian: 16 em gặp trở ngại xác định góc giữa đường thẳng và mặt phẳng.',
        },
      },
      students: formattedStudents,
      recommendation: {
        week: 'Khuyến nghị chuyên môn tuần 14',
        content: 'Nên dành 2 tiết luyện tập tăng cường ôn tập phương pháp dựng hình chiếu vuông góc và tính khoảng cách trước kỳ thi giữa kỳ.',
      },
      interventionAlert: {
        title: 'Can thiệp sư phạm kịp thời',
        countBadge: `${highRiskCount} học sinh cần hỗ trợ`,
        description: 'Hệ thống đã chuẩn bị sẵn phiếu khảo sát tiến độ và mẫu thông báo 1-click riêng cho phụ huynh.',
      }
    }
  });
});

// Create new assignment
router.post('/assignments', optionalAuth, (req, res) => {
  const { title, subject, type, instructions, targetClasses, deadlineDate, deadlineTime, durationMinutes, questions } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, message: 'Tiêu đề bài tập không được để trống' });
  }

  const asgId = `asg_${Date.now()}`;
  db.prepare(`
    INSERT INTO assignments (id, title, subject, type, instructions, target_classes, due_date, due_time, duration_minutes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'usr_teacher_1')
  `).run(
    asgId,
    title,
    subject || 'Toán học',
    type || 'quiz',
    instructions || '',
    JSON.stringify(targetClasses || ['10A1', '10A2']),
    deadlineDate || '2024-10-30',
    deadlineTime || '23:59',
    durationMinutes || 45
  );

  // Insert questions if provided
  if (Array.isArray(questions)) {
    const insertQ = db.prepare(`
      INSERT INTO assignment_questions (id, assignment_id, question_order, prompt, points, has_plot, plot_data, options, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    questions.forEach((q, idx) => {
      insertQ.run(
        `q_${asgId}_${idx + 1}`,
        asgId,
        idx + 1,
        q.prompt || `Câu hỏi số ${idx + 1}`,
        q.points || 1.0,
        q.hasPlot ? 1 : 0,
        q.plotData || null,
        JSON.stringify(q.options || []),
        q.explanation || ''
      );
    });
  }

  // Record audit log
  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type)
    VALUES (?, ?, 'teacher', ?, 'Đã giao bài', 'success')
  `).run(`log_${Date.now()}`, 'Cô Mai Lan', `Vừa tạo bài tập mới: ${title}`);

  res.json({ success: true, message: 'Đã tạo và giao bài tập thành công!', assignmentId: asgId });
});

// Dispatch 1-click notification to parents
router.post('/intervene-notify', optionalAuth, (req, res) => {
  const noticeId = `notif_${Date.now()}`;
  db.prepare(`
    INSERT INTO school_notices (id, title, content, category, tag, tag_type, sender, can_confirm)
    VALUES (?, ?, ?, 'teacher', 'Cần can thiệp', 'warning', 'Cô Mai Lan (Tổ Toán học)', 1)
  `).run(
    noticeId,
    'Thông báo tiến độ chuyên đề môn Toán & Đề xuất buổi phụ đạo',
    'Nhà trường và giáo viên bộ môn Toán gửi thông báo khảo sát chuyên đề Hình không gian và kính mời phụ huynh hỗ trợ động viên học sinh tham gia lớp phụ đạo chiều thứ Năm.'
  );

  // Log audit
  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type)
    VALUES (?, ?, 'teacher', 'Đã gửi thông báo can thiệp sư phạm đến phụ huynh học sinh cần hỗ trợ.', 'Đã thông báo', 'warning')
  `).run(`log_${Date.now()}`, 'Cô Mai Lan');

  res.json({ success: true, message: 'Đã gửi thông báo thành công đến phụ huynh!' });
});

export default router;
