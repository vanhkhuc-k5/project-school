import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from './notifications.controller.js';

const router = express.Router();

// All notification routes require authentication
router.use(authenticateToken);

// GET /api/v1/notifications — list with pagination
router.get('/', listNotifications);

// GET /api/v1/notifications/unread-count
router.get('/unread-count', getUnreadCount);

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', markAsRead);

// PATCH /api/v1/notifications/read-all
router.patch('/read-all', markAllAsRead);

// DELETE /api/v1/notifications/:id
router.delete('/:id', deleteNotification);

export default router;
