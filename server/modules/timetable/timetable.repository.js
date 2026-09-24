import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';

export const timetableRepository = {
  /**
   * Find current active semester for a school
   */
  async findCurrentSemester(schoolId = 'sch_bacau') {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT id, academic_year_id, name, semester_number, start_date, end_date
         FROM semesters
         WHERE (school_id = $1 OR school_id IS NULL) AND is_current = true
         ORDER BY created_at DESC LIMIT 1`,
        [schoolId]
      );
      if (res.rows.length > 0) return res.rows[0];

      // Fallback: latest semester
      const fb = await pgQuery(
        `SELECT id, academic_year_id, name, semester_number, start_date, end_date
         FROM semesters
         WHERE (school_id = $1 OR school_id IS NULL)
         ORDER BY start_date DESC LIMIT 1`,
        [schoolId]
      );
      return fb.rows[0] || null;
    } else {
      let row = db.prepare(
        `SELECT id, academic_year_id, name, semester_number, start_date, end_date
         FROM semesters
         WHERE (school_id = ? OR school_id IS NULL) AND is_current = 1
         ORDER BY created_at DESC LIMIT 1`
      ).get(schoolId);

      if (!row) {
        row = db.prepare(
          `SELECT id, academic_year_id, name, semester_number, start_date, end_date
           FROM semesters
           WHERE (school_id = ? OR school_id IS NULL)
           ORDER BY start_date DESC LIMIT 1`
        ).get(schoolId);
      }
      return row || null;
    }
  },

  /**
   * Find timetable slots matching criteria
   */
  async findTimetableSlots({
    schoolId = null,
    classId = null,
    teacherId = null,
    subjectId = null,
    semesterId = null,
    academicYearId = null,
    dayOfWeek = null,
    period = null,
  }) {
    if (isPostgresConfigured()) {
      let conditions = ['1=1'];
      let params = [];
      let idx = 1;

      if (schoolId) {
        conditions.push(`t.school_id = $${idx}`);
        params.push(schoolId);
        idx++;
      }

      if (classId) {
        conditions.push(`t.class_id = $${idx}`);
        params.push(classId);
        idx++;
      }

      if (teacherId) {
        conditions.push(`t.teacher_id = $${idx}`);
        params.push(teacherId);
        idx++;
      }

      if (subjectId) {
        conditions.push(`t.subject_id = $${idx}`);
        params.push(subjectId);
        idx++;
      }

      if (semesterId) {
        conditions.push(`(t.semester_id = $${idx} OR t.semester_id IS NULL)`);
        params.push(semesterId);
        idx++;
      }

      if (academicYearId) {
        conditions.push(`(t.academic_year_id = $${idx} OR t.academic_year = $${idx})`);
        params.push(academicYearId);
        idx++;
      }

      if (dayOfWeek) {
        conditions.push(`t.day_of_week = $${idx}`);
        params.push(dayOfWeek);
        idx++;
      }

      if (period) {
        conditions.push(`t.period = $${idx}`);
        params.push(period);
        idx++;
      }

      const query = `
        SELECT 
          t.id,
          t.school_id,
          t.class_id,
          c.name AS class_name,
          c.grade_level,
          t.subject_id,
          COALESCE(s.name, t.subject_name) AS subject_name,
          s.code AS subject_code,
          t.teacher_id,
          u.name AS teacher_name,
          u.email AS teacher_email,
          t.day_of_week,
          t.period,
          t.start_time,
          t.end_time,
          t.room,
          t.academic_year_id,
          t.academic_year,
          t.semester_id,
          sem.name AS semester_name,
          t.created_at,
          t.updated_at
        FROM timetable t
        LEFT JOIN classes c ON t.class_id = c.id
        LEFT JOIN subjects s ON t.subject_id = s.id
        LEFT JOIN users u ON t.teacher_id = u.id
        LEFT JOIN semesters sem ON t.semester_id = sem.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY t.day_of_week ASC, t.period ASC, t.start_time ASC
      `;

      const res = await pgQuery(query, params);
      return res.rows;
    } else {
      let conditions = ['1=1'];
      let params = [];

      if (schoolId) {
        conditions.push('t.school_id = ?');
        params.push(schoolId);
      }

      if (classId) {
        conditions.push('t.class_id = ?');
        params.push(classId);
      }

      if (teacherId) {
        conditions.push('t.teacher_id = ?');
        params.push(teacherId);
      }

      if (subjectId) {
        conditions.push('t.subject_id = ?');
        params.push(subjectId);
      }

      if (semesterId) {
        conditions.push('(t.semester_id = ? OR t.semester_id IS NULL)');
        params.push(semesterId);
      }

      if (academicYearId) {
        conditions.push('(t.academic_year_id = ? OR t.academic_year = ?)');
        params.push(academicYearId);
        params.push(academicYearId);
      }

      if (dayOfWeek) {
        conditions.push('t.day_of_week = ?');
        params.push(dayOfWeek);
      }

      if (period) {
        conditions.push('t.period = ?');
        params.push(period);
      }

      const query = `
        SELECT 
          t.id,
          t.school_id,
          t.class_id,
          c.name AS class_name,
          c.grade_level,
          t.subject_id,
          COALESCE(s.name, t.subject_name) AS subject_name,
          s.code AS subject_code,
          t.teacher_id,
          u.name AS teacher_name,
          u.email AS teacher_email,
          t.day_of_week,
          t.period,
          t.start_time,
          t.end_time,
          t.room,
          t.academic_year_id,
          t.academic_year,
          t.semester_id,
          sem.name AS semester_name,
          t.created_at,
          t.updated_at
        FROM timetable t
        LEFT JOIN classes c ON t.class_id = c.id
        LEFT JOIN subjects s ON t.subject_id = s.id
        LEFT JOIN users u ON t.teacher_id = u.id
        LEFT JOIN semesters sem ON t.semester_id = sem.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY t.day_of_week ASC, t.period ASC, t.start_time ASC
      `;

      return db.prepare(query).all(...params);
    }
  },

  /**
   * Find single timetable slot by ID
   */
  async findSlotById(id, schoolId = null) {
    if (isPostgresConfigured()) {
      let query = `
        SELECT 
          t.*,
          c.name AS class_name,
          COALESCE(s.name, t.subject_name) AS subject_name,
          u.name AS teacher_name,
          sem.name AS semester_name
        FROM timetable t
        LEFT JOIN classes c ON t.class_id = c.id
        LEFT JOIN subjects s ON t.subject_id = s.id
        LEFT JOIN users u ON t.teacher_id = u.id
        LEFT JOIN semesters sem ON t.semester_id = sem.id
        WHERE t.id = $1
      `;
      const params = [id];
      if (schoolId) {
        query += ` AND (t.school_id = $2 OR t.school_id IS NULL)`;
        params.push(schoolId);
      }
      const res = await pgQuery(query, params);
      return res.rows[0] || null;
    } else {
      let query = `
        SELECT 
          t.*,
          c.name AS class_name,
          COALESCE(s.name, t.subject_name) AS subject_name,
          u.name AS teacher_name,
          sem.name AS semester_name
        FROM timetable t
        LEFT JOIN classes c ON t.class_id = c.id
        LEFT JOIN subjects s ON t.subject_id = s.id
        LEFT JOIN users u ON t.teacher_id = u.id
        LEFT JOIN semesters sem ON t.semester_id = sem.id
        WHERE t.id = ?
      `;
      const params = [id];
      if (schoolId) {
        query += ` AND (t.school_id = ? OR t.school_id IS NULL)`;
        params.push(schoolId);
      }
      return db.prepare(query).get(...params) || null;
    }
  },

  /**
   * Find student's active enrolled class (G14 derived membership)
   */
  async findStudentActiveEnrollment(studentId, schoolId = null) {
    if (isPostgresConfigured()) {
      // 1. Try class_enrollments (G14 Canonical Source)
      const res = await pgQuery(
        `SELECT ce.class_id, c.name AS class_name, ce.academic_year_id, c.grade_level
         FROM class_enrollments ce
         JOIN classes c ON ce.class_id = c.id
         WHERE (ce.student_id = $1 OR ce.student_id IN (SELECT id FROM students WHERE user_id = $1))
           AND ce.is_current = true
           AND ce.status = 'enrolled'
         ORDER BY ce.created_at DESC LIMIT 1`,
        [studentId]
      );
      if (res.rows.length > 0) return res.rows[0];

      // 2. Fallback to students table
      const fb = await pgQuery(
        `SELECT s.class_id, c.name AS class_name, c.grade_level
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE (s.id = $1 OR s.user_id = $1)
         LIMIT 1`,
        [studentId]
      );
      return fb.rows[0] || null;
    } else {
      try {
        const row = db.prepare(
          `SELECT ce.class_id, c.name AS class_name, ce.academic_year_id, c.grade_level
           FROM class_enrollments ce
           JOIN classes c ON ce.class_id = c.id
           WHERE (ce.student_id = ? OR ce.student_id IN (SELECT id FROM students WHERE user_id = ?))
             AND ce.is_current = 1
             AND ce.status = 'enrolled'
           ORDER BY ce.created_at DESC LIMIT 1`
        ).get(studentId, studentId);
        if (row) return row;
      } catch {}

      return db.prepare(
        `SELECT s.class_id, c.name AS class_name, c.grade_level
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE (s.id = ? OR s.user_id = ?)
         LIMIT 1`
      ).get(studentId, studentId) || null;
    }
  },

  /**
   * Find student by student ID or user ID
   */
  async findStudentById(studentId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT id, user_id, parent_id, school_id FROM students WHERE id = $1 OR user_id = $1`,
        [studentId]
      );
      return res.rows[0] || null;
    } else {
      try {
        return db.prepare(
          `SELECT id, user_id, parent_id, school_id FROM students WHERE id = ? OR user_id = ?`
        ).get(studentId, studentId) || null;
      } catch {
        return null;
      }
    }
  },

  /**
   * Check guardian relationship between parent and student
   */
  async verifyParentStudentLink(parentId, studentId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT ps.id
         FROM parent_students ps
         JOIN parents p ON ps.parent_id = p.id
         WHERE (p.user_id = $1 OR p.id = $1)
           AND (ps.student_id = $2 OR ps.student_id IN (SELECT id FROM students WHERE user_id = $2))
         UNION
         SELECT id FROM students
         WHERE (parent_id = $1 OR parent_id IN (SELECT id FROM parents WHERE user_id = $1))
           AND (id = $2 OR user_id = $2)`,
        [parentId, studentId]
      );
      return res.rows.length > 0;
    } else {
      try {
        const row = db.prepare(
          `SELECT ps.id
           FROM parent_students ps
           JOIN parents p ON ps.parent_id = p.id
           WHERE (p.user_id = ? OR p.id = ?)
             AND (ps.student_id = ? OR ps.student_id IN (SELECT id FROM students WHERE user_id = ?))
           UNION
           SELECT id FROM students
           WHERE (parent_id = ? OR parent_id IN (SELECT id FROM parents WHERE user_id = ?))
             AND (id = ? OR user_id = ?)`
        ).get(parentId, parentId, studentId, studentId, parentId, parentId, studentId, studentId);
        return Boolean(row);
      } catch {
        return true;
      }
    }
  },

  /**
   * Check collision before inserting or updating a slot:
   * 1. Class collision (same class, semester, day, period)
   * 2. Teacher collision (same teacher, semester, day, period)
   * 3. Room collision (same room, school, semester, day, period)
   */
  async checkCollisions({
    schoolId,
    classId,
    teacherId = null,
    room = null,
    semesterId = null,
    dayOfWeek,
    period,
    excludeId = null,
  }) {
    if (isPostgresConfigured()) {
      // 1. Class collision
      let classQuery = `
        SELECT t.id, t.subject_name, c.name AS class_name
        FROM timetable t
        JOIN classes c ON t.class_id = c.id
        WHERE t.class_id = $1 
          AND t.day_of_week = $2 
          AND t.period = $3
          AND (t.semester_id = $4 OR t.semester_id IS NULL OR $4 IS NULL)
      `;
      const classParams = [classId, dayOfWeek, period, semesterId];
      if (excludeId) {
        classQuery += ` AND t.id != $5`;
        classParams.push(excludeId);
      }
      const classRes = await pgQuery(classQuery, classParams);
      if (classRes.rows.length > 0) {
        return {
          hasCollision: true,
          type: 'CLASS_COLLISION',
          message: `Lớp ${classRes.rows[0].class_name} đã có môn "${classRes.rows[0].subject_name}" vào Thứ ${dayOfWeek === 8 ? 'CN' : dayOfWeek}, Tiết ${period}.`,
          conflictSlot: classRes.rows[0],
        };
      }

      // 2. Teacher collision
      if (teacherId) {
        let teacherQuery = `
          SELECT t.id, t.subject_name, c.name AS class_name, u.name AS teacher_name
          FROM timetable t
          JOIN classes c ON t.class_id = c.id
          LEFT JOIN users u ON t.teacher_id = u.id
          WHERE t.teacher_id = $1 
            AND t.day_of_week = $2 
            AND t.period = $3
            AND (t.semester_id = $4 OR t.semester_id IS NULL OR $4 IS NULL)
        `;
        const teacherParams = [teacherId, dayOfWeek, period, semesterId];
        if (excludeId) {
          teacherQuery += ` AND t.id != $5`;
          teacherParams.push(excludeId);
        }
        const teacherRes = await pgQuery(teacherQuery, teacherParams);
        if (teacherRes.rows.length > 0) {
          return {
            hasCollision: true,
            type: 'TEACHER_COLLISION',
            message: `Giáo viên ${teacherRes.rows[0].teacher_name || 'này'} đã có tiết dạy lớp ${teacherRes.rows[0].class_name} vào Thứ ${dayOfWeek === 8 ? 'CN' : dayOfWeek}, Tiết ${period}.`,
            conflictSlot: teacherRes.rows[0],
          };
        }
      }

      // 3. Room collision
      if (room && room.trim()) {
        let roomQuery = `
          SELECT t.id, t.subject_name, c.name AS class_name, t.room
          FROM timetable t
          JOIN classes c ON t.class_id = c.id
          WHERE (t.school_id = $1 OR t.school_id IS NULL)
            AND LOWER(t.room) = LOWER($2)
            AND t.day_of_week = $3 
            AND t.period = $4
            AND (t.semester_id = $5 OR t.semester_id IS NULL OR $5 IS NULL)
        `;
        const roomParams = [schoolId, room.trim(), dayOfWeek, period, semesterId];
        if (excludeId) {
          roomQuery += ` AND t.id != $6`;
          roomParams.push(excludeId);
        }
        const roomRes = await pgQuery(roomQuery, roomParams);
        if (roomRes.rows.length > 0) {
          return {
            hasCollision: true,
            type: 'ROOM_COLLISION',
            message: `Phòng ${roomRes.rows[0].room} đã được xếp cho lớp ${roomRes.rows[0].class_name} vào Thứ ${dayOfWeek === 8 ? 'CN' : dayOfWeek}, Tiết ${period}.`,
            conflictSlot: roomRes.rows[0],
          };
        }
      }

      return { hasCollision: false };
    } else {
      // SQLite implementation
      let classQuery = `
        SELECT t.id, t.subject_name, c.name AS class_name
        FROM timetable t
        JOIN classes c ON t.class_id = c.id
        WHERE t.class_id = ? 
          AND t.day_of_week = ? 
          AND t.period = ?
          AND (t.semester_id = ? OR t.semester_id IS NULL OR ? IS NULL)
      `;
      const classParams = [classId, dayOfWeek, period, semesterId, semesterId];
      if (excludeId) {
        classQuery += ` AND t.id != ?`;
        classParams.push(excludeId);
      }
      const classRow = db.prepare(classQuery).get(...classParams);
      if (classRow) {
        return {
          hasCollision: true,
          type: 'CLASS_COLLISION',
          message: `Lớp ${classRow.class_name} đã có môn "${classRow.subject_name}" vào Thứ ${dayOfWeek === 8 ? 'CN' : dayOfWeek}, Tiết ${period}.`,
          conflictSlot: classRow,
        };
      }

      if (teacherId) {
        let teacherQuery = `
          SELECT t.id, t.subject_name, c.name AS class_name, u.name AS teacher_name
          FROM timetable t
          JOIN classes c ON t.class_id = c.id
          LEFT JOIN users u ON t.teacher_id = u.id
          WHERE t.teacher_id = ? 
            AND t.day_of_week = ? 
            AND t.period = ?
            AND (t.semester_id = ? OR t.semester_id IS NULL OR ? IS NULL)
        `;
        const teacherParams = [teacherId, dayOfWeek, period, semesterId, semesterId];
        if (excludeId) {
          teacherQuery += ` AND t.id != ?`;
          teacherParams.push(excludeId);
        }
        const teacherRow = db.prepare(teacherQuery).get(...teacherParams);
        if (teacherRow) {
          return {
            hasCollision: true,
            type: 'TEACHER_COLLISION',
            message: `Giáo viên ${teacherRow.teacher_name || 'này'} đã có tiết dạy lớp ${teacherRow.class_name} vào Thứ ${dayOfWeek === 8 ? 'CN' : dayOfWeek}, Tiết ${period}.`,
            conflictSlot: teacherRow,
          };
        }
      }

      if (room && room.trim()) {
        let roomQuery = `
          SELECT t.id, t.subject_name, c.name AS class_name, t.room
          FROM timetable t
          JOIN classes c ON t.class_id = c.id
          WHERE (t.school_id = ? OR t.school_id IS NULL)
            AND LOWER(t.room) = LOWER(?)
            AND t.day_of_week = ? 
            AND t.period = ?
            AND (t.semester_id = ? OR t.semester_id IS NULL OR ? IS NULL)
        `;
        const roomParams = [schoolId, room.trim(), dayOfWeek, period, semesterId, semesterId];
        if (excludeId) {
          roomQuery += ` AND t.id != ?`;
          roomParams.push(excludeId);
        }
        const roomRow = db.prepare(roomQuery).get(...roomParams);
        if (roomRow) {
          return {
            hasCollision: true,
            type: 'ROOM_COLLISION',
            message: `Phòng ${roomRow.room} đã được xếp cho lớp ${roomRow.class_name} vào Thứ ${dayOfWeek === 8 ? 'CN' : dayOfWeek}, Tiết ${period}.`,
            conflictSlot: roomRow,
          };
        }
      }

      return { hasCollision: false };
    }
  },

  /**
   * Create a new timetable slot
   */
  async createSlot({
    id,
    schoolId,
    classId,
    subjectId,
    subjectName,
    teacherId = null,
    dayOfWeek,
    period,
    startTime = null,
    endTime = null,
    room = null,
    academicYearId = null,
    academicYear = null,
    semesterId = null,
  }) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `INSERT INTO timetable (
          id, school_id, class_id, subject_id, subject_name, teacher_id,
          day_of_week, period, start_time, end_time, room, academic_year_id, academic_year, semester_id,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13, $14,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING *`,
        [
          id, schoolId, classId, subjectId, subjectName, teacherId,
          dayOfWeek, period, startTime, endTime, room, academicYearId, academicYear, semesterId
        ]
      );
      return res.rows[0];
    } else {
      db.prepare(
        `INSERT INTO timetable (
          id, school_id, class_id, subject_id, subject_name, teacher_id,
          day_of_week, period, start_time, end_time, room, academic_year_id, academic_year, semester_id
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?
        )`
      ).run(
        id, schoolId, classId, subjectId, subjectName, teacherId,
        dayOfWeek, period, startTime, endTime, room, academicYearId, academicYear, semesterId
      );
      return this.findSlotById(id, schoolId);
    }
  },

  /**
   * Update an existing timetable slot
   */
  async updateSlot(id, data, schoolId = null) {
    if (isPostgresConfigured()) {
      const fields = [];
      const params = [id];
      let idx = 2;

      const allowed = [
        ['class_id', data.classId],
        ['subject_id', data.subjectId],
        ['subject_name', data.subjectName],
        ['teacher_id', data.teacherId],
        ['day_of_week', data.dayOfWeek],
        ['period', data.period],
        ['start_time', data.startTime],
        ['end_time', data.endTime],
        ['room', data.room],
        ['semester_id', data.semesterId],
        ['academic_year_id', data.academicYearId],
      ];

      for (const [col, val] of allowed) {
        if (val !== undefined) {
          fields.push(`${col} = $${idx}`);
          params.push(val);
          idx++;
        }
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      let query = `UPDATE timetable SET ${fields.join(', ')} WHERE id = $1`;
      if (schoolId) {
        query += ` AND (school_id = $${idx} OR school_id IS NULL)`;
        params.push(schoolId);
      }
      query += ` RETURNING *`;

      const res = await pgQuery(query, params);
      return res.rows[0] || null;
    } else {
      const fields = [];
      const params = [];

      const allowed = [
        ['class_id', data.classId],
        ['subject_id', data.subjectId],
        ['subject_name', data.subjectName],
        ['teacher_id', data.teacherId],
        ['day_of_week', data.dayOfWeek],
        ['period', data.period],
        ['start_time', data.startTime],
        ['end_time', data.endTime],
        ['room', data.room],
        ['semester_id', data.semesterId],
        ['academic_year_id', data.academicYearId],
      ];

      for (const [col, val] of allowed) {
        if (val !== undefined) {
          fields.push(`${col} = ?`);
          params.push(val);
        }
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      let query = `UPDATE timetable SET ${fields.join(', ')} WHERE id = ?`;
      if (schoolId) {
        query += ` AND (school_id = ? OR school_id IS NULL)`;
        params.push(schoolId);
      }

      db.prepare(query).run(...params);
      return this.findSlotById(id, schoolId);
    }
  },

  /**
   * Delete a timetable slot
   */
  async deleteSlot(id, schoolId = null) {
    if (isPostgresConfigured()) {
      let query = `DELETE FROM timetable WHERE id = $1`;
      const params = [id];
      if (schoolId) {
        query += ` AND (school_id = $2 OR school_id IS NULL)`;
        params.push(schoolId);
      }
      query += ` RETURNING *`;
      const res = await pgQuery(query, params);
      return res.rows[0] || null;
    } else {
      const slot = this.findSlotById(id, schoolId);
      if (!slot) return null;
      let query = `DELETE FROM timetable WHERE id = ?`;
      const params = [id];
      if (schoolId) {
        query += ` AND (school_id = ? OR school_id IS NULL)`;
        params.push(schoolId);
      }
      db.prepare(query).run(...params);
      return slot;
    }
  },

  /**
   * Helper to find subject by id
   */
  async findSubjectById(subjectId, schoolId = null) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT * FROM subjects WHERE id = $1 AND (school_id = $2 OR school_id IS NULL OR $2 IS NULL)`,
        [subjectId, schoolId]
      );
      return res.rows[0] || null;
    } else {
      return db.prepare(
        `SELECT * FROM subjects WHERE id = ? AND (school_id = ? OR school_id IS NULL OR ? IS NULL)`
      ).get(subjectId, schoolId, schoolId) || null;
    }
  },

  /**
   * Helper to find class by id
   */
  async findClassById(classId, schoolId = null) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT * FROM classes WHERE id = $1 AND (school_id = $2 OR school_id IS NULL OR $2 IS NULL)`,
        [classId, schoolId]
      );
      return res.rows[0] || null;
    } else {
      return db.prepare(
        `SELECT * FROM classes WHERE id = ? AND (school_id = ? OR school_id IS NULL OR ? IS NULL)`
      ).get(classId, schoolId, schoolId) || null;
    }
  }
};
