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
      studentInfo: {
        id: student ? student.id : 'std_khang',
        name: student ? student.name : 'Nguyễn Minh Khang',
        class: student ? `Lớp ${student.class_name}` : 'Lớp 10A1',
      },
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

// Get all assignments for student
router.get('/assignments', optionalAuth, (req, res) => {
  const studentId = 'std_khang';
  const assignments = db.prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM assignment_questions q WHERE q.assignment_id = a.id) as question_count,
      sub.status as submission_status,
      sub.score as student_score,
      sub.submitted_at as submitted_at
    FROM assignments a
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
    ORDER BY a.due_date ASC
  `).all(studentId);

  const formatted = assignments.map((a, idx) => ({
    id: a.id,
    title: a.title,
    subject: a.subject,
    type: a.type,
    instructions: a.instructions,
    dueDate: a.due_date,
    dueTime: a.due_time,
    durationMinutes: a.duration_minutes || 45,
    gradingScale: a.grading_scale || 'Thang 10',
    questionCount: a.question_count || 5,
    status: a.submission_status || 'assigned',
    score: a.student_score,
    submittedAt: a.submitted_at,
    urgency: idx === 0 ? 'urgent' : idx === 1 ? 'warning' : 'normal',
  }));

  res.json({ success: true, assignments: formatted });
});

// Get assignment details with questions for exam taking
router.get('/assignments/:id', optionalAuth, (req, res) => {
  const assignmentId = req.params.id;
  const studentId = 'std_khang';

  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy bài tập' });
  }

  const questions = db.prepare(`
    SELECT id, question_order, prompt, points, has_plot, plot_data, options, explanation
    FROM assignment_questions
    WHERE assignment_id = ?
    ORDER BY question_order ASC
  `).all(assignmentId);

  const formattedQuestions = questions.map((q) => {
    let parsedOptions = [];
    try {
      parsedOptions = JSON.parse(q.options || '[]');
    } catch {
      parsedOptions = [];
    }
    return {
      id: q.id,
      order: q.question_order,
      prompt: q.prompt,
      points: q.points,
      hasPlot: Boolean(q.has_plot),
      plotData: q.plot_data,
      options: parsedOptions,
      explanation: q.explanation,
    };
  });

  const submission = db.prepare(`
    SELECT * FROM assignment_submissions
    WHERE assignment_id = ? AND student_id = ?
  `).get(assignmentId, studentId);

  res.json({
    success: true,
    assignment: {
      id: assignment.id,
      title: assignment.title,
      subject: assignment.subject,
      type: assignment.type,
      instructions: assignment.instructions,
      dueDate: assignment.due_date,
      dueTime: assignment.due_time,
      durationMinutes: assignment.duration_minutes || 45,
      questions: formattedQuestions,
      isSubmitted: Boolean(submission),
      submission: submission ? {
        status: submission.status,
        score: submission.score,
        answers: JSON.parse(submission.student_answers || '{}'),
        submittedAt: submission.submitted_at,
        feedback: submission.teacher_feedback,
      } : null,
    },
  });
});

// Submit an assignment & calculate score
router.post('/assignments/:id/submit', optionalAuth, (req, res) => {
  const assignmentId = req.params.id;
  const { studentAnswers } = req.body;
  const studentId = 'std_khang';

  // Get questions to auto-grade
  const questions = db.prepare(`
    SELECT id, options, points
    FROM assignment_questions
    WHERE assignment_id = ?
  `).all(assignmentId);

  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;

  questions.forEach((q) => {
    const pts = q.points || 1.0;
    maxScore += pts;
    let parsedOptions = [];
    try {
      parsedOptions = JSON.parse(q.options || '[]');
    } catch {}
    const correctOpt = parsedOptions.find((opt) => opt.isCorrect);
    const studentAns = studentAnswers?.[q.id];

    if (correctOpt && studentAns && studentAns === correctOpt.id) {
      totalScore += pts;
      correctCount += 1;
    }
  });

  // Calculate score scaled to 10
  const finalScore = maxScore > 0 ? parseFloat(((totalScore / maxScore) * 10).toFixed(1)) : 8.5;

  const subId = `sub_${Date.now()}`;
  db.prepare(`
    INSERT INTO assignment_submissions (id, assignment_id, student_id, status, score, student_answers)
    VALUES (?, ?, ?, 'graded', ?, ?)
    ON CONFLICT(id) DO UPDATE SET status = 'graded', score = excluded.score, student_answers = excluded.student_answers, submitted_at = CURRENT_TIMESTAMP
  `).run(subId, assignmentId, studentId, finalScore, JSON.stringify(studentAnswers || {}));

  // Get assignment info for gradebook insert
  const asg = db.prepare('SELECT title, subject FROM assignments WHERE id = ?').get(assignmentId);
  if (asg) {
    db.prepare(`
      INSERT INTO grades (id, student_id, subject, test_name, score, max_score, teacher_name, comment)
      VALUES (?, ?, ?, ?, ?, 10, 'Hệ thống Khảo thí EduPortal', 'Tự động chấm điểm trắc nghiệm trực tuyến.')
      ON CONFLICT(id) DO NOTHING
    `).run(`grd_auto_${Date.now()}`, studentId, asg.subject, asg.title, finalScore);
  }

  // Log activity
  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type)
    VALUES (?, ?, 'student', ?, 'Đã nộp bài', 'success')
  `).run(`log_${Date.now()}`, 'Học sinh Nguyễn Minh Khang', `Đã hoàn thành và nộp bài thi "${asg?.title || assignmentId}" (Đạt ${finalScore}/10 điểm).`);

  res.json({
    success: true,
    message: 'Nộp bài tập thành công!',
    score: finalScore,
    maxScore: 10,
    correctCount,
    totalQuestions: questions.length,
  });
});

