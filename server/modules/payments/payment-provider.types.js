// =============================================================================
// Payment Provider Types — Domain Constants & Interfaces
// G30 — Payment Gateway Integration
// =============================================================================

/**
 * Payment provider types.
 */
export const PROVIDER_TYPES = Object.freeze({
  MOCK: 'mock',
  VIETQR: 'vietqr',
  NAPAS: 'napas',
  STRIPE: 'stripe',
});

/**
 * Payment status from provider perspective.
 */
export const PROVIDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
});

/**
 * Payment method types.
 */
export const PAYMENT_METHODS = Object.freeze({
  QR_CODE: 'qr_code',
  BANK_TRANSFER: 'bank_transfer',
  CARD: 'card',
  WALLET: 'wallet',
});

/**
 * Payment intent status.
 */
export const INTENT_STATUS = Object.freeze({
  CREATED: 'created',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});

/**
 * Webhook event types.
 */
export const WEBHOOK_EVENTS = Object.freeze({
  PAYMENT_PENDING: 'payment.pending',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_CANCELLED: 'payment.cancelled',
});

/**
 * Result codes for payment operations.
 */
export const RESULT_CODES = Object.freeze({
  SUCCESS: 'SUCCESS',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  DUPLICATE: 'DUPLICATE',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  INVALID_REQUEST: 'INVALID_REQUEST',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
});

/**
 * Payment provider configuration schema.
 */
export const providerConfigSchema = {
  type: 'object',
  required: ['provider', 'environment'],
  properties: {
    provider: { type: 'string', enum: Object.values(PROVIDER_TYPES) },
    environment: { type: 'string', enum: ['sandbox', 'production'] },
    apiKey: { type: 'string' },
    apiSecret: { type: 'string' },
    merchantId: { type: 'string' },
    webhookSecret: { type: 'string' },
    timeout: { type: 'number', default: 30000 },
    retryAttempts: { type: 'number', default: 3 },
  },
};

/**
 * Create payment intent request.
 */
export function createPaymentIntentRequest({
  invoiceId,
  amount,
  currency = 'VND',
  description,
  customerInfo,
  returnUrl,
  webhookUrl,
}) {
  return {
    invoiceId,
    amount: Math.round(amount * 100) / 100, // Ensure decimal precision
    currency,
    description: description || `Thanh toan hoa don ${invoiceId}`,
    customerInfo,
    returnUrl,
    webhookUrl,
    merchantOrderId: `INV-${invoiceId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create payment intent response.
 */
export function createPaymentIntentResponse({
  provider,
  providerTransactionId,
  qrCodeUrl,
  checkoutUrl,
  paymentUrl,
  amount,
  currency,
  status,
  expiresAt,
  metadata,
}) {
  return {
    provider,
    providerTransactionId,
    qrCodeUrl,
    checkoutUrl,
    paymentUrl,
    amount,
    currency: currency || 'VND',
    status,
    expiresAt,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Webhook event structure.
 */
export function createWebhookEvent({
  eventType,
  provider,
  providerTransactionId,
  merchantOrderId,
  amount,
  currency,
  status,
  signature,
  rawPayload,
  receivedAt,
}) {
  return {
    eventType,
    provider,
    providerTransactionId,
    merchantOrderId,
    amount,
    currency: currency || 'VND',
    status,
    signature,
    rawPayload,
    receivedAt: receivedAt || new Date().toISOString(),
  };
}
