// =============================================================================
// AI Tutor Routes — Express Router
// G37 Production AI Tutor Architecture
// =============================================================================

import express from 'express';
import { authenticateToken, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../shared/auth/rbac.registry.js';
import {
  getMessages,
  clearMessages,
  getTopics,
  chat,
  getHealth,
  resetRateLimit,
  getStats,
} from './ai-tutor.controller.js';

const router = express.Router();

// All AI Tutor routes require authentication
router.use(authenticateToken);

// ── Public Endpoints ─────────────────────────────────────────────────────────

// GET /ai-tutor/health — Check AI service health (no permission required)
router.get('/health', getHealth);

// ── Message Endpoints ───────────────────────────────────────────────────────

// GET /ai-tutor/messages — Get conversation history
router.get('/messages', requirePermission(PERMISSIONS.AI_TUTOR_READ), getMessages);

// DELETE /ai-tutor/messages — Clear conversation history
router.delete('/messages', requirePermission(PERMISSIONS.AI_TUTOR_READ), clearMessages);

// GET /ai-tutor/topics — Get conversation topics
router.get('/topics', requirePermission(PERMISSIONS.AI_TUTOR_READ), getTopics);

// ── Chat Endpoint ───────────────────────────────────────────────────────────

// POST /ai-tutor/chat — Send message and get AI response
router.post('/chat', requirePermission(PERMISSIONS.AI_TUTOR_CHAT), chat);

// ── Stats Endpoint ──────────────────────────────────────────────────────────

// GET /ai-tutor/stats — Get usage statistics
router.get('/stats', requirePermission(PERMISSIONS.AI_TUTOR_READ), getStats);

// ── Admin Endpoints ────────────────────────────────────────────────────────

// POST /ai-tutor/admin/reset-rate — Reset rate limit for a student
router.post('/admin/reset-rate', resetRateLimit);

export default router;
