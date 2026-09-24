// =============================================================================
// Leave Requests Routes — Express Router
// G28 — Student Leave Requests Lifecycle
// =============================================================================
import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
  listLeaveRequests,
  listPendingRequests,
  getLeaveRequest,
  getRequestsForStudent,
  createLeaveRequest,
  cancelLeaveRequest,
  reviewLeaveRequest,
} from './leave-requests.controller.js';

const router = express.Router();

// All leave request routes require authentication
router.use(authenticateToken);

// ── List & Get ─────────────────────────────────────────────────────────

// GET /leave-requests — List requests (filtered by role)
router.get('/', listLeaveRequests);

// GET /leave-requests/pending — List pending requests for review
router.get('/pending', listPendingRequests);

// GET /leave-requests/students/:studentId — All requests for a student
router.get('/students/:studentId', getRequestsForStudent);

// GET /leave-requests/:id — Get single request
router.get('/:id', getLeaveRequest);

// ── Mutations ─────────────────────────────────────────────────────────

// POST /leave-requests — Create/submit new request
router.post('/', createLeaveRequest);

// PATCH /leave-requests/:id/cancel — Cancel request (by requester)
router.patch('/:id/cancel', cancelLeaveRequest);

// PATCH /leave-requests/:id/review — Approve/Reject request (by reviewer)
router.patch('/:id/review', reviewLeaveRequest);

export default router;
