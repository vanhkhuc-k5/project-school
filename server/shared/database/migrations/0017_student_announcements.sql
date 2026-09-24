-- =============================================================================
-- Migration: Student Announcements Domain
-- Adds announcements table and student-facing API route.
-- G23 — Student Academic Pages
-- =============================================================================

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  -- Scope: who this announcement is for
  -- 'all' = everyone, 'student' = students only, 'teacher' = teachers only,
  -- 'parent' = parents only, 'class' = specific class
  scope TEXT DEFAULT 'all' CHECK(scope IN ('all', 'student', 'teacher', 'parent', 'admin')),
  -- Optional: target specific class or student
  class_id TEXT,
  subject_id TEXT,
  -- Priority
  priority TEXT DEFAULT 'normal' CHECK(priority IN ('normal', 'important', 'urgent')),
  -- Publication
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  author_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ann_school_scope ON announcements(school_id, scope);
CREATE INDEX IF NOT EXISTS idx_ann_class ON announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_ann_published ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_ann_active ON announcements(is_active);

-- Permissions: students can only read active announcements scoped to students or all
-- CRUD is admin-only (managed via admin routes)
