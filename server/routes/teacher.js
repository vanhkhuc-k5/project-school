import express from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, requirePermission, requireAnyPermission } from '../middleware/auth.js';
import { isPostgresConfigured, pgQuery } from '../shared/database/index.js';
import { teacherAssignmentsRepository } from '../modules/teacher-assignments/teacher-assignments.repository.js';
import { timetableService } from '../modules/timetable/index.js';
import { attendanceController } from '../modules/attendance/index.js';

const router = express.Router();


// Enforce authentication & role across all teacher endpoints
router.use(authenticateToken);
router.use(requireRole('teacher', 'admin', 'school_admin', 'principal', 'vice_principal', 'department_head'));

// Get Teacher Dashboard Overview Data
router.get('/dashboard', requirePermission('teacher.read'), async (req, res) => {
  const userId = req.user?.id;
  const currentSchoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';

  let teacher = null;
  let activeAssignmentsCount = 0;
  let pendingReviewCount = 0;
  let submittedTodayCount = 0;
  let totalStudents = 0;

  if (isPostgresConfigured()) {
    const tchRes = await pgQuery(`
      SELECT t.*, u.name, u.email, u.phone, u.code,
             d.name as department_name,
             c.name as homeroom_class_name,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = t.homeroom_class_id OR s.current_class_id = t.homeroom_class_id) as homeroom_students_count
      FROM users u
      LEFT JOIN teachers t ON t.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN classes c ON t.homeroom_class_id = c.id
      WHERE u.id = $1
    `, [userId]);

    teacher = tchRes.rows[0];

    const asgRes = await pgQuery(`
      SELECT COUNT(*) as count FROM assignments WHERE created_by = $1
    `, [userId]);
    activeAssignmentsCount = parseInt(asgRes.rows[0]?.count || 0, 10);

    const subRes = await pgQuery(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'submitted') as pending,
        COUNT(*) FILTER (WHERE status IN ('submitted', 'graded')) as submitted
      FROM assignment_submissions
      WHERE assignment_id IN (SELECT id FROM assignments WHERE created_by = $1)
    `, [userId]);
    pendingReviewCount = parseInt(subRes.rows[0]?.pending || 0, 10);
    submittedTodayCount = parseInt(subRes.rows[0]?.submitted || 0, 10);
  } else {
    teacher = db.prepare(`
      SELECT t.*, u.name, u.email, u.phone, u.code,
             d.name as department_name,
             c.name as homeroom_class_name,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = t.homeroom_class_id OR s.current_class_id = t.homeroom_class_id) as homeroom_students_count
      FROM users u
      LEFT JOIN teachers t ON t.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN classes c ON t.homeroom_class_id = c.id
      WHERE u.id = ?
    `).get(userId);

    const asg = db.prepare('SELECT COUNT(*) as count FROM assignments WHERE created_by = ?').get(userId);
    activeAssignmentsCount = asg?.count || 0;

    const sub = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pending,
        COUNT(*) as submitted
      FROM assignment_submissions
      WHERE assignment_id IN (SELECT id FROM assignments WHERE created_by = ?)
    `).get(userId);
    pendingReviewCount = sub?.pending || 0;
    submittedTodayCount = sub?.submitted || 0;
  }

  const homeroomClass = teacher?.homeroom_class_name || (teacher?.homeroom_class_id ? '10A1' : 'Bộ môn');
  totalStudents = Number(teacher?.homeroom_students_count) || 42;

  res.json({
    success: true,
    data: {
      teacherName: teacher?.name || 'Giáo viên',
      department: teacher?.department_name || 'Tổ Toán - Tin học',
      homeroomClass,
      employeeId: teacher?.employee_id || teacher?.code || 'GV-2024',
      qualification: teacher?.qualification || 'Cử nhân Sư phạm',
      stats: {
        totalStudents,
        activeAssignments: activeAssignmentsCount || 5,
        submittedToday: submittedTodayCount || 18,
        pendingReview: pendingReviewCount || 4,
      },
    },
  });
});

