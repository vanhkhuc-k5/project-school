// =============================================================================
// Gradebook Repository — data access for G20 Production Gradebook
// =============================================================================
import { db } from '../../db.js';
import { isPostgresConfigured, pgQuery } from '../../shared/database/connection.js';

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function parseJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

// ---------------------------------------------------------------------------
// GRADE CATEGORIES
// ---------------------------------------------------------------------------

export async function listCategories({ schoolId, isActive } = {}) {
  const where = [];
  const params = [];

  if (schoolId) { where.push('school_id = ?'); params.push(schoolId); }
  if (isActive !== undefined) { where.push('is_active = ?'); params.push(isActive ? 1 : 0); }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  if (isPostgresConfigured()) {
    const sql = `SELECT * FROM grade_categories ${whereClause} ORDER BY sort_order ASC, name ASC`;
    const res = await pgQuery(sql, params);
    return res.rows;
  }
  return db.prepare(`SELECT * FROM grade_categories ${whereClause} ORDER BY sort_order ASC, name ASC`).all(...params);
}

export async function getCategoryById(id) {
  if (isPostgresConfigured()) {
    const res = await pgQuery('SELECT * FROM grade_categories WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return db.prepare('SELECT * FROM grade_categories WHERE id = ?').get(id) || null;
}

export async function getCategoryByCode({ schoolId, code }) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(
      'SELECT * FROM grade_categories WHERE school_id = $1 AND code = $2',
      [schoolId, code]
    );
    return res.rows[0] || null;
  }
  return db.prepare(
    'SELECT * FROM grade_categories WHERE school_id = ? AND code = ?'
  ).get(schoolId, code) || null;
}

export async function createCategory({ data, schoolId }) {
  const id = newId('gc');
  const {
    name, code, coefficient = 1.0, weight = 1.0,
    minEntriesPerSemester = 1, sortOrder = 0, isActive = true,
  } = data;

  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO grade_categories
        (id, school_id, name, code, coefficient, weight, min_entries_per_semester, sort_order, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [id, schoolId, name, code, coefficient, weight, minEntriesPerSemester, sortOrder, isActive]);
    return id;
  }
  db.prepare(`
    INSERT INTO grade_categories
      (id, school_id, name, code, coefficient, weight, min_entries_per_semester, sort_order, is_active)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(id, schoolId, name, code, coefficient, weight, minEntriesPerSemester, sortOrder, isActive ? 1 : 0);
  return id;
}

export async function updateCategory({ id, data }) {
  const fields = [];
  const values = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.code !== undefined) { fields.push('code = ?'); values.push(data.code); }
  if (data.coefficient !== undefined) { fields.push('coefficient = ?'); values.push(data.coefficient); }
  if (data.weight !== undefined) { fields.push('weight = ?'); values.push(data.weight); }
  if (data.minEntriesPerSemester !== undefined) { fields.push('min_entries_per_semester = ?'); values.push(data.minEntriesPerSemester); }
  if (data.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(data.sortOrder); }
  if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }

  if (fields.length === 0) return;

  if (isPostgresConfigured()) {
    values.push(id);
    await pgQuery(`UPDATE grade_categories SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
  } else {
    db.prepare(`UPDATE grade_categories SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);
  }
}

// ---------------------------------------------------------------------------
// GRADE ENTRIES
// ---------------------------------------------------------------------------

export async function listGrades({ filters = {} }) {
  const {
    studentId, subjectId, gradeCategoryId,
    academicYearId, semesterId,
    status = 'all', gradingPeriod = 'all',
    page = 1, limit = 100,
  } = filters;
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];

  if (studentId) { where.push('g.student_id = ?'); params.push(studentId); }
  if (subjectId) { where.push('g.subject_id = ?'); params.push(subjectId); }
  if (gradeCategoryId) { where.push('g.grade_category_id = ?'); params.push(gradeCategoryId); }
  if (academicYearId) { where.push('g.academic_year_id = ?'); params.push(academicYearId); }
  if (semesterId) { where.push('g.semester_id = ?'); params.push(semesterId); }
  if (status !== 'all') { where.push('g.status = ?'); params.push(status); }
  if (gradingPeriod !== 'all') { where.push('g.grading_period = ?'); params.push(gradingPeriod); }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  if (isPostgresConfigured()) {
    const countRes = await pgQuery(`SELECT COUNT(*) as cnt FROM grades g ${whereClause}`, params);
    const total = parseInt(countRes.rows[0]?.cnt || 0, 10);
    const rowsRes = await pgQuery(`
      SELECT g.*, gc.name as category_name, gc.code as category_code
      FROM grades g
      LEFT JOIN grade_categories gc ON gc.id = g.grade_category_id
      ${whereClause}
      ORDER BY g.graded_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params);
    return { grades: rowsRes.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM grades g ${whereClause}`).get(...params).cnt;
  const rows = db.prepare(`
    SELECT g.*, gc.name as category_name, gc.code as category_code
    FROM grades g
    LEFT JOIN grade_categories gc ON gc.id = g.grade_category_id
    ${whereClause}
    ORDER BY g.graded_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  return { grades: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getGradeById(id) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT g.*, gc.name as category_name, gc.code as category_code
      FROM grades g
      LEFT JOIN grade_categories gc ON gc.id = g.grade_category_id
      WHERE g.id = $1
    `, [id]);
    return res.rows[0] || null;
  }
  return db.prepare(`
    SELECT g.*, gc.name as category_name, gc.code as category_code
    FROM grades g
    LEFT JOIN grade_categories gc ON gc.id = g.grade_category_id
    WHERE g.id = ?
  `).get(id) || null;
}

export async function createGrade({ data, teacherId, schoolId }) {
  const id = newId('grd');
  const {
    studentId, subject, subjectId, assignmentId, classId,
    gradeCategoryId, rawScore, maxScore = 10.0,
    weight = 1.0, gradingPeriod = 'regular',
    academicYearId, semesterId, teacherFeedback = '',
    status = 'draft',
  } = data;

  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO grades (
        id, student_id, subject, test_name, subject_id, assignment_id, class_id, grade_category_id,
        raw_score, max_score, weight, grading_period,
        academic_year_id, semester_id, teacher_feedback,
        status, teacher_name, school_id, score, graded_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,CURRENT_TIMESTAMP)
    `, [
      id, studentId, subject, subject || 'Grade Entry', subjectId || null, assignmentId || null, classId || null,
      gradeCategoryId || null, rawScore, maxScore, weight, gradingPeriod,
      academicYearId || null, semesterId || null, teacherFeedback,
      status, teacherId || 'GV', schoolId, rawScore,
    ]);
    return id;
  }

  db.prepare(`
    INSERT INTO grades (
      id, student_id, subject, test_name, subject_id, assignment_id, class_id, grade_category_id,
      raw_score, max_score, weight, grading_period,
      academic_year_id, semester_id, teacher_feedback,
      status, teacher_name, school_id,
      score, graded_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
  `).run(
    id, studentId, subject, subject || 'Grade Entry', subjectId || null, assignmentId || null, classId || null,
    gradeCategoryId || null, rawScore, maxScore, weight, gradingPeriod,
    academicYearId || null, semesterId || null, teacherFeedback,
    status, teacherId || 'GV', schoolId || 'sch_bacau',
    rawScore, // score field (legacy)
  );
  return id;
}

