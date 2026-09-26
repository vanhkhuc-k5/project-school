// =============================================================================
// Messages Repository — Data Access Layer
// G27 — Safe Parent/Teacher Messaging
// Supports: PostgreSQL (Neon Cloud) + SQLite (local dev)
// =============================================================================
import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';
import { CONVERSATION_STATUS, MESSAGE_ROLES } from './messages.types.js';
import { nanoid } from 'nanoid';

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    schoolId: row.school_id,
    parentId: row.parent_id,
    teacherId: row.teacher_id,
    studentId: row.student_id,
    subject: row.subject,
    status: row.status,
    lastMessageAt: row.last_message_at,
    parentUnreadCount: row.parent_unread_count || 0,
    teacherUnreadCount: row.teacher_unread_count || 0,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    archivedBy: row.archived_by,
    // Enriched fields (joined)
    studentName: row.student_name,
    teacherName: row.teacher_name,
    parentName: row.parent_name,
  };
}

function parseMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    schoolId: row.school_id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    senderRole: row.sender_role,
    receiverRole: row.receiver_role,
    studentId: row.student_id,
    subject: row.subject,
    content: row.content,
    isRead: row.is_read,
    readAt: row.read_at,
    isArchivedBySender: row.is_archived_by_sender,
    isArchivedByReceiver: row.is_archived_by_receiver,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Enriched fields
    senderName: row.sender_name,
    receiverName: row.receiver_name,
  };
}

// ── Conversation Repository ─────────────────────────────────────────────────

