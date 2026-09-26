// =============================================================================
// Leadership Routes — Express Router
// G32 — Principal / Vice Principal Dashboard
// Role-based access: principal, vice_principal, school_admin
// =============================================================================
import express from 'express';
import { authenticateToken, requireRole } from '../../shared/auth/auth.middleware.js';
import {
  getLeadershipDashboard,
  getClassDetail,
} from './leadership.controller.js';

const router = express.Router();

// All leadership routes require authentication and leadership role
router.use(authenticateToken);

// Apply role-based access: principal, vice_principal, school_admin, super_admin
router.use(requireRole('principal', 'vice_principal', 'school_admin', 'super_admin'));

// GET /leadership/dashboard — Main leadership dashboard
router.get('/dashboard', getLeadershipDashboard);

// GET /leadership/class/:classId — Detailed class view (requires explicit permission)
router.get('/class/:classId', getClassDetail);

export default router;
