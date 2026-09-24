// =============================================================================
// Tuition Repository — Data Access Layer
// G29 — Tuition Invoice Management
// Supports: PostgreSQL (Neon Cloud) + SQLite (local dev)
// Uses DECIMAL for monetary amounts - no floats!
// =============================================================================
import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';
import { nanoid } from 'nanoid';

// Helper to parse monetary values safely
function parseDecimal(value) {
  if (value === null || value === undefined) return 0;
  return parseFloat(String(value));
}

function parseInvoice(row) {
  if (!row) return null;
  return {
    id: row.id,
    schoolId: row.school_id,
    studentId: row.student_id,
    academicYearId: row.academic_year_id,
    semesterId: row.semester_id,
    invoiceNumber: row.invoice_number,
    billingPeriod: row.billing_period,
    subtotal: parseDecimal(row.subtotal),
    discount: parseDecimal(row.discount),
    total: parseDecimal(row.total),
    amountPaid: parseDecimal(row.amount_paid),
    dueDate: row.due_date,
    status: row.status,
    paymentReference: row.payment_reference,
    issuedAt: row.issued_at,
    paidAt: row.paid_at,
    cancelledAt: row.cancelled_at,
    cancelledBy: row.cancelled_by,
    cancellationReason: row.cancellation_reason,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Enriched
    studentName: row.student_name,
    parentName: row.parent_name,
    className: row.class_name,
  };
}

function parseLineItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description,
    quantity: parseDecimal(row.quantity),
    unitPrice: parseDecimal(row.unit_price),
    amount: parseDecimal(row.amount),
    sortOrder: row.sort_order || 0,
  };
}

function parsePayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amount: parseDecimal(row.amount),
    paymentMethod: row.payment_method,
    transactionReference: row.transaction_reference,
    paidBy: row.paid_by,
    paidAt: row.paid_at,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    // Enriched
    paidByName: row.paid_by_name,
  };
}

