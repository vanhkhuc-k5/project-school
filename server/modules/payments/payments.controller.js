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
 * Dispatches SSE TUITION_PAID event to the parent user.
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
    const { tuitionRepo } = await import('../tuition/tuition.repository.js');
    const { nanoid } = await import('nanoid');

    // Find invoice
    const invoice = await tuitionRepo.findById(invoiceId);
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
        receiptNo: `BL-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${invoiceId.slice(-6).toUpperCase()}`,
      });
    }

    const now = new Date().toISOString();
    const receiptNo = `BL-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${nanoid(6).toUpperCase()}`;

    // Create payment record
    await tuitionRepo.createPayment({
      id: `sbx_pay_${nanoid(10)}`,
      invoiceId,
      amount: invoice.total,
      paymentMethod: 'VietQR_Sandbox',
      transactionReference: `NAPAS247_SBX_${nanoid(16).toUpperCase()}`,
      paidBy: invoice.studentId,
      notes: 'Thanh toán sandbox — Giả lập VietQR Napas 247 (Không có tiền thật)',
    });

    // Mark invoice as paid
    await tuitionRepo.updateInvoice(invoiceId, {
      status: 'paid',
      paidAt: now,
    });

    // Dispatch SSE notification to parent user
    try {
      const { dispatchToUser } = await import('../notifications/sse.controller.js');
      const { getParentUserId } = await import('../tuition/tuition.service.js');
      const parentUserId = await getParentUserId(invoice.studentId);
      if (parentUserId) {
        dispatchToUser(parentUserId, 'TUITION_PAID', {
          event: 'TUITION_PAID',
          invoiceId,
          receiptNo,
          amount: invoice.total,
          studentName: invoice.studentName,
          paidAt: now,
          message: `Đã nhận thanh toán học phí ${invoice.total?.toLocaleString('vi-VN')}đ cho học sinh ${invoice.studentName}`,
        });
      }
    } catch (notifyErr) {
      console.warn('[Sandbox] SSE notification failed (non-fatal):', notifyErr.message);
    }

    console.log(`[Sandbox] Invoice ${invoiceId} marked as paid. Receipt: ${receiptNo}`);

    res.status(200).json({
      success: true,
      message: 'Giả lập thanh toán thành công!',
      receiptNo,
      paidAt: now,
      amount: invoice.total,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/payments/receipt/:invoiceId
 * G38: Retrieve payment receipt details for a paid invoice.
 */
export async function getPaymentReceipt(req, res, next) {
  try {
    const { invoiceId } = req.params;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'invoiceId là bắt buộc.',
      });
    }

    const { tuitionRepo } = await import('../tuition/tuition.repository.js');

    const invoice = await tuitionRepo.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Hóa đơn không tồn tại.',
      });
    }

    const payments = await tuitionRepo.getPaymentsForInvoice(invoiceId);
    const payment = payments[0];

    const now = new Date();
    const receipt = {
      receiptNo: payment?.transactionReference
        ? `BL-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${invoiceId.slice(-6).toUpperCase()}`
        : '—',
      schoolName: 'Trường THPT EduPortal',
      schoolAddress: 'Số 123 Đường ABC, Quận 1, TP. Hồ Chí Minh',
      taxId: '0123456789',
      studentName: invoice.studentName || '—',
      className: invoice.className || '—',
      billingPeriod: invoice.billingPeriod || '—',
      totalAmount: invoice.total,
      amountPaid: invoice.amountPaid || invoice.total,
      paidAt: invoice.paidAt || now.toISOString(),
      paymentMethod: payment?.paymentMethod || 'VietQR',
      transactionRef: payment?.transactionReference || '—',
      cashierName: 'Nguyễn Thị Quỳnh Trang',
      cashierTitle: 'Thủ quỹ',
      lineItems: [],
      issuedAt: now.toISOString(),
    };

    res.json({ success: true, receipt });
  } catch (error) {
    next(error);
  }
}
