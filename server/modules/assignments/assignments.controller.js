// =============================================================================
// Assignment Controller — HTTP handlers for G18 Assignment Authoring
// =============================================================================
import * as service from './assignments.service.js';

/**
 * GET /api/v1/assignments
 * List assignments for the authenticated teacher.
 */
export async function listAssignments(req, res, next) {
  try {
    const { id: teacherId, schoolId } = req.user;
    const result = await service.listAssignments({
      teacherId,
      schoolId,
      filters: req.query,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/assignments/:id
 * Get a single assignment with its questions.
 */
export async function getAssignmentById(req, res, next) {
  try {
    const { id } = req.params;
    const { id: teacherId } = req.user;
    const assignment = await service.getAssignmentById({ id, teacherId });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Không tìm thấy bài tập' },
      });
    }
    res.json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/assignments
 * Create a new assignment (draft or published immediately).
 */
export async function createAssignment(req, res, next) {
  try {
    const { id: teacherId, schoolId, role: userRole } = req.user;
    const result = await service.createAssignment({
      data: req.body,
      teacherId,
      schoolId,
      userRole,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/assignments/:id
 * Update a draft assignment.
 */
export async function updateAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const { id: teacherId } = req.user;
    const result = await service.updateAssignment({ id, data: req.body, teacherId });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/assignments/:id/publish
 * Publish a draft assignment.
 */
export async function publishAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const { id: teacherId } = req.user;
    const result = await service.publishAssignment({ id, teacherId });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/assignments/:id
 * Delete a draft assignment.
 */
export async function deleteAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const { id: teacherId } = req.user;
    const result = await service.deleteAssignment({ id, teacherId });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/assignments/grading-queue
 * Get the grading queue for the authenticated teacher.
 */
export async function listGradingQueue(req, res, next) {
  try {
    const { id: teacherId } = req.user;
    const result = await service.listGradingQueue({
      teacherId,
      filters: req.query,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/assignments/grade
 * Grade a student's submission.
 */
export async function gradeSubmission(req, res, next) {
  try {
    const { id: teacherId } = req.user;
    const { submissionId, score, feedback } = req.body;
    const result = await service.gradeSubmission({
      submissionId,
      score,
      feedback,
      teacherId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
