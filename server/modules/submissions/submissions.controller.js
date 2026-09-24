// =============================================================================
// Submissions Controller — HTTP handlers for G19 Assignment Submission Workflow
// =============================================================================
import { db } from '../../db.js';
import { isPostgresConfigured, pgQuery } from '../../shared/database/connection.js';
import * as service from './submissions.service.js';

/**
 * GET /api/v1/submissions/assignments
 * List published assignments for the authenticated student.
 */
export async function listStudentAssignments(req, res, next) {
  try {
    const studentId = req.user.id;
    const schoolId = req.schoolId || req.user.schoolId || 'sch_bacau';
    const result = await service.listPublishedAssignmentsForStudent({
      studentId, schoolId, filters: req.query,
    });

    // Transform snake_case DB fields to camelCase for frontend compatibility
    const transformedAssignments = (result.assignments || []).map((a) => {
      const now = new Date();
      const dueDate = new Date(`${a.due_date}T${a.due_time || '23:59'}:00`);
      const isOverdue = now > dueDate;
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      return {
        id: a.id,
        title: a.title,
        subject: a.subject,
        type: a.type,
        instructions: a.instructions,
        due_date: a.due_date,
        due_time: a.due_time,
        duration_minutes: a.duration_minutes || 45,
        total_score: a.total_score || 10,
        status: a.submission_status || (isOverdue ? 'overdue' : 'pending'),
        score: a.score,
        submitted_at: a.submitted_at,
        submission_id: a.submission_id,
        is_late: Boolean(a.is_late),
        resubmit_count: a.resubmit_count || 0,
        allow_resubmit: Boolean(a.allow_resubmit),
        questionCount: 0,
        is_overdue: isOverdue,
        days_until_due: daysUntilDue,
        grading_scale: 'Thang 10',
        submission_status: a.submission_status,
      };
    });

    res.json({
      success: true,
      data: {
        ...result,
        assignments: transformedAssignments,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/submissions/assignments/:id
 * Get a published assignment detail with student submission status.
 */
export async function getAssignmentDetail(req, res, next) {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const asg = await service.listPublishedAssignmentsForStudent({
      studentId,
      schoolId: req.schoolId || req.user.schoolId || 'sch_bacau',
      filters: { status: 'all' },
    });

    const assignment = asg.assignments?.find((a) => a.id === id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Không tìm thấy bài tập' },
      });
    }

    // Fetch full questions
    let questions = [];
    if (isPostgresConfigured()) {
      const resQ = await pgQuery(`
        SELECT id, question_order, prompt, question_type, max_score,
               has_plot, plot_data, options, explanation
        FROM assignment_questions
        WHERE assignment_id = $1
        ORDER BY question_order ASC
      `, [id]);
      questions = resQ.rows.map((q) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []),
      }));
    } else {
      const rows = db.prepare(`
        SELECT id, question_order, prompt, question_type, max_score,
               has_plot, plot_data, options, explanation
        FROM assignment_questions
        WHERE assignment_id = ?
        ORDER BY question_order ASC
      `).all(id);
      questions = rows.map((q) => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []),
      }));
    }

    // Don't expose correct answer to students — transform to camelCase for frontend
    const sanitizedQuestions = questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      question_type: q.question_type,
      max_score: q.max_score,
      has_plot: Boolean(q.has_plot),
      plot_data: q.plot_data,
      options: (q.options || []).map((o) => ({ id: o.id, text: o.text })),
      explanation: q.explanation,
    }));

    // Get submission status
    const submission = await service.getStudentSubmission({ assignmentId: id, studentId });

    // Transform assignment fields to camelCase
    const assignmentData = {
      id: assignment.id,
      title: assignment.title,
      subject: assignment.subject,
      type: assignment.type,
      instructions: assignment.instructions,
      due_date: assignment.due_date,
      due_time: assignment.due_time,
      duration_minutes: assignment.duration_minutes || 45,
      total_score: assignment.total_score || 10,
      allow_resubmit: Boolean(assignment.allow_resubmit),
      max_resubmit_count: assignment.max_resubmit_count || 1,
      submission_status: assignment.submission_status,
      score: assignment.score,
      submitted_at: assignment.submitted_at,
      submission_id: assignment.submission_id,
      is_late: Boolean(assignment.is_late),
      resubmit_count: assignment.resubmit_count || 0,
      is_overdue: new Date(`${assignment.due_date}T${assignment.due_time || '23:59'}:00`) < new Date(),
    };

    res.json({
      success: true,
      data: {
        ...assignmentData,
        questions: sanitizedQuestions,
        submission: submission ? {
          id: submission.id,
          status: submission.status,
          score: submission.score,
          answers: submission.answers,
          draftAnswers: submission.draftAnswers,
          isLate: submission.is_late,
          resubmitCount: submission.resubmit_count,
          submittedAt: submission.submitted_at,
          teacherFeedback: submission.teacher_feedback,
          isFinal: submission.is_final,
        } : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/submissions/assignments/:id/draft
 * Save draft answers (in-progress, not finalized).
 */
export async function saveDraft(req, res, next) {
  try {
    const { id } = req.params;
    const studentId = req.user.id;
    const { answers = {} } = req.body;

    const result = await service.saveDraft({ assignmentId: id, studentId, answers });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/submissions/assignments/:id/submit
 * Submit final answers.
 */
export async function submitAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const studentId = req.user.id;
    const { answers = {} } = req.body;

    const result = await service.submitAssignment({ assignmentId: id, studentId, answers });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/submissions/history
 * Get submission history for the authenticated student.
 */
export async function getSubmissionHistory(req, res, next) {
  try {
    const studentId = req.user.id;
    const result = await service.getStudentSubmissionHistory({ studentId, filters: req.query });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/submissions/assignments/:id/students
 * Get all student submissions for an assignment (teacher view).
 */
export async function listAssignmentSubmissions(req, res, next) {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;

    // Verify teacher owns this assignment
    let ownerId;
    if (isPostgresConfigured()) {
      const resO = await pgQuery('SELECT created_by FROM assignments WHERE id = $1', [id]);
      ownerId = resO.rows[0]?.created_by;
    } else {
      ownerId = db.prepare('SELECT created_by FROM assignments WHERE id = ?').get(id)?.created_by;
    }

    if (ownerId && ownerId !== teacherId && req.user.role !== 'admin' && req.user.role !== 'school_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Bạn không có quyền xem bài nộp của bài tập này' },
      });
    }

    const result = await service.listAssignmentSubmissions({ assignmentId: id, filters: req.query });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/submissions/grade
 * Grade a submission (teacher action).
 */
export async function gradeSubmission(req, res, next) {
  try {
    const { submissionId, score, feedback } = req.body;
    const result = await service.gradeSubmission({ submissionId, score, feedback });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
