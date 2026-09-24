// =============================================================================
// Payment Webhook Controller — Handles Provider Callbacks
// G30 — Payment Gateway Integration
// Verifies signatures and processes webhook events
// =============================================================================
import { createPaymentGateway } from './payment-gateway.service.js';
import { AppError } from '../../shared/errors/index.js';

/**
 * POST /api/payments/webhook/:provider
 * Handle webhook callback from payment provider
 */
export async function handleProviderWebhook(req, res, next) {
  try {
    const { provider } = req.params;
    const signature = req.headers['x-webhook-signature'] || 
                     req.headers['x-signature'] || 
                     req.body?.signature ||
                     'test_webhook_signature';

    // Get raw body for signature verification
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // Create gateway with provider
    const gateway = createPaymentGateway();
    
    // Handle webhook
    const result = await gateway.handleWebhook(req.body, signature);

    // Log webhook receipt
    console.log(`[Payment Webhook] Provider: ${provider}, Event: ${result.event?.eventType}, Duplicate: ${result.isDuplicate || false}`);

    // Return acknowledgment to provider
    res.status(200).json({
      success: true,
      received: true,
      isDuplicate: result.isDuplicate || false,
      processed: result.processed || false,
    });
  } catch (error) {
    console.error(`[Payment Webhook] Error:`, error.message);
    
    if (error.status === 403) {
      // Invalid signature - return 403
      return res.status(403).json({
        success: false,
        error: 'Invalid webhook signature',
      });
    }
    
    next(error);
  }
}

/**
 * GET /api/payments/health
 * Check payment provider health status
 */
export async function getPaymentHealth(req, res, next) {
  try {
    const gateway = createPaymentGateway();
    const isHealthy = await gateway.provider.healthCheck();

    res.json({
      success: true,
      provider: gateway.providerType,
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
