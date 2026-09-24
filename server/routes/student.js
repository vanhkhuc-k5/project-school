import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, requirePermission } from '../middleware/auth.js';
import { isPostgresConfigured, pgQuery } from '../shared/database/index.js';
import { timetableService } from '../modules/timetable/index.js';
import { attendanceController, attendanceService } from '../modules/attendance/index.js';

const router = express.Router();


// Enforce authentication & role across all student endpoints
router.use(authenticateToken);
router.use(requireRole('student', 'admin', 'school_admin', 'super_admin'));

// ============================================================
// Student Dashboard — Real Personalized Data (G22)
// ============================================================

router.get('/dashboard', requirePermission('student.read'), async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const now = new Date();

    // ── 1. Derive student identity from authenticated user ──────────────────────
    // Always use SQLite for compatibility
    const studentInfo = db.prepare(`
      SELECT s.id, s.user_id, s.current_class_id, s.class_id,
             u.name, u.code, u.avatar,
             c.name as class_name, c.grade_level,
             e.academic_year_id,
             sem.id as current_semester_id
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN class_enrollments e ON e.student_id = s.id AND e.is_current = 1
      LEFT JOIN classes c ON c.id = COALESCE(s.current_class_id, e.class_id, s.class_id)
      LEFT JOIN semesters sem ON sem.academic_year_id = e.academic_year_id AND sem.is_current = 1
      WHERE u.id = ?
    `).get(userId) || null;

    const studentId = studentInfo?.id || userId;
    const studentName = studentInfo?.name || req.user.name || 'Học sinh';
    const firstName = studentName.split(' ').slice(-1)[0] || 'Học sinh';
    const className = studentInfo?.class_name ? `Lớp ${studentInfo.class_name}` : null;
    const classId = studentInfo?.current_class_id || studentInfo?.class_id || null;

    // Get current semester/academic_year from enrollments
    const semesterId = studentInfo?.current_semester_id || null;
    const academicYearId = studentInfo?.academic_year_id || null;

    // ── 2. Today's Timetable ──────────────────────────────────────────────────
    // Always use SQLite
    let todayClasses = db.prepare(`
      SELECT tt.subject_name as subject, tt.period,
             tt.room, u.name as teacher_name
      FROM timetable tt
      JOIN users u ON u.id = tt.teacher_id
      WHERE tt.class_id = ?
        AND tt.day_of_week = ?
      ORDER BY tt.period ASC
    `).all(classId || 'unknown', now.getDay());

    // ── 3. Assignments: Due Soon (≤7 days) and Overdue ─────────────────────────
    // Always use SQLite
    const assignments = db.prepare(`
      SELECT a.id, a.title, a.subject, a.due_date, a.due_time,
             a.type, a.total_score,
             sub.status as submission_status, sub.submitted_at,
             sub.is_late
      FROM assignments a
      LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
      WHERE a.status = 'published'
        AND (a.due_date >= ? OR sub.status IS NULL OR sub.status = 'in_progress')
      ORDER BY a.due_date ASC, a.due_time ASC
      LIMIT 10
    `).all(studentId, today);

    const overdueAssignments = assignments.filter((a) => {
      const dueDateTime = new Date(`${a.due_date}T${a.due_time || '23:59'}`);
      return dueDateTime < now && a.submission_status !== 'submitted';
    });

    const dueSoonAssignments = assignments.filter((a) => {
      if (overdueAssignments.includes(a)) return false;
      const dueDateTime = new Date(`${a.due_date}T${a.due_time || '23:59'}`);
      const diffMs = dueDateTime - now;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    });

    const pendingCount = (overdueAssignments.length + dueSoonAssignments.length);

    // Format assignments for UI
    const formatAssignment = (a, isOverdue) => {
      const dueDateTime = new Date(`${a.due_date}T${a.due_time || '23:59'}`);
      const diffMs = dueDateTime - now;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const diffHours = diffMs / (1000 * 60 * 60);

      let remaining = '';
      if (diffDays >= 1) remaining = `Còn ${Math.ceil(diffDays)} ngày`;
      else if (diffHours >= 1) remaining = `Còn ${Math.ceil(diffHours)} giờ`;
      else remaining = 'Sắp hết hạn!';

      const submitted = a.submission_status === 'submitted';
      const inProgress = a.submission_status === 'in_progress';

      return {
        id: a.id,
        subject: a.subject,
        title: a.title,
        dueDate: a.due_date,
        dueTime: a.due_time,
        isOverdue,
        tag: isOverdue ? 'Quá hạn' : (diffDays <= 1 ? 'Gấp' : 'Sắp đến hạn'),
        tagType: isOverdue ? 'danger' : (diffDays <= 1 ? 'warning' : 'info'),
        remaining,
        deadline: `${a.due_date} ${a.due_time || '23:59'}`,
        submissionStatus: a.submission_status,
        actionLabel: submitted ? 'Đã nộp' : (inProgress ? 'Tiếp tục làm' : 'Làm bài'),
        actionVariant: submitted ? 'secondary' : 'primary',
      };
    };

    const allDashboardAssignments = [
      ...overdueAssignments.map((a) => formatAssignment(a, true)),
      ...dueSoonAssignments.map((a) => formatAssignment(a, false)),
    ];

    // ── 4. Recently Published Grades ───────────────────────────────────────────
    // Always use SQLite
    const recentGrades = db.prepare(`
      SELECT g.id, g.subject, g.test_name,
             COALESCE(g.raw_score, g.score) as raw_score,
             g.max_score, g.teacher_name, g.teacher_feedback,
             g.graded_at, g.published_at
      FROM grades g
      WHERE g.student_id = ?
        AND g.status = 'published'
        AND g.published_at IS NOT NULL
      ORDER BY g.published_at DESC
      LIMIT 5
    `).all(studentId);

    // Compute GPA from all published grades
    const publishedGrades = recentGrades; // Use what we have; full GPA computed from all published
    let gpa = null;
    let gpaDiff = null;
    if (isPostgresConfigured()) {
      const gpaRes = await pgQuery(`
        SELECT AVG(COALESCE(raw_score, score) * 10.0 / NULLIF(max_score, 0)) as avg_normalized
        FROM grades
        WHERE student_id = $1 AND status = 'published' AND published_at IS NOT NULL
      `, [studentId]);
      gpa = gpaRes.rows[0]?.avg_normalized
        ? parseFloat((gpaRes.rows[0].avg_normalized).toFixed(2))
        : null;
    } else {
      const rows = db.prepare(`
        SELECT COALESCE(raw_score, score) as raw_score, max_score
        FROM grades
        WHERE student_id = ? AND status = 'published' AND published_at IS NOT NULL
      `).all(studentId);
      if (rows.length > 0) {
        const avg = rows.reduce((acc, r) => acc + (r.raw_score * 10.0 / (r.max_score || 10)), 0) / rows.length;
        gpa = parseFloat(avg.toFixed(2));
      }
    }

    // Previous week GPA for diff (last 7 grades before current set)
    let prevGpa = null;
    if (publishedGrades.length >= 2) {
      // Compare with previous period by taking first N-1 grades
      const prevGrades = publishedGrades.slice(1);
      const avg = prevGrades.reduce((acc, g) => {
        const max = g.max_score || 10;
        return acc + (parseFloat(g.raw_score || 0) / max) * 10;
      }, 0) / prevGrades.length;
      prevGpa = parseFloat(avg.toFixed(2));
      gpaDiff = gpa && prevGpa ? `+${(gpa - prevGpa).toFixed(1)}` : null;
    }

    // ── 5. Attendance Summary ──────────────────────────────────────────────────
    let attendanceSummary = null;
    if (isPostgresConfigured()) {
      const attRes = await pgQuery(`
        SELECT
          COUNT(*) FILTER (WHERE ar.status IN ('ABSENT', 'absent')) as absent_days,
          COUNT(*) FILTER (WHERE ar.status IN ('LATE', 'late')) as late_days,
          COUNT(*) FILTER (WHERE ar.status IN ('EXCUSED', 'excused')) as excused_days,
          COUNT(*) as total_sessions
        FROM attendance_records ar
        JOIN attendance_sessions ass ON ass.id = ar.session_id
        WHERE ar.student_id = $1
          AND (ass.semester_id = $2 OR $2 IS NULL)
      `, [studentId, semesterId || null]);
      const row = attRes.rows[0];
      const total = parseInt(row?.total_sessions || 0, 10);
      const absent = parseInt(row?.absent_days || 0, 10);
      const late = parseInt(row?.late_days || 0, 10);
      const excused = parseInt(row?.excused_days || 0, 10);
      const present = total - absent - late - excused;
      const rate = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 100;
      attendanceSummary = { present, absent, late, excused, total, rate };
    } else {
      const rows = db.prepare(`
        SELECT ar.status FROM attendance_records ar
        JOIN attendance_sessions ass ON ass.id = ar.session_id
        WHERE ar.student_id = ?
      `).all(studentId);
      const total = rows.length;
      const absent = rows.filter((r) => r.status === 'ABSENT' || r.status === 'absent').length;
      const late = rows.filter((r) => r.status === 'LATE' || r.status === 'late').length;
      const excused = rows.filter((r) => r.status === 'EXCUSED' || r.status === 'excused').length;
      const present = total - absent - late - excused;
      const rate = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 100;
      attendanceSummary = { present, absent, late, excused, total, rate };
    }

    // ── 6. Announcements ─────────────────────────────────────────────────────
    let announcements = [];
    if (isPostgresConfigured()) {
      const annRes = await pgQuery(`
        SELECT a.id, a.title, a.content, a.scope, a.created_at,
               u.name as sender_name
        FROM announcements a
        JOIN users u ON u.id = a.sender_id
        WHERE a.status = 'published'
          AND (a.scope IN ('school', 'students', 'all')
               OR (a.scope = 'class' AND a.target_id = $1)
               OR (a.scope = 'grade' AND a.target_id = $2))
        ORDER BY a.created_at DESC
        LIMIT 3
      `, [classId, studentInfo?.grade_level ? String(studentInfo.grade_level) : null]);
      announcements = annRes.rows;
    } else {
      announcements = db.prepare(`
        SELECT a.id, a.title, a.content, a.scope, a.created_at,
               u.name as sender_name
        FROM announcements a
        JOIN users u ON u.id = a.sender_id
        WHERE a.status = 'published'
          AND a.scope IN ('school', 'students', 'all')
        ORDER BY a.created_at DESC
        LIMIT 3
      `).all();
    }

    // ── 7. Student Competencies ────────────────────────────────────────────────
    let competencies = [];
    if (isPostgresConfigured()) {
      const cRes = await pgQuery(`
        SELECT topic, proficiency_percent, is_strength, hint
        FROM student_competencies
        WHERE student_id = $1
        ORDER BY proficiency_percent DESC
        LIMIT 6
      `, [studentId]);
      competencies = cRes.rows;
    } else {
      competencies = db.prepare(`
        SELECT topic, proficiency_percent, is_strength, hint
        FROM student_competencies
        WHERE student_id = ?
        ORDER BY proficiency_percent DESC
        LIMIT 6
      `).all(studentId);
    }

    const strengths = competencies
      .filter((c) => c.is_strength === 1 || c.is_strength === true)
      .slice(0, 3)
      .map((c) => ({ topic: c.topic, percent: c.proficiency_percent }));

    const needsPractice = competencies
      .filter((c) => c.is_strength === 0 || c.is_strength === false)
      .slice(0, 2)
      .map((c) => ({ topic: c.topic, percent: c.proficiency_percent, hint: c.hint }));

    // ── Build response ────────────────────────────────────────────────────────
    const todayName = now.toLocaleDateString('vi-VN', {
      weekday: 'long', day: 'numeric', month: 'numeric',
    });

    res.json({
      success: true,
      data: {
        student: {
          name: firstName,
          fullName: studentName,
          className,
          dateText: todayName,
          dueCount: pendingCount,
        },
        // Backward compatibility alias
        studentInfo: {
          name: studentName,
          className,
        },
        kpis: {
          pendingAssignments: {
            count: pendingCount,
            urgentCount: overdueAssignments.length,
            note: overdueAssignments.length > 0
              ? `${overdueAssignments.length} bài quá hạn`
              : dueSoonAssignments.length > 0
                ? `${dueSoonAssignments.length} bài sắp đến hạn`
                : 'Không có bài tập',
          },
          weeklyAverage: {
            score: gpa ?? null,
            diff: gpaDiff,
            previous: prevGpa,
            count: publishedGrades.length,
          },
          attendance: attendanceSummary,
          todayClassesCount: todayClasses.length,
        },
        // ── Today's Timetable ────────────────────────────────────────────────
        todayClasses: todayClasses.map((c) => ({
          period: `Tiết ${c.period}`,
          time: `${c.start_time?.substring(0, 5) || ''} - ${c.end_time?.substring(0, 5) || ''}`,
          subject: c.subject,
          room: c.room || '',
          teacher: c.teacher_name || '',
        })),
        // ── Assignments ─────────────────────────────────────────────────────
        overdueAssignments: allDashboardAssignments.filter((a) => a.isOverdue),
        dueSoonAssignments: allDashboardAssignments.filter((a) => !a.isOverdue),
        totalPendingAssignments: pendingCount,
        // ── Grades ─────────────────────────────────────────────────────────
        urgentAssignments: recentGrades.slice(0, 5).map((g) => ({
          id: g.id,
          subject: g.subject,
          testName: g.test_name || 'Bài kiểm tra',
          score: parseFloat(g.raw_score || 0),
          maxScore: parseFloat(g.max_score || 10),
          teacher: g.teacher_name || '',
          feedback: g.teacher_feedback || '',
          gradedAt: g.graded_at || g.published_at || null,
        })),
        recentGrades: recentGrades.map((g) => ({
          id: g.id,
          subject: g.subject,
          testName: g.test_name || 'Bài kiểm tra',
          category: g.category_name || '',
          score: parseFloat(g.raw_score || 0),
          maxScore: parseFloat(g.max_score || 10),
          teacher: g.teacher_name || '',
          feedback: g.teacher_feedback || '',
          gradedAt: g.graded_at || g.published_at || null,
        })),
        // ── Attendance ─────────────────────────────────────────────────────
        attendanceSummary,
        // ── Announcements ───────────────────────────────────────────────────
        announcements: announcements.map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content?.substring(0, 120) + (a.content?.length > 120 ? '…' : ''),
          senderName: a.sender_name,
          createdAt: a.created_at,
          scope: a.scope,
        })),
        // ── Competencies ───────────────────────────────────────────────────
        competencies: {
          strengths,
          needsPractice,
          aiSuggestion: needsPractice.length > 0 ? {
            message: `Bạn có thể cải thiện thêm ở chủ đề "${needsPractice[0].topic}". Gia sư AI sẵn sàng hỗ trợ!`,
            topic: needsPractice[0].topic,
          } : null,
        },
        // ── Meta ──────────────────────────────────────────────────────────
        classId,
        semesterId,
        academicYearId,
      },
    });
  } catch (err) {
    console.error('[/student/dashboard] Error:', err);
    console.error('[/student/dashboard] Stack:', err.stack);
    res.status(500).json({ success: false, message: 'Không thể tải dashboard. Vui lòng thử lại. Error: ' + err.message });
  }
});

