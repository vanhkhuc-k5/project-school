/**
 * Academic Structure Module Repository
 * Database access layer for Departments, Subjects, and Classes
 * supporting both Neon Cloud PostgreSQL and SQLite.
 */

import { isPostgresConfigured, pgQuery } from '../../shared/database/index.js';
import { db } from '../../db.js';

export const academicStructureRepository = {
  // ========================================================================
  // 1. DEPARTMENTS
  // ========================================================================
  async findDepartments(schoolId, query = {}) {
    const { search } = query;

    if (isPostgresConfigured()) {
      let sql = `
        SELECT d.*, u.name as head_teacher_name,
               (SELECT COUNT(*) FROM teachers t WHERE t.department_id = d.id) as teacher_count,
               (SELECT COUNT(*) FROM subjects s WHERE s.department_id = d.id) as subject_count
        FROM departments d
        LEFT JOIN users u ON d.head_teacher_id = u.id
        WHERE d.school_id = $1
      `;
      const params = [schoolId];

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        sql += ` AND (LOWER(d.name) LIKE $${params.length} OR LOWER(COALESCE(d.code, '')) LIKE $${params.length})`;
      }

      sql += ` ORDER BY d.name ASC`;
      const res = await pgQuery(sql, params);
      return res.rows;
    }

    let sql = `
      SELECT d.*, u.name as head_teacher_name,
             (SELECT COUNT(*) FROM teachers t WHERE t.department_id = d.id) as teacher_count,
             (SELECT COUNT(*) FROM subjects s WHERE s.department_id = d.id) as subject_count
      FROM departments d
      LEFT JOIN users u ON d.head_teacher_id = u.id
      WHERE d.school_id = ?
    `;
    const params = [schoolId];

    if (search) {
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(d.name) LIKE ? OR LOWER(COALESCE(d.code, '')) LIKE ?)`;
    }

    sql += ` ORDER BY d.name ASC`;
    return db.prepare(sql).all(...params);
  },

  async findDepartmentById(id, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT d.*, u.name as head_teacher_name,
               (SELECT COUNT(*) FROM teachers t WHERE t.department_id = d.id) as teacher_count,
               (SELECT COUNT(*) FROM subjects s WHERE s.department_id = d.id) as subject_count
        FROM departments d
        LEFT JOIN users u ON d.head_teacher_id = u.id
        WHERE d.id = $1 AND ($2::text IS NULL OR d.school_id = $2)
      `, [id, schoolId || null]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT d.*, u.name as head_teacher_name,
             (SELECT COUNT(*) FROM teachers t WHERE t.department_id = d.id) as teacher_count,
             (SELECT COUNT(*) FROM subjects s WHERE s.department_id = d.id) as subject_count
      FROM departments d
      LEFT JOIN users u ON d.head_teacher_id = u.id
      WHERE d.id = ? AND (? IS NULL OR d.school_id = ?)
    `).get(id, schoolId || null, schoolId || null) || null;
  },

  async findDepartmentByCode(schoolId, code) {
    if (!code) return null;
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM departments WHERE school_id = $1 AND LOWER(code) = LOWER($2)
      `, [schoolId, code]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT * FROM departments WHERE school_id = ? AND LOWER(code) = LOWER(?)
    `).get(schoolId, code) || null;
  },

  async findDepartmentByName(schoolId, name) {
    if (!name) return null;
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM departments WHERE school_id = $1 AND LOWER(name) = LOWER($2)
      `, [schoolId, name]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT * FROM departments WHERE school_id = ? AND LOWER(name) = LOWER(?)
    `).get(schoolId, name) || null;
  },

  async createDepartment(data) {
    const { id, schoolId, name, code, description, headTeacherId } = data;
    const deptId = id || `dept_${Date.now()}`;

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO departments (id, school_id, name, code, description, head_teacher_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [deptId, schoolId, name, code || null, description || null, headTeacherId || null]);
      return res.rows[0];
    }

    db.prepare(`
      INSERT INTO departments (id, school_id, name, code, description, head_teacher_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(deptId, schoolId, name, code || null, description || null, headTeacherId || null);

    return this.findDepartmentById(deptId, schoolId);
  },

  async updateDepartment(id, schoolId, data) {
    const { name, code, description, headTeacherId } = data;

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        UPDATE departments
        SET name = COALESCE($1, name),
            code = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE code END,
            description = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE description END,
            head_teacher_id = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE head_teacher_id END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5 AND school_id = $6
        RETURNING *
      `, [name || null, code !== undefined ? code : null, description !== undefined ? description : null, headTeacherId !== undefined ? headTeacherId : null, id, schoolId]);
      return res.rows[0] || null;
    }

    db.prepare(`
      UPDATE departments
      SET name = COALESCE(?, name),
          code = CASE WHEN ? IS NOT NULL THEN ? ELSE code END,
          description = CASE WHEN ? IS NOT NULL THEN ? ELSE description END,
          head_teacher_id = CASE WHEN ? IS NOT NULL THEN ? ELSE head_teacher_id END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND school_id = ?
    `).run(
      name || null,
      code !== undefined ? code : null, code !== undefined ? code : null,
      description !== undefined ? description : null, description !== undefined ? description : null,
      headTeacherId !== undefined ? headTeacherId : null, headTeacherId !== undefined ? headTeacherId : null,
      id, schoolId
    );

    return this.findDepartmentById(id, schoolId);
  },

  async deleteDepartment(id, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        DELETE FROM departments WHERE id = $1 AND school_id = $2 RETURNING id
      `, [id, schoolId]);
      return res.rowCount > 0;
    }

    const info = db.prepare(`DELETE FROM departments WHERE id = ? AND school_id = ?`).run(id, schoolId);
    return info.changes > 0;
  },

  async getDepartmentMemberCounts(id) {
    if (isPostgresConfigured()) {
      const tRes = await pgQuery(`SELECT COUNT(*) as count FROM teachers WHERE department_id = $1`, [id]);
      const sRes = await pgQuery(`SELECT COUNT(*) as count FROM subjects WHERE department_id = $1`, [id]);
      return {
        teacherCount: parseInt(tRes.rows[0]?.count || '0', 10),
        subjectCount: parseInt(sRes.rows[0]?.count || '0', 10),
      };
    }

    const teacherCount = db.prepare(`SELECT COUNT(*) as count FROM teachers WHERE department_id = ?`).get(id)?.count || 0;
    const subjectCount = db.prepare(`SELECT COUNT(*) as count FROM subjects WHERE department_id = ?`).get(id)?.count || 0;
    return { teacherCount, subjectCount };
  },

  // ========================================================================
  // 2. SUBJECTS
  // ========================================================================
  async findSubjects(schoolId, query = {}) {
    const { departmentId, gradeLevel, status, search } = query;

    if (isPostgresConfigured()) {
      let sql = `
        SELECT s.*, d.name as department_name,
               (SELECT COUNT(*) FROM teacher_assignments ta WHERE ta.subject_id = s.id) as assignment_count
        FROM subjects s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE (s.school_id = $1 OR s.school_id IS NULL)
      `;
      const params = [schoolId];

      if (departmentId) {
        params.push(departmentId);
        sql += ` AND s.department_id = $${params.length}`;
      }
      if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
        params.push(Number(gradeLevel));
        sql += ` AND (s.grade_level = $${params.length} OR s.grade_level IS NULL OR s.grade_level = 0)`;
      }
      if (status && status !== 'all') {
        params.push(status);
        sql += ` AND s.status = $${params.length}`;
      }
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        sql += ` AND (LOWER(s.name) LIKE $${params.length} OR LOWER(s.code) LIKE $${params.length})`;
      }

      sql += ` ORDER BY s.name ASC`;
      const res = await pgQuery(sql, params);
      return res.rows;
    }

    let sql = `
      SELECT s.*, d.name as department_name,
             (SELECT COUNT(*) FROM teacher_assignments ta WHERE ta.subject_id = s.id) as assignment_count
      FROM subjects s
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE (s.school_id = ? OR s.school_id IS NULL)
    `;
    const params = [schoolId];

    if (departmentId) {
      params.push(departmentId);
      sql += ` AND s.department_id = ?`;
    }
    if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
      params.push(Number(gradeLevel));
      sql += ` AND (s.grade_level = ? OR s.grade_level IS NULL OR s.grade_level = 0)`;
    }
    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND s.status = ?`;
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(s.name) LIKE ? OR LOWER(s.code) LIKE ?)`;
    }

    sql += ` ORDER BY s.name ASC`;
    return db.prepare(sql).all(...params);
  },

  async findSubjectById(id, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT s.*, d.name as department_name,
               (SELECT COUNT(*) FROM teacher_assignments ta WHERE ta.subject_id = s.id) as assignment_count
        FROM subjects s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.id = $1 AND ($2::text IS NULL OR s.school_id = $2 OR s.school_id IS NULL)
      `, [id, schoolId || null]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT s.*, d.name as department_name,
             (SELECT COUNT(*) FROM teacher_assignments ta WHERE ta.subject_id = s.id) as assignment_count
      FROM subjects s
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE s.id = ? AND (? IS NULL OR s.school_id = ? OR s.school_id IS NULL)
    `).get(id, schoolId || null, schoolId || null) || null;
  },

  async findSubjectByCode(schoolId, code) {
    if (!code) return null;
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM subjects WHERE (school_id = $1 OR school_id IS NULL) AND LOWER(code) = LOWER($2)
      `, [schoolId, code]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT * FROM subjects WHERE (school_id = ? OR school_id IS NULL) AND LOWER(code) = LOWER(?)
    `).get(schoolId, code) || null;
  },

  async createSubject(data) {
    const { id, schoolId, name, code, departmentId, gradeLevel, weeklyPeriods, credits, status, description } = data;
    const subId = id || `sub_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO subjects (id, school_id, name, code, department_id, grade_level, weekly_periods, credits, status, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [subId, schoolId, name, code, departmentId || null, gradeLevel || null, weeklyPeriods || 3, credits || 2.0, status || 'active', description || null]);
      return res.rows[0];
    }

    db.prepare(`
      INSERT INTO subjects (id, school_id, name, code, department_id, grade_level, weekly_periods, credits, status, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(subId, schoolId, name, code, departmentId || null, gradeLevel || null, weeklyPeriods || 3, credits || 2.0, status || 'active', description || null);

    return this.findSubjectById(subId, schoolId);
  },

  async updateSubject(id, schoolId, data) {
    const { name, code, departmentId, gradeLevel, weeklyPeriods, credits, status, description } = data;

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        UPDATE subjects
        SET name = COALESCE($1, name),
            code = COALESCE($2, code),
            department_id = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE department_id END,
            grade_level = CASE WHEN $4::integer IS NOT NULL THEN $4 ELSE grade_level END,
            weekly_periods = COALESCE($5, weekly_periods),
            credits = COALESCE($6, credits),
            status = COALESCE($7, status),
            description = CASE WHEN $8::text IS NOT NULL THEN $8 ELSE description END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $9 AND (school_id = $10 OR school_id IS NULL)
        RETURNING *
      `, [
        name || null, code || null, departmentId !== undefined ? departmentId : null,
        gradeLevel !== undefined ? gradeLevel : null, weeklyPeriods || null, credits || null,
        status || null, description !== undefined ? description : null, id, schoolId
      ]);
      return res.rows[0] || null;
    }

    db.prepare(`
      UPDATE subjects
      SET name = COALESCE(?, name),
          code = COALESCE(?, code),
          department_id = CASE WHEN ? IS NOT NULL THEN ? ELSE department_id END,
          grade_level = CASE WHEN ? IS NOT NULL THEN ? ELSE grade_level END,
          weekly_periods = COALESCE(?, weekly_periods),
          credits = COALESCE(?, credits),
          status = COALESCE(?, status),
          description = CASE WHEN ? IS NOT NULL THEN ? ELSE description END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND (school_id = ? OR school_id IS NULL)
    `).run(
      name || null, code || null,
      departmentId !== undefined ? departmentId : null, departmentId !== undefined ? departmentId : null,
      gradeLevel !== undefined ? gradeLevel : null, gradeLevel !== undefined ? gradeLevel : null,
      weeklyPeriods || null, credits || null, status || null,
      description !== undefined ? description : null, description !== undefined ? description : null,
      id, schoolId
    );

    return this.findSubjectById(id, schoolId);
  },

  async deleteSubject(id, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        DELETE FROM subjects WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) RETURNING id
      `, [id, schoolId]);
      return res.rowCount > 0;
    }

    const info = db.prepare(`DELETE FROM subjects WHERE id = ? AND (school_id = ? OR school_id IS NULL)`).run(id, schoolId);
    return info.changes > 0;
  },

  async getSubjectUsageCount(id) {
    if (isPostgresConfigured()) {
      const taRes = await pgQuery(`SELECT COUNT(*) as count FROM teacher_assignments WHERE subject_id = $1`, [id]);
      return {
        assignmentCount: parseInt(taRes.rows[0]?.count || '0', 10),
      };
    }

    const assignmentCount = db.prepare(`SELECT COUNT(*) as count FROM teacher_assignments WHERE subject_id = ?`).get(id)?.count || 0;
    return { assignmentCount };
  },

  // ========================================================================
  // 3. CLASSES
  // ========================================================================
  async findClasses(schoolId, query = {}) {
    const { academicYearId, gradeLevel, status, search } = query;

    if (isPostgresConfigured()) {
      let sql = `
        SELECT c.*, u.name as homeroom_teacher_name, ay.name as academic_year_name,
               (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.is_current = TRUE AND ce.status = 'enrolled') as student_count,
               (SELECT ROUND(AVG(s.gpa)::numeric, 2) FROM class_enrollments ce JOIN students s ON ce.student_id = s.id WHERE ce.class_id = c.id AND ce.is_current = TRUE AND ce.status = 'enrolled') as avg_gpa
        FROM classes c
        LEFT JOIN users u ON c.homeroom_teacher_id = u.id
        LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
        WHERE (c.school_id = $1 OR c.school_id IS NULL)
      `;
      const params = [schoolId];

      if (academicYearId) {
        params.push(academicYearId);
        sql += ` AND (c.academic_year_id = $${params.length} OR c.academic_year = $${params.length})`;
      }
      if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
        params.push(Number(gradeLevel));
        sql += ` AND c.grade_level = $${params.length}`;
      }
      if (status && status !== 'all') {
        params.push(status);
        sql += ` AND c.status = $${params.length}`;
      }
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        sql += ` AND (LOWER(c.name) LIKE $${params.length} OR LOWER(COALESCE(c.room, '')) LIKE $${params.length} OR LOWER(COALESCE(u.name, '')) LIKE $${params.length})`;
      }

      sql += ` ORDER BY c.grade_level ASC, c.name ASC`;
      const res = await pgQuery(sql, params);
      return res.rows;
    }

    let sql = `
      SELECT c.*, u.name as homeroom_teacher_name, ay.name as academic_year_name,
             (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.is_current = 1 AND ce.status = 'enrolled') as student_count,
             (SELECT ROUND(AVG(s.gpa), 2) FROM class_enrollments ce JOIN students s ON ce.student_id = s.id WHERE ce.class_id = c.id AND ce.is_current = 1 AND ce.status = 'enrolled') as avg_gpa
      FROM classes c
      LEFT JOIN users u ON c.homeroom_teacher_id = u.id
      LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
      WHERE (c.school_id = ? OR c.school_id IS NULL)
    `;
    const params = [schoolId];

    if (academicYearId) {
      params.push(academicYearId, academicYearId);
      sql += ` AND (c.academic_year_id = ? OR c.academic_year = ?)`;
    }
    if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '') {
      params.push(Number(gradeLevel));
      sql += ` AND c.grade_level = ?`;
    }
    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND c.status = ?`;
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(c.name) LIKE ? OR LOWER(COALESCE(c.room, '')) LIKE ? OR LOWER(COALESCE(u.name, '')) LIKE ?)`;
    }

    sql += ` ORDER BY c.grade_level ASC, c.name ASC`;
    return db.prepare(sql).all(...params);
  },

  async findClassById(id, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT c.*, u.name as homeroom_teacher_name, ay.name as academic_year_name,
               (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.is_current = TRUE AND ce.status = 'enrolled') as student_count,
               (SELECT ROUND(AVG(s.gpa)::numeric, 2) FROM class_enrollments ce JOIN students s ON ce.student_id = s.id WHERE ce.class_id = c.id AND ce.is_current = TRUE AND ce.status = 'enrolled') as avg_gpa
        FROM classes c
        LEFT JOIN users u ON c.homeroom_teacher_id = u.id
        LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
        WHERE c.id = $1 AND ($2::text IS NULL OR c.school_id = $2 OR c.school_id IS NULL)
      `, [id, schoolId || null]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT c.*, u.name as homeroom_teacher_name, ay.name as academic_year_name,
             (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id AND ce.is_current = 1 AND ce.status = 'enrolled') as student_count,
             (SELECT ROUND(AVG(s.gpa), 2) FROM class_enrollments ce JOIN students s ON ce.student_id = s.id WHERE ce.class_id = c.id AND ce.is_current = 1 AND ce.status = 'enrolled') as avg_gpa
      FROM classes c
      LEFT JOIN users u ON c.homeroom_teacher_id = u.id
      LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
      WHERE c.id = ? AND (? IS NULL OR c.school_id = ? OR c.school_id IS NULL)
    `).get(id, schoolId || null, schoolId || null) || null;
  },

  async findClassByNameAndYear(schoolId, name, academicYearId, academicYear) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM classes
        WHERE school_id = $1
          AND LOWER(name) = LOWER($2)
          AND (
            ($3::text IS NOT NULL AND academic_year_id = $3) OR
            ($4::text IS NOT NULL AND academic_year = $4)
          )
      `, [schoolId, name, academicYearId || null, academicYear || null]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT * FROM classes
      WHERE school_id = ?
        AND LOWER(name) = LOWER(?)
        AND (
          (? IS NOT NULL AND academic_year_id = ?) OR
          (? IS NOT NULL AND academic_year = ?)
        )
    `).get(schoolId, name, academicYearId || null, academicYearId || null, academicYear || null, academicYear || null) || null;
  },

  async createClass(data) {
    const { id, schoolId, name, gradeLevel, academicYearId, academicYear, homeroomTeacherId, room, maxCapacity, status } = data;
    const classId = id || `cls_${Date.now()}`;
    const yearStr = academicYear || (academicYearId ? academicYearId.replace('ay_', '').replace('_', '-') : '2024-2025');

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO classes (id, school_id, name, grade_level, academic_year_id, academic_year, homeroom_teacher_id, room, max_capacity, max_students, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10)
        RETURNING *
      `, [
        classId, schoolId, name, gradeLevel,
        academicYearId || null, yearStr,
        homeroomTeacherId || null, room || null,
        maxCapacity || 45, status || 'active'
      ]);
      return res.rows[0];
    }

    db.prepare(`
      INSERT INTO classes (id, school_id, name, grade_level, academic_year_id, academic_year, homeroom_teacher_id, room, max_capacity, max_students, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      classId, schoolId, name, gradeLevel,
      academicYearId || null, yearStr,
      homeroomTeacherId || null, room || null,
      maxCapacity || 45, maxCapacity || 45, status || 'active'
    );

    return this.findClassById(classId, schoolId);
  },

  async updateClass(id, schoolId, data) {
    const { name, gradeLevel, academicYearId, academicYear, homeroomTeacherId, room, maxCapacity, status } = data;

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        UPDATE classes
        SET name = COALESCE($1, name),
            grade_level = COALESCE($2, grade_level),
            academic_year_id = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE academic_year_id END,
            academic_year = COALESCE($4, academic_year),
            homeroom_teacher_id = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE homeroom_teacher_id END,
            room = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE room END,
            max_capacity = COALESCE($7, max_capacity),
            max_students = COALESCE($7, max_students),
            status = COALESCE($8, status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $9 AND (school_id = $10 OR school_id IS NULL)
        RETURNING *
      `, [
        name || null, gradeLevel || null,
        academicYearId !== undefined ? academicYearId : null, academicYear || null,
        homeroomTeacherId !== undefined ? homeroomTeacherId : null,
        room !== undefined ? room : null, maxCapacity || null, status || null,
        id, schoolId
      ]);
      return res.rows[0] || null;
    }

    db.prepare(`
      UPDATE classes
      SET name = COALESCE(?, name),
          grade_level = COALESCE(?, grade_level),
          academic_year_id = CASE WHEN ? IS NOT NULL THEN ? ELSE academic_year_id END,
          academic_year = COALESCE(?, academic_year),
          homeroom_teacher_id = CASE WHEN ? IS NOT NULL THEN ? ELSE homeroom_teacher_id END,
          room = CASE WHEN ? IS NOT NULL THEN ? ELSE room END,
          max_capacity = COALESCE(?, max_capacity),
          max_students = COALESCE(?, max_students),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND (school_id = ? OR school_id IS NULL)
    `).run(
      name || null, gradeLevel || null,
      academicYearId !== undefined ? academicYearId : null, academicYearId !== undefined ? academicYearId : null,
      academicYear || null,
      homeroomTeacherId !== undefined ? homeroomTeacherId : null, homeroomTeacherId !== undefined ? homeroomTeacherId : null,
      room !== undefined ? room : null, room !== undefined ? room : null,
      maxCapacity || null, maxCapacity || null, status || null,
      id, schoolId
    );

    return this.findClassById(id, schoolId);
  },

  async deleteClass(id, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        DELETE FROM classes WHERE id = $1 AND (school_id = $2 OR school_id IS NULL) RETURNING id
      `, [id, schoolId]);
      return res.rowCount > 0;
    }

    const info = db.prepare(`DELETE FROM classes WHERE id = ? AND (school_id = ? OR school_id IS NULL)`).run(id, schoolId);
    return info.changes > 0;
  },

  async getClassDependenciesCount(id) {
    if (isPostgresConfigured()) {
      const sRes = await pgQuery(`SELECT COUNT(*) as count FROM students WHERE class_id = $1 OR current_class_id = $1`, [id]);
      const ceRes = await pgQuery(`SELECT COUNT(*) as count FROM class_enrollments WHERE class_id = $1`, [id]);
      const taRes = await pgQuery(`SELECT COUNT(*) as count FROM teacher_assignments WHERE class_id = $1`, [id]);
      return {
        studentCount: Math.max(parseInt(sRes.rows[0]?.count || '0', 10), parseInt(ceRes.rows[0]?.count || '0', 10)),
        assignmentCount: parseInt(taRes.rows[0]?.count || '0', 10),
      };
    }

    const sCount = db.prepare(`SELECT COUNT(*) as count FROM students WHERE class_id = ? OR current_class_id = ?`).get(id, id)?.count || 0;
    const ceCount = db.prepare(`SELECT COUNT(*) as count FROM class_enrollments WHERE class_id = ?`).get(id)?.count || 0;
    const taCount = db.prepare(`SELECT COUNT(*) as count FROM teacher_assignments WHERE class_id = ?`).get(id)?.count || 0;
    return {
      studentCount: Math.max(sCount, ceCount),
      assignmentCount: taCount,
    };
  },

  async getClassEnrolledStudents(classId, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT s.id as student_id, s.user_id, s.student_code, s.gpa, s.attendance_rate,
               s.enrollment_status, s.dob, s.gender,
               u.name, u.email, u.phone, u.avatar, u.code as user_code,
               ce.id as enrollment_id, ce.enrollment_date, ce.status as enrollment_status_record
        FROM class_enrollments ce
        JOIN students s ON ce.student_id = s.id
        JOIN users u ON s.user_id = u.id
        WHERE ce.class_id = $1
          AND ce.is_current = TRUE
          AND ce.status = 'enrolled'
          AND ($2::text IS NULL OR ce.school_id = $2 OR ce.school_id IS NULL)
        ORDER BY u.name ASC
      `, [classId, schoolId || null]);

      // Attach guardian summary
      const students = res.rows;
      for (const st of students) {
        const pRes = await pgQuery(`
          SELECT ps.relationship, ps.is_primary_contact,
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

    const students = db.prepare(`
      SELECT s.id as student_id, s.user_id, s.student_code, s.gpa, s.attendance_rate,
             s.enrollment_status, s.dob, s.gender,
             u.name, u.email, u.phone, u.avatar, u.code as user_code,
             ce.id as enrollment_id, ce.enrollment_date, ce.status as enrollment_status_record
      FROM class_enrollments ce
      JOIN students s ON ce.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE ce.class_id = ?
        AND ce.is_current = 1
        AND ce.status = 'enrolled'
        AND (? IS NULL OR ce.school_id = ? OR ce.school_id IS NULL)
      ORDER BY u.name ASC
    `).all(classId, schoolId || null, schoolId || null);

    for (const st of students) {
      st.guardians = db.prepare(`
        SELECT ps.relationship, ps.is_primary_contact,
               pu.name as parent_name, pu.email as parent_email, p.contact_phone
        FROM parent_students ps
        JOIN parents p ON ps.parent_id = p.id
        JOIN users pu ON p.user_id = pu.id
        WHERE ps.student_id = ?
      `).all(st.student_id);
    }
    return students;
  },
};
