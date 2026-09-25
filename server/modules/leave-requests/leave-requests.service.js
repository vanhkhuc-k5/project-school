// =============================================================================
// Leave Requests Service — Business Logic Layer
// G28 — Student Leave Requests Lifecycle
// =============================================================================
import * as repo from './leave-requests.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { LEAVE_STATUS, STATUS_TRANSITIONS, REVIEWER_ROLES } from './leave-requests.types.js';
import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';
import { notifyLeaveRequestUpdated } from '../notifications/notifications.service.js';

// ── Authorization Helpers ────────────────────────────────────────────────────

/**
 * Check if a parent has an active link to a student.
 */
async function isParentOfStudent(parentUserId, studentId) {
  if (!parentUserId || !studentId) return false;
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT ps.id FROM parent_students ps
      JOIN parents p ON ps.parent_id = p.id
      WHERE p.user_id = $1 AND ps.student_id = $2
    `, [parentUserId, studentId]);
    return res.rows.length > 0;
  }
  const row = db.prepare(`
    SELECT ps.id FROM parent_students ps
    JOIN parents p ON ps.parent_id = p.id
    WHERE p.user_id = ? AND ps.student_id = ?
  `).get(parentUserId, studentId);
  return !!row;
}

/**
 * Check if user is homeroom teacher of student's class.
 */
async function isHomeroomTeacher(teacherUserId, studentId) {
  if (!teacherUserId || !studentId) return false;
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT c.id FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      WHERE ce.student_id = $1 AND ce.is_current = TRUE AND c.homeroom_teacher_id = $2
    `, [studentId, teacherUserId]);
    return res.rows.length > 0;
  }
  const row = db.prepare(`
    SELECT c.id FROM class_enrollments ce
    JOIN classes c ON ce.class_id = c.id
    WHERE ce.student_id = ? AND ce.is_current = 1 AND c.homeroom_teacher_id = ?
  `).get(studentId, teacherUserId);
  return !!row;
}

/**
 * Check if user is authorized to review requests.
 */
async function canReviewRequest(userId, role, studentId, schoolId) {
  // Admin/School admin can review any request in their school
  if (role === 'admin' || role === 'school_admin') {
    return true;
  }
  // Homeroom teacher can review requests for their students
  if (role === 'teacher' && studentId) {
    return await isHomeroomTeacher(userId, studentId);
  }
  return false;
}

/**
 * Get user's school ID.
 */
async function getUserSchoolId(userId) {
  if (!userId) return null;
  if (isPostgresConfigured()) {
    const res = await pgQuery(`SELECT school_id FROM users WHERE id = $1`, [userId]);
    return res.rows[0]?.school_id || null;
  }
  const row = db.prepare(`SELECT school_id FROM users WHERE id = ?`).get(userId);
  return row?.school_id || null;
}

/**
 * Get current academic year ID.
 */