// Get all assignments for student (with tenant isolation)
router.get('/assignments', requirePermission('assignment.read'), (req, res) => {
  const student = db.prepare('SELECT id, school_id FROM students WHERE user_id = ?').get(req.user.id);
  const studentId = student ? student.id : req.user.id;
  const currentSchoolId = student?.school_id || req.schoolId || req.user?.schoolId || 'sch_bacau';
  const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.isSuperAdmin === true;

  // Get all published assignments (tenant-scoped for non-admins)
  let query = `
    SELECT a.*,
      (SELECT COUNT(*) FROM assignment_questions q WHERE q.assignment_id = a.id) as question_count,
      sub.status as submission_status,
      sub.score as student_score,
      sub.submitted_at as submitted_at,
      sub.is_late as is_late,
      sub.resubmit_count as resubmit_count,
      sub.id as submission_id
    FROM assignments a
    LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
    WHERE a.status = 'published'
  `;

  // Super admins can see all; others only see their school's or null-school assignments
  if (!isSuperAdmin) {
    query += ` AND (a.school_id IS NULL OR a.school_id = ?)`;
  }

  query += ` ORDER BY a.due_date ASC`;

  const params = isSuperAdmin ? [studentId] : [studentId, currentSchoolId];
  const assignments = db.prepare(query).all(...params);

  const now = new Date();
  const formatted = assignments.map((a) => {
    const dueDate = new Date(`${a.due_date}T${a.due_time || '23:59'}:00`);
    const isOverdue = now > dueDate;
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    return {
      id: a.id,
      title: a.title,
      subject: a.subject,
      type: a.type,
      instructions: a.instructions,
      due_date: a.due_date,
      due_time: a.due_time,
      duration_minutes: a.duration_minutes || 45,
      total_score: a.total_score || 10,
      status: a.submission_status || (isOverdue ? 'overdue' : 'pending'),
      score: a.student_score,
      submitted_at: a.submitted_at,
      submission_id: a.submission_id,
      is_late: Boolean(a.is_late),
      resubmit_count: a.resubmit_count || 0,
      allow_resubmit: Boolean(a.allow_resubmit),
      questionCount: a.question_count || 0,
      is_overdue: isOverdue,
      days_until_due: daysUntilDue,
      grading_scale: a.grading_scale || 'Thang 10',
    };
  });

  res.json({ success: true, assignments: formatted });
});

