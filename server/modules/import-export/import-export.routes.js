// =============================================================================
// Import/Export Routes — Express Router
// G35 — Safe Data Import/Export
// =============================================================================
import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requirePermission } from '../../shared/auth/rbac.middleware.js';
import { PERMISSIONS } from '../../shared/auth/rbac.registry.js';
import {
  previewImport,
  commitImport,
  exportData,
  downloadTemplate,
} from './import-export.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ── Permission Checks ────────────────────────────────────────────────────────
// Only school_admin, admin, principal, vice_principal can import/export data

// ── Import Routes ───────────────────────────────────────────────────────────

// POST /import/preview — Validate import data (dry-run)
router.post(
  '/preview',
  requirePermission(PERMISSIONS.IMPORT_WRITE),
  previewImport
);

// POST /import/commit — Commit import data
router.post(
  '/commit',
  requirePermission(PERMISSIONS.IMPORT_WRITE),
  commitImport
);

// ── Export Routes ───────────────────────────────────────────────────────────

// GET /export — Export data to CSV
router.get(
  '/',
  requirePermission(PERMISSIONS.EXPORT_READ),
  exportData
);

// ── Template Routes ─────────────────────────────────────────────────────────

// GET /import/template — Download import template
router.get(
  '/template',
  requirePermission(PERMISSIONS.IMPORT_READ),
  downloadTemplate
);

export default router;