export async function updateGrade({ id, data }) {
  const fields = [];
  const values = [];

  if (data.rawScore !== undefined) {
    fields.push('raw_score = ?', 'score = ?');
    values.push(data.rawScore, data.rawScore);
  }
  if (data.maxScore !== undefined) { fields.push('max_score = ?'); values.push(data.maxScore); }
  if (data.weight !== undefined) { fields.push('weight = ?'); values.push(data.weight); }
  if (data.gradingPeriod !== undefined) { fields.push('grading_period = ?'); values.push(data.gradingPeriod); }
  if (data.teacherFeedback !== undefined) { fields.push('teacher_feedback = ?'); values.push(data.teacherFeedback); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  fields.push('updated_at = ?');
  values.push(new Date().toISOString());

  if (fields.length === 1) return; // only updated_at

  if (isPostgresConfigured()) {
    values.push(id);
    await pgQuery(`UPDATE grades SET ${fields.join(', ')} WHERE id = $${values.length}`, values);
  } else {
    db.prepare(`UPDATE grades SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);
  }
}

export async function publishGrade({ id, publishedBy }) {
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
    await pgQuery(`
      UPDATE grades SET status = 'published', published_at = $1, published_by = $2, updated_at = $1
      WHERE id = $3 AND status = 'draft'
      RETURNING id
    `, [now, publishedBy, id]);
  } else {
    db.prepare(`
      UPDATE grades SET status = 'published', published_at = ?, published_by = ?, updated_at = ?
      WHERE id = ? AND status = 'draft'
    `).run(now, publishedBy, now, id);
  }
}

export async function batchPublishGrades({ gradeIds, publishedBy }) {
  for (const id of gradeIds) {
    await publishGrade({ id, publishedBy });
  }
}

// ---------------------------------------------------------------------------

// GRADE CALCULATION CONFIG
// ---------------------------------------------------------------------------

export async function listConfigs({ schoolId, academicYearId, semesterId } = {}) {
  const where = [];
  const params = [];
  if (schoolId) { where.push('school_id = ?'); params.push(schoolId); }
  if (academicYearId) { where.push('academic_year_id = ?'); params.push(academicYearId); }
  if (semesterId) { where.push('semester_id = ?'); params.push(semesterId); }
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  if (isPostgresConfigured()) {
    const res = await pgQuery(
      `SELECT * FROM grade_calculation_configs ${whereClause} ORDER BY created_at DESC`,
      params
    );
    return res.rows.map((r) => ({
      ...r,
      categoryWeights: parseJson(r.category_weights),
      minEntries: parseJson(r.min_entries),
    }));
  }
  const rows = db.prepare(`SELECT * FROM grade_calculation_configs ${whereClause} ORDER BY created_at DESC`).all(...params);
  return rows.map((r) => ({
    ...r,
    categoryWeights: parseJson(r.category_weights),
    minEntries: parseJson(r.min_entries),
  }));
}

export async function createCalculationConfig({ data, createdBy }) {
  const id = newId('gcc');
  const {
    schoolId, academicYearId, semesterId, periodLabel,
    categoryWeights, minEntries, scaleFactor = 10.0,
  } = data;

  const cw = JSON.stringify(categoryWeights || {});
  const me = JSON.stringify(minEntries || {});

  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO grade_calculation_configs
        (id, school_id, academic_year_id, semester_id, period_label,
         category_weights, min_entries, scale_factor, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [id, schoolId, academicYearId, semesterId, periodLabel, cw, me, scaleFactor, createdBy]);
  } else {
    db.prepare(`
      INSERT INTO grade_calculation_configs
        (id, school_id, academic_year_id, semester_id, period_label,
         category_weights, min_entries, scale_factor, created_by)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(id, schoolId, academicYearId, semesterId, periodLabel, cw, me, scaleFactor, createdBy);
  }
  return id;
}

// ---------------------------------------------------------------------------
// GRADE CALCULATION SNAPSHOTS (append-only, immutable)
// ---------------------------------------------------------------------------

export async function listSnapshots({ filters = {} }) {
  const { studentId, academicYearId, semesterId, subjectId, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];
  if (studentId) { where.push('student_id = ?'); params.push(studentId); }
  if (academicYearId) { where.push('academic_year_id = ?'); params.push(academicYearId); }
  if (semesterId) { where.push('semester_id = ?'); params.push(semesterId); }
  if (subjectId) { where.push('subject_id = ?'); params.push(subjectId); }
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  if (isPostgresConfigured()) {
    const countRes = await pgQuery(
      `SELECT COUNT(*) as cnt FROM grade_calculation_snapshots ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.cnt || 0, 10);
    const rowsRes = await pgQuery(`
      SELECT * FROM grade_calculation_snapshots ${whereClause}
      ORDER BY computed_at DESC LIMIT ${limit} OFFSET ${offset}
    `, params);
    return {
      snapshots: rowsRes.rows.map((r) => ({
        ...r,
        configSnapshot: parseJson(r.config_snapshot),
        categoryAverages: parseJson(r.category_averages),
      })),
      total, page, limit, totalPages: Math.ceil(total / limit),
    };
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM grade_calculation_snapshots ${whereClause}`).get(...params).cnt;
  const rows = db.prepare(`
    SELECT * FROM grade_calculation_snapshots ${whereClause}
    ORDER BY computed_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  return {
    snapshots: rows.map((r) => ({
      ...r,
      configSnapshot: parseJson(r.config_snapshot),
      categoryAverages: parseJson(r.category_averages),
    })),
    total, page, limit, totalPages: Math.ceil(total / limit),
  };
}

export async function createSnapshot({ data }) {
  const id = newId('gcs');
  const {
    studentId, schoolId, academicYearId, semesterId, subjectId,
    configSnapshot, categoryAverages, finalScore, scaleFactor,
    version = 1, computedBy,
  } = data;

  const cs = JSON.stringify(configSnapshot || {});
  const ca = JSON.stringify(categoryAverages || {});

  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO grade_calculation_snapshots
        (id, student_id, school_id, academic_year_id, semester_id, subject_id,
         config_snapshot, category_averages, final_score, scale_factor, version, computed_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, [id, studentId, schoolId, academicYearId, semesterId, subjectId || null, cs, ca, finalScore, scaleFactor, version, computedBy || null]);
  } else {
    db.prepare(`
      INSERT INTO grade_calculation_snapshots
        (id, student_id, school_id, academic_year_id, semester_id, subject_id,
         config_snapshot, category_averages, final_score, scale_factor, version, computed_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(id, studentId, schoolId, academicYearId, semesterId, subjectId || null, cs, ca, finalScore, scaleFactor, version, computedBy || null);
  }
  return id;
}

// ---------------------------------------------------------------------------
// GET LATEST CONFIG for a school/academic_year/semester
// ---------------------------------------------------------------------------

export async function getLatestConfig({ schoolId, academicYearId, semesterId }) {
  const rows = await listConfigs({ schoolId, academicYearId, semesterId });
  // Return the most recently created config
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// GET GRADES FOR CALCULATION (all draft + published for a student/term)
// ---------------------------------------------------------------------------

export async function getGradesForCalculation({ studentId, academicYearId, semesterId, subjectId }) {
  const where = ['g.student_id = ?'];
  const params = [studentId];

  if (academicYearId) { where.push('g.academic_year_id = ?'); params.push(academicYearId); }
  if (semesterId) { where.push('g.semester_id = ?'); params.push(semesterId); }
  if (subjectId) { where.push('g.subject_id = ?'); params.push(subjectId); }

  const whereClause = where.join(' AND ');

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT g.*, gc.code as category_code, gc.name as category_name
      FROM grades g
      LEFT JOIN grade_categories gc ON gc.id = g.grade_category_id
      WHERE ${whereClause}
    `, params);
    return res.rows;
  }
  return db.prepare(`
    SELECT g.*, gc.code as category_code, gc.name as category_name
    FROM grades g
    LEFT JOIN grade_categories gc ON gc.id = g.grade_category_id
    WHERE ${whereClause}
  `).all(...params);
}

// ---------------------------------------------------------------------------
// TEACHER GRADING WORKFLOW (G21)
// ---------------------------------------------------------------------------

/**
 * Get students enrolled in a class, for the class gradebook view.
 * Only students with active enrollment.
 */
export async function getClassStudents({ classId, academicYearId, semesterId }) {
  // NOTE: semesterId is NOT stored in class_enrollments (enrollment is per academic year)
  // It is passed for API compatibility but is ignored here
  const where = [];
  const pgParams = [];
  let pIdx = 1;

  if (classId) { where.push(`e.class_id = $${pIdx++}`); pgParams.push(classId); }
  // Enrollment status should be 'enrolled' (not 'active') per enrollment service
  where.push(`e.status = $${pIdx++}`); pgParams.push('enrolled');
  if (academicYearId) { where.push(`e.academic_year_id = $${pIdx++}`); pgParams.push(academicYearId); }

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT s.id as student_id, u.name, s.student_code,
             u.id as user_id, u.email
      FROM students s
      JOIN class_enrollments e ON e.student_id = s.id
      JOIN users u ON u.id = s.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY u.name ASC
    `, pgParams);
    return res.rows;
  }
  // SQLite fallback (uses ? placeholders)
  const sqliteParams = pgParams;
  return db.prepare(`
    SELECT s.id as student_id, u.name, s.student_code,
           u.id as user_id, u.email
    FROM students s
    JOIN class_enrollments e ON e.student_id = s.id
    JOIN users u ON u.id = s.user_id
    WHERE ${where.join(' AND ').replace(/\$[0-9]+/g, '?')}
    ORDER BY u.name ASC
  `).all(...sqliteParams);
}

/**
 * Get all grades for a class (for class gradebook view).
 * Filters by teacher authorization scope.
 */
export async function getClassGrades({ classId, academicYearId, semesterId, subjectId, status }) {
  // semesterId is optional filter - if provided, match grades.semester_id OR grades without semester_id
  // (seeded data often has NULL semester_id)
  const where = [];
  const pgParams = [];
  let pIdx = 1;

  where.push(`g.student_id IN (SELECT student_id FROM class_enrollments WHERE class_id = $${pIdx++} AND status = $${pIdx++})`);
  pgParams.push(classId, 'enrolled');

  if (academicYearId) { where.push(`g.academic_year_id = $${pIdx++}`); pgParams.push(academicYearId); }
  if (semesterId) {
    // Match either the specific semester OR grades with NULL semester_id (backward compat)
    where.push(`(g.semester_id = $${pIdx++} OR g.semester_id IS NULL)`);
    pgParams.push(semesterId);
  }
  if (subjectId) { where.push(`g.subject_id = $${pIdx++}`); pgParams.push(subjectId); }
  if (status && status !== 'all') { where.push(`g.status = $${pIdx++}`); pgParams.push(status); }

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT g.*, gc.name as category_name, gc.code as category_code
      FROM grades g
      LEFT JOIN grade_categories gc ON gc.id = g.grade_category_id
      WHERE ${where.join(' AND ')}
      ORDER BY g.graded_at DESC
    `, pgParams);
    return res.rows;
  }
  // SQLite fallback: convert $n to ?
  const sqliteParams = pgParams;
  const sqliteWhere = where.map(w => w.replace(/\$[0-9]+/g, '?'));
  return db.prepare(`
    SELECT g.*, gc.name as category_name, gc.code as category_code
    FROM grades g
    LEFT JOIN grade_categories gc ON gc.id = g.grade_category_id
    WHERE ${sqliteWhere.join(' AND ')}
    ORDER BY g.graded_at DESC
  `).all(...sqliteParams);
}

/**
 * Get teacher's teaching assignments for authorization check.
 * Returns class+subject combos the teacher is authorized to grade.
 */
export async function getTeacherGradingAssignments(teacherId) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT ta.id, ta.class_id, ta.subject_id, ta.semester_id, ta.academic_year_id,
             c.name as class_name, s.name as subject_name
      FROM teacher_assignments ta
      LEFT JOIN classes c ON c.id = ta.class_id
      LEFT JOIN subjects s ON s.id = ta.subject_id
      WHERE ta.teacher_id = $1 AND ta.status = 'active'
    `, [teacherId]);
    return res.rows;
  }
  return db.prepare(`
    SELECT ta.id, ta.class_id, ta.subject_id, ta.semester_id, ta.academic_year_id,
           c.name as class_name, s.name as subject_name
    FROM teacher_assignments ta
    LEFT JOIN classes c ON c.id = ta.class_id
    LEFT JOIN subjects s ON s.id = ta.subject_id
    WHERE ta.teacher_id = ? AND ta.status = 'active'
  `).all(teacherId);
}

/**
 * Verify a teacher is authorized to grade in a specific class/subject.
 * Returns true if authorized, false otherwise.
 * Note: semesterId matching is lenient - NULL assignment semester matches any semesterId
 * (for backward compatibility with seeded data that lacks semester_id).
 */
export async function isTeacherAuthorized({ teacherId, classId, targetSubjectId, semesterId }) {
  const assignments = await getTeacherGradingAssignments(teacherId);
  return assignments.some((a) => {
    const classMatch = !classId || a.class_id === classId;
    const subjectMatch = !targetSubjectId || a.subject_id === targetSubjectId;
    // Lenient: NULL semester_id matches any semesterId (backward compat)
    const semesterMatch = !semesterId || a.semester_id === semesterId || a.semester_id === null;
    return classMatch && subjectMatch && semesterMatch;
  });
}

/**
 * Save a draft grade (create or update).
 * Creates an audit log entry for 'created' or 'draft_updated'.
 */
export async function saveDraftGrade({ data, teacherId, teacherName, actorRole, schoolId }) {
  const {
    id: existingId,
    studentId, subject, _subjectId,
    assignmentId,
    gradeCategoryId, rawScore, maxScore = 10.0,
    weight = 1.0, gradingPeriod = 'regular',
    academicYearId, semesterId, teacherFeedback = '',
    status = 'draft',
  } = data;

  const now = new Date().toISOString();

  if (existingId) {
    // UPDATE existing draft
    const existing = await getGradeById(existingId);
    if (!existing) throw new Error('Grade not found');

    if (existing.status === 'published' && !existing.locked_at) {
      throw new Error('Cannot edit published grade without unlock');
    }

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE grades SET
          raw_score = $1, max_score = $2, weight = $3, grading_period = $4,
          teacher_feedback = $5, updated_at = $6
        WHERE id = $7 AND status IN ('draft', 'published')
      `, [rawScore, maxScore, weight, gradingPeriod, teacherFeedback, now, existingId]);
    } else {
      db.prepare(`
        UPDATE grades SET
          raw_score = ?, max_score = ?, weight = ?, grading_period = ?,
          teacher_feedback = ?, updated_at = ?
        WHERE id = ? AND status IN ('draft', 'published')
      `).run(rawScore, maxScore, weight, gradingPeriod, teacherFeedback, now, existingId);
    }

    // Audit log
    await createAuditLog({
      gradeId: existingId,
      studentId: existing.student_id,
      subject: existing.subject,
      schoolId,
      actorId: teacherId,
      actorName: teacherName,
      actorRole,
      action: existing.status === 'published' ? 'correction' : 'draft_updated',
      previousRawScore: parseFloat(existing.raw_score ?? existing.score),
      previousMaxScore: parseFloat(existing.max_score ?? 10),
      previousStatus: existing.status,
      previousFeedback: existing.teacher_feedback,
      newRawScore: rawScore,
      newMaxScore: maxScore,
      newStatus: status,
      newFeedback: teacherFeedback,
      assignmentId: assignmentId,
      gradeCategoryId: gradeCategoryId,
      academicYearId,
      semesterId,
    });

    return getGradeById(existingId);
  } else {
    // CREATE new draft
    const id = await createGrade({ data, teacherId, schoolId });

    // Audit log
    await createAuditLog({
      gradeId: id,
      studentId,
      subject,
      schoolId,
      actorId: teacherId,
      actorName: teacherName,
      actorRole,
      action: 'created',
      newRawScore: rawScore,
      newMaxScore: maxScore,
      newStatus: status,
      newFeedback: teacherFeedback,
      assignmentId: assignmentId,
      gradeCategoryId: gradeCategoryId,
      academicYearId,
      semesterId,
    });

    return getGradeById(id);
  }
}

/**
 * Unlock a published grade so it can be corrected.
 */
export async function unlockGrade({ gradeId, unlockedBy, reason }) {
  const now = new Date().toISOString();
  const existing = await getGradeById(gradeId);
  if (!existing) throw new Error('Grade not found');
  if (existing.status !== 'published') throw new Error('Only published grades can be unlocked');

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      UPDATE grades SET status = 'draft', locked_at = $1, locked_by = $2, updated_at = $1
      WHERE id = $3 AND status = 'published'
      RETURNING id, status
    `, [now, unlockedBy, gradeId]);
    const updated = res.rows[0];
    if (!updated) return null; // already unlocked or not found
    await createAuditLog({
      gradeId,
      studentId: existing.student_id,
      subject: existing.subject,
      schoolId: existing.school_id,
      actorId: unlockedBy,
      actorName: null,
      actorRole: null,
      action: 'unlocked',
      previousStatus: 'published',
      newStatus: 'draft',
      reason: reason || 'Yêu cầu chỉnh sửa điểm',
      assignmentId: existing.assignment_id,
      gradeCategoryId: existing.grade_category_id,
      academicYearId: existing.academic_year_id,
      semesterId: existing.semester_id,
    });
    return { ...updated, status: 'draft' };
  } else {
    db.prepare(`
      UPDATE grades SET status = 'draft', locked_at = ?, locked_by = ?, updated_at = ?
      WHERE id = ? AND status = 'published'
    `).run(now, unlockedBy, now, gradeId);
    await createAuditLog({
      gradeId,
      studentId: existing.student_id,
      subject: existing.subject,
      schoolId: existing.school_id,
      actorId: unlockedBy,
      actorName: null,
      actorRole: null,
      action: 'unlocked',
      previousStatus: 'published',
      newStatus: 'draft',
      reason: reason || 'Yêu cầu chỉnh sửa điểm',
      assignmentId: existing.assignment_id,
      gradeCategoryId: existing.grade_category_id,
      academicYearId: existing.academic_year_id,
      semesterId: existing.semester_id,
    });
    return { ...existing, status: 'draft', locked_at: now, locked_by: unlockedBy };
  }
}

