-- =============================================================================
-- Migration: G30 — Payment Gateway Integration
-- Adds tables for webhook logging and idempotency tracking
-- =============================================================================

-- 1. Webhook logs table for duplicate detection and audit
CREATE TABLE IF NOT EXISTS webhook_logs (
  id VARCHAR(64) PRIMARY KEY,
  webhook_id VARCHAR(128) UNIQUE NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  provider_transaction_id VARCHAR(128),
  merchant_order_id VARCHAR(128),
  raw_payload TEXT,
  status VARCHAR(32) DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed', 'duplicate')),
  processed_result TEXT,
  received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider_txn ON webhook_logs(provider, provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received ON webhook_logs(received_at);

-- 2. Payment idempotency tracking
CREATE TABLE IF NOT EXISTS payment_idempotency (
  id VARCHAR(64) PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ
);

-- Add expires_at column if it doesn't exist (migration was previously applied without it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_idempotency' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE payment_idempotency ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_idempotency_key ON payment_idempotency(key);
CREATE INDEX IF NOT EXISTS idx_payment_idempotency_expires ON payment_idempotency(expires_at) WHERE expires_at IS NOT NULL;
