// =============================================================================
// Tuition Service — Business Logic Layer
// G29 — Tuition Invoice Management
// =============================================================================
import * as repo from './tuition.repository.js';
import { AppError } from '../../shared/errors/index.js';
import { INVOICE_STATUS, STATUS_TRANSITIONS } from './tuition.types.js';
import { calculateLineItemAmount, calculateInvoiceTotals } from './tuition.schema.js';
import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';

// ── Authorization Helpers ────────────────────────────────────────────────────

/**
 * Check if a parent has an active link to a student.
 */
async function isParentOfStudent(parentUserId, studentId) {
  if (!parentUserId || !studentId) return false;
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT ps.id FROM parent_students ps
      JOIN parents p ON ps.parent_id = p.id
      WHERE p.user_id = $1 AND ps.student_id = $2 AND ps.is_active = TRUE
    `, [parentUserId, studentId]);
    return res.rows.length > 0;
  }
  const row = db.prepare(`
    SELECT ps.id FROM parent_students ps
    JOIN parents p ON ps.parent_id = p.id
    WHERE p.user_id = ? AND ps.student_id = ? AND ps.is_active = 1
  `).get(parentUserId, studentId);
  return !!row;
}

/**
 * Get user's school ID.
 */
async function getUserSchoolId(userId) {
  if (!userId) return null;
  if (isPostgresConfigured()) {
    const res = await pgQuery(`SELECT school_id FROM users WHERE id = $1`, [userId]);
    return res.rows[0]?.school_id || null;
  }
  const row = db.prepare(`SELECT school_id FROM users WHERE id = ?`).get(userId);
  return row?.school_id || null;
}

/**
 * Get current academic year ID.
 */
async function getCurrentAcademicYearId(schoolId) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      SELECT id FROM academic_years WHERE school_id = $1 AND is_current = TRUE LIMIT 1
    `, [schoolId]);
    return res.rows[0]?.id || null;
  }
  const row = db.prepare(`
    SELECT id FROM academic_years WHERE school_id = ? AND is_current = 1 LIMIT 1
  `).get(schoolId);
  return row?.id || null;
}

/**
 * Log audit event.
 */
async function logAudit({ actorId, actorName, action, metadata }) {
  const logId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (isPostgresConfigured()) {
    await pgQuery(`
      INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type, created_at)
      VALUES ($1, $2, 'system', $3, 'Tuition', 'info', CURRENT_TIMESTAMP)
    `, [logId, actorName || 'System', action]);
    return;
  }
  db.prepare(`
    INSERT INTO audit_logs (id, actor_name, role, action, badge, badge_type, created_at)
    VALUES (?, ?, 'system', ?, 'Tuition', 'info', datetime('now'))
  `).run(logId, actorName || 'System', action);
}

// ── Service ──────────────────────────────────────────────────────────────────