// Get specific submission with strict student and tenant authorization
router.get('/submissions/:id', requirePermission('assignment.read'), async (req, res) => {
  const submissionId = req.params.id;
  const currentSchoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
  const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.isSuperAdmin === true;

  if (isPostgresConfigured()) {
    const subRes = await pgQuery(`
      SELECT sub.*, a.school_id as assignment_school_id, s.school_id as student_school_id, s.user_id as student_user_id
      FROM assignment_submissions sub
      JOIN assignments a ON sub.assignment_id = a.id
      JOIN students s ON sub.student_id = s.id
      WHERE sub.id = $1
    `, [submissionId]);

    if (subRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài nộp' });
    }

    const sub = subRes.rows[0];

    // Check school isolation
    const entitySchoolId = sub.student_school_id || sub.assignment_school_id;
    if (entitySchoolId && entitySchoolId !== currentSchoolId && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        code: 'TENANT_FORBIDDEN',
        message: 'Bạn không có quyền truy cập bài nộp thuộc trường khác',
      });
    }

    // Check student ownership (student cannot access another student's submission)
    if (req.user && req.user.role === 'student' && !isSuperAdmin) {
      if (sub.student_user_id !== req.user.id && sub.student_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          message: 'Bạn không có quyền truy cập bài nộp của học sinh khác',
        });
      }
    }

    return res.json({ success: true, submission: sub });
  }

  // SQLite fallback
  const sub = db.prepare(`
    SELECT sub.*, a.created_by, s.user_id as student_user_id, s.school_id as student_school_id
    FROM assignment_submissions sub
    JOIN assignments a ON sub.assignment_id = a.id
    JOIN students s ON sub.student_id = s.id
    WHERE sub.id = ?
  `).get(submissionId);

  if (!sub) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy bài nộp' });
  }

  if (sub.student_school_id && sub.student_school_id !== currentSchoolId && !isSuperAdmin) {
    return res.status(403).json({
      success: false,
      code: 'TENANT_FORBIDDEN',
      message: 'Bạn không có quyền truy cập bài nộp thuộc trường khác',
    });
  }

  if (req.user && req.user.role === 'student' && !isSuperAdmin) {
    if (sub.student_user_id !== req.user.id && sub.student_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Bạn không có quyền truy cập bài nộp của học sinh khác',
      });
    }
  }

  res.json({ success: true, submission: sub });
});

