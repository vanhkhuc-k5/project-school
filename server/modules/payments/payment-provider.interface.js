// =============================================================================
// Payment Provider Interface — Abstract Base Class
// G30 — Payment Gateway Integration
// All provider implementations must extend this class
// =============================================================================
import { PROVIDER_STATUS, INTENT_STATUS, RESULT_CODES } from './payment-provider.types.js';

/**
 * Abstract Payment Provider Interface
 * All payment provider implementations must extend this class
 */
export class PaymentProvider {
  constructor(config) {
    this.config = config;
    this.provider = config.provider;
    this.environment = config.environment;
  }

  /**
   * Create a payment intent/request
   * @param {Object} params - Payment parameters
   * @returns {Promise<Object>} Payment intent response
   */
  async createPaymentIntent(params) {
    throw new Error('createPaymentIntent must be implemented by provider');
  }

  /**
   * Query payment status from provider
   * @param {string} providerTransactionId - Provider's transaction ID
   * @returns {Promise<Object>} Payment status
   */
  async queryPaymentStatus(providerTransactionId) {
    throw new Error('queryPaymentStatus must be implemented by provider');
  }

  /**
   * Cancel a pending payment
   * @param {string} providerTransactionId - Provider's transaction ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelPayment(providerTransactionId) {
    throw new Error('cancelPayment must be implemented by provider');
  }

  /**
   * Process refund
   * @param {string} providerTransactionId - Provider's transaction ID
   * @param {number} amount - Amount to refund (optional, full refund if not specified)
   * @returns {Promise<Object>} Refund result
   */
  async refundPayment(providerTransactionId, amount = null) {
    throw new Error('refundPayment must be implemented by provider');
  }

  /**
   * Verify webhook signature
   * @param {string|Object} payload - Raw webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(payload, signature) {
    throw new Error('verifyWebhookSignature must be implemented by provider');
  }

  /**
   * Parse webhook event
   * @param {Object} payload - Webhook payload
   * @returns {Object} Normalized event object
   */
  parseWebhookEvent(payload) {
    throw new Error('parseWebhookEvent must be implemented by provider');
  }

  /**
   * Get provider-specific QR code URL
   * @param {string} qrData - QR code data
   * @returns {string|null} QR code URL/image
   */
  async getQrCodeUrl(qrData) {
    return null; // Default implementation returns null
  }

  /**
   * Health check for the provider
   * @returns {Promise<boolean>} True if provider is healthy
   */
  async healthCheck() {
    // Default implementation - override in subclasses
    // Note: This method can be overridden by concrete providers
    return true;
  }

  /**
   * Normalize provider status to internal status
   * @param {string} providerStatus - Provider-specific status
   * @returns {string} Normalized status
   */
  normalizeStatus(providerStatus) {
    const statusMap = {
      // VietQR/NAPAS
      '00': PROVIDER_STATUS.SUCCESS,
      '01': PROVIDER_STATUS.PROCESSING,
      '02': PROVIDER_STATUS.FAILED,
      'pending': PROVIDER_STATUS.PENDING,
      'success': PROVIDER_STATUS.SUCCESS,
      'failed': PROVIDER_STATUS.FAILED,
      'cancelled': PROVIDER_STATUS.CANCELLED,
      'refunded': PROVIDER_STATUS.REFUNDED,
      // Stripe
      'requires_payment_method': INTENT_STATUS.CREATED,
      'requires_confirmation': INTENT_STATUS.CREATED,
      'processing': PROVIDER_STATUS.PROCESSING,
      'succeeded': PROVIDER_STATUS.SUCCESS,
      'canceled': INTENT_STATUS.CANCELLED,
    };
    return statusMap[providerStatus] || PROVIDER_STATUS.PENDING;
  }

  /**
   * Generate idempotency key
   * @param {string} prefix - Key prefix
   * @param {string} identifier - Unique identifier
   * @returns {string} Idempotency key
   */
  generateIdempotencyKey(prefix, identifier) {
    return `${prefix}_${identifier}_${Date.now()}`;
  }
}

/**
 * Provider factory - creates provider instances based on config
 */
export class PaymentProviderFactory {
  static providers = new Map();

  /**
   * Register a provider implementation
   * @param {string} providerType - Provider type identifier
   * @param {Class} ProviderClass - Provider class
   */
  static register(providerType, ProviderClass) {
    this.providers.set(providerType, ProviderClass);
  }

  /**
   * Create a provider instance
   * @param {Object} config - Provider configuration
   * @returns {PaymentProvider} Provider instance
   */
  static create(config) {
    const { provider } = config;
    const ProviderClass = this.providers.get(provider);
    
    if (!ProviderClass) {
      throw new Error(`Unknown payment provider: ${provider}`);
    }
    
    return new ProviderClass(config);
  }

  /**
   * Get all registered provider types
   * @returns {string[]} Array of provider type identifiers
   */
  static getRegisteredProviders() {
    return Array.from(this.providers.keys());
  }
}
