import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, requirePermission } from '../middleware/auth.js';
import { isPostgresConfigured, pgQuery } from '../shared/database/index.js';
import { verifyParentChildRelationship } from '../shared/auth/parentChildAuth.middleware.js';
import { attendanceService } from '../modules/attendance/index.js';
import { gradebookService } from '../modules/gradebook/index.js';
import { timetableService } from '../modules/timetable/index.js';

const router = express.Router();

// Enforce authentication & role across all parent endpoints
router.use(authenticateToken);
router.use(requireRole('parent', 'admin', 'school_admin', 'super_admin'));

// =============================================================================
// HELPERS
// =============================================================================
function getSchoolId(req) {
  return req.schoolId || req.user?.schoolId || req.user?.school_id || 'sch_bacau';
}

function getParentUserId(req) {
  return req.user.id;
}

function isAdmin(req) {
  return ['admin', 'school_admin', 'super_admin'].includes(req.user?.role);
}

/** Format a child object for the parent portal response */
async function formatChildForParent(childRow, schoolId, parentUserId) {
  const studentId = childRow.id;

  // Load published grades for this semester (G21: only published)
  let recentGrades = [];
  let attendanceData = null;

  if (isPostgresConfigured()) {
    // Use only columns that exist in both PG and SQLite grades table
    const grdRes = await pgQuery(`
      SELECT g.id, g.subject, g.test_name, g.score, g.max_score,
             g.teacher_name, g.status, g.published_at,
             s.name as subject_name
      FROM grades g
      LEFT JOIN subjects s ON g.subject_id = s.id
      WHERE g.student_id = $1
        AND g.status = 'published'
        AND (g.school_id = $2 OR g.school_id IS NULL)
      ORDER BY g.graded_at DESC
      LIMIT 6
    `, [studentId, schoolId]);
    recentGrades = grdRes.rows || [];
  } else {
    recentGrades = db.prepare(`
      SELECT g.id, g.subject, g.test_name, g.score, g.max_score,
             g.teacher_name, g.status, g.published_at
      FROM grades g
      WHERE g.student_id = ?
        AND g.status = 'published'
        AND (? IS NULL OR g.school_id = ? OR g.school_id IS NULL)
      ORDER BY g.graded_at DESC
      LIMIT 6
    `).all(studentId, schoolId, schoolId);
  }

  // Attendance summary
  try {
    attendanceData = await attendanceService.getStudentAttendanceHistory({
      studentId,
      schoolId,
      currentUser: { id: parentUserId, role: 'parent' },
    });
  } catch (err) {
    // Attendance is non-critical; continue without it
    console.warn('[ParentPortal] getStudentAttendanceHistory failed:', err?.message);
    attendanceData = null;
  }

  const gpa = parseFloat(childRow.gpa) || 0;
  const gpaRank = gpa >= 9.0 ? 'Học lực Xuất sắc'
    : gpa >= 8.0 ? 'Học lực Giỏi'
    : gpa >= 6.5 ? 'Học lực Khá'
    : 'Học lực Trung bình';

  return {
    id: childRow.id,
    name: childRow.name || childRow.full_name || childRow.user_name || 'Học sinh',
    avatar: childRow.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(childRow.name || 'H')}&background=1C6FA8&color=fff&size=120`,
    badge: 'Đang học kỳ hiện tại',
    class: childRow.class_name ? `${childRow.class_name}` : (childRow.class || 'Lớp chưa phân'),
    code: childRow.code || childRow.student_code || studentId,
    gpa: gpa,
    gpaRank,
    classRank: childRow.class_rank || '—',
    totalStudents: childRow.total_students || 38,
    attendanceRate: attendanceData?.rate || (childRow.attendance_rate ? `${childRow.attendance_rate}%` : '—'),
    attendanceNote: attendanceData
      ? (attendanceData.excusedDays > 0
          ? `Nghỉ có phép: ${attendanceData.excusedDays} buổi`
          : attendanceData.absentDays > 0
            ? `Vắng: ${attendanceData.absentDays} buổi`
            : 'Đi học chuyên cần')
      : 'Đi học chuyên cần',
    recentSubjects: recentGrades.map((g) => ({
      initial: (g.subject_name || g.subject || 'M').charAt(0),
      name: g.subject_name || g.subject || 'Môn học',
      test: g.test_name || g.description || 'Bài kiểm tra',
      score: parseFloat(g.raw_score) || 0,
      rank: parseFloat(g.raw_score) >= 9.0 ? 'Xuất sắc'
        : parseFloat(g.raw_score) >= 8.0 ? 'Giỏi'
        : parseFloat(g.raw_score) >= 6.5 ? 'Khá'
        : 'Trung bình',
      rankType: parseFloat(g.raw_score) >= 9.0 ? 'success'
        : parseFloat(g.raw_score) >= 8.0 ? 'info'
        : parseFloat(g.raw_score) >= 6.5 ? 'warning'
        : 'neutral',
    })),
    // Tuition
    tuition: null, // Loaded separately
    // Schedule placeholder (filled by timetable endpoint)
    schedule: [],
    examAlert: null,
  };
}

// =============================================================================
// LIST ACTIVE CHILDREN
// GET /api/parent/children
// =============================================================================
router.get('/children', requirePermission('student.read'), async (req, res) => {
  const parentUserId = getParentUserId(req);
  const schoolId = getSchoolId(req);

  let children = [];

  try {
    if (isPostgresConfigured()) {
      // Query active links
      const linksRes = await pgQuery(`
        SELECT psl.*, s.*,
               u.name, u.code, u.avatar,
               COALESCE(c.name, ec.name) as class_name,
               ce.is_current, ce.academic_year_id,
               (
                 SELECT COUNT(*) OVER () FROM parent_student_links psl2
                 WHERE psl2.parent_id = psl.parent_id AND psl2.is_active = 1
               ) as total_linked_children
        FROM parent_student_links psl
        JOIN parents p ON p.id = psl.parent_id
        JOIN students s ON psl.student_id = s.id
        JOIN users u ON s.user_id = u.id
        LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = true
        LEFT JOIN classes ec ON ce.class_id = ec.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE p.user_id = $1
          AND psl.is_active = 1
          AND ($2::varchar IS NULL OR s.school_id = $2 OR s.school_id IS NULL)
        ORDER BY psl.is_primary_contact DESC, psl.created_at ASC
      `, [parentUserId, schoolId]);

      children = linksRes.rows;

      // Fall back to SQLite if PG returns empty
      if (children.length === 0) {
        children = db.prepare(`
          SELECT psl.*, s.*,
                 u.name, u.code, u.avatar,
                 COALESCE(c.name, ec.name) as class_name,
                 ce.is_current
          FROM parent_student_links psl
          JOIN parents p ON p.id = psl.parent_id
          JOIN students s ON psl.student_id = s.id
          JOIN users u ON s.user_id = u.id
          LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = 1
          LEFT JOIN classes ec ON ce.class_id = ec.id
          LEFT JOIN classes c ON s.class_id = c.id
          WHERE p.user_id = ?
            AND psl.is_active = 1
            AND (? IS NULL OR s.school_id = ? OR s.school_id IS NULL)
          ORDER BY psl.is_primary_contact DESC, psl.created_at ASC
        `).all(parentUserId, schoolId, schoolId);
      }
    } else {
      children = db.prepare(`
        SELECT psl.*, s.*,
               u.name, u.code, u.avatar,
               COALESCE(c.name, ec.name) as class_name,
               ce.is_current
        FROM parent_student_links psl
        JOIN parents p ON p.id = psl.parent_id
        JOIN students s ON psl.student_id = s.id
        JOIN users u ON s.user_id = u.id
        LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = 1
        LEFT JOIN classes ec ON ce.class_id = ec.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE p.user_id = ?
          AND psl.is_active = 1
          AND (? IS NULL OR s.school_id = ? OR s.school_id IS NULL)
        ORDER BY psl.is_primary_contact DESC, psl.created_at ASC
      `).all(parentUserId, schoolId, schoolId);
    }

    // Fallback to legacy table or direct parent_id if still empty
    if (children.length === 0) {
      // Fallback: legacy parent_students table (pre-G24 SQLite seeding)
      try {
        children = db.prepare(`
          SELECT s.*, u.name, u.code, u.avatar, c.name as class_name,
                 ps.relationship, ps.is_primary_contact, ps.is_verified, 1 as is_active
          FROM parent_students ps
          JOIN parents p ON p.id = ps.parent_id
          JOIN students s ON ps.student_id = s.id
          JOIN users u ON s.user_id = u.id
          LEFT JOIN classes c ON s.class_id = c.id
          WHERE p.user_id = ?
            AND (? IS NULL OR s.school_id = ? OR s.school_id IS NULL)
          ORDER BY ps.is_primary_contact DESC, s.id ASC
        `).all(parentUserId, schoolId, schoolId);
      } catch (err) {
        console.error('[/children] Legacy table fallback error:', err.message);
        children = [];
      }
    }

    // Fallback: direct parent_id on students table
    if (children.length === 0) {
      children = db.prepare(`
        SELECT s.*, u.name, u.code, u.avatar, c.name as class_name,
               'parent' as relationship, 1 as is_primary_contact, 0 as is_verified, 1 as is_active
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.parent_id = ?
          AND (? IS NULL OR s.school_id = ? OR s.school_id IS NULL)
        ORDER BY s.id ASC
      `).all(parentUserId, schoolId, schoolId);
    }

    const formattedChildren = await Promise.all(children.map(c => formatChildForParent(c, schoolId, parentUserId)));

    // Enrich with relationship metadata
    const enriched = formattedChildren.map((fc, idx) => {
      const raw = children[idx];
      return {
        ...fc,
        relationship: raw.relationship || 'parent',
        isPrimaryContact: Boolean(raw.is_primary_contact),
        isVerified: Boolean(raw.is_verified),
        isActive: Boolean(raw.is_active),
      };
    });

    // Notices / announcements
    const notices = db.prepare(`
      SELECT * FROM announcements
      WHERE is_active = 1
        AND school_id = ?
        AND scope IN ('all', 'parent')
      ORDER BY published_at DESC
      LIMIT 10
    `).all(schoolId);

    const formattedNotices = notices.map((n) => ({
      id: n.id,
      tag: n.scope || 'Thông báo',
      tagType: n.priority === 'urgent' ? 'danger' : n.priority === 'important' ? 'warning' : 'info',
      title: n.title,
      content: n.content,
      sender: n.author_id || 'Nhà trường',
      time: n.published_at ? new Date(n.published_at).toLocaleDateString('vi-VN') : 'Gần đây',
      canConfirm: false,
      confirmed: false,
    }));

    res.json({
      success: true,
      children: enriched,
      data: {
        children: enriched,
        notifications: formattedNotices,
      },
    });
  } catch (err) {
    console.error('[/children] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// GET CHILD DETAIL (secure)
// GET /api/parent/children/:id
// =============================================================================
router.get('/children/:id', requirePermission('student.read'), async (req, res, next) => {
  const childId = req.params.id;
  const parentUserId = getParentUserId(req);
  const schoolId = getSchoolId(req);

  // Verify relationship
  const { authorized, error, relationship } = await verifyParentChildRelationship({
    parentUserId,
    studentId: childId,
    schoolId,
  });

  if (!authorized) {
    const statusMap = { NOT_AUTHORIZED: 403, TENANT_FORBIDDEN: 403, STUDENT_NOT_FOUND: 404 };
    return res.status(statusMap[error] || 403).json({
      success: false,
      code: error,
      message: 'Bạn không có quyền truy cập thông tin của học sinh này.',
    });
  }

  try {
    let child;
    if (isPostgresConfigured()) {
      const res2 = await pgQuery(`
        SELECT s.*, u.name, u.code, u.avatar,
               COALESCE(c.name, ec.name) as class_name
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = true
        LEFT JOIN classes ec ON ce.class_id = ec.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.id = $1
      `, [childId]);
      child = res2.rows[0];
    } else {
      child = db.prepare(`
        SELECT s.*, u.name, u.code, u.avatar, c.name as class_name
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = 1
        LEFT JOIN classes ec ON ce.class_id = ec.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.id = ?
      `).get(childId);
    }

    if (!child) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh' });
    }

    const formatted = await formatChildForParent(child, schoolId, parentUserId);
    res.json({
      success: true,
      child: {
        ...formatted,
        relationship: relationship.type || 'parent',
        isVerified: relationship.isVerified || false,
        isActive: relationship.isActive !== false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// =============================================================================
// PARENT DASHBOARD (real data, per child)
// GET /api/parent/dashboard
// =============================================================================
router.get('/dashboard', requirePermission('student.read'), async (req, res) => {
  const parentUserId = getParentUserId(req);
  const schoolId = getSchoolId(req);
  const childId = req.query.childId || null;

  // If no childId, use primary contact child or first
  let targetChildId = childId;

  if (!targetChildId) {
    // Resolve primary child
    if (isPostgresConfigured()) {
      const primaryRes = await pgQuery(`
        SELECT psl.student_id
        FROM parent_student_links psl
        JOIN parents p ON p.id = psl.parent_id
        WHERE p.user_id = $1 AND psl.is_active = 1
        ORDER BY psl.is_primary_contact DESC, psl.created_at ASC
        LIMIT 1
      `, [parentUserId]);
      targetChildId = primaryRes.rows[0]?.student_id || null;
    } else {
      const primaryRow = db.prepare(`
        SELECT psl.student_id
        FROM parent_student_links psl
        JOIN parents p ON p.id = psl.parent_id
        WHERE p.user_id = ? AND psl.is_active = 1
        ORDER BY psl.is_primary_contact DESC, psl.created_at ASC
        LIMIT 1
      `).get(parentUserId);
      targetChildId = primaryRow?.student_id || null;
    }
  }

  // Verify access
  if (targetChildId) {
    const { authorized } = await verifyParentChildRelationship({
      parentUserId,
      studentId: targetChildId,
      schoolId,
    });
    if (!authorized && !isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập học sinh này' });
    }
  }

  // Parent name
  const parentName = req.user?.name || 'Phụ huynh';

  res.json({
    success: true,
    data: {
      parentName,
      phone: req.user?.phone || '',
      activeChildId: targetChildId,
      schoolId,
    },
  });
});

// =============================================================================
// CHILD GRADES (secure, published only)
// GET /api/parent/grades?studentId=xxx
// =============================================================================
router.get('/grades', requirePermission('grade.read'), async (req, res) => {
  const studentId = req.query.studentId;
  if (!studentId) {
    return res.status(400).json({ success: false, message: 'Thiếu studentId' });
  }

  const { authorized, error } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    return res.status(403).json({ success: false, code: error || 'NOT_AUTHORIZED', message: 'Không có quyền xem điểm của học sinh này' });
  }

  const schoolId = getSchoolId(req);
  const period = req.query.period || 'hk1'; // hk1, hk2, year

  try {
    const grades = await gradebookService.getStudentGradesForParent({
      studentId,
      schoolId,
      period,
      requestingUserId: getParentUserId(req),
    });
    res.json({ success: true, data: grades });
  } catch (err) {
    console.error('[/grades] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// CHILD ATTENDANCE (secure)
// GET /api/parent/attendance?studentId=xxx
// =============================================================================
router.get('/attendance', requirePermission('attendance.read'), async (req, res) => {
  const studentId = req.query.studentId;
  if (!studentId) {
    return res.status(400).json({ success: false, message: 'Thiếu studentId' });
  }

  const { authorized } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Không có quyền xem chuyên cần của học sinh này' });
  }

  try {
    const attendance = await attendanceService.getStudentAttendanceHistory({
      studentId,
      schoolId: getSchoolId(req),
      currentUser: req.user,
    });
    res.json({ success: true, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// CHILD ASSIGNMENTS (secure, published assignments only)
// GET /api/parent/assignments?studentId=xxx
// =============================================================================
router.get('/assignments', requirePermission('student.read'), async (req, res) => {
  const studentId = req.query.studentId;
  if (!studentId) {
    return res.status(400).json({ success: false, message: 'Thiếu studentId' });
  }

  const { authorized } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Không có quyền xem bài tập của học sinh này' });
  }

  const schoolId = getSchoolId(req);

  try {
    let assignments;
    if (isPostgresConfigured()) {
      // PostgreSQL: target_classes is JSONB, cast due_date to date for comparison
      const res2 = await pgQuery(`
        SELECT a.id, a.title, a.subject, a.due_date, a.due_time,
               a.status, a.total_score, a.duration_minutes,
               a.allow_resubmit, a.max_resubmit_count,
               asub.submitted_at, asub.score,
               CASE WHEN asub.id IS NOT NULL THEN 'submitted' ELSE NULL END as submission_status,
               asub.is_late, asub.resubmit_count
        FROM assignments a
        LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = $1
        WHERE a.status = 'published'
          AND ($2::varchar IS NULL OR a.school_id = $2 OR a.school_id IS NULL)
          AND EXISTS (
            SELECT 1 FROM class_enrollments ce
            WHERE ce.student_id = $1 AND a.target_classes ? ce.class_id
          )
          AND (a.due_date::date >= CURRENT_DATE - INTERVAL '30 days' OR a.due_date IS NULL)
        ORDER BY a.due_date DESC, a.created_at DESC
        LIMIT 50
      `, [studentId, schoolId]);
      assignments = res2.rows;
    } else {
      // SQLite: target_classes is stored as JSON string, use LIKE for text matching
      assignments = db.prepare(`
        SELECT a.id, a.title, a.subject, a.due_date, a.due_time,
               a.status, a.total_score, a.duration_minutes,
               a.allow_resubmit, a.max_resubmit_count,
               asub.submitted_at, asub.score, asub.status as submission_status,
               asub.is_late, asub.resubmit_count
        FROM assignments a
        LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = ?
        WHERE a.status = 'published'
          AND (? IS NULL OR a.school_id = ? OR a.school_id IS NULL)
          AND EXISTS (
            SELECT 1 FROM class_enrollments ce
            WHERE ce.student_id = ? AND a.target_classes LIKE '%' || ce.class_id || '%'
          )
          AND (a.due_date >= date('now', '-30 days') OR a.due_date IS NULL)
        ORDER BY a.due_date DESC, a.created_at DESC
        LIMIT 50
      `).all(studentId, schoolId, schoolId, studentId);
    }

    const today = new Date().toISOString().split('T')[0];
    const formatted = assignments.map(a => {
      const isOverdue = a.due_date && a.due_date < today && a.submission_status !== 'submitted' && a.submission_status !== 'graded';
      const daysUntil = a.due_date
        ? Math.ceil((new Date(a.due_date) - new Date(today)) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: a.id,
        title: a.title,
        subject: a.subject,
        dueDate: a.due_date,
        dueTime: a.due_time,
        totalScore: a.total_score,
        status: a.status,
        submissionStatus: a.submission_status,
        score: a.score,
        isLate: Boolean(a.is_late),
        isOverdue: Boolean(isOverdue),
        daysUntilDue: daysUntil,
        allowResubmit: Boolean(a.allow_resubmit),
        maxResubmitCount: a.max_resubmit_count,
        resubmitCount: a.resubmit_count || 0,
      };
    });

    res.json({ success: true, assignments: formatted });
  } catch (err) {
    console.error('[/assignments] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// CHILD TIMETABLE (secure)
// GET /api/parent/timetable/:studentId
// =============================================================================
router.get('/timetable/:studentId', requirePermission('timetable.read'), async (req, res) => {
  const { authorized } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId: req.params.studentId,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Không có quyền xem thời khóa biểu' });
  }

  try {
    const result = await timetableService.getParentChildTimetable({
      parentId: getParentUserId(req),
      studentId: req.params.studentId,
      schoolId: getSchoolId(req),
      semesterId: req.query.semesterId || null,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({
      success: false,
      code: err.code || 'SERVER_ERROR',
      message: err.message,
    });
  }
});

// =============================================================================
// ANNOUNCEMENTS FOR PARENT (of a specific child)
// GET /api/parent/announcements?studentId=xxx
// =============================================================================
router.get('/announcements', requirePermission('announcement.read'), async (req, res) => {
  const studentId = req.query.studentId;
  const schoolId = getSchoolId(req);

  if (studentId) {
    const { authorized } = await verifyParentChildRelationship({
      parentUserId: getParentUserId(req),
      studentId,
      schoolId,
    });
    if (!authorized && !isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    }
  }

  try {
    let announcements;
    if (isPostgresConfigured()) {
      // Use boolean comparison for PostgreSQL
      const res2 = await pgQuery(`
        SELECT a.*, u.name as author_name
        FROM announcements a
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.is_active = true
          AND (a.school_id = $1 OR a.school_id IS NULL)
          AND a.scope IN ('all', 'parent')
        ORDER BY
          CASE a.priority WHEN 'urgent' THEN 1 WHEN 'important' THEN 2 ELSE 3 END,
          a.published_at DESC
        LIMIT 50
      `, [schoolId]);
      announcements = res2.rows;
    } else {
      // SQLite uses integer for boolean
      announcements = db.prepare(`
        SELECT a.*, u.name as author_name
        FROM announcements a
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.is_active = 1
          AND (a.school_id = ? OR a.school_id IS NULL)
          AND a.scope IN ('all', 'parent')
        ORDER BY
          CASE a.priority WHEN 'urgent' THEN 1 WHEN 'important' THEN 2 ELSE 3 END,
          a.published_at DESC
        LIMIT 50
      `).all(schoolId);
    }

    res.json({
      success: true,
      announcements: announcements.map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        priority: a.priority || 'normal',
        authorName: a.author_name || 'Nhà trường',
        publishedAt: a.published_at,
        scope: a.scope,
        classId: a.class_id,
      })),
    });
  } catch (err) {
    console.error('[/announcements] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// TUITION INVOICES (secure)
// GET /api/parent/tuition?studentId=xxx
// If studentId is not provided, auto-detect first linked child
// =============================================================================
router.get('/tuition', requirePermission('tuition.read'), async (req, res) => {
  let studentId = req.query.studentId;

  // Auto-detect first linked child if not provided
  if (!studentId) {
    // parent_id in parent_student_links is the user_id (e.g., 'usr_parent_1')
    // parents.user_id is also the user_id, so join on user_id
    const links = db.prepare(`
      SELECT psl.student_id, s.school_id
      FROM parent_student_links psl
      JOIN students s ON s.id = psl.student_id
      JOIN parents p ON p.user_id = psl.parent_id
      WHERE p.user_id = ? AND psl.is_active = 1
      LIMIT 1
    `).all(getParentUserId(req));

    if (links.length === 0) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy học sinh liên kết' });
    }
    studentId = links[0].student_id;
  }

  // Relationship check is done via middleware pattern
  // For tuition, we verify inline since it uses synchronous SQLite
  const { authorized, error } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    const statusMap = { NOT_AUTHORIZED: 403, TENANT_FORBIDDEN: 403, STUDENT_NOT_FOUND: 404 };
    return res.status(statusMap[error] || 403).json({
      success: false,
      code: error || 'NOT_AUTHORIZED',
      message: 'Bạn không có quyền xem học phí của học sinh này.',
    });
  }

  const invoice = db.prepare('SELECT * FROM tuition_invoices WHERE student_id = ? LIMIT 1').get(studentId);
  res.json({
    success: true,
    invoice: invoice
      ? {
          id: invoice.id,
          period: invoice.period,
          total: Number(invoice.total_amount).toLocaleString('vi-VN'),
          totalAmount: invoice.total_amount,
          dueDate: invoice.due_date,
          status: invoice.status,
          paidAt: invoice.paid_at,
          bankName: invoice.bank_name,
          items: typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []),
          qrInfo: {
            bankName: invoice.bank_name,
            accountNumber: invoice.account_number,
            accountName: invoice.account_name,
            amount: invoice.total_amount,
            description: invoice.transfer_memo,
          },
        }
      : null,
  });
});

// Pay tuition — relationship check
router.post('/tuition/:id/pay', requirePermission('tuition.pay'), async (req, res) => {
  const invoiceId = req.params.id;

  // Get invoice to find student
  const invoice = db.prepare('SELECT * FROM tuition_invoices WHERE id = ?').get(invoiceId);
  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
  }

  const { authorized } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId: invoice.student_id,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Không có quyền' });
  }

  db.prepare(`
    UPDATE tuition_invoices
    SET status = 'paid', paid_at = datetime('now')
    WHERE id = ?
  `).run(invoiceId);

  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type, created_at)
    VALUES (?, ?, 'parent', 'Thanh toán học phí trực tuyến', 'Đã thanh toán', 'success', datetime('now'))
  `).run(`log_${Date.now()}`, req.user?.name || 'Phụ huynh');

  res.json({ success: true, message: 'Xác nhận thanh toán học phí thành công!' });
});