/**
 * Bulk-enter grades for multiple students (simple score entry).
 * Creates a draft grade for each student.
 * Returns list of { studentId, success, gradeId, error }.
 */
export async function bulkEnterGrades({ studentIds, subject, subjectId, classId, gradeCategoryId, rawScores, maxScore, weight, gradingPeriod, academicYearId, semesterId, teacherId, teacherName, actorRole, schoolId }) {
  const results = [];

  for (let i = 0; i < studentIds.length; i++) {
    const studentId = studentIds[i];
    const rawScore = Array.isArray(rawScores) ? rawScores[i] : rawScores;

    if (rawScore === undefined || rawScore === null) {
      results.push({ studentId, success: false, error: 'Missing score' });
      continue;
    }

    try {
      // Check score bounds
      if (rawScore < 0) throw new Error('Score cannot be negative');
      if (rawScore > maxScore) throw new Error('Score exceeds maximum');

      const id = await createGrade({
        data: {
          studentId, subject, subjectId, classId,
          gradeCategoryId,
          rawScore,
          maxScore,
          weight,
          gradingPeriod,
          academicYearId,
          semesterId,
          teacherFeedback: '',
          status: 'draft',
        },
        teacherId,
        schoolId,
      });

      // Audit log for bulk entry
      await createAuditLog({
        gradeId: id,
        studentId,
        subject,
        schoolId,
        actorId: teacherId,
        actorName: teacherName,
        actorRole,
        action: 'created',
        newRawScore: rawScore,
        newMaxScore: maxScore,
        newStatus: 'draft',
        newFeedback: '',
        assignmentId: null,
        gradeCategoryId,
        academicYearId,
        semesterId,
      });

      results.push({ studentId, success: true, gradeId: id });
    } catch (err) {
      results.push({ studentId, success: false, error: err.message });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// GRADE AUDIT LOG (append-only, immutable)
// ---------------------------------------------------------------------------

export async function createAuditLog({
  gradeId, studentId, subject, schoolId,
  actorId, actorName, actorRole,
  action,
  previousRawScore, previousMaxScore, previousStatus, previousFeedback,
  newRawScore, newMaxScore, newStatus, newFeedback,
  reason, assignmentId, gradeCategoryId, academicYearId, semesterId,
}) {
  const id = newId('gal');

  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO grade_audit_logs
        (id, grade_id, student_id, subject, school_id,
         actor_id, actor_name, actor_role, action,
         previous_raw_score, previous_max_score, previous_status, previous_feedback,
         new_raw_score, new_max_score, new_status, new_feedback,
         reason, assignment_id, grade_category_id, academic_year_id, semester_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
    `, [
      id, gradeId, studentId, subject, schoolId,
      actorId, actorName || null, actorRole || null, action,
      previousRawScore ?? null, previousMaxScore ?? null, previousStatus ?? null, previousFeedback ?? null,
      newRawScore ?? null, newMaxScore ?? null, newStatus ?? null, newFeedback ?? null,
      reason ?? null, assignmentId ?? null, gradeCategoryId ?? null, academicYearId ?? null, semesterId ?? null,
    ]);
  } else {
    db.prepare(`
      INSERT INTO grade_audit_logs
        (id, grade_id, student_id, subject, school_id,
         actor_id, actor_name, actor_role, action,
         previous_raw_score, previous_max_score, previous_status, previous_feedback,
         new_raw_score, new_max_score, new_status, new_feedback,
         reason, assignment_id, grade_category_id, academic_year_id, semester_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, gradeId, studentId, subject, schoolId || null,
      actorId, actorName || null, actorRole || null, action,
      previousRawScore ?? null, previousMaxScore ?? null, previousStatus ?? null, previousFeedback ?? null,
      newRawScore ?? null, newMaxScore ?? null, newStatus ?? null, newFeedback ?? null,
      reason ?? null, assignmentId ?? null, gradeCategoryId ?? null, academicYearId ?? null, semesterId ?? null,
    );
  }
  return id;
}

export async function getAuditLogs({ filters = {} }) {
  const { gradeId, studentId, actorId, schoolId, action, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];
  if (gradeId) { where.push('grade_id = ?'); params.push(gradeId); }
  if (studentId) { where.push('student_id = ?'); params.push(studentId); }
  if (actorId) { where.push('actor_id = ?'); params.push(actorId); }
  if (schoolId) { where.push('school_id = ?'); params.push(schoolId); }
  if (action) { where.push('action = ?'); params.push(action); }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT * FROM grade_audit_logs ${whereClause}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `, params);
    return res.rows;
  }
  return db.prepare(`
    SELECT * FROM grade_audit_logs ${whereClause}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
}

// ---------------------------------------------------------------------------
// ADDITIONAL REPOSITORY FUNCTIONS FOR TT22 ENGINE
// ---------------------------------------------------------------------------

/**
 * Get a student by ID.
 */
export async function getStudentById(studentId) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT s.*, u.name, u.email, c.name as class_name
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.id = $1
    `, [studentId]);
    return res.rows[0] || null;
  }
  return db.prepare(`
    SELECT s.*, u.name, u.email, c.name as class_name
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN classes c ON c.id = s.class_id
    WHERE s.id = ?
  `).get(studentId) || null;
}

/**
 * Get all grades for a specific student.
 */
export async function getStudentGrades(studentId, academicYearId, semesterId) {
  const where = ['g.student_id = ?'];
  const params = [studentId];

  if (academicYearId) { where.push('g.academic_year_id = ?'); params.push(academicYearId); }
  if (semesterId) { where.push('(g.semester_id = ? OR g.semester = ?)'); params.push(semesterId, semesterId); }

  const whereClause = where.join(' AND ');

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT g.*, gc.code as category_code, gc.name as category_name,
             s.name as subject_name, s.code as subject_code, s.evaluation_type
      FROM grades g
      LEFT JOIN grade_categories gc ON gc.id = g.grade_category_id
      LEFT JOIN subjects s ON s.id = g.subject_id
      WHERE ${whereClause}
      ORDER BY s.name ASC, g.graded_at ASC
    `, params);
    return res.rows;
  }
  return db.prepare(`
    SELECT g.*, gc.code as category_code, gc.name as category_name,
           s.name as subject_name, s.code as subject_code
    FROM grades g
    LEFT JOIN grade_categories gc ON gc.id = g.grade_category_id
    LEFT JOIN subjects s ON s.id = g.subject_id
    WHERE ${whereClause}
    ORDER BY s.name ASC, g.graded_at ASC
  `).all(...params);
}

