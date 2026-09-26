// =============================================================================
// Notifications Controller — HTTP Request Handlers for G26
// =============================================================================
import * as service from './notifications.service.js';
import {
  validateListQuery,
  validateCreateBody,
} from './notifications.schema.js';
import { NOTIFICATION_LABELS, NOTIFICATION_ICONS } from './notifications.types.js';

function getUserId(req) {
  return req.user?.id;
}

/**
 * GET /api/v1/notifications
 * List notifications for the authenticated user (paginated).
 */
export async function listNotifications(req, res, next) {
  try {
    const parsed = validateListQuery(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, type } = parsed.data;
    const result = await service.getNotifications({
      userId: getUserId(req),
      type,
      page,
      limit,
    });

    // Enrich with UI metadata
    const enriched = result.notifications.map((n) => ({
      ...n,
      label: NOTIFICATION_LABELS[n.type] || n.type,
      icon: NOTIFICATION_ICONS[n.type] || 'Bell',
    }));

    res.json({
      success: true,
      notifications: enriched,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/notifications/unread-count
 * Get unread notification count for the authenticated user.
 */
export async function getUnreadCount(req, res, next) {
  try {
    const count = await service.getUnreadCount(getUserId(req));
    res.json({ success: true, unreadCount: count });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read.
 */
export async function markAsRead(req, res, next) {
  try {
    await service.markAsRead({
      notificationId: req.params.id,
      userId: getUserId(req),
    });
    res.json({ success: true, message: 'Đã đánh dấu đã đọc.' });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all unread notifications as read for the authenticated user.
 */
export async function markAllAsRead(req, res, next) {
  try {
    const result = await service.markAllAsRead(getUserId(req));
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/notifications/:id
 * Delete a notification (owner only).
 */
export async function deleteNotification(req, res, next) {
  try {
    await service.deleteNotification({
      notificationId: req.params.id,
      userId: getUserId(req),
    });
    res.json({ success: true, message: 'Đã xóa thông báo.' });
  } catch (err) {
    next(err);
  }
}