export const conversationRepo = {
  /**
   * Find a conversation by ID.
   */
  async findById(conversationId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT c.*,
               s_user.name as student_name,
               t_user.name as teacher_name,
               p_user.name as parent_name
        FROM message_conversations c
        LEFT JOIN users s_user ON s_user.id = c.student_id
        LEFT JOIN users t_user ON t_user.id = c.teacher_id
        LEFT JOIN users p_user ON p_user.id = c.parent_id
        WHERE c.id = $1
      `, [conversationId]);
      return parseConversation(res.rows[0]) || null;
    }

    const row = db.prepare(`
      SELECT c.*,
             s_user.name as student_name,
             t_user.name as teacher_name,
             p_user.name as parent_name
      FROM message_conversations c
      LEFT JOIN users s_user ON s_user.id = c.student_id
      LEFT JOIN users t_user ON t_user.id = c.teacher_id
      LEFT JOIN users p_user ON p_user.id = c.parent_id
      WHERE c.id = ?
    `).get(conversationId);
    return parseConversation(row) || null;
  },

  /**
   * Find existing conversation between parent and teacher for a student.
   */
  async findExisting({ parentId, teacherId, studentId }) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM message_conversations
        WHERE parent_id = $1 AND teacher_id = $2 AND student_id = $3 AND status = 'active'
        LIMIT 1
      `, [parentId, teacherId, studentId]);
      return parseConversation(res.rows[0]) || null;
    }

    const row = db.prepare(`
      SELECT * FROM message_conversations
      WHERE parent_id = ? AND teacher_id = ? AND student_id = ? AND status = 'active'
      LIMIT 1
    `).get(parentId, teacherId, studentId);
    return parseConversation(row) || null;
  },

  /**
   * Create a new conversation.
   */
  async create({ id, schoolId, parentId, teacherId, studentId, subject, createdBy }) {
    const convId = id || `conv_${nanoid(12)}`;
    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO message_conversations (
          id, school_id, parent_id, teacher_id, student_id, subject,
          status, last_message_at, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10)
        RETURNING *
      `, [convId, schoolId, parentId, teacherId, studentId, subject || null, now, createdBy || null, now, now]);
      return parseConversation(res.rows[0]);
    }

    db.prepare(`
      INSERT INTO message_conversations (
        id, school_id, parent_id, teacher_id, student_id, subject,
        status, last_message_at, created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))
    `).run(convId, schoolId, parentId, teacherId, studentId, subject || null, now, createdBy || null);

    return this.findById(convId);
  },

  /**
   * List conversations for a user (parent or teacher).
   */
  async listForUser({ userId, role, status = 'active', page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const statusVal = status === 'active' ? 'active' : 'archived';

    // Determine which column to filter on
    const idCol = role === MESSAGE_ROLES.TEACHER ? 'teacher_id' : 'parent_id';

    if (isPostgresConfigured()) {
      const countRes = await pgQuery(`
        SELECT COUNT(*) as count FROM message_conversations
        WHERE ${idCol} = $1 AND status = $2
      `, [userId, statusVal]);
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      const res = await pgQuery(`
        SELECT c.*,
               s_user.name as student_name,
               t_user.name as teacher_name,
               p_user.name as parent_name
        FROM message_conversations c
        LEFT JOIN users s_user ON s_user.id = c.student_id
        LEFT JOIN users t_user ON t_user.id = c.teacher_id
        LEFT JOIN users p_user ON p_user.id = c.parent_id
        WHERE c.${idCol} = $1 AND c.status = $2
        ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
        LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}
      `, [userId, statusVal]);

      return {
        conversations: res.rows.map(parseConversation),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // SQLite
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM message_conversations
      WHERE ${idCol} = ? AND status = ?
    `).get(userId, statusVal)?.count || 0;

    const rows = db.prepare(`
      SELECT c.*,
             s_user.name as student_name,
             t_user.name as teacher_name,
             p_user.name as parent_name
      FROM message_conversations c
      LEFT JOIN users s_user ON s_user.id = c.student_id
      LEFT JOIN users t_user ON t_user.id = c.teacher_id
      LEFT JOIN users p_user ON p_user.id = c.parent_id
      WHERE c.${idCol} = ? AND c.status = ?
      ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
      LIMIT ? OFFSET ?
    `).all(userId, statusVal, limit, offset);

    return {
      conversations: rows.map(parseConversation),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  /**
   * Update conversation: update last_message_at and update unread counts.
   */
  async updateOnMessage(conversationId) {
    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE message_conversations
        SET last_message_at = $1, updated_at = $1
        WHERE id = $2
      `, [now, conversationId]);
      return;
    }

    db.prepare(`
      UPDATE message_conversations
      SET last_message_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(now, conversationId);
  },

  /**
   * Increment unread count for receiver.
   */
  async incrementUnreadCount(conversationId, receiverRole) {
    const col = receiverRole === MESSAGE_ROLES.TEACHER ? 'teacher_unread_count' : 'parent_unread_count';

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE message_conversations
        SET ${col} = ${col} + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [conversationId]);
      return;
    }

    db.prepare(`
      UPDATE message_conversations
      SET ${col} = ${col} + 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(conversationId);
  },

  /**
   * Reset unread count for a role in a conversation.
   */
  async resetUnreadCount(conversationId, role) {
    const col = role === MESSAGE_ROLES.TEACHER ? 'teacher_unread_count' : 'parent_unread_count';

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE message_conversations
        SET ${col} = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [conversationId]);
      return;
    }

    db.prepare(`
      UPDATE message_conversations
      SET ${col} = 0, updated_at = datetime('now')
      WHERE id = ?
    `).run(conversationId);
  },

  /**
   * Archive a conversation.
   */
  async archive(conversationId, userId, role) {
    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE message_conversations
        SET status = 'archived', archived_at = $1, archived_by = $2, updated_at = $1
        WHERE id = $3
      `, [now, userId, conversationId]);
      return;
    }

    db.prepare(`
      UPDATE message_conversations
      SET status = 'archived', archived_at = ?, archived_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(now, userId, conversationId);
  },
};

// ── Message Repository ───────────────────────────────────────────────────────

export const messageRepo = {
  /**
   * Create a new message.
   */
  async create({ id, schoolId, conversationId, senderId, receiverId, senderRole, receiverRole, studentId, subject, content }) {
    const msgId = id || `msg_${nanoid(12)}`;
    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO parent_teacher_messages (
          id, school_id, conversation_id, sender_id, receiver_id,
          sender_role, receiver_role, student_id, subject, content,
          is_read, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, $11, $12)
        RETURNING *
      `, [msgId, schoolId, conversationId, senderId, receiverId, senderRole, receiverRole, studentId || null, subject || null, content, now, now]);
      return parseMessage(res.rows[0]);
    }

    db.prepare(`
      INSERT INTO parent_teacher_messages (
        id, school_id, conversation_id, sender_id, receiver_id,
        sender_role, receiver_role, student_id, subject, content,
        is_read, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
    `).run(msgId, schoolId, conversationId, senderId, receiverId, senderRole, receiverRole, studentId || null, subject || null, content);

    return this.findById(msgId);
  },

  /**
   * Find message by ID.
   */
  async findById(msgId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT m.*,
               s_u.name as sender_name,
               r_u.name as receiver_name
        FROM parent_teacher_messages m
        LEFT JOIN users s_u ON s_u.id = m.sender_id
        LEFT JOIN users r_u ON r_u.id = m.receiver_id
        WHERE m.id = $1
      `, [msgId]);
      return parseMessage(res.rows[0]) || null;
    }

    const row = db.prepare(`
      SELECT m.*,
             s_u.name as sender_name,
             r_u.name as receiver_name
      FROM parent_teacher_messages m
      LEFT JOIN users s_u ON s_u.id = m.sender_id
      LEFT JOIN users r_u ON r_u.id = m.receiver_id
      WHERE m.id = ?
    `).get(msgId);
    return parseMessage(row) || null;
  },

  /**
   * List messages in a conversation with pagination.
   */
  async listForConversation({ conversationId, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;

    if (isPostgresConfigured()) {
      const countRes = await pgQuery(`
        SELECT COUNT(*) as count FROM parent_teacher_messages
        WHERE conversation_id = $1
      `, [conversationId]);
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      const res = await pgQuery(`
        SELECT m.*,
               s_u.name as sender_name,
               r_u.name as receiver_name
        FROM parent_teacher_messages m
        LEFT JOIN users s_u ON s_u.id = m.sender_id
        LEFT JOIN users r_u ON r_u.id = m.receiver_id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ASC
        LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}
      `, [conversationId]);

      return {
        messages: res.rows.map(parseMessage),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // SQLite
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM parent_teacher_messages
      WHERE conversation_id = ?
    `).get(conversationId)?.count || 0;

    const rows = db.prepare(`
      SELECT m.*,
             s_u.name as sender_name,
             r_u.name as receiver_name
      FROM parent_teacher_messages m
      LEFT JOIN users s_u ON s_u.id = m.sender_id
      LEFT JOIN users r_u ON r_u.id = m.receiver_id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC
      LIMIT ? OFFSET ?
    `).all(conversationId, limit, offset);

    return {
      messages: rows.map(parseMessage),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  /**
   * Mark a message as read.
   */
  async markAsRead(msgId) {
    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE parent_teacher_messages
        SET is_read = TRUE, read_at = $1, updated_at = $1
        WHERE id = $2
      `, [now, msgId]);
      return;
    }

    db.prepare(`
      UPDATE parent_teacher_messages
      SET is_read = 1, read_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(now, msgId);
  },

  /**
   * Mark all messages in a conversation as read for a user.
   */
  async markAllAsReadForConversation(conversationId, userId) {
    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE parent_teacher_messages
        SET is_read = TRUE, read_at = $1, updated_at = $1
        WHERE conversation_id = $2 AND receiver_id = $3 AND is_read = FALSE
      `, [now, conversationId, userId]);
      return;
    }

    db.prepare(`
      UPDATE parent_teacher_messages
      SET is_read = 1, read_at = ?, updated_at = datetime('now')
      WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0
    `).run(now, conversationId, userId);
  },

  /**
   * Get total unread message count for a user.
   */
  async getUnreadCount(userId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT COUNT(*) as count FROM parent_teacher_messages
        WHERE receiver_id = $1 AND is_read = FALSE
      `, [userId]);
      return parseInt(res.rows[0]?.count || '0', 10);
    }

    const row = db.prepare(`
      SELECT COUNT(*) as count FROM parent_teacher_messages
      WHERE receiver_id = ? AND is_read = 0
    `).get(userId);
    return row?.count || 0;
  },
};