// Get Student Grades & Transcript
router.get('/grades', optionalAuth, (req, res) => {
  const studentId = 'std_khang';

  const grades = db.prepare(`
    SELECT * FROM grades
    WHERE student_id = ?
    ORDER BY graded_at DESC
  `).all(studentId);

  // Group by subject
  const subjectMap = {};
  grades.forEach((g) => {
    if (!subjectMap[g.subject]) {
      subjectMap[g.subject] = [];
    }
    subjectMap[g.subject].push(g);
  });

  const subjectAverages = Object.entries(subjectMap).map(([subject, items]) => {
    const avg = items.reduce((acc, cur) => acc + cur.score, 0) / items.length;
    return {
      subject,
      average: parseFloat(avg.toFixed(2)),
      testsCount: items.length,
      recentTest: items[0].test_name,
      recentScore: items[0].score,
      teacherComment: items[0].comment,
      tests: items,
    };
  });

  const overallGpa = subjectAverages.length > 0
    ? parseFloat((subjectAverages.reduce((acc, cur) => acc + cur.average, 0) / subjectAverages.length).toFixed(2))
    : 8.8;

  res.json({
    success: true,
    grades,
    data: {
      studentName: 'Nguyễn Minh Khang',
      className: 'Lớp 10A1 • Chuyên Toán - Tin',
      academicYear: 'Năm học 2024 - 2025',
      semester: 'Học kỳ I',
      overallGpa,
      classRank: '03 / 42',
      conduct: 'Tốt',
      attendanceRate: '98.5%',
      totalCredits: 34,
      subjects: subjectAverages,
      recentGrades: grades.slice(0, 10),
    },
  });
});

