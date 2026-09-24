// =============================================================================
// Payment Routes — Express Router
// G30 — Payment Gateway Integration
// =============================================================================
import express from 'express';
import {
  handleProviderWebhook,
} from './payments.controller.js';

const router = express.Router();

// Webhook endpoint - NO auth required (providers use signature verification)
router.post('/webhook/:provider', handleProviderWebhook);

export const paymentsRoutes = router;
