// =============================================================================
// Tuition Types — Domain Constants
// G29 — Tuition Invoice Management Foundation
// =============================================================================

/**
 * Invoice statuses.
 */
export const INVOICE_STATUS = Object.freeze({
  DRAFT: 'draft',
  ISSUED: 'issued',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
});

/** Array of all invoice statuses. */
export const ALL_INVOICE_STATUSES = Object.values(INVOICE_STATUS);

/**
 * Payment statuses.
 */
export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

/**
 * Payment methods.
 */
export const PAYMENT_METHODS = Object.freeze({
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  CARD: 'card',
  OTHER: 'other',
});

/** Array of all payment methods. */
export const ALL_PAYMENT_METHODS = Object.values(PAYMENT_METHODS);

/**
 * Human-readable labels for invoice status.
 */
export const STATUS_LABELS = Object.freeze({
  [INVOICE_STATUS.DRAFT]: 'Bản nháp',
  [INVOICE_STATUS.ISSUED]: 'Đã phát hành',
  [INVOICE_STATUS.PARTIAL]: 'Thanh toán một phần',
  [INVOICE_STATUS.PAID]: 'Đã thanh toán',
  [INVOICE_STATUS.OVERDUE]: 'Quá hạn',
  [INVOICE_STATUS.CANCELLED]: 'Đã hủy',
});

/**
 * Status display colors for UI.
 */
export const STATUS_COLORS = Object.freeze({
  [INVOICE_STATUS.DRAFT]: '#9CA3AF',
  [INVOICE_STATUS.ISSUED]: '#3B82F6',
  [INVOICE_STATUS.PARTIAL]: '#F59E0B',
  [INVOICE_STATUS.PAID]: '#10B981',
  [INVOICE_STATUS.OVERDUE]: '#EF4444',
  [INVOICE_STATUS.CANCELLED]: '#6B7280',
});

/**
 * Payment method labels.
 */
export const PAYMENT_METHOD_LABELS = Object.freeze({
  [PAYMENT_METHODS.CASH]: 'Tiền mặt',
  [PAYMENT_METHODS.BANK_TRANSFER]: 'Chuyển khoản',
  [PAYMENT_METHODS.CARD]: 'Thẻ',
  [PAYMENT_METHODS.OTHER]: 'Khác',
});

/**
 * Valid invoice status transitions.
 */
export const STATUS_TRANSITIONS = Object.freeze({
  [INVOICE_STATUS.DRAFT]: [INVOICE_STATUS.ISSUED],
  [INVOICE_STATUS.ISSUED]: [INVOICE_STATUS.PARTIAL, INVOICE_STATUS.PAID, INVOICE_STATUS.OVERDUE, INVOICE_STATUS.CANCELLED],
  [INVOICE_STATUS.PARTIAL]: [INVOICE_STATUS.PAID, INVOICE_STATUS.OVERDUE, INVOICE_STATUS.CANCELLED],
  [INVOICE_STATUS.PAID]: [],
  [INVOICE_STATUS.OVERDUE]: [INVOICE_STATUS.PAID, INVOICE_STATUS.CANCELLED],
  [INVOICE_STATUS.CANCELLED]: [],
});
