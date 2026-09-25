// =============================================================================
// Payment Gateway Service — Orchestrates Payment Processing
// G30 — Payment Gateway Integration
// Implements idempotency, webhook verification, and audit logging
// =============================================================================
import crypto from 'crypto';
import { AppError } from '../../shared/errors/index.js';
import { PaymentProviderFactory } from './payment-provider.interface.js';
import { RESULT_CODES, PROVIDER_STATUS, WEBHOOK_EVENTS, INTENT_STATUS } from './payment-provider.types.js';
import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';
import { config } from '../../config/env.js';

// Load mock provider
import './providers/mock.provider.js';

/**
 * Payment Gateway Service
 * Manages payment processing with idempotency and audit logging
 */
export class PaymentGatewayService {
  constructor(providerConfig) {
    this.provider = PaymentProviderFactory.create(providerConfig);
    this.providerType = providerConfig.provider;
  }

  /**
   * Create a payment intent with idempotency
   * @param {Object} params - Payment parameters
   * @returns {Promise<Object>} Payment intent response
   */
  async createPaymentIntent({ invoiceId, amount, description, idempotencyKey, userId, metadata }) {
    // Check idempotency - return existing result if key was used
    if (idempotencyKey) {
      const existing = await this._getIdempotentResult(idempotencyKey);
      if (existing) {
        return {
          ...existing,
          isIdempotentReplay: true,
        };
      }
    }

    // Validate amount
    if (!amount || amount <= 0) {
      throw AppError.badRequest('Số tiền thanh toán không hợp lệ');
    }

    // Create idempotency record first
    const key = idempotencyKey || this._generateIdempotencyKey('intent', invoiceId);
    
    try {
      // Create payment intent via provider
      const result = await this.provider.createPaymentIntent({
        invoiceId,
        amount,
        description,
        merchantOrderId: `INV-${invoiceId}-${Date.now()}`,
        metadata: {
          invoiceId,
          userId,
          ...metadata,
        },
      });

      // Store idempotency result
      await this._storeIdempotentResult(key, {
        providerTransactionId: result.providerTransactionId,
        status: result.status,
        amount: result.amount,
        qrCodeUrl: result.qrCodeUrl,
        checkoutUrl: result.checkoutUrl,
        expiresAt: result.expiresAt,
      });

      // Log audit event
      await this._logPaymentEvent({
        eventType: 'payment_intent_created',
        invoiceId,
        providerTransactionId: result.providerTransactionId,
        amount,
        userId,
        metadata: { idempotencyKey: key },
      });

      return {
        ...result,
        idempotencyKey: key,
      };
    } catch (error) {
      // Store failed attempt for idempotency
      await this._storeIdempotentResult(key, {
        error: error.message,
        failedAt: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Handle webhook callback from payment provider
   * Implements signature verification and idempotent processing
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {Promise<Object>} Processed event result
   */
  async handleWebhook(payload, signature) {
    // 1. Verify signature first
    const isValidSignature = this.provider.verifyWebhookSignature(payload, signature);
    if (!isValidSignature) {
      await this._logPaymentEvent({
        eventType: 'webhook_invalid_signature',
        payload: JSON.stringify(payload).substring(0, 200),
      });
      throw AppError.forbidden('Chữ ký webhook không hợp lệ');
    }

    // 2. Parse webhook event
    const event = this.provider.parseWebhookEvent(payload);
    
    // 3. Check for duplicate webhook (idempotency)
    const webhookId = this._generateWebhookId(event);
    const existingWebhook = await this._getProcessedWebhook(webhookId);
    
    if (existingWebhook) {
      // Duplicate webhook - return stored result
      return {
        ...existingWebhook,
        isDuplicate: true,
        storedResult: existingWebhook.processedResult,
      };
    }

    // 4. Store webhook as processing (prevents race conditions)
    await this._storeWebhook(webhookId, event);

    try {
      // 5. Process the event
      const result = await this._processWebhookEvent(event);

      // 6. Update webhook with result
      await this._updateWebhookResult(webhookId, result);

      // 7. Log audit event
      await this._logPaymentEvent({
        eventType: `webhook_${event.eventType}`,
        providerTransactionId: event.providerTransactionId,
        merchantOrderId: event.merchantOrderId,
        amount: event.amount,
        status: event.status,
        result,
      });

      return {
        event,
        result,
        processed: true,
      };
    } catch (error) {
      // Mark webhook as failed
      await this._updateWebhookResult(webhookId, { error: error.message }, true);
      throw error;
    }
  }

  /**
   * Process webhook event based on type
   */
  async _processWebhookEvent(event) {
    switch (event.eventType) {
      case WEBHOOK_EVENTS.PAYMENT_SUCCESS:
        return this._handlePaymentSuccess(event);
      
      case WEBHOOK_EVENTS.PAYMENT_FAILED:
        return this._handlePaymentFailed(event);
      
      case WEBHOOK_EVENTS.PAYMENT_PENDING:
        return this._handlePaymentPending(event);
      
      case WEBHOOK_EVENTS.PAYMENT_REFUNDED:
        return this._handlePaymentRefunded(event);
      
      case WEBHOOK_EVENTS.PAYMENT_CANCELLED:
        return this._handlePaymentCancelled(event);
      
      default:
        return { handled: false, reason: 'Unknown event type' };
    }
  }

  /**
   * Handle successful payment
   * IMPORTANT: This updates invoice status ONLY after server-verified webhook
   */
  async _handlePaymentSuccess(event) {
    const { providerTransactionId, amount, merchantOrderId } = event;

    // Find and update the payment record
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        UPDATE tuition_payments
        SET status = 'completed',
            paid_at = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_reference = $2
        AND status = 'pending'
        RETURNING id, invoice_id
      `, [event.receivedAt, providerTransactionId]);

      if (res.rows.length > 0) {
        const { invoice_id } = res.rows[0];
        
        // Recalculate invoice payments
        await this._recalculateInvoicePayments(invoice_id);
        
        // Log successful payment
        await this._logPaymentEvent({
          eventType: 'payment_completed',
          invoiceId: invoice_id,
          providerTransactionId,
          amount,
        });

        return {
          handled: true,
          invoiceUpdated: true,
          invoiceId: invoice_id,
        };
      }
    } else {
      const stmt = db.prepare(`
        UPDATE tuition_payments
        SET status = 'completed',
            paid_at = datetime(?),
            updated_at = datetime('now')
        WHERE transaction_reference = ?
        AND status = 'pending'
      `);
      const result = stmt.run(event.receivedAt, providerTransactionId);

      if (result.changes > 0) {
        // Get invoice_id
        const payment = db.prepare(`
          SELECT invoice_id FROM tuition_payments WHERE transaction_reference = ?
        `).get(providerTransactionId);

        if (payment) {
          await this._recalculateInvoicePayments(payment.invoice_id);
          
          await this._logPaymentEvent({
            eventType: 'payment_completed',
            invoiceId: payment.invoice_id,
            providerTransactionId,
            amount,
          });

          return {
            handled: true,
            invoiceUpdated: true,
            invoiceId: payment.invoice_id,
          };
        }
      }
    }

    return {
      handled: true,
      invoiceUpdated: false,
      reason: 'Payment record not found or already processed',
    };
  }

  /**
   * Handle failed payment
   */
  async _handlePaymentFailed(event) {
    const { providerTransactionId } = event;

    // Mark payment as failed
    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE tuition_payments
        SET status = 'failed',
            notes = COALESCE(notes, '') || ' | Failed: ' || $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_reference = $2
        AND status = 'pending'
      `, [event.reason || 'Unknown', providerTransactionId]);
    } else {
      db.prepare(`
        UPDATE tuition_payments
        SET status = 'failed',
            notes = COALESCE(notes, '') || ' | Failed: ' || ?,
            updated_at = datetime('now')
        WHERE transaction_reference = ?
        AND status = 'pending'
      `).run(event.reason || 'Unknown', providerTransactionId);
    }

    return {
      handled: true,
      paymentMarkedFailed: true,
    };
  }

  /**
   * Handle pending payment
   */
  async _handlePaymentPending(event) {
    // Payment is being processed - no action needed
    return {
      handled: true,
      action: 'awaiting_confirmation',
    };
  }

  /**
   * Handle refunded payment
   */
  async _handlePaymentRefunded(event) {
    // Update payment status to refunded
    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE tuition_payments
        SET status = 'refunded',
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_reference = $1
      `, [event.providerTransactionId]);
    } else {
      db.prepare(`
        UPDATE tuition_payments
        SET status = 'refunded',
            updated_at = datetime('now')
        WHERE transaction_reference = ?
      `).run(event.providerTransactionId);
    }

    return {
      handled: true,
      paymentMarkedRefunded: true,
    };
  }

  /**
   * Handle cancelled payment
   */
  async _handlePaymentCancelled(event) {
    // Update payment status
    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE tuition_payments
        SET status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP
        WHERE transaction_reference = $1
        AND status IN ('pending', 'processing')
      `, [event.providerTransactionId]);
    } else {
      db.prepare(`
        UPDATE tuition_payments
        SET status = 'cancelled',
            updated_at = datetime('now')
        WHERE transaction_reference = ?
        AND status IN ('pending', 'processing')
      `).run(event.providerTransactionId);
    }

    return {
      handled: true,
      paymentCancelled: true,
    };
  }