export const tuitionService = {
  /**
   * List invoices with authorization.
   * Parents: only invoices for their linked students
   * Admins: all invoices in their school
   */
  async listInvoices({ userId, role, schoolId, studentId, status, page, limit }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    const filterSchoolId = schoolId || await getUserSchoolId(userId);

    // Build parent filter for parents
    let parentId = null;
    if (role === 'parent') {
      parentId = userId;
    }

    return repo.tuitionRepo.listInvoices({
      schoolId: filterSchoolId,
      studentId,
      parentId,
      status,
      page,
      limit,
    });
  },

  /**
   * Get invoice details with line items and payments.
   */
  async getInvoice({ id, userId, role }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    const invoice = await repo.tuitionRepo.findById(id);
    if (!invoice) throw AppError.notFound('Hóa đơn không tồn tại');

    // Authorization: parent can only view their linked students' invoices
    if (role === 'parent') {
      const linked = await isParentOfStudent(userId, invoice.studentId);
      if (!linked) throw AppError.forbidden('Bạn không có quyền xem hóa đơn này');
    }

    // Get line items and payments
    const lineItems = await repo.tuitionRepo.getLineItems(id);
    const payments = await repo.tuitionRepo.getPaymentsForInvoice(id);

    return {
      ...invoice,
      lineItems,
      payments,
    };
  },

  /**
   * Get invoices for a specific student.
   */
  async getInvoicesForStudent({ studentId, userId, role, page, limit }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    // Parents can only view their linked students
    if (role === 'parent') {
      const linked = await isParentOfStudent(userId, studentId);
      if (!linked) throw AppError.forbidden('Bạn không phải phụ huynh của học sinh này');
    }

    return repo.tuitionRepo.listInvoices({
      studentId,
      page,
      limit,
    });
  },

  /**
   * Create a new invoice (draft).
   * Only admin/finance can create.
   */
  async createInvoice({ studentId, academicYearId, semesterId, billingPeriod, dueDate, lineItems, discount, notes, userId, role, userName }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    // Only admin can create invoices
    if (role !== 'admin' && role !== 'school_admin') {
      throw AppError.forbidden('Chỉ quản trị viên mới có thể tạo hóa đơn');
    }

    // Validate line items
    if (!lineItems || lineItems.length === 0) {
      throw AppError.badRequest('Phải có ít nhất 1 khoản mục');
    }

    // Server-side calculation of totals
    const totals = calculateInvoiceTotals(lineItems, discount || 0);

    const schoolId = await getUserSchoolId(userId);

    const invoice = await repo.tuitionRepo.createInvoice({
      schoolId,
      studentId,
      academicYearId,
      semesterId,
      billingPeriod,
      dueDate,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      status: 'draft',
      createdBy: userId,
      notes,
    });

    // Create line items - compute amount from quantity and unitPrice
    const processedLineItems = lineItems.map(item => ({
      ...item,
      amount: calculateLineItemAmount(item.quantity, item.unitPrice),
    }));
    await repo.tuitionRepo.createLineItems(invoice.id, processedLineItems);

    await logAudit({
      actorId: userId,
      actorName: userName,
      action: `Tạo hóa đơn ${invoice.invoiceNumber} cho học sinh ${studentId} - Tổng: ${totals.total}`,
      metadata: { invoiceId: invoice.id, studentId, total: totals.total },
    });

    return {
      ...invoice,
      lineItems: processedLineItems,
    };
  },

  /**
   * Issue an invoice (change from draft to issued).
   */
  async issueInvoice({ id, userId, role, userName }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');
    if (role !== 'admin' && role !== 'school_admin') {
      throw AppError.forbidden('Chỉ quản trị viên mới có thể phát hành hóa đơn');
    }

    const invoice = await repo.tuitionRepo.findById(id);
    if (!invoice) throw AppError.notFound('Hóa đơn không tồn tại');

    if (invoice.status !== INVOICE_STATUS.DRAFT) {
      throw AppError.badRequest('Chỉ có thể phát hành hóa đơn ở trạng thái bản nháp');
    }

    const now = new Date().toISOString();
    await repo.tuitionRepo.updateInvoice(id, { status: INVOICE_STATUS.ISSUED });

    // Update issued_at
    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE tuition_invoices SET issued_at = $1 WHERE id = $2
      `, [now, id]);
    } else {
      db.prepare(`UPDATE tuition_invoices SET issued_at = ? WHERE id = ?`).run(now, id);
    }

    await logAudit({
      actorId: userId,
      actorName: userName,
      action: `Phát hành hóa đơn ${invoice.invoiceNumber}`,
      metadata: { invoiceId: id },
    });

    return { success: true };
  },

  /**
   * Record a payment for an invoice.
   */
  async recordPayment({ id, amount, paymentMethod, transactionReference, notes, userId, role, userName }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');
    if (role !== 'admin' && role !== 'school_admin') {
      throw AppError.forbidden('Chỉ quản trị viên mới có thể ghi nhận thanh toán');
    }

    const invoice = await repo.tuitionRepo.findById(id);
    if (!invoice) throw AppError.notFound('Hóa đơn không tồn tại');

    if (invoice.status === INVOICE_STATUS.PAID) {
      throw AppError.badRequest('Hóa đơn đã được thanh toán đầy đủ');
    }

    if (invoice.status === INVOICE_STATUS.CANCELLED) {
      throw AppError.badRequest('Hóa đơn đã bị hủy');
    }

    // Validate payment amount
    const remaining = parseFloat(invoice.total) - parseFloat(invoice.amountPaid);
    if (parseFloat(amount) > remaining + 0.01) {
      throw AppError.badRequest('Số tiền thanh toán vượt quá số tiền còn lại');
    }

    // Create payment record
    const payment = await repo.tuitionRepo.createPayment({
      invoiceId: id,
      amount,
      paymentMethod,
      transactionReference,
      paidBy: userId,
      notes,
    });

    // Recalculate invoice status
    await repo.tuitionRepo.recalculateInvoicePayments(id);

    await logAudit({
      actorId: userId,
      actorName: userName,
      action: `Ghi nhận thanh toán ${amount} cho hóa đơn ${invoice.invoiceNumber} - ${paymentMethod}`,
      metadata: { invoiceId: id, paymentId: payment.id, amount },
    });

    return payment;
  },

  /**
   * Cancel an invoice.
   */
  async cancelInvoice({ id, cancellationReason, userId, role, userName }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');
    if (role !== 'admin' && role !== 'school_admin') {
      throw AppError.forbidden('Chỉ quản trị viên mới có thể hủy hóa đơn');
    }

    const invoice = await repo.tuitionRepo.findById(id);
    if (!invoice) throw AppError.notFound('Hóa đơn không tồn tại');

    if (invoice.status === INVOICE_STATUS.PAID) {
      throw AppError.badRequest('Không thể hủy hóa đơn đã thanh toán');
    }

    const now = new Date().toISOString();
    await repo.tuitionRepo.updateInvoice(id, {
      status: INVOICE_STATUS.CANCELLED,
    });

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE tuition_invoices SET cancelled_at = $1, cancelled_by = $2, cancellation_reason = $3 WHERE id = $4
      `, [now, userId, cancellationReason || null, id]);
    } else {
      db.prepare(`
        UPDATE tuition_invoices SET cancelled_at = ?, cancelled_by = ?, cancellation_reason = ? WHERE id = ?
      `).run(now, userId, cancellationReason || null, id);
    }

    await logAudit({
      actorId: userId,
      actorName: userName,
      action: `Hủy hóa đơn ${invoice.invoiceNumber}${cancellationReason ? ' - Lý do: ' + cancellationReason : ''}`,
      metadata: { invoiceId: id, reason: cancellationReason },
    });

    return { success: true };
  },

  /**
   * Get outstanding invoice summary for a student.
   */
  async getOutstandingSummary({ studentId, userId, role }) {
    if (!userId) throw AppError.unauthorized('Yêu cầu đăng nhập');

    // Parents can only view their linked students
    if (role === 'parent') {
      const linked = await isParentOfStudent(userId, studentId);
      if (!linked) throw AppError.forbidden('Bạn không phải phụ huynh của học sinh này');
    }

    const result = await repo.tuitionRepo.listInvoices({
      studentId,
      page: 1,
      limit: 100,
    });

    const outstanding = result.invoices.filter(inv =>
      inv.status === INVOICE_STATUS.ISSUED ||
      inv.status === INVOICE_STATUS.PARTIAL ||
      inv.status === INVOICE_STATUS.OVERDUE
    );

    const totalOutstanding = outstanding.reduce((sum, inv) => {
      const remaining = parseFloat(inv.total) - parseFloat(inv.amountPaid);
      return sum + remaining;
    }, 0);

    return {
      studentId,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      outstandingCount: outstanding.length,
      invoices: outstanding,
    };
  },
};