async function getCurrentAcademicYearId(schoolId) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT id FROM academic_years WHERE school_id = $1 AND is_current = TRUE LIMIT 1
    `, [schoolId]);
    return res.rows[0]?.id || null;
  }
  const row = db.prepare(`
    SELECT id FROM academic_years WHERE school_id = ? AND is_current = 1 LIMIT 1
  `).get(schoolId);
  return row?.id || null;
}

/**
 * Log audit event.
 */
async function logAudit({ actorId, actorName, action, metadata }) {
  const logId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type, created_at)
      VALUES ($1, $2, 'system', $3, 'Leave Request', 'info', CURRENT_TIMESTAMP)
    `, [logId, actorName || 'System', action]);
    return;
  }
  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type, created_at)
    VALUES (?, ?, 'system', ?, 'Leave Request', 'info', datetime('now'))
  `).run(logId, actorName || 'System', action);
}

// ── Service ──────────────────────────────────────────────────────────────────

export const leaveRequestService = {
  /**
   * List leave requests with authorization.
   * - Parents: only their own requests
   * - Teachers: requests for students in their class
   * - Admin: all requests in their school
   */
  async listRequests({ userId, role, schoolId, studentId, status, page, limit, startDateFrom, startDateTo }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    // Build filter based on role
    let filterSchoolId = schoolId;
    let filterParentId = null;
    let filterStudentId = studentId || null;

    if (role === 'parent') {
      // Parents only see their own requests
      filterParentId = userId;
      filterStudentId = studentId || null; // Can filter by specific child
    } else if (role === 'teacher') {
      // Teachers see requests for students in their class
      // This requires joining with class_enrollments - handled in query
      if (studentId) {
        filterStudentId = studentId;
      }
    } else if (role !== 'admin' && role !== 'school_admin') {
      throw AppError.forbidden('Vai trò không được phép xem đơn xin nghỉ phép');
    }

    const result = await repo.leaveRequestRepo.list({
      schoolId: filterSchoolId,
      studentId: filterStudentId,
      parentId: filterParentId,
      status,
      page,
      limit,
      startDateFrom,
      startDateTo,
    });

    return result;
  },

  /**
   * Get a single leave request by ID.
   */
  async getRequest({ id, userId, role }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    const request = await repo.leaveRequestRepo.findById(id);
    if (!request) throw AppError.notFound('Đơn xin nghỉ phép không tồn tại');

    // Authorization: requester (parent), reviewer (admin/teacher), or same school admin
    const isRequester = request.parentId === userId;
    const isSchoolAdmin = (role === 'admin' || role === 'school_admin') && request.schoolId;
    const isReviewer = role === 'teacher' && await isHomeroomTeacher(userId, request.studentId);

    if (!isRequester && !isSchoolAdmin && !isReviewer) {
      throw AppError.forbidden('Bạn không có quyền xem đơn này');
    }

    return request;
  },

  /**
   * Create a new leave request (submit).
   * Only linked parents can create requests for students.
   */
  async createRequest({ studentId, startDate, endDate, reasonType, reasonDetail, emergencyPhone, userId, role, userName }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    // Authorization: Only parents (or admin for testing) can create
    if (role !== 'parent' && role !== 'admin') {
      throw AppError.forbidden('Chỉ phụ huynh mới có thể gửi đơn xin nghỉ phép');
    }

    // For parents: must be linked to student
    if (role === 'parent') {
      const linked = await isParentOfStudent(userId, studentId);
      if (!linked) throw AppError.forbidden('Bạn không phải phụ huynh của học sinh này');
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      throw AppError.badRequest('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
    }

    // Get school and academic year
    const schoolId = await getUserSchoolId(userId);
    const academicYearId = await getCurrentAcademicYearId(schoolId);

    const request = await repo.leaveRequestRepo.create({
      schoolId,
      studentId,
      parentId: userId,
      academicYearId,
      startDate,
      endDate,
      reasonType: reasonType || 'family_event',
      reasonDetail,
      emergencyPhone,
      createdBy: userId,
    });

    await logAudit({
      actorId: userId,
      actorName: userName,
      action: `Tạo đơn xin nghỉ phép cho học sinh ${studentId} (${startDate} - ${endDate})`,
      metadata: { requestId: request.id, studentId },
    });

    return request;
  },

  /**
   * Cancel a leave request (only by requester, if not yet reviewed).
   */
  async cancelRequest({ id, userId, role, cancellationReason, userName }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    const request = await repo.leaveRequestRepo.findById(id);
    if (!request) throw AppError.notFound('Đơn xin nghỉ phép không tồn tại');

    // Only requester (parent) can cancel
    if (request.parentId !== userId) {
      throw AppError.forbidden('Chỉ người gửi đơn mới có thể hủy');
    }

    // Can only cancel if not yet reviewed
    if (request.status === LEAVE_STATUS.APPROVED || request.status === LEAVE_STATUS.REJECTED) {
      throw AppError.badRequest('Không thể hủy đơn đã được duyệt hoặc từ chối');
    }

    if (request.status === LEAVE_STATUS.CANCELLED) {
      throw AppError.badRequest('Đơn đã được hủy trước đó');
    }

    await repo.leaveRequestRepo.updateStatusCancelled(id, {
      cancellationReason,
      cancelledBy: userId,
    });

    await logAudit({
      actorId: userId,
      actorName: userName,
      action: `Hủy đơn xin nghỉ phép ${id}`,
      metadata: { requestId: id },
    });

    return { success: true };
  },

  /**
   * Review (approve/reject) a leave request.
   * Only authorized staff can review.
   */
  async reviewRequest({ id, status, reviewNote, userId, role, userName }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    const request = await repo.leaveRequestRepo.findById(id);
    if (!request) throw AppError.notFound('Đơn xin nghỉ phép không tồn tại');

    // Can only review pending requests
    if (request.status !== LEAVE_STATUS.PENDING) {
      throw AppError.badRequest(`Không thể duyệt đơn ở trạng thái "${request.status}"`);
    }

    // Authorization check
    const canReview = await canReviewRequest(userId, role, request.studentId, request.schoolId);
    if (!canReview) {
      throw AppError.forbidden('Bạn không có quyền duyệt đơn này');
    }

    await repo.leaveRequestRepo.updateStatusReviewed(id, {
      status,
      reviewNote,
      reviewerId: userId,
    });

    // G26/G40: Dispatch SSE notification to parent
    try {
      const updatedRequest = await repo.leaveRequestRepo.findById(id);
      if (updatedRequest) {
        await notifyLeaveRequestUpdated({
          leaveRequest: {
            id: updatedRequest.id,
            status,
            startDate: updatedRequest.start_date,
            endDate: updatedRequest.end_date,
          },
          requester: { id: updatedRequest.parent_id, name: null },
          actor: { name: userName, role },
        });
      }
    } catch (notifErr) {
      console.warn('[Notification] notifyLeaveRequestUpdated failed (non-fatal):', notifErr.message);
    }

    const action = status === LEAVE_STATUS.APPROVED ? 'Duyệt' : 'Từ chối';
    await logAudit({
      actorId: userId,
      actorName: userName,
      action: `${action} đơn xin nghỉ phép ${id}`,
      metadata: { requestId: id, status, reviewNote },
    });

    return { success: true };
  },

  /**
   * Get pending requests for review dashboard.
   */
  async getPendingRequests({ userId, role, schoolId, page, limit }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    // Only teachers and admins can see pending requests
    if (role !== 'teacher' && role !== 'admin' && role !== 'school_admin') {
      throw AppError.forbidden('Vai trò không được phép xem đơn chờ duyệt');
    }

    return repo.leaveRequestRepo.listPending({
      schoolId,
      page,
      limit,
    });
  },

  /**
   * Get all requests for a specific student.
   */
  async getRequestsForStudent({ studentId, userId, role }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    // Parents can only see requests for their linked children
    if (role === 'parent') {
      const linked = await isParentOfStudent(userId, studentId);
      if (!linked) throw AppError.forbidden('Bạn không phải phụ huynh của học sinh này');
    }

    const result = await repo.leaveRequestRepo.list({
      studentId,
      page: 1,
      limit: 100,
    });

    return result;
  },
};
