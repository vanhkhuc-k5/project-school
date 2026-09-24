// =============================================================================
// Dashboard Routes — Express Router
// G31 — Admin Dashboard Real Operational Metrics
// =============================================================================
import express from 'express';
import { authenticateToken, requireAnyPermission } from '../../shared/auth/rbac.middleware.js';
import {
  getDashboardMetrics,
  getAttendanceTrends,
} from './dashboard.controller.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// GET /dashboard/metrics — Get comprehensive metrics
router.get('/metrics', getDashboardMetrics);

// GET /dashboard/attendance-trends — Get attendance trends
router.get('/attendance-trends', getAttendanceTrends);

export default router;
