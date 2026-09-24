// =============================================================================
// Notifications Schema — Zod Validation for G26 Notification Center
// =============================================================================
import { z } from 'zod';
import { ALL_NOTIFICATION_TYPES } from './notifications.types.js';

// ── Query params ────────────────────────────────────────────────────────────

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(ALL_NOTIFICATION_TYPES).optional(),
});

// ── Request body ────────────────────────────────────────────────────────────

export const createNotificationBodySchema = z.object({
  userId: z.string().min(1, 'userId là bắt buộc'),
  type: z.enum(ALL_NOTIFICATION_TYPES, {
    errorMap: () => ({ message: 'Loại thông báo không hợp lệ' }),
  }),
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(200),
  message: z.string().max(1000).optional(),
  data: z.record(z.unknown()).optional().default({}),
});

export const markAsReadParamsSchema = z.object({
  id: z.string().min(1),
});

// ── Validation helpers ────────────────────────────────────────────────────

/**
 * Validate query params for list endpoint.
 */
export function validateListQuery(query) {
  return listNotificationsQuerySchema.safeParse(query);
}

/**
 * Validate body for internal notification creation (admin/system use).
 */
export function validateCreateBody(body) {
  return createNotificationBodySchema.safeParse(body);
}
