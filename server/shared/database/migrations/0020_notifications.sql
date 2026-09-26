-- =============================================================================
-- Migration: G26 — Centralized Notification Center
-- Creates a unified notifications table for in-app notifications.
-- Supports typed events from all domain modules without coupling to UI.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      data JSONB DEFAULT '{}',
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX idx_notif_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
    CREATE INDEX idx_notif_user_created ON notifications(user_id, created_at DESC);
    CREATE INDEX idx_notif_type ON notifications(type);
  END IF;
END
$$;
