// =============================================================================
// Submissions Repository — data access for G19 Assignment Submission Workflow
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

// ---------------------------------------------------------------------------
// Get assignment with policy (for deadline/lock checks)
// ---------------------------------------------------------------------------
export async function getAssignmentPolicy({ assignmentId }) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT id, title, subject, type, due_date, due_time, lock_after_due,
             allow_resubmit, max_resubmit_count, total_score, status,
             school_id, target_classes
      FROM assignments
      WHERE id = $1
    `, [assignmentId]);
    return res.rows[0] || null;
  }
  return db.prepare(`
    SELECT id, title, subject, type, due_date, due_time, lock_after_due,
           allow_resubmit, max_resubmit_count, total_score, status,
           school_id, target_classes
    FROM assignments
    WHERE id = ?
  `).get(assignmentId) || null;
}

// ---------------------------------------------------------------------------
// Check if student is enrolled in any of the assignment's target classes
// ---------------------------------------------------------------------------
export async function checkEnrollment({ studentId, assignmentId, schoolId }) {
  const asg = await getAssignmentPolicy({ assignmentId });
  if (!asg) return false;

  // Parse target_classes JSON
  let targetClasses = [];
  try {
    targetClasses = typeof asg.target_classes === 'string'
      ? JSON.parse(asg.target_classes)
      : (asg.target_classes || []);
  } catch { targetClasses = []; }

  if (targetClasses.length === 0) return true; // No class restriction

  // First resolve student entity ID from user ID if needed
  const resolvedStudentId = await resolveStudentId(studentId);
  if (!resolvedStudentId) return false;

  // Check if student's class_id is in target_classes
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT class_id FROM students WHERE id = $1
    `, [resolvedStudentId]);
    const studentClassId = res.rows[0]?.class_id;
    return targetClasses.includes(studentClassId);
  }

  // SQLite: check student's class
  const student = db.prepare('SELECT class_id FROM students WHERE id = ?').get(resolvedStudentId);
  return targetClasses.includes(student?.class_id);
}

/**
 * Resolve student entity ID from user ID or return as-is if already a student ID
 */
async function resolveStudentId(identifier) {
  if (!identifier) return null;
  if (identifier.startsWith('std_')) return identifier; // Already a student entity ID

  if (isPostgresConfigured()) {
    const res = await pgQuery(
      `SELECT id FROM students WHERE user_id = $1 LIMIT 1`,
      [identifier]
    );
    return res.rows[0]?.id || null;
  } else {
    const row = db.prepare(
      `SELECT id FROM students WHERE user_id = ? LIMIT 1`
    ).get(identifier);
    return row?.id || null;
  }
}

