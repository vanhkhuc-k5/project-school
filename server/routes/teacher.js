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

// Get Classes and Student Roster with live gradebook
router.get('/classes', optionalAuth, (req, res) => {
  const classId = req.query.classId || 'cls_10A1';

  const classes = db.prepare('SELECT * FROM classes ORDER BY grade_level, name').all();

  const students = db.prepare(`
    SELECT s.*, u.name, u.code, u.phone, u.avatar
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE s.class_id = ?
    ORDER BY s.class_rank ASC, s.gpa DESC
  `).all(classId);

  // Attach recent grades
  const formattedStudents = students.map((s) => {
    const recentGrades = db.prepare(`
      SELECT subject, test_name, score, graded_at
      FROM grades
      WHERE student_id = ?
      ORDER BY graded_at DESC
      LIMIT 3
    `).all(s.id);

    return {
      id: s.id,
      code: s.code || 'HS-10-001',
      name: s.name,
      phone: s.phone,
      avatar: s.avatar,
      gpa: s.gpa,
      rank: s.class_rank || '12',
      attendance: `${s.attendance_rate || 96}%`,
      status: s.gpa >= 8.0 ? 'Giỏi / Xuất sắc' : s.gpa >= 6.5 ? 'Khá' : 'Cần theo dõi',
      statusType: s.gpa >= 8.0 ? 'success' : s.gpa >= 6.5 ? 'info' : 'warning',
      recentGrades,
    };
  });

  res.json({
    success: true,
    currentClassId: classId,
    classes: classes.map((c) => ({ id: c.id, name: c.name, grade: c.grade_level, count: 42 })),
    students: formattedStudents,
  });
});

// Teacher enters or edits a student's grade
router.post('/grades', optionalAuth, (req, res) => {
  const { studentId, subject, testName, score, maxScore, comment } = req.body;

  if (!studentId || score === undefined) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin điểm số' });
  }

  const gradeId = `grd_${Date.now()}`;
  db.prepare(`
    INSERT INTO grades (id, student_id, subject, test_name, score, max_score, teacher_name, comment)
    VALUES (?, ?, ?, ?, ?, ?, 'Cô Mai Lan', ?)
  `).run(gradeId, studentId, subject || 'Toán học 10', testName || 'Kiểm tra thường xuyên', parseFloat(score), maxScore || 10, comment || 'Đã ghi nhận điểm kiểm tra.');

  // Recalculate student GPA
  const avgRow = db.prepare('SELECT AVG(score) as avg FROM grades WHERE student_id = ?').get(studentId);
  if (avgRow && avgRow.avg) {
    const newGpa = parseFloat(avgRow.avg.toFixed(2));
    db.prepare('UPDATE students SET gpa = ? WHERE id = ?').run(newGpa, studentId);
  }

  // Log activity
  const student = db.prepare('SELECT u.name FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?').get(studentId);
  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type)
    VALUES (?, 'Cô Mai Lan', 'teacher', ?, 'Đã cập nhật', 'success')
  `).run(`log_${Date.now()}`, `Đã cập nhật điểm số ${score}đ môn ${subject || 'Toán'} cho học sinh ${student?.name || studentId}.`);

  res.json({ success: true, message: 'Cập nhật điểm thành công!', gradeId });
});

// Get Assignments with grading queue & submissions
router.get('/assignments', optionalAuth, (req, res) => {
  const assignments = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM assignment_questions q WHERE q.assignment_id = a.id) as question_count,
      (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) as submitted_count,
      (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id AND s.status = 'graded') as graded_count,
      (SELECT AVG(s.score) FROM assignment_submissions s WHERE s.assignment_id = a.id) as avg_score
    FROM assignments a
    ORDER BY a.created_at DESC
  `).all();

  // Get submissions queue
  const submissions = db.prepare(`
    SELECT sub.*, a.title as assignment_title, a.subject as assignment_subject, u.name as student_name, u.code as student_code, c.name as class_name
    FROM assignment_submissions sub
    JOIN assignments a ON sub.assignment_id = a.id
    JOIN students s ON sub.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN classes c ON s.class_id = c.id
    ORDER BY sub.submitted_at DESC
    LIMIT 20
  `).all();

  res.json({
    success: true,
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      subject: a.subject,
      type: a.type,
      targetClasses: JSON.parse(a.target_classes || '[]'),
      dueDate: a.due_date,
      dueTime: a.due_time,
      durationMinutes: a.duration_minutes,
      questionCount: a.question_count || 5,
      submittedCount: a.submitted_count || 0,
      gradedCount: a.graded_count || 0,
      avgScore: a.avg_score ? parseFloat(a.avg_score.toFixed(1)) : null,
      status: 'active',
    })),
    gradingQueue: submissions.map((sub) => ({
      id: sub.id,
      assignmentId: sub.assignment_id,
      assignmentTitle: sub.assignment_title,
      subject: sub.assignment_subject,
      studentName: sub.student_name,
      studentCode: sub.student_code,
      className: sub.class_name,
      status: sub.status,
      score: sub.score,
      submittedAt: sub.submitted_at,
      feedback: sub.teacher_feedback,
    })),
  });
});

// Grade student submission
router.post('/submissions/:id/grade', optionalAuth, (req, res) => {
  const submissionId = req.params.id;
  const { score, feedback } = req.body;

  db.prepare(`
    UPDATE assignment_submissions
    SET score = ?, teacher_feedback = ?, status = 'graded'
    WHERE id = ?
  `).run(parseFloat(score), feedback || 'Đã chấm điểm hoàn tất.', submissionId);

  res.json({ success: true, message: 'Chấm bài hoàn tất!' });
});

// Teacher pedagogical summary report
router.get('/reports', optionalAuth, (req, res) => {
  const avgScoresByTopic = [
    { topic: 'Khảo sát hàm số bậc hai', avg: 8.6, passRate: '95%', target: '90%' },
    { topic: 'Bất phương trình & Dấu tam thức', avg: 7.8, passRate: '88%', target: '85%' },
    { topic: 'Hệ thức lượng trong tam giác', avg: 7.2, passRate: '82%', target: '80%' },
    { topic: 'Hình học không gian & Khoảng cách', avg: 5.4, passRate: '54%', target: '75%' },
    { topic: 'Đại số tổ hợp & Nhị thức Newton', avg: 7.9, passRate: '85%', target: '80%' },
  ];

  res.json({
    success: true,
    data: {
      termName: 'Báo cáo Sư phạm Tổng kết Giữa Kỳ I (2024 - 2025)',
      teacherName: 'Cô Mai Lan',
      department: 'Tổ Toán - Tin học',
      classSummary: {
        totalStudents: 42,
        evaluatedCount: 42,
        excellentCount: 16,
        goodCount: 18,
        averageCount: 6,
        warningCount: 2,
      },
      topics: avgScoresByTopic,
    },
  });
});

export default router;
