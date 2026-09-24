// =============================================================================
// Assignment Repository — data access layer for G18 Assignment Authoring
// =============================================================================
import { db } from '../../db.js';
import { isPostgresConfigured, pgQuery } from '../../shared/database/connection.js';

/**
 * Generates a unique ID prefixed with the given type string.
 * @param {string} prefix
 * @returns {string}
 */
function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Parse target_classes JSON column (SQLite: JSON string; PostgreSQL: array)
 * @param {unknown} val
 * @returns {string[]}
 */
function parseTargetClasses(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

// ---------------------------------------------------------------------------
// Create Assignment (with questions)
// ---------------------------------------------------------------------------
export async function createAssignment({ data, teacherId, schoolId }) {
  const {
    title, instructions, subject, subjectId,
    classId, targetClassIds = [],
    dueDate, dueTime, durationMinutes, gradingScale, type,
    totalScore, academicYearId, semesterId,
    lockAfterDue, shuffleQuestions, questions = [], publish,
  } = data;

  const asgId = newId('asg');
  const status = publish ? 'published' : 'draft';
  const publishedAt = publish ? new Date().toISOString() : null;

  // Merge single classId into targetClassIds
  const allClassIds = classId ? [classId, ...targetClassIds.filter((c) => c !== classId)] : targetClassIds;

  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO assignments (
        id, title, instructions, subject, type,
        target_classes, due_date, due_time, duration_minutes,
        grading_scale, lock_after_due, shuffle_questions,
        total_score, academic_year_id, semester_id,
        status, published_at, created_by, school_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    `, [
      asgId, title, instructions || '', subject,
      type || 'quiz',
      JSON.stringify(allClassIds),
      dueDate, dueTime, durationMinutes || 45,
      gradingScale || 'Thang 10 (Hệ số 1)',
      lockAfterDue !== false ? 1 : 0,
      shuffleQuestions !== false ? 1 : 0,
      totalScore || 10.0,
      academicYearId || null, semesterId || null,
      status, publishedAt, teacherId, schoolId,
    ]);

    if (questions.length > 0) {
      for (let idx = 0; idx < questions.length; idx++) {
        const q = questions[idx];
        await pgQuery(`
          INSERT INTO assignment_questions (
            id, assignment_id, question_order, prompt, question_type,
            max_score, has_plot, plot_data, options, correct_answer, explanation
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `, [
          newId('q'), asgId, idx + 1,
          q.prompt, q.questionType || 'multiple_choice',
          q.maxScore || 1.0,
          q.hasPlot ? true : false, q.plotData || null,
          JSON.stringify(q.options || []),
          q.correctAnswer || null,
          q.explanation || '',
        ]);
      }
    }
    return asgId;
  }

  // SQLite fallback
  db.prepare(`
    INSERT INTO assignments (
      id, title, instructions, subject, type,
      target_classes, due_date, due_time, duration_minutes,
      grading_scale, lock_after_due, shuffle_questions,
      total_score, academic_year_id, semester_id,
      status, published_at, created_by, school_id
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    asgId, title, instructions || '', subject, type || 'quiz',
    JSON.stringify(allClassIds),
    dueDate, dueTime, durationMinutes || 45,
    gradingScale || 'Thang 10 (Hệ số 1)',
    lockAfterDue !== false ? 1 : 0,
    shuffleQuestions !== false ? 1 : 0,
    totalScore || 10.0,
    academicYearId || null, semesterId || null,
    status, publishedAt, teacherId, schoolId || 'sch_bacau',
  );

  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    db.prepare(`
      INSERT INTO assignment_questions (
        id, assignment_id, question_order, prompt, question_type,
        max_score, has_plot, plot_data, options, correct_answer, explanation
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      newId('q'), asgId, idx + 1,
      q.prompt, q.questionType || 'multiple_choice',
      q.maxScore || 1.0,
      q.hasPlot ? 1 : 0, q.plotData || null,
      JSON.stringify(q.options || []),
      q.correctAnswer || null,
      q.explanation || '',
    );
  }

  return asgId;
}

// ---------------------------------------------------------------------------
// Update Assignment (partial update for drafts)
// ---------------------------------------------------------------------------
export async function updateAssignment({ id, data, teacherId }) {
  const {
    title, instructions, subject, subjectId,
    classId, targetClassIds = [],
    dueDate, dueTime, durationMinutes, gradingScale, type,
    totalScore, academicYearId, semesterId,
    lockAfterDue, shuffleQuestions, questions,
    status,
  } = data;

  if (isPostgresConfigured()) {
    // PostgreSQL: build fields and numbered placeholders
    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
    if (instructions !== undefined) { fields.push(`instructions = $${idx++}`); values.push(instructions); }
    if (subject !== undefined) { fields.push(`subject = $${idx++}`); values.push(subject); }
    // Note: subject_id not in PostgreSQL schema
    if (dueDate !== undefined) { fields.push(`due_date = $${idx++}`); values.push(dueDate); }
    if (dueTime !== undefined) { fields.push(`due_time = $${idx++}`); values.push(dueTime); }
    if (durationMinutes !== undefined) { fields.push(`duration_minutes = $${idx++}`); values.push(durationMinutes); }
    if (gradingScale !== undefined) { fields.push(`grading_scale = $${idx++}`); values.push(gradingScale); }
    if (type !== undefined) { fields.push(`type = $${idx++}`); values.push(type); }
    if (totalScore !== undefined) { fields.push(`total_score = $${idx++}`); values.push(totalScore); }
    if (academicYearId !== undefined) { fields.push(`academic_year_id = $${idx++}`); values.push(academicYearId); }
    if (semesterId !== undefined) { fields.push(`semester_id = $${idx++}`); values.push(semesterId); }
    if (lockAfterDue !== undefined) { fields.push(`lock_after_due = $${idx++}`); values.push(lockAfterDue ? 1 : 0); }
    if (shuffleQuestions !== undefined) { fields.push(`shuffle_questions = $${idx++}`); values.push(shuffleQuestions ? 1 : 0); }
    if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(status); }

    if (classId !== undefined || targetClassIds.length > 0) {
      const allClassIds = classId ? [classId, ...targetClassIds.filter((c) => c !== classId)] : targetClassIds;
      fields.push(`target_classes = $${idx++}`); values.push(JSON.stringify(allClassIds));
    }

    fields.push(`updated_at = $${idx++}`); values.push(new Date().toISOString());

    if (fields.length === 1) return; // only updated_at

    values.push(id, teacherId);
    const setClause = fields.join(', ');
    const sql = `UPDATE assignments SET ${setClause} WHERE id = $${idx++} AND created_by = $${idx++}`;
    await pgQuery(sql, values);
  } else {
    // SQLite: use ? placeholders
    const fields = [];
    const values = [];

    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (instructions !== undefined) { fields.push('instructions = ?'); values.push(instructions); }
    if (subject !== undefined) { fields.push('subject = ?'); values.push(subject); }
    if (subjectId !== undefined) { fields.push('subject_id = ?'); values.push(subjectId); }
    if (dueDate !== undefined) { fields.push('due_date = ?'); values.push(dueDate); }
    if (dueTime !== undefined) { fields.push('due_time = ?'); values.push(dueTime); }
    if (durationMinutes !== undefined) { fields.push('duration_minutes = ?'); values.push(durationMinutes); }
    if (gradingScale !== undefined) { fields.push('grading_scale = ?'); values.push(gradingScale); }
    if (type !== undefined) { fields.push('type = ?'); values.push(type); }
    if (totalScore !== undefined) { fields.push('total_score = ?'); values.push(totalScore); }
    if (academicYearId !== undefined) { fields.push('academic_year_id = ?'); values.push(academicYearId); }
    if (semesterId !== undefined) { fields.push('semester_id = ?'); values.push(semesterId); }
    if (lockAfterDue !== undefined) { fields.push('lock_after_due = ?'); values.push(lockAfterDue ? 1 : 0); }
    if (shuffleQuestions !== undefined) { fields.push('shuffle_questions = ?'); values.push(shuffleQuestions ? 1 : 0); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }

    if (classId !== undefined || targetClassIds.length > 0) {
      const allClassIds = classId ? [classId, ...targetClassIds.filter((c) => c !== classId)] : targetClassIds;
      fields.push('target_classes = ?'); values.push(JSON.stringify(allClassIds));
    }

    fields.push('updated_at = ?'); values.push(new Date().toISOString());

    if (fields.length === 1) return; // only updated_at

    db.prepare(`UPDATE assignments SET ${fields.join(', ')} WHERE id = ? AND created_by = ?`)
      .run(...values, id, teacherId);
  }

  // Replace questions if provided
  if (Array.isArray(questions)) {
    if (isPostgresConfigured()) {
      await pgQuery('DELETE FROM assignment_questions WHERE assignment_id = $1', [id]);
    } else {
      db.prepare('DELETE FROM assignment_questions WHERE assignment_id = ?').run(id);
    }

    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const qId = newId('q');
      if (isPostgresConfigured()) {
        await pgQuery(`
          INSERT INTO assignment_questions
            (id, assignment_id, question_order, prompt, question_type,
             max_score, has_plot, plot_data, options, correct_answer, explanation)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `, [
          qId, id, idx + 1, q.prompt, q.questionType || 'multiple_choice',
          q.maxScore || 1.0, q.hasPlot || false, q.plotData || null,
          JSON.stringify(q.options || []), q.correctAnswer || null, q.explanation || '',
        ]);
      } else {
        db.prepare(`
          INSERT INTO assignment_questions
            (id, assignment_id, question_order, prompt, question_type,
             max_score, has_plot, plot_data, options, correct_answer, explanation)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)
        `).run(
          qId, id, idx + 1, q.prompt, q.questionType || 'multiple_choice',
          q.maxScore || 1.0, q.hasPlot ? 1 : 0, q.plotData || null,
          JSON.stringify(q.options || []), q.correctAnswer || null, q.explanation || '',
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Publish Assignment (change status from draft -> published)
// ---------------------------------------------------------------------------
export async function publishAssignment({ id, teacherId }) {
  const now = new Date().toISOString();
  if (isPostgresConfigured()) {
    const result = await pgQuery(`
      UPDATE assignments
      SET status = 'published', published_at = $1, updated_at = $1
      WHERE id = $2 AND created_by = $3 AND status = 'draft'
      RETURNING id
    `, [now, id, teacherId]);
    return result.rows[0]?.id || null;
  }
  const info = db.prepare(`
    UPDATE assignments
    SET status = 'published', published_at = ?, updated_at = ?
    WHERE id = ? AND created_by = ? AND status = 'draft'
  `).run(now, now, id, teacherId);
  return info.changes > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// Get Assignment by ID (full, with questions)
// ---------------------------------------------------------------------------
export async function getAssignmentById({ id, teacherId }) {
  let row;
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT a.*, u.name as creator_name
      FROM assignments a
      LEFT JOIN users u ON u.id = a.created_by
      WHERE a.id = $1 AND a.created_by = $2
    `, [id, teacherId]);
    row = res.rows[0];
  } else {
    row = db.prepare(`
      SELECT a.*, u.name as creator_name
      FROM assignments a
      LEFT JOIN users u ON u.id = a.created_by
      WHERE a.id = ? AND a.created_by = ?
    `).get(id, teacherId);
  }

  if (!row) return null;

  // Fetch questions
  let questions = [];
  if (isPostgresConfigured()) {
    const qRes = await pgQuery(`
      SELECT * FROM assignment_questions WHERE assignment_id = $1 ORDER BY question_order ASC
    `, [id]);
    questions = qRes.rows.map((q) => ({
      ...q,
      options: parseTargetClasses(q.options),
    }));
  } else {
    const rows = db.prepare(
      'SELECT * FROM assignment_questions WHERE assignment_id = ? ORDER BY question_order ASC'
    ).all(id);
    questions = rows.map((q) => ({
      ...q,
      options: parseTargetClasses(q.options),
    }));
  }

  return {
    ...row,
    target_classes: parseTargetClasses(row.target_classes),
    questions,
  };
}

// ---------------------------------------------------------------------------
// List Assignments for a teacher (with pagination, status filter)
// ---------------------------------------------------------------------------
export async function listAssignments({ teacherId, schoolId: _schoolId, filters = {} }) {
  const {
    status = 'all', subject, classId,
    academicYearId, semesterId,
    search, page = 1, limit = 20,
  } = filters;

  const offset = (page - 1) * limit;
  
  let total = 0;
  let rows = [];

  if (isPostgresConfigured()) {
    // Build conditions with numbered placeholders for PostgreSQL
    const conditions = ['a.created_by = $1'];
    const params = [teacherId];
    let idx = 2;

    if (status !== 'all') { conditions.push(`a.status = $${idx++}`); params.push(status); }
    if (subject) { conditions.push(`LOWER(a.subject) LIKE $${idx++}`); params.push(`%${subject.toLowerCase()}%`); }
    if (academicYearId) { conditions.push(`a.academic_year_id = $${idx++}`); params.push(academicYearId); }
    if (semesterId) { conditions.push(`a.semester_id = $${idx++}`); params.push(semesterId); }
    if (search) { conditions.push(`LOWER(a.title) LIKE $${idx++}`); params.push(`%${search.toLowerCase()}%`); }
    if (classId) { conditions.push(`target_classes::text LIKE $${idx++}`); params.push(`%"${classId}"%`); }

    const whereClause = conditions.join(' AND ');

    const countRes = await pgQuery(`
      SELECT COUNT(*) as cnt FROM assignments a WHERE ${whereClause}
    `, params);
    total = parseInt(countRes.rows[0]?.cnt || 0, 10);

    const rowsRes = await pgQuery(`
      SELECT
        a.id, a.title, a.subject, a.type, a.instructions,
        a.target_classes, a.due_date, a.due_time, a.duration_minutes,
        a.total_score, a.status, a.published_at, a.created_at, a.updated_at,
        a.grading_scale,
        (SELECT COUNT(*) FROM assignment_questions q WHERE q.assignment_id = a.id) as question_count,
        (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) as submission_count,
        (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id AND s.status = 'graded') as graded_count
      FROM assignments a
      WHERE ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params);
    rows = rowsRes.rows;
  } else {
    // SQLite uses ? placeholders
    const conditions = ['a.created_by = ?'];
    const params = [teacherId];

    if (status !== 'all') { conditions.push('a.status = ?'); params.push(status); }
    if (subject) { conditions.push('LOWER(a.subject) LIKE ?'); params.push(`%${subject.toLowerCase()}%`); }
    if (academicYearId) { conditions.push('a.academic_year_id = ?'); params.push(academicYearId); }
    if (semesterId) { conditions.push('a.semester_id = ?'); params.push(semesterId); }
    if (search) { conditions.push('LOWER(a.title) LIKE ?'); params.push(`%${search.toLowerCase()}%`); }
    if (classId) { conditions.push("target_classes LIKE ?"); params.push(`%"${classId}"%`); }

    const whereClause = conditions.join(' AND ');

    total = db.prepare(`SELECT COUNT(*) as cnt FROM assignments a WHERE ${whereClause}`).get(...params).cnt;
    rows = db.prepare(`
      SELECT
        a.id, a.title, a.subject, a.type, a.instructions,
        a.target_classes, a.due_date, a.due_time, a.duration_minutes,
        a.total_score, a.status, a.published_at, a.created_at, a.updated_at,
        a.grading_scale,
        (SELECT COUNT(*) FROM assignment_questions q WHERE q.assignment_id = a.id) as question_count,
        (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) as submission_count,
        (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id AND s.status = 'graded') as graded_count
      FROM assignments a
      WHERE ${whereClause}
      ORDER BY a.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
  }

  return {
    assignments: rows.map((r) => ({
      ...r,
      target_classes: parseTargetClasses(r.target_classes),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ---------------------------------------------------------------------------
// Delete Assignment (only drafts, only owner)
// ---------------------------------------------------------------------------
export async function deleteAssignment({ id, teacherId }) {
  if (isPostgresConfigured()) {
    const result = await pgQuery(`
      DELETE FROM assignments WHERE id = $1 AND created_by = $2 AND status = 'draft'
      RETURNING id
    `, [id, teacherId]);
    return result.rows[0]?.id || null;
  }
  const info = db.prepare(`
    DELETE FROM assignments WHERE id = ? AND created_by = ? AND status = 'draft'
  `).run(id, teacherId);
  return info.changes > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// Grade a submission
// ---------------------------------------------------------------------------
export async function gradeSubmission({ submissionId, score, feedback, teacherId: _teacherId }) {
  if (isPostgresConfigured()) {
    await pgQuery(`
      UPDATE assignment_submissions
      SET status = 'graded', score = $1, teacher_feedback = $2
      WHERE id = $3
      RETURNING id
    `, [score, feedback || '', submissionId]);
  } else {
    db.prepare(`
      UPDATE assignment_submissions
      SET status = 'graded', score = ?, teacher_feedback = ?
      WHERE id = ?
    `).run(score, feedback || '', submissionId);
  }
}

// ---------------------------------------------------------------------------
// List grading queue for a teacher's assignments
// ---------------------------------------------------------------------------
export async function listGradingQueue({ teacherId, filters = {} }) {
  const { page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  if (isPostgresConfigured()) {
    const countRes = await pgQuery(`
      SELECT COUNT(*) as cnt
      FROM assignment_submissions s
      JOIN assignments a ON a.id = s.assignment_id
      WHERE a.created_by = $1 AND s.status = 'submitted'
    `, [teacherId]);
    const total = parseInt(countRes.rows[0]?.cnt || 0, 10);

    const rowsRes = await pgQuery(`
      SELECT
        s.id, s.assignment_id, s.student_id, s.status, s.score,
        s.submitted_at, s.teacher_feedback,
        a.title as assignment_title, a.type as assignment_type, a.total_score,
        u.name as student_name, u.code as student_code,
        c.name as class_name
      FROM assignment_submissions s
      JOIN assignments a ON a.id = s.assignment_id
      JOIN students st ON st.user_id = s.student_id
      JOIN users u ON u.id = st.user_id
      LEFT JOIN classes c ON c.id = st.class_id
      WHERE a.created_by = $1 AND s.status = 'submitted'
      ORDER BY s.submitted_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `, [teacherId]);

    return { submissions: rowsRes.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  const total = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM assignment_submissions s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE a.created_by = ? AND s.status = 'submitted'
  `).get(teacherId).cnt;

  const rows = db.prepare(`
    SELECT
      s.id, s.assignment_id, s.student_id, s.status, s.score,
      s.submitted_at, s.teacher_feedback,
      a.title as assignment_title, a.type as assignment_type, a.total_score,
      u.name as student_name, u.code as student_code,
      c.name as class_name
    FROM assignment_submissions s
    JOIN assignments a ON a.id = s.assignment_id
    JOIN students st ON st.user_id = s.student_id
    JOIN users u ON u.id = st.user_id
    LEFT JOIN classes c ON c.id = st.class_id
    WHERE a.created_by = ? AND s.status = 'submitted'
    ORDER BY s.submitted_at ASC
    LIMIT ? OFFSET ?
  `).all(teacherId, limit, offset);

  return { submissions: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}
