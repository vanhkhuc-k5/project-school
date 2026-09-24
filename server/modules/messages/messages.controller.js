// =============================================================================
// Messages Controller — HTTP Handlers
// G27 — Safe Parent/Teacher Messaging
// =============================================================================
import { messageService } from './messages.service.js';
import {
  validateListConversationsQuery,
  validateListMessagesQuery,
  validateCreateConversationBody,
  validateSendMessageBody,
} from './messages.schema.js';
import { ROLE_LABELS } from './messages.types.js';

/**
 * Extract userId from request (JWT payload).
 */
function getUserId(req) {
  return req.user?.id || req.user?.userId || req.user?.sub || null;
}

/**
 * Extract user role from request.
 */
function getUserRole(req) {
  return req.user?.role || null;
}

// ── GET /messages/conversations — List conversations ─────────────────────────

export async function listConversations(req, res, next) {
  try {
    const parsed = validateListConversationsQuery(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, status } = parsed.data;
    const result = await messageService.listConversations({
      userId: getUserId(req),
      role: getUserRole(req),
      status,
      page,
      limit,
    });

    // Enrich with UI metadata
    const enriched = result.conversations.map((conv) => ({
      ...conv,
      roleLabel: ROLE_LABELS[conv.parentId === getUserId(req) ? 'parent' : 'teacher'] || 'Người dùng',
    }));

    res.json({
      success: true,
      conversations: enriched,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /messages/conversations/unread-count ────────────────────────────────

export async function getUnreadCount(req, res, next) {
  try {
    const count = await messageService.getUnreadCount(getUserId(req));
    res.json({ success: true, unreadCount: count });
  } catch (err) {
    next(err);
  }
}

// ── GET /messages/conversations/:id/messages ────────────────────────────────

export async function getMessages(req, res, next) {
  try {
    const { id: conversationId } = req.params;

    const parsed = validateListMessagesQuery(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit } = parsed.data;
    const result = await messageService.getMessages({
      conversationId,
      userId: getUserId(req),
      role: getUserRole(req),
      page,
      limit,
    });

    res.json({
      success: true,
      messages: result.messages,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /messages/conversations — Create conversation + first message ───────

export async function createConversation(req, res, next) {
  try {
    const parsed = validateCreateConversationBody(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { teacherId, studentId, subject, content } = parsed.data;
    const result = await messageService.createConversation({
      senderId: getUserId(req),
      senderRole: getUserRole(req),
      teacherId,
      studentId,
      subject,
      content,
      senderName: req.user?.name || 'Người dùng',
    });

    res.status(201).json({
      success: true,
      conversation: result.conversation,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /messages/conversations/:id/messages — Send reply ─────────────────

export async function sendReply(req, res, next) {
  try {
    const { id: conversationId } = req.params;

    const parsed = validateSendMessageBody(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { content, subject } = parsed.data;
    const message = await messageService.sendReply({
      conversationId,
      senderId: getUserId(req),
      senderRole: getUserRole(req),
      content,
      senderName: req.user?.name || 'Người dùng',
    });

    res.status(201).json({ success: true, message });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /messages/conversations/:id/read ─────────────────────────────────

export async function markConversationAsRead(req, res, next) {
  try {
    const { id: conversationId } = req.params;
    await messageService.markAsRead({
      conversationId,
      userId: getUserId(req),
      role: getUserRole(req),
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /messages/conversations/:id/archive ───────────────────────────────

export async function archiveConversation(req, res, next) {
  try {
    const { id: conversationId } = req.params;
    await messageService.archiveConversation({
      conversationId,
      userId: getUserId(req),
      role: getUserRole(req),
      userName: req.user?.name || 'Người dùng',
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
