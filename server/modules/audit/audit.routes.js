// =============================================================================
// Audit Routes — Express Router
// G36 Centralized Audit Trail
// =============================================================================
import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requirePermission } from '../../shared/auth/rbac.middleware.js';
import { PERMISSIONS } from '../../shared/auth/rbac.registry.js';
import {
  queryAuditLogs,
  getAuditLog,
  getEntityAuditHistory,
  getSecurityEvents,
  getActorActivity,
  getAuditStats,
  getAuditActions,
} from './audit.controller.js';

const router = express.Router();

// All audit routes require authentication
router.use(authenticateToken);

// ── Audit Query Endpoints ─────────────────────────────────────────────────

// GET /audit/logs — Query audit logs with filters
router.get(
  '/logs',
  requirePermission(PERMISSIONS.AUDIT_READ),
  queryAuditLogs
);

// GET /audit/logs/:id — Get single audit log
router.get(
  '/logs/:id',
  requirePermission(PERMISSIONS.AUDIT_READ),
  getAuditLog
);

// GET /audit/entity/:type/:id — Get entity audit history
router.get(
  '/entity/:type/:id',
  requirePermission(PERMISSIONS.AUDIT_READ),
  getEntityAuditHistory
);

// GET /audit/security — Get security events
router.get(
  '/security',
  requirePermission(PERMISSIONS.AUDIT_READ),
  getSecurityEvents
);

// GET /audit/actors/:actorId — Get actor activity
router.get(
  '/actors/:actorId',
  requirePermission(PERMISSIONS.AUDIT_READ),
  getActorActivity
);

// GET /audit/stats — Get audit statistics
router.get(
  '/stats',
  requirePermission(PERMISSIONS.AUDIT_READ),
  getAuditStats
);

// GET /audit/actions — Get available audit actions
router.get(
  '/actions',
  getAuditActions
);

export default router;