// Get Student Timetable
router.get('/timetable', optionalAuth, (req, res) => {
  res.json({
    success: true,
    schedule: [
      {
        day: 'Thứ Hai',
        periods: [
          { period: 1, subject: 'Toán học (Đại số)', time: '07:30 - 08:15', teacher: 'Cô Mai Lan', room: 'Phòng 201' },
          { period: 2, subject: 'Toán học (Đại số)', time: '08:20 - 09:05', teacher: 'Cô Mai Lan', room: 'Phòng 201' },
          { period: 3, subject: 'Vật lý 10', time: '09:20 - 10:05', teacher: 'Thầy Quang Dũng', room: 'Phòng 201' },
        ],
      },
      {
        day: 'Thứ Ba',
        periods: [
          { period: 1, subject: 'Hóa học 10', time: '07:30 - 08:15', teacher: 'Cô Thu Nga', room: 'Phòng Lab 1' },
          { period: 2, subject: 'Sinh học 10', time: '08:20 - 09:05', teacher: 'Thầy Quốc Bảo', room: 'Phòng 201' },
        ],
      },
      {
        day: 'Thứ Tư',
        periods: [
          { period: 1, subject: 'Ngữ văn 10', time: '07:30 - 09:05', teacher: 'Cô Hoàng Lan', room: 'Phòng 201' },
          { period: 2, subject: 'Lịch sử 10', time: '09:20 - 10:05', teacher: 'Thầy Hoài Nam', room: 'Phòng 201' },
        ],
      },
      {
        day: 'Thứ Năm',
        periods: [
          { period: 1, subject: 'Tin học Python', time: '14:00 - 15:35', teacher: 'Thầy Quốc Tuấn', room: 'Phòng máy 2' },
          { period: 2, subject: 'Anh văn chuyên đề', time: '15:50 - 17:25', teacher: 'Cô Sarah Jenkins', room: 'Phòng A102' },
        ],
      },
      {
        day: 'Thứ Sáu',
        periods: [
          { period: 1, subject: 'Hình học không gian', time: '07:30 - 09:05', teacher: 'Cô Mai Lan', room: 'Phòng 201' },
          { period: 2, subject: 'Giáo dục thể chất', time: '09:20 - 10:05', teacher: 'Thầy Văn Đức', room: 'Sân bóng' },
        ],
      },
    ],
  });
});

// Get Student Attendance
router.get('/attendance', optionalAuth, (req, res) => {
  res.json({
    success: true,
    attendance: {
      rate: '98.5%',
      totalDays: 90,
      presentDays: 89,
      absentDays: 1,
      lateDays: 0,
      status: 'Xuất sắc',
      records: [
        { date: '2026-09-18', status: 'present', note: 'Đúng giờ' },
        { date: '2026-09-17', status: 'present', note: 'Đúng giờ' },
        { date: '2026-09-16', status: 'present', note: 'Đúng giờ' },
        { date: '2026-09-15', status: 'excused', note: 'Nghỉ ốm có phép' },
      ],
    },
  });
});

// Get Study Resources (supports both /resources and /study-resources)
const getStudyResourcesHandler = (req, res) => {
  const { subject, type, search } = req.query;

  let query = 'SELECT * FROM study_resources WHERE 1=1';
  const params = [];

  if (subject && subject !== 'Tất cả') {
    query += ' AND subject = ?';
    params.push(subject);
  }
  if (type && type !== 'all') {
    query += ' AND type = ?';
    params.push(type);
  }
  if (search) {
    query += ' AND (title LIKE ? OR uploaded_by LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY downloads_count DESC, created_at DESC';

  const resources = db.prepare(query).all(...params);
  res.json({ success: true, resources });
};

router.get('/resources', optionalAuth, getStudyResourcesHandler);
router.get('/study-resources', optionalAuth, getStudyResourcesHandler);

// Download study resource counter increment
router.post('/resources/:id/download', optionalAuth, (req, res) => {
  const resourceId = req.params.id;
  db.prepare('UPDATE study_resources SET downloads_count = downloads_count + 1 WHERE id = ?').run(resourceId);
  res.json({ success: true, message: 'Đã cập nhật lượt tải về' });
});

export default router;
