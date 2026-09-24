// =============================================================================
// Submissions Service — business logic for G19 Assignment Submission Workflow
// =============================================================================
import * as repo from './submissions.repository.js';
import { db } from '../../db.js';
import { isPostgresConfigured, pgQuery } from '../../shared/database/connection.js';

/**
 * Check if submission is past deadline.
 * Returns { isLate: boolean, deadlineMs: number }
 */
function checkDeadline(dueDate, dueTime) {
  const deadlineStr = `${dueDate}T${dueTime || '23:59'}:00`;
  const deadlineMs = new Date(deadlineStr).getTime();
  const nowMs = Date.now();
  return { isLate: nowMs > deadlineMs, deadlineMs };
}

/**
 * Auto-grade a submission (multiple choice only).
 * Returns { score, maxScore, correctCount }
 */
async function autoGrade({ assignmentId, studentAnswers }) {
  const asg = await repo.getAssignmentPolicy({ assignmentId });
  if (!asg) return { score: 0, maxScore: 0, correctCount: 0 };

  // Get questions
  let questions = [];
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT id, options, max_score, question_type, correct_answer
      FROM assignment_questions
      WHERE assignment_id = $1
      ORDER BY question_order ASC
    `, [assignmentId]);
    questions = res.rows;
  } else {
    questions = db.prepare(`
      SELECT id, options, max_score, question_type, correct_answer
      FROM assignment_questions
      WHERE assignment_id = ?
      ORDER BY question_order ASC
    `).all(assignmentId);
  }

  let totalScore = 0;
  let maxScore = 0;
  let correctCount = 0;

  for (const q of questions) {
    const qMax = parseFloat(q.max_score) || 1.0;
    maxScore += qMax;

    // Only auto-grade multiple choice
    if (q.question_type !== 'multiple_choice') continue;

    let parsedOptions = [];
    try {
      parsedOptions = typeof q.options === 'string'
        ? JSON.parse(q.options)
        : (q.options || []);
    } catch { /* ignore */ }

    const correctOpt = parsedOptions.find((o) => o.isCorrect);
    const studentAns = studentAnswers?.[q.id];

    if (correctOpt && studentAns && studentAns === correctOpt.id) {
      totalScore += qMax;
      correctCount += 1;
    }
  }

  // Scale to assignment's total_score (default 10)
  const scale = asg.total_score > 0 ? asg.total_score / maxScore : 1;
  const rawScore = totalScore * scale;
  const score = Math.min(parseFloat(rawScore.toFixed(1)), asg.total_score || 10);

  return { score, maxScore: asg.total_score || 10, correctCount };
}

// ---------------------------------------------------------------------------
// Save draft answers
// ---------------------------------------------------------------------------
export async function saveDraft({ assignmentId, studentId, answers }) {
  // Verify assignment exists and is published
  const asg = await repo.getAssignmentPolicy({ assignmentId });
  if (!asg) {
    const err = new Error('Không tìm thấy bài tập');
    err.code = 'NOT_FOUND'; err.status = 404;
    throw err;
  }
  if (asg.status !== 'published') {
    const err = new Error('Bài tập chưa được công bố');
    err.code = 'NOT_PUBLISHED'; err.status = 400;
    throw err;
  }

  const draftId = await repo.saveDraft({ assignmentId, studentId, answers });
  return { id: draftId, status: 'draft_saved' };
}

// ---------------------------------------------------------------------------
// Submit assignment
// ---------------------------------------------------------------------------
export async function submitAssignment({ assignmentId, studentId, answers, isLateOverride = false }) {
  // Verify assignment exists and is published
  const asg = await repo.getAssignmentPolicy({ assignmentId });
  if (!asg) {
    const err = new Error('Không tìm thấy bài tập');
    err.code = 'NOT_FOUND'; err.status = 404;
    throw err;
  }
  if (asg.status !== 'published') {
    const err = new Error('Bài tập chưa được công bố');
    err.code = 'NOT_PUBLISHED'; err.status = 400;
    throw err;
  }

  // Deadline check
  const { isLate } = checkDeadline(asg.due_date, asg.due_time);

  // Lock-after-due enforcement
  if (isLate && asg.lock_after_due && !isLateOverride) {
    const err = new Error('Bài tập đã hết hạn nộp. Không thể nộp sau hạn.');
    err.code = 'DEADLINE_PASSED'; err.status = 409;
    throw err;
  }

  // Resubmission policy check
  const existing = await repo.getSubmission({ assignmentId, studentId });
  if (existing?.is_final) {
    if (!asg.allow_resubmit) {
      const err = new Error('Bài đã được nộp và không cho phép nộp lại.');
      err.code = 'RESUBMIT_NOT_ALLOWED'; err.status = 409;
      throw err;
    }
    const maxResubmit = asg.max_resubmit_count || 1;
    if (existing.resubmit_count >= maxResubmit) {
      const err = new Error(`Đã nộp lại tối đa ${maxResubmit} lần. Không thể nộp thêm.`);
      err.code = 'RESUBMIT_LIMIT_EXCEEDED'; err.status = 409;
      throw err;
    }
  }

  // Submit
  const result = await repo.submitAssignment({ assignmentId, studentId, answers, isLate: isLate || isLateOverride });

  // Auto-grade
  const { score, maxScore, correctCount } = await autoGrade({ assignmentId, answers });

  // Update score in submission (if MC only — essay/short_answer stays null)
  if (isPostgresConfigured()) {
    await pgQuery(`
      UPDATE assignment_submissions SET score = $1 WHERE id = $2
    `, [score, result.submissionId]);
  } else {
    db.prepare('UPDATE assignment_submissions SET score = ? WHERE id = ?')
      .run(score, result.submissionId);
  }

  return {
    submissionId: result.submissionId,
    status: 'submitted',
    isLate: result.isLate,
    resubmitCount: result.resubmitCount,
    score,
    maxScore,
    correctCount,
  };
}

// ---------------------------------------------------------------------------
// Get student's submission for an assignment
// ---------------------------------------------------------------------------
export async function getStudentSubmission({ assignmentId, studentId }) {
  const submission = await repo.getSubmission({ assignmentId, studentId });
  if (!submission) return null;

  // Parse answers JSON
  let answers = {};
  try {
    answers = typeof submission.student_answers === 'string'
      ? JSON.parse(submission.student_answers)
      : (submission.student_answers || {});
  } catch { /* ignore */ }

  let draftAnswers = {};
  try {
    draftAnswers = typeof submission.draft_answers === 'string'
      ? JSON.parse(submission.draft_answers)
      : (submission.draft_answers || {});
  } catch { /* ignore */ }

  return {
    ...submission,
    answers,
    draftAnswers,
  };
}

// ---------------------------------------------------------------------------
// Get student's submission history
// ---------------------------------------------------------------------------
export async function getStudentSubmissionHistory({ studentId, filters }) {
  return repo.getStudentSubmissions({ studentId, filters });
}

// ---------------------------------------------------------------------------
// List submissions for an assignment (teacher view)
// ---------------------------------------------------------------------------
export async function listAssignmentSubmissions({ assignmentId, filters }) {
  return repo.listAssignmentSubmissions({ assignmentId, filters });
}

// ---------------------------------------------------------------------------
// Grade a submission (teacher action)
// ---------------------------------------------------------------------------
export async function gradeSubmission({ submissionId, score, feedback }) {
  await repo.gradeSubmission({ submissionId, score, feedback });
  return { submissionId, status: 'graded', score };
}

// ---------------------------------------------------------------------------
// List published assignments for student
// ---------------------------------------------------------------------------
export async function listPublishedAssignmentsForStudent({ studentId, schoolId, filters }) {
  return repo.listPublishedAssignmentsForStudent({ studentId, schoolId, filters });
}
