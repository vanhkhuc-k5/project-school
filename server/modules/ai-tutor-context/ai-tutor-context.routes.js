// =============================================================================
// AI Tutor Context Routes — G38 Safe Academic Context
// =============================================================================

import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requirePermission } from '../../shared/auth/rbac.middleware.js';
import {
  getContextConfig,
  getAvailableContext,
  buildContext,
  previewContext,
  getContextSources,
  validateContextRequest,
} from './ai-tutor-context.controller.js';

const router = express.Router();

// ── Public Endpoints (no auth required) ────────────────────────────────────

// GET /ai-tutor-context/config — Context configuration summary
router.get('/config', getContextConfig);

// ── Protected Endpoints (auth + permission required) ────────────────────────────

// GET /ai-tutor-context/sources
router.get('/sources', authenticateToken, requirePermission('ai_tutor.read'), getContextSources);

// GET /ai-tutor-context/available
router.get('/available', authenticateToken, requirePermission('ai_tutor.read'), getAvailableContext);

// POST /ai-tutor-context/build
router.post('/build', authenticateToken, requirePermission('ai_tutor.chat'), buildContext);

// POST /ai-tutor-context/preview
router.post('/preview', authenticateToken, requirePermission('ai_tutor.read'), previewContext);

// POST /ai-tutor-context/validate
router.post('/validate', authenticateToken, requirePermission('ai_tutor.read'), validateContextRequest);

export default router;