// Get assignment details with questions for exam taking
router.get('/assignments/:id', requirePermission('assignment.read'), async (req, res) => {
  const assignmentId = req.params.id;
  const currentSchoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
  const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.isSuperAdmin === true;
  const student = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
  const studentId = student ? student.id : req.user.id;

  let assignment = null;
  if (isPostgresConfigured()) {
    const asgRes = await pgQuery('SELECT * FROM assignments WHERE id = $1', [assignmentId]);
    if (asgRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài tập' });
    }
    assignment = asgRes.rows[0];
  } else {
    assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài tập' });
    }
  }

  if (assignment.school_id && assignment.school_id !== currentSchoolId && !isSuperAdmin) {
    return res.status(403).json({
      success: false,
      code: 'TENANT_FORBIDDEN',
      message: 'Bạn không có quyền truy cập bài tập thuộc trường khác',
    });
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

  // Enrich with submission metadata needed by the ExamModal
  const submission = db.prepare(`
    SELECT sub.* FROM assignment_submissions sub
    WHERE sub.assignment_id = ? AND sub.student_id = ?
  `).get(assignmentId, studentId);

  res.json({
    success: true,
    assignment: {
      id: assignment.id,
      title: assignment.title,
      subject: assignment.subject,
      type: assignment.type,
      instructions: assignment.instructions,
      due_date: assignment.due_date,
      due_time: assignment.due_time,
      duration_minutes: assignment.duration_minutes || 45,
      total_score: assignment.total_score || 10,
      questions: formattedQuestions,
      allow_resubmit: Boolean(assignment.allow_resubmit),
      max_resubmit_count: assignment.max_resubmit_count || 1,
      submission: submission ? {
        submission_status: submission.status,
        score: submission.score,
        answers: JSON.parse(submission.student_answers || submission.draft_answers || '{}'),
        draftAnswers: JSON.parse(submission.draft_answers || '{}'),
        submitted_at: submission.submitted_at,
        is_late: Boolean(submission.is_late),
        resubmit_count: submission.resubmit_count || 0,
        feedback: submission.teacher_feedback,
      } : null,
    },
  });
});

