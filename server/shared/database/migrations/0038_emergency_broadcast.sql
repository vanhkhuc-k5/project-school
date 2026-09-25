-- =============================================================================
-- Migration 0038: Emergency Broadcast System
-- G39 — Emergency Broadcast
-- Adds is_emergency and requires_acknowledgment columns to announcements table
-- =============================================================================

-- SQLite (dev/test)
ALTER TABLE announcements ADD COLUMN is_emergency INTEGER NOT NULL DEFAULT 0;
ALTER TABLE announcements ADD COLUMN requires_acknowledgment INTEGER NOT NULL DEFAULT 0;

-- PostgreSQL: add columns if not exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'is_emergency') THEN
    ALTER TABLE announcements ADD COLUMN is_emergency INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'announcements' AND column_name = 'requires_acknowledgment') THEN
    ALTER TABLE announcements ADD COLUMN requires_acknowledgment INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
