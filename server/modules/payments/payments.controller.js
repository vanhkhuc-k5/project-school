// =============================================================================
// Payment Webhook Controller — Handles Provider Callbacks
// G30 — Payment Gateway Integration
// Verifies signatures and processes webhook events
// =============================================================================
import { createPaymentGateway } from './payment-gateway.service.js';
import { AppError } from '../../shared/errors/index.js';

/**
 * POST /api/payments/webhook/:provider
 * Handle webhook callback from payment provider
 */
export async function handleProviderWebhook(req, res, next) {
  try {
    const { provider } = req.params;
    const signature = req.headers['x-webhook-signature'] || 
                     req.headers['x-signature'] || 
                     req.body?.signature ||
                     'test_webhook_signature';

    // Get raw body for signature verification
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // Create gateway with provider
    const gateway = createPaymentGateway();
    
    // Handle webhook
    const result = await gateway.handleWebhook(req.body, signature);

    // Log webhook receipt
    console.log(`[Payment Webhook] Provider: ${provider}, Event: ${result.event?.eventType}, Duplicate: ${result.isDuplicate || false}`);

    // Return acknowledgment to provider
    res.status(200).json({
      success: true,
      received: true,
      isDuplicate: result.isDuplicate || false,
      processed: result.processed || false,
    });
  } catch (error) {
    console.error(`[Payment Webhook] Error:`, error.message);
    
    if (error.status === 403) {
      // Invalid signature - return 403
      return res.status(403).json({
        success: false,
        error: 'Invalid webhook signature',
      });
    }
    
    next(error);
  }
}

/**
 * GET /api/payments/health
 * Check payment provider health status
 */
export async function getPaymentHealth(req, res, next) {
  try {
    const gateway = createPaymentGateway();
    const isHealthy = await gateway.provider.healthCheck();

    res.json({
      success: true,
      provider: gateway.providerType,
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/payments/sandbox/simulate-payment
 * G38: Sandbox simulation — marks an invoice as paid and creates a payment record.
 * This is for dev/testing only. In production, this would be handled by bank webhook.
 */
export async function simulateSandboxPayment(req, res, next) {
  try {
    const { invoiceId } = req.body || {};

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'invoiceId là bắt buộc.',
      });
    }

    // Import tuition repository directly to avoid circular deps
    const { tuitionRepository } = await import('../tuition/tuition.repository.js');
    const { nanoid } = await import('nanoid');

    // Find invoice
    const invoice = await tuitionRepository.findInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Hóa đơn không tồn tại.',
      });
    }

    if (invoice.status === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Hóa đơn đã được thanh toán trước đó.',
        receiptNo: `BL-SBX-${invoiceId.slice(-8)}`,
      });
    }

    const now = new Date().toISOString();
    const receiptNo = `BL-SBX-${nanoid(8).toUpperCase()}`;

    // Create payment record
    await tuitionRepository.createPayment({
      id: `sbx_pay_${nanoid(10)}`,
      invoiceId,
      amount: invoice.total || invoice.total_amount || 0,
      paymentMethod: 'VietQR_Sandbox',
      transactionReference: `NAPAS247_SBX_${nanoid(16).toUpperCase()}`,
      paidBy: invoice.student_id,
      notes: 'Thanh toán sandbox — Giả lập VietQR Napas 247 (Không có tiền thật)',
    });

    // Mark invoice as paid
    await tuitionRepository.updateInvoice(invoiceId, {
      status: 'paid',
      paidAt: now,
    });

    console.log(`[Sandbox] Invoice ${invoiceId} marked as paid. Receipt: ${receiptNo}`);

    res.status(200).json({
      success: true,
      message: 'Giả lập thanh toán thành công!',
      receiptNo,
      paidAt: now,
      amount: invoice.total || invoice.total_amount || 0,
    });
  } catch (error) {
    next(error);
  }
}
