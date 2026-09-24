// =============================================================================
// Dashboard Repository — Efficient Data Access Layer
// G31 — Admin Dashboard Real Operational Metrics
// All queries are school-scoped and date-scoped where applicable
// =============================================================================
import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';

/**
 * Dashboard Repository
 * Efficient queries for dashboard metrics
 */
export const dashboardRepo = {
  // ── Enrollment Metrics ─────────────────────────────────────────────

  /**
   * Get active students count for school
   */
  async getActiveStudentsCount(schoolId, academicYearId = null) {
    if (isPostgresConfigured()) {
      let query = `
        SELECT COUNT(DISTINCT ce.student_id) as count
        FROM class_enrollments ce
        JOIN students s ON ce.student_id = s.id
        JOIN classes c ON ce.class_id = c.id
        WHERE c.school_id = $1
        AND ce.status = 'active'
      `;
      const params = [schoolId];
      
      if (academicYearId) {
        query += ` AND ce.academic_year_id = $2`;
        params.push(academicYearId);
      }

      const res = await pgQuery(query, params);
      return parseInt(res.rows[0]?.count || 0, 10);
    }

    let query = `
      SELECT COUNT(DISTINCT ce.student_id) as count
      FROM class_enrollments ce
      JOIN students s ON ce.student_id = s.id
      JOIN classes c ON ce.class_id = c.id
      WHERE c.school_id = ?
      AND ce.status = 'active'
    `;
    const params = [schoolId];
    
    if (academicYearId) {
      query += ` AND ce.academic_year_id = ?`;
      params.push(academicYearId);
    }

    const row = db.prepare(query).get(...params);
    return parseInt(row?.count || 0, 10);
  },

  /**
   * Get active teachers count for school
   */
  async getActiveTeachersCount(schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT COUNT(*) as count FROM users
        WHERE school_id = $1
        AND role IN ('teacher', 'homeroom_teacher')
        AND status = 'active'
      `, [schoolId]);
      return parseInt(res.rows[0]?.count || 0, 10);
    }

    const row = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE school_id = ?
      AND role IN ('teacher', 'homeroom_teacher')
      AND status = 'active'
    `).get(schoolId);
    return parseInt(row?.count || 0, 10);
  },

  /**
   * Get classes count for school
   */
  async getClassesCount(schoolId, academicYearId = null) {
    if (isPostgresConfigured()) {
      let query = `
        SELECT COUNT(*) as count FROM classes
        WHERE school_id = $1
        AND status != 'archived'
      `;
      const params = [schoolId];
      
      if (academicYearId) {
        query += ` AND academic_year_id = $2`;
        params.push(academicYearId);
      }

      const res = await pgQuery(query, params);
      return parseInt(res.rows[0]?.count || 0, 10);
    }

    let query = `
      SELECT COUNT(*) as count FROM classes
      WHERE school_id = ?
      AND status != 'archived'
    `;
    const params = [schoolId];
    
    if (academicYearId) {
      query += ` AND academic_year_id = ?`;
      params.push(academicYearId);
    }

    const row = db.prepare(query).get(...params);
    return parseInt(row?.count || 0, 10);
  },

  // ── Attendance Metrics ─────────────────────────────────────────────

  /**
   * Get attendance summary for today
   */
  async getAttendanceToday(schoolId, date = null) {
    const attendanceDate = date || new Date().toISOString().split('T')[0];

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
          SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN classes c ON s.class_id = c.id
        WHERE c.school_id = $1
        AND DATE(a.date) = $2
      `, [schoolId, attendanceDate]);

      const row = res.rows[0] || {};
      return {
        total: parseInt(row.total || 0, 10),
        present: parseInt(row.present || 0, 10),
        absent: parseInt(row.absent || 0, 10),
        late: parseInt(row.late || 0, 10),
        excused: parseInt(row.excused || 0, 10),
      };
    }

    const row = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN a.status = 'excused' THEN 1 ELSE 0 END) as excused
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE c.school_id = ?
      AND DATE(a.date) = ?
    `).get(schoolId, attendanceDate);

    return {
      total: parseInt(row?.total || 0, 10),
      present: parseInt(row?.present || 0, 10),
      absent: parseInt(row?.absent || 0, 10),
      late: parseInt(row?.late || 0, 10),
      excused: parseInt(row?.excused || 0, 10),
    };
  },

  // ── Pending Operations ─────────────────────────────────────────────

  /**
   * Get pending leave requests count
   */
  async getPendingLeaveRequestsCount(schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT COUNT(*) as count FROM leave_requests
        WHERE school_id = $1
        AND status = 'submitted'
      `, [schoolId]);
      return parseInt(res.rows[0]?.count || 0, 10);
    }

    const row = db.prepare(`
      SELECT COUNT(*) as count FROM leave_requests
      WHERE school_id = ?
      AND status = 'submitted'
    `).get(schoolId);
    return parseInt(row?.count || 0, 10);
  },

  /**
   * Get pending announcements count
   */
  async getPendingAnnouncementsCount(schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT COUNT(*) as count FROM announcements
        WHERE school_id = $1
        AND status = 'draft'
      `, [schoolId]);
      return parseInt(res.rows[0]?.count || 0, 10);
    }

    const row = db.prepare(`
      SELECT COUNT(*) as count FROM announcements
      WHERE school_id = ?
      AND status = 'draft'
    `).get(schoolId);
    return parseInt(row?.count || 0, 10);
  },

  /**
   * Get recent announcements
   */
  async getRecentAnnouncements(schoolId, limit = 5) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT id, title, content, priority, status, scope, author_name, published_at
        FROM announcements
        WHERE school_id = $1
        AND status = 'published'
        ORDER BY published_at DESC
        LIMIT $2
      `, [schoolId, limit]);
      return res.rows;
    }

    return db.prepare(`
      SELECT id, title, content, priority, status, scope, author_name, published_at
      FROM announcements
      WHERE school_id = ?
      AND status = 'published'
      ORDER BY published_at DESC
      LIMIT ?
    `).all(schoolId, limit);
  },

  // ── Security Metrics ─────────────────────────────────────────────

  /**
   * Get recent failed login attempts count
   */
  async getRecentFailedLoginsCount(schoolId, minutes = 30) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT COUNT(*) as count FROM users
        WHERE school_id = $1
        AND failed_login_attempts > 0
        AND (locked_until IS NULL OR locked_until > CURRENT_TIMESTAMP)
      `, [schoolId]);
      return parseInt(res.rows[0]?.count || 0, 10);
    }

    const row = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE school_id = ?
      AND failed_login_attempts > 0
      AND (locked_until IS NULL OR locked_until > datetime('now'))
    `).get(schoolId);
    return parseInt(row?.count || 0, 10);
  },

  /**
   * Get locked accounts count
   */
  async getLockedAccountsCount(schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT COUNT(*) as count FROM users
        WHERE school_id = $1
        AND locked_until > CURRENT_TIMESTAMP
      `, [schoolId]);
      return parseInt(res.rows[0]?.count || 0, 10);
    }

    const row = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE school_id = ?
      AND locked_until > datetime('now')
    `).get(schoolId);
    return parseInt(row?.count || 0, 10);
  },

  /**
   * Get recent audit logs
   */
  async getRecentAuditLogs(schoolId, limit = 10) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT id, action, actor_name, badge, badge_type, created_at
        FROM audit_logs
        WHERE school_id = $1 OR school_id IS NULL
        ORDER BY created_at DESC
        LIMIT $2
      `, [schoolId, limit]);
      return res.rows;
    }

    return db.prepare(`
      SELECT id, action, actor_name, badge, badge_type, created_at
      FROM audit_logs
      WHERE school_id = ? OR school_id IS NULL
      ORDER BY created_at DESC
      LIMIT ?
    `).all(schoolId, limit);
  },

  // ── Quick Stats ─────────────────────────────────────────────────

  /**
   * Get enrollment trends by grade
   */
  async getEnrollmentByGrade(schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          c.grade_level,
          COUNT(DISTINCT ce.student_id) as student_count
        FROM classes c
        LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.status = 'active'
        WHERE c.school_id = $1
        AND c.status != 'archived'
        GROUP BY c.grade_level
        ORDER BY c.grade_level
      `, [schoolId]);
      return res.rows;
    }

    return db.prepare(`
      SELECT 
        c.grade_level,
        COUNT(DISTINCT ce.student_id) as student_count
      FROM classes c
      LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.status = 'active'
      WHERE c.school_id = ?
      AND c.status != 'archived'
      GROUP BY c.grade_level
      ORDER BY c.grade_level
    `).all(schoolId);
  },

  /**
   * Get attendance trends for the week
   */
  async getAttendanceTrends(schoolId, startDate, endDate) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          DATE(a.date) as date,
          COUNT(*) as total,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN classes c ON s.class_id = c.id
        WHERE c.school_id = $1
        AND a.date BETWEEN $2 AND $3
        GROUP BY DATE(a.date)
        ORDER BY date
      `, [schoolId, startDate, endDate]);
      return res.rows;
    }

    return db.prepare(`
      SELECT 
        DATE(a.date) as date,
        COUNT(*) as total,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE c.school_id = ?
      AND a.date BETWEEN ? AND ?
      GROUP BY DATE(a.date)
      ORDER BY date
    `).all(schoolId, startDate, endDate);
  },
};