// Submit an assignment & calculate score
router.post('/assignments/:id/submit', requirePermission('assignment.submit'), async (req, res) => {
  const assignmentId = req.params.id;
  const currentSchoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
  const isSuperAdmin = req.user?.role === 'super_admin' || req.user?.isSuperAdmin === true;
  const { studentAnswers } = req.body;
  const student = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
  const studentId = student ? student.id : req.user.id;

  if (isPostgresConfigured()) {
    const asgRes = await pgQuery('SELECT id, school_id FROM assignments WHERE id = $1', [assignmentId]);
    if (asgRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài tập' });
    }
    if (asgRes.rows[0].school_id && asgRes.rows[0].school_id !== currentSchoolId && !isSuperAdmin) {
      return res.status(403).json({ success: false, code: 'TENANT_FORBIDDEN', message: 'Không được nộp bài cho trường khác' });
    }
  } else {
    const asg = db.prepare('SELECT id, school_id FROM assignments WHERE id = ?').get(assignmentId);
    if (!asg) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài tập' });
    }
    if (asg.school_id && asg.school_id !== currentSchoolId && !isSuperAdmin) {
      return res.status(403).json({ success: false, code: 'TENANT_FORBIDDEN', message: 'Không được nộp bài cho trường khác' });
    }
  }

  // Get questions to auto-grade
  let questions = [];
  if (isPostgresConfigured()) {
    const qRes = await pgQuery(`
      SELECT id, options, points
      FROM assignment_questions
      WHERE assignment_id = $1
    `, [assignmentId]);
    questions = qRes.rows;
  }
  if (questions.length === 0) {
    questions = db.prepare(`
      SELECT id, options, points
      FROM assignment_questions
      WHERE assignment_id = ?
    `).all(assignmentId);
  }

  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;

  questions.forEach((q) => {
    const pts = parseFloat(q.points) || 1.0;
    maxScore += pts;
    let parsedOptions = [];
    try {
      parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options || '[]') : (q.options || []);
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
  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO assignment_submissions (id, assignment_id, student_id, status, score, student_answers)
      VALUES ($1, $2, $3, 'graded', $4, $5)
      ON CONFLICT(id) DO UPDATE SET status = 'graded', score = EXCLUDED.score, student_answers = EXCLUDED.student_answers, submitted_at = CURRENT_TIMESTAMP
    `, [subId, assignmentId, studentId, finalScore, JSON.stringify(studentAnswers || {})]);
  }

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
  const studentUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);
  const actorName = studentUser ? studentUser.name : 'Học sinh';
  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type)
    VALUES (?, ?, 'student', ?, 'Đã nộp bài', 'success')
  `).run(`log_${Date.now()}`, actorName, `Đã hoàn thành và nộp bài thi "${asg?.title || assignmentId}" (Đạt ${finalScore}/10 điểm).`);

  res.json({
    success: true,
    message: 'Nộp bài tập thành công!',
    score: finalScore,
    maxScore: 10,
    correctCount,
    totalQuestions: questions.length,
  });
});

