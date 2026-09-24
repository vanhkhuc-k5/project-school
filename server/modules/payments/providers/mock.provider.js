// =============================================================================
// Mock Payment Provider — For Testing Only
// G30 — Payment Gateway Integration
// This provider simulates payment processing for testing purposes
// NOT for production use!
// =============================================================================
import crypto from 'crypto';
import { PaymentProvider } from '../payment-provider.interface.js';
import { PROVIDER_STATUS, INTENT_STATUS, RESULT_CODES, WEBHOOK_EVENTS } from '../payment-provider.types.js';

/**
 * Mock Payment Provider for Testing
 * Simulates payment processing with configurable delays and outcomes
 */
export class MockPaymentProvider extends PaymentProvider {
  constructor(config = {}) {
    super({
      provider: 'mock',
      environment: config.environment || 'sandbox',
      ...config,
    });

    // In-memory storage for mock transactions
    this.transactions = new Map();
    
    // Configure mock behavior
    this.config = {
      simulateDelay: config.simulateDelay !== false, // Default true
      delayMs: config.delayMs || 500,
      successRate: config.successRate || 1.0, // 100% success by default
      ...config,
    };

    // Webhook callback URL
    this.webhookUrl = config.webhookUrl;
    
    // Simulated clock for testing
    this.clock = Date.now();
  }

  /**
   * Advance mock clock
   * @param {number} ms - Milliseconds to advance
   */
  advanceTime(ms) {
    this.clock += ms;
  }

  /**
   * Get current mock time
   */
  getMockTime() {
    return this.clock;
  }

  /**
   * Simulate async delay
   */
  async _simulateDelay() {
    if (this.config.simulateDelay) {
      await new Promise(resolve => setTimeout(resolve, this.config.delayMs));
    }
  }

  /**
   * Determine if transaction should succeed
   */
  _shouldSucceed() {
    return Math.random() < this.config.successRate;
  }

  /**
   * Create a mock payment intent
   */
  async createPaymentIntent(params) {
    await this._simulateDelay();

    const {
      invoiceId,
      amount,
      currency = 'VND',
      description,
      merchantOrderId,
    } = params;

    // Generate mock transaction ID
    const providerTransactionId = `mock_txn_${crypto.randomBytes(8).toString('hex')}`;
    
    // Generate mock QR code data
    const qrData = this._generateMockQrData(providerTransactionId, amount);
    
    // Mock expires in 30 minutes
    const expiresAt = new Date(this.clock + 30 * 60 * 1000).toISOString();

    // Store transaction
    const transaction = {
      providerTransactionId,
      merchantOrderId: merchantOrderId || `INV-${invoiceId}-${Date.now()}`,
      invoiceId,
      amount,
      currency,
      description,
      status: INTENT_STATUS.PENDING,
      qrData,
      qrCodeUrl: `data:image/qr;base64,${Buffer.from(qrData).toString('base64')}`,
      createdAt: new Date(this.clock).toISOString(),
      expiresAt,
      webhookUrl: this.webhookUrl,
    };

    this.transactions.set(providerTransactionId, transaction);
    this.transactions.set(merchantOrderId, transaction);

    return {
      resultCode: RESULT_CODES.SUCCESS,
      provider: 'mock',
      providerTransactionId,
      merchantOrderId: transaction.merchantOrderId,
      amount,
      currency,
      status: INTENT_STATUS.PENDING,
      qrCodeUrl: transaction.qrCodeUrl,
      qrData,
      checkoutUrl: `mock://checkout/${providerTransactionId}`,
      paymentUrl: `mock://pay/${providerTransactionId}`,
      expiresAt,
      metadata: { invoiceId },
    };
  }

  /**
   * Generate mock QR code data
   */
  _generateMockQrData(transactionId, amount) {
    return JSON.stringify({
      bank: 'MockBank',
      account: '123456789',
      amount,
      currency: 'VND',
      transactionId,
      merchantRef: `MOCK-${transactionId}`,
      timestamp: this.clock,
    });
  }

  /**
   * Query payment status from mock provider
   */
  async queryPaymentStatus(providerTransactionId) {
    await this._simulateDelay();

    const transaction = this.transactions.get(providerTransactionId);
    
    if (!transaction) {
      return {
        resultCode: RESULT_CODES.FAILED,
        error: 'Transaction not found',
      };
    }

    return {
      resultCode: RESULT_CODES.SUCCESS,
      provider: 'mock',
      providerTransactionId,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      paidAt: transaction.paidAt || null,
      metadata: transaction,
    };
  }

  /**
   * Simulate successful payment (for testing)
   * This method should ONLY be called from test code
   */
  async simulatePaymentSuccess(providerTransactionId, paidAmount = null) {
    const transaction = this.transactions.get(providerTransactionId);
    
    if (!transaction) {
      throw new Error(`Transaction not found: ${providerTransactionId}`);
    }

    transaction.status = PROVIDER_STATUS.SUCCESS;
    transaction.paidAt = new Date(this.clock).toISOString();
    transaction.paidAmount = paidAmount || transaction.amount;

    return {
      resultCode: RESULT_CODES.SUCCESS,
      provider: 'mock',
      providerTransactionId,
      status: PROVIDER_STATUS.SUCCESS,
      paidAmount: transaction.paidAmount,
      paidAt: transaction.paidAt,
      eventType: WEBHOOK_EVENTS.PAYMENT_SUCCESS,
    };
  }

