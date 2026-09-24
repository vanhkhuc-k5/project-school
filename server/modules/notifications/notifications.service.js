// =============================================================================
// Notifications Service — Business Logic & Event Generators for G26
// =============================================================================
import * as repo from './notifications.repository.js';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_LABELS,
} from './notifications.types.js';
import { AppError } from '../../shared/errors/index.js';

// ── Core CRUD ────────────────────────────────────────────────────────────────

/**
 * Create a single notification.
 */
export async function createNotification({ userId, type, title, message, data }) {
  if (!userId) throw AppError.badRequest('userId là bắt buộc.');
  return repo.createNotification({ userId, type, title, message, data });
}

/**
 * Mark a single notification as read.
 * Validates that the notification belongs to the requesting user.
 */
export async function markAsRead({ notificationId, userId }) {
  if (!notificationId || !userId) throw AppError.badRequest('Thiếu thông tin');

  const existing = await repo.getNotificationById(notificationId);
  if (!existing) throw AppError.notFound('Thông báo không tồn tại.');
  if (existing.userId !== userId) throw AppError.forbidden('Bạn không có quyền đánh dấu thông báo này.');

  await repo.markAsRead({ notificationId, userId });
  return { success: true };
}

/**
 * Mark all unread notifications as read for a user.
 */
export async function markAllAsRead(userId) {
  if (!userId) throw AppError.badRequest('userId là bắt buộc.');
  const count = await repo.markAllAsRead(userId);
  return { success: true, count };
}

/**
 * Get unread count for a user.
 */
export async function getUnreadCount(userId) {
  if (!userId) throw AppError.badRequest('userId là bắt buộc.');
  return repo.getUnreadCount(userId);
}

/**
 * List notifications for a user (paginated).
 */
export async function getNotifications({ userId, type, page, limit }) {
  if (!userId) throw AppError.badRequest('userId là bắt buộc.');
  return repo.listNotificationsForUser({ userId, type, page, limit });
}

/**
 * Delete a notification (owner only).
 */
export async function deleteNotification({ notificationId, userId }) {
  if (!notificationId || !userId) throw AppError.badRequest('Thiếu thông tin');
  const deleted = await repo.deleteNotification({ notificationId, userId });
  if (!deleted) throw AppError.notFound('Thông báo không tồn tại hoặc bạn không có quyền xóa.');
  return { success: true };
}

// ── Event Generators ────────────────────────────────────────────────────────
// These functions bridge domain events → notifications.
// They are the single entry point for creating notifications from domain logic.
// No other module should call repo.createNotification directly.

/**
 * Notify students when an assignment is published.
 * Called from assignments.service.js after publishAssignment().
 *
 * @param {{ assignment, students }} assignment: { id, title, dueDate }  students: [{ id, name }]
 */
export async function notifyAssignmentPublished({ assignment, students }) {
  if (!students || students.length === 0) return;

  const notifications = students.map((student) => ({
    userId: student.id,
    type: NOTIFICATION_TYPES.ASSIGNMENT_PUBLISHED,
    title: `Bài tập mới: ${assignment.title || 'Không có tiêu đề'}`,
    message: assignment.dueDate
      ? `Hạn nộp: ${new Date(assignment.dueDate).toLocaleDateString('vi-VN')}`
      : 'Hãy kiểm tra nội dung bài tập.',
    data: {
      assignmentId: assignment.id,
      classId: assignment.classId,
      subjectId: assignment.subjectId,
    },
  }));

  await repo.createNotificationsBatch(notifications);
}

/**
 * Notify students when an assignment due date is approaching (1 day before).
 * Called from a scheduled job or on-demand check.
 *
 * @param {{ assignment, students }} assignment: { id, title, dueDate }  students: [{ id }]
 */
export async function notifyAssignmentDueSoon({ assignment, students }) {
  if (!students || students.length === 0) return;

  const notifications = students.map((student) => ({
    userId: student.id,
    type: NOTIFICATION_TYPES.ASSIGNMENT_DUE_SOON,
    title: `Nhắc hạn: ${assignment.title || 'Bài tập'}`,
    message: assignment.dueDate
      ? `Còn 1 ngày để nộp bài. Hạn: ${new Date(assignment.dueDate).toLocaleDateString('vi-VN')}`
      : 'Bài tập sắp đến hạn nộp.',
    data: {
      assignmentId: assignment.id,
      classId: assignment.classId,
    },
  }));

  await repo.createNotificationsBatch(notifications);
}

/**
 * Notify a student when a grade is published for them.
 * Called from gradebook.service.js after publishGrade().
 *
 * @param {{ grade, student }} grade: { id, subject, rawScore, maxScore }  student: { id, name }
 */
