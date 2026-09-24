// Minimal SQLite test for announcements query
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(import.meta.dirname, 'database.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    school_id TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    scope TEXT DEFAULT 'all',
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'draft',
    published_at DATETIME,
    author_id TEXT,
    author_name TEXT,
    attachments TEXT DEFAULT '[]',
    target_roles TEXT,
    target_class_ids TEXT,
    category_id TEXT,
    is_active INTEGER DEFAULT 1,
    archived_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed data
const now = new Date().toISOString();
const seedStmt = db.prepare(`
  INSERT OR IGNORE INTO announcements (id, school_id, title, content, scope, priority, status, author_name, published_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
seedStmt.run('ann_001', 'sch_bacau', 'Test', 'Content', 'all', 'important', 'published', 'Admin', now);
seedStmt.run('ann_002', 'sch_bacau', 'Student', 'Content', 'student', 'normal', 'published', 'Admin', now);

// Test query with admin role (7 scopes)
const adminScopes = ['all', 'student', 'teacher', 'parent', 'admin'];
const scopeIn = adminScopes.map(() => '?').join(',');
const userId = 'user_admin_001';
const schoolId = 'sch_bacau';
const dt = new Date().toISOString();

console.log('Query:', `
  SELECT a.* FROM announcements a
  WHERE a.status = 'published'
    AND a.is_active = 1
    AND (school_id = ? OR school_id IS NULL)
    AND scope IN (${scopeIn})
    AND (scheduled_publish_at IS NULL OR scheduled_publish_at <= ?)
  LIMIT ? OFFSET ?
`);
console.log('Params:', [userId, schoolId, dt, ...adminScopes, 10, 0]);
console.log('Param count:', 2 + adminScopes.length + 3);

try {
  const rows = db.prepare(`
    SELECT a.* FROM announcements a
    WHERE a.status = 'published'
      AND a.is_active = 1
      AND (school_id = ? OR school_id IS NULL)
      AND scope IN (${scopeIn})
      AND (scheduled_publish_at IS NULL OR scheduled_publish_at <= ?)
    LIMIT ? OFFSET ?
  `).all(userId, schoolId, dt, ...adminScopes, 10, 0);
  console.log('Query OK! Rows:', rows.length);
  console.log(rows.map(r => r.title));
} catch (err) {
  console.error('Query ERROR:', err.message);
}

db.close();
