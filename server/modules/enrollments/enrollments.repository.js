import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';

export const enrollmentsRepository = {
  /**
   * Find the active current enrollment for a student.
   */
  async findActiveEnrollmentByStudent(studentId, schoolId, client = null) {
    if (isPostgresConfigured()) {
      const runner = client || { query: (q, p) => pgQuery(q, p) };
      const res = await runner.query(`
        SELECT ce.*,
               c.name as class_name, c.grade_level, c.room, c.max_capacity,
               ay.name as academic_year_name
        FROM class_enrollments ce
        JOIN classes c ON ce.class_id = c.id
        LEFT JOIN academic_years ay ON ce.academic_year_id = ay.id
        WHERE ce.student_id = $1
          AND ce.is_current = TRUE
          AND ce.status = 'enrolled'
          AND ($2::text IS NULL OR ce.school_id = $2 OR ce.school_id IS NULL)
        ORDER BY ce.enrollment_date DESC
        LIMIT 1
      `, [studentId, schoolId || null]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT ce.*,
             c.name as class_name, c.grade_level, c.room, c.max_capacity,
             ay.name as academic_year_name
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      LEFT JOIN academic_years ay ON ce.academic_year_id = ay.id
      WHERE ce.student_id = ?
        AND ce.is_current = 1
        AND ce.status = 'enrolled'
        AND (? IS NULL OR ce.school_id = ? OR ce.school_id IS NULL)
      ORDER BY ce.enrollment_date DESC
      LIMIT 1
    `).get(studentId, schoolId || null, schoolId || null) || null;
  },

  /**
   * Find an enrollment record by ID.
   */
  async findEnrollmentById(id, schoolId = null, client = null) {
    if (isPostgresConfigured()) {
      const runner = client || { query: (q, p) => pgQuery(q, p) };
      const res = await runner.query(`
        SELECT ce.*,
               c.name as class_name, c.grade_level, c.room,
               ay.name as academic_year_name
        FROM class_enrollments ce
        JOIN classes c ON ce.class_id = c.id
        LEFT JOIN academic_years ay ON ce.academic_year_id = ay.id
        WHERE ce.id = $1
          AND ($2::text IS NULL OR ce.school_id = $2 OR ce.school_id IS NULL)
      `, [id, schoolId || null]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT ce.*,
             c.name as class_name, c.grade_level, c.room,
             ay.name as academic_year_name
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      LEFT JOIN academic_years ay ON ce.academic_year_id = ay.id
      WHERE ce.id = ?
        AND (? IS NULL OR ce.school_id = ? OR ce.school_id IS NULL)
    `).get(id, schoolId || null, schoolId || null) || null;
  },

  /**
   * Full chronological enrollment history for a student across academic years.
   */
  async findEnrollmentHistory(studentId, schoolId = null) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT ce.id, ce.class_id, ce.student_id, ce.academic_year_id,
               ce.enrollment_date, ce.start_date, ce.end_date, ce.status, ce.is_current,
               ce.reason, ce.notes, ce.created_at, ce.updated_at,
               c.name as class_name, c.grade_level, c.room,
               u.name as homeroom_teacher_name,
               ay.name as academic_year_name
        FROM class_enrollments ce
        JOIN classes c ON ce.class_id = c.id
        LEFT JOIN users u ON c.homeroom_teacher_id = u.id
        LEFT JOIN academic_years ay ON ce.academic_year_id = ay.id
        WHERE ce.student_id = $1
          AND ($2::text IS NULL OR ce.school_id = $2 OR ce.school_id IS NULL)
        ORDER BY ce.enrollment_date DESC, ce.created_at DESC
      `, [studentId, schoolId || null]);
      return res.rows;
    }

    return db.prepare(`
      SELECT ce.id, ce.class_id, ce.student_id, ce.academic_year_id,
             ce.enrollment_date, ce.start_date, ce.end_date, ce.status, ce.is_current,
             ce.reason, ce.notes, ce.created_at, ce.updated_at,
             c.name as class_name, c.grade_level, c.room,
             u.name as homeroom_teacher_name,
             ay.name as academic_year_name
      FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      LEFT JOIN users u ON c.homeroom_teacher_id = u.id
      LEFT JOIN academic_years ay ON ce.academic_year_id = ay.id
      WHERE ce.student_id = ?
        AND (? IS NULL OR ce.school_id = ? OR ce.school_id IS NULL)
      ORDER BY ce.enrollment_date DESC, ce.created_at DESC
    `).all(studentId, schoolId || null, schoolId || null);
  },

  /**
   * Active class roster derived exclusively from class_enrollments.
   */
  async findClassRoster(classId, schoolId = null, options = {}) {
    const { academicYearId, isCurrent = true, status = 'enrolled', search } = options;

    if (isPostgresConfigured()) {
      let sql = `
        SELECT ce.id as enrollment_id, ce.enrollment_date, ce.start_date, ce.end_date,
               ce.status as enrollment_status, ce.is_current, ce.reason, ce.notes,
               s.id as student_id, s.user_id, s.student_code, s.dob, s.gender,
               s.gpa, s.attendance_rate, s.enrollment_status as profile_status,
               u.name as student_name, u.email as student_email, u.phone as student_phone, u.avatar
        FROM class_enrollments ce
        JOIN students s ON ce.student_id = s.id
        JOIN users u ON s.user_id = u.id
        WHERE ce.class_id = $1
      `;
      const params = [classId];
      let idx = 2;

      if (schoolId) {
        sql += ` AND (ce.school_id = $${idx} OR ce.school_id IS NULL)`;
        params.push(schoolId);
        idx++;
      }

      if (academicYearId) {
        sql += ` AND ce.academic_year_id = $${idx}`;
        params.push(academicYearId);
        idx++;
      }

      if (isCurrent !== 'all') {
        sql += ` AND ce.is_current = $${idx}`;
        params.push(isCurrent === true || isCurrent === 'true');
        idx++;
      }

      if (status && status !== 'all') {
        sql += ` AND ce.status = $${idx}`;
        params.push(status);
        idx++;
      }

      if (search) {
        sql += ` AND (u.name ILIKE $${idx} OR s.student_code ILIKE $${idx} OR u.email ILIKE $${idx})`;
        params.push(`%${search}%`);
        idx++;
      }

      sql += ` ORDER BY u.name ASC`;
      const res = await pgQuery(sql, params);
      const students = res.rows;

      // Attach guardians
      for (const st of students) {
        const pRes = await pgQuery(`
          SELECT ps.relationship, ps.is_primary_contact, ps.is_verified,
                 pu.name as parent_name, pu.email as parent_email, p.contact_phone
          FROM parent_students ps
          JOIN parents p ON ps.parent_id = p.id
          JOIN users pu ON p.user_id = pu.id
          WHERE ps.student_id = $1
        `, [st.student_id]);
        st.guardians = pRes.rows;
      }

      return students;
    }

    let sql = `
      SELECT ce.id as enrollment_id, ce.enrollment_date, ce.start_date, ce.end_date,
             ce.status as enrollment_status, ce.is_current, ce.reason, ce.notes,
             s.id as student_id, s.user_id, s.student_code, s.dob, s.gender,
             s.gpa, s.attendance_rate, s.enrollment_status as profile_status,
             u.name as student_name, u.email as student_email, u.phone as student_phone, u.avatar
      FROM class_enrollments ce
      JOIN students s ON ce.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE ce.class_id = ?
    `;
    const params = [classId];

    if (schoolId) {
      sql += ` AND (ce.school_id = ? OR ce.school_id IS NULL)`;
      params.push(schoolId);
    }

    if (academicYearId) {
      sql += ` AND ce.academic_year_id = ?`;
      params.push(academicYearId);
    }

    if (isCurrent !== 'all') {
      sql += ` AND ce.is_current = ?`;
      params.push(isCurrent === true || isCurrent === 'true' ? 1 : 0);
    }

    if (status && status !== 'all') {
      sql += ` AND ce.status = ?`;
      params.push(status);
    }

    if (search) {
      sql += ` AND (u.name LIKE ? OR s.student_code LIKE ? OR u.email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY u.name ASC`;
    const students = db.prepare(sql).all(...params);

    for (const st of students) {
      st.guardians = db.prepare(`
        SELECT ps.relationship, ps.is_primary_contact, ps.is_verified,
               pu.name as parent_name, pu.email as parent_email, p.contact_phone
        FROM parent_students ps
        JOIN parents p ON ps.parent_id = p.id
        JOIN users pu ON p.user_id = pu.id
        WHERE ps.student_id = ?
      `).all(st.student_id);
    }

    return students;
  },

  /**
   * Count active students currently enrolled in a class.
   */
  async countClassActiveStudents(classId, client = null) {
    if (isPostgresConfigured()) {
      const runner = client || { query: (q, p) => pgQuery(q, p) };
      const res = await runner.query(`
        SELECT COUNT(*) as count
        FROM class_enrollments
        WHERE class_id = $1
          AND is_current = TRUE
          AND status = 'enrolled'
      `, [classId]);
      return parseInt(res.rows[0]?.count || '0', 10);
    }

    const row = db.prepare(`
      SELECT COUNT(*) as count
      FROM class_enrollments
      WHERE class_id = ?
        AND is_current = 1
        AND status = 'enrolled'
    `).get(classId);
    return row?.count || 0;
  },

  /**
   * Create an enrollment record.
   */
  async createEnrollment(data, client = null) {
    const {
      id, classId, studentId, academicYearId, schoolId,
      enrollmentDate, startDate, endDate, status = 'enrolled',
      isCurrent = true, reason, notes
    } = data;
    const enrollmentId = id || `enr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const enrDate = enrollmentDate || startDate || new Date().toISOString().split('T')[0];

    if (isPostgresConfigured()) {
      const runner = client || { query: (q, p) => pgQuery(q, p) };
      const res = await runner.query(`
        INSERT INTO class_enrollments (
          id, class_id, student_id, academic_year_id, school_id,
          enrollment_date, start_date, end_date, status, is_current,
          reason, notes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        enrollmentId, classId, studentId, academicYearId, schoolId || null,
        enrDate, startDate || enrDate, endDate || null, status,
        isCurrent, reason || null, notes || null
      ]);
      return res.rows[0];
    }

    db.prepare(`
      INSERT INTO class_enrollments (
        id, class_id, student_id, academic_year_id, school_id,
        enrollment_date, start_date, end_date, status, is_current,
        reason, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      enrollmentId, classId, studentId, academicYearId, schoolId || null,
      enrDate, startDate || enrDate, endDate || null, status,
      isCurrent ? 1 : 0, reason || null, notes || null
    );

    return this.findEnrollmentById(enrollmentId, schoolId);
  },

  /**
   * Update an existing enrollment record.
   */
  async updateEnrollment(id, updates, client = null) {
    const { status, isCurrent, endDate, reason, notes } = updates;

    if (isPostgresConfigured()) {
      const runner = client || { query: (q, p) => pgQuery(q, p) };
      const res = await runner.query(`
        UPDATE class_enrollments
        SET status = COALESCE($1, status),
            is_current = CASE WHEN $2::boolean IS NOT NULL THEN $2 ELSE is_current END,
            end_date = CASE WHEN $3::date IS NOT NULL THEN $3 ELSE end_date END,
            reason = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE reason END,
            notes = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE notes END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [
        status || null,
        isCurrent !== undefined ? isCurrent : null,
        endDate || null,
        reason !== undefined ? reason : null,
        notes !== undefined ? notes : null,
        id
      ]);
      return res.rows[0] || null;
    }

    db.prepare(`
      UPDATE class_enrollments
      SET status = COALESCE(?, status),
          is_current = CASE WHEN ? IS NOT NULL THEN ? ELSE is_current END,
          end_date = CASE WHEN ? IS NOT NULL THEN ? ELSE end_date END,
          reason = CASE WHEN ? IS NOT NULL THEN ? ELSE reason END,
          notes = CASE WHEN ? IS NOT NULL THEN ? ELSE notes END,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      status || null,
      isCurrent !== undefined ? (isCurrent ? 1 : 0) : null,
      isCurrent !== undefined ? (isCurrent ? 1 : 0) : null,
      endDate || null, endDate || null,
      reason !== undefined ? reason : null, reason !== undefined ? reason : null,
      notes !== undefined ? notes : null, notes !== undefined ? notes : null,
      id
    );

    return this.findEnrollmentById(id);
  },

  /**
   * Synchronize student profile current_class_id cache for backward compatibility.
   */
  async syncStudentCurrentClassCache(studentId, classId, client = null) {
    if (isPostgresConfigured()) {
      const runner = client || { query: (q, p) => pgQuery(q, p) };
      await runner.query(`
        UPDATE students
        SET current_class_id = $1,
            class_id = $2
        WHERE id = $3
      `, [classId || null, classId || null, studentId]);
      return;
    }

    db.prepare(`
      UPDATE students
      SET current_class_id = ?,
          class_id = ?
      WHERE id = ?
    `).run(classId || null, classId || null, studentId);
  },
};
