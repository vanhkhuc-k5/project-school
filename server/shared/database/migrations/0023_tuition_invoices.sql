-- =============================================================================
-- Migration: G29 — Tuition Invoice Management Foundation
-- Enhances tuition_invoices with line items, proper decimal handling,
-- and complete invoice lifecycle management.
-- =============================================================================

-- 1. Create invoice_line_items table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_line_items') THEN
    CREATE TABLE invoice_line_items (
      id VARCHAR(64) PRIMARY KEY,
      invoice_id VARCHAR(64) NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
      description VARCHAR(255) NOT NULL,
      quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
      unit_price DECIMAL(15,2) NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_line_items_invoice ON invoice_line_items(invoice_id);
  END IF;
END
$$;

-- 2. Create tuition_payments table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tuition_payments') THEN
    CREATE TABLE tuition_payments (
      id VARCHAR(64) PRIMARY KEY,
      invoice_id VARCHAR(64) NOT NULL REFERENCES tuition_invoices(id) ON DELETE CASCADE,
      amount DECIMAL(15,2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'other')),
      transaction_reference VARCHAR(100),
      paid_by VARCHAR(64) REFERENCES users(id),
      paid_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(32) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_payments_invoice ON tuition_payments(invoice_id);
    CREATE INDEX idx_payments_paid_by ON tuition_payments(paid_by);
  END IF;
END
$$;

-- 3. Add missing columns to tuition_invoices
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tuition_invoices') THEN
    -- Add columns if not exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tuition_invoices' AND column_name = 'school_id'
    ) THEN
      ALTER TABLE tuition_invoices ADD COLUMN school_id VARCHAR(64);
      ALTER TABLE tuition_invoices ADD COLUMN academic_year_id VARCHAR(64);
      ALTER TABLE tuition_invoices ADD COLUMN semester_id VARCHAR(64);
      ALTER TABLE tuition_invoices ADD COLUMN invoice_number VARCHAR(64);
      ALTER TABLE tuition_invoices ADD COLUMN billing_period VARCHAR(100);
      ALTER TABLE tuition_invoices ADD COLUMN subtotal DECIMAL(15,2);
      ALTER TABLE tuition_invoices ADD COLUMN discount DECIMAL(15,2) DEFAULT 0;
      ALTER TABLE tuition_invoices ADD COLUMN total DECIMAL(15,2);
      ALTER TABLE tuition_invoices ADD COLUMN amount_paid DECIMAL(15,2) DEFAULT 0;
      ALTER TABLE tuition_invoices ADD COLUMN status VARCHAR(32) DEFAULT 'draft' CHECK (status IN ('draft','issued','partial','paid','overdue','cancelled'));
      ALTER TABLE tuition_invoices ADD COLUMN payment_reference VARCHAR(100);
      ALTER TABLE tuition_invoices ADD COLUMN issued_at TIMESTAMPTZ;
      ALTER TABLE tuition_invoices ADD COLUMN paid_at TIMESTAMPTZ;
      ALTER TABLE tuition_invoices ADD COLUMN cancelled_at TIMESTAMPTZ;
      ALTER TABLE tuition_invoices ADD COLUMN cancelled_by VARCHAR(64);
      ALTER TABLE tuition_invoices ADD COLUMN cancellation_reason TEXT;
      ALTER TABLE tuition_invoices ADD COLUMN created_by VARCHAR(64);
      ALTER TABLE tuition_invoices ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Drop old columns if they exist (replace with proper ones)
    -- Note: This is for baseline migration - only run if migrating from old schema
  END IF;
END
$$;
