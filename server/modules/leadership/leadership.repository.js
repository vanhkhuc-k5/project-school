// =============================================================================
// Leadership Repository — Efficient Data Access Layer
// G32 — Principal / Vice Principal Dashboard
// All queries are school-scoped and date-scoped where applicable
// =============================================================================
import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';

/**
 * Leadership Repository
 * Efficient queries for school leadership metrics
 */
export const leadershipRepo = {
  // ── Enrollment Overview ─────────────────────────────────────────────

  /**
   * Get enrollment summary by grade level
   */
  async getEnrollmentByGrade(schoolId, academicYearId = null) {
    if (isPostgresConfigured()) {
      let query = `
        SELECT 
          c.grade_level,
          COUNT(DISTINCT ce.student_id) FILTER (WHERE ce.status = 'active') as active_students,
          COUNT(DISTINCT ce.student_id) FILTER (WHERE ce.status = 'pending') as pending_students,
          COUNT(DISTINCT c.id) as class_count
        FROM classes c
        LEFT JOIN class_enrollments ce ON c.id = ce.class_id
          ${academicYearId ? 'AND ce.academic_year_id = $2' : ''}
        WHERE c.school_id = $1
        AND c.status != 'archived'
        GROUP BY c.grade_level
        ORDER BY c.grade_level
      `;
      const params = academicYearId ? [schoolId, academicYearId] : [schoolId];
      const res = await pgQuery(query, params);
      return res.rows;
    }

    const query = `
      SELECT 
        c.grade_level,
        COUNT(DISTINCT CASE WHEN ce.status = 'active' THEN ce.student_id END) as active_students,
        COUNT(DISTINCT CASE WHEN ce.status = 'pending' THEN ce.student_id END) as pending_students,
        COUNT(DISTINCT c.id) as class_count
      FROM classes c
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id
        ${academicYearId ? 'AND ce.academic_year_id = ?' : ''}
      WHERE c.school_id = ?
      AND c.status != 'archived'
      GROUP BY c.grade_level
      ORDER BY c.grade_level
    `;
    const params = academicYearId ? [academicYearId, schoolId] : [schoolId];
    return db.prepare(query).all(...params);
  },

  /**
   * Get enrollment trends over time (monthly)
   */
  async getEnrollmentTrends(schoolId, startDate, endDate) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          DATE_TRUNC('month', ce.created_at) as month,
          COUNT(DISTINCT ce.student_id) as total_enrolled
        FROM class_enrollments ce
        JOIN classes c ON ce.class_id = c.id
        WHERE c.school_id = $1
        AND ce.created_at BETWEEN $2 AND $3
        GROUP BY DATE_TRUNC('month', ce.created_at)
        ORDER BY month
      `, [schoolId, startDate, endDate]);
      return res.rows;
    }

    return db.prepare(`
      SELECT 
        strftime('%Y-%m', ce.created_at) as month,
        COUNT(DISTINCT ce.student_id) as total_enrolled
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      WHERE c.school_id = ?
      AND ce.created_at BETWEEN ? AND ?
      GROUP BY strftime('%Y-%m', ce.created_at)
      ORDER BY month
    `).all(schoolId, startDate, endDate);
  },

  // ── Attendance Metrics ─────────────────────────────────────────────

  /**
   * Get attendance summary for a date range
   */
  async getAttendanceSummary(schoolId, startDate, endDate) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          COUNT(*) as total_records,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
          SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused,
          ROUND(
            SUM(CASE WHEN a.status = 'present' THEN 1.0 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
            2
          ) as present_rate
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN classes c ON s.class_id = c.id
        WHERE c.school_id = $1
        AND a.date >= $2::text AND a.date <= $3::text
      `, [schoolId, startDate, endDate]);
      return res.rows[0] || {};
    }

    return db.prepare(`
      SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused,
        ROUND(
          SUM(CASE WHEN a.status = 'present' THEN 1.0 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
          2
        ) as present_rate
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE c.school_id = ?
      AND a.date BETWEEN ? AND ?
    `).get(schoolId, startDate, endDate);
  },

  /**
   * Get attendance by grade level
   */
  async getAttendanceByGrade(schoolId, startDate, endDate) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          c.grade_level,
          COUNT(*) as total,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
          ROUND(
            SUM(CASE WHEN a.status = 'present' THEN 1.0 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
            2
          ) as present_rate
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN classes c ON s.class_id = c.id
        WHERE c.school_id = $1
        AND a.date >= $2::text AND a.date <= $3::text
        GROUP BY c.grade_level
        ORDER BY c.grade_level
      `, [schoolId, startDate, endDate]);
      return res.rows;
    }

    return db.prepare(`
      SELECT 
        c.grade_level,
        COUNT(*) as total,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        ROUND(
          SUM(CASE WHEN a.status = 'present' THEN 1.0 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
          2
        ) as present_rate
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE c.school_id = ?
      AND a.date BETWEEN ? AND ?
      GROUP BY c.grade_level
      ORDER BY c.grade_level
    `).all(schoolId, startDate, endDate);
  },

  // ── Academic Performance ─────────────────────────────────────────────

  /**
   * Get average grades by subject
   */
  async getGradesBySubject(schoolId, academicYearId = null, semesterId = null) {
    if (isPostgresConfigured()) {
      let query = `
        SELECT 
          s.name as subject,
          s.id as subject_id,
          AVG(g.score) as avg_score,
          COUNT(DISTINCT g.student_id) as student_count
        FROM grades g
        JOIN students st ON g.student_id = st.id
        JOIN classes c ON st.class_id = c.id
        JOIN users u ON st.user_id = u.id
        JOIN subjects s ON g.subject_id = s.id
        WHERE c.school_id = $1
      `;
      const params = [schoolId];
      let paramIndex = 2;

      if (academicYearId) {
        query += ` AND g.academic_year_id = $${paramIndex}`;
        params.push(academicYearId);
        paramIndex++;
      }
      if (semesterId) {
        query += ` AND g.semester_id = $${paramIndex}`;
        params.push(semesterId);
      }

      query += `
        GROUP BY s.id, s.name
        ORDER BY s.name
      `;

      const res = await pgQuery(query, params);
      return res.rows;
    }

    let query = `
      SELECT 
        s.name as subject,
        s.id as subject_id,
        AVG(g.score) as avg_score,
        COUNT(DISTINCT g.student_id) as student_count
      FROM grades g
      JOIN students st ON g.student_id = st.id
      JOIN classes c ON st.class_id = c.id
      JOIN subjects s ON g.subject_id = s.id
      WHERE c.school_id = ?
    `;
    const params = [schoolId];

    if (academicYearId) {
      query += ` AND g.academic_year_id = ?`;
      params.push(academicYearId);
    }
    if (semesterId) {
      query += ` AND g.semester_id = ?`;
      params.push(semesterId);
    }

    query += `
      GROUP BY s.id, s.name
      ORDER BY s.name
    `;

    return db.prepare(query).all(...params);
  },

  /**
   * Get grade distribution (A/B/C/D/F counts)
   */
  async getGradeDistribution(schoolId, academicYearId = null) {
    if (isPostgresConfigured()) {
      let query = `
        SELECT 
          CASE 
            WHEN g.score >= 8.5 THEN 'A'
            WHEN g.score >= 7.0 THEN 'B'
            WHEN g.score >= 5.5 THEN 'C'
            WHEN g.score >= 4.0 THEN 'D'
            ELSE 'F'
          END as grade,
          COUNT(*) as count
        FROM grades g
        JOIN students st ON g.student_id = st.id
        JOIN classes c ON st.class_id = c.id
        WHERE c.school_id = $1
      `;
      const params = [schoolId];

      if (academicYearId) {
        query += ` AND g.academic_year_id = $2`;
        params.push(academicYearId);
      }

      query += `
        GROUP BY grade
        ORDER BY grade
      `;

      const res = await pgQuery(query, params);
      return res.rows;
    }

    let query = `
      SELECT 
        CASE 
          WHEN g.score >= 8.5 THEN 'A'
          WHEN g.score >= 7.0 THEN 'B'
          WHEN g.score >= 5.5 THEN 'C'
          WHEN g.score >= 4.0 THEN 'D'
          ELSE 'F'
        END as grade,
        COUNT(*) as count
        FROM grades g
        JOIN students st ON g.student_id = st.id
        JOIN classes c ON st.class_id = c.id
        JOIN users u ON st.user_id = u.id
        WHERE c.school_id = ?
      `;
    const params = [schoolId];

    if (academicYearId) {
      query += ` AND g.academic_year_id = ?`;
      params.push(academicYearId);
    }

    query += `
      GROUP BY grade
      ORDER BY grade
    `;

    return db.prepare(query).all(...params);
  },

  // ── Class Comparisons ─────────────────────────────────────────────

  /**
   * Get class performance summary
   */
  async getClassPerformance(schoolId, academicYearId = null) {
    if (isPostgresConfigured()) {
      let query = `
        SELECT 
          c.id as class_id,
          c.name as class_name,
          c.grade_level,
          AVG(g.score) as avg_score,
          COUNT(DISTINCT g.student_id) as student_count,
          MIN(g.score) as min_score,
          MAX(g.score) as max_score
        FROM classes c
        LEFT JOIN students st ON st.class_id = c.id
        LEFT JOIN grades g ON g.student_id = st.id
        WHERE c.school_id = $1
        AND c.status != 'archived'
      `;
      const params = [schoolId];

      if (academicYearId) {
        query += ` AND c.academic_year_id = $2`;
        params.push(academicYearId);
      }

      query += `
        GROUP BY c.id, c.name, c.grade_level
        ORDER BY c.grade_level, c.name
      `;

      const res = await pgQuery(query, params);
      return res.rows;
    }

    let query = `
      SELECT 
        c.id as class_id,
        c.name as class_name,
        c.grade_level,
        AVG(g.score) as avg_score,
        COUNT(DISTINCT g.student_id) as student_count,
        MIN(g.score) as min_score,
        MAX(g.score) as max_score
      FROM classes c
      LEFT JOIN students st ON st.class_id = c.id
      LEFT JOIN grades g ON g.student_id = st.id
      WHERE c.school_id = ?
      AND c.status != 'archived'
    `;
    const params = [schoolId];

    if (academicYearId) {
      query += ` AND c.academic_year_id = ?`;
      params.push(academicYearId);
    }

    query += `
      GROUP BY c.id, c.name, c.grade_level
      ORDER BY c.grade_level, c.name
    `;

    return db.prepare(query).all(...params);
  },

  // ── Operational Alerts ─────────────────────────────────────────────

  /**
   * Get classes with low attendance
   */
  async getLowAttendanceClasses(schoolId, threshold = 85) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          c.id as class_id,
          c.name as class_name,
          c.grade_level,
          COUNT(*) as total_records,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
          ROUND(
            SUM(CASE WHEN a.status = 'present' THEN 1.0 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
            2
          ) as present_rate
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN classes c ON s.class_id = c.id
        WHERE c.school_id = $1
        AND a.date >= (CURRENT_DATE - INTERVAL '30 days')::text
        GROUP BY c.id, c.name, c.grade_level
        HAVING SUM(CASE WHEN a.status = 'present' THEN 1.0 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) < $2
        ORDER BY present_rate ASC
        LIMIT 10
      `, [schoolId, threshold]);
      return res.rows;
    }

    return db.prepare(`
      SELECT 
        c.id as class_id,
        c.name as class_name,
        c.grade_level,
        COUNT(*) as total_records,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        ROUND(
          SUM(CASE WHEN a.status = 'present' THEN 1.0 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
          2
        ) as present_rate
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE c.school_id = ?
      AND a.date >= date('now', '-30 days')
      GROUP BY c.id, c.name, c.grade_level
      HAVING SUM(CASE WHEN a.status = 'present' THEN 1.0 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) < ?
      ORDER BY present_rate ASC
      LIMIT 10
    `).all(schoolId, threshold);
  },

  /**
   * Get students at academic risk
   */
  async getAtRiskStudents(schoolId, gradeThreshold = 5.0) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          st.id as student_id,
          u.name as student_name, c.name as class_name,
          c.grade_level,
          AVG(g.score) as avg_score,
          COUNT(g.id) as grade_count
        FROM grades g
        JOIN students st ON g.student_id = st.id
        JOIN classes c ON st.class_id = c.id
        JOIN users u ON st.user_id = u.id
        WHERE c.school_id = $1
        GROUP BY st.id, u.name, c.id, c.name, c.grade_level
        HAVING AVG(g.score) < $2
        ORDER BY avg_score ASC
        LIMIT 20
      `, [schoolId, gradeThreshold]);
      return res.rows;
    }

    return db.prepare(`
      SELECT 
        st.id as student_id,
        
        c.name as class_name,
        c.grade_level,
        AVG(g.score) as avg_score,
        COUNT(g.id) as grade_count
      FROM grades g
      JOIN students st ON g.student_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE c.school_id = ?
      GROUP BY st.id, c.name, c.grade_level
      HAVING AVG(g.score) < ?
      ORDER BY avg_score ASC
      LIMIT 20
    `).all(schoolId, gradeThreshold);
  },

  // ── Pending Approvals ─────────────────────────────────────────────

  /**
   * Get pending leave requests for approval
   */
  async getPendingLeaveRequests(schoolId, limit = 10) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          lr.id,
          lr.student_id,
          lr.start_date,
          lr.end_date,
          lr.reason,
          lr.status,
          lr.created_at,
          stu.name as student_name, c.name as class_name,
          pu.name as parent_name
        FROM leave_requests lr
        JOIN students st ON lr.student_id = st.id
        JOIN classes c ON st.class_id = c.id
        LEFT JOIN users stu ON st.user_id = stu.id
        LEFT JOIN users pu ON lr.parent_id = pu.id
        WHERE lr.school_id = $1
        AND lr.status = 'submitted'
        ORDER BY lr.created_at DESC
        LIMIT $2
      `, [schoolId, limit]);
      return res.rows;
    }

    return db.prepare(`
      SELECT 
        lr.id,
        lr.student_id,
        lr.start_date,
        lr.end_date,
        lr.reason,
        lr.status,
        lr.created_at,
        
        c.name as class_name
      FROM leave_requests lr
      JOIN students st ON lr.student_id = st.id
      JOIN classes c ON st.class_id = c.id
      WHERE lr.school_id = ?
      AND lr.status = 'submitted'
      ORDER BY lr.created_at DESC
      LIMIT ?
    `).all(schoolId, limit);
  },

  /**
   * Get pending announcements
   */
  async getPendingAnnouncements(schoolId, limit = 10) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          id,
          title,
          content,
          priority,
          status,
          scope,
          author_name,
          created_at
        FROM announcements
        WHERE school_id = $1
        AND status = 'draft'
        ORDER BY created_at DESC
        LIMIT $2
      `, [schoolId, limit]);
      return res.rows;
    }

    return db.prepare(`
      SELECT 
        id,
        title,
        content,
        priority,
        status,
        scope,
        author_name,
        created_at
      FROM announcements
      WHERE school_id = ?
      AND status = 'draft'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(schoolId, limit);
  },

  // ── Staff/Class Coverage ─────────────────────────────────────────────

  /**
   * Get subject coverage by department
   */
  async getSubjectCoverage(schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          d.name as department,
          s.name as subject,
          COUNT(DISTINCT ta.teacher_id) as teacher_count,
          COUNT(DISTINCT ta.class_id) as class_count
        FROM subjects s
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN teacher_assignments ta ON ta.subject_id = s.id
        GROUP BY d.id, d.name, s.id, s.name
        ORDER BY d.name, s.name
      `);
      return res.rows;
    }

    return db.prepare(`
      SELECT 
        d.name as department,
        s.name as subject,
        COUNT(DISTINCT ta.teacher_id) as teacher_count,
        COUNT(DISTINCT ta.class_id) as class_count
      FROM subjects s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN teacher_assignments ta ON ta.subject_id = s.id
      GROUP BY d.id, d.name, s.id, s.name
      ORDER BY d.name, s.name
    `).all();
  },

  /**
   * Get teacher workload summary
   */
  async getTeacherWorkload(schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          u.id as teacher_id,
          u.name as teacher_name,
          COUNT(DISTINCT ta.class_id) as assigned_classes,
          COUNT(DISTINCT ta.subject_id) as assigned_subjects
        FROM users u
        LEFT JOIN teacher_assignments ta ON ta.teacher_id = u.id
        WHERE u.school_id = $1
        AND u.role IN ('teacher', 'homeroom_teacher')
        GROUP BY u.id, u.name
        ORDER BY assigned_classes DESC
        LIMIT 20
      `, [schoolId]);
      return res.rows;
    }

    return db.prepare(`
      SELECT 
        u.id as teacher_id,
        u.name as teacher_name,
        COUNT(DISTINCT ta.class_id) as assigned_classes,
        COUNT(DISTINCT ta.subject_id) as assigned_subjects
      FROM users u
      LEFT JOIN teacher_assignments ta ON ta.teacher_id = u.id
      WHERE u.school_id = ?
      AND u.role IN ('teacher', 'homeroom_teacher')
      GROUP BY u.id, u.name
      ORDER BY assigned_classes DESC
      LIMIT 20
    `).all(schoolId);
  },
};










