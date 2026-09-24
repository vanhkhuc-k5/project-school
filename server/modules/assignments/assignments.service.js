// =============================================================================
// Assignment Service — business logic for G18 Assignment Authoring
// =============================================================================
import * as repo from './assignments.repository.js';
import { teacherAssignmentsRepository } from '../teacher-assignments/teacher-assignments.repository.js';
import { enrollmentsRepository } from '../enrollments/enrollments.repository.js';
import { notifyAssignmentPublished } from '../notifications/notifications.service.js';

/**
 * Authorize: teacher may only create/assign assignments to classes they are
 * currently assigned to (active teacher_assignment record).
 * Admins and principals bypass this check.
 */
async function assertTeacherAuthorizedForClasses({ teacherId, classIds, schoolId }) {
  if (!teacherId || !classIds || classIds.length === 0) return;

  for (const classId of classIds) {
    const isAssigned = await teacherAssignmentsRepository.isTeacherAssignedToClass(
      teacherId,
      classId,
      { schoolId }
    );
    if (!isAssigned) {
      const err = new Error(`Bạn không được phân công giảng dạy tại lớp có ID: ${classId}`);
      err.code = 'TEACHER_NOT_ASSIGNED_TO_CLASS';
      err.status = 403;
      throw err;
    }
  }
}

/**
 * Create a new assignment (draft or published).
 * Validates teacher authorization for target classes.
 */
export async function createAssignment({ data, teacherId, schoolId, userRole }) {
  // Authorization: teacher must be assigned to all target classes
  const classIds = data.classId ? [data.classId, ...data.targetClassIds] : data.targetClassIds;

  if (userRole === 'teacher') {
    await assertTeacherAuthorizedForClasses({ teacherId, classIds, schoolId });
  }

  // Validate due date is in the future
  if (data.dueDate) {
    const due = new Date(`${data.dueDate}T${data.dueTime || '23:59'}:00`);
    if (due <= new Date()) {
      const err = new Error('Hạn nộp bài phải là thời điểm trong tương lai');
      err.code = 'INVALID_DUE_DATE';
      err.status = 400;
      throw err;
    }
  }

  // Validate total score
  if (data.totalScore !== undefined && (data.totalScore <= 0 || data.totalScore > 1000)) {
    const err = new Error('Tổng điểm phải nằm trong khoảng 0.1 - 1000');
    err.code = 'INVALID_TOTAL_SCORE';
    err.status = 400;
    throw err;
  }

  // Validate each question's maxScore
  if (data.questions && data.questions.length > 0) {
    for (const q of data.questions) {
      if (q.maxScore !== undefined && (q.maxScore <= 0 || q.maxScore > 100)) {
        const err = new Error(`Điểm câu hỏi "${q.prompt?.substring(0, 30)}..." phải lớn hơn 0 và nhỏ hơn 100`);
        err.code = 'INVALID_QUESTION_SCORE';
        err.status = 400;
        throw err;
      }
    }
  }

  const id = await repo.createAssignment({ data, teacherId, schoolId });

  // G26: Notify enrolled students if published immediately
  if (data.publish) {
    try {
      const assignment = await repo.getAssignmentById({ id, teacherId });
      if (assignment) {
        const targetClasses = assignment.target_classes || [];
        for (const classId of targetClasses) {
          const students = await enrollmentsRepository.findClassRoster(classId, null, { isCurrent: true, status: 'enrolled' });
          await notifyAssignmentPublished({
            assignment: {
              id: assignment.id,
              title: assignment.title,
              dueDate: assignment.due_date || assignment.dueDate,
              classId,
              subjectId: assignment.subject_id,
            },
            students: students.map((s) => ({ id: s.user_id, name: s.student_name })),
          });
        }
      }
    } catch (notifErr) {
      console.error('[NotificationService] notifyAssignmentPublished (create) failed:', notifErr.message);
    }
  }

  return { id, status: data.publish ? 'published' : 'draft' };
}

/**
 * Update an existing draft assignment.
 * Only the owner can update. Cannot update published assignments directly.
 */
