// =============================================================================
// Payments Module — Entry Point
// G30 — Payment Gateway Integration
// =============================================================================
import { paymentsRoutes } from './payments.routes.js';
export { paymentsRoutes };
export { PaymentGatewayService, createPaymentGateway } from './payment-gateway.service.js';
export { PaymentProvider, PaymentProviderFactory } from './payment-provider.interface.js';
export { MockPaymentProvider } from './providers/mock.provider.js';
export * from './payment-provider.types.js';