export async function notifyGradePublished({ grade, student }) {
  if (!student) return;

  const scoreText = grade.rawScore !== undefined
    ? `Điểm: ${grade.rawScore}/${grade.maxScore || 10}`
    : '';

  await repo.createNotification({
    userId: student.id,
    type: NOTIFICATION_TYPES.GRADE_PUBLISHED,
    title: `Điểm mới: ${grade.subject || 'Bài kiểm tra'}`,
    message: `${scoreText} đã được công bố.`,
    data: {
      gradeId: grade.id,
      subjectId: grade.subjectId,
      classId: grade.classId,
      academicYearId: grade.academicYearId,
      semesterId: grade.semesterId,
    },
  });
}

/**
 * Notify a teacher when a student is marked absent in their class.
 * Called from attendance.service.js after takeAttendanceSession().
 *
 * @param {{ attendanceRecord, student, teacher }} record: { id, date }  student: { id, name }  teacher: { id, name }
 */
export async function notifyStudentAbsent({ attendanceRecord, student, teacher }) {
  if (!teacher) return;

  const dateStr = attendanceRecord.date
    ? new Date(attendanceRecord.date).toLocaleDateString('vi-VN')
    : '';

  await repo.createNotification({
    userId: teacher.id,
    type: NOTIFICATION_TYPES.STUDENT_ABSENT,
    title: `Học sinh vắng: ${student.name || 'Không rõ tên'}`,
    message: `Ngày ${dateStr} — ${teacher.name || 'Giáo viên'} đã ghi nhận vắng mặt.`,
    data: {
      attendanceRecordId: attendanceRecord.id,
      sessionId: attendanceRecord.sessionId,
      studentId: student.id,
      classId: attendanceRecord.classId,
      date: attendanceRecord.date,
    },
  });
}

/**
 * Notify recipients when an announcement is published.
 * Called from announcements.service.js after publishAnnouncement().
 *
 * @param {{ announcement, recipients }} announcement: { id, title, priority }  recipients: [{ id, role }]
 */
export async function notifyAnnouncementPublished({ announcement, recipients }) {
  if (!recipients || recipients.length === 0) return;

  const priorityLabel = announcement.priority === 'urgent' ? '⚠️ Khẩn cấp: '
    : announcement.priority === 'important' ? '📌 Quan trọng: '
    : '';

  const notifications = recipients.map((r) => ({
    userId: r.id,
    type: NOTIFICATION_TYPES.ANNOUNCEMENT_PUBLISHED,
    title: `${priorityLabel}${announcement.title || 'Thông báo mới'}`,
    message: announcement.summary || 'Xem chi tiết trong mục Thông báo.',
    data: {
      announcementId: announcement.id,
      priority: announcement.priority,
      scope: announcement.scope,
    },
  }));

  await repo.createNotificationsBatch(notifications);
}

/**
 * Notify requester when a leave request status changes.
 * Called from leave requests module when status is approved/rejected.
 *
 * @param {{ leaveRequest, requester, actor }} requester: { id, name }  actor: { name, role }
 */
export async function notifyLeaveRequestUpdated({ leaveRequest, requester, actor }) {
  if (!requester) return;

  const statusLabel = {
    approved: '✅ Đã duyệt',
    rejected: '❌ Từ chối',
    pending: '⏳ Đang chờ',
  }[leaveRequest.status] || leaveRequest.status;

  const startDate = leaveRequest.startDate
    ? new Date(leaveRequest.startDate).toLocaleDateString('vi-VN')
    : '';
  const endDate = leaveRequest.endDate
    ? new Date(leaveRequest.endDate).toLocaleDateString('vi-VN')
    : '';

  await repo.createNotification({
    userId: requester.id,
    type: NOTIFICATION_TYPES.LEAVE_REQUEST_UPDATED,
    title: `Đơn nghỉ phép: ${statusLabel}`,
    message: leaveRequest.status !== 'pending'
      ? `${actor?.name || 'Quản trị viên'} đã cập nhật đơn nghỉ phép (${startDate} - ${endDate}).`
      : `Đơn nghỉ phép của bạn đang được xem xét.`,
    data: {
      leaveRequestId: leaveRequest.id,
      status: leaveRequest.status,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
    },
  });
}

/**
 * Notify parent when tuition status changes.
 * Called from tuition/fees module when payment status updates.
 *
 * @param {{ tuition, parent }} tuition: { id, amount, status }  parent: { id, name }
 */
export async function notifyTuitionStatusChanged({ tuition, parent }) {
  if (!parent) return;

  const statusLabel = {
    paid: '✅ Đã thanh toán',
    pending: '⏳ Chờ thanh toán',
    overdue: '⚠️ Quá hạn',
    waived: '✅ Đã miễn giảm',
  }[tuition.status] || tuition.status;

  const amountStr = tuition.amount
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tuition.amount)
    : '';

  await repo.createNotification({
    userId: parent.id,
    type: NOTIFICATION_TYPES.TUITION_STATUS_CHANGED,
    title: `Học phí: ${statusLabel}`,
    message: amountStr ? `Số tiền ${amountStr} — Cập nhật trạng thái học phí.` : 'Trạng thái học phí đã được cập nhật.',
    data: {
      tuitionId: tuition.id,
      studentId: tuition.studentId,
      status: tuition.status,
      amount: tuition.amount,
    },
  });
}