// ---------------------------------------------------------------------------
// Get existing submission for a student on an assignment
// ---------------------------------------------------------------------------
export async function getSubmission({ assignmentId, studentId }) {
  // Resolve student entity ID from user ID if needed
  const resolvedStudentId = await resolveStudentId(studentId);
  if (!resolvedStudentId) return null;

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT * FROM assignment_submissions
      WHERE assignment_id = $1 AND student_id = $2
      ORDER BY submitted_at DESC
      LIMIT 1
    `, [assignmentId, resolvedStudentId]);
    return res.rows[0] || null;
  }
  return db.prepare(`
    SELECT * FROM assignment_submissions
    WHERE assignment_id = ? AND student_id = ?
    ORDER BY submitted_at DESC
    LIMIT 1
  `).get(assignmentId, resolvedStudentId) || null;
}

// ---------------------------------------------------------------------------
// Get all submissions for a student
// ---------------------------------------------------------------------------
export async function getStudentSubmissions({ studentId, filters = {} }) {
  const { status = 'all', page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let where = ['s.student_id = $1'];
  const params = [studentId];

  if (status === 'pending') {
    where.push("s.status IN ('in_progress')");
  } else if (status !== 'all') {
    where.push('s.status = $2');
    params.push(status);
  }

  const whereClause = where.join(' AND ');

  if (isPostgresConfigured()) {
    const countRes = await pgQuery(`
      SELECT COUNT(*) as cnt FROM assignment_submissions s WHERE ${whereClause}
    `, params);
    const total = parseInt(countRes.rows[0]?.cnt || 0, 10);

    const rowsRes = await pgQuery(`
      SELECT
        s.id, s.assignment_id, s.status, s.score,
        s.is_late, s.resubmit_count, s.is_final,
        s.submitted_at, s.draft_answers, s.teacher_feedback,
        a.title, a.subject, a.due_date, a.due_time, a.type,
        a.duration_minutes, a.total_score, a.status as assignment_status
      FROM assignment_submissions s
      JOIN assignments a ON a.id = s.assignment_id
      WHERE ${whereClause}
      ORDER BY s.submitted_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    return { submissions: rowsRes.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM assignment_submissions s WHERE ${whereClause}`).get(...params).cnt;
  const rows = db.prepare(`
    SELECT
      s.id, s.assignment_id, s.status, s.score,
      s.is_late, s.resubmit_count, s.is_final,
      s.submitted_at, s.draft_answers, s.teacher_feedback,
      a.title, a.subject, a.due_date, a.due_time, a.type,
      a.duration_minutes, a.total_score, a.status as assignment_status
    FROM assignment_submissions s
    JOIN assignments a ON a.id = s.assignment_id
    WHERE ${whereClause}
    ORDER BY s.submitted_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { submissions: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ---------------------------------------------------------------------------
// Save draft answers (upsert — does NOT finalize)
// ---------------------------------------------------------------------------
export async function saveDraft({ assignmentId, studentId, answers }) {
  // Resolve student entity ID from user ID if needed
  const resolvedStudentId = await resolveStudentId(studentId);
  if (!resolvedStudentId) {
    throw new Error('Không tìm thấy hồ sơ học sinh');
  }

  const existing = await getSubmission({ assignmentId, studentId: resolvedStudentId });
  const now = new Date().toISOString();

  if (existing) {
    // Only update draft if not already finalized
    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE assignment_submissions
        SET draft_answers = $1, updated_at = $2
        WHERE id = $3 AND is_final = FALSE
        RETURNING id
      `, [JSON.stringify(answers), now, existing.id]);
    } else {
      db.prepare(`
        UPDATE assignment_submissions
        SET draft_answers = ?, updated_at = ?
        WHERE id = ? AND is_final = 0
      `).run(JSON.stringify(answers), now, existing.id);
    }
    return existing.id;
  }

  // Create new in_progress submission
  const subId = newId('sub');
  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO assignment_submissions
        (id, assignment_id, student_id, status, draft_answers, resubmit_count, is_final, submitted_at, updated_at)
      VALUES ($1,$2,$3,'in_progress',$4,0,FALSE,$5,$5)
    `, [subId, assignmentId, resolvedStudentId, JSON.stringify(answers), now]);
  } else {
    db.prepare(`
      INSERT INTO assignment_submissions
        (id, assignment_id, student_id, status, draft_answers, resubmit_count, is_final, submitted_at, updated_at)
      VALUES (?,?,?,'in_progress',?,0,0,?,?)
    `).run(subId, assignmentId, resolvedStudentId, JSON.stringify(answers), now, now);
  }
  return subId;
}

// ---------------------------------------------------------------------------
// Submit assignment (finalize)
// Returns { success, isLate, submissionId, score }
// ---------------------------------------------------------------------------
export async function submitAssignment({ assignmentId, studentId, answers, isLate }) {
  // Resolve student entity ID from user ID if needed
  const resolvedStudentId = await resolveStudentId(studentId);
  if (!resolvedStudentId) {
    throw new Error('Không tìm thấy hồ sơ học sinh');
  }

  const existing = await getSubmission({ assignmentId, studentId: resolvedStudentId });
  const now = new Date().toISOString();

  if (existing) {
    // Update existing — preserve history via resubmit_count
    const resubmitCount = existing.resubmit_count || 0;
    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE assignment_submissions
        SET status = 'submitted',
            student_answers = $1,
            is_late = $2,
            submitted_at = $3,
            updated_at = $3,
            is_final = TRUE,
            resubmit_count = $4
        WHERE id = $5
        RETURNING id
      `, [JSON.stringify(answers), isLate, now, resubmitCount + 1, existing.id]);
      return { submissionId: existing.id, isLate, resubmitCount: resubmitCount + 1 };
    } else {
      db.prepare(`
        UPDATE assignment_submissions
        SET status = 'submitted',
            student_answers = ?,
            is_late = ?,
            submitted_at = ?,
            updated_at = ?,
            is_final = 1,
            resubmit_count = ?
        WHERE id = ?
      `).run(JSON.stringify(answers), isLate ? 1 : 0, now, now, resubmitCount + 1, existing.id);
      return { submissionId: existing.id, isLate, resubmitCount: resubmitCount + 1 };
    }
  }

  // Create new submission
  const subId = newId('sub');
  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO assignment_submissions
        (id, assignment_id, student_id, status, student_answers,
         is_late, submitted_at, updated_at, is_final, resubmit_count)
      VALUES ($1,$2,$3,'submitted',$4,$5,$6,$6,TRUE,0)
    `, [subId, assignmentId, resolvedStudentId, JSON.stringify(answers), isLate, now]);
  } else {
    db.prepare(`
      INSERT INTO assignment_submissions
        (id, assignment_id, student_id, status, student_answers,
         is_late, submitted_at, updated_at, is_final, resubmit_count)
      VALUES (?,?,?,'submitted',?,?,?,?,1,0)
    `).run(subId, assignmentId, resolvedStudentId, JSON.stringify(answers), isLate ? 1 : 0, now, now);
  }
  return { submissionId: subId, isLate, resubmitCount: 0 };
}

// ---------------------------------------------------------------------------
// List submissions for a specific assignment (teacher view)
// ---------------------------------------------------------------------------
export async function listAssignmentSubmissions({ assignmentId, filters = {} }) {
  const { status = 'all', page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  let where = ['s.assignment_id = $1'];
  const params = [assignmentId];

  if (status !== 'all') {
    where.push(`s.status = $${params.length + 1}`);
    params.push(status);
  }

  const whereClause = where.join(' AND ');

  if (isPostgresConfigured()) {
    const countRes = await pgQuery(`
      SELECT COUNT(*) as cnt FROM assignment_submissions s WHERE ${whereClause}
    `, params);
    const total = parseInt(countRes.rows[0]?.cnt || 0, 10);

    const rowsRes = await pgQuery(`
      SELECT
        s.id, s.student_id, s.status, s.score,
        s.is_late, s.resubmit_count, s.submitted_at,
        s.teacher_feedback, s.is_final,
        u.name as student_name, u.code as student_code,
        c.name as class_name
      FROM assignment_submissions s
      JOIN students st ON st.id = s.student_id
      JOIN users u ON u.id = st.user_id
      LEFT JOIN classes c ON c.id = st.class_id
      WHERE ${whereClause}
      ORDER BY s.submitted_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    return { submissions: rowsRes.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM assignment_submissions s WHERE ${whereClause}`).get(...params).cnt;
  const rows = db.prepare(`
    SELECT
      s.id, s.student_id, s.status, s.score,
      s.is_late, s.resubmit_count, s.submitted_at,
      s.teacher_feedback, s.is_final,
      u.name as student_name, u.code as student_code,
      c.name as class_name
    FROM assignment_submissions s
    JOIN students st ON st.id = s.student_id
    JOIN users u ON u.id = st.user_id
    LEFT JOIN classes c ON c.id = st.class_id
    WHERE ${whereClause}
    ORDER BY s.submitted_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { submissions: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ---------------------------------------------------------------------------
// Grade submission
// ---------------------------------------------------------------------------
export async function gradeSubmission({ submissionId, score, feedback }) {
  if (isPostgresConfigured()) {
    await pgQuery(`
      UPDATE assignment_submissions
      SET status = 'graded', score = $1, teacher_feedback = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id
    `, [score, feedback || '', submissionId]);
  } else {
    db.prepare(`
      UPDATE assignment_submissions
      SET status = 'graded', score = ?, teacher_feedback = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(score, feedback || '', submissionId);
  }
}

// ---------------------------------------------------------------------------
// List published assignments for student (enrolled classes)
// ---------------------------------------------------------------------------
export async function listPublishedAssignmentsForStudent({ studentId, schoolId, filters = {} }) {
  const { status = 'all', page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  // First resolve student entity ID from user ID if needed
  const resolvedStudentId = await resolveStudentId(studentId);
  if (!resolvedStudentId) {
    return { assignments: [], total: 0, page, limit, totalPages: 0 };
  }

  if (isPostgresConfigured()) {
    // Get student's class_id and class_name for class-based filtering
    const studentRow = await pgQuery(`
      SELECT st.class_id, c.name as class_name
      FROM students st
      JOIN classes c ON c.id = st.class_id
      WHERE st.id = $1
    `, [resolvedStudentId]);
    const studentClassId = studentRow.rows[0]?.class_id;
    const studentClassName = studentRow.rows[0]?.class_name;

    const where = ["a.status = 'published'"];
    // Use $2, $3, etc. for WHERE clause params since $1 is used for student_id in JOIN
    const params = [resolvedStudentId];

    // Match against class ID OR class name in target_classes JSON
    if (studentClassId || studentClassName) {
      const conditions = [];
      if (studentClassId) {
        conditions.push(`a.target_classes::text LIKE $${params.length + 1}`);
        params.push(`%"${studentClassId}"%`);
      }
      if (studentClassName) {
        conditions.push(`a.target_classes::text LIKE $${params.length + 1}`);
        params.push(`%"${studentClassName}"%`);
      }
      where.push(`(${conditions.join(' OR ')})`);
    }

    if (status === 'pending') {
      where.push("(s.status IS NULL OR s.status NOT IN ('submitted', 'graded'))");
    } else if (status === 'completed') {
      where.push("s.status IN ('submitted', 'graded')");
    }

    const whereClause = where.join(' AND ');

    // Count query: student_id in JOIN uses $1, class filter params start from $2
    const countRes = await pgQuery(`
      SELECT COUNT(*) as cnt
      FROM assignments a
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = $1
      WHERE ${whereClause}
    `, params);
    const total = parseInt(countRes.rows[0]?.cnt || 0, 10);

    // List query: add LIMIT ($N) and OFFSET ($N+1)
    const limitOffsetParams = [...params, limit, offset];
    const rowsRes = await pgQuery(`
      SELECT
        a.id, a.title, a.subject, a.type, a.instructions,
        a.due_date, a.due_time, a.duration_minutes,
        a.total_score, a.lock_after_due, a.allow_resubmit, a.max_resubmit_count,
        a.status as assignment_status,
        s.id as submission_id, s.status as submission_status,
        s.score, s.is_late, s.submitted_at, s.teacher_feedback, s.resubmit_count,
        s.draft_answers
      FROM assignments a
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = $1
      WHERE ${whereClause}
      ORDER BY a.due_date ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, limitOffsetParams);

    return { assignments: rowsRes.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // SQLite
  const studentRow = db.prepare(`
    SELECT st.class_id, c.name as class_name
    FROM students st
    JOIN classes c ON c.id = st.class_id
    WHERE st.id = ?
  `).get(resolvedStudentId);
  const studentClassId = studentRow?.class_id;
  const studentClassName = studentRow?.class_name;

  const where = ["a.status = 'published'"];
  const params = [];

  if (studentClassId || studentClassName) {
    const conditions = [];
    if (studentClassId) {
      where.push("a.target_classes LIKE ?");
      params.push(`%"${studentClassId}"%`);
    }
    if (studentClassName) {
      where.push("a.target_classes LIKE ?");
      params.push(`%"${studentClassName}"%`);
    }
  }

  if (status === 'pending') {
    where.push("(s.status IS NULL OR s.status NOT IN ('submitted', 'graded'))");
  } else if (status === 'completed') {
    where.push("s.status IN ('submitted', 'graded')");
  }

  const whereClause = where.join(' AND ');

  const total = db.prepare(`
    SELECT COUNT(*) as cnt
    FROM assignments a
    LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = ?
    WHERE ${whereClause}
  `).get(resolvedStudentId, ...params).cnt;

  const rows = db.prepare(`
    SELECT
      a.id, a.title, a.subject, a.type, a.instructions,
      a.due_date, a.due_time, a.duration_minutes,
      a.total_score, a.lock_after_due, a.allow_resubmit, a.max_resubmit_count,
      a.status as assignment_status,
      s.id as submission_id, s.status as submission_status,
      s.score, s.is_late, s.submitted_at, s.teacher_feedback, s.resubmit_count,
      s.draft_answers
    FROM assignments a
    LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = ?
    WHERE ${whereClause}
    ORDER BY a.due_date ASC
    LIMIT ? OFFSET ?
  `).all(resolvedStudentId, ...params, limit, offset);

  return { assignments: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}
