/**
 * Profiles Module Repository
 * Data access layer for normalized Teacher, Student, and Parent profiles.
 * Supports Neon Cloud PostgreSQL and SQLite WAL modes with tenant isolation.
 */

import { isPostgresConfigured, pgQuery } from '../../shared/database/index.js';
import { db } from '../../db.js';

export const profilesRepository = {
  // ========================================================================
  // TEACHERS
  // ========================================================================

  async findTeacherByUserId(userId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT t.*, u.name, u.username, u.email as account_email, u.phone as account_phone, u.avatar,
               d.name as department_name, d.code as department_code,
               c.name as homeroom_class_name
        FROM teachers t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN classes c ON t.homeroom_class_id = c.id
        WHERE t.user_id = $1
      `, [userId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT t.*, u.name, u.username, u.email as account_email, u.phone as account_phone, u.avatar,
             d.name as department_name, d.code as department_code,
             c.name as homeroom_class_name
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN classes c ON t.homeroom_class_id = c.id
      WHERE t.user_id = ?
    `).get(userId) || null;
  },

  async findTeacherById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT t.*, u.name, u.username, u.email as account_email, u.phone as account_phone, u.avatar,
               d.name as department_name, d.code as department_code,
               c.name as homeroom_class_name
        FROM teachers t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN classes c ON t.homeroom_class_id = c.id
        WHERE t.id = $1 OR t.user_id = $1
      `, [id]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT t.*, u.name, u.username, u.email as account_email, u.phone as account_phone, u.avatar,
             d.name as department_name, d.code as department_code,
             c.name as homeroom_class_name
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN classes c ON t.homeroom_class_id = c.id
      WHERE t.id = ? OR t.user_id = ?
    `).get(id, id) || null;
  },

  async findTeachers({ schoolId = null, search = '', departmentId = null, status = 'all', page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      const conditions = [];
      const values = [];
      let idx = 1;

      if (schoolId) {
        conditions.push(`(t.school_id = $${idx} OR t.school_id IS NULL)`);
        values.push(schoolId);
        idx++;
      }

      if (departmentId) {
        conditions.push(`t.department_id = $${idx}`);
        values.push(departmentId);
        idx++;
      }

      if (status && status !== 'all') {
        conditions.push(`t.status = $${idx}`);
        values.push(status);
        idx++;
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        conditions.push(`(
          u.name ILIKE $${idx} OR 
          u.username ILIKE $${idx} OR 
          COALESCE(t.employee_id, '') ILIKE $${idx} OR
          COALESCE(t.specialty, '') ILIKE $${idx}
        )`);
        values.push(term);
        idx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT t.*, u.name, u.username, u.avatar, u.email as account_email, u.phone as account_phone,
               d.name as department_name, d.code as department_code,
               c.name as homeroom_class_name,
               COUNT(*) OVER() as total_count
        FROM teachers t
        JOIN users u ON t.user_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN classes c ON t.homeroom_class_id = c.id
        ${whereClause}
        ORDER BY u.name ASC
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      values.push(limit, offset);

      const res = await pgQuery(query, values);
      const total = res.rows.length > 0 ? parseInt(res.rows[0].total_count, 10) : 0;
      const teachers = res.rows.map(({ total_count, ...row }) => row);
      return { teachers, total };
    }

    // SQLite fallback
    const conditions = [];
    const values = [];

    if (schoolId) {
      conditions.push(`(t.school_id = ? OR t.school_id IS NULL)`);
      values.push(schoolId);
    }

    if (departmentId) {
      conditions.push(`t.department_id = ?`);
      values.push(departmentId);
    }

    if (status && status !== 'all') {
      conditions.push(`t.status = ?`);
      values.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(`(
        u.name LIKE ? OR 
        u.username LIKE ? OR 
        COALESCE(t.employee_id, '') LIKE ? OR
        COALESCE(t.specialty, '') LIKE ?
      )`);
      values.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const totalQuery = `
      SELECT COUNT(*) as count
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      ${whereClause}
    `;
    const total = db.prepare(totalQuery).get(...values)?.count || 0;

    const listQuery = `
      SELECT t.*, u.name, u.username, u.avatar, u.email as account_email, u.phone as account_phone,
             d.name as department_name, d.code as department_code,
             c.name as homeroom_class_name
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN classes c ON t.homeroom_class_id = c.id
      ${whereClause}
      ORDER BY u.name ASC
      LIMIT ? OFFSET ?
    `;
    const teachers = db.prepare(listQuery).all(...values, limit, offset);
    return { teachers, total };
  },

  async createTeacher(data) {
    const {
      id = `tch_${Date.now()}`,
      userId,
      schoolId = 'sch_bacau',
      departmentId = null,
      homeroomClassId = null,
      specialty = '',
      qualification = '',
      status = 'active',
      employeeId = null,
      subjects = null,
      contactEmail = null,
      contactPhone = null,
      officeRoom = null,
      bio = null,
    } = data;

    const subjectsStr = Array.isArray(subjects) ? JSON.stringify(subjects) : subjects;

    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO teachers (
          id, user_id, school_id, department_id, homeroom_class_id, specialty, qualification,
          status, employee_id, subjects, contact_email, contact_phone, office_room, bio
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (user_id) DO UPDATE SET
          department_id = EXCLUDED.department_id,
          homeroom_class_id = EXCLUDED.homeroom_class_id,
          specialty = EXCLUDED.specialty,
          qualification = EXCLUDED.qualification,
          status = EXCLUDED.status,
          employee_id = EXCLUDED.employee_id,
          subjects = EXCLUDED.subjects,
          contact_email = EXCLUDED.contact_email,
          contact_phone = EXCLUDED.contact_phone,
          office_room = EXCLUDED.office_room,
          bio = EXCLUDED.bio,
          updated_at = CURRENT_TIMESTAMP
      `, [
        id, userId, schoolId, departmentId, homeroomClassId, specialty, qualification,
        status, employeeId, subjectsStr, contactEmail, contactPhone, officeRoom, bio,
      ]);
      return this.findTeacherById(id);
    }

    db.prepare(`
      INSERT OR REPLACE INTO teachers (
        id, user_id, school_id, department_id, homeroom_class_id, specialty, qualification,
        status, employee_id, subjects, contact_email, contact_phone, office_room, bio, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      id, userId, schoolId, departmentId, homeroomClassId, specialty, qualification,
      status, employeeId, subjectsStr, contactEmail, contactPhone, officeRoom, bio,
    );
    return this.findTeacherById(id);
  },

  async updateTeacher(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = [
      ['departmentId', 'department_id'],
      ['homeroomClassId', 'homeroom_class_id'],
      ['specialty', 'specialty'],
      ['qualification', 'qualification'],
      ['status', 'status'],
      ['employeeId', 'employee_id'],
      ['subjects', 'subjects'],
      ['contactEmail', 'contact_email'],
      ['contactPhone', 'contact_phone'],
      ['officeRoom', 'office_room'],
      ['bio', 'bio'],
    ];

    for (const [key, col] of allowed) {
      if (data[key] !== undefined) {
        let val = data[key];
        if (key === 'subjects' && Array.isArray(val)) {
          val = JSON.stringify(val);
        }
        fields.push(`${col} = $${idx}`);
        values.push(val);
        idx++;
      }
    }

    if (fields.length === 0) return this.findTeacherById(id);

    if (isPostgresConfigured()) {
      values.push(id);
      await pgQuery(`
        UPDATE teachers
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${idx} OR user_id = $${idx}
      `, values);
      return this.findTeacherById(id);
    }

    // SQLite
    const sqliteFields = fields.map((f) => f.replace(/\$\d+/, '?'));
    values.push(id, id);
    db.prepare(`
      UPDATE teachers
      SET ${sqliteFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR user_id = ?
    `).run(...values);

    return this.findTeacherById(id);
  },

  // ========================================================================
  // STUDENTS & GUARDIANS
  // ========================================================================

  async findStudentByUserId(userId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT s.*, u.name, u.username, u.email as account_email, u.phone as account_phone, u.avatar,
               COALESCE(c.name, ec.name) as class_name,
               COALESCE(s.current_class_id, s.class_id, ce.class_id) as effective_class_id
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON s.current_class_id = c.id OR s.class_id = c.id
        LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = true
        LEFT JOIN classes ec ON ce.class_id = ec.id
        WHERE s.user_id = $1
      `, [userId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT s.*, u.name, u.username, u.email as account_email, u.phone as account_phone, u.avatar,
             COALESCE(c.name, ec.name) as class_name,
             COALESCE(s.current_class_id, s.class_id, ce.class_id) as effective_class_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.current_class_id = c.id OR s.class_id = c.id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = 1
      LEFT JOIN classes ec ON ce.class_id = ec.id
      WHERE s.user_id = ?
    `).get(userId) || null;
  },

  async findStudentById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT s.*, u.name, u.username, u.email as account_email, u.phone as account_phone, u.avatar,
               COALESCE(c.name, ec.name) as class_name,
               COALESCE(s.current_class_id, s.class_id, ce.class_id) as effective_class_id
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON s.current_class_id = c.id OR s.class_id = c.id
        LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = true
        LEFT JOIN classes ec ON ce.class_id = ec.id
        WHERE s.id = $1 OR s.user_id = $1
      `, [id]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT s.*, u.name, u.username, u.email as account_email, u.phone as account_phone, u.avatar,
             COALESCE(c.name, ec.name) as class_name,
             COALESCE(s.current_class_id, s.class_id, ce.class_id) as effective_class_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.current_class_id = c.id OR s.class_id = c.id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = 1
      LEFT JOIN classes ec ON ce.class_id = ec.id
      WHERE s.id = ? OR s.user_id = ?
    `).get(id, id) || null;
  },

  async findStudents({ schoolId = null, search = '', classId = null, status = 'all', page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      const conditions = [];
      const values = [];
      let idx = 1;

      if (schoolId) {
        conditions.push(`(s.school_id = $${idx} OR s.school_id IS NULL)`);
        values.push(schoolId);
        idx++;
      }

      if (classId) {
        conditions.push(`(s.current_class_id = $${idx} OR s.class_id = $${idx} OR ce.class_id = $${idx})`);
        values.push(classId);
        idx++;
      }

      if (status && status !== 'all') {
        conditions.push(`COALESCE(s.enrollment_status, 'active') = $${idx}`);
        values.push(status);
        idx++;
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        conditions.push(`(
          u.name ILIKE $${idx} OR 
          u.username ILIKE $${idx} OR 
          COALESCE(s.student_code, '') ILIKE $${idx}
        )`);
        values.push(term);
        idx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT s.*, u.name, u.username, u.avatar, u.email as account_email, u.phone as account_phone,
               COALESCE(c.name, ec.name) as class_name,
               COALESCE(s.current_class_id, s.class_id, ce.class_id) as effective_class_id,
               COUNT(*) OVER() as total_count
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON s.current_class_id = c.id OR s.class_id = c.id
        LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = true
        LEFT JOIN classes ec ON ce.class_id = ec.id
        ${whereClause}
        ORDER BY u.name ASC
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      values.push(limit, offset);

      const res = await pgQuery(query, values);
      const total = res.rows.length > 0 ? parseInt(res.rows[0].total_count, 10) : 0;
      const students = res.rows.map(({ total_count, ...row }) => row);
      return { students, total };
    }

    // SQLite fallback
    const conditions = [];
    const values = [];

    if (schoolId) {
      conditions.push(`(s.school_id = ? OR s.school_id IS NULL)`);
      values.push(schoolId);
    }

    if (classId) {
      conditions.push(`(s.current_class_id = ? OR s.class_id = ? OR ce.class_id = ?)`);
      values.push(classId, classId, classId);
    }

    if (status && status !== 'all') {
      conditions.push(`COALESCE(s.enrollment_status, 'active') = ?`);
      values.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(`(
        u.name LIKE ? OR 
        u.username LIKE ? OR 
        COALESCE(s.student_code, '') LIKE ?
      )`);
      values.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const totalQuery = `
      SELECT COUNT(*) as count
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = 1
      ${whereClause}
    `;
    const total = db.prepare(totalQuery).get(...values)?.count || 0;

    const listQuery = `
      SELECT s.*, u.name, u.username, u.avatar, u.email as account_email, u.phone as account_phone,
             COALESCE(c.name, ec.name) as class_name,
             COALESCE(s.current_class_id, s.class_id, ce.class_id) as effective_class_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.current_class_id = c.id OR s.class_id = c.id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = 1
      LEFT JOIN classes ec ON ce.class_id = ec.id
      ${whereClause}
      ORDER BY u.name ASC
      LIMIT ? OFFSET ?
    `;
    const students = db.prepare(listQuery).all(...values, limit, offset);
    return { students, total };
  },

  async createStudent(data) {
    const {
      id = `std_${Date.now()}`,
      userId,
      schoolId = 'sch_bacau',
      classId = 'cls_10A1',
      currentClassId = null,
      studentCode = null,
      dob = null,
      gender = 'male',
      address = '',
      enrollmentStatus = 'active',
      enrollmentDate = new Date().toISOString().split('T')[0],
      gpa = 8.0,
      classRank = '15/38',
      attendanceRate = 100,
    } = data;

    const effectiveClass = currentClassId || classId;

    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO students (
          id, user_id, school_id, class_id, current_class_id, student_code, dob, gender,
          address, enrollment_status, enrollment_date, gpa, class_rank, attendance_rate
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (user_id) DO UPDATE SET
          school_id = EXCLUDED.school_id,
          class_id = EXCLUDED.class_id,
          current_class_id = EXCLUDED.current_class_id,
          student_code = EXCLUDED.student_code,
          dob = EXCLUDED.dob,
          gender = EXCLUDED.gender,
          address = EXCLUDED.address,
          enrollment_status = EXCLUDED.enrollment_status,
          updated_at = CURRENT_TIMESTAMP
      `, [
        id, userId, schoolId, classId, effectiveClass, studentCode, dob, gender,
        address, enrollmentStatus, enrollmentDate, gpa, classRank, attendanceRate,
      ]);

      // Enroll in active academic year
      const ceId = `ce_${id}_${effectiveClass}_${Date.now()}`;
      await pgQuery(`
        UPDATE class_enrollments SET is_current = FALSE WHERE student_id = $1
      `, [id]);
      await pgQuery(`
        INSERT INTO class_enrollments (id, class_id, student_id, academic_year_id, enrollment_date, status, is_current)
        VALUES ($1, $2, $3, 'ay_2024_2025', $4, 'enrolled', TRUE)
      `, [ceId, effectiveClass, id, enrollmentDate]);

      return this.findStudentById(id);
    }

    db.prepare(`
      INSERT OR REPLACE INTO students (
        id, user_id, school_id, class_id, current_class_id, student_code, dob, gender,
        address, enrollment_status, enrollment_date, gpa, class_rank, attendance_rate, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      id, userId, schoolId, classId, effectiveClass, studentCode, dob, gender,
      address, enrollmentStatus, enrollmentDate, gpa, classRank, attendanceRate,
    );

    const ceId = `ce_${id}_${effectiveClass}`;
    db.prepare(`
      INSERT OR REPLACE INTO class_enrollments (id, class_id, student_id, academic_year_id, enrollment_date, status, is_current)
      VALUES (?, ?, ?, 'ay_2024_2025', ?, 'enrolled', 1)
    `).run(ceId, effectiveClass, id, enrollmentDate);

    return this.findStudentById(id);
  },

  async updateStudent(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = [
      ['studentCode', 'student_code'],
      ['currentClassId', 'current_class_id'],
      ['classId', 'class_id'],
      ['dob', 'dob'],
      ['gender', 'gender'],
      ['address', 'address'],
      ['enrollmentStatus', 'enrollment_status'],
      ['enrollmentDate', 'enrollment_date'],
      ['gpa', 'gpa'],
      ['classRank', 'class_rank'],
      ['attendanceRate', 'attendance_rate'],
    ];

    for (const [key, col] of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${col} = $${idx}`);
        values.push(data[key]);
        idx++;
      }
    }

    if (fields.length === 0) return this.findStudentById(id);

    if (isPostgresConfigured()) {
      values.push(id);
      await pgQuery(`
        UPDATE students
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${idx} OR user_id = $${idx}
      `, values);

      // If currentClassId was updated, ensure active enrollment in class_enrollments
      if (data.currentClassId) {
        const student = await this.findStudentById(id);
        if (student) {
          const ceId = `ce_${student.id}_${data.currentClassId}_${Date.now()}`;
          await pgQuery(`
            UPDATE class_enrollments SET is_current = FALSE WHERE student_id = $1
          `, [student.id]);
          await pgQuery(`
            INSERT INTO class_enrollments (id, class_id, student_id, academic_year_id, status, is_current)
            VALUES ($1, $2, $3, 'ay_2024_2025', 'enrolled', TRUE)
          `, [ceId, data.currentClassId, student.id]);
        }
      }

      return this.findStudentById(id);
    }

    // SQLite
    const sqliteFields = fields.map((f) => f.replace(/\$\d+/, '?'));
    values.push(id, id);
    db.prepare(`
      UPDATE students
      SET ${sqliteFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR user_id = ?
    `).run(...values);

    if (data.currentClassId) {
      const student = this.findStudentById(id);
      if (student) {
        const ceId = `ce_${student.id}_${data.currentClassId}`;
        try {
          db.prepare('UPDATE class_enrollments SET is_current = 0 WHERE student_id = ?').run(student.id);
          db.prepare(`
            INSERT OR REPLACE INTO class_enrollments (id, class_id, student_id, academic_year_id, status, is_current)
            VALUES (?, ?, ?, 'ay_2024_2025', 'enrolled', 1)
          `).run(ceId, data.currentClassId, student.id);
        } catch {}
      }
    }

    return this.findStudentById(id);
  },

  async findStudentGuardians(studentId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT ps.id as relationship_id, ps.relationship, ps.is_primary_contact, ps.is_verified,
               p.id as parent_id, p.occupation, p.workplace, p.contact_phone, p.contact_email,
               u.id as user_id, u.name, u.avatar, u.username
        FROM parent_students ps
        JOIN parents p ON ps.parent_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE ps.student_id = $1
        ORDER BY ps.is_primary_contact DESC, ps.created_at ASC
      `, [studentId]);
      return res.rows;
    }

    return db.prepare(`
      SELECT ps.id as relationship_id, ps.relationship, ps.is_primary_contact, ps.is_verified,
             p.id as parent_id, p.occupation, p.workplace, p.contact_phone, p.contact_email,
             u.id as user_id, u.name, u.avatar, u.username
      FROM parent_students ps
      JOIN parents p ON ps.parent_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE ps.student_id = ?
      ORDER BY ps.is_primary_contact DESC, ps.created_at ASC
    `).all(studentId);
  },

  async assignGuardian({ parentId, studentId, relationship = 'guardian', isPrimaryContact = true, isVerified = true }) {
    const relId = `ps_${parentId}_${studentId}`;

    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO parent_students (id, parent_id, student_id, relationship, is_primary_contact, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (parent_id, student_id) DO UPDATE SET
          relationship = EXCLUDED.relationship,
          is_primary_contact = EXCLUDED.is_primary_contact,
          is_verified = EXCLUDED.is_verified
      `, [relId, parentId, studentId, relationship, isPrimaryContact, isVerified]);
      return { id: relId, parentId, studentId, relationship, isPrimaryContact, isVerified };
    }

    db.prepare(`
      INSERT OR REPLACE INTO parent_students (id, parent_id, student_id, relationship, is_primary_contact, is_verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(relId, parentId, studentId, relationship, isPrimaryContact ? 1 : 0, isVerified ? 1 : 0);
    return { id: relId, parentId, studentId, relationship, isPrimaryContact, isVerified };
  },

  async removeGuardian(parentId, studentId) {
    if (isPostgresConfigured()) {
      await pgQuery('DELETE FROM parent_students WHERE parent_id = $1 AND student_id = $2', [parentId, studentId]);
      return true;
    }
    db.prepare('DELETE FROM parent_students WHERE parent_id = ? AND student_id = ?').run(parentId, studentId);
    return true;
  },

  // ========================================================================
  // PARENTS & CHILDREN RELATIONSHIPS
  // ========================================================================

  async findParentByUserId(userId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT p.*, u.name, u.username, u.email as account_email, u.phone as account_phone, u.avatar
        FROM parents p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = $1
      `, [userId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT p.*, u.name, u.username, u.email as account_email, u.phone as account_phone, u.avatar
      FROM parents p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
    `).get(userId) || null;
  },

  async findParentById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT p.*, u.name, u.username, u.email as account_email, u.phone as account_phone, u.avatar
        FROM parents p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $1 OR p.user_id = $1
      `, [id]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT p.*, u.name, u.username, u.email as account_email, u.phone as account_phone, u.avatar
      FROM parents p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? OR p.user_id = ?
    `).get(id, id) || null;
  },

  async findParents({ schoolId = null, search = '', status = 'all', page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      const conditions = [];
      const values = [];
      let idx = 1;

      if (schoolId) {
        conditions.push(`(p.school_id = $${idx} OR p.school_id IS NULL)`);
        values.push(schoolId);
        idx++;
      }

      if (status && status !== 'all') {
        conditions.push(`COALESCE(p.status, 'active') = $${idx}`);
        values.push(status);
        idx++;
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        conditions.push(`(
          u.name ILIKE $${idx} OR 
          u.username ILIKE $${idx} OR 
          COALESCE(p.workplace, '') ILIKE $${idx} OR
          COALESCE(p.occupation, '') ILIKE $${idx}
        )`);
        values.push(term);
        idx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
        SELECT p.*, u.name, u.username, u.avatar, u.email as account_email, u.phone as account_phone,
               (SELECT COUNT(*) FROM parent_students ps WHERE ps.parent_id = p.id) as children_count,
               COUNT(*) OVER() as total_count
        FROM parents p
        JOIN users u ON p.user_id = u.id
        ${whereClause}
        ORDER BY u.name ASC
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      values.push(limit, offset);

      const res = await pgQuery(query, values);
      const total = res.rows.length > 0 ? parseInt(res.rows[0].total_count, 10) : 0;
      const parents = res.rows.map(({ total_count, ...row }) => row);
      return { parents, total };
    }

    // SQLite
    const conditions = [];
    const values = [];

    if (schoolId) {
      conditions.push(`(p.school_id = ? OR p.school_id IS NULL)`);
      values.push(schoolId);
    }

    if (status && status !== 'all') {
      conditions.push(`COALESCE(p.status, 'active') = ?`);
      values.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(`(
        u.name LIKE ? OR 
        u.username LIKE ? OR 
        COALESCE(p.workplace, '') LIKE ? OR
        COALESCE(p.occupation, '') LIKE ?
      )`);
      values.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const totalQuery = `
      SELECT COUNT(*) as count
      FROM parents p
      JOIN users u ON p.user_id = u.id
      ${whereClause}
    `;
    const total = db.prepare(totalQuery).get(...values)?.count || 0;

    const listQuery = `
      SELECT p.*, u.name, u.username, u.avatar, u.email as account_email, u.phone as account_phone,
             (SELECT COUNT(*) FROM parent_students ps WHERE ps.parent_id = p.id) as children_count
      FROM parents p
      JOIN users u ON p.user_id = u.id
      ${whereClause}
      ORDER BY u.name ASC
      LIMIT ? OFFSET ?
    `;
    const parents = db.prepare(listQuery).all(...values, limit, offset);
    return { parents, total };
  },

  async createParent(data) {
    const {
      id = `prt_${Date.now()}`,
      userId,
      schoolId = 'sch_bacau',
      occupation = '',
      workplace = '',
      contactPhone = null,
      contactEmail = null,
      status = 'active',
    } = data;

    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO parents (id, user_id, school_id, occupation, workplace, contact_phone, contact_email, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
          school_id = EXCLUDED.school_id,
          occupation = EXCLUDED.occupation,
          workplace = EXCLUDED.workplace,
          contact_phone = EXCLUDED.contact_phone,
          contact_email = EXCLUDED.contact_email,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
      `, [id, userId, schoolId, occupation, workplace, contactPhone, contactEmail, status]);
      return this.findParentById(id);
    }

    db.prepare(`
      INSERT OR REPLACE INTO parents (id, user_id, school_id, occupation, workplace, contact_phone, contact_email, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, userId, schoolId, occupation, workplace, contactPhone, contactEmail, status);
    return this.findParentById(id);
  },

  async updateParent(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = [
      ['occupation', 'occupation'],
      ['workplace', 'workplace'],
      ['contactPhone', 'contact_phone'],
      ['contactEmail', 'contact_email'],
      ['status', 'status'],
    ];

    for (const [key, col] of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${col} = $${idx}`);
        values.push(data[key]);
        idx++;
      }
    }

    if (fields.length === 0) return this.findParentById(id);

    if (isPostgresConfigured()) {
      values.push(id);
      await pgQuery(`
        UPDATE parents
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${idx} OR user_id = $${idx}
      `, values);
      return this.findParentById(id);
    }

    const sqliteFields = fields.map((f) => f.replace(/\$\d+/, '?'));
    values.push(id, id);
    db.prepare(`
      UPDATE parents
      SET ${sqliteFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR user_id = ?
    `).run(...values);

    return this.findParentById(id);
  },

  async findParentChildren(parentUserId, schoolId = null) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT s.*, u.name, u.code, u.avatar,
               COALESCE(c.name, ec.name) as class_name,
               ps.relationship, ps.is_primary_contact, ps.is_verified
        FROM parent_students ps
        JOIN parents p ON ps.parent_id = p.id
        JOIN students s ON ps.student_id = s.id
        JOIN users u ON s.user_id = u.id
        LEFT JOIN classes c ON s.current_class_id = c.id OR s.class_id = c.id
        LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = true
        LEFT JOIN classes ec ON ce.class_id = ec.id
        WHERE p.user_id = $1
          AND ($2::varchar IS NULL OR s.school_id = $2 OR s.school_id IS NULL)
        ORDER BY s.id ASC
      `, [parentUserId, schoolId]);
      return res.rows;
    }

    return db.prepare(`
      SELECT s.*, u.name, u.code, u.avatar,
             COALESCE(c.name, ec.name) as class_name,
             ps.relationship, ps.is_primary_contact, ps.is_verified
      FROM parent_students ps
      JOIN parents p ON ps.parent_id = p.id
      JOIN students s ON ps.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.current_class_id = c.id OR s.class_id = c.id
      LEFT JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = 1
      LEFT JOIN classes ec ON ce.class_id = ec.id
      WHERE p.user_id = ?
        AND (? IS NULL OR s.school_id = ? OR s.school_id IS NULL)
      ORDER BY s.id ASC
    `).all(parentUserId, schoolId, schoolId);
  },

  async checkParentStudentAccess(parentUserId, studentId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT ps.id, ps.is_verified, ps.relationship
        FROM parent_students ps
        JOIN parents p ON ps.parent_id = p.id
        WHERE p.user_id = $1 AND ps.student_id = $2
      `, [parentUserId, studentId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT ps.id, ps.is_verified, ps.relationship
      FROM parent_students ps
      JOIN parents p ON ps.parent_id = p.id
      WHERE p.user_id = ? AND ps.student_id = ?
    `).get(parentUserId, studentId) || null;
  },
};