  /**
   * Recalculate invoice payments after webhook processing
   */
  async _recalculateInvoicePayments(invoiceId) {
    if (isPostgresConfigured()) {
      // Get total paid amount
      const totalRes = await pgQuery(`
        SELECT COALESCE(SUM(amount), 0) as total_paid
        FROM tuition_payments
        WHERE invoice_id = $1 AND status = 'completed'
      `, [invoiceId]);

      const totalPaid = parseFloat(totalRes.rows[0]?.total_paid || 0);

      // Get invoice total
      const invRes = await pgQuery(`
        SELECT total FROM tuition_invoices WHERE id = $1
      `, [invoiceId]);

      const invoiceTotal = parseFloat(invRes.rows[0]?.total || 0);

      // Determine new status
      let newStatus = 'issued';
      if (totalPaid >= invoiceTotal) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      }

      // Update invoice
      await pgQuery(`
        UPDATE tuition_invoices
        SET amount_paid = $1,
            status = $2,
            paid_at = CASE WHEN $2 = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [totalPaid, newStatus, invoiceId]);

    } else {
      // SQLite version
      const totalRow = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_paid
        FROM tuition_payments
        WHERE invoice_id = ? AND status = 'completed'
      `).get(invoiceId);

      const totalPaid = parseFloat(totalRow?.total_paid || 0);

      const invRow = db.prepare(`
        SELECT total FROM tuition_invoices WHERE id = ?
      `).get(invoiceId);

      const invoiceTotal = parseFloat(invRow?.total || 0);

      let newStatus = 'issued';
      if (totalPaid >= invoiceTotal) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      }

