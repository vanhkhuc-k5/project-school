// =============================================================================
// Tuition Routes — Express Router
// G29 — Tuition Invoice Management
// =============================================================================
import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  listInvoices,
  getOutstandingSummary,
  getInvoicesForStudent,
  getInvoice,
  createInvoice,
  issueInvoice,
  recordPayment,
  cancelInvoice,
} from './tuition.controller.js';

const router = express.Router();

// All tuition routes require authentication
router.use(authenticateToken);

// ── List & Get ─────────────────────────────────────────────────────

// GET /tuition/invoices — List invoices
router.get('/invoices', listInvoices);

// GET /tuition/invoices/summary — Outstanding summary for student
router.get('/invoices/summary', getOutstandingSummary);

// GET /tuition/invoices/students/:studentId — Invoices for specific student
router.get('/invoices/students/:studentId', getInvoicesForStudent);

// GET /tuition/invoices/:id — Get invoice details
router.get('/invoices/:id', getInvoice);

// ── Mutations ─────────────────────────────────────────────────────

// POST /tuition/invoices — Create invoice (draft)
router.post('/invoices', createInvoice);

// PATCH /tuition/invoices/:id/issue — Issue invoice (draft -> issued)
router.patch('/invoices/:id/issue', issueInvoice);

// POST /tuition/invoices/:id/payments — Record payment
router.post('/invoices/:id/payments', recordPayment);

// PATCH /tuition/invoices/:id/cancel — Cancel invoice
router.patch('/invoices/:id/cancel', cancelInvoice);

export const tuitionRoutes = router;
