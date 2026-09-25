// =============================================================================
// Payment Routes — Express Router
// G30 — Payment Gateway Integration
// G38 — Sandbox payment simulation endpoint
// =============================================================================
import express from 'express';
import {
  handleProviderWebhook,
  simulateSandboxPayment,
} from './payments.controller.js';

const router = express.Router();

// Sandbox simulation — dev/test only (no auth required for testing)
router.post('/sandbox/simulate-payment', simulateSandboxPayment);

// Webhook endpoint - NO auth required (providers use signature verification)
router.post('/webhook/:provider', handleProviderWebhook);

export const paymentsRoutes = router;