// Get Student Grades & Transcript — real published grades from gradebook
router.get('/grades', requirePermission('grade.read'), async (req, res) => {
  try {
    const schoolId = req.user.school_id || 'sch_bacau';
    const semesterId = req.query.semesterId || null;
    const period = req.query.period || null; // 'hk1', 'hk2', 'year'

    // 1. Resolve student ID from authenticated user
    const studentInfo = db.prepare(`
      SELECT s.id as student_id, s.user_id, u.name, c.name as class_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE u.id = ?
    `).get(req.user.id);

    if (!studentInfo) {
      return res.status(404).json({ success: false, code: 'STUDENT_NOT_FOUND', message: 'Không tìm thấy hồ sơ học sinh.' });
    }

    const studentId = studentInfo.student_id;

    // 2. Resolve current academic year and semester
    let academicYear = 'Năm học 2024 - 2025';
    let semester = 'Học kỳ I';
    let resolvedSemesterId = semesterId;

    try {
      const semRow = db.prepare(`
        SELECT ay.name as academic_year, s.name as semester_name, s.id as sem_id
        FROM semesters s
        JOIN academic_years ay ON s.academic_year_id = ay.id
        WHERE s.school_id = ? AND s.is_current = 1
        LIMIT 1
      `).get(schoolId);
      if (semRow) {
        academicYear = semRow.academic_year;
        semester = semRow.semester_name;
        resolvedSemesterId = semRow.sem_id;
      }
    } catch (_) { /* use defaults */ }

    // 3. Fetch published grades with real data
    let gradeQuery = `
      SELECT g.*, u.name as teacher_name
      FROM grades g
      LEFT JOIN users u ON g.published_by = u.id
      WHERE g.student_id = ? AND g.status = 'published'
    `;
    const gradeParams = [studentId];

    if (period === 'hk1') {
      gradeQuery += ' AND (g.semester = 1 OR g.semester = "HK1")';
    } else if (period === 'hk2') {
      gradeQuery += ' AND (g.semester = 2 OR g.semester = "HK2")';
    }

    gradeQuery += ' ORDER BY g.graded_at DESC';

    let grades;
    try {
      grades = db.prepare(gradeQuery).all(...gradeParams);
    } catch (err) {
      console.error('[/student/grades] Query error:', err.message);
      grades = [];
    }

    // 4. Group by subject and compute averages
    const subjectMap = {};
    let totalWeightedScore = 0;
    let totalWeight = 0;

    grades.forEach((g) => {
      const key = g.subject || g.subject_id || 'unknown';
      if (!subjectMap[key]) {
        subjectMap[key] = { subject: key, tests: [], average: 0, testsCount: 0, recentTest: '', recentScore: null, teacherComment: '' };
      }
      subjectMap[key].tests.push(g);
      subjectMap[key].testsCount++;
      if (!subjectMap[key].recentTest) {
        subjectMap[key].recentTest = g.test_name || g.category_name || 'Bài kiểm tra';
        subjectMap[key].recentScore = g.score;
        subjectMap[key].teacherComment = g.comment || '';
      }

      // For GPA: use category_weight_snapshot if available, else default weight
      const weight = g.category_weight_snapshot || g.weight || g.category_weight || 1.0;
      const maxScore = g.max_score || 10;
      const scaledScore = (g.score / maxScore) * 10; // Normalize to 10-point scale
      totalWeightedScore += scaledScore * weight;
      totalWeight += weight;
    });

    const subjectAverages = Object.entries(subjectMap).map(([subject, data]) => {
      const avg = data.tests.reduce((acc, t) => acc + t.score, 0) / data.tests.length;
      data.average = parseFloat(avg.toFixed(2));
      return data;
    });

    const overallGpa = totalWeight > 0 ? parseFloat((totalWeightedScore / totalWeight).toFixed(2)) : null;

    // 5. Compute class rank via subquery on published grades
    let classRank = null;
    let totalInClass = 0;
    try {
      // Get the student's class
      const classInfo = db.prepare(`
        SELECT class_id FROM students WHERE id = ?
      `).get(studentId);
      if (classInfo?.class_id) {
        const rankQuery = `
          SELECT g.student_id, AVG(g.score) as avg_score
          FROM grades g
          WHERE g.status = 'published' AND g.class_id = ?
          GROUP BY g.student_id
          HAVING COUNT(*) >= 1
          ORDER BY avg_score DESC
        `;
        const ranked = db.prepare(rankQuery).all(classInfo.class_id);
        totalInClass = ranked.length;
        const myIdx = ranked.findIndex((r) => r.student_id === studentId);
        if (myIdx >= 0) classRank = { rank: myIdx + 1, total: totalInClass };
      }
    } catch (_) { /* non-critical */ }

    // 6. Fetch attendance summary for conduct/rate
    let attendanceRate = null;
    let conduct = 'Không xác định';
    try {
      const attData = await attendanceService.getStudentAttendanceHistory({
        studentId,
        schoolId,
        currentUser: req.user,
      }).catch(() => null);
      if (attData) {
        attendanceRate = attData.rate;
        const rateNum = parseFloat(String(attData.rate || '0').replace('%', ''));
        if (rateNum >= 95) conduct = 'Tốt';
        else if (rateNum >= 85) conduct = 'Khá';
        else if (rateNum >= 75) conduct = 'Đạt';
        else conduct = 'Yếu';
      }
    } catch (_) { /* non-critical */ }

    return res.json({
      success: true,
      grades,
      data: {
        studentName: studentInfo.name || 'Học sinh',
        className: studentInfo.class_name ? `Lớp ${studentInfo.class_name}` : 'Lớp chưa phân',
        academicYear,
        semester,
        overallGpa,
        classRank: classRank ? `${classRank.rank} / ${classRank.total}` : null,
        conduct,
        attendanceRate: attendanceRate || 'N/A',
        totalCredits: subjectAverages.length,
        subjects: subjectAverages,
        recentGrades: grades.slice(0, 10),
      },
    });
  } catch (err) {
    console.error('[/student/grades] Error:', err);
    return res.status(500).json({ success: false, code: 'SERVER_ERROR', message: err.message });
  }
});

