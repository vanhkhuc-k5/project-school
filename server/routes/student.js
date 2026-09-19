import express from 'express';
import { db } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get Student Dashboard Data
router.get('/dashboard', optionalAuth, (req, res) => {
  const userId = req.user?.id || 'usr_student_1';

  // Get student info
  const student = db.prepare(`
    SELECT s.*, u.name, u.code, u.avatar, c.name as class_name
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN classes c ON s.class_id = c.id
    WHERE u.id = ? OR s.id = 'std_khang'
    LIMIT 1
  `).get(userId);

  // Get assignments for student's class
  const assignments = db.prepare(`
    SELECT a.*, 
      (SELECT COUNT(*) FROM assignment_questions q WHERE q.assignment_id = a.id) as question_count,
      (SELECT sub.status FROM assignment_submissions sub WHERE sub.assignment_id = a.id AND sub.student_id = ?) as submission_status
    FROM assignments a
    ORDER BY a.due_date ASC, a.due_time ASC
  `).all(student ? student.id : 'std_khang');

  // Format assignments with urgent tags
  const formattedAssignments = assignments.map((a, idx) => {
    let tag = 'Tiêu chuẩn';
    let tagType = 'info';
    let remaining = 'Còn 2 ngày';

    if (idx === 0) {
      tag = 'Gấp';
      tagType = 'danger';
      remaining = 'Còn 3 giờ 15 phút';
    } else if (idx === 1) {
      tag = 'Sắp đến hạn';
      tagType = 'warning';
      remaining = 'Còn 21 giờ';
    }

    return {
      id: a.id,
      subject: a.subject,
      title: a.title,
      tag,
      tagType,
      remaining,
      deadline: `${a.due_date} ${a.due_time}`,
      questionInfo: a.type === 'quiz' ? `${a.question_count || 10} câu hỏi` : a.instructions?.substring(0, 30) + '...',
      actionLabel: a.submission_status === 'submitted' ? 'Đã nộp bài' : idx === 0 ? 'Nộp bài ngay' : 'Tiếp tục làm',
      status: a.submission_status || 'assigned',
    };
  });

  // Get recent grades
  const grades = db.prepare(`
    SELECT * FROM grades
    WHERE student_id = ?
    ORDER BY graded_at DESC
    LIMIT 5
  `).all(student ? student.id : 'std_khang');

  const formattedGrades = grades.map((g) => ({
    id: g.id,
    subject: g.subject,
    testName: g.test_name,
    score: g.score,
    maxScore: g.max_score,
    teacher: g.teacher_name,
    comment: g.comment,
    status: 'Đã chấm',
  }));

  // Get competencies
  const competencies = db.prepare(`
    SELECT * FROM student_competencies
    WHERE student_id = ?
  `).all(student ? student.id : 'std_khang');

  const strengths = competencies
    .filter((c) => c.is_strength === 1)
    .map((c) => ({ topic: c.topic, percent: c.proficiency_percent }));

  const needsPractice = competencies
    .filter((c) => c.is_strength === 0)
    .map((c) => ({ topic: c.topic, percent: c.proficiency_percent, hint: c.hint }));

  // Pending count
  const pendingCount = formattedAssignments.filter((a) => a.status !== 'submitted').length;

  res.json({
    success: true,
    data: {
      student: {
        name: student ? student.name.split(' ').slice(-1)[0] : 'Minh Khang',
        fullName: student ? student.name : 'Nguyễn Minh Khang',
        class: student ? `Lớp ${student.class_name} - K52` : 'Lớp 11A1 - K52',
        dateText: 'Hôm nay thứ Năm, 24 tháng 10',
        dueCount: pendingCount,
        dueDeadline: '23:59',
      },
      kpis: {
        dailyPlan: {
          completed: 3,
          total: 5,
          percent: 60,
          done: 3,
          inProgress: 1,
          notStarted: 1,
        },
        pendingAssignments: {
          count: pendingCount,
          urgentCount: 1,
          note: '1 bài hạn chót hôm nay',
        },
        weeklyAverage: {
          score: student ? student.gpa : 8.8,
          diff: '+0.4',
          previous: 8.4,
        },
        aiStudyTime: {
          minutes: 45,
          target: 45,
          achieved: true,
          note: 'Đạt mục tiêu tự học 45m',
        },
      },
      urgentAssignments: formattedAssignments,
      recentGrades: formattedGrades,
      competencies: {
        strengths: strengths.length > 0 ? strengths : [
          { topic: 'Đại số & Lượng giác', percent: 92 },
          { topic: 'Đọc hiểu Tiếng Anh', percent: 88 },
          { topic: 'Hóa vô cơ', percent: 85 },
        ],
        needsPractice: needsPractice.length > 0 ? needsPractice : [
          { topic: 'Hình học không gian', percent: 64, hint: 'Gợi ý: Ôn lại góc giữa 2 mặt phẳng' },
          { topic: 'Từ vựng chuyên đề Anh 11', percent: 70, hint: 'Gợi ý: Ôn lại 30 từ vựng Unit 4' },
        ],
        aiSuggestion: {
          message: 'AI nhận thấy bạn gặp chút khó khăn ở bài tập Hình học không gian tối qua. Bạn có muốn làm lại không?',
          topicId: 'geom_space',
        },
      },
      afternoonSchedule: [
        { period: 'Tiết 6 - 7', time: '14:00 - 15:35', subject: 'Tin học 11', room: 'Phòng máy 204', teacher: 'Thầy Minh', status: 'Sắp tới' },
        { period: 'Tiết 8 - 9', time: '15:50 - 17:25', subject: 'Anh văn chuyên đề', room: 'Phòng A102', teacher: 'Cô Mai', status: 'Kế tiếp' },
      ],
      scheduleNote: 'Mang theo laptop cá nhân và giáo trình thực hành cho tiết Tin học.',
    },
  });
});

// Submit an assignment
router.post('/assignments/:id/submit', optionalAuth, (req, res) => {
  const assignmentId = req.params.id;
  const { studentAnswers } = req.body;
  const studentId = 'std_khang';

  const subId = `sub_${Date.now()}`;
  db.prepare(`
    INSERT INTO assignment_submissions (id, assignment_id, student_id, status, student_answers)
    VALUES (?, ?, ?, 'submitted', ?)
    ON CONFLICT(id) DO UPDATE SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP
  `).run(subId, assignmentId, studentId, JSON.stringify(studentAnswers || {}));

  // Log activity
  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type)
    VALUES (?, ?, 'student', 'Đã nộp bài tập trực tuyến.', 'Đã nộp bài', 'success')
  `).run(`log_${Date.now()}`, 'Học sinh Nguyễn Minh Khang');

  res.json({ success: true, message: 'Nộp bài tập thành công!' });
});

export default router;