/**
 * Get list of subjects (for grading subject detection).
 */
export async function listSubjects({ schoolId } = {}) {
  if (isPostgresConfigured()) {
    const sql = schoolId
      ? `SELECT * FROM subjects WHERE school_id = $1 ORDER BY name ASC`
      : `SELECT * FROM subjects ORDER BY name ASC`;
    const res = await pgQuery(sql, schoolId ? [schoolId] : []);
    return res.rows;
  }
  const sql = schoolId
    ? `SELECT * FROM subjects WHERE school_id = ? ORDER BY name ASC`
    : `SELECT * FROM subjects ORDER BY name ASC`;
  return schoolId
    ? db.prepare(sql).all(schoolId)
    : db.prepare(sql).all();
}

/**
 * Get student attendance rate for an academic year.
 */
export async function getStudentAttendanceRate(studentId, academicYearId) {
  const where = ['student_id = ?'];
  const params = [studentId];
  if (academicYearId) { where.push('academic_year_id = ?'); params.push(academicYearId); }

  const whereClause = where.join(' AND ');

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT AVG(CASE WHEN status = 'PRESENT' THEN 100.0 ELSE 0 END) as attendance_rate
      FROM attendance_records WHERE ${whereClause}
    `, params);
    return res.rows[0] || { attendance_rate: null };
  }
  return db.prepare(`
    SELECT AVG(CASE WHEN status = 'PRESENT' THEN 100.0 ELSE 0 END) as attendance_rate
    FROM attendance_records WHERE ${whereClause}
  `).get(...params) || { attendance_rate: null };
}

/**
 * Get school info.
 */
export async function getSchoolById(schoolId) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(`SELECT * FROM schools WHERE id = $1`, [schoolId]);
    return res.rows[0] || null;
  }
  return db.prepare(`SELECT * FROM schools WHERE id = ?`).get(schoolId) || null;
}

/**
 * Create a gradebook lock record.
 */
export async function createGradebookLock({ id, classId, semesterId, lockedBy, reason, studentCount }) {
  const now = new Date().toISOString();

  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO gradebook_locks (id, class_id, semester_id, locked_by, reason, student_count, locked_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, classId, semesterId, lockedBy, reason, studentCount, now]);
  } else {
    db.prepare(`
      INSERT INTO gradebook_locks (id, class_id, semester_id, locked_by, reason, student_count, locked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, classId, semesterId, lockedBy, reason, studentCount, now);
  }
}

