// =============================================================================
// Tuition Controller — HTTP Handlers
// G29 — Tuition Invoice Management
// =============================================================================
import { tuitionService } from './tuition.service.js';
import {
  validateListQuery,
  validateGetParams,
  validateCreateBody,
  validateUpdateBody,
  validatePaymentBody,
} from './tuition.schema.js';
import { STATUS_LABELS, STATUS_COLORS, PAYMENT_METHOD_LABELS } from './tuition.types.js';

/**
 * Extract userId from request.
 */
function getUserId(req) {
  return req.user?.id || req.user?.userId || req.user?.sub || null;
}

/**
 * Extract user role from request.
 */
function getUserRole(req) {
  return req.user?.role || null;
}

/**
 * Extract schoolId from request.
 */
function getSchoolId(req) {
  return req.user?.schoolId || req.user?.school_id || null;
}

// ── GET /tuition/invoices — List invoices ─────────────────────────────

export async function listInvoices(req, res, next) {
  try {
    const parsed = validateListQuery(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, status, studentId } = parsed.data;
    const result = await tuitionService.listInvoices({
      userId: getUserId(req),
      role: getUserRole(req),
      schoolId: getSchoolId(req),
      studentId,
      status,
      page,
      limit,
    });

    // Enrich with UI metadata
    const enriched = result.invoices.map((inv) => ({
      ...inv,
      statusLabel: STATUS_LABELS[inv.status] || inv.status,
      statusColor: STATUS_COLORS[inv.status] || '#6B7280',
    }));

    res.json({
      success: true,
      invoices: enriched,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /tuition/invoices/summary — Outstanding summary ────────────────

export async function getOutstandingSummary(req, res, next) {
  try {
    const { studentId } = req.query;
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu studentId',
      });
    }

    const result = await tuitionService.getOutstandingSummary({
      studentId,
      userId: getUserId(req),
      role: getUserRole(req),
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// ── GET /tuition/invoices/students/:studentId — Invoices for student ──

export async function getInvoicesForStudent(req, res, next) {
  try {
    const { studentId } = req.params;
    const result = await tuitionService.getInvoicesForStudent({
      studentId,
      userId: getUserId(req),
      role: getUserRole(req),
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    });

    const enriched = result.invoices.map((inv) => ({
      ...inv,
      statusLabel: STATUS_LABELS[inv.status] || inv.status,
      statusColor: STATUS_COLORS[inv.status] || '#6B7280',
    }));

    res.json({
      success: true,
      invoices: enriched,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /tuition/invoices/:id — Get invoice details ─────────────────

export async function getInvoice(req, res, next) {
  try {
    const parsed = validateGetParams(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { id } = parsed.data;
    const invoice = await tuitionService.getInvoice({
      id,
      userId: getUserId(req),
      role: getUserRole(req),
    });

    const enriched = {
      ...invoice,
      statusLabel: STATUS_LABELS[invoice.status] || invoice.status,
      statusColor: STATUS_COLORS[invoice.status] || '#6B7280',
      lineItems: invoice.lineItems,
      payments: invoice.payments.map((p) => ({
        ...p,
        paymentMethodLabel: PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod,
      })),
    };

    res.json({ success: true, invoice: enriched });
  } catch (err) {
    next(err);
  }
}

// ── POST /tuition/invoices — Create invoice ─────────────────────────

export async function createInvoice(req, res, next) {
  try {
    const parsed = validateCreateBody(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { studentId, academicYearId, semesterId, billingPeriod, dueDate, lineItems, discount, notes } = parsed.data;
    const invoice = await tuitionService.createInvoice({
      studentId,
      academicYearId,
      semesterId,
      billingPeriod,
      dueDate,
      lineItems,
      discount,
      notes,
      userId: getUserId(req),
      role: getUserRole(req),
      userName: req.user?.name || 'Admin',
    });

    res.status(201).json({
      success: true,
      message: 'Hóa đơn đã được tạo!',
      invoice,
    });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /tuition/invoices/:id/issue — Issue invoice ─────────────

export async function issueInvoice(req, res, next) {
  try {
    const parsed = validateGetParams(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { id } = parsed.data;
    await tuitionService.issueInvoice({
      id,
      userId: getUserId(req),
      role: getUserRole(req),
      userName: req.user?.name || 'Admin',
    });

    res.json({ success: true, message: 'Hóa đơn đã được phát hành!' });
  } catch (err) {
    next(err);
  }
}

// ── POST /tuition/invoices/:id/payments — Record payment ────────

export async function recordPayment(req, res, next) {
  try {
    const parsed = validateGetParams(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const bodyParsed = validatePaymentBody(req.body);
    if (!bodyParsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: bodyParsed.error.flatten().fieldErrors,
      });
    }

    const { id } = parsed.data;
    const { amount, paymentMethod, transactionReference, notes } = bodyParsed.data;

    const payment = await tuitionService.recordPayment({
      id,
      amount,
      paymentMethod,
      transactionReference,
      notes,
      userId: getUserId(req),
      role: getUserRole(req),
      userName: req.user?.name || 'Admin',
    });

    res.status(201).json({
      success: true,
      message: 'Thanh toán đã được ghi nhận!',
      payment,
    });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /tuition/invoices/:id/cancel — Cancel invoice ───────────

export async function cancelInvoice(req, res, next) {
  try {
    const parsed = validateGetParams(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { id } = parsed.data;
    const { cancellationReason } = req.body || {};

    await tuitionService.cancelInvoice({
      id,
      cancellationReason,
      userId: getUserId(req),
      role: getUserRole(req),
      userName: req.user?.name || 'Admin',
    });

    res.json({ success: true, message: 'Hóa đơn đã được hủy!' });
  } catch (err) {
    next(err);
  }
}
