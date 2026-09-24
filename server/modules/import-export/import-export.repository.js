// =============================================================================
// Import/Export Repository — Database Operations
// G35 — Safe Data Import/Export
// =============================================================================
import bcrypt from 'bcryptjs';
import { isPostgresConfigured, pgQuery, withTransaction } from '../../shared/database/index.js';
import { db } from '../../db.js';
import { AppError } from '../../shared/errors/index.js';
import { DUPLICATE_STRATEGIES } from './import-export.types.js';

export const importExportRepository = {
  // ===========================================================================
  // STUDENT IMPORT OPERATIONS
  // ===========================================================================

  /**
   * Find student by email
   */
  async findStudentByEmail(email, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT s.*, u.email, u.name, u.phone, u.school_id
        FROM students s
        JOIN users u ON s.user_id = u.id
        WHERE LOWER(u.email) = LOWER($1) AND u.school_id = $2
      `, [email, schoolId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT s.*, u.email, u.name, u.phone, u.school_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE LOWER(u.email) = LOWER(?) AND u.school_id = ?
    `).get(email, schoolId) || null;
  },

  /**
   * Find student by code
   */
  async findStudentByCode(studentCode, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT s.*, u.email, u.name, u.phone, u.school_id
        FROM students s
        JOIN users u ON s.user_id = u.id
        WHERE s.student_code = $1 AND u.school_id = $2
      `, [studentCode, schoolId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT s.*, u.email, u.name, u.phone, u.school_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.student_code = ? AND u.school_id = ?
    `).get(studentCode, schoolId) || null;
  },

  /**
   * Find user by email
   */
  async findUserByEmail(email, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND school_id = $2
      `, [email, schoolId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND school_id = ?
    `).get(email, schoolId) || null;
  },

  /**
   * Create student with user account
   */
  async createStudent(data, client = null) {
    const {
      schoolId,
      email,
      password,
      name,
      phone,
      dateOfBirth,
      gender,
      address,
      studentCode,
      gradeLevel,
      classId,
      parentName,
      parentPhone,
      parentEmail,
      relationship,
    } = data;

    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const studentId = `std_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const hashedPassword = password 
      ? await bcrypt.hash(password, 10)
      : await bcrypt.hash('ChangeMe123!', 10);

    const queryFn = client 
      ? (sql, params) => client.query(sql, params)
      : (isPostgresConfigured() ? pgQuery : (sql, params) => Promise.resolve(db.prepare(sql).run(...params)));

    const execQuery = async (sql, params) => {
      if (client) {
        return client.query(sql, params);
      }
      if (isPostgresConfigured()) {
        return pgQuery(sql, params);
      }
      return db.prepare(sql).run(...params);
    };

    // Create user account
    await execQuery(`
      INSERT INTO users (id, email, password_hash, name, phone, role, school_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'student', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [userId, email.toLowerCase(), hashedPassword, name, phone || null, schoolId]);

    // Create student profile
    await execQuery(`
      INSERT INTO students (id, user_id, student_code, grade_level, date_of_birth, gender, address, school_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [studentId, userId, studentCode || null, gradeLevel || null, dateOfBirth || null, gender || null, address || null, schoolId]);

    // Create parent link if provided
    if (parentName || parentEmail || parentPhone) {
      await this.createParentAndLink(studentId, schoolId, {
        name: parentName,
        email: parentEmail,
        phone: parentPhone,
        relationship,
      }, client);
    }

    // Enroll in class if provided
    if (classId) {
      await this.enrollStudentInClass(studentId, classId, schoolId, client);
    }

    return {
      id: studentId,
      userId,
      email: email.toLowerCase(),
      name,
      studentCode,
      gradeLevel,
      created: true,
    };
  },

  /**
   * Create parent account and link to student
   */
  async createParentAndLink(studentId, schoolId, parentData, client = null) {
    const { name, email, phone, relationship } = parentData;
    
    if (!name && !email && !phone) return null;

    const execQuery = async (sql, params) => {
      if (client) {
        return client.query(sql, params);
      }
      if (isPostgresConfigured()) {
        return pgQuery(sql, params);
      }
      return db.prepare(sql).run(...params);
    };

    // Check if parent user exists by email
    let parentUserId = null;
    if (email) {
      const existing = await this.findUserByEmail(email, schoolId);
      if (existing) {
        parentUserId = existing.id;
      }
    }

    // Create parent if doesn't exist
    if (!parentUserId) {
      parentUserId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const defaultPassword = await bcrypt.hash('ChangeMe123!', 10);
      
      await execQuery(`
        INSERT INTO users (id, email, password_hash, name, phone, role, school_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'parent', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [parentUserId, (email || '').toLowerCase() || null, defaultPassword, name || 'Phụ huynh', phone || null, schoolId]);
    }

    // Create parent record
    const parentId = `par_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await execQuery(`
      INSERT INTO parents (id, user_id, relationship_type, school_id, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [parentId, parentUserId, relationship || 'mother', schoolId]);

    // Link parent to student
    const linkId = `pls_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await execQuery(`
      INSERT INTO parent_students (id, parent_id, student_id, relationship, is_active, created_at)
      VALUES ($1, $2, $3, $4, TRUE, CURRENT_TIMESTAMP)
    `, [linkId, parentId, studentId, relationship || 'mother']);

    return { parentId, parentUserId, linked: true };
  },

  /**
   * Enroll student in class
   */
  async enrollStudentInClass(studentId, classId, schoolId, academicYearId = null, client = null) {
    const execQuery = async (sql, params) => {
      if (client) {
        return client.query(sql, params);
      }
      if (isPostgresConfigured()) {
        return pgQuery(sql, params);
      }
      return db.prepare(sql).run(...params);
    };

    // Get current academic year if not provided
    if (!academicYearId) {
      const yearRes = await pgQuery(`
        SELECT id FROM academic_years WHERE school_id = $1 AND is_current = TRUE LIMIT 1
      `, [schoolId]);
      academicYearId = yearRes.rows[0]?.id || null;
    }

    // Check if enrollment exists
    const existingRes = await execQuery(`
      SELECT id FROM class_enrollments 
      WHERE student_id = $1 AND class_id = $2 AND is_current = TRUE
    `, [studentId, classId]);

    if (existingRes.rows?.length > 0 || (Array.isArray(existingRes) && existingRes.length > 0)) {
      return { enrolled: false, reason: 'already_enrolled' };
    }

    const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await execQuery(`
      INSERT INTO class_enrollments (id, student_id, class_id, academic_year_id, enrolled_at, status, is_current, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_DATE, 'enrolled', TRUE, CURRENT_TIMESTAMP)
    `, [enrollmentId, studentId, classId, academicYearId]);

    return { enrolled: true, enrollmentId };
  },

  /**
   * Get class by ID
   */
  async findClassById(classId, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM classes WHERE id = $1 AND school_id = $2
      `, [classId, schoolId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT * FROM classes WHERE id = ? AND school_id = ?
    `).get(classId, schoolId) || null;
  },

  // ===========================================================================
  // TEACHER IMPORT OPERATIONS
  // ===========================================================================

  /**
   * Find teacher by email
   */
  async findTeacherByEmail(email, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT t.*, u.email, u.name, u.phone, u.school_id
        FROM teachers t
        JOIN users u ON t.user_id = u.id
        WHERE LOWER(u.email) = LOWER($1) AND u.school_id = $2
      `, [email, schoolId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT t.*, u.email, u.name, u.phone, u.school_id
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE LOWER(u.email) = LOWER(?) AND u.school_id = ?
    `).get(email, schoolId) || null;
  },

  /**
   * Find teacher by employee code
   */
  async findTeacherByEmployeeCode(employeeCode, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT t.*, u.email, u.name, u.phone, u.school_id
        FROM teachers t
        JOIN users u ON t.user_id = u.id
        WHERE t.employee_code = $1 AND u.school_id = $2
      `, [employeeCode, schoolId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT t.*, u.email, u.name, u.phone, u.school_id
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE t.employee_code = ? AND u.school_id = ?
    `).get(employeeCode, schoolId) || null;
  },

  /**
   * Create teacher with user account
   */
  async createTeacher(data, client = null) {
    const {
      schoolId,
      email,
      password,
      name,
      phone,
      dateOfBirth,
      gender,
      address,
      employeeCode,
      departmentId,
      subjects,
      isHomeroom,
      qualifications,
    } = data;

    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const teacherId = `tch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const hashedPassword = password 
      ? await bcrypt.hash(password, 10)
      : await bcrypt.hash('ChangeMe123!', 10);

    const execQuery = async (sql, params) => {
      if (client) {
        return client.query(sql, params);
      }
      if (isPostgresConfigured()) {
        return pgQuery(sql, params);
      }
      return db.prepare(sql).run(...params);
    };

    // Create user account
    await execQuery(`
      INSERT INTO users (id, email, password_hash, name, phone, role, school_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'teacher', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [userId, email.toLowerCase(), hashedPassword, name, phone || null, schoolId]);

    // Create teacher profile
    await execQuery(`
      INSERT INTO teachers (id, user_id, employee_code, department_id, qualifications, school_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [teacherId, userId, employeeCode || null, departmentId || null, qualifications || null, schoolId]);

    // Set as homeroom teacher if requested
    if (isHomeroom && departmentId) {
      // Find a class in the department to assign as homeroom
      const classRes = await execQuery(`
        SELECT id FROM classes WHERE school_id = $1 LIMIT 1
      `, [schoolId]);
      if (classRes.rows?.length > 0 || (Array.isArray(classRes) && classRes.length > 0)) {
        const classRow = classRes.rows?.[0] || classRes[0];
        await execQuery(`
          UPDATE classes SET homeroom_teacher_id = $1 WHERE id = $2
        `, [teacherId, classRow.id]);
      }
    }

    return {
      id: teacherId,
      userId,
      email: email.toLowerCase(),
      name,
      employeeCode,
      created: true,
    };
  },

  /**
   * Find department by ID
   */
  async findDepartmentById(departmentId, schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM departments WHERE id = $1 AND school_id = $2
      `, [departmentId, schoolId]);
      return res.rows[0] || null;
    }

    return db.prepare(`
      SELECT * FROM departments WHERE id = ? AND school_id = ?
    `).get(departmentId, schoolId) || null;
  },

  // ===========================================================================
  // ENROLLMENT IMPORT OPERATIONS
  // ===========================================================================

  /**
   * Find student by email for enrollment
   */
  async findStudentForEnrollment(email, schoolId) {
    return this.findStudentByEmail(email, schoolId);
  },

  /**
   * Bulk enrollment operation
   */
  async bulkEnroll(dataArray, schoolId, client = null) {
    const results = [];

    for (const data of dataArray) {
      const { studentEmail, classId, academicYearId, enrollmentDate, status } = data;
      
      // Find student
      const student = await this.findStudentForEnrollment(studentEmail, schoolId);
      if (!student) {
        results.push({
          email: studentEmail,
          classId,
          success: false,
          reason: 'STUDENT_NOT_FOUND',
          message: `Không tìm thấy học sinh với email: ${studentEmail}`,
        });
        continue;
      }

      // Check class
      const classObj = await this.findClassById(classId, schoolId);
      if (!classObj) {
        results.push({
          email: studentEmail,
          classId,
          success: false,
          reason: 'CLASS_NOT_FOUND',
          message: `Không tìm thấy lớp học: ${classId}`,
        });
        continue;
      }

      // Enroll
      const enrollResult = await this.enrollStudentInClass(
        student.id,
        classId,
        schoolId,
        academicYearId,
        client
      );

      if (enrollResult.enrolled) {
        results.push({
          email: studentEmail,
          studentId: student.id,
          classId,
          success: true,
          enrollmentId: enrollResult.enrollmentId,
        });
      } else {
        results.push({
          email: studentEmail,
          classId,
          success: false,
          reason: enrollResult.reason,
          message: enrollResult.reason === 'already_enrolled' 
            ? `Học sinh đã được ghi danh vào lớp khác`
            : 'Lỗi khi ghi danh',
        });
      }
    }

    return results;
  },

  // ===========================================================================
  // EXPORT QUERIES
  // ===========================================================================

  /**
   * Export students query
   */
  async exportStudents(schoolId, filters = {}) {
    const { academicYearId, classId, gradeLevel, includeInactive } = filters;
    let whereClause = 'WHERE u.school_id = $1';
    const params = [schoolId];
    let paramIndex = 2;

    if (gradeLevel) {
      params.push(gradeLevel);
      whereClause += ` AND s.grade_level = $${paramIndex++}`;
    }

    if (classId) {
      params.push(classId);
      whereClause += ` AND EXISTS (
        SELECT 1 FROM class_enrollments ce 
        WHERE ce.student_id = s.id AND ce.class_id = $${paramIndex++} AND ce.is_current = TRUE
      )`;
    }

    if (!includeInactive) {
      whereClause += ` AND s.status = 'active'`;
    }

    const sql = `
      SELECT 
        s.id,
        s.student_code,
        u.email,
        u.name,
        u.phone,
        s.grade_level,
        s.date_of_birth,
        s.gender,
        s.address,
        s.status,
        s.created_at
      FROM students s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY u.name ASC
    `;

    if (isPostgresConfigured()) {
      const res = await pgQuery(sql, params);
      return res.rows;
    }

    return db.prepare(sql).all(...params);
  },

  /**
   * Export teachers query
   */
  async exportTeachers(schoolId, filters = {}) {
    const { departmentId } = filters;
    let whereClause = 'WHERE u.school_id = $1';
    const params = [schoolId];
    let paramIndex = 2;

    if (departmentId) {
      params.push(departmentId);
      whereClause += ` AND t.department_id = $${paramIndex++}`;
    }

    const sql = `
      SELECT 
        t.id,
        t.employee_code,
        u.email,
        u.name,
        u.phone,
        u.address,
        t.qualifications,
        d.name as department_name,
        t.created_at
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN departments d ON t.department_id = d.id
      ${whereClause}
      ORDER BY u.name ASC
    `;

    if (isPostgresConfigured()) {
      const res = await pgQuery(sql, params);
      return res.rows;
    }

    return db.prepare(sql).all(...params);
  },

  /**
   * Export classes query
   */
  async exportClasses(schoolId, filters = {}) {
    const { academicYearId, gradeLevel } = filters;
    let whereClause = 'WHERE c.school_id = $1';
    const params = [schoolId];
    let paramIndex = 2;

    if (gradeLevel) {
      params.push(gradeLevel);
      whereClause += ` AND c.grade_level = $${paramIndex++}`;
    }

    if (academicYearId) {
      params.push(academicYearId);
      whereClause += ` AND EXISTS (
        SELECT 1 FROM class_enrollments ce 
        WHERE ce.class_id = c.id AND ce.academic_year_id = $${paramIndex++}
      )`;
    }

    const sql = `
      SELECT 
        c.id,
        c.name,
        c.grade_level,
        c.capacity,
        c.status,
        u.name as homeroom_teacher_name,
        ay.name as academic_year_name,
        c.created_at
      FROM classes c
      LEFT JOIN users u ON c.homeroom_teacher_id = u.id
      LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
      ${whereClause}
      ORDER BY c.grade_level ASC, c.name ASC
    `;

    if (isPostgresConfigured()) {
      const res = await pgQuery(sql, params);
      return res.rows;
    }

    return db.prepare(sql).all(...params);
  },

  /**
   * Export enrollments query
   */
  async exportEnrollments(schoolId, filters = {}) {
    const { academicYearId, classId, gradeLevel } = filters;
    let whereClause = 'WHERE u.school_id = $1';
    const params = [schoolId];
    let paramIndex = 2;

    if (classId) {
      params.push(classId);
      whereClause += ` AND ce.class_id = $${paramIndex++}`;
    }

    if (gradeLevel) {
      params.push(gradeLevel);
      whereClause += ` AND c.grade_level = $${paramIndex++}`;
    }

    if (academicYearId) {
      params.push(academicYearId);
      whereClause += ` AND ce.academic_year_id = $${paramIndex++}`;
    } else {
      whereClause += ` AND ce.is_current = TRUE`;
    }

    const sql = `
      SELECT 
        ce.id,
        s.student_code,
        u.email,
        u.name,
        c.name as class_name,
        c.grade_level,
        ce.status,
        ce.enrolled_at
      FROM class_enrollments ce
      JOIN students s ON ce.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON ce.class_id = c.id
      ${whereClause}
      ORDER BY c.name ASC, u.name ASC
    `;

    if (isPostgresConfigured()) {
      const res = await pgQuery(sql, params);
      return res.rows;
    }

    return db.prepare(sql).all(...params);
  },

  /**
   * Export grades query
   */
  async exportGrades(schoolId, filters = {}) {
    const { academicYearId, classId, subjectId, dateFrom, dateTo } = filters;
    let whereClause = 'WHERE u.school_id = $1';
    const params = [schoolId];
    let paramIndex = 2;

    if (classId) {
      params.push(classId);
      whereClause += ` AND a.class_id = $${paramIndex++}`;
    }

    if (subjectId) {
      params.push(subjectId);
      whereClause += ` AND a.subject_id = $${paramIndex++}`;
    }

    if (academicYearId) {
      params.push(academicYearId);
      whereClause += ` AND ay.id = $${paramIndex++}`;
    }

    const sql = `
      SELECT 
        g.id,
        s.student_code,
        u.name as student_name,
        c.name as class_name,
        sub.name as subject_name,
        a.title as assignment_title,
        g.score,
        g.max_score,
        g.status,
        g.graded_at
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN assignments a ON g.assignment_id = a.id
      JOIN classes c ON a.class_id = c.id
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN academic_years ay ON c.academic_year_id = ay.id
      ${whereClause}
      ORDER BY g.graded_at DESC
      LIMIT 10000
    `;

    if (isPostgresConfigured()) {
      const res = await pgQuery(sql, params);
      return res.rows;
    }

    return db.prepare(sql).all(...params);
  },

  /**
   * Export attendance query
   */
  async exportAttendance(schoolId, filters = {}) {
    const { academicYearId, classId, dateFrom, dateTo } = filters;
    let whereClause = 'WHERE u.school_id = $1';
    const params = [schoolId];
    let paramIndex = 2;

    if (classId) {
      params.push(classId);
      whereClause += ` AND a.class_id = $${paramIndex++}`;
    }

    if (dateFrom) {
      params.push(dateFrom);
      whereClause += ` AND a.date >= $${paramIndex++}`;
    }

    if (dateTo) {
      params.push(dateTo);
      whereClause += ` AND a.date <= $${paramIndex++}`;
    }

    const sql = `
      SELECT 
        a.id,
        s.student_code,
        u.name as student_name,
        c.name as class_name,
        a.date,
        a.status,
        a.note
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON a.class_id = c.id
      ${whereClause}
      ORDER BY a.date DESC, u.name ASC
      LIMIT 10000
    `;

    if (isPostgresConfigured()) {
      const res = await pgQuery(sql, params);
      return res.rows;
    }

    return db.prepare(sql).all(...params);
  },

  /**
   * Export tuition query
   */
  async exportTuition(schoolId, filters = {}) {
    const { academicYearId, classId, status } = filters;
    let whereClause = 'WHERE u.school_id = $1';
    const params = [schoolId];
    let paramIndex = 2;

    if (classId) {
      params.push(classId);
      whereClause += ` AND EXISTS (
        SELECT 1 FROM class_enrollments ce 
        JOIN students s ON ce.student_id = s.id
        WHERE s.id = ti.student_id AND ce.class_id = $${paramIndex++}
      )`;
    }

    if (academicYearId) {
      params.push(academicYearId);
      whereClause += ` AND ti.academic_year_id = $${paramIndex++}`;
    }

    if (status) {
      params.push(status);
      whereClause += ` AND ti.status = $${paramIndex++}`;
    }

    const sql = `
      SELECT 
        ti.id,
        s.student_code,
        u.name as student_name,
        ti.invoice_number,
        ti.total_amount,
        ti.paid_amount,
        ti.status,
        ti.due_date,
        ti.issued_at
      FROM tuition_invoices ti
      JOIN students s ON ti.student_id = s.id
      JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY ti.issued_at DESC
      LIMIT 10000
    `;

    if (isPostgresConfigured()) {
      const res = await pgQuery(sql, params);
      return res.rows;
    }

    return db.prepare(sql).all(...params);
  },

  // ===========================================================================
  // TEMPLATE DATA
  // ===========================================================================

  /**
   * Get available classes for template dropdown
   */
  async getClassesForTemplate(schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT id, name, grade_level 
        FROM classes 
        WHERE school_id = $1 AND status = 'active'
        ORDER BY grade_level ASC, name ASC
      `, [schoolId]);
      return res.rows;
    }

    return db.prepare(`
      SELECT id, name, grade_level 
      FROM classes 
      WHERE school_id = ? AND status = 'active'
      ORDER BY grade_level ASC, name ASC
    `).all(schoolId);
  },

  /**
   * Get available departments for template
   */
  async getDepartmentsForTemplate(schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT id, name 
        FROM departments 
        WHERE school_id = $1
        ORDER BY name ASC
      `, [schoolId]);
      return res.rows;
    }

    return db.prepare(`
      SELECT id, name 
      FROM departments 
      WHERE school_id = ?
      ORDER BY name ASC
    `).all(schoolId);
  },

  /**
   * Get academic years for template
   */
  async getAcademicYearsForTemplate(schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT id, name 
        FROM academic_years 
        WHERE school_id = $1
        ORDER BY start_date DESC
      `, [schoolId]);
      return res.rows;
    }

    return db.prepare(`
      SELECT id, name 
      FROM academic_years 
      WHERE school_id = ?
      ORDER BY start_date DESC
    `).all(schoolId);
  },
};
