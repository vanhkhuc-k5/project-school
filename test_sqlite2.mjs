// Test exact query from repository
import Database from 'better-sqlite3';

const db = new Database(':memory:');
db.pragma('journal_mode = WAL');

db.exec(`CREATE TABLE announcements (
  id TEXT PRIMARY KEY, school_id TEXT, title TEXT NOT NULL, content TEXT NOT NULL,
  summary TEXT, scope TEXT DEFAULT 'all', priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'draft', class_id TEXT, subject_id TEXT,
  scheduled_publish_at DATETIME, published_at DATETIME, published_by TEXT,
  author_id TEXT, author_name TEXT, attachments TEXT DEFAULT '[]',
  target_roles TEXT, target_class_ids TEXT, category_id TEXT,
  is_active INTEGER DEFAULT 1, archived_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

db.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT)`);
db.exec(`CREATE TABLE announcement_reads (id TEXT PRIMARY KEY, announcement_id TEXT, user_id TEXT, read_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

db.exec(`INSERT INTO announcements VALUES ('a1','sch_bacau','Test','Content',NULL,'all','important','published',NULL,NULL,NULL,datetime('now'),NULL,NULL,'Admin','[]',NULL,NULL,NULL,1,NULL,datetime('now'),datetime('now'))`);
db.exec(`INSERT INTO users VALUES ('admin_user','Admin Name')`);
db.exec(`INSERT INTO announcement_reads VALUES ('ar1','a1','admin_user',datetime('now'))`);

// Simulate getAnnouncementsForUser for admin role
const role = 'admin';
const roleScopeMap = {
  student: ['all', 'student'],
  teacher: ['all', 'teacher'],
  parent: ['all', 'parent'],
  admin: ['all', 'student', 'teacher', 'parent', 'admin'],
  school_admin: ['all', 'student', 'teacher', 'parent', 'admin'],
  super_admin: ['all', 'student', 'teacher', 'parent', 'admin'],
  principal: ['all', 'student', 'teacher', 'parent', 'admin'],
  vice_principal: ['all', 'student', 'teacher', 'parent', 'admin'],
};
const rawScopes = roleScopeMap[role] || ['all'];
const safeScopes = rawScopes.length > 0 ? rawScopes : ['all'];
const allowedScopes = safeScopes;

console.log('allowedScopes:', allowedScopes, 'count:', allowedScopes.length);
const scopeIn = allowedScopes.map(() => '?').join(',');
console.log('scopeIn:', scopeIn);

const userId = 'admin_user';
const schoolId = 'sch_bacau';
const now = new Date().toISOString();
const limit = 10, offset = 0;

const query = `
  SELECT a.*, COALESCE(u.name, a.author_name, a.sender_name) as author_name,
         (SELECT COUNT(*) FROM announcement_reads ar WHERE ar.announcement_id = a.id) as read_count,
         EXISTS(SELECT 1 FROM announcement_reads ar WHERE ar.announcement_id = a.id AND ar.user_id = ?) as is_read
  FROM announcements a
  LEFT JOIN users u ON a.sender_id = u.id
  WHERE a.status = 'published'
    AND a.is_active = 1
    AND (school_id = ? OR school_id IS NULL)
    AND scope IN (${scopeIn})
    AND (scheduled_publish_at IS NULL OR scheduled_publish_at <= ?)
  ORDER BY
    CASE priority WHEN 'urgent' THEN 1 WHEN 'important' THEN 2 ELSE 3 END,
    published_at DESC
  LIMIT ? OFFSET ?
`;

const params = [userId, schoolId, ...allowedScopes, now, limit, offset];
console.log('Params count:', params.length);
console.log('Expected: userId(1) + schoolId(1) + allowedScopes(5) + now(1) + limit(1) + offset(1) = 10');

try {
  const rows = db.prepare(query).all(...params);
  console.log('SUCCESS! Rows:', rows.length);
  rows.forEach(r => console.log(' -', r.title, 'scope:', r.scope, 'is_read:', r.is_read));
} catch(err) {
  console.error('ERROR:', err.message);
}

db.close();
