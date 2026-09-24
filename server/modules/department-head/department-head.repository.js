/**
 * Department Head Module Repository
 * G33: Database queries with department_id scoping for domain isolation.
 */

import { isPostgresConfigured, pgQuery } from '../../shared/database/index.js';
import { db } from '../../db.js';

export const departmentHeadRepository = {
  // =========================================================================
  // 1. DEPARTMENT HEAD IDENTITY
  // =========================================================================

  /**
   * Get department for the head teacher.
   * If user is not a department head, returns null.
   */
  async getMyDepartment(schoolId, teacherId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT d.*, u.name as head_teacher_name
        FROM departments d
        LEFT JOIN users u ON d.head_teacher_id = u.id
        WHERE d.head_teacher_id = $1 AND d.school_id = $2
      `, [teacherId, schoolId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT d.*, u.name as head_teacher_name
      FROM departments d
      LEFT JOIN users u ON d.head_teacher_id = u.id
      WHERE d.head_teacher_id = ? AND d.school_id = ?
    `).get(teacherId, schoolId) || null;
  },

  /**
   * Check if user is department head for a specific department.
   */
  async isDepartmentHead(schoolId, teacherId, departmentId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 1 FROM departments
        WHERE id = $1 AND head_teacher_id = $2 AND school_id = $3
      `, [departmentId, teacherId, schoolId]);
      return res.rowCount > 0;
    }

    const row = db.prepare(`
      SELECT 1 FROM departments
      WHERE id = ? AND head_teacher_id = ? AND school_id = ?
    `).get(departmentId, teacherId, schoolId);
    return !!row;
  },

  // =========================================================================
  // 2. DEPARTMENT TEACHERS (DOMAIN-SCOPED)
  // =========================================================================

  /**
   * List all teachers in the department (including the head teacher).
   */
  async findDepartmentTeachers(departmentId, schoolId, query = {}) {
    const { page = 1, limit = 20, search, status = 'active' } = query;
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      let sql = `
        SELECT t.*, u.name, u.email, u.phone, u.code as user_code, u.avatar,
               u.status as user_status,
               (SELECT COUNT(*) FROM teacher_assignments ta WHERE ta.teacher_id = t.id AND ta.school_id = $1) as assignment_count,
               (SELECT COUNT(*) FROM teacher_assignments ta WHERE ta.teacher_id = t.id AND ta.school_id = $1 AND ta.status = 'active') as active_assignment_count
        FROM teachers t
        JOIN users u ON t.user_id = u.id
        WHERE t.department_id = $1 AND t.school_id = $2
      `;
      const params = [departmentId, schoolId];
      const paramCount = 2;

      if (status && status !== 'all') {
        params.push(status === 'active' ? 'active' : 'inactive');
        sql += ` AND u.status = $${paramCount + 1}`;
      }

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        sql += ` AND LOWER(u.name) LIKE $${params.length}`;
      }

      // Get total count
      const countSql = sql.replace(
        /SELECT t\.\*.*?FROM/,
        'SELECT COUNT(*) as total FROM'
      ).replace(/,.*?assignment_count.*?$/m, '');

      const countRes = await pgQuery(countSql, params.slice(0, -1));
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      // Add pagination
      params.push(limit, offset);
      sql += ` ORDER BY u.name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const res = await pgQuery(sql, params);

      return {
        data: res.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    let sql = `
      SELECT t.*, u.name, u.email, u.phone, u.code as user_code, u.avatar,
             u.status as user_status,
             (SELECT COUNT(*) FROM teacher_assignments ta WHERE ta.teacher_id = t.id AND ta.school_id = ?) as assignment_count,
             (SELECT COUNT(*) FROM teacher_assignments ta WHERE ta.teacher_id = t.id AND ta.school_id = ? AND ta.status = 'active') as active_assignment_count
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE t.department_id = ? AND t.school_id = ?
    `;
    const params = [schoolId, schoolId, departmentId, schoolId];

    if (status && status !== 'all') {
      params.push(status === 'active' ? 'active' : 'inactive');
      sql += ` AND u.status = ?`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND LOWER(u.name) LIKE ?`;
    }

    // Count total
    const countSql = sql.replace(
      /SELECT t\.\*.*?FROM/,
      'SELECT COUNT(*) as total FROM'
    ).replace(/,.*?assignment_count.*?$/m, '');
    const total = db.prepare(countSql).get(...params.slice(2)).total || 0;

    sql += ` ORDER BY u.name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return {
      data: db.prepare(sql).all(...params),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // =========================================================================
  // 3. DEPARTMENT SUBJECTS (DOMAIN-SCOPED)
  // =========================================================================

  /**
   * List all subjects in the department.
   */
  async findDepartmentSubjects(departmentId, schoolId, query = {}) {
    const { page = 1, limit = 20, gradeLevel, search, status = 'active' } = query;
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      let sql = `
        SELECT s.*,
               (SELECT COUNT(*) FROM teacher_assignments ta WHERE ta.subject_id = s.id AND ta.school_id = $1) as assignment_count,
               d.name as department_name
        FROM subjects s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.department_id = $1 AND (s.school_id = $2 OR s.school_id IS NULL)
      `;
      const params = [departmentId, schoolId];

      if (status && status !== 'all') {
        params.push(status);
        sql += ` AND s.status = $${params.length}`;
      }

      if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
        params.push(Number(gradeLevel));
        sql += ` AND s.grade_level = $${params.length}`;
      }

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        sql += ` AND (LOWER(s.name) LIKE $${params.length} OR LOWER(s.code) LIKE $${params.length})`;
      }

      // Count
      const countSql = sql.replace(
        /SELECT s\.\*.*?FROM/,
        'SELECT COUNT(*) as total FROM'
      ).replace(/,.*?assignment_count.*?$/m, '');
      const countRes = await pgQuery(countSql, params);
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      params.push(limit, offset);
      sql += ` ORDER BY s.name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const res = await pgQuery(sql, params);

      return {
        data: res.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }

    let sql = `
      SELECT s.*,
             (SELECT COUNT(*) FROM teacher_assignments ta WHERE ta.subject_id = s.id AND ta.school_id = ?) as assignment_count,
             d.name as department_name
      FROM subjects s
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE s.department_id = ? AND (s.school_id = ? OR s.school_id IS NULL)
    `;
    const params = [schoolId, departmentId, schoolId];

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND s.status = ?`;
    }

    if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
      params.push(Number(gradeLevel));
      sql += ` AND s.grade_level = ?`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(s.name) LIKE ? OR LOWER(s.code) LIKE ?)`;
    }

    const countSql = sql.replace(
      /SELECT s\.\*.*?FROM/,
      'SELECT COUNT(*) as total FROM'
    ).replace(/,.*?assignment_count.*?$/m, '');
    const total = db.prepare(countSql).get(...params.slice(0, params.length - 2)).total || 0;

    sql += ` ORDER BY s.name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return {
      data: db.prepare(sql).all(...params),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  // =========================================================================
  // 4. DEPARTMENT CLASSES (via teacher assignments)
  // =========================================================================

  /**
   * List classes where department's subjects are taught.
   */
  async findDepartmentClasses(departmentId, schoolId, query = {}) {
    const { page = 1, limit = 20, academicYearId, gradeLevel, search } = query;
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      let sql = `
        SELECT DISTINCT c.*,
               ay.name as academic_year_name,
               u.name as homeroom_teacher_name,
               (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.is_current = TRUE AND ce.status = 'enrolled') as student_count,
               (SELECT COUNT(DISTINCT ta.subject_id)
                FROM teacher_assignments ta
                JOIN subjects s ON ta.subject_id = s.id
                WHERE ta.class_id = c.id AND s.department_id = $1 AND ta.school_id = $2) as subject_count
        FROM classes c
        LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
        LEFT JOIN users u ON c.homeroom_teacher_id = u.id
        WHERE c.school_id = $2
          AND c.id IN (
            SELECT DISTINCT ta.class_id
            FROM teacher_assignments ta
            JOIN subjects s ON ta.subject_id = s.id
            WHERE s.department_id = $1 AND ta.school_id = $2
          )
      `;
      const params = [departmentId, schoolId];

      if (academicYearId) {
        params.push(academicYearId);
        sql += ` AND c.academic_year_id = $${params.length}`;
      }

      if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
        params.push(Number(gradeLevel));
        sql += ` AND c.grade_level = $${params.length}`;
      }

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        sql += ` AND (LOWER(c.name) LIKE $${params.length} OR LOWER(COALESCE(c.room, '')) LIKE $${params.length})`;
      }

      const countRes = await pgQuery(
        sql.replace(/SELECT DISTINCT c\.\*.*?FROM/, 'SELECT COUNT(DISTINCT c.id) as total FROM').replace(/ORDER BY.*$/, ''),
        params
      );
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      sql += ` ORDER BY c.grade_level ASC, c.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const res = await pgQuery(sql, params);

      return {
        data: res.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }

    let sql = `
      SELECT DISTINCT c.*,
             ay.name as academic_year_name,
             u.name as homeroom_teacher_name,
             (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.is_current = 1 AND ce.status = 'enrolled') as student_count
      FROM classes c
      LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
      LEFT JOIN users u ON c.homeroom_teacher_id = u.id
      WHERE c.school_id = ? AND c.id IN (
        SELECT DISTINCT ta.class_id
        FROM teacher_assignments ta
        JOIN subjects s ON ta.subject_id = s.id
        WHERE s.department_id = ? AND ta.school_id = ?
      )
    `;
    const params = [schoolId, departmentId, schoolId];

    if (academicYearId) {
      params.push(academicYearId);
      sql += ` AND c.academic_year_id = ?`;
    }

    if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
      params.push(Number(gradeLevel));
      sql += ` AND c.grade_level = ?`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND LOWER(c.name) LIKE ?`;
    }

    const total = db.prepare(sql.replace(/SELECT DISTINCT c\.\*.*?FROM/, 'SELECT COUNT(DISTINCT c.id) as total FROM')).get(...params).total || 0;

    sql += ` ORDER BY c.grade_level ASC, c.name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return {
      data: db.prepare(sql).all(...params),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  // =========================================================================
  // 5. CLASS/SUBJECT PERFORMANCE (GRADES)
  // =========================================================================

  /**
   * Get performance stats for department's subjects across classes.
   * Aggregates grades by subject and class.
   */
  async getDepartmentPerformance(departmentId, schoolId, query = {}) {
    const { academicYearId, semesterId, period } = query;

    // Build date range based on period
    let dateFilter = '';
    const params = [departmentId, schoolId];

    if (period === 'this_month') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      params.push(startOfMonth, endOfMonth);
      dateFilter = `AND g.created_at BETWEEN $${params.length - 1} AND $${params.length}`;
    } else if (semesterId) {
      params.push(semesterId);
      dateFilter = `AND g.semester_id = $${params.length}`;
    } else if (academicYearId) {
      params.push(academicYearId);
      dateFilter = `AND g.academic_year_id = $${params.length}`;
    }

    if (isPostgresConfigured()) {
      // Performance by subject
      const subjectPerfSql = `
        SELECT s.id as subject_id, s.name as subject_name, s.code as subject_code,
               COUNT(DISTINCT g.student_id) as student_count,
               AVG(g.score) as avg_score,
               MIN(g.score) as min_score,
               MAX(g.score) as max_score,
               COUNT(g.id) as total_grades,
               ROUND(AVG(CASE WHEN g.score >= (g.max_score * 0.9) THEN 1 ELSE 0 END)::numeric * 100, 1) as excellent_rate,
               ROUND(AVG(CASE WHEN g.score < (g.max_score * 0.5) THEN 1 ELSE 0 END)::numeric * 100, 1) as poor_rate
        FROM subjects s
        LEFT JOIN grades g ON g.subject_id = s.id AND g.school_id = $2 ${dateFilter}
        WHERE s.department_id = $1 AND (s.school_id = $2 OR s.school_id IS NULL)
        GROUP BY s.id, s.name, s.code
        ORDER BY s.name ASC
      `;

      // Performance by class
      const classPerfSql = `
        SELECT c.id as class_id, c.name as class_name, c.grade_level,
               COUNT(DISTINCT g.student_id) as student_count,
               AVG(g.score) as avg_score,
               COUNT(g.id) as total_grades,
               ROUND(AVG(CASE WHEN g.score >= (g.max_score * 0.9) THEN 1 ELSE 0 END)::numeric * 100, 1) as excellent_rate
        FROM classes c
        LEFT JOIN grades g ON g.class_id = c.id AND g.school_id = $2 ${dateFilter}
        WHERE c.id IN (
          SELECT DISTINCT ta.class_id
          FROM teacher_assignments ta
          JOIN subjects s ON ta.subject_id = s.id
          WHERE s.department_id = $1 AND ta.school_id = $2
        ) AND c.school_id = $2
        GROUP BY c.id, c.name, c.grade_level
        ORDER BY c.grade_level ASC, c.name ASC
      `;

      const [subjectRes, classRes] = await Promise.all([
        pgQuery(subjectPerfSql, params),
        pgQuery(classPerfSql, params),
      ]);

      return {
        bySubject: subjectRes.rows.map(r => ({
          ...r,
          avg_score: parseFloat(r.avg_score) || 0,
          student_count: parseInt(r.student_count || '0', 10),
          total_grades: parseInt(r.total_grades || '0', 10),
        })),
        byClass: classRes.rows.map(r => ({
          ...r,
          avg_score: parseFloat(r.avg_score) || 0,
          student_count: parseInt(r.student_count || '0', 10),
          total_grades: parseInt(r.total_grades || '0', 10),
        })),
      };
    }

    // SQLite fallback
    const subjectPerfSql = `
      SELECT s.id as subject_id, s.name as subject_name, s.code as subject_code,
             COUNT(DISTINCT g.student_id) as student_count,
             AVG(g.score) as avg_score,
             COUNT(g.id) as total_grades
      FROM subjects s
      LEFT JOIN grades g ON g.subject_id = s.id AND g.school_id = ?
      WHERE s.department_id = ? AND (s.school_id = ? OR s.school_id IS NULL)
      GROUP BY s.id, s.name, s.code
      ORDER BY s.name ASC
    `;

    const classPerfSql = `
      SELECT c.id as class_id, c.name as class_name, c.grade_level,
             COUNT(DISTINCT g.student_id) as student_count,
             AVG(g.score) as avg_score,
             COUNT(g.id) as total_grades
      FROM classes c
      LEFT JOIN grades g ON g.class_id = c.id AND g.school_id = ?
      WHERE c.id IN (
        SELECT DISTINCT ta.class_id
        FROM teacher_assignments ta
        JOIN subjects s ON ta.subject_id = s.id
        WHERE s.department_id = ? AND ta.school_id = ?
      ) AND c.school_id = ?
      GROUP BY c.id, c.name, c.grade_level
      ORDER BY c.grade_level ASC, c.name ASC
    `;

    return {
      bySubject: db.prepare(subjectPerfSql).all(schoolId, departmentId, schoolId).map(r => ({
        ...r,
        avg_score: parseFloat(r.avg_score) || 0,
        student_count: parseInt(r.student_count || '0', 10),
        total_grades: parseInt(r.total_grades || '0', 10),
      })),
      byClass: db.prepare(classPerfSql).all(schoolId, departmentId, schoolId, schoolId).map(r => ({
        ...r,
        avg_score: parseFloat(r.avg_score) || 0,
        student_count: parseInt(r.student_count || '0', 10),
        total_grades: parseInt(r.total_grades || '0', 10),
      })),
    };
  },

  // =========================================================================
  // 6. DEPARTMENT ASSIGNMENTS (VISIBILITY)
  // =========================================================================

  /**
   * List assignments for department's subjects.
   */
  async findDepartmentAssignments(departmentId, schoolId, query = {}) {
    const { page = 1, limit = 20, classId, subjectId, status = 'all', search } = query;
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      let sql = `
        SELECT a.*,
               s.name as subject_name, s.code as subject_code,
               c.name as class_name, c.grade_level,
               u.name as created_by_name,
               (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id) as submission_count,
               (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id AND sub.status = 'submitted') as submitted_count
        FROM assignments a
        JOIN subjects s ON a.subject_id = s.id
        JOIN classes c ON a.class_id = c.id
        LEFT JOIN users u ON a.created_by = u.id
        WHERE s.department_id = $1 AND a.school_id = $2
      `;
      const params = [departmentId, schoolId];

      if (status && status !== 'all') {
        params.push(status);
        sql += ` AND a.status = $${params.length}`;
      }

      if (classId) {
        params.push(classId);
        sql += ` AND a.class_id = $${params.length}`;
      }

      if (subjectId) {
        params.push(subjectId);
        sql += ` AND a.subject_id = $${params.length}`;
      }

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        sql += ` AND LOWER(a.title) LIKE $${params.length}`;
      }

      const countRes = await pgQuery(
        sql.replace(/SELECT a\.\*.*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/,.*?submission_count.*?$/m, ''),
        params
      );
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      params.push(limit, offset);
      sql += ` ORDER BY a.due_date DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const res = await pgQuery(sql, params);

      return {
        data: res.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }

    let sql = `
      SELECT a.*,
             s.name as subject_name, s.code as subject_code,
             c.name as class_name, c.grade_level,
             u.name as created_by_name,
             (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id) as submission_count
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE s.department_id = ? AND a.school_id = ?
    `;
    const params = [departmentId, schoolId];

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND a.status = ?`;
    }

    if (classId) {
      params.push(classId);
      sql += ` AND a.class_id = ?`;
    }

    if (subjectId) {
      params.push(subjectId);
      sql += ` AND a.subject_id = ?`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND LOWER(a.title) LIKE ?`;
    }

    const total = db.prepare(sql.replace(/SELECT a\.\*.*?FROM/, 'SELECT COUNT(*) as total FROM').replace(/,.*?submission_count.*?$/m, '')).get(...params).total || 0;

    sql += ` ORDER BY a.due_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return {
      data: db.prepare(sql).all(...params),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  // =========================================================================
  // 7. DEPARTMENT STUDENTS (domain-scoped)
  // =========================================================================

  /**
   * List students in department's classes.
   */
  async findDepartmentStudents(departmentId, schoolId, query = {}) {
    const { page = 1, limit = 20, classId, gradeLevel, search } = query;
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      let sql = `
        SELECT DISTINCT st.id as student_id, u.name, u.email, u.code as student_code,
               s.gpa, s.attendance_rate, st.enrollment_status,
               c.id as class_id, c.name as class_name, c.grade_level,
               ce.enrollment_date
        FROM students st
        JOIN users u ON st.user_id = u.id
        JOIN class_enrollments ce ON ce.student_id = st.id AND ce.is_current = TRUE AND ce.status = 'enrolled'
        JOIN classes c ON ce.class_id = c.id
        WHERE c.school_id = $1
          AND c.id IN (
            SELECT DISTINCT ta.class_id
            FROM teacher_assignments ta
            JOIN subjects s ON ta.subject_id = s.id
            WHERE s.department_id = $2 AND ta.school_id = $1
          )
      `;
      const params = [schoolId, departmentId];

      if (classId) {
        params.push(classId);
        sql += ` AND c.id = $${params.length}`;
      }

      if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
        params.push(Number(gradeLevel));
        sql += ` AND c.grade_level = $${params.length}`;
      }

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        sql += ` AND LOWER(u.name) LIKE $${params.length}`;
      }

      const countRes = await pgQuery(
        sql.replace(/SELECT DISTINCT st\..*?FROM/, 'SELECT COUNT(DISTINCT st.id) as total FROM'),
        params
      );
      const total = parseInt(countRes.rows[0]?.total || '0', 10);

      params.push(limit, offset);
      sql += ` ORDER BY c.grade_level ASC, c.name ASC, u.name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const res = await pgQuery(sql, params);

      return {
        data: res.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }

    let sql = `
      SELECT DISTINCT st.id as student_id, u.name, u.email, u.code as student_code,
             s.gpa, s.attendance_rate, st.enrollment_status,
             c.id as class_id, c.name as class_name, c.grade_level,
             ce.enrollment_date
      FROM students st
      JOIN users u ON st.user_id = u.id
      JOIN class_enrollments ce ON ce.student_id = st.id AND ce.is_current = 1 AND ce.status = 'enrolled'
      JOIN classes c ON ce.class_id = c.id
      WHERE c.school_id = ? AND c.id IN (
        SELECT DISTINCT ta.class_id
        FROM teacher_assignments ta
        JOIN subjects s ON ta.subject_id = s.id
        WHERE s.department_id = ? AND ta.school_id = ?
      )
    `;
    const params = [schoolId, departmentId, schoolId];

    if (classId) {
      params.push(classId);
      sql += ` AND c.id = ?`;
    }

    if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
      params.push(Number(gradeLevel));
      sql += ` AND c.grade_level = ?`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND LOWER(u.name) LIKE ?`;
    }

    const total = db.prepare(sql.replace(/SELECT DISTINCT st\..*?FROM/, 'SELECT COUNT(DISTINCT st.id) as total FROM')).get(...params).total || 0;

    sql += ` ORDER BY c.grade_level ASC, c.name ASC, u.name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return {
      data: db.prepare(sql).all(...params),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  // =========================================================================
  // 8. DEPARTMENT OVERVIEW (Dashboard)
  // =========================================================================

  /**
   * Get department overview for dashboard.
   */
  async getDepartmentOverview(departmentId, schoolId) {
    if (isPostgresConfigured()) {
      const [
        teacherRes,
        subjectRes,
        classRes,
        studentRes,
        assignmentRes,
        attendanceRes,
      ] = await Promise.all([
        pgQuery(`SELECT COUNT(*) as count FROM teachers WHERE department_id = $1 AND school_id = $2`, [departmentId, schoolId]),
        pgQuery(`SELECT COUNT(*) as count FROM subjects WHERE department_id = $1 AND (school_id = $2 OR school_id IS NULL)`, [departmentId, schoolId]),
        pgQuery(`
          SELECT COUNT(DISTINCT c.id) as count
          FROM classes c
          WHERE c.id IN (
            SELECT DISTINCT ta.class_id FROM teacher_assignments ta
            JOIN subjects s ON ta.subject_id = s.id
            WHERE s.department_id = $1 AND ta.school_id = $2
          ) AND c.school_id = $2
        `, [departmentId, schoolId]),
        pgQuery(`
          SELECT COUNT(DISTINCT st.id) as count
          FROM students st
          JOIN class_enrollments ce ON ce.student_id = st.id AND ce.is_current = TRUE AND ce.status = 'enrolled'
          JOIN classes c ON ce.class_id = c.id
          WHERE c.id IN (
            SELECT DISTINCT ta.class_id FROM teacher_assignments ta
            JOIN subjects s ON ta.subject_id = s.id
            WHERE s.department_id = $1 AND ta.school_id = $2
          ) AND c.school_id = $2
        `, [departmentId, schoolId]),
        pgQuery(`
          SELECT COUNT(*) as count FROM assignments a
          JOIN subjects s ON a.subject_id = s.id
          WHERE s.department_id = $1 AND a.school_id = $2 AND a.status = 'published'
        `, [departmentId, schoolId]),
        pgQuery(`
          SELECT ROUND(AVG(atr.rate)::numeric, 1) as avg_rate
          FROM attendance_records atr
          JOIN subjects s ON atr.subject_id = s.id
          WHERE s.department_id = $1 AND atr.school_id = $2
        `, [departmentId, schoolId]),
      ]);

      return {
        teacherCount: parseInt(teacherRes.rows[0]?.count || '0', 10),
        subjectCount: parseInt(subjectRes.rows[0]?.count || '0', 10),
        classCount: parseInt(classRes.rows[0]?.count || '0', 10),
        studentCount: parseInt(studentRes.rows[0]?.count || '0', 10),
        activeAssignmentCount: parseInt(assignmentRes.rows[0]?.count || '0', 10),
        attendanceRate: parseFloat(attendanceRes.rows[0]?.avg_rate || '0') || 0,
      };
    }

    return {
      teacherCount: db.prepare(`SELECT COUNT(*) as count FROM teachers WHERE department_id = ? AND school_id = ?`).get(departmentId, schoolId)?.count || 0,
      subjectCount: db.prepare(`SELECT COUNT(*) as count FROM subjects WHERE department_id = ? AND (school_id = ? OR school_id IS NULL)`).get(departmentId, schoolId)?.count || 0,
      classCount: 0,
      studentCount: 0,
      activeAssignmentCount: 0,
      attendanceRate: 0,
    };
  },

  // =========================================================================
  // 9. UPDATE DEPARTMENT HEAD
  // =========================================================================

  async updateDepartment(departmentId, schoolId, data) {
    const { headTeacherId, description } = data;

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        UPDATE departments
        SET head_teacher_id = CASE WHEN $1::text IS NOT NULL THEN $1 ELSE head_teacher_id END,
            description = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE description END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND school_id = $4
        RETURNING *
      `, [
        headTeacherId !== undefined ? headTeacherId : null,
        description !== undefined ? description : null,
        departmentId,
        schoolId,
      ]);
      return res.rows[0] || null;
    }

    db.prepare(`
      UPDATE departments
      SET head_teacher_id = CASE WHEN ? IS NOT NULL THEN ? ELSE head_teacher_id END,
          description = CASE WHEN ? IS NOT NULL THEN ? ELSE description END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND school_id = ?
    `).run(
      headTeacherId !== undefined ? headTeacherId : null,
      headTeacherId !== undefined ? headTeacherId : null,
      description !== undefined ? description : null,
      description !== undefined ? description : null,
      departmentId,
      schoolId,
    );

    return this.findDepartmentById(departmentId, schoolId);
  },

  async findDepartmentById(id, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT d.*, u.name as head_teacher_name
        FROM departments d
        LEFT JOIN users u ON d.head_teacher_id = u.id
        WHERE d.id = $1 AND d.school_id = $2
      `, [id, schoolId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT d.*, u.name as head_teacher_name
      FROM departments d
      LEFT JOIN users u ON d.head_teacher_id = u.id
      WHERE d.id = ? AND d.school_id = ?
    `).get(id, schoolId) || null;
  },
};