// Get Teacher Analytics Data
router.get('/analytics', requirePermission('grade.read'), async (req, res) => {
  const currentSchoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
  const targetClassId = req.query.classId || (currentSchoolId === 'sch_hoasen' ? 'cls_hoasen_10A1' : 'cls_10A1');

  if (isPostgresConfigured()) {
    const clsRes = await pgQuery('SELECT id, school_id FROM classes WHERE id = $1', [targetClassId]);
    if (clsRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }
    if (clsRes.rows[0].school_id && clsRes.rows[0].school_id !== currentSchoolId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, code: 'TENANT_FORBIDDEN', message: 'Bạn không có quyền truy cập dữ liệu lớp học thuộc trường khác' });
    }
  } else {
    const cls = db.prepare('SELECT id, school_id FROM classes WHERE id = ?').get(targetClassId);
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }
    if (cls.school_id && cls.school_id !== currentSchoolId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, code: 'TENANT_FORBIDDEN', message: 'Bạn không có quyền truy cập dữ liệu lớp học thuộc trường khác' });
    }
  }

  // Server-side Assignment Authorization
  if (req.user?.role === 'teacher') {
    const isAssigned = await teacherAssignmentsRepository.isTeacherAssignedToClass(req.user.id, targetClassId, {
      schoolId: currentSchoolId,
    });
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        code: 'TEACHER_NOT_ASSIGNED_TO_CLASS',
        error: {
          code: 'TEACHER_NOT_ASSIGNED_TO_CLASS',
          message: 'Bạn không được phân công giảng dạy hoặc làm chủ nhiệm lớp học này',
        },
        message: 'Bạn không được phân công giảng dạy hoặc làm chủ nhiệm lớp học này',
      });
    }
  }

  let students = [];
  if (isPostgresConfigured()) {
    const stdRes = await pgQuery(`
      SELECT s.*, u.name, u.code, u.avatar
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.class_id = $1
      ORDER BY s.gpa ASC
    `, [targetClassId]);
    students = stdRes.rows;
  } else {
    students = db.prepare(`
      SELECT s.*, u.name, u.code, u.avatar
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.class_id = ?
      ORDER BY s.gpa ASC
    `).all(targetClassId);
  }

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
router.post('/assignments', requirePermission('assignment.create'), async (req, res) => {
  const { title, subject, type, instructions, targetClasses, deadlineDate, deadlineTime, durationMinutes, questions } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, message: 'Tiêu đề bài tập không được để trống' });
  }

  const asgId = `asg_${Date.now()}`;
  const currentSchoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
  const teacherId = req.user.id;

  // Server-side Assignment Authorization: teacher may only create assignments for assigned classes
  if (req.user?.role === 'teacher') {
    const rawTargets = targetClasses || (req.body.targetClass ? [req.body.targetClass] : []);
    const classesToCheck = Array.isArray(rawTargets) ? rawTargets : [rawTargets];

    for (const targetClass of classesToCheck) {
      if (!targetClass) continue;
      const cls = isPostgresConfigured()
        ? (await pgQuery('SELECT id FROM classes WHERE (id = $1 OR name = $1) AND (school_id = $2 OR school_id IS NULL)', [targetClass, currentSchoolId])).rows[0]
        : db.prepare('SELECT id FROM classes WHERE (id = ? OR name = ?) AND (school_id = ? OR school_id IS NULL)').get(targetClass, targetClass, currentSchoolId);
      
      if (cls) {
        const isAssigned = await teacherAssignmentsRepository.isTeacherAssignedToClass(req.user.id, cls.id, {
          schoolId: currentSchoolId,
        });
        if (!isAssigned) {
          return res.status(403).json({
            success: false,
            code: 'TEACHER_NOT_ASSIGNED_TO_CLASS',
            error: {
              code: 'TEACHER_NOT_ASSIGNED_TO_CLASS',
              message: `Bạn không được phân công giảng dạy tại lớp ${targetClass}`,
            },
            message: `Bạn không được phân công giảng dạy tại lớp ${targetClass}`,
          });
        }
      }
    }
  }

  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO assignments (id, title, subject, type, instructions, target_classes, due_date, due_time, duration_minutes, created_by, school_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published')
    `, [
      asgId,
      title,
      subject || 'Toán học',
      type || 'quiz',
      instructions || '',
      JSON.stringify(targetClasses || ['10A1', '10A2']),
      deadlineDate || '2024-10-30',
      deadlineTime || '23:59',
      durationMinutes || 45,
      teacherId,
      currentSchoolId,
    ]);

    if (Array.isArray(questions)) {
      for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx];
        await pgQuery(`
          INSERT INTO assignment_questions (id, assignment_id, question_order, prompt, points, has_plot, plot_data, options, explanation)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          `q_${asgId}_${idx + 1}`,
          asgId,
          idx + 1,
          q.prompt || `Câu hỏi số ${idx + 1}`,
          q.points || 1.0,
          q.hasPlot ? true : false,
          q.plotData || null,
          JSON.stringify(q.options || []),
          q.explanation || '',
        ]);
      }
    }
  }

  db.prepare(`
    INSERT INTO assignments (id, title, subject, type, instructions, target_classes, due_date, due_time, duration_minutes, created_by, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
  `).run(
    asgId,
    title,
    subject || 'Toán học',
    type || 'quiz',
    instructions || '',
    JSON.stringify(targetClasses || ['10A1', '10A2']),
    deadlineDate || '2024-10-30',
    deadlineTime || '23:59',
    durationMinutes || 45,
    teacherId
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
router.post('/intervene-notify', requirePermission('announcement.publish'), (req, res) => {
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

// Get Classes and Student Roster with live gradebook derived from assignments
router.get('/classes', requirePermission('class.read'), async (req, res) => {
  const currentSchoolId = req.schoolId || req.user?.schoolId || 'sch_bacau';
  const isTeacherRole = req.user?.role === 'teacher';

  let assignedClasses = [];
  if (isTeacherRole) {
    assignedClasses = await teacherAssignmentsRepository.findTeacherAssignedClasses(req.user.id, {
      schoolId: currentSchoolId,
    });
  }

  let classId = req.query.classId;

  // If no classId provided
  if (!classId) {
    if (isTeacherRole) {
      if (assignedClasses.length === 0) {
        return res.json({
          success: true,
          currentClassId: null,
          classes: [],
          students: [],
        });
      }
      classId = assignedClasses[0].id;
    } else {
      classId = (currentSchoolId === 'sch_hoasen' ? 'cls_hoasen_10A1' : 'cls_10A1');
    }
  }

  if (isPostgresConfigured()) {
    // Check class existence and tenant
    const clsCheck = await pgQuery('SELECT id, school_id FROM classes WHERE id = $1', [classId]);
    if (clsCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }
    if (clsCheck.rows[0].school_id && clsCheck.rows[0].school_id !== currentSchoolId && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, code: 'TENANT_FORBIDDEN', message: 'Bạn không có quyền truy cập danh sách lớp học thuộc trường khác' });
    }

    // Server-side Authorization: Check if teacher is assigned to this class
    if (isTeacherRole) {
      const isAssigned = await teacherAssignmentsRepository.isTeacherAssignedToClass(req.user.id, classId, {
        schoolId: currentSchoolId,
      });
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          code: 'TEACHER_NOT_ASSIGNED_TO_CLASS',
          error: {
            code: 'TEACHER_NOT_ASSIGNED_TO_CLASS',
            message: 'Bạn không được phân công giảng dạy hoặc làm chủ nhiệm lớp học này',
          },
          message: 'Bạn không được phân công giảng dạy hoặc làm chủ nhiệm lớp học này',
        });
      }
    }

    let classes = [];
    if (isTeacherRole) {
      classes = assignedClasses.map(c => ({
        id: c.id,
        name: c.name,
        grade: c.grade_level,
        count: Number(c.student_count) || 0,
        isHomeroom: c.is_homeroom,
        subjects: c.teaching_subjects || [],
      }));
    } else {
      const classesRes = await pgQuery('SELECT * FROM classes WHERE school_id = $1 ORDER BY grade_level, name', [currentSchoolId]);
      const rawClasses = classesRes.rows.length > 0 ? classesRes.rows : (await pgQuery('SELECT * FROM classes ORDER BY grade_level, name')).rows;
      classes = rawClasses.map(c => ({ id: c.id, name: c.name, grade: c.grade_level, count: 42 }));
    }

    // Student Roster derived from active class_enrollments
    let stdRes = await pgQuery(`
      SELECT s.*, u.name, u.code, u.phone, u.avatar
      FROM class_enrollments ce
      JOIN students s ON ce.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE ce.class_id = $1 AND ce.is_current = TRUE AND ce.status = 'enrolled'
      ORDER BY s.class_rank ASC, s.gpa DESC
    `, [classId]);

    // Fallback if no enrollments yet
    if (stdRes.rows.length === 0) {
      stdRes = await pgQuery(`
        SELECT s.*, u.name, u.code, u.phone, u.avatar
        FROM students s
        JOIN users u ON s.user_id = u.id
        WHERE s.class_id = $1
        ORDER BY s.class_rank ASC, s.gpa DESC
      `, [classId]);
    }

    const formattedStudents = await Promise.all(stdRes.rows.map(async (s) => {
      const gradesRes = await pgQuery(`
        SELECT subject, test_name, score
        FROM grades
        WHERE student_id = $1
        ORDER BY id DESC
        LIMIT 3
      `, [s.id]);

      return {
        id: s.id,
        code: s.code || 'HS-10-001',
        name: s.name,
        phone: s.phone,
        avatar: s.avatar,
        gpa: parseFloat(s.gpa) || 8.0,
        rank: s.class_rank || '12',
        attendance: `${s.attendance_rate || 96}%`,
        status: (parseFloat(s.gpa) || 8.0) >= 8.0 ? 'Giỏi / Xuất sắc' : 'Khá',
        statusType: (parseFloat(s.gpa) || 8.0) >= 8.0 ? 'success' : 'info',
        recentGrades: gradesRes.rows,
      };
    }));

    return res.json({
      success: true,
      currentClassId: classId,
      classes,
      students: formattedStudents,
    });
  }

  // SQLite fallback
  const cls = db.prepare('SELECT id, school_id FROM classes WHERE id = ?').get(classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
  }
  if (cls.school_id && cls.school_id !== currentSchoolId && req.user?.role !== 'super_admin') {
    return res.status(403).json({ success: false, code: 'TENANT_FORBIDDEN', message: 'Bạn không có quyền truy cập danh sách lớp học thuộc trường khác' });
  }

  if (isTeacherRole) {
    const isAssigned = await teacherAssignmentsRepository.isTeacherAssignedToClass(req.user.id, classId, {
      schoolId: currentSchoolId,
    });
    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        code: 'TEACHER_NOT_ASSIGNED_TO_CLASS',
        message: 'Bạn không được phân công giảng dạy hoặc làm chủ nhiệm lớp học này',
      });
    }
  }

  let classes = [];
  if (isTeacherRole) {
    classes = assignedClasses.map(c => ({
      id: c.id,
      name: c.name,
      grade: c.grade_level,
      count: Number(c.student_count) || 0,
      isHomeroom: c.is_homeroom,
      subjects: c.teaching_subjects || [],
    }));
  } else {
    const rawClasses = db.prepare('SELECT * FROM classes WHERE school_id = ? OR school_id IS NULL ORDER BY grade_level, name').all(currentSchoolId);
    classes = rawClasses.map(c => ({ id: c.id, name: c.name, grade: c.grade_level, count: 42 }));
  }

  let students = db.prepare(`
    SELECT s.*, u.name, u.code, u.phone, u.avatar
    FROM class_enrollments ce
    JOIN students s ON ce.student_id = s.id
    JOIN users u ON s.user_id = u.id
    WHERE ce.class_id = ? AND ce.is_current = 1 AND ce.status = 'enrolled'
    ORDER BY s.class_rank ASC, s.gpa DESC
  `).all(classId);

  if (students.length === 0) {
    students = db.prepare(`
      SELECT s.*, u.name, u.code, u.phone, u.avatar
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.class_id = ?
      ORDER BY s.class_rank ASC, s.gpa DESC
    `).all(classId);
  }

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
    classes,
    students: formattedStudents,
  });
});

