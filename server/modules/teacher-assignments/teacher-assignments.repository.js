import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';

export const teacherAssignmentsRepository = {
  /**
   * Find teacher assignments with filters, pagination, and full relational details.
   */
  async findAssignments({
    schoolId = null,
    teacherId = null,
    classId = null,
    subjectId = null,
    academicYearId = null,
    semesterId = null,
    departmentId = null,
    role = 'all',
    status = 'all',
    search = '',
    page = 1,
    limit = 50,
  }) {
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      let conditions = ['1=1'];
      let params = [];
      let idx = 1;

      if (schoolId) {
        conditions.push(`(ta.school_id = $${idx} OR ta.school_id IS NULL)`);
        params.push(schoolId);
        idx++;
      }

      if (teacherId) {
        conditions.push(`(ta.teacher_id = $${idx} OR t.id = $${idx})`);
        params.push(teacherId);
        idx++;
      }

      if (classId) {
        conditions.push(`ta.class_id = $${idx}`);
        params.push(classId);
        idx++;
      }

      if (subjectId) {
        conditions.push(`ta.subject_id = $${idx}`);
        params.push(subjectId);
        idx++;
      }

      if (academicYearId) {
        conditions.push(`ta.academic_year_id = $${idx}`);
        params.push(academicYearId);
        idx++;
      }

      if (semesterId) {
        conditions.push(`ta.semester_id = $${idx}`);
        params.push(semesterId);
        idx++;
      }

      if (departmentId) {
        conditions.push(`(t.department_id = $${idx} OR s.department_id = $${idx})`);
        params.push(departmentId);
        idx++;
      }

      if (role && role !== 'all') {
        conditions.push(`ta.role = $${idx}`);
        params.push(role);
        idx++;
      }

      if (status && status !== 'all') {
        conditions.push(`ta.status = $${idx}`);
        params.push(status);
        idx++;
      }

      if (search && search.trim()) {
        const pattern = `%${search.trim().toLowerCase()}%`;
        conditions.push(`(
          LOWER(u.name) LIKE $${idx}
          OR LOWER(COALESCE(u.code, '')) LIKE $${idx}
          OR LOWER(COALESCE(t.employee_id, '')) LIKE $${idx}
          OR LOWER(s.name) LIKE $${idx}
          OR LOWER(s.code) LIKE $${idx}
          OR LOWER(c.name) LIKE $${idx}
        )`);
        params.push(pattern);
        idx++;
      }

      const whereClause = conditions.join(' AND ');

      const countSql = `
        SELECT COUNT(*) as count
        FROM teacher_assignments ta
        JOIN users u ON ta.teacher_id = u.id
        LEFT JOIN teachers t ON t.user_id = u.id
        JOIN classes c ON ta.class_id = c.id
        JOIN subjects s ON ta.subject_id = s.id
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE ${whereClause}
      `;

      const dataSql = `
        SELECT ta.*,
               u.name as teacher_name, u.email as teacher_email, u.code as teacher_code, u.phone as teacher_phone,
               t.id as teacher_profile_id, t.employee_id, t.department_id,
               d.name as department_name,
               c.name as class_name, c.grade_level, c.room as class_room,
               s.name as subject_name, s.code as subject_code,
               ay.name as academic_year_name,
               sem.name as semester_name
        FROM teacher_assignments ta
        JOIN users u ON ta.teacher_id = u.id
        LEFT JOIN teachers t ON t.user_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        JOIN classes c ON ta.class_id = c.id
        JOIN subjects s ON ta.subject_id = s.id
        LEFT JOIN academic_years ay ON ta.academic_year_id = ay.id
        LEFT JOIN semesters sem ON ta.semester_id = sem.id
        WHERE ${whereClause}
        ORDER BY c.grade_level ASC, c.name ASC, s.name ASC, ta.role ASC
        LIMIT $${idx} OFFSET $${idx + 1}
      `;

      const [countRes, dataRes] = await Promise.all([
        pgQuery(countSql, params),
        pgQuery(dataSql, [...params, limit, offset]),
      ]);

      const total = parseInt(countRes.rows[0]?.count || 0, 10);
      return {
        assignments: dataRes.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    // SQLite fallback
    let conditions = ['1=1'];
    let params = [];

    if (schoolId) {
      conditions.push('(ta.school_id = ? OR ta.school_id IS NULL)');
      params.push(schoolId);
    }

    if (teacherId) {
      conditions.push('(ta.teacher_id = ? OR t.id = ?)');
      params.push(teacherId, teacherId);
    }

    if (classId) {
      conditions.push('ta.class_id = ?');
      params.push(classId);
    }

    if (subjectId) {
      conditions.push('ta.subject_id = ?');
      params.push(subjectId);
    }

    if (academicYearId) {
      conditions.push('ta.academic_year_id = ?');
      params.push(academicYearId);
    }

    if (semesterId) {
      conditions.push('ta.semester_id = ?');
      params.push(semesterId);
    }

    if (departmentId) {
      conditions.push('(t.department_id = ? OR s.department_id = ?)');
      params.push(departmentId, departmentId);
    }

    if (role && role !== 'all') {
      conditions.push('ta.role = ?');
      params.push(role);
    }

    if (status && status !== 'all') {
      conditions.push('ta.status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      const pattern = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(u.name) LIKE ?
        OR LOWER(COALESCE(u.code, '')) LIKE ?
        OR LOWER(COALESCE(t.employee_id, '')) LIKE ?
        OR LOWER(s.name) LIKE ?
        OR LOWER(s.code) LIKE ?
        OR LOWER(c.name) LIKE ?
      )`);
      params.push(pattern, pattern, pattern, pattern, pattern, pattern);
    }

    const whereClause = conditions.join(' AND ');

    const countRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM teacher_assignments ta
      JOIN users u ON ta.teacher_id = u.id
      LEFT JOIN teachers t ON t.user_id = u.id
      JOIN classes c ON ta.class_id = c.id
      JOIN subjects s ON ta.subject_id = s.id
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE ${whereClause}
    `).get(...params);

    const total = countRow?.count || 0;

    const assignments = db.prepare(`
      SELECT ta.*,
             u.name as teacher_name, u.email as teacher_email, u.code as teacher_code, u.phone as teacher_phone,
             t.id as teacher_profile_id, t.employee_id, t.department_id,
             d.name as department_name,
             c.name as class_name, c.grade_level, c.room as class_room,
             s.name as subject_name, s.code as subject_code,
             ay.name as academic_year_name,
             sem.name as semester_name
      FROM teacher_assignments ta
      JOIN users u ON ta.teacher_id = u.id
      LEFT JOIN teachers t ON t.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      JOIN classes c ON ta.class_id = c.id
      JOIN subjects s ON ta.subject_id = s.id
      LEFT JOIN academic_years ay ON ta.academic_year_id = ay.id
      LEFT JOIN semesters sem ON ta.semester_id = sem.id
      WHERE ${whereClause}
      ORDER BY c.grade_level ASC, c.name ASC, s.name ASC, ta.role ASC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      assignments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  /**
   * Find semester by ID.
   */
  async findSemesterById(semesterId) {
    if (!semesterId) return null;
    if (isPostgresConfigured()) {
      const res = await pgQuery('SELECT * FROM semesters WHERE id = $1', [semesterId]);
      return res.rows[0] || null;
    }
    return db.prepare('SELECT * FROM semesters WHERE id = ?').get(semesterId) || null;
  },

  /**
   * Find assignment by ID.
   */
  async findAssignmentById(id, schoolId = null, client = null) {
    if (isPostgresConfigured()) {
      const runner = client || { query: (q, p) => pgQuery(q, p) };
      const res = await runner.query(`
        SELECT ta.*,
               u.name as teacher_name, u.email as teacher_email, u.code as teacher_code,
               t.id as teacher_profile_id, t.employee_id, t.department_id,
               d.name as department_name,
               c.name as class_name, c.grade_level, c.room as class_room,
               s.name as subject_name, s.code as subject_code,
               ay.name as academic_year_name,
               sem.name as semester_name
        FROM teacher_assignments ta
        JOIN users u ON ta.teacher_id = u.id
        LEFT JOIN teachers t ON t.user_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        JOIN classes c ON ta.class_id = c.id
        JOIN subjects s ON ta.subject_id = s.id
        LEFT JOIN academic_years ay ON ta.academic_year_id = ay.id
        LEFT JOIN semesters sem ON ta.semester_id = sem.id
        WHERE ta.id = $1
          AND ($2::text IS NULL OR ta.school_id = $2 OR ta.school_id IS NULL)
      `, [id, schoolId || null]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT ta.*,
             u.name as teacher_name, u.email as teacher_email, u.code as teacher_code,
             t.id as teacher_profile_id, t.employee_id, t.department_id,
             d.name as department_name,
             c.name as class_name, c.grade_level, c.room as class_room,
             s.name as subject_name, s.code as subject_code,
             ay.name as academic_year_name,
             sem.name as semester_name
      FROM teacher_assignments ta
      JOIN users u ON ta.teacher_id = u.id
      LEFT JOIN teachers t ON t.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      JOIN classes c ON ta.class_id = c.id
      JOIN subjects s ON ta.subject_id = s.id
      LEFT JOIN academic_years ay ON ta.academic_year_id = ay.id
      LEFT JOIN semesters sem ON ta.semester_id = sem.id
      WHERE ta.id = ?
        AND (? IS NULL OR ta.school_id = ? OR ta.school_id IS NULL)
    `).get(id, schoolId || null, schoolId || null) || null;
  },

  /**
   * Find all classes where teacher is homeroom teacher OR has an active assignment.
   */
  async findTeacherAssignedClasses(teacherUserId, { schoolId = null, academicYearId = null } = {}) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        WITH teacher_classes AS (
          -- Classes where teacher is assigned to teach
          SELECT DISTINCT c.id as class_id, FALSE as is_homeroom
          FROM teacher_assignments ta
          JOIN classes c ON ta.class_id = c.id
          WHERE (ta.teacher_id = $1 OR ta.teacher_id IN (SELECT user_id FROM teachers WHERE id = $1))
            AND ta.status = 'active'
            AND ($2::text IS NULL OR ta.school_id = $2 OR ta.school_id IS NULL)
            AND ($3::text IS NULL OR ta.academic_year_id = $3)
          UNION
          -- Classes where teacher is homeroom teacher
          SELECT DISTINCT c.id as class_id, TRUE as is_homeroom
          FROM classes c
          WHERE (c.homeroom_teacher_id = $1 OR c.homeroom_teacher_id IN (SELECT user_id FROM teachers WHERE id = $1))
            AND ($2::text IS NULL OR c.school_id = $2 OR c.school_id IS NULL)
            AND ($3::text IS NULL OR c.academic_year_id = $3)
        )
        SELECT c.id, c.name, c.grade_level, c.room, c.academic_year, c.academic_year_id,
               tc.is_homeroom,
               (
                 SELECT COUNT(*)
                 FROM class_enrollments ce
                 WHERE ce.class_id = c.id AND ce.is_current = TRUE AND ce.status = 'enrolled'
               ) as student_count,
               COALESCE(
                 (
                   SELECT json_agg(json_build_object(
                     'assignmentId', ta.id,
                     'subjectId', s.id,
                     'subjectName', s.name,
                     'subjectCode', s.code,
                     'role', ta.role,
                     'semesterId', ta.semester_id
                   ))
                   FROM teacher_assignments ta
                   JOIN subjects s ON ta.subject_id = s.id
                   WHERE ta.class_id = c.id
                     AND (ta.teacher_id = $1 OR ta.teacher_id IN (SELECT user_id FROM teachers WHERE id = $1))
                     AND ta.status = 'active'
                 ), '[]'::json
               ) as teaching_subjects
        FROM teacher_classes tc
        JOIN classes c ON tc.class_id = c.id
        ORDER BY tc.is_homeroom DESC, c.grade_level ASC, c.name ASC
      `, [teacherUserId, schoolId || null, academicYearId || null]);

      return res.rows;
    }

    // SQLite fallback
    const classes = db.prepare(`
      WITH teacher_classes AS (
        SELECT DISTINCT c.id as class_id, 0 as is_homeroom
        FROM teacher_assignments ta
        JOIN classes c ON ta.class_id = c.id
        WHERE (ta.teacher_id = ? OR ta.teacher_id IN (SELECT user_id FROM teachers WHERE id = ?))
          AND ta.status = 'active'
          AND (? IS NULL OR ta.school_id = ? OR ta.school_id IS NULL)
          AND (? IS NULL OR ta.academic_year_id = ?)
        UNION
        SELECT DISTINCT c.id as class_id, 1 as is_homeroom
        FROM classes c
        WHERE (c.homeroom_teacher_id = ? OR c.homeroom_teacher_id IN (SELECT user_id FROM teachers WHERE id = ?))
          AND (? IS NULL OR c.school_id = ? OR c.school_id IS NULL)
          AND (? IS NULL OR c.academic_year_id = ?)
      )
      SELECT c.id, c.name, c.grade_level, c.room, c.academic_year, c.academic_year_id,
             tc.is_homeroom,
             (
               SELECT COUNT(*)
               FROM class_enrollments ce
               WHERE ce.class_id = c.id AND ce.is_current = 1 AND ce.status = 'enrolled'
             ) as student_count
      FROM teacher_classes tc
      JOIN classes c ON tc.class_id = c.id
      ORDER BY tc.is_homeroom DESC, c.grade_level ASC, c.name ASC
    `).all(
      teacherUserId, teacherUserId, schoolId || null, schoolId || null, academicYearId || null, academicYearId || null,
      teacherUserId, teacherUserId, schoolId || null, schoolId || null, academicYearId || null, academicYearId || null
    );

    return classes.map((c) => {
      const teachingSubjects = db.prepare(`
        SELECT ta.id as assignmentId, s.id as subjectId, s.name as subjectName, s.code as subjectCode, ta.role, ta.semester_id as semesterId
        FROM teacher_assignments ta
        JOIN subjects s ON ta.subject_id = s.id
        WHERE ta.class_id = ?
          AND (ta.teacher_id = ? OR ta.teacher_id IN (SELECT user_id FROM teachers WHERE id = ?))
          AND ta.status = 'active'
      `).all(c.id, teacherUserId, teacherUserId);

      return {
        ...c,
        is_homeroom: Boolean(c.is_homeroom),
        teaching_subjects: teachingSubjects,
      };
    });
  },

  /**
   * Check whether a teacher is authorized to access a given class.
   * Authorized if teacher is homeroom teacher of the class OR assigned to teach any subject in it.
   */
  async isTeacherAssignedToClass(teacherUserId, classId, { subjectId = null, schoolId = null, academicYearId = null } = {}) {
    if (!teacherUserId || !classId) return false;

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 1
        FROM classes c
        LEFT JOIN teacher_assignments ta ON ta.class_id = c.id
          AND (ta.teacher_id = $1 OR ta.teacher_id IN (SELECT user_id FROM teachers WHERE id = $1))
          AND ta.status = 'active'
          AND ($3::text IS NULL OR ta.subject_id = $3)
          AND ($4::text IS NULL OR ta.academic_year_id = $4)
        WHERE c.id = $2
          AND ($5::text IS NULL OR c.school_id = $5 OR c.school_id IS NULL)
          AND (
            (c.homeroom_teacher_id = $1 OR c.homeroom_teacher_id IN (SELECT user_id FROM teachers WHERE id = $1))
            OR ta.id IS NOT NULL
          )
        LIMIT 1
      `, [teacherUserId, classId, subjectId || null, academicYearId || null, schoolId || null]);

      return (res.rows.length > 0);
    }

    const row = db.prepare(`
      SELECT 1
      FROM classes c
      LEFT JOIN teacher_assignments ta ON ta.class_id = c.id
        AND (ta.teacher_id = ? OR ta.teacher_id IN (SELECT user_id FROM teachers WHERE id = ?))
        AND ta.status = 'active'
        AND (? IS NULL OR ta.subject_id = ?)
        AND (? IS NULL OR ta.academic_year_id = ?)
      WHERE c.id = ?
        AND (? IS NULL OR c.school_id = ? OR c.school_id IS NULL)
        AND (
          (c.homeroom_teacher_id = ? OR c.homeroom_teacher_id IN (SELECT user_id FROM teachers WHERE id = ?))
          OR ta.id IS NOT NULL
        )
      LIMIT 1
    `).get(
      teacherUserId, teacherUserId,
      subjectId || null, subjectId || null,
      academicYearId || null, academicYearId || null,
      classId,
      schoolId || null, schoolId || null,
      teacherUserId, teacherUserId
    );

    return Boolean(row);
  },

  /**
   * Check for assignment conflicts:
   * 1. If role is 'primary': Is there already an active primary teacher for this class + subject in the same term?
   * 2. Is this exact teacher already assigned to this class + subject in the same term?
   */
  async checkAssignmentConflict({
    classId,
    subjectId,
    academicYearId,
    semesterId = null,
    teacherId,
    role = 'primary',
    excludeId = null,
    client = null,
  }) {
    if (isPostgresConfigured()) {
      const runner = client || { query: (q, p) => pgQuery(q, p) };

      // Check 1: Duplicate assignment for same teacher
      const dupRes = await runner.query(`
        SELECT ta.*, u.name as teacher_name
        FROM teacher_assignments ta
        JOIN users u ON ta.teacher_id = u.id
        WHERE ta.class_id = $1
          AND ta.subject_id = $2
          AND ta.academic_year_id = $3
          AND ($4::text IS NULL OR ta.semester_id = $4 OR ta.semester_id IS NULL)
          AND ta.teacher_id = $5
          AND ta.status = 'active'
          AND ($6::text IS NULL OR ta.id != $6)
        LIMIT 1
      `, [classId, subjectId, academicYearId, semesterId || null, teacherId, excludeId || null]);

      if (dupRes.rows[0]) {
        return {
          hasConflict: true,
          type: 'DUPLICATE_TEACHER_ASSIGNMENT',
          conflictAssignment: dupRes.rows[0],
          message: `Giáo viên ${dupRes.rows[0].teacher_name} đã được phân công giảng dạy môn học này cho lớp trong năm học/kỳ học đã chọn.`,
        };
      }

      // Check 2: Primary teacher conflict
      if (role === 'primary') {
        const primRes = await runner.query(`
          SELECT ta.*, u.name as teacher_name
          FROM teacher_assignments ta
          JOIN users u ON ta.teacher_id = u.id
          WHERE ta.class_id = $1
            AND ta.subject_id = $2
            AND ta.academic_year_id = $3
            AND ($4::text IS NULL OR ta.semester_id = $4 OR ta.semester_id IS NULL)
            AND ta.role = 'primary'
            AND ta.status = 'active'
            AND ($5::text IS NULL OR ta.id != $5)
          LIMIT 1
        `, [classId, subjectId, academicYearId, semesterId || null, excludeId || null]);

        if (primRes.rows[0]) {
          return {
            hasConflict: true,
            type: 'PRIMARY_TEACHER_CONFLICT',
            conflictAssignment: primRes.rows[0],
            message: `Lớp học đã có Giáo viên chính (${primRes.rows[0].teacher_name}) phụ trách môn học này. Vui lòng chọn vai trò Giáo viên phụ tá / Trợ giảng hoặc điều chuyển giáo viên cũ.`,
          };
        }
      }

      return { hasConflict: false };
    }

    // SQLite fallback
    const dupRow = db.prepare(`
      SELECT ta.*, u.name as teacher_name
      FROM teacher_assignments ta
      JOIN users u ON ta.teacher_id = u.id
      WHERE ta.class_id = ?
        AND ta.subject_id = ?
        AND ta.academic_year_id = ?
        AND (? IS NULL OR ta.semester_id = ? OR ta.semester_id IS NULL)
        AND ta.teacher_id = ?
        AND ta.status = 'active'
        AND (? IS NULL OR ta.id != ?)
      LIMIT 1
    `).get(classId, subjectId, academicYearId, semesterId || null, semesterId || null, teacherId, excludeId || null, excludeId || null);

    if (dupRow) {
      return {
        hasConflict: true,
        type: 'DUPLICATE_TEACHER_ASSIGNMENT',
        conflictAssignment: dupRow,
        message: `Giáo viên ${dupRow.teacher_name} đã được phân công giảng dạy môn học này cho lớp trong năm học/kỳ học đã chọn.`,
      };
    }

    if (role === 'primary') {
      const primRow = db.prepare(`
        SELECT ta.*, u.name as teacher_name
        FROM teacher_assignments ta
        JOIN users u ON ta.teacher_id = u.id
        WHERE ta.class_id = ?
          AND ta.subject_id = ?
          AND ta.academic_year_id = ?
          AND (? IS NULL OR ta.semester_id = ? OR ta.semester_id IS NULL)
          AND ta.role = 'primary'
          AND ta.status = 'active'
          AND (? IS NULL OR ta.id != ?)
        LIMIT 1
      `).get(classId, subjectId, academicYearId, semesterId || null, semesterId || null, excludeId || null, excludeId || null);

      if (primRow) {
        return {
          hasConflict: true,
          type: 'PRIMARY_TEACHER_CONFLICT',
          conflictAssignment: primRow,
          message: `Lớp học đã có Giáo viên chính (${primRow.teacher_name}) phụ trách môn học này. Vui lòng chọn vai trò Giáo viên phụ tá / Trợ giảng hoặc điều chuyển giáo viên cũ.`,
        };
      }
    }

    return { hasConflict: false };
  },

  /**
   * Create a new teacher assignment record.
   */
  async createAssignment(data, client = null) {
    const {
      id,
      schoolId,
      teacherId,
      classId,
      subjectId,
      academicYear,
      academicYearId,
      semesterId = null,
      role = 'primary',
      status = 'active',
      startDate = new Date().toISOString().split('T')[0],
      endDate = null,
      notes = null,
    } = data;

    if (isPostgresConfigured()) {
      const runner = client || { query: (q, p) => pgQuery(q, p) };
      const res = await runner.query(`
        INSERT INTO teacher_assignments (
          id, school_id, teacher_id, class_id, subject_id,
          academic_year, academic_year_id, semester_id,
          role, status, start_date, end_date, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        id, schoolId, teacherId, classId, subjectId,
        academicYear, academicYearId, semesterId,
        role, status, startDate, endDate, notes,
      ]);
      return res.rows[0];
    }

    db.prepare(`
      INSERT INTO teacher_assignments (
        id, school_id, teacher_id, class_id, subject_id,
        academic_year, academic_year_id, semester_id,
        role, status, start_date, end_date, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, schoolId, teacherId, classId, subjectId,
      academicYear, academicYearId, semesterId,
      role, status, startDate, endDate, notes
    );

    return this.findAssignmentById(id, schoolId);
  },

  /**
   * Update an existing assignment.
   */
  async updateAssignment(id, data, client = null) {
    const { role, status, endDate, notes } = data;

    if (isPostgresConfigured()) {
      const runner = client || { query: (q, p) => pgQuery(q, p) };
      const setClauses = [];
      const params = [id];
      let idx = 2;

      if (role !== undefined) {
        setClauses.push(`role = $${idx++}`);
        params.push(role);
      }
      if (status !== undefined) {
        setClauses.push(`status = $${idx++}`);
        params.push(status);
      }
      if (endDate !== undefined) {
        setClauses.push(`end_date = $${idx++}`);
        params.push(endDate);
      }
      if (notes !== undefined) {
        setClauses.push(`notes = $${idx++}`);
        params.push(notes);
      }

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

      const res = await runner.query(`
        UPDATE teacher_assignments
        SET ${setClauses.join(', ')}
        WHERE id = $1
        RETURNING *
      `, params);

      return res.rows[0] || null;
    }

    const setClauses = [];
    const params = [];

    if (role !== undefined) {
      setClauses.push('role = ?');
      params.push(role);
    }
    if (status !== undefined) {
      setClauses.push('status = ?');
      params.push(status);
    }
    if (endDate !== undefined) {
      setClauses.push('end_date = ?');
      params.push(endDate);
    }
    if (notes !== undefined) {
      setClauses.push('notes = ?');
      params.push(notes);
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.prepare(`
      UPDATE teacher_assignments
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `).run(...params);

    return this.findAssignmentById(id);
  },

  /**
   * Delete or permanently remove an assignment.
   */
  async deleteAssignment(id, schoolId = null, client = null) {
    if (isPostgresConfigured()) {
      const runner = client || { query: (q, p) => pgQuery(q, p) };
      const res = await runner.query(`
        DELETE FROM teacher_assignments
        WHERE id = $1 AND ($2::text IS NULL OR school_id = $2 OR school_id IS NULL)
        RETURNING id
      `, [id, schoolId || null]);
      return res.rows[0] || null;
    }

    const info = db.prepare(`
      DELETE FROM teacher_assignments
      WHERE id = ? AND (? IS NULL OR school_id = ? OR school_id IS NULL)
    `).run(id, schoolId || null, schoolId || null);

    return info.changes > 0 ? { id } : null;
  },
};
