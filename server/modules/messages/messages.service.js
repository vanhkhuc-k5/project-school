// =============================================================================
// Messages Service — Business Logic Layer
// G27 — Safe Parent/Teacher Messaging
// =============================================================================
import * as repo from './messages.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { MESSAGE_ROLES, ROLE_LABELS } from './messages.types.js';
import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';

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
 * Check if a teacher has a relationship to a student (via class or subject).
 * Returns true if teacher is homeroom teacher OR teaches a subject to the student's class.
 */
async function isTeacherOfStudent(teacherUserId, studentId) {
  if (!teacherUserId || !studentId) return false;

  if (isPostgresConfigured()) {
    // Check if teacher is homeroom teacher of student's class
    const homeroomRes = await pgQuery(`
      SELECT ce.class_id FROM class_enrollments ce
      JOIN classes c ON ce.class_id = c.id
      WHERE ce.student_id = $1 AND ce.is_current = TRUE AND c.homeroom_teacher_id = $2
    `, [studentId, teacherUserId]);
    if (homeroomRes.rows.length > 0) return true;

    // Check if teacher teaches any subject to student's current class
    const subjectRes = await pgQuery(`
      SELECT 1 FROM class_enrollments ce
      JOIN teacher_assignments ta ON ta.class_id = ce.class_id
      WHERE ce.student_id = $1 AND ta.teacher_id = $2 AND ce.is_current = TRUE
      LIMIT 1
    `, [studentId, teacherUserId]);
    return subjectRes.rows.length > 0;
  }

  // SQLite
  const homeroomRow = db.prepare(`
    SELECT ce.class_id FROM class_enrollments ce
    JOIN classes c ON ce.class_id = c.id
    WHERE ce.student_id = ? AND ce.is_current = 1 AND c.homeroom_teacher_id = ?
  `).get(studentId, teacherUserId);
  if (homeroomRow) return true;

  const subjectRow = db.prepare(`
    SELECT 1 FROM class_enrollments ce
    JOIN teacher_assignments ta ON ta.class_id = ce.class_id
    WHERE ce.student_id = ? AND ta.teacher_id = ? AND ce.is_current = 1
    LIMIT 1
  `).get(studentId, teacherUserId);
  return !!subjectRow;
}

/**
 * Check if user account is active.
 */
async function isAccountActive(userId) {
  if (!userId) return false;
  if (isPostgresConfigured()) {
    const res = await pgQuery(`SELECT is_active FROM users WHERE id = $1`, [userId]);
    return res.rows[0]?.is_active === true;
  }
  const row = db.prepare(`SELECT is_active FROM users WHERE id = ?`).get(userId);
  return row?.is_active === 1 || row?.is_active === true;
}

/**
 * Get user's role from their profile.
 */
