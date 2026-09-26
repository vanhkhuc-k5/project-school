// =============================================================================
// Messages Routes — Express Router
// G27 — Safe Parent/Teacher Messaging
// =============================================================================
import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  listConversations,
  getUnreadCount,
  getMessages,
  createConversation,
  sendReply,
  markConversationAsRead,
  archiveConversation,
} from './messages.controller.js';

const router = express.Router();

// All message routes require authentication
router.use(authenticateToken);

// ── Conversations ─────────────────────────────────────────────────────────

// GET /messages/conversations — list user's conversation threads
router.get('/conversations', listConversations);

// GET /messages/conversations/unread-count — total unread count
router.get('/conversations/unread-count', getUnreadCount);

// GET /messages/conversations/:id/messages — messages in thread
router.get('/conversations/:id/messages', getMessages);

// POST /messages/conversations — create conversation + send first message
router.post('/conversations', createConversation);

// POST /messages/conversations/:id/messages — send reply in thread
router.post('/conversations/:id/messages', sendReply);

// PATCH /messages/conversations/:id/read — mark all as read
router.patch('/conversations/:id/read', markConversationAsRead);

// PATCH /messages/conversations/:id/archive — archive thread
router.patch('/conversations/:id/archive', archiveConversation);

export default router;