/**
 * Get list of students in a class with their basic info.
 */
export async function getClassStudentList(classId, academicYear, semester) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT 
        s.id as student_id,
        s.name,
        s.code,
        ce.class_id
      FROM students s
      JOIN class_enrollments ce ON s.id = ce.student_id
      WHERE ce.class_id = $1
        AND ce.academic_year = $2
        AND ce.status = 'active'
      ORDER BY s.name
    `, [classId, academicYear]);
    return res.rows;
  }

  return db.prepare(`
    SELECT 
      s.id as student_id,
      s.name,
      s.code,
      ce.class_id
    FROM students s
    JOIN class_enrollments ce ON s.id = ce.student_id
    WHERE ce.class_id = ?
      AND ce.academic_year = ?
      AND ce.status = 'active'
    ORDER BY s.name
  `).all(classId, academicYear);
}

/**
 * Get GPA data for multiple students.
 */
export async function getStudentGPAs(studentIds, academicYear, semester) {
  if (studentIds.length === 0) return [];

  const placeholders = studentIds.map((_, i) => `$${i + 1}`).join(', ');

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT 
        g.student_id,
        AVG(g.raw_score * 1.0 / NULLIF(g.max_score, 0) * 10) as gpa
      FROM grades g
      WHERE g.student_id = ANY(ARRAY[${placeholders}])
        AND g.status IN ('published', 'draft')
      GROUP BY g.student_id
    `, studentIds);
    return res.rows;
  }

  const placeholdersSql = studentIds.map(() => '?').join(', ');
  return db.prepare(`
    SELECT 
      g.student_id,
      AVG(g.raw_score * 1.0 / NULLIF(g.max_score, 0) * 10) as gpa
    FROM grades g
    WHERE g.student_id IN (${placeholdersSql})
      AND g.status IN ('published', 'draft')
    GROUP BY g.student_id
  `).all(...studentIds);
}