      db.prepare(`
        UPDATE tuition_invoices
        SET amount_paid = ?,
            status = ?,
            paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(totalPaid, newStatus, newStatus, invoiceId);
    }
  }

  // ── Idempotency Helpers ─────────────────────────────────────────────

  /**
   * Generate idempotency key
   */
  _generateIdempotencyKey(prefix, identifier) {
    return `${prefix}_${identifier}_${Date.now()}`;
  }

  /**
   * Store idempotent result
   */
  async _storeIdempotentResult(key, result) {
    const id = `idem_${key}`;
    const resultJson = JSON.stringify(result);

    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO payment_idempotency (id, key, result, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO NOTHING
      `, [id, key, resultJson]);
    } else {
      try {
        db.prepare(`
          INSERT OR IGNORE INTO payment_idempotency (id, key, result, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `).run(id, key, resultJson);
      } catch (_) {
        // Ignore duplicate key errors
      }
    }
  }

  /**
   * Get idempotent result by key
   */
  async _getIdempotentResult(key) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT result FROM payment_idempotency WHERE key = $1
      `, [key]);
      return res.rows[0] ? JSON.parse(res.rows[0].result) : null;
    } else {
      const row = db.prepare(`
        SELECT result FROM payment_idempotency WHERE key = ?
      `).get(key);
      return row ? JSON.parse(row.result) : null;
    }
  }

  // ── Webhook Processing ─────────────────────────────────────────────

  /**
   * Generate unique webhook ID
   */
  _generateWebhookId(event) {
    const data = `${event.provider}_${event.providerTransactionId}_${event.eventType}_${event.receivedAt}`;
    return `webhook_${crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)}`;
  }

  /**
   * Check if webhook was already processed
   */
  async _getProcessedWebhook(webhookId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM webhook_logs WHERE webhook_id = $1
      `, [webhookId]);
      return res.rows[0] || null;
    } else {
      return db.prepare(`
        SELECT * FROM webhook_logs WHERE webhook_id = ?
      `).get(webhookId) || null;
    }
  }

  /**
   * Store webhook for processing
   */
  async _storeWebhook(webhookId, event) {
    const id = `wlog_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO webhook_logs (id, webhook_id, event_type, provider, provider_transaction_id, raw_payload, status, received_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'processing', $7)
      `, [id, webhookId, event.eventType, event.provider, event.providerTransactionId, JSON.stringify(event.rawPayload || event), event.receivedAt]);
    } else {
      db.prepare(`
        INSERT INTO webhook_logs (id, webhook_id, event_type, provider, provider_transaction_id, raw_payload, status, received_at)
        VALUES (?, ?, ?, ?, ?, ?, 'processing', ?)
      `).run(id, webhookId, event.eventType, event.provider, event.providerTransactionId, JSON.stringify(event.rawPayload || event), event.receivedAt);
    }
  }

  /**
   * Update webhook with processing result
   */
  async _updateWebhookResult(webhookId, result, isError = false) {
    const status = isError ? 'failed' : 'processed';
    const resultJson = JSON.stringify(result);

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE webhook_logs
        SET status = $1, processed_result = $2, processed_at = CURRENT_TIMESTAMP
        WHERE webhook_id = $3
      `, [status, resultJson, webhookId]);
    } else {
      db.prepare(`
        UPDATE webhook_logs
        SET status = ?, processed_result = ?, processed_at = datetime('now')
        WHERE webhook_id = ?
      `).run(status, resultJson, webhookId);
    }
  }

  // ── Audit Logging ────────────────────────────────────────────────

  /**
   * Log payment event for audit trail
   */
  async _logPaymentEvent({ eventType, invoiceId, providerTransactionId, amount, userId, metadata }) {
    const id = `paylog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO audit_logs (id, action, badge, badge_type, created_at)
        VALUES ($1, $2, $3, 'payment', CURRENT_TIMESTAMP)
      `, [id, `${eventType}${invoiceId ? ` | Invoice: ${invoiceId}` : ''}${providerTransactionId ? ` | Txn: ${providerTransactionId}` : ''}${amount ? ` | Amount: ${amount}` : ''}`, userId || 'system']);
    } else {
      db.prepare(`
        INSERT INTO audit_logs (id, action, badge, badge_type, created_at)
        VALUES (?, ?, ?, 'payment', datetime('now'))
      `).run(id, `${eventType}${invoiceId ? ` | Invoice: ${invoiceId}` : ''}${providerTransactionId ? ` | Txn: ${providerTransactionId}` : ''}${amount ? ` | Amount: ${amount}` : ''}`, userId || 'system');
    }
  }
}

/**
 * Create payment gateway instance with current provider config
 */
export function createPaymentGateway() {
  const providerConfig = {
    provider: config.PAYMENT_PROVIDER || 'mock',
    environment: config.NODE_ENV === 'production' ? 'production' : 'sandbox',
    apiKey: config.PAYMENT_API_KEY,
    apiSecret: config.PAYMENT_API_SECRET,
    merchantId: config.PAYMENT_MERCHANT_ID,
    webhookSecret: config.PAYMENT_WEBHOOK_SECRET,
  };

  return new PaymentGatewayService(providerConfig);
}