// =============================================================================
// LEAVE REQUESTS
// =============================================================================
router.get('/leave-requests', requirePermission('leave_request.read'), async (req, res) => {
  const studentId = req.query.studentId;
  if (!studentId) {
    return res.status(400).json({ success: false, message: 'Thiếu studentId' });
  }

  const { authorized } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Không có quyền' });
  }

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

router.post('/leave-requests', requirePermission('leave_request.create'), async (req, res) => {
  const { studentId, startDate, endDate, reasonType, reasonDetail, emergencyPhone } = req.body;

  if (!studentId || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
  }

  const { authorized, error } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    const statusMap = { NOT_AUTHORIZED: 403, TENANT_FORBIDDEN: 403, STUDENT_NOT_FOUND: 404 };
    return res.status(statusMap[error] || 403).json({
      success: false,
      code: error || 'NOT_AUTHORIZED',
      message: 'Bạn không có quyền tạo đơn cho học sinh này.',
    });
  }

  const newId = `leave_${Date.now()}`;
  const reason = req.body.reason || reasonDetail || reasonType || 'Không có lý do';
  db.prepare(`
    INSERT INTO leave_requests (id, student_id, parent_id, start_date, end_date, reason, reason_type, reason_detail, emergency_phone, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
  `).run(newId, studentId, getParentUserId(req), startDate, endDate, reason, reasonType || 'Việc gia đình', reasonDetail || '', emergencyPhone || '');

  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type, created_at)
    VALUES (?, ?, 'parent', ?, 'Đơn phép', 'info', datetime('now'))
  `).run(`log_${Date.now()}`, req.user?.name || 'Phụ huynh', `Gửi đơn xin nghỉ học (${startDate} -> ${endDate})`);

  res.json({ success: true, message: 'Đơn xin nghỉ học đã được gửi!', id: newId });
});

// =============================================================================
// PARENT-TEACHER MESSAGES
// =============================================================================
router.get('/messages', requirePermission('message.read'), async (req, res) => {
  const studentId = req.query.studentId;
  if (!studentId) {
    return res.status(400).json({ success: false, message: 'Thiếu studentId' });
  }

  const { authorized } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Không có quyền' });
  }

  const messages = db.prepare(`
    SELECT * FROM parent_teacher_messages
    WHERE student_id = ?
    ORDER BY created_at ASC
  `).all(studentId);

  res.json({ success: true, messages });
});

router.post('/messages', requirePermission('message.send'), async (req, res) => {
  const { studentId, content, senderName } = req.body;
  if (!studentId || !content) {
    return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống' });
  }

  const { authorized } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Không có quyền' });
  }

  const newId = `msg_${Date.now()}`;
  const sender = senderName || req.user?.name || 'Phụ huynh';
  db.prepare(`
    INSERT INTO parent_teacher_messages (id, student_id, parent_id, sender_role, sender_name, content, created_at)
    VALUES (?, ?, ?, 'parent', ?, ?, datetime('now'))
  `).run(newId, studentId, getParentUserId(req), sender, content);

  res.json({
    success: true,
    message: {
      id: newId,
      student_id: studentId,
      parent_id: getParentUserId(req),
      sender_role: 'parent',
      sender_name: sender,
      content,
      created_at: new Date().toISOString(),
    },
  });
});

// =============================================================================
// DETAILED GRADES FOR PARENT
// GET /api/parent/grades-detail?studentId=xxx
// =============================================================================
router.get('/grades-detail', requirePermission('grade.read'), async (req, res) => {
  const studentId = req.query.studentId;
  if (!studentId) {
    return res.status(400).json({ success: false, message: 'Thiếu studentId' });
  }

  const { authorized } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Không có quyền xem điểm của học sinh này' });
  }

  try {
    // Use the same gradebook service endpoint used by student
    const grades = await gradebookService.getStudentGradesForParent({
      studentId,
      schoolId: getSchoolId(req),
      period: req.query.period || 'hk1',
      requestingUserId: getParentUserId(req),
    });
    res.json({ success: true, data: grades });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================================
// INVOICES HISTORY
// GET /api/parent/invoices?studentId=xxx
// =============================================================================
router.get('/invoices', requirePermission('tuition.read'), async (req, res) => {
  const studentId = req.query.studentId;
  if (!studentId) {
    return res.status(400).json({ success: false, message: 'Thiếu studentId' });
  }

  const { authorized } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Không có quyền' });
  }

  const invoice = db.prepare('SELECT * FROM tuition_invoices WHERE student_id = ? LIMIT 1').get(studentId);
  const pastInvoices = db.prepare('SELECT * FROM tuition_invoices WHERE student_id = ? ORDER BY created_at DESC LIMIT 12').all(studentId);

  res.json({
    success: true,
    currentInvoice: invoice
      ? {
          id: invoice.id,
          period: invoice.period,
          total: Number(invoice.total_amount).toLocaleString('vi-VN'),
          totalAmount: invoice.total_amount,
          dueDate: invoice.due_date,
          status: invoice.status,
          paidAt: invoice.paid_at,
          items: typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []),
          qrInfo: {
            bank: invoice.bank_name,
            accountNumber: invoice.account_number,
            accountName: invoice.account_name,
            amount: invoice.total_amount,
            description: invoice.transfer_memo,
          },
        }
      : null,
    pastInvoices: pastInvoices.map(inv => ({
      id: inv.id,
      period: inv.period,
      total: Number(inv.total_amount).toLocaleString('vi-VN'),
      totalAmount: inv.total_amount,
      paidAt: inv.paid_at,
      status: inv.status,
      paymentMethod: 'VietQR Napas 24/7',
      receiptNo: `BL-${inv.id}`,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []),
    })),
  });
});

// =============================================================================
// CHILD TIMETABLE (route: /parent/children/:id/timetable)
// GET /api/parent/children/:id/timetable
// =============================================================================
router.get('/children/:id/timetable', requirePermission('timetable.read'), async (req, res) => {
  const childId = req.params.id;

  const { authorized } = await verifyParentChildRelationship({
    parentUserId: getParentUserId(req),
    studentId: childId,
    schoolId: getSchoolId(req),
  });
  if (!authorized && !isAdmin(req)) {
    return res.status(403).json({ success: false, message: 'Không có quyền xem thời khóa biểu' });
  }

  try {
    const result = await timetableService.getParentChildTimetable({
      parentId: getParentUserId(req),
      studentId: childId,
      schoolId: getSchoolId(req),
      semesterId: req.query.semesterId || null,
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({
      success: false,
      code: err.code || 'SERVER_ERROR',
      message: err.message,
    });
  }
});

// =============================================================================
// CONFIRM ANNOUNCEMENT
// POST /api/parent/notices/:id/confirm
// =============================================================================
router.post('/notices/:id/confirm', requirePermission('announcement.read'), (req, res) => {
  const noticeId = req.params.id;
  // Accept confirmations only for announcements the parent has access to (any school announcement)
  const notice = db.prepare('SELECT * FROM announcements WHERE id = ?').get(noticeId);
  if (!notice) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
  }
  // For now, simple toggle — in production would track by parent_user_id
  res.json({ success: true, confirmed: true });
});

export default router;
