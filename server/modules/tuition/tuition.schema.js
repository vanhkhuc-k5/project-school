// =============================================================================
// Tuition Schema — Zod Validation
// G29 — Tuition Invoice Management Foundation
// =============================================================================
import { z } from 'zod';
import { ALL_INVOICE_STATUSES, ALL_PAYMENT_METHODS, INVOICE_STATUS } from './tuition.types.js';

// ── Query params ────────────────────────────────────────────────────────────

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ALL_INVOICE_STATUSES).optional(),
  studentId: z.string().optional(),
});

export const getInvoiceParamsSchema = z.object({
  id: z.string().min(1),
});

// ── Line item schema ──────────────────────────────────────────────────────

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Mô tả là bắt buộc').max(255),
  quantity: z.number().positive('Số lượng phải lớn hơn 0').default(1),
  unitPrice: z.number().positive('Đơn giá phải lớn hơn 0'),
});

// ── Request body ────────────────────────────────────────────────────────────

export const createInvoiceBodySchema = z.object({
  studentId: z.string().min(1, 'studentId là bắt buộc'),
  academicYearId: z.string().optional(),
  semesterId: z.string().optional(),
  billingPeriod: z.string().max(100).optional(),
  dueDate: z.string().min(1, 'Ngày đến hạn là bắt buộc'),
  discount: z.number().min(0).default(0),
  lineItems: z.array(lineItemSchema).min(1, 'Phải có ít nhất 1 khoản mục'),
  notes: z.string().max(500).optional(),
});

export const updateInvoiceBodySchema = z.object({
  dueDate: z.string().optional(),
  discount: z.number().min(0).optional(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
  notes: z.string().max(500).optional(),
});

export const recordPaymentBodySchema = z.object({
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  paymentMethod: z.enum(ALL_PAYMENT_METHODS, {
    errorMap: () => ({ message: 'Phương thức thanh toán không hợp lệ' }),
  }),
  transactionReference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const issueInvoiceBodySchema = z.object({
  // Invoice is issued from draft
});

// ── Validation helpers ────────────────────────────────────────────────────

/**
 * Validate query params for list endpoint.
 */
export function validateListQuery(query) {
  return listInvoicesQuerySchema.safeParse(query);
}

/**
 * Validate params for single get endpoint.
 */
export function validateGetParams(params) {
  return getInvoiceParamsSchema.safeParse(params);
}

/**
 * Validate body for create invoice endpoint.
 */
export function validateCreateBody(body) {
  return createInvoiceBodySchema.safeParse(body);
}

/**
 * Validate body for update invoice endpoint.
 */
export function validateUpdateBody(body) {
  return updateInvoiceBodySchema.safeParse(body);
}

/**
 * Validate body for record payment endpoint.
 */
export function validatePaymentBody(body) {
  return recordPaymentBodySchema.safeParse(body);
}

/**
 * Server-side calculation of line item amount.
 * Never trust frontend-computed totals.
 */
export function calculateLineItemAmount(quantity, unitPrice) {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * Server-side calculation of invoice total from line items.
 * Returns { subtotal, discount, total }
 */
export function calculateInvoiceTotals(lineItems, discount = 0) {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + calculateLineItemAmount(item.quantity, item.unitPrice);
  }, 0);
  
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total,
  };
}