export const tuitionRepo = {
  // ── Invoice Operations ─────────────────────────────────────────────────

  /**
   * Find invoice by ID.
   */
  async findById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT ti.*,
               s_u.name as student_name,
               p_u.name as parent_name,
               c.name as class_name
        FROM tuition_invoices ti
        LEFT JOIN users s_u ON ti.student_id = s_u.id
        LEFT JOIN students s ON ti.student_id = s.id
        LEFT JOIN parents p ON s.parent_id = p.id
        LEFT JOIN users p_u ON p.user_id = p_u.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE ti.id = $1
      `, [id]);
      return parseInvoice(res.rows[0]) || null;
    }

    const row = db.prepare(`
      SELECT ti.*,
             s_u.name as student_name,
             p_u.name as parent_name,
             c.name as class_name
      FROM tuition_invoices ti
      LEFT JOIN users s_u ON ti.student_id = s_u.id
      LEFT JOIN students s ON ti.student_id = s.id
      LEFT JOIN parents p ON s.parent_id = p.id
      LEFT JOIN users p_u ON p.user_id = p_u.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE ti.id = ?
    `).get(id);
    return parseInvoice(row) || null;
  },

  /**
   * Create a new invoice.
   */
  async createInvoice({ id, schoolId, studentId, academicYearId, semesterId, invoiceNumber, billingPeriod, subtotal, discount, total, dueDate, status = 'draft', createdBy, notes }) {
    const invId = id || `inv_${nanoid(12)}`;
    const invNumber = invoiceNumber || `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO tuition_invoices (
          id, school_id, student_id, academic_year_id, semester_id,
          invoice_number, billing_period, subtotal, discount, total, amount_paid,
          due_date, status, created_by, notes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, $11, $12, $13, $14, $15, $15)
        RETURNING *
      `, [invId, schoolId, studentId, academicYearId || null, semesterId || null, invNumber, billingPeriod || null, subtotal, discount || 0, total, dueDate, status, createdBy || null, notes || null, now]);
      return parseInvoice(res.rows[0]);
    }

    db.prepare(`
      INSERT INTO tuition_invoices (
        id, school_id, student_id, academic_year_id, semester_id,
        invoice_number, billing_period, subtotal, discount, total, amount_paid,
        due_date, status, created_by, notes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(invId, schoolId, studentId, academicYearId || null, semesterId || null, invNumber, billingPeriod || null, subtotal, discount || 0, total, dueDate, status, createdBy || null, notes || null);

    return this.findById(invId);
  },

  /**
   * Update invoice.
   */
  async updateInvoice(id, { dueDate, discount, subtotal, total, notes, status, updatedBy }) {
    const updates = [];
    const params = [];
    let idx = 1;

    if (dueDate !== undefined) {
      updates.push(`due_date = $${idx}`);
      params.push(dueDate);
      idx++;
    }
    if (discount !== undefined) {
      updates.push(`discount = $${idx}`);
      params.push(discount);
      idx++;
    }
    if (subtotal !== undefined) {
      updates.push(`subtotal = $${idx}`);
      params.push(subtotal);
      idx++;
    }
    if (total !== undefined) {
      updates.push(`total = $${idx}`);
      params.push(total);
      idx++;
    }
    if (notes !== undefined) {
      updates.push(`notes = $${idx}`);
      params.push(notes);
      idx++;
    }
    if (status !== undefined) {
      updates.push(`status = $${idx}`);
      params.push(status);
      idx++;
    }

    updates.push(`updated_at = $${idx}`);
    const now = new Date().toISOString();
    params.push(now);
    idx++;
    params.push(id);

    if (updates.length === 1) return; // Only updated_at

    const sql = `UPDATE tuition_invoices SET ${updates.join(', ')} WHERE id = $${idx}`;

    if (isPostgresConfigured()) {
      await pgQuery(sql, params);
    } else {
      db.prepare(sql).run(...params);
    }
  },

  /**
   * List invoices with filters.
   */
  async listInvoices({ schoolId, studentId, parentId, status, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (schoolId) {
      conditions.push(`ti.school_id = $${idx}`);
      params.push(schoolId);
      idx++;
    }
    if (studentId) {
      conditions.push(`ti.student_id = $${idx}`);
      params.push(studentId);
      idx++;
    }
    if (status) {
      conditions.push(`ti.status = $${idx}`);
      params.push(status);
      idx++;
    }
    // For parents: filter by parent_students link
    if (parentId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM parent_students ps
        JOIN parents p ON ps.parent_id = p.id
        WHERE p.user_id = $${idx} AND ps.student_id = ti.student_id AND ps.is_active = TRUE
      )`);
      params.push(parentId);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    if (isPostgresConfigured()) {
      const countRes = await pgQuery(
        `SELECT COUNT(*) as count FROM tuition_invoices ti ${whereClause}`,
        params
      );
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      const res = await pgQuery(`
        SELECT ti.*,
               s_u.name as student_name,
               p_u.name as parent_name,
               c.name as class_name
        FROM tuition_invoices ti
        LEFT JOIN users s_u ON ti.student_id = s_u.id
        LEFT JOIN students s ON ti.student_id = s.id
        LEFT JOIN parents p ON s.parent_id = p.id
        LEFT JOIN users p_u ON p.user_id = p_u.id
        LEFT JOIN classes c ON s.class_id = c.id
        ${whereClause}
        ORDER BY ti.created_at DESC
        LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}
      `, params);

      return {
        invoices: res.rows.map(parseInvoice),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // SQLite
    const total = db.prepare(`SELECT COUNT(*) as count FROM tuition_invoices ti ${whereClause}`).get(...params)?.count || 0;

    const rows = db.prepare(`
      SELECT ti.*,
             s_u.name as student_name,
             p_u.name as parent_name,
             c.name as class_name
      FROM tuition_invoices ti
      LEFT JOIN users s_u ON ti.student_id = s_u.id
      LEFT JOIN students s ON ti.student_id = s.id
      LEFT JOIN parents p ON s.parent_id = p.id
      LEFT JOIN users p_u ON p.user_id = p_u.id
      LEFT JOIN classes c ON s.class_id = c.id
      ${whereClause}
      ORDER BY ti.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      invoices: rows.map(parseInvoice),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  // ── Line Item Operations ─────────────────────────────────────────────

  /**
   * Create line items for an invoice.
   */
  async createLineItems(invoiceId, lineItems) {
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const itemId = `li_${nanoid(10)}`;

      if (isPostgresConfigured()) {
        await pgQuery(`
          INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit_price, amount, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [itemId, invoiceId, item.description, item.quantity, item.unitPrice, item.amount, i]);
      } else {
        db.prepare(`
          INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit_price, amount, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(itemId, invoiceId, item.description, item.quantity, item.unitPrice, item.amount, i);
      }
    }
  },

  /**
   * Get line items for an invoice.
   */
  async getLineItems(invoiceId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT * FROM invoice_line_items
        WHERE invoice_id = $1
        ORDER BY sort_order ASC
      `, [invoiceId]);
      return res.rows.map(parseLineItem);
    }
    return db.prepare(`
      SELECT * FROM invoice_line_items
      WHERE invoice_id = ?
      ORDER BY sort_order ASC
    `).all(invoiceId).map(parseLineItem);
  },

  /**
   * Delete line items for an invoice.
   */
  async deleteLineItems(invoiceId) {
    if (isPostgresConfigured()) {
      await pgQuery(`DELETE FROM invoice_line_items WHERE invoice_id = $1`, [invoiceId]);
    } else {
      db.prepare(`DELETE FROM invoice_line_items WHERE invoice_id = ?`).run(invoiceId);
    }
  },

  // ── Payment Operations ─────────────────────────────────────────────

  /**
   * Create a payment record.
   */
  async createPayment({ id, invoiceId, amount, paymentMethod, transactionReference, paidBy, notes }) {
    const payId = id || `pay_${nanoid(12)}`;
    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO tuition_payments (id, invoice_id, amount, payment_method, transaction_reference, paid_by, status, notes, paid_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, $8, $8)
        RETURNING *
      `, [payId, invoiceId, amount, paymentMethod, transactionReference || null, paidBy || null, notes || null, now]);
      return parsePayment(res.rows[0]);
    }

    db.prepare(`
      INSERT INTO tuition_payments (id, invoice_id, amount, payment_method, transaction_reference, paid_by, status, notes, paid_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, datetime('now'), datetime('now'))
    `).run(payId, invoiceId, amount, paymentMethod, transactionReference || null, paidBy || null, notes || null);

    return this.getPaymentById(payId);
  },

  /**
   * Get payment by ID.
   */
  async getPaymentById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT tp.*, u.name as paid_by_name
        FROM tuition_payments tp
        LEFT JOIN users u ON tp.paid_by = u.id
        WHERE tp.id = $1
      `, [id]);
      return parsePayment(res.rows[0]) || null;
    }
    const row = db.prepare(`
      SELECT tp.*, u.name as paid_by_name
      FROM tuition_payments tp
      LEFT JOIN users u ON tp.paid_by = u.id
      WHERE tp.id = ?
    `).get(id);
    return parsePayment(row) || null;
  },

  /**
   * Get payments for an invoice.
   */
  async getPaymentsForInvoice(invoiceId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT tp.*, u.name as paid_by_name
        FROM tuition_payments tp
        LEFT JOIN users u ON tp.paid_by = u.id
        WHERE tp.invoice_id = $1
        ORDER BY tp.paid_at DESC
      `, [invoiceId]);
      return res.rows.map(parsePayment);
    }
    const rows = db.prepare(`
      SELECT tp.*, u.name as paid_by_name
      FROM tuition_payments tp
      LEFT JOIN users u ON tp.paid_by = u.id
      WHERE tp.invoice_id = ?
      ORDER BY tp.paid_at DESC
    `).all(invoiceId);
    return rows.map(parsePayment);
  },

  /**
   * Get total paid amount for an invoice.
   */
  async getTotalPaid(invoiceId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM tuition_payments
        WHERE invoice_id = $1 AND status = 'completed'
      `, [invoiceId]);
      return parseDecimal(res.rows[0]?.total || 0);
    }
    const row = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM tuition_payments
      WHERE invoice_id = ? AND status = 'completed'
    `).get(invoiceId);
    return parseDecimal(row?.total || 0);
  },

  /**
   * Update invoice amount_paid and status based on payments.
   */
  async recalculateInvoicePayments(invoiceId) {
    const totalPaid = await this.getTotalPaid(invoiceId);
    const invoice = await this.findById(invoiceId);
    if (!invoice) return;

    const total = parseDecimal(invoice.total);
    let newStatus = invoice.status;
    let paidAt = invoice.paidAt;

    if (totalPaid >= total) {
      newStatus = 'paid';
      paidAt = new Date().toISOString();
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    }

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE tuition_invoices
        SET amount_paid = $1, status = $2, paid_at = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [totalPaid, newStatus, paidAt, invoiceId]);
    } else {
      db.prepare(`
        UPDATE tuition_invoices
        SET amount_paid = ?, status = ?, paid_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(totalPaid, newStatus, paidAt, invoiceId);
    }
  },
};