/**
 * Get attendance data for multiple students.
 */
export async function getStudentAttendances(studentIds, academicYear, semester) {
  if (studentIds.length === 0) return [];

  const placeholdersSql = studentIds.map(() => '?').join(', ');

  if (isPostgresConfigured()) {
    const placeholders = studentIds.map((_, i) => `$${i + 1}`).join(', ');
    const res = await pgQuery(`
      SELECT 
        ar.student_id,
        COUNT(*) as total_records,
        SUM(CASE WHEN ar.status IN ('PRESENT', 'present', 'present_in_time') THEN 1 ELSE 0 END) as present_count,
        CASE 
          WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN ar.status IN ('PRESENT', 'present', 'present_in_time') THEN 1 ELSE 0 END)::float / COUNT(*) * 100)
          ELSE 0 
        END as rate
      FROM attendance_records ar
      WHERE ar.student_id = ANY(ARRAY[${placeholders}])
      GROUP BY ar.student_id
    `, studentIds);
    return res.rows;
  }

  return db.prepare(`
    SELECT 
      ar.student_id,
      COUNT(*) as total_records,
      SUM(CASE WHEN ar.status IN ('PRESENT', 'present', 'present_in_time') THEN 1 ELSE 0 END) as present_count,
      CASE 
        WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN ar.status IN ('PRESENT', 'present', 'present_in_time') THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
        ELSE 0 
      END as rate
    FROM attendance_records ar
    WHERE ar.student_id IN (${placeholdersSql})
    GROUP BY ar.student_id
  `).all(...studentIds);
}
