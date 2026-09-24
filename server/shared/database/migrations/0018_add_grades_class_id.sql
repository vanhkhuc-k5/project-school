-- Migration: Add class_id to grades table for bulk-enter workflow
-- Adds class_id column to grades table if it doesn't exist

-- PostgreSQL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'grades' AND column_name = 'class_id') THEN
    ALTER TABLE grades ADD COLUMN class_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'grades' AND column_name = 'locked_at') THEN
    ALTER TABLE grades ADD COLUMN locked_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'grades' AND column_name = 'locked_by') THEN
    ALTER TABLE grades ADD COLUMN locked_by TEXT;
  END IF;
END $$;
