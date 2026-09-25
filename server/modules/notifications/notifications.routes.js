import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from './notifications.controller.js';
import { sseStream } from './sse.controller.js';

const router = express.Router();

// All notification routes require authentication (except SSE stream for auth handling)
router.use(authenticateToken);

// GET /api/notifications/stream — SSE real-time stream (keep connection alive)
router.get('/stream', sseStream);

// GET /api/notifications — list with pagination
router.get('/', listNotifications);

// GET /api/notifications/unread-count
router.get('/unread-count', getUnreadCount);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', markAsRead);

// PATCH /api/notifications/read-all
router.patch('/read-all', markAllAsRead);

// DELETE /api/notifications/:id
router.delete('/:id', deleteNotification);

export default router;
