-- =============================================================================
-- Migration: Production Announcements Domain (G25)
-- Enhances the announcements table with draft/publish lifecycle,
-- scheduled publication, archive, read tracking, and audience targeting.
-- =============================================================================

-- 1. Add missing columns to announcements table
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'
  CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scheduled_publish_at DATETIME;

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS archived_at DATETIME;

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS published_by TEXT;

-- Audience targeting columns
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_roles TEXT[];

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_class_ids TEXT[];

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Summary/excerpt for list view
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS summary TEXT;

-- Attachment URLs (JSON array)
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachments TEXT DEFAULT '[]';

-- 2. Announcement reads tracking (who read what)
CREATE TABLE IF NOT EXISTS announcement_reads (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(announcement_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ann_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_ann_status_school ON announcements(status, school_id);
CREATE INDEX IF NOT EXISTS idx_ann_scheduled ON announcements(scheduled_publish_at) WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS idx_ann_archived ON announcements(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reads_announcement ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_reads_user ON announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_reads_user_ann ON announcement_reads(user_id, announcement_id);

-- 3. Announcement categories for organizing
CREATE TABLE IF NOT EXISTS announcement_categories (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#1C6FA8',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed default categories
INSERT OR IGNORE INTO announcement_categories (id, school_id, name, color, icon, sort_order)
VALUES
  ('cat_general', 'sch_bacau', 'Thông báo chung', '#1C6FA8', 'megaphone', 1),
  ('cat_academic', 'sch_bacau', 'Học vụ', '#2E8B57', 'book-open', 2),
  ('cat_event', 'sch_bacau', 'Sự kiện', '#9333EA', 'calendar', 3),
  ('cat_urgent', 'sch_bacau', 'Khẩn cấp', '#DC2626', 'alert-triangle', 4),
  ('cat_parent', 'sch_bacau', 'Phụ huynh', '#D97706', 'users', 5);
