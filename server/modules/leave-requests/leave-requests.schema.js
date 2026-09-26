// =============================================================================
// Leave Requests Schema — Zod Validation
// G28 — Student Leave Requests Lifecycle
// =============================================================================
import { z } from 'zod';
import { ALL_LEAVE_STATUSES, ALL_REASON_TYPES, LEAVE_STATUS } from './leave-requests.types.js';

// ── Query params ────────────────────────────────────────────────────────────

export const listLeaveRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ALL_LEAVE_STATUSES).optional(),
  studentId: z.string().optional(),
  startDateFrom: z.string().optional(),
  startDateTo: z.string().optional(),
});

export const getLeaveRequestParamsSchema = z.object({
  id: z.string().min(1),
});

// ── Request body ────────────────────────────────────────────────────────────

export const createLeaveRequestBodySchema = z.object({
  studentId: z.string().min(1, 'studentId là bắt buộc'),
  startDate: z.string()
    .min(1, 'Ngày bắt đầu là bắt buộc')
    .refine((val) => !isNaN(Date.parse(val)), 'Ngày bắt đầu không hợp lệ'),
  endDate: z.string()
    .min(1, 'Ngày kết thúc là bắt buộc')
    .refine((val) => !isNaN(Date.parse(val)), 'Ngày kết thúc không hợp lệ'),
  reasonType: z.enum(ALL_REASON_TYPES).optional().default('family_event'),
  reasonDetail: z.string().max(1000).optional(),
  emergencyPhone: z.string().max(20).optional(),
});

export const reviewLeaveRequestBodySchema = z.object({
  status: z.enum([LEAVE_STATUS.APPROVED, LEAVE_STATUS.REJECTED], {
    errorMap: () => ({ message: 'Chỉ có thể duyệt hoặc từ chối' }),
  }),
  reviewNote: z.string().max(500).optional(),
});

export const cancelLeaveRequestBodySchema = z.object({
  cancellationReason: z.string().max(500).optional(),
});

// ── Validation helpers ────────────────────────────────────────────────────

/**
 * Validate query params for list endpoint.
 */
export function validateListQuery(query) {
  return listLeaveRequestsQuerySchema.safeParse(query);
}

/**
 * Validate params for single get endpoint.
 */
export function validateGetParams(params) {
  return getLeaveRequestParamsSchema.safeParse(params);
}

/**
 * Validate body for create endpoint.
 */
export function validateCreateBody(body) {
  return createLeaveRequestBodySchema.safeParse(body);
}

/**
 * Validate body for review endpoint.
 */
export function validateReviewBody(body) {
  return reviewLeaveRequestBodySchema.safeParse(body);
}

/**
 * Validate body for cancel endpoint.
 */
export function validateCancelBody(body) {
  return cancelLeaveRequestBodySchema.safeParse(body);
}
