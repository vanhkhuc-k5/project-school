/**
 * Users Module Repository
 * Handles database persistence for user management across PostgreSQL and SQLite.
 */

import { isPostgresConfigured, pgQuery } from '../../shared/database/index.js';
import { db } from '../../db.js';

export const usersRepository = {
  /**
   * Queries paginated users list with search, role and status filtering
   */
  async findUsers({
    page = 1,
    limit = 10,
    search = '',
    role = 'all',
    status = 'all',
    schoolId = null,
    isSuperAdmin = false,
    sortBy = 'created_at',
    sortOrder = 'desc',
  }) {
    const offset = (page - 1) * limit;
    const cleanOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const validSortCols = {
      created_at: 'u.created_at',
      name: 'u.name',
      username: 'u.username',
      code: 'u.code',
    };
    const orderCol = validSortCols[sortBy] || 'u.created_at';

    if (isPostgresConfigured()) {
      const conditions = [];
      const values = [];
      let paramIdx = 1;

      // School scoping
      if (schoolId && !isSuperAdmin) {
        conditions.push(`(u.school_id = $${paramIdx} OR u.school_id IS NULL)`);
        values.push(schoolId);
        paramIdx++;
      }

      // Role filter
      if (role && role !== 'all') {
        if (role === 'admin' || role === 'school_admin') {
          conditions.push(`(u.role = 'admin' OR u.role = 'school_admin')`);
        } else {
          conditions.push(`u.role = $${paramIdx}`);
          values.push(role);
          paramIdx++;
        }
      }

      // Status filter
      if (status && status !== 'all') {
        conditions.push(`COALESCE(u.status, 'active') = $${paramIdx}`);
        values.push(status);
        paramIdx++;
      }

      // Search filter
      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        conditions.push(`(
          u.name ILIKE $${paramIdx} OR
          u.username ILIKE $${paramIdx} OR
          u.email ILIKE $${paramIdx} OR
          u.code ILIKE $${paramIdx} OR
          u.phone ILIKE $${paramIdx}
        )`);
        values.push(term);
        paramIdx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Main query with window function for total
      const query = `
        SELECT u.id, u.username, u.email, u.name, u.role, u.code, u.phone, u.avatar,
               COALESCE(u.status, 'active') as status, u.school_id, u.must_change_password,
               u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
               c.name as class_name,
               COUNT(*) OVER() as total_count
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN classes c ON s.class_id = c.id
        ${whereClause}
        ORDER BY ${orderCol} ${cleanOrder}
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
      `;
      values.push(limit, offset);

      const result = await pgQuery(query, values);
      const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
      const users = result.rows.map((row) => {
        const { total_count: _, ...u } = row;
        return u;
      });

      return { users, total };
    }

    // SQLite fallback
    const conditions = [];
    const params = [];

    if (schoolId && !isSuperAdmin) {
      conditions.push(`(u.school_id = ? OR u.school_id IS NULL)`);
      params.push(schoolId);
    }

    if (role && role !== 'all') {
      if (role === 'admin' || role === 'school_admin') {
        conditions.push(`(u.role = 'admin' OR u.role = 'school_admin')`);
      } else {
        conditions.push(`u.role = ?`);
        params.push(role);
      }
    }

    if (status && status !== 'all') {
      conditions.push(`COALESCE(u.status, 'active') = ?`);
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(`(
        u.name LIKE ? OR
        u.username LIKE ? OR
        u.email LIKE ? OR
        u.code LIKE ? OR
        u.phone LIKE ?
      )`);
      params.push(term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as count FROM users u ${whereClause}`;
    const totalRow = db.prepare(countQuery).get(...params);
    const total = totalRow ? totalRow.count : 0;

    const selectQuery = `
      SELECT u.id, u.username, u.email, u.name, u.role, u.code, u.phone, u.avatar,
             COALESCE(u.status, 'active') as status, u.school_id, u.must_change_password,
             u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
             c.name as class_name
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      ${whereClause}
      ORDER BY ${orderCol} ${cleanOrder}
      LIMIT ? OFFSET ?
    `;

    const users = db.prepare(selectQuery).all(...params, limit, offset);
    return { users, total };
  },

  /**
   * Find user by ID with full details
   */
  async findById(id, schoolId = null, isSuperAdmin = false) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT u.id, u.username, u.email, u.name, u.role, u.code, u.phone, u.avatar,
               COALESCE(u.status, 'active') as status, u.school_id, u.must_change_password,
               u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
               c.name as class_name, s.id as student_id, s.class_id
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE u.id = $1
      `, [id]);

      if (res.rows.length === 0) return null;
      const user = res.rows[0];

      if (schoolId && user.school_id && user.school_id !== schoolId && !isSuperAdmin) {
        return 'FORBIDDEN_TENANT';
      }

      // Fetch user_roles
      try {
        const rolesRes = await pgQuery('SELECT role_id FROM user_roles WHERE user_id = $1', [id]);
        user.roles = rolesRes.rows.map((r) => r.role_id);
      } catch {
        user.roles = [user.role];
      }

      return user;
    }

    // SQLite fallback
    const user = db.prepare(`
      SELECT u.id, u.username, u.email, u.name, u.role, u.code, u.phone, u.avatar,
             COALESCE(u.status, 'active') as status, u.school_id, u.must_change_password,
             u.failed_login_attempts, u.locked_until, u.created_at, u.updated_at,
             c.name as class_name, s.id as student_id, s.class_id
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE u.id = ?
    `).get(id);

    if (!user) return null;

    if (schoolId && user.school_id && user.school_id !== schoolId && !isSuperAdmin) {
      return 'FORBIDDEN_TENANT';
    }

    try {
      const rolesRows = db.prepare('SELECT role_id FROM user_roles WHERE user_id = ?').all(id);
      user.roles = rolesRows.map((r) => r.role_id);
    } catch {
      user.roles = [user.role];
    }

    return user;
  },

  /**
   * Check duplicate username or email
   */
  async findDuplicateIdentifier(username, email, excludeId = null) {
    if (isPostgresConfigured()) {
      let query = `
        SELECT id, username, email FROM users
        WHERE (LOWER(username) = LOWER($1) OR (email IS NOT NULL AND email != '' AND LOWER(email) = LOWER($2)))
      `;
      const params = [username || '', email || ''];
      if (excludeId) {
        query += ` AND id != $3`;
        params.push(excludeId);
      }
      query += ` LIMIT 1`;
      const res = await pgQuery(query, params);
      return res.rows[0] || null;
    }

    // SQLite fallback
    let query = `
      SELECT id, username, email FROM users
      WHERE (LOWER(username) = LOWER(?) OR (email IS NOT NULL AND email != '' AND LOWER(email) = LOWER(?)))
    `;
    const params = [username || '', email || ''];
    if (excludeId) {
      query += ` AND id != ?`;
      params.push(excludeId);
    }
    query += ` LIMIT 1`;
    return db.prepare(query).get(...params) || null;
  },

  /**
   * Check duplicate code within same school
   */
  async findDuplicateCode(code, schoolId, excludeId = null) {
    if (!code) return null;
    if (isPostgresConfigured()) {
      let query = `SELECT id FROM users WHERE LOWER(code) = LOWER($1) AND (school_id = $2 OR school_id IS NULL)`;
      const params = [code, schoolId];
      if (excludeId) {
        query += ` AND id != $3`;
        params.push(excludeId);
      }
      query += ` LIMIT 1`;
      const res = await pgQuery(query, params);
      return res.rows[0] || null;
    }

    // SQLite fallback
    let query = `SELECT id FROM users WHERE LOWER(code) = LOWER(?) AND (school_id = ? OR school_id IS NULL)`;
    const params = [code, schoolId];
    if (excludeId) {
      query += ` AND id != ?`;
      params.push(excludeId);
    }
    query += ` LIMIT 1`;
    return db.prepare(query).get(...params) || null;
  },

  /**
   * Create a new user record and related role/profile entries
   */
  async createUser(userData) {
    const {
      id,
      username,
      email,
      passwordHash,
      role,
      name,
      code,
      phone,
      avatar,
      schoolId,
      classId,
      roles = [],
    } = userData;

    const assignedRoles = roles.length > 0 ? Array.from(new Set([role, ...roles])) : [role];

    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO users (id, username, email, password_hash, role, name, code, phone, avatar, school_id, status, must_change_password)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', true)
      `, [id, username, email, passwordHash, role, name, code, phone, avatar, schoolId]);

      // If student, link student profile and active enrollment
      if (role === 'student') {
        const studentId = `std_${Date.now().toString().slice(-4)}`;
        const effectiveClass = classId || 'cls_10A1';
        await pgQuery(`
          INSERT INTO students (id, user_id, class_id, current_class_id, student_code, gpa, class_rank, attendance_rate, school_id, enrollment_status)
          VALUES ($1, $2, $3, $3, $4, 8.0, '15/38', 100, $5, 'active')
        `, [studentId, id, effectiveClass, code || studentId, schoolId]);

        const ceId = `ce_${studentId}_${effectiveClass}`;
        await pgQuery(`
          INSERT INTO class_enrollments (id, class_id, student_id, academic_year_id, enrollment_date, status, is_current)
          VALUES ($1, $2, $3, 'ay_2024_2025', CURRENT_DATE, 'enrolled', TRUE)
          ON CONFLICT (class_id, student_id, academic_year_id) DO UPDATE SET is_current = TRUE
        `, [ceId, effectiveClass, studentId]);
      } else if (role === 'teacher') {
        const teacherId = `tch_${Date.now().toString().slice(-4)}`;
        await pgQuery(`
          INSERT INTO teachers (id, user_id, school_id, department_id, homeroom_class_id, specialty, qualification, status, employee_id, contact_email, contact_phone)
          VALUES ($1, $2, $3, 'dept_math_it', $4, 'Toán học', 'Cử nhân Sư phạm', 'active', $5, $6, $7)
          ON CONFLICT (user_id) DO NOTHING
        `, [teacherId, id, schoolId, classId || null, code || teacherId, email, phone]);
      } else if (role === 'parent') {
        const parentId = `prt_${Date.now().toString().slice(-4)}`;
        await pgQuery(`
          INSERT INTO parents (id, user_id, school_id, occupation, workplace, contact_phone, contact_email, status)
          VALUES ($1, $2, $3, 'Phụ huynh học sinh', 'Hà Nội', $4, $5, 'active')
          ON CONFLICT (user_id) DO NOTHING
        `, [parentId, id, schoolId, phone, email]);
      }

      // Link user_roles
      for (const r of assignedRoles) {
        const urId = `ur_${id}_${r}`;
        await pgQuery(`
          INSERT INTO user_roles (id, user_id, role_id, school_id)
          SELECT $1, $2, r.id, $4
          FROM roles r
          WHERE r.id = $3 OR r.name = $3
          LIMIT 1
          ON CONFLICT (user_id, role_id, school_id) DO NOTHING
        `, [urId, id, r, schoolId]);
      }

      return { id, username, email, name, role, roles: assignedRoles, code, phone, avatar, schoolId, status: 'active' };
    }

    // SQLite fallback
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, name, code, phone, avatar, school_id, status, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1)
    `).run(id, username, email, passwordHash, role, name, code, phone, avatar, schoolId);

    if (role === 'student') {
      const studentId = `std_${Date.now().toString().slice(-4)}`;
      const effectiveClass = classId || 'cls_10A1';
      db.prepare(`
        INSERT INTO students (id, user_id, class_id, current_class_id, student_code, gpa, class_rank, attendance_rate, school_id, enrollment_status)
        VALUES (?, ?, ?, ?, ?, 8.0, '15/38', 100, ?, 'active')
      `).run(studentId, id, effectiveClass, effectiveClass, code || studentId, schoolId);

      const ceId = `ce_${studentId}_${effectiveClass}`;
      try {
        db.prepare(`
          INSERT OR REPLACE INTO class_enrollments (id, class_id, student_id, academic_year_id, status, is_current)
          VALUES (?, ?, ?, 'ay_2024_2025', 'enrolled', 1)
        `).run(ceId, effectiveClass, studentId);
      } catch {}
    } else if (role === 'teacher') {
      const teacherId = `tch_${Date.now().toString().slice(-4)}`;
      try {
        db.prepare(`
          INSERT OR IGNORE INTO teachers (id, user_id, school_id, department_id, homeroom_class_id, specialty, qualification, status, employee_id, contact_email, contact_phone)
          VALUES (?, ?, ?, 'dept_math_it', ?, 'Toán học', 'Cử nhân Sư phạm', 'active', ?, ?, ?)
        `).run(teacherId, id, schoolId, classId || null, code || teacherId, email, phone);
      } catch {}
    } else if (role === 'parent') {
      const parentId = `prt_${Date.now().toString().slice(-4)}`;
      try {
        db.prepare(`
          INSERT OR IGNORE INTO parents (id, user_id, school_id, occupation, workplace, contact_phone, contact_email, status)
          VALUES (?, ?, ?, 'Phụ huynh học sinh', 'Hà Nội', ?, ?, 'active')
        `).run(parentId, id, schoolId, phone, email);
      } catch {}
    }

    try {
      const insertUr = db.prepare(`
        INSERT OR IGNORE INTO user_roles (id, user_id, role_id, school_id)
        VALUES (?, ?, ?, ?)
      `);
      for (const r of assignedRoles) {
        insertUr.run(`ur_${id}_${r}`, id, r, schoolId);
      }
    } catch {
      // ignore if user_roles doesn't exist in transitional SQLite
    }

    return { id, username, email, name, role, roles: assignedRoles, code, phone, avatar, schoolId, status: 'active' };
  },

  /**
   * Update user profile information
   */
  async updateUser(id, updateData) {
    const { name, email, phone, code, role, avatar } = updateData;

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE users
        SET name = COALESCE($1, name),
            email = COALESCE($2, email),
            phone = COALESCE($3, phone),
            code = COALESCE($4, code),
            role = COALESCE($5, role),
            avatar = COALESCE($6, avatar),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
      `, [name || null, email || null, phone || null, code || null, role || null, avatar || null, id]);
      return true;
    }

    // SQLite fallback
    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          code = COALESCE(?, code),
          role = COALESCE(?, role),
          avatar = COALESCE(?, avatar),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name || null, email || null, phone || null, code || null, role || null, avatar || null, id);
    return true;
  },

  /**
   * Update user status (active, disabled, locked) and invalidate sessions
   */
  async updateStatus(id, status) {
    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE users
        SET status = $1,
            failed_login_attempts = CASE WHEN $1 = 'active' THEN 0 ELSE failed_login_attempts END,
            locked_until = CASE WHEN $1 = 'active' THEN NULL ELSE locked_until END,
            token_version = token_version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [status, id]);
      return true;
    }

    // SQLite fallback
    db.prepare(`
      UPDATE users
      SET status = ?,
          failed_login_attempts = CASE WHEN ? = 'active' THEN 0 ELSE failed_login_attempts END,
          locked_until = CASE WHEN ? = 'active' THEN NULL ELSE locked_until END,
          token_version = COALESCE(token_version, 0) + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, status, status, id);
    return true;
  },

  /**
   * Assign and sync user roles
   */
  async updateRoles(id, primaryRole, rolesList = [], schoolId = 'sch_bacau') {
    const assignedRoles = Array.from(new Set([primaryRole, ...rolesList]));

    if (isPostgresConfigured()) {
      await pgQuery(`UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [primaryRole, id]);

      // Remove existing user_roles and insert new set
      await pgQuery(`DELETE FROM user_roles WHERE user_id = $1`, [id]);
      for (const r of assignedRoles) {
        const urId = `ur_${id}_${r}`;
        await pgQuery(`
          INSERT INTO user_roles (id, user_id, role_id, school_id)
          SELECT $1, $2, r.id, $4
          FROM roles r
          WHERE r.id = $3 OR r.name = $3
          LIMIT 1
          ON CONFLICT (user_id, role_id, school_id) DO NOTHING
        `, [urId, id, r, schoolId]);
      }
      return assignedRoles;
    }

    // SQLite fallback
    db.prepare(`UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(primaryRole, id);
    try {
      db.prepare(`DELETE FROM user_roles WHERE user_id = ?`).run(id);
      const insertUr = db.prepare(`
        INSERT OR IGNORE INTO user_roles (id, user_id, role_id, school_id)
        VALUES (?, ?, ?, ?)
      `);
      for (const r of assignedRoles) {
        insertUr.run(`ur_${id}_${r}`, id, r, schoolId);
      }
    } catch {}

    return assignedRoles;
  },

  /**
   * Reset credentials and invalidate previous sessions
   */
  async resetPassword(id, passwordHash, mustChangePassword = true) {
    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE users
        SET password_hash = $1,
            must_change_password = $2,
            password_changed_at = CURRENT_TIMESTAMP,
            token_version = token_version + 1,
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [passwordHash, mustChangePassword, id]);
      return true;
    }

    // SQLite fallback
    db.prepare(`
      UPDATE users
      SET password_hash = ?,
          must_change_password = ?,
          password_changed_at = CURRENT_TIMESTAMP,
          token_version = COALESCE(token_version, 0) + 1,
          failed_login_attempts = 0,
          locked_until = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(passwordHash, mustChangePassword ? 1 : 0, id);
    return true;
  },

  /**
   * Revoke all active sessions of a user
   */
  async revokeAllSessions(userId) {
    if (isPostgresConfigured()) {
      await pgQuery(`UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1`, [userId]);
      return;
    }

    try {
      db.prepare(`UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?`).run(userId);
    } catch {}
  },

  /**
   * Check whether a user has academic history (grades, attendance, submissions, classes)
   */
  async hasAcademicHistory(id) {
    if (isPostgresConfigured()) {
      // 1. Check if user is student with academic records
      const stdCheck = await pgQuery(`
        SELECT COUNT(*) as count FROM (
          SELECT id FROM grades WHERE student_id IN (SELECT id FROM students WHERE user_id = $1)
          UNION ALL
          SELECT id FROM assignment_submissions WHERE student_id IN (SELECT id FROM students WHERE user_id = $1)
          UNION ALL
          SELECT id FROM attendance_records WHERE student_id IN (SELECT id FROM students WHERE user_id = $1)
        ) combined
      `, [id]);

      if (parseInt(stdCheck.rows[0]?.count || '0', 10) > 0) return true;

      // 2. Check if user is teacher with homeroom class or assignments
      const tchCheck = await pgQuery(`
        SELECT COUNT(*) as count FROM (
          SELECT id FROM classes WHERE homeroom_teacher_id = $1
          UNION ALL
          SELECT id FROM assignments WHERE created_by = $1
        ) combined
      `, [id]);

      if (parseInt(tchCheck.rows[0]?.count || '0', 10) > 0) return true;

      return false;
    }

    // SQLite fallback
    const stdRecords = db.prepare(`
      SELECT (
        (SELECT COUNT(*) FROM grades WHERE student_id IN (SELECT id FROM students WHERE user_id = ?)) +
        (SELECT COUNT(*) FROM assignment_submissions WHERE student_id IN (SELECT id FROM students WHERE user_id = ?))
      ) as total
    `).get(id, id);

    if (stdRecords && stdRecords.total > 0) return true;

    const tchRecords = db.prepare(`
      SELECT (
        (SELECT COUNT(*) FROM classes WHERE homeroom_teacher_id = ?) +
        (SELECT COUNT(*) FROM assignments WHERE created_by = ?)
      ) as total
    `).get(id, id);

    if (tchRecords && tchRecords.total > 0) return true;

    return false;
  },

  /**
   * Permanently delete user without academic history
   */
  async deleteUser(id) {
    if (isPostgresConfigured()) {
      await pgQuery(`DELETE FROM user_roles WHERE user_id = $1`, [id]);
      await pgQuery(`DELETE FROM students WHERE user_id = $1`, [id]);
      await pgQuery(`DELETE FROM users WHERE id = $1`, [id]);
      return true;
    }

    // SQLite fallback
    try {
      db.prepare(`DELETE FROM user_roles WHERE user_id = ?`).run(id);
    } catch {}
    db.prepare(`DELETE FROM students WHERE user_id = ?`).run(id);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
    return true;
  },

  /**
   * Log administrative audit event
   */
  async logAudit({ actorId, actorName, role, action, badge, badgeType = 'info', schoolId = 'sch_bacau', details = '' }) {
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO audit_logs (id, actor_id, actor_name, role, action, badge, badge_type, school_id, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [logId, actorId || null, actorName || 'Quản trị viên', role || 'school_admin', action, badge, badgeType, schoolId, details]);
      return;
    }

    try {
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_name, role, action, badge, badge_type, school_id, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(logId, actorId || null, actorName || 'Quản trị viên', role || 'school_admin', action, badge, badgeType, schoolId, details);
    } catch {}
  },
};