async function getUserRole(userId) {
  if (!userId) return null;
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT role FROM users WHERE id = $1
    `, [userId]);
    return res.rows[0]?.role || null;
  }
  const row = db.prepare(`SELECT role FROM users WHERE id = ?`).get(userId);
  return row?.role || null;
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

// ── Audit Logging ────────────────────────────────────────────────────────────

async function logAudit({ actorId, actorName, action, metadata = {} }) {
  const logId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const metaJson = JSON.stringify(metadata);

  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type, created_at)
      VALUES ($1, $2, 'system', $3, 'Messages', 'info', CURRENT_TIMESTAMP)
    `, [logId, actorName || 'System', action]);
    return;
  }

  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type, created_at)
    VALUES (?, ?, 'system', ?, 'Messages', 'info', datetime('now'))
  `).run(logId, actorName || 'System', action);
}

// ── Service ──────────────────────────────────────────────────────────────────

export const messageService = {
  /**
   * List conversations for a user.
   */
  async listConversations({ userId, role, status = 'active', page = 1, limit = 20 }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    const result = await repo.conversationRepo.listForUser({
      userId, role, status, page, limit,
    });

    return result;
  },

  /**
   * Get messages in a conversation.
   */
  async getMessages({ conversationId, userId, role, page = 1, limit = 50 }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');
    if (!conversationId) throw AppError.badRequest('Thiếu conversationId');

    // Verify user is participant in conversation
    const conv = await repo.conversationRepo.findById(conversationId);
    if (!conv) throw AppError.notFound('Cuộc trò chuyện không tồn tại');

    const isParticipant =
      conv.parentId === userId ||
      conv.teacherId === userId ||
      (role === MESSAGE_ROLES.ADMIN && conv.schoolId);

    if (!isParticipant) {
      throw AppError.forbidden('Bạn không có quyền xem cuộc trò chuyện này');
    }

    return repo.messageRepo.listForConversation({ conversationId, page, limit });
  },

  /**
   * Create or find conversation and send first message.
   * Authorization: Parent must have link to student; Teacher must have link to student.
   */
  async createConversation({ senderId, senderRole, teacherId, studentId, subject, content, senderName }) {
    if (!senderId) throw AppError.unauthorized('Yêu cầu đăng nhập');
    if (!content || content.trim().length === 0) {
      throw AppError.badRequest('Nội dung tin nhắn không được để trống');
    }

    // Safety: no self-messaging
    if (senderId === teacherId) {
      throw AppError.badRequest('Không thể gửi tin nhắn cho chính mình');
    }

    // Account status check
    const [senderActive, teacherActive] = await Promise.all([
      isAccountActive(senderId),
      isAccountActive(teacherId),
    ]);
    if (!senderActive) throw AppError.forbidden('Tài khoản của bạn đã bị khóa');
    if (!teacherActive) throw AppError.badRequest('Tài khoản giáo viên không khả dụng');

    // Get sender's role
    const actualSenderRole = senderRole || await getUserRole(senderId);
    const schoolId = await getUserSchoolId(senderId);

    // Authorization check based on sender role
    if (actualSenderRole === MESSAGE_ROLES.PARENT) {
      // Parent: must have link to student
      const linked = await isParentOfStudent(senderId, studentId);
      if (!linked) throw AppError.forbidden('Bạn không phải phụ huynh của học sinh này');

      // Parent must verify teacher has relationship to student
      const teacherLinked = await isTeacherOfStudent(teacherId, studentId);
      if (!teacherLinked) throw AppError.forbidden('Giáo viên không có liên quan đến học sinh này');

    } else if (actualSenderRole === MESSAGE_ROLES.TEACHER) {
      // Teacher: must have relationship to student
      const linked = await isTeacherOfStudent(senderId, studentId);
      if (!linked) throw AppError.forbidden('Bạn không có liên quan đến học sinh này');

    } else if (actualSenderRole === 'admin') {
      // Admin: can message anyone in their school
      // No additional checks needed
    } else {
      throw AppError.forbidden('Vai trò không được phép gửi tin nhắn');
    }

    // Find existing conversation or create new
    let conv = await repo.conversationRepo.findExisting({
      parentId: actualSenderRole === MESSAGE_ROLES.PARENT ? senderId : teacherId,
      teacherId: actualSenderRole === MESSAGE_ROLES.PARENT ? teacherId : senderId,
      studentId,
    });

    if (!conv) {
      conv = await repo.conversationRepo.create({
        schoolId,
        parentId: actualSenderRole === MESSAGE_ROLES.PARENT ? senderId : teacherId,
        teacherId: actualSenderRole === MESSAGE_ROLES.PARENT ? teacherId : senderId,
        studentId,
        subject: subject || null,
        createdBy: senderId,
      });
    }

    // Send first message
    const message = await repo.messageRepo.create({
      schoolId,
      conversationId: conv.id,
      senderId,
      receiverId: teacherId,
      senderRole: actualSenderRole,
      receiverRole: MESSAGE_ROLES.TEACHER,
      studentId,
      subject: subject || null,
      content: content.trim(),
    });

    // Update conversation metadata
    await repo.conversationRepo.updateOnMessage(conv.id);
    await repo.conversationRepo.incrementUnreadCount(conv.id, MESSAGE_ROLES.TEACHER);

    // Audit log
    await logAudit({
      actorId: senderId,
      actorName: senderName,
      action: `Tạo cuộc trò chuyện mới với giáo viên về học sinh ${studentId}`,
      metadata: { conversationId: conv.id, studentId },
    });

    return { conversation: conv, message };
  },

  /**
   * Send a reply in an existing conversation.
   */
  async sendReply({ conversationId, senderId, senderRole, content, senderName }) {
    if (!senderId) throw AppError.unauthorized('Yêu cầu đăng nhập');
    if (!content || content.trim().length === 0) {
      throw AppError.badRequest('Nội dung tin nhắn không được để trống');
    }

    // Account status check
    const senderActive = await isAccountActive(senderId);
    if (!senderActive) throw AppError.forbidden('Tài khoản của bạn đã bị khóa');

    // Get conversation
    const conv = await repo.conversationRepo.findById(conversationId);
    if (!conv) throw AppError.notFound('Cuộc trò chuyện không tồn tại');
    if (conv.status === 'archived') throw AppError.badRequest('Cuộc trò chuyện đã bị lưu trữ');

    const actualSenderRole = senderRole || await getUserRole(senderId);

    // Verify participant
    const isParticipant = (
      (actualSenderRole === MESSAGE_ROLES.PARENT && conv.parentId === senderId) ||
      (actualSenderRole === MESSAGE_ROLES.TEACHER && conv.teacherId === senderId) ||
      (actualSenderRole === 'admin')
    );
    if (!isParticipant) {
      throw AppError.forbidden('Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này');
    }

    // Determine receiver
    const receiverId = conv.parentId === senderId ? conv.teacherId : conv.parentId;
    const receiverRole = conv.parentId === senderId ? MESSAGE_ROLES.TEACHER : MESSAGE_ROLES.PARENT;

    // Account status check for receiver
    const receiverActive = await isAccountActive(receiverId);
    if (!receiverActive) throw AppError.badRequest('Tài khoản người nhận không khả dụng');

    const schoolId = conv.schoolId || await getUserSchoolId(senderId);

    // Send message
    const message = await repo.messageRepo.create({
      schoolId,
      conversationId,
      senderId,
      receiverId,
      senderRole: actualSenderRole,
      receiverRole,
      studentId: conv.studentId,
      subject: null,
      content: content.trim(),
    });

    // Update conversation
    await repo.conversationRepo.updateOnMessage(conversationId);
    await repo.conversationRepo.incrementUnreadCount(conversationId, receiverRole);

    return message;
  },

  /**
   * Mark all messages in a conversation as read for current user.
   */
  async markAsRead({ conversationId, userId, role }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');
    if (!conversationId) throw AppError.badRequest('Thiếu conversationId');

    // Verify participant
    const conv = await repo.conversationRepo.findById(conversationId);
    if (!conv) throw AppError.notFound('Cuộc trò chuyện không tồn tại');

    const actualRole = role || await getUserRole(userId);
    const isParticipant = (
      (actualRole === MESSAGE_ROLES.PARENT && conv.parentId === userId) ||
      (actualRole === MESSAGE_ROLES.TEACHER && conv.teacherId === userId) ||
      (actualRole === 'admin')
    );
    if (!isParticipant) throw AppError.forbidden('Bạn không có quyền thực hiện thao tác này');

    await repo.messageRepo.markAllAsReadForConversation(conversationId, userId);
    await repo.conversationRepo.resetUnreadCount(conversationId, actualRole);

    return { success: true };
  },

  /**
   * Get total unread message count for a user.
   */
  async getUnreadCount(userId) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');
    return repo.messageRepo.getUnreadCount(userId);
  },

  /**
   * Archive a conversation.
   */
  async archiveConversation({ conversationId, userId, role, userName }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');
    if (!conversationId) throw AppError.badRequest('Thiếu conversationId');

    const conv = await repo.conversationRepo.findById(conversationId);
    if (!conv) throw AppError.notFound('Cuộc trò chuyện không tồn tại');

    const actualRole = role || await getUserRole(userId);
    const isParticipant = (
      (actualRole === MESSAGE_ROLES.PARENT && conv.parentId === userId) ||
      (actualRole === MESSAGE_ROLES.TEACHER && conv.teacherId === userId) ||
      (actualRole === 'admin')
    );
    if (!isParticipant) throw AppError.forbidden('Bạn không có quyền lưu trữ cuộc trò chuyện này');

    await repo.conversationRepo.archive(conversationId, userId, actualRole);

    await logAudit({
      actorId: userId,
      actorName: userName,
      action: `Lưu trữ cuộc trò chuyện ${conversationId}`,
      metadata: { conversationId },
    });

    return { success: true };
  },
};