export async function updateAssignment({ id, data, teacherId }) {
  // Fetch existing assignment to verify ownership and status
  const existing = await repo.getAssignmentById({ id, teacherId });
  if (!existing) {
    const err = new Error('Không tìm thấy bài tập hoặc bạn không có quyền sửa');
    err.code = 'ASSIGNMENT_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  if (existing.status === 'published') {
    const err = new Error('Không thể sửa bài tập đã công bố. Hãy lưu thành bản nháp mới.');
    err.code = 'ASSIGNMENT_ALREADY_PUBLISHED';
    err.status = 409;
    throw err;
  }

  // Re-validate due date if changed
  const newDueDate = data.dueDate || existing.due_date;
  const newDueTime = data.dueTime || existing.due_time || '23:59';
  if (newDueDate) {
    const due = new Date(`${newDueDate}T${newDueTime}:00`);
    if (due <= new Date()) {
      const err = new Error('Hạn nộp bài phải là thời điểm trong tương lai');
      err.code = 'INVALID_DUE_DATE';
      err.status = 400;
      throw err;
    }
  }

  await repo.updateAssignment({ id, data, teacherId });
  return { id, status: 'draft' };
}

/**
 * Publish a draft assignment.
 * Only the owner can publish. Assignment must be in 'draft' status.
 */
export async function publishAssignment({ id, teacherId }) {
  const publishedId = await repo.publishAssignment({ id, teacherId });
  if (!publishedId) {
    const err = new Error('Không thể công bố bài tập. Chỉ bản nháp mới có thể công bố.');
    err.code = 'PUBLISH_FAILED';
    err.status = 409;
    throw err;
  }

  // G26: Notify enrolled students that the assignment is published
  try {
    const assignment = await repo.getAssignmentById({ id, teacherId });
    if (assignment) {
      const targetClasses = assignment.target_classes || [];
      for (const classId of targetClasses) {
        const students = await enrollmentsRepository.findClassRoster(classId, null, { isCurrent: true, status: 'enrolled' });
        await notifyAssignmentPublished({
          assignment: {
            id: assignment.id,
            title: assignment.title,
            dueDate: assignment.due_date || assignment.dueDate,
            classId,
            subjectId: assignment.subject_id,
          },
          students: students.map((s) => ({ id: s.user_id, name: s.student_name })),
        });
      }
    }
  } catch (notifErr) {
    // Notification failure must not break the publish flow
    console.error('[NotificationService] notifyAssignmentPublished failed:', notifErr.message);
  }

  return { id: publishedId, status: 'published' };
}

/**
 * Get a single assignment with its questions.
 * Only accessible by the owner (teacher) or students enrolled in target classes.
 */
export async function getAssignmentById({ id, teacherId, studentId: _studentId }) {
  const assignment = await repo.getAssignmentById({ id, teacherId });
  // If studentId provided, verify enrollment via class (future extension)
  return assignment;
}

/**
 * List assignments for a teacher (with filters).
 */
export async function listAssignments({ teacherId, schoolId, filters = {} }) {
  return repo.listAssignments({ teacherId, schoolId, filters });
}

/**
 * Delete a draft assignment (only drafts, only owner).
 */
export async function deleteAssignment({ id, teacherId }) {
  const deletedId = await repo.deleteAssignment({ id, teacherId });
  if (!deletedId) {
    const err = new Error('Không thể xóa bài tập. Chỉ bản nháp mới có thể xóa.');
    err.code = 'DELETE_FAILED';
    err.status = 409;
    throw err;
  }
  return { id: deletedId };
}

/**
 * Grade a student submission.
 */
export async function gradeSubmission({ submissionId, score, feedback, teacherId }) {
  await repo.gradeSubmission({ submissionId, score, feedback, teacherId });
  return { submissionId, status: 'graded', score };
}

/**
 * List grading queue for a teacher's assignments.
 */
export async function listGradingQueue({ teacherId, filters = {} }) {
  return repo.listGradingQueue({ teacherId, filters });
}