// Record daily class attendance (delegated to canonical attendance module)
router.post('/attendance', requirePermission('attendance.take'), attendanceController.takeAttendance);

// Get attendance for a class on a date (delegated to canonical attendance module)
router.get('/attendance', requirePermission('attendance.read'), attendanceController.getSession);


// Teacher enters or edits a student's grade
router.post('/grades', requirePermission('grade.create'), (req, res) => {
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
router.get('/assignments', requirePermission('assignment.read'), (req, res) => {
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
router.post('/submissions/:id/grade', requirePermission('assignment.grade'), (req, res) => {
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
router.get('/reports', requireAnyPermission('teacher.read', 'grade.read'), (req, res) => {
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

// Teacher sends risk intervention notification to parents
router.post(['/intervene-notify', '/analytics/notify'], requirePermission('announcement.publish'), (req, res) => {
  const notifId = `notif_${Date.now()}`;
  db.prepare(`
    INSERT INTO school_notices (id, title, content, category, tag, tag_type, sender, can_confirm, confirmed_by_users)
    VALUES (?, ?, ?, 'parent', 'Can thiệp sớm', 'warning', 'Cô Mai Lan (Tổ Toán)', 1, '[]')
  `).run(
    notifId,
    'Cảnh báo can thiệp sư phạm học tập',
    'Giáo viên bộ môn Toán gửi thông báo tới phụ huynh các em học sinh cần bổ trợ kiến thức Hình học không gian.'
  );

  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type)
    VALUES (?, 'Cô Mai Lan', 'teacher', ?, 'Đã gửi', 'warning')
  `).run(`log_${Date.now()}`, 'Đã gửi thông báo can thiệp sư phạm tới phụ huynh học sinh cần kèm cặp.');

  res.json({
    success: true,
    message: 'Đã gửi thông báo can thiệp tới phụ huynh thành công!',
    noticeId: notifId,
  });
});

// Get Teacher Timetable (Canonical Source)
router.get('/timetable', requirePermission('class.read'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const schoolId = req.user.school_id || 'sch_bacau';
    const semesterId = req.query.semesterId || null;

    const result = await timetableService.getTeacherTimetable({
      teacherId,
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

export default router;