// Get Student Timetable (Canonical Source)
router.get('/timetable', requirePermission('class.read'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const schoolId = req.user.school_id || 'sch_bacau';
    const semesterId = req.query.semesterId || null;

    const result = await timetableService.getStudentTimetable({
      studentId,
      schoolId,
      semesterId,
    });

    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      code: err.code || 'SERVER_ERROR',
      error: {
        code: err.code || 'SERVER_ERROR',
        message: err.message,
      },
    });
  }
});

// Get Student Attendance (delegated to canonical attendance module)
router.get('/attendance', requirePermission('attendance.read'), attendanceController.getStudentAttendance);


// Get Study Resources — filtered by student's grade level and school tenant
const getStudyResourcesHandler = (req, res) => {
  try {
    const schoolId = req.user.school_id || 'sch_bacau';
    const { subject, type, search } = req.query;

    // Get student's grade level for appropriate resource filtering
    const studentRow = db.prepare(`
      SELECT c.grade_level FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE s.user_id = ?
    `).get(req.user.id);
    const gradeLevel = studentRow?.grade_level;

    let query = `SELECT * FROM study_resources WHERE 1=1`;
    const params = [];

    // Filter by student's grade level (allow ±1 grade for review purposes)
    if (gradeLevel) {
      query += ' AND (grade_level = ? OR grade_level = ? OR grade_level = ?)';
      params.push(gradeLevel, gradeLevel - 1, gradeLevel + 1);
    }

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

    query += ' ORDER BY downloads_count DESC, created_at DESC LIMIT 100';

    const resources = db.prepare(query).all(...params);
    res.json({ success: true, resources });
  } catch (err) {
    console.error('[/student/resources] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

router.get('/resources', requirePermission('class.read'), getStudyResourcesHandler);
router.get('/study-resources', requirePermission('class.read'), getStudyResourcesHandler);

// Download study resource counter increment
router.post('/resources/:id/download', requirePermission('class.read'), (req, res) => {
  const schoolId = req.user.school_id || 'sch_bacau';
  const resourceId = req.params.id;
  try {
    db.prepare('UPDATE study_resources SET downloads_count = downloads_count + 1 WHERE id = ? AND (school_id = ? OR school_id IS NULL)').run(resourceId, schoolId);
    res.json({ success: true, message: 'Đã cập nhật lượt tải về' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Announcements — filtered for students (scope: 'all' or 'student')
// Query params: ?scope=urgent|important|all, ?priority=...
router.get('/announcements', requirePermission('student.read'), (req, res) => {
  try {
    const schoolId = req.user.school_id || 'sch_bacau';

    // Get student's class_id for class-scoped announcements
    const studentRow = db.prepare(`
      SELECT class_id FROM students WHERE user_id = ?
    `).get(req.user.id);
    const studentClassId = studentRow?.class_id;

    let query = `
      SELECT a.id, a.title, a.content, a.scope, a.class_id,
             a.priority, a.published_at, a.author_id, a.is_active,
             u.name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.is_active = 1
        AND a.school_id = ?
        AND a.scope IN ('all', 'student')
        AND (a.class_id IS NULL OR a.class_id = ?)
      ORDER BY
        CASE a.priority WHEN 'urgent' THEN 0 WHEN 'important' THEN 1 ELSE 2 END,
        a.published_at DESC
      LIMIT 50
    `;
    const announcements = db.prepare(query).all(schoolId, studentClassId || '');

    res.json({ success: true, announcements });
  } catch (err) {
    console.error('[/student/announcements] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
