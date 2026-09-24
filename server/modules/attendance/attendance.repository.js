import { pool, pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';

export const attendanceRepository = {
  /**
   * Find class by ID and check tenant
   */
  async findClassById(classId, schoolId = null) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT id, name, grade_level, school_id, homeroom_teacher_id
         FROM classes
         WHERE id = $1 ${schoolId ? 'AND (school_id = $2 OR school_id IS NULL)' : ''}`,
        schoolId ? [classId, schoolId] : [classId]
      );
      return res.rows[0] || null;
    } else {
      let query = 'SELECT id, name, grade_level, school_id, homeroom_teacher_id FROM classes WHERE id = ?';
      const params = [classId];
      if (schoolId) {
        query += ' AND (school_id = ? OR school_id IS NULL)';
        params.push(schoolId);
      }
      return db.prepare(query).get(...params) || null;
    }
  },

  /**
   * Find a student by user_id and return their display name.
   * Used by notification service to enrich absent notifications.
   */
  async findStudentById(studentId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT s.id, u.name
         FROM students s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = $1
         UNION
         SELECT s.id, u.name
         FROM students s
         JOIN users u ON s.user_id = u.id
         WHERE u.id = $1`,
        [studentId]
      );
      return res.rows[0] || null;
    } else {
      const row = db.prepare(`
        SELECT s.id, u.name
        FROM students s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
        UNION
        SELECT s.id, u.name
        FROM students s
        JOIN users u ON s.user_id = u.id
        WHERE u.id = ?
      `).get(studentId, studentId);
      return row || null;
    }
  },

  /**
   * Check if teacher is assigned or authorized for a class
   */
  async isTeacherAuthorizedForClass(teacherId, classId, schoolId = null) {
    if (!teacherId || !classId) return false;

    if (isPostgresConfigured()) {
      // 1. Check homeroom teacher
      const hrRes = await pgQuery(
        `SELECT id FROM classes
         WHERE id = $1 AND (homeroom_teacher_id = $2 OR teacher_id = $2)
         ${schoolId ? 'AND (school_id = $3 OR school_id IS NULL)' : ''}`,
        schoolId ? [classId, teacherId, schoolId] : [classId, teacherId]
      );
      if (hrRes.rows.length > 0) return true;

      // 2. Check teaching assignments
      const asgRes = await pgQuery(
        `SELECT id FROM teacher_assignments
         WHERE class_id = $1 AND teacher_id = $2 AND (status = 'active' OR status IS NULL)
         ${schoolId ? 'AND (school_id = $3 OR school_id IS NULL)' : ''}`,
        schoolId ? [classId, teacherId, schoolId] : [classId, teacherId]
      );
      return asgRes.rows.length > 0;
    } else {
      // SQLite
      let hr = db.prepare(
        `SELECT id FROM classes
         WHERE id = ? AND (homeroom_teacher_id = ? OR teacher_id = ?)
         ${schoolId ? 'AND (school_id = ? OR school_id IS NULL)' : ''}`
      ).get(...(schoolId ? [classId, teacherId, teacherId, schoolId] : [classId, teacherId, teacherId]));
      if (hr) return true;

      let asg = db.prepare(
        `SELECT id FROM teacher_assignments
         WHERE class_id = ? AND teacher_id = ? AND (status = 'active' OR status IS NULL)
         ${schoolId ? 'AND (school_id = ? OR school_id IS NULL)' : ''}`
      ).get(...(schoolId ? [classId, teacherId, schoolId] : [classId, teacherId]));
      return Boolean(asg);
    }
  },

  /**
   * Get enrolled student IDs for a class
   */
  async getEnrolledStudentIds(classId, schoolId = null) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT DISTINCT ce.student_id
         FROM class_enrollments ce
         JOIN students s ON ce.student_id = s.id
         WHERE ce.class_id = $1 AND ce.is_current = TRUE AND ce.status = 'enrolled'
         ${schoolId ? 'AND (s.school_id = $2 OR s.school_id IS NULL)' : ''}`,
        schoolId ? [classId, schoolId] : [classId]
      );
      if (res.rows.length > 0) return res.rows.map((r) => r.student_id);

      // Fallback to students table direct class_id
      const fb = await pgQuery(
        `SELECT id as student_id FROM students
         WHERE (class_id = $1 OR current_class_id = $1)
         ${schoolId ? 'AND (school_id = $2 OR school_id IS NULL)' : ''}`,
        schoolId ? [classId, schoolId] : [classId]
      );
      return fb.rows.map((r) => r.student_id);
    } else {
      let rows = db.prepare(
        `SELECT DISTINCT ce.student_id
         FROM class_enrollments ce
         JOIN students s ON ce.student_id = s.id
         WHERE ce.class_id = ? AND ce.is_current = 1 AND ce.status = 'enrolled'
         ${schoolId ? 'AND (s.school_id = ? OR s.school_id IS NULL)' : ''}`
      ).all(...(schoolId ? [classId, schoolId] : [classId]));

      if (rows.length > 0) return rows.map((r) => r.student_id);

      let fb = db.prepare(
        `SELECT id as student_id FROM students
         WHERE (class_id = ? OR current_class_id = ?)
         ${schoolId ? 'AND (school_id = ? OR school_id IS NULL)' : ''}`
      ).all(...(schoolId ? [classId, classId, schoolId] : [classId, classId]));
      return fb.map((r) => r.student_id);
    }
  },

  /**
   * Resolve student ID given either a student table ID (std_*) or a user ID (usr_*)
   */
  async resolveStudentId(identifier) {
    if (!identifier) return null;
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT id FROM students WHERE id = $1 OR user_id = $1 LIMIT 1`,
        [identifier]
      );
      return res.rows[0]?.id || identifier;
    } else {
      const row = db.prepare(
        `SELECT id FROM students WHERE id = ? OR user_id = ? LIMIT 1`
      ).get(identifier, identifier);
      return row?.id || identifier;
    }
  },

  /**
   * Check if a parent is guardian of a student
   */
  async isParentOfStudent(parentUserId, studentId) {
    if (!parentUserId || !studentId) return false;
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT ps.id
         FROM parent_students ps
         JOIN parents p ON ps.parent_id = p.id
         WHERE p.user_id = $1 AND ps.student_id = $2`,
        [parentUserId, studentId]
      );
      if (res.rows.length > 0) return true;

      // Fallback check on students.parent_id
      const fb = await pgQuery(
        `SELECT id FROM students WHERE id = $1 AND parent_id = $2`,
        [studentId, parentUserId]
      );
      return fb.rows.length > 0;
    } else {
      const row = db.prepare(
        `SELECT ps.id
         FROM parent_students ps
         JOIN parents p ON ps.parent_id = p.id
         WHERE p.user_id = ? AND ps.student_id = ?`
      ).get(parentUserId, studentId);
      if (row) return true;

      const fb = db.prepare(
        `SELECT id FROM students WHERE id = ? AND parent_id = ?`
      ).get(studentId, parentUserId);
      return Boolean(fb);
    }
  },

  /**
   * Find existing session by slot (classId, date, period, sessionType)
   */
  async findSessionBySlot({ classId, date, period = null, sessionType = 'daily' }) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT * FROM attendance_sessions
         WHERE class_id = $1 AND date = $2
           AND (period = $3 OR (period IS NULL AND $3 IS NULL))
           AND session_type = $4
         LIMIT 1`,
        [classId, date, period, sessionType]
      );
      return res.rows[0] || null;
    } else {
      const row = db.prepare(
        `SELECT * FROM attendance_sessions
         WHERE class_id = ? AND date = ?
           AND (period = ? OR (period IS NULL AND ? IS NULL))
           AND session_type = ?
         LIMIT 1`
      ).get(classId, date, period, period, sessionType);
      return row || null;
    }
  },

  /**
   * Find session by ID
   */
  async findSessionById(sessionId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT ses.*, c.name as class_name, sub.name as subject_name, u.name as teacher_name
         FROM attendance_sessions ses
         LEFT JOIN classes c ON ses.class_id = c.id
         LEFT JOIN subjects sub ON ses.subject_id = sub.id
         LEFT JOIN users u ON ses.teacher_id = u.id
         WHERE ses.id = $1`,
        [sessionId]
      );
      return res.rows[0] || null;
    } else {
      return db.prepare(
        `SELECT ses.*, c.name as class_name, sub.name as subject_name, u.name as teacher_name
         FROM attendance_sessions ses
         LEFT JOIN classes c ON ses.class_id = c.id
         LEFT JOIN subjects sub ON ses.subject_id = sub.id
         LEFT JOIN users u ON ses.teacher_id = u.id
         WHERE ses.id = ?`
      ).get(sessionId) || null;
    }
  },

  /**
   * Get records for a session
   */
  async findRecordsBySessionId(sessionId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT r.*, s.student_code, u.name as student_name, u.code as user_code, u.avatar
         FROM attendance_records r
         JOIN students s ON r.student_id = s.id
         JOIN users u ON s.user_id = u.id
         WHERE r.session_id = $1
         ORDER BY u.name ASC`,
        [sessionId]
      );
      return res.rows;
    } else {
      return db.prepare(
        `SELECT r.*, s.student_code, u.name as student_name, u.code as user_code, u.avatar
         FROM attendance_records r
         JOIN students s ON r.student_id = s.id
         JOIN users u ON s.user_id = u.id
         WHERE r.session_id = ?
         ORDER BY u.name ASC`
      ).all(sessionId);
    }
  },

  /**
   * Save session and records ATOMICALLY
   */
  async saveSessionAndRecordsAtomic({
    sessionData,
    records,
    userId,
  }) {
    const {
      id: sessionId,
      schoolId,
      classId,
      subjectId = null,
      teacherId = null,
      date,
      period = null,
      sessionType = 'daily',
      semesterId = null,
      status = 'completed',
      notes = '',
    } = sessionData;

    if (isPostgresConfigured()) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Upsert session
        await client.query(
          `INSERT INTO attendance_sessions (
            id, school_id, class_id, subject_id, teacher_id, date, period,
            session_type, semester_id, status, notes, recorded_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            subject_id = EXCLUDED.subject_id,
            teacher_id = EXCLUDED.teacher_id,
            semester_id = EXCLUDED.semester_id,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            updated_at = CURRENT_TIMESTAMP`,
          [
            sessionId,
            schoolId,
            classId,
            subjectId,
            teacherId || userId,
            date,
            period,
            sessionType,
            semesterId,
            status,
            notes,
            userId,
          ]
        );

        // Upsert records
        for (const rec of records) {
          const recordId = rec.id || `rec_${sessionId}_${rec.studentId}`;
          await client.query(
            `INSERT INTO attendance_records (
              id, session_id, student_id, status, note, recorded_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (session_id, student_id) DO UPDATE SET
              status = EXCLUDED.status,
              note = EXCLUDED.note,
              recorded_by = EXCLUDED.recorded_by,
              updated_at = CURRENT_TIMESTAMP`,
            [
              recordId,
              sessionId,
              rec.studentId,
              rec.status,
              rec.note || '',
              userId,
            ]
          );
        }

        await client.query('COMMIT');
        return { sessionId, savedCount: records.length };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      // SQLite Transaction
      const saveTx = db.transaction(() => {
        // Upsert session
        const existing = db.prepare('SELECT id FROM attendance_sessions WHERE id = ?').get(sessionId);
        if (existing) {
          db.prepare(
            `UPDATE attendance_sessions SET
              subject_id = ?, teacher_id = ?, semester_id = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`
          ).run(subjectId, teacherId || userId, semesterId, status, notes, sessionId);
        } else {
          db.prepare(
            `INSERT INTO attendance_sessions (
              id, school_id, class_id, subject_id, teacher_id, date, period,
              session_type, semester_id, status, notes, recorded_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
          ).run(
            sessionId,
            schoolId,
            classId,
            subjectId,
            teacherId || userId,
            date,
            period,
            sessionType,
            semesterId,
            status,
            notes,
            userId
          );
        }

        const insertOrUpdateRec = db.prepare(
          `INSERT INTO attendance_records (
            id, session_id, student_id, status, note, recorded_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (session_id, student_id) DO UPDATE SET
            status = excluded.status,
            note = excluded.note,
            recorded_by = excluded.recorded_by,
            updated_at = CURRENT_TIMESTAMP`
        );

        for (const rec of records) {
          const recordId = rec.id || `rec_${sessionId}_${rec.studentId}`;
          insertOrUpdateRec.run(
            recordId,
            sessionId,
            rec.studentId,
            rec.status,
            rec.note || '',
            userId
          );
        }
      });

      saveTx();
      return { sessionId, savedCount: records.length };
    }
  },

  /**
   * Update a single attendance record by ID
   */
  async updateRecordById(recordId, { status, note, recordedBy }) {
    if (isPostgresConfigured()) {
      const updates = [];
      const params = [];
      let idx = 1;

      if (status) {
        updates.push(`status = $${idx}`);
        params.push(status);
        idx++;
      }
      if (note !== undefined) {
        updates.push(`note = $${idx}`);
        params.push(note);
        idx++;
      }
      if (recordedBy) {
        updates.push(`recorded_by = $${idx}`);
        params.push(recordedBy);
        idx++;
      }
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(recordId);

      const res = await pgQuery(
        `UPDATE attendance_records
         SET ${updates.join(', ')}
         WHERE id = $${idx}
         RETURNING *`,
        params
      );
      return res.rows[0] || null;
    } else {
      const updates = [];
      const params = [];

      if (status) {
        updates.push(`status = ?`);
        params.push(status);
      }
      if (note !== undefined) {
        updates.push(`note = ?`);
        params.push(note);
      }
      if (recordedBy) {
        updates.push(`recorded_by = ?`);
        params.push(recordedBy);
      }
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(recordId);

      db.prepare(`UPDATE attendance_records SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      return db.prepare('SELECT * FROM attendance_records WHERE id = ?').get(recordId) || null;
    }
  },

  /**
   * Find record by ID with session details
   */
  async findRecordById(recordId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT r.*, ses.school_id, ses.class_id, ses.date, ses.period, ses.session_type
         FROM attendance_records r
         JOIN attendance_sessions ses ON r.session_id = ses.id
         WHERE r.id = $1`,
        [recordId]
      );
      return res.rows[0] || null;
    } else {
      return db.prepare(
        `SELECT r.*, ses.school_id, ses.class_id, ses.date, ses.period, ses.session_type
         FROM attendance_records r
         JOIN attendance_sessions ses ON r.session_id = ses.id
         WHERE r.id = ?`
      ).get(recordId) || null;
    }
  },

  /**
   * Get student personal attendance history and stats
   */
  async getStudentAttendanceHistory({ studentId, schoolId = null, semesterId = null }) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT r.id, r.session_id, r.status, r.note, r.created_at, r.updated_at,
                ses.date, ses.period, ses.session_type, ses.school_id, ses.class_id,
                c.name as class_name, sub.name as subject_name, u.name as teacher_name
         FROM attendance_records r
         JOIN attendance_sessions ses ON r.session_id = ses.id
         LEFT JOIN classes c ON ses.class_id = c.id
         LEFT JOIN subjects sub ON ses.subject_id = sub.id
         LEFT JOIN users u ON ses.teacher_id = u.id
         WHERE r.student_id = $1
           ${schoolId ? 'AND (ses.school_id = $2 OR ses.school_id IS NULL)' : ''}
           ${semesterId ? 'AND ses.semester_id = $3' : ''}
         ORDER BY ses.date DESC, ses.period DESC`,
        schoolId && semesterId
          ? [studentId, schoolId, semesterId]
          : schoolId
          ? [studentId, schoolId]
          : semesterId
          ? [studentId, semesterId]
          : [studentId]
      );
      return res.rows;
    } else {
      let query = `
        SELECT r.id, r.session_id, r.status, r.note, r.created_at, r.updated_at,
               ses.date, ses.period, ses.session_type, ses.school_id, ses.class_id,
               c.name as class_name, sub.name as subject_name, u.name as teacher_name
        FROM attendance_records r
        JOIN attendance_sessions ses ON r.session_id = ses.id
        LEFT JOIN classes c ON ses.class_id = c.id
        LEFT JOIN subjects sub ON ses.subject_id = sub.id
        LEFT JOIN users u ON ses.teacher_id = u.id
        WHERE r.student_id = ?
      `;
      const params = [studentId];
      if (schoolId) {
        query += ' AND (ses.school_id = ? OR ses.school_id IS NULL)';
        params.push(schoolId);
      }
      if (semesterId) {
        query += ' AND ses.semester_id = ?';
        params.push(semesterId);
      }
      query += ' ORDER BY ses.date DESC, ses.period DESC';
      return db.prepare(query).all(...params);
    }
  },

  /**
   * Get aggregate attendance reporting for admin/BGH
   */
  async getSchoolAttendanceStats({ schoolId, date = null, startDate = null, endDate = null }) {
    if (isPostgresConfigured()) {
      let conds = [`ses.school_id = $1`];
      let params = [schoolId];
      let idx = 2;

      if (date) {
        conds.push(`ses.date = $${idx}`);
        params.push(date);
        idx++;
      } else if (startDate && endDate) {
        conds.push(`ses.date BETWEEN $${idx} AND $${idx + 1}`);
        params.push(startDate, endDate);
        idx += 2;
      }

      const whereClause = conds.join(' AND ');

      // Total records summary
      const sumRes = await pgQuery(
        `SELECT
           COUNT(r.id) as total_records,
           COUNT(DISTINCT ses.id) as total_sessions,
           COUNT(DISTINCT ses.class_id) as total_classes_checked,
           SUM(CASE WHEN UPPER(r.status) = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
           SUM(CASE WHEN UPPER(r.status) = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
           SUM(CASE WHEN UPPER(r.status) = 'LATE' THEN 1 ELSE 0 END) as late_count,
           SUM(CASE WHEN UPPER(r.status) = 'EXCUSED' THEN 1 ELSE 0 END) as excused_count
         FROM attendance_sessions ses
         JOIN attendance_records r ON ses.id = r.session_id
         WHERE ${whereClause}`,
        params
      );

      // By class summary
      const classRes = await pgQuery(
        `SELECT
           ses.class_id,
           c.name as class_name,
           c.grade_level,
           COUNT(r.id) as total_records,
           SUM(CASE WHEN UPPER(r.status) = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
           SUM(CASE WHEN UPPER(r.status) = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
           SUM(CASE WHEN UPPER(r.status) = 'LATE' THEN 1 ELSE 0 END) as late_count,
           SUM(CASE WHEN UPPER(r.status) = 'EXCUSED' THEN 1 ELSE 0 END) as excused_count
         FROM attendance_sessions ses
         JOIN attendance_records r ON ses.id = r.session_id
         LEFT JOIN classes c ON ses.class_id = c.id
         WHERE ${whereClause}
         GROUP BY ses.class_id, c.name, c.grade_level
         ORDER BY c.grade_level, c.name`,
        params
      );

      return {
        summary: sumRes.rows[0] || {},
        byClass: classRes.rows || [],
      };
    } else {
      let conds = [`ses.school_id = ?`];
      let params = [schoolId];

      if (date) {
        conds.push(`ses.date = ?`);
        params.push(date);
      } else if (startDate && endDate) {
        conds.push(`ses.date BETWEEN ? AND ?`);
        params.push(startDate, endDate);
      }

      const whereClause = conds.join(' AND ');

      const summary = db.prepare(
        `SELECT
           COUNT(r.id) as total_records,
           COUNT(DISTINCT ses.id) as total_sessions,
           COUNT(DISTINCT ses.class_id) as total_classes_checked,
           SUM(CASE WHEN UPPER(r.status) = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
           SUM(CASE WHEN UPPER(r.status) = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
           SUM(CASE WHEN UPPER(r.status) = 'LATE' THEN 1 ELSE 0 END) as late_count,
           SUM(CASE WHEN UPPER(r.status) = 'EXCUSED' THEN 1 ELSE 0 END) as excused_count
         FROM attendance_sessions ses
         JOIN attendance_records r ON ses.id = r.session_id
         WHERE ${whereClause}`
      ).get(...params);

      const byClass = db.prepare(
        `SELECT
           ses.class_id,
           c.name as class_name,
           c.grade_level,
           COUNT(r.id) as total_records,
           SUM(CASE WHEN UPPER(r.status) = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
           SUM(CASE WHEN UPPER(r.status) = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
           SUM(CASE WHEN UPPER(r.status) = 'LATE' THEN 1 ELSE 0 END) as late_count,
           SUM(CASE WHEN UPPER(r.status) = 'EXCUSED' THEN 1 ELSE 0 END) as excused_count
         FROM attendance_sessions ses
         JOIN attendance_records r ON ses.id = r.session_id
         LEFT JOIN classes c ON ses.class_id = c.id
         WHERE ${whereClause}
         GROUP BY ses.class_id, c.name, c.grade_level
         ORDER BY c.grade_level, c.name`
      ).all(...params);

      return {
        summary: summary || {},
        byClass: byClass || [],
      };
    }
  },
  /**
   * Get class roster with any existing attendance records for the session pre-filled
   */
  async getRosterWithExistingRecords({ classId, schoolId = null, sessionId = null }) {
    if (isPostgresConfigured()) {
      // Step 1: Get enrolled students
      let enrolledRes = await pgQuery(
        `SELECT DISTINCT s.id as student_id, s.student_code, u.name, u.avatar
         FROM class_enrollments ce
         JOIN students s ON ce.student_id = s.id
         JOIN users u ON s.user_id = u.id
         WHERE ce.class_id = $1 AND ce.is_current = TRUE AND ce.status = 'enrolled'
         ${schoolId ? 'AND (s.school_id = $2 OR s.school_id IS NULL)' : ''}
         ORDER BY u.name ASC`,
        schoolId ? [classId, schoolId] : [classId]
      );

      // Fallback to students table
      if (enrolledRes.rows.length === 0) {
        enrolledRes = await pgQuery(
          `SELECT s.id as student_id, s.student_code, u.name, u.avatar
           FROM students s
           JOIN users u ON s.user_id = u.id
           WHERE (s.class_id = $1 OR s.current_class_id = $1)
           ${schoolId ? 'AND (s.school_id = $2 OR s.school_id IS NULL)' : ''}
           ORDER BY u.name ASC`,
          schoolId ? [classId, schoolId] : [classId]
        );
      }

      const students = enrolledRes.rows;

      // Step 2: If a sessionId exists, get existing records
      let existingRecordsMap = {};
      if (sessionId) {
        const recRes = await pgQuery(
          `SELECT id, student_id, status, note FROM attendance_records WHERE session_id = $1`,
          [sessionId]
        );
        recRes.rows.forEach((r) => {
          existingRecordsMap[r.student_id] = {
            existingRecordId: r.id,
            existingStatus: r.status,
            existingNote: r.note || '',
          };
        });
      }

      return students.map((s) => ({
        student_id: s.student_id,
        student_code: s.student_code,
        name: s.name,
        avatar: s.avatar,
        ...(existingRecordsMap[s.student_id] || {
          existingRecordId: null,
          existingStatus: null,
          existingNote: '',
        }),
      }));
    } else {
      // SQLite
      let students = db.prepare(
        `SELECT DISTINCT s.id as student_id, s.student_code, u.name, u.avatar
         FROM class_enrollments ce
         JOIN students s ON ce.student_id = s.id
         JOIN users u ON s.user_id = u.id
         WHERE ce.class_id = ? AND ce.is_current = 1 AND ce.status = 'enrolled'
         ${schoolId ? 'AND (s.school_id = ? OR s.school_id IS NULL)' : ''}
         ORDER BY u.name ASC`
      ).all(...(schoolId ? [classId, schoolId] : [classId]));

      if (students.length === 0) {
        students = db.prepare(
          `SELECT s.id as student_id, s.student_code, u.name, u.avatar
           FROM students s
           JOIN users u ON s.user_id = u.id
           WHERE (s.class_id = ? OR s.current_class_id = ?)
           ${schoolId ? 'AND (s.school_id = ? OR s.school_id IS NULL)' : ''}
           ORDER BY u.name ASC`
        ).all(...(schoolId ? [classId, classId, schoolId] : [classId, classId]));
      }

      let existingRecordsMap = {};
      if (sessionId) {
        const recs = db.prepare(
          `SELECT id, student_id, status, note FROM attendance_records WHERE session_id = ?`
        ).all(sessionId);
        recs.forEach((r) => {
          existingRecordsMap[r.student_id] = {
            existingRecordId: r.id,
            existingStatus: r.status,
            existingNote: r.note || '',
          };
        });
      }

      return students.map((s) => ({
        student_id: s.student_id,
        student_code: s.student_code,
        name: s.name,
        avatar: s.avatar,
        ...(existingRecordsMap[s.student_id] || {
          existingRecordId: null,
          existingStatus: null,
          existingNote: '',
        }),
      }));
    }
  },
};
