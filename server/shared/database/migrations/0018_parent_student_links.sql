-- =============================================================================
-- Migration: Parent-Student Relationship Links with Active/Inactive Status
-- Adds relationship management table for secure multi-child parent portal.
-- G24 — Parent Multi-Child Portal
-- =============================================================================

-- Parent-student relationship link table (many-to-many)
CREATE TABLE IF NOT EXISTS parent_student_links (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  -- 'father', 'mother', 'guardian', 'grandparent', 'other'
  is_primary_contact INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  -- Inactive links: parent can still see historical data but not current info
  verified_at DATETIME,
  verified_by TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(parent_id, student_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent ON parent_student_links(parent_id, is_active);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_student ON parent_student_links(student_id, is_active);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_active ON parent_student_links(parent_id, student_id, is_active);