  /**
   * Simulate failed payment (for testing)
   */
  async simulatePaymentFailed(providerTransactionId, reason = 'Payment declined') {
    const transaction = this.transactions.get(providerTransactionId);
    
    if (!transaction) {
      throw new Error(`Transaction not found: ${providerTransactionId}`);
    }

    transaction.status = PROVIDER_STATUS.FAILED;
    transaction.failedAt = new Date(this.clock).toISOString();
    transaction.failureReason = reason;

    return {
      resultCode: RESULT_CODES.SUCCESS,
      provider: 'mock',
      providerTransactionId,
      status: PROVIDER_STATUS.FAILED,
      reason,
      eventType: WEBHOOK_EVENTS.PAYMENT_FAILED,
    };
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(providerTransactionId) {
    await this._simulateDelay();

    const transaction = this.transactions.get(providerTransactionId);
    
    if (!transaction) {
      return {
        resultCode: RESULT_CODES.FAILED,
        error: 'Transaction not found',
      };
    }

    if (transaction.status === PROVIDER_STATUS.SUCCESS) {
      return {
        resultCode: RESULT_CODES.FAILED,
        error: 'Cannot cancel completed payment',
      };
    }

    transaction.status = INTENT_STATUS.CANCELLED;
    transaction.cancelledAt = new Date(this.clock).toISOString();

    return {
      resultCode: RESULT_CODES.SUCCESS,
      provider: 'mock',
      providerTransactionId,
      status: INTENT_STATUS.CANCELLED,
      cancelledAt: transaction.cancelledAt,
    };
  }

  /**
   * Refund a payment
   */
  async refundPayment(providerTransactionId, amount = null) {
    await this._simulateDelay();

    const transaction = this.transactions.get(providerTransactionId);
    
    if (!transaction) {
      return {
        resultCode: RESULT_CODES.FAILED,
        error: 'Transaction not found',
      };
    }

    if (transaction.status !== PROVIDER_STATUS.SUCCESS) {
      return {
        resultCode: RESULT_CODES.FAILED,
        error: 'Can only refund completed payments',
      };
    }

    const refundAmount = amount || transaction.amount;
    
    // Generate refund transaction ID
    const refundTransactionId = `mock_refund_${crypto.randomBytes(8).toString('hex')}`;
    
    transaction.refundedAmount = (transaction.refundedAmount || 0) + refundAmount;
    transaction.status = PROVIDER_STATUS.REFUNDED;

    return {
      resultCode: RESULT_CODES.SUCCESS,
      provider: 'mock',
      providerTransactionId,
      refundTransactionId,
      refundAmount,
      status: PROVIDER_STATUS.REFUNDED,
      refundedAt: new Date(this.clock).toISOString(),
    };
  }

  /**
   * Verify webhook signature for mock provider
   * In mock mode, accepts 'mock_signature' or computes HMAC
   */
  verifyWebhookSignature(payload, signature) {
    // Mock accepts specific test signature
    if (signature === 'mock_signature' || signature === 'test_webhook_signature') {
      return true;
    }

    // Also accept computed HMAC if webhook secret is configured
    if (this.config.webhookSecret) {
      const computed = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computed)
      );
    }

    return false;
  }

  /**
   * Parse webhook event from mock payload
   */
  parseWebhookEvent(payload) {
    return {
      eventType: payload.eventType || WEBHOOK_EVENTS.PAYMENT_SUCCESS,
      provider: 'mock',
      providerTransactionId: payload.providerTransactionId,
      merchantOrderId: payload.merchantOrderId,
      amount: payload.amount,
      currency: payload.currency || 'VND',
      status: payload.status || PROVIDER_STATUS.SUCCESS,
      signature: payload.signature,
      rawPayload: payload,
      receivedAt: new Date(this.clock).toISOString(),
    };
  }

  /**
   * Generate webhook event (for testing)
   */
  generateWebhookEvent(providerTransactionId, eventType = WEBHOOK_EVENTS.PAYMENT_SUCCESS) {
    const transaction = this.transactions.get(providerTransactionId);
    
    if (!transaction) {
      throw new Error(`Transaction not found: ${providerTransactionId}`);
    }

    const payload = {
      eventType,
      provider: 'mock',
      providerTransactionId,
      merchantOrderId: transaction.merchantOrderId,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      timestamp: this.clock,
    };

    // Generate mock signature
    const signature = this.config.webhookSecret
      ? crypto.createHmac('sha256', this.config.webhookSecret)
          .update(JSON.stringify(payload))
          .digest('hex')
      : 'mock_signature';

    return {
      ...payload,
      signature,
    };
  }

  /**
   * Get transaction details
   */
  getTransaction(providerTransactionId) {
    return this.transactions.get(providerTransactionId) || null;
  }

  /**
   * Clear all transactions (for testing cleanup)
   */
  clearTransactions() {
    this.transactions.clear();
  }

  /**
   * Health check
   */
  async healthCheck() {
    return true; // Mock is always healthy
  }
}

// Register the mock provider
import { PaymentProviderFactory } from '../payment-provider.interface.js';
PaymentProviderFactory.register('mock', MockPaymentProvider);
