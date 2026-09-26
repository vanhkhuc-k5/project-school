// =============================================================================
// Messages Schema — Zod Validation
// G27 — Safe Parent/Teacher Messaging
// =============================================================================
import { z } from 'zod';
import { ALL_MESSAGE_ROLES, MESSAGE_LIMITS } from './messages.types.js';

// ── Query params ────────────────────────────────────────────────────────────

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['active', 'archived']).optional().default('active'),
});

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ── Request body ────────────────────────────────────────────────────────────

export const createConversationBodySchema = z.object({
  teacherId: z.string().min(1, 'teacherId là bắt buộc'),
  studentId: z.string().min(1, 'studentId là bắt buộc'),
  subject: z.string().max(MESSAGE_LIMITS.SUBJECT_MAX).optional(),
  content: z.string()
    .min(1, 'Nội dung tin nhắn không được để trống')
    .max(MESSAGE_LIMITS.CONTENT_MAX, `Nội dung không được vượt quá ${MESSAGE_LIMITS.CONTENT_MAX} ký tự`),
});

export const sendMessageBodySchema = z.object({
  content: z.string()
    .min(1, 'Nội dung tin nhắn không được để trống')
    .max(MESSAGE_LIMITS.CONTENT_MAX, `Nội dung không được vượt quá ${MESSAGE_LIMITS.CONTENT_MAX} ký tự`),
  subject: z.string().max(MESSAGE_LIMITS.SUBJECT_MAX).optional(),
});

// ── Validation helpers ────────────────────────────────────────────────────

/**
 * Validate query params for list conversations endpoint.
 */
export function validateListConversationsQuery(query) {
  return listConversationsQuerySchema.safeParse(query);
}

/**
 * Validate query params for list messages endpoint.
 */
export function validateListMessagesQuery(query) {
  return listMessagesQuerySchema.safeParse(query);
}

/**
 * Validate body for create conversation + first message.
 */
export function validateCreateConversationBody(body) {
  return createConversationBodySchema.safeParse(body);
}

/**
 * Validate body for sending a reply.
 */
export function validateSendMessageBody(body) {
  return sendMessageBodySchema.safeParse(body);
}
