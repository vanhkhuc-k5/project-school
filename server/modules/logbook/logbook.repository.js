// =============================================================================
// Logbook Repository — Data Access Layer
// Implements: Digital Class Logbook, Conduct Evaluation, Discipline Records
// =============================================================================
import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';

/**
 * Generate UUID-like IDs
 */
function generateId(prefix = 'lgb') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGBOOK ENTRIES
// ─────────────────────────────────────────────────────────────────────────────

export const logbookRepo = {
  /**
   * Create a new logbook entry
   */
  async create(data) {
    const id = generateId('lgb');
    const entry = {
      id,
      school_id: data.schoolId,
      class_id: data.class_id,
      academic_year: data.academic_year,
      semester: data.semester,
      date: data.date,
      day_of_week: data.day_of_week,
      period_number: data.period_number,
      subject_id: data.subject_id || null,
      subject_name: data.subject_name || null,
      teacher_id: data.teacherId,
      lesson_title: data.lesson_title,
      topic_code: data.topic_code || null,
      present_count: data.present_count || 0,
      absent_count: data.absent_count || 0,
      absent_student_ids: data.absent_student_ids ? JSON.stringify(data.absent_student_ids) : null,
      score: data.score || null,
      rating: data.rating || null,
      notes: data.notes || null,
      homework: data.homework || null,
      status: 'draft',
    };

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO digital_class_logbooks (
          id, school_id, class_id, academic_year, semester, date, day_of_week,
          period_number, subject_id, subject_name, teacher_id, lesson_title,
          topic_code, present_count, absent_count, absent_student_ids,
          score, rating, notes, homework, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        ) RETURNING *
      `, Object.values(entry));
      return res.rows[0];
    }

    const cols = Object.keys(entry).join(', ');
    const placeholders = Object.keys(entry).map(() => '?').join(', ');
    db.prepare(`INSERT INTO digital_class_logbooks (${cols}) VALUES (${placeholders})`).run(...Object.values(entry));
    return this.findById(id);
  },

  /**
   * Find logbook entry by ID
   */
  async findById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery('SELECT * FROM digital_class_logbooks WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return db.prepare('SELECT * FROM digital_class_logbooks WHERE id = ?').get(id) || null;
  },

  /**
   * List logbook entries with filters
   */
  async list({ schoolId, classId, teacherId, academicYear, semester, dateFrom, dateTo, status, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    const conditions = ['school_id = ?'];
    const params = [schoolId];

    if (classId) { conditions.push('class_id = ?'); params.push(classId); }
    if (teacherId) { conditions.push('teacher_id = ?'); params.push(teacherId); }
    if (academicYear) { conditions.push('academic_year = ?'); params.push(academicYear); }
    if (semester) { conditions.push('semester = ?'); params.push(semester); }
    if (dateFrom) { conditions.push('date >= ?'); params.push(dateFrom); }
    if (dateTo) { conditions.push('date <= ?'); params.push(dateTo); }
    if (status) { conditions.push('status = ?'); params.push(status); }

    const where = conditions.join(' AND ');
    const countWhere = params.length;
    params.push(limit, offset);

    if (isPostgresConfigured()) {
      const [dataRes, countRes] = await Promise.all([
        pgQuery(`
          SELECT * FROM digital_class_logbooks
          WHERE ${where}
          ORDER BY date DESC, period_number ASC
          LIMIT $${countWhere + 1} OFFSET $${countWhere + 2}
        `, params),
        pgQuery(`SELECT COUNT(*) as total FROM digital_class_logbooks WHERE ${where}`, params.slice(0, countWhere)),
      ]);
      return { entries: dataRes.rows, total: parseInt(countRes.rows[0].total) };
    }

    const query = `
      SELECT * from digital_class_logbooks
      where ${where}
      order by date desc, period_number asc
      limit ? offset ?
    `;
    const countQuery = `SELECT COUNT(*) as total FROM digital_class_logbooks WHERE ${where}`;
    
    const entries = db.prepare(query).all(...params);
    const { total } = db.prepare(countQuery).get(...params.slice(0, countWhere));
    return { entries, total };
  },

  /**
   * Update logbook entry
   */
  async update(id, data) {
    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'absent_student_ids' && Array.isArray(value) ? JSON.stringify(value) : value);
      }
    });

    if (fields.length === 0) return this.findById(id);

    values.push(id);

    if (isPostgresConfigured()) {
      const paramIndex = fields.map((_, i) => `$${i + 1}`).join(', ');
      await pgQuery(`UPDATE digital_class_logbooks SET ${fields.join(', ')} WHERE id = $${fields.length + 1}`, values);
    } else {
      db.prepare(`UPDATE digital_class_logbooks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.findById(id);
  },

  /**
   * Sign logbook entry (digital signature)
   */
  async sign(id, teacherId, signature) {
    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE digital_class_logbooks 
        SET teacher_signature = $1, signed_at = NOW(), updated_at = NOW()
        WHERE id = $2 AND teacher_id = $3
      `, [signature, id, teacherId]);
    } else {
      db.prepare(`
        UPDATE digital_class_logbooks 
        SET teacher_signature = ?, signed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND teacher_id = ?
      `).run(signature, id, teacherId);
    }
    return this.findById(id);
  },

  /**
   * Get weekly logbook summary for a class
   */
  async getWeeklySummary(classId, weekStartDate, weekEndDate) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          date,
          COUNT(*) as entries,
          COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN rating = 'tot' THEN 1 END) as tot_count,
          COUNT(CASE WHEN rating = 'kha' THEN 1 END) as kha_count,
          COUNT(CASE WHEN rating = 'trung_binh' THEN 1 END) as trung_binh_count,
          COUNT(CASE WHEN rating = 'kem' THEN 1 END) as kem_count
        FROM digital_class_logbooks
        WHERE class_id = $1 AND date BETWEEN $2 AND $3
        GROUP BY date
        ORDER BY date
      `, [classId, weekStartDate, weekEndDate]);
      return res.rows;
    }

    return db.prepare(`
      SELECT 
        date,
        COUNT(*) as entries,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN rating = 'tot' THEN 1 END) as tot_count,
        COUNT(CASE WHEN rating = 'kha' THEN 1 END) as kha_count,
        COUNT(CASE WHEN rating = 'trung_binh' THEN 1 END) as trung_binh_count,
        COUNT(CASE WHEN rating = 'kem' THEN 1 END) as kem_count
      FROM digital_class_logbooks
      WHERE class_id = ? AND date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date
    `).all(classId, weekStartDate, weekEndDate);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONDUCT EVALUATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const conductRepo = {
  /**
   * Create or update conduct evaluation
   */
  async upsert(data) {
    const id = generateId('cnd');
    const existing = await this.findByStudentClass(data.student_id, data.class_id, data.academic_year, data.semester, data.evaluation_type);

    if (existing) {
      return this.update(existing.id, {
        conduct_grade: data.conduct_grade,
        teacher_comment: data.teacher_comment,
        updated_by: data.teacherId,
      });
    }

    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO student_conduct_evaluations (
          id, school_id, student_id, class_id, academic_year, semester,
          conduct_grade, teacher_comment, evaluation_type, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (student_id, class_id, academic_year, semester, evaluation_type) 
        DO UPDATE SET conduct_grade = EXCLUDED.conduct_grade, teacher_comment = EXCLUDED.teacher_comment
      `, [id, data.schoolId, data.student_id, data.class_id, data.academic_year, data.semester, data.conduct_grade, data.teacher_comment, data.evaluation_type || 'semester', data.teacherId]);
    } else {
      db.prepare(`
        INSERT OR REPLACE INTO student_conduct_evaluations (
          id, school_id, student_id, class_id, academic_year, semester,
          conduct_grade, teacher_comment, evaluation_type, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.schoolId, data.student_id, data.class_id, data.academic_year, data.semester, data.conduct_grade, data.teacher_comment, data.evaluation_type || 'semester', data.teacherId);
    }

    return this.findByStudentClass(data.student_id, data.class_id, data.academic_year, data.semester, data.evaluation_type);
  },

  /**
   * Find evaluation by student, class, year, semester
   */
  async findByStudentClass(studentId, classId, academicYear, semester, evaluationType = 'semester') {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM student_conduct_evaluations 
        WHERE student_id = $1 AND class_id = $2 AND academic_year = $3 AND semester = $4 AND evaluation_type = $5
      `, [studentId, classId, academicYear, semester, evaluationType]);
      return res.rows[0] || null;
    }
    return db.prepare(`
      SELECT * FROM student_conduct_evaluations 
      WHERE student_id = ? AND class_id = ? AND academic_year = ? AND semester = ? AND evaluation_type = ?
    `).get(studentId, classId, academicYear, semester, evaluationType) || null;
  },

  /**
   * List evaluations with filters
   */
  async list({ schoolId, classId, studentId, academicYear, semester, evaluationType, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    const conditions = ['school_id = ?'];
    const params = [schoolId];

    if (classId) { conditions.push('class_id = ?'); params.push(classId); }
    if (studentId) { conditions.push('student_id = ?'); params.push(studentId); }
    if (academicYear) { conditions.push('academic_year = ?'); params.push(academicYear); }
    if (semester !== undefined) { conditions.push('semester = ?'); params.push(semester); }
    if (evaluationType) { conditions.push('evaluation_type = ?'); params.push(evaluationType); }

    const where = conditions.join(' AND ');
    const countWhere = params.length;
    params.push(limit, offset);

    if (isPostgresConfigured()) {
      const [dataRes, countRes] = await Promise.all([
        pgQuery(`
          SELECT sce.*, s.name as student_name, s.code as student_code
          FROM student_conduct_evaluations sce
          JOIN students s ON sce.student_id = s.id
          WHERE ${where}
          ORDER BY s.name
          LIMIT $${countWhere + 1} OFFSET $${countWhere + 2}
        `, params),
        pgQuery(`SELECT COUNT(*) as total FROM student_conduct_evaluations WHERE ${where}`, params.slice(0, countWhere)),
      ]);
      return { evaluations: dataRes.rows, total: parseInt(countRes.rows[0].total) };
    }

    const entries = db.prepare(`
      SELECT sce.*, s.name as student_name, s.code as student_code
      FROM student_conduct_evaluations sce
      JOIN students s ON sce.student_id = s.id
      WHERE ${where}
      ORDER BY s.name
      LIMIT ? OFFSET ?
    `).all(...params);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM student_conduct_evaluations WHERE ${where}`).get(...params.slice(0, countWhere));
    return { evaluations: entries, total };
  },

  /**
   * Update evaluation
   */
  async update(id, data) {
    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return this.findById(id);
    values.push(id);

    if (isPostgresConfigured()) {
      await pgQuery(`UPDATE student_conduct_evaluations SET ${fields.join(', ')} WHERE id = $${fields.length + 1}`, values);
    } else {
      db.prepare(`UPDATE student_conduct_evaluations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.findById(id);
  },

  async findById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery('SELECT * FROM student_conduct_evaluations WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return db.prepare('SELECT * FROM student_conduct_evaluations WHERE id = ?').get(id) || null;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DISCIPLINE RECORDS
// ─────────────────────────────────────────────────────────────────────────────

export const disciplineRepo = {
  /**
   * Create discipline record
   */
  async create(data) {
    const id = generateId('dis');
    const record = {
      id,
      school_id: data.schoolId,
      class_id: data.class_id,
      group_id: data.group_id || null,
      student_id: data.student_id,
      date: data.date,
      period_number: data.period_number || 0,
      violation_type: data.violation_type,
      points_deducted: data.points_deducted || -1,
      reported_by: data.reportedBy,
      notes: data.notes || null,
      status: 'pending',
    };

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO class_discipline_records (
          id, school_id, class_id, group_id, student_id, date, period_number,
          violation_type, points_deducted, reported_by, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, Object.values(record));
      return res.rows[0];
    }

    const cols = Object.keys(record).join(', ');
    const placeholders = Object.keys(record).map(() => '?').join(', ');
    db.prepare(`INSERT INTO class_discipline_records (${cols}) VALUES (${placeholders})`).run(...Object.values(record));
    return this.findById(id);
  },

  async findById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery('SELECT * FROM class_discipline_records WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return db.prepare('SELECT * FROM class_discipline_records WHERE id = ?').get(id) || null;
  },

  /**
   * List discipline records with filters
   */
  async list({ schoolId, classId, groupId, studentId, dateFrom, dateTo, violationType, status, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    const conditions = ['school_id = ?'];
    const params = [schoolId];

    if (classId) { conditions.push('class_id = ?'); params.push(classId); }
    if (groupId) { conditions.push('group_id = ?'); params.push(groupId); }
    if (studentId) { conditions.push('student_id = ?'); params.push(studentId); }
    if (dateFrom) { conditions.push('date >= ?'); params.push(dateFrom); }
    if (dateTo) { conditions.push('date <= ?'); params.push(dateTo); }
    if (violationType) { conditions.push('violation_type = ?'); params.push(violationType); }
    if (status) { conditions.push('status = ?'); params.push(status); }

    const where = conditions.join(' AND ');
    const countWhere = params.length;
    params.push(limit, offset);

    if (isPostgresConfigured()) {
      const [dataRes, countRes] = await Promise.all([
        pgQuery(`
          SELECT cdr.*, s.name as student_name, s.code as student_code, u.name as reporter_name
          FROM class_discipline_records cdr
          JOIN students s ON cdr.student_id = s.id
          JOIN users u ON cdr.reported_by = u.id
          WHERE ${where}
          ORDER BY cdr.date DESC, cdr.created_at DESC
          LIMIT $${countWhere + 1} OFFSET $${countWhere + 2}
        `, params),
        pgQuery(`SELECT COUNT(*) as total FROM class_discipline_records WHERE ${where}`, params.slice(0, countWhere)),
      ]);
      return { records: dataRes.rows, total: parseInt(countRes.rows[0].total) };
    }

    const entries = db.prepare(`
      SELECT cdr.*, s.name as student_name, s.code as student_code, u.name as reporter_name
      FROM class_discipline_records cdr
      JOIN students s ON cdr.student_id = s.id
      JOIN users u ON cdr.reported_by = u.id
      WHERE ${where}
      ORDER BY cdr.date DESC, cdr.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params);
    const { total } = db.prepare(`SELECT COUNT(*) as total FROM class_discipline_records WHERE ${where}`).get(...params.slice(0, countWhere));
    return { records: entries, total };
  },

  /**
   * Update discipline record
   */
  async update(id, data) {
    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return this.findById(id);
    values.push(id);

    if (isPostgresConfigured()) {
      await pgQuery(`UPDATE class_discipline_records SET ${fields.join(', ')} WHERE id = $${fields.length + 1}`, values);
    } else {
      db.prepare(`UPDATE class_discipline_records SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.findById(id);
  },

  /**
   * Get discipline summary by group (for class monitor dashboard)
   */
  async getGroupSummary(classId, dateFrom, dateTo) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT 
          cg.name as group_name,
          cg.id as group_id,
          COUNT(cdr.id) as violation_count,
          SUM(cdr.points_deducted) as total_points,
          COUNT(DISTINCT cdr.student_id) as students_involved
        FROM class_groups cg
        LEFT JOIN class_discipline_records cdr ON cg.id = cdr.group_id
          AND cdr.date BETWEEN $2 AND $3
        WHERE cg.class_id = $1 AND cg.is_active = TRUE
        GROUP BY cg.id, cg.name
        ORDER BY cg.name
      `, [classId, dateFrom, dateTo]);
      return res.rows;
    }

    return db.prepare(`
      SELECT 
        cg.name as group_name,
        cg.id as group_id,
        COUNT(cdr.id) as violation_count,
        SUM(cdr.points_deducted) as total_points,
        COUNT(DISTINCT cdr.student_id) as students_involved
      FROM class_groups cg
      LEFT JOIN class_discipline_records cdr ON cg.id = cdr.group_id
        AND cdr.date BETWEEN ? AND ?
      WHERE cg.class_id = ? AND cg.is_active = TRUE
      GROUP BY cg.id, cg.name
      ORDER BY cg.name
    `).all(dateFrom, dateTo, classId);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SEATING ARRANGEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export const seatingRepo = {
  /**
   * Save or update seating arrangement
   */
  async save(data) {
    const id = generateId('seat');

    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO class_seating_arrangements (
          id, school_id, class_id, academic_year, semester, rows, cols, seating_data, description, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
        ON CONFLICT (class_id, academic_year, semester)
        DO UPDATE SET rows = EXCLUDED.rows, cols = EXCLUDED.cols, 
                      seating_data = EXCLUDED.seating_data, description = EXCLUDED.description,
                      updated_at = NOW()
        RETURNING *
      `, [id, data.schoolId, data.class_id, data.academic_year, data.semester, data.rows, data.cols, JSON.stringify(data.seating_data), data.description || null]);
    } else {
      db.prepare(`
        INSERT OR REPLACE INTO class_seating_arrangements (
          id, school_id, class_id, academic_year, semester, rows, cols, seating_data, description, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `).run(id, data.schoolId, data.class_id, data.academic_year, data.semester, data.rows, data.cols, JSON.stringify(data.seating_data), data.description || null);
    }

    return this.findByClass(data.class_id, data.academic_year, data.semester);
  },

  /**
   * Find seating arrangement by class
   */
  async findByClass(classId, academicYear, semester = 0) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM class_seating_arrangements
        WHERE class_id = $1 AND academic_year = $2 AND semester = $3 AND is_active = TRUE
      `, [classId, academicYear, semester]);
      return res.rows[0] || null;
    }
    return db.prepare(`
      SELECT * FROM class_seating_arrangements
      WHERE class_id = ? AND academic_year = ? AND semester = ? AND is_active = TRUE
    `).get(classId, academicYear, semester) || null;
  },
};
