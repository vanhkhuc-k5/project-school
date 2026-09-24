// =============================================================================
// Announcements Repository — Data Access Layer
// G25 — Production Announcements
// =============================================================================
import { db } from '../../db.js';
import { isPostgresConfigured, pgQuery } from '../../shared/database/connection.js';

function parseAnn(ann) {
  return {
    ...ann,
    // Map sender_* (baseline schema) to author_* (new schema)
    authorId: ann.author_id || ann.sender_id || null,
    authorName: ann.author_name || ann.sender_name || null,
    // Ensure legacy sender_* fields are also exposed
    senderId: ann.sender_id || null,
    senderName: ann.sender_name || null,
    priority: ann.priority || 'normal',
    scope: ann.scope || 'all',
    status: ann.status || 'draft',
    isActive: Boolean(ann.is_active ?? ann.isActive ?? 1),
    publishedAt: ann.published_at || ann.publishedAt || null,
    scheduledPublishAt: ann.scheduled_publish_at || ann.scheduledPublishAt || null,
    archivedAt: ann.archived_at || ann.archivedAt || null,
    createdAt: ann.created_at || ann.createdAt || null,
    updatedAt: ann.updated_at || ann.updatedAt || null,
    targetRoles: ann.target_roles || ann.targetRoles || null,
    targetClassIds: ann.target_class_ids || ann.targetClassIds || null,
    attachments: ann.attachments ? (typeof ann.attachments === 'string' ? JSON.parse(ann.attachments) : ann.attachments) : [],
    classId: ann.class_id || ann.classId || null,
    subjectId: ann.subject_id || ann.subjectId || null,
    schoolId: ann.school_id || ann.schoolId || null,
  };
}

// ── CREATE ───────────────────────────────────────────────────────────────────

export async function createAnnouncement({ data, schoolId, authorId, authorName }) {
  const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const attachments = data.attachments ? JSON.stringify(data.attachments) : '[]';
  const targetRoles = data.targetRoles ? JSON.stringify(data.targetRoles) : null;
  const targetClassIds = data.targetClassIds ? JSON.stringify(data.targetClassIds) : null;

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      INSERT INTO announcements (
        id, school_id, title, content, summary, scope, priority, status,
        class_id, subject_id, scheduled_publish_at, sender_id, sender_name,
        attachments, target_roles, target_class_ids, category_id,
        is_active, published_at, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,TRUE,$18,current_timestamp,current_timestamp)
      RETURNING *
    `, [
      id, schoolId, data.title, data.content, data.summary || null,
      data.scope || 'all', data.priority || 'normal', data.status || 'draft',
      data.classId || null, data.subjectId || null,
      data.scheduledPublishAt || null, authorId, authorName || 'Admin',
      attachments, targetRoles, targetClassIds,
      data.categoryId || null,
      data.status === 'published' ? now : null,
    ]);
    return parseAnn(res.rows[0]);
  }

  db.prepare(`
    INSERT INTO announcements (
      id, school_id, title, content, summary, scope, priority, status,
      class_id, subject_id, scheduled_publish_at, sender_id, sender_name,
      attachments, target_roles, target_class_ids, category_id,
      is_active, published_at, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,datetime('now'),datetime('now'))
  `).run(
    id, schoolId, data.title, data.content, data.summary || null,
    data.scope || 'all', data.priority || 'normal', data.status || 'draft',
    data.classId || null, data.subjectId || null,
    data.scheduledPublishAt || null, authorId, authorName || 'Admin',
    attachments, targetRoles, targetClassIds,
    data.categoryId || null,
    data.status === 'published' ? now : null,
  );

  return getAnnouncementById(id);
}

// ── READ ──────────────────────────────────────────────────────────────────────

export async function getAnnouncementById(id) {
  let row;
  if (isPostgresConfigured()) {
    const res = await pgQuery('SELECT * FROM announcements WHERE id = $1', [id]);
    row = res.rows[0];
  } else {
    row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
  }
  return row ? parseAnn(row) : null;
}

export async function listAnnouncements({ filters = {}, schoolId, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];
  let paramIdx = 1;

  if (schoolId) {
    conditions.push(`(a.school_id = $${paramIdx} OR a.school_id IS NULL)`);
    params.push(schoolId);
    paramIdx++;
  }

  if (filters.status) {
    conditions.push(`a.status = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  if (filters.scope) {
    conditions.push(`a.scope = $${paramIdx}`);
    params.push(filters.scope);
    paramIdx++;
  }

  if (filters.priority) {
    conditions.push(`a.priority = $${paramIdx}`);
    params.push(filters.priority);
    paramIdx++;
  }

  if (filters.categoryId) {
    conditions.push(`a.category_id = $${paramIdx}`);
    params.push(filters.categoryId);
    paramIdx++;
  }

  if (filters.search) {
    conditions.push(`(a.title ILIKE $${paramIdx} OR a.content ILIKE $${paramIdx})`);
    params.push(`%${filters.search}%`);
    paramIdx++;
  }

  if (filters.authorId) {
    conditions.push(`(a.author_id = $${paramIdx} OR a.sender_id = $${paramIdx})`);
    params.push(filters.authorId);
    paramIdx++;
  }

  if (filters.fromDate) {
    conditions.push(`a.published_at >= $${paramIdx}`);
    params.push(filters.fromDate);
    paramIdx++;
  }

  if (filters.toDate) {
    conditions.push(`a.published_at <= $${paramIdx}`);
    params.push(filters.toDate);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');
  const orderBy = `ORDER BY CASE a.priority WHEN 'urgent' THEN 1 WHEN 'important' THEN 2 ELSE 3 END, a.published_at DESC`;

  let total;
  let rows;

  if (isPostgresConfigured()) {
    const countRes = await pgQuery(
      `SELECT COUNT(*) as count FROM announcements a WHERE ${whereClause}`,
      params
    );
    total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pgQuery(
      `SELECT a.*, COALESCE(u.name, a.author_name, a.sender_name) as author_name,
              (SELECT COUNT(*) FROM announcement_reads ar WHERE ar.announcement_id = a.id) as read_count
       FROM announcements a
       LEFT JOIN users u ON a.sender_id = u.id
       WHERE ${whereClause}
       ${orderBy}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );
    rows = dataRes.rows;
  } else {
    total = db.prepare(`SELECT COUNT(*) as count FROM announcements a WHERE ${whereClause}`).get(...params)?.count || 0;

    rows = db.prepare(`
      SELECT a.*, COALESCE(u.name, a.author_name, a.sender_name) as author_name,
             (SELECT COUNT(*) FROM announcement_reads ar WHERE ar.announcement_id = a.id) as read_count
      FROM announcements a
      LEFT JOIN users u ON a.sender_id = u.id
      WHERE ${whereClause}
      ${orderBy.replace('ILIKE', 'LIKE')}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
  }

  return {
    announcements: rows.map(parseAnn),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Get announcements visible to a specific user (audience targeting).
 * Applies role-based and class-based filtering.
 */
export async function getAnnouncementsForUser({ userId, role, schoolId, classId, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  // Role mapping: map user role → announcement scope
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

  if (isPostgresConfigured()) {
    // PostgreSQL: explicit parameterized query with clear structure
    const scopes = allowedScopes;
    // sqlParams: schoolId, then scopes (limit/offset added separately at the end)
    const sqlParams = [schoolId, ...scopes];
    
    // Build WHERE clause with safe scopes
    let whereParts = [
      `a.status = 'published'`,
      `a.is_active = TRUE`,
      `(a.school_id = $1 OR a.school_id IS NULL)`,
    ];
    
    // Add scope filter (using IN)
    if (scopes.length > 0) {
      const scopeVals = scopes.map((_, i) => `$${i + 2}`).join(',');
      whereParts.push(`(a.scope IN (${scopeVals}) OR a.scope = 'all')`);
    }
    
    // Add class filter if provided
    if (classId) {
      whereParts.push(`(a.scope != 'class' OR a.scope = 'class' AND a.class_id = $${sqlParams.length + 1})`);
      sqlParams.push(classId);
    }
    
    whereParts.push(`(a.scheduled_publish_at IS NULL OR a.scheduled_publish_at <= current_timestamp)`);
    
    const whereClause = `WHERE ${whereParts.join(' AND ')}`;
    
    // Build the full query with userId for read status
    // Use simpler IN clause for scopes to avoid type inference issues
    // Placeholders: $1=userId, $2=schoolId, $3=limit, $4=offset, $5-$N=scopes
    const scopeFilter = scopes.length > 0 
      ? `(a.scope IN (${scopes.map((_, i) => `$${i + 5}`).join(',')}) OR a.scope = 'all')`
      : `a.scope = 'all'`;
    
    // userId first, schoolId second, limit third, offset fourth, then scopes
    const readParams = [userId || '__no_user__', schoolId, Number(limit), Number(offset), ...scopes];
    
    const res = await pgQuery(`
      SELECT a.*, COALESCE(u.name, a.author_name, a.sender_name) as author_name,
             (SELECT COUNT(*) FROM announcement_reads ar WHERE ar.announcement_id = a.id) as read_count,
             EXISTS(SELECT 1 FROM announcement_reads ar WHERE ar.announcement_id = a.id AND ar.user_id = $1) as is_read
      FROM announcements a
      LEFT JOIN users u ON a.sender_id = u.id
      WHERE a.status = 'published'
        AND a.is_active = TRUE
        AND (a.school_id = $2 OR a.school_id IS NULL)
        AND ${scopeFilter}
        AND (a.scheduled_publish_at IS NULL OR a.scheduled_publish_at <= current_timestamp)
      ORDER BY CASE a.priority WHEN 'urgent' THEN 1 WHEN 'important' THEN 2 ELSE 3 END, a.published_at DESC
      LIMIT $3::integer OFFSET $4::integer
    `, readParams);

    // Count query (same structure but no limit/offset)
    // Placeholders: $1=schoolId, $2-$N=scopes
    const countScopeFilter = scopes.length > 0 
      ? `(a.scope IN (${scopes.map((_, i) => `$${i + 2}`).join(',')}) OR a.scope = 'all')`
      : `a.scope = 'all'`;
    const countParams = [schoolId, ...scopes];
    const countRes = await pgQuery(`
      SELECT COUNT(*) as count FROM announcements a
      WHERE a.status = 'published'
        AND a.is_active = TRUE
        AND (a.school_id = $1 OR a.school_id IS NULL)
        AND ${countScopeFilter}
        AND (a.scheduled_publish_at IS NULL OR a.scheduled_publish_at <= current_timestamp)
    `, countParams);

    return {
      announcements: res.rows.map(r => ({ ...parseAnn(r), isRead: r.is_read })),
      pagination: {
        total: parseInt(countRes.rows[0].count, 10),
        page, limit,
        totalPages: Math.ceil(parseInt(countRes.rows[0].count, 10) / limit),
      },
    };
  }

  // SQLite: build IN clause manually
  const scopeIn = allowedScopes.map(() => '?').join(',');
  const now = new Date().toISOString();

  // Build class filter (used in query via positional param)
  const _classFilter = classId
    ? `AND (scope != 'class' OR scope = 'class' AND class_id = ?)`
    : '';

  const rows = db.prepare(`
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
  `).all(
    userId, schoolId, ...allowedScopes, now, limit, offset
  );

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM announcements
    WHERE status = 'published'
      AND is_active = 1
      AND (school_id = ? OR school_id IS NULL)
      AND scope IN (${scopeIn})
      AND (scheduled_publish_at IS NULL OR scheduled_publish_at <= ?)
  `).get(schoolId, ...allowedScopes, now)?.count || 0;

  return {
    announcements: rows.map(r => ({ ...parseAnn(r), isRead: Boolean(r.is_read) })),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ── UPDATE ─────────────────────────────────────────────────────────────────────

export async function updateAnnouncement({ id, data, editorId }) {
  const existing = await getAnnouncementById(id);
  if (!existing) return null;

  const updates = [];
  const params = [];
  let idx = 1;

  const fieldMap = {
    title: 'title', content: 'content', summary: 'summary',
    scope: 'scope', priority: 'priority',
    classId: 'class_id', subjectId: 'subject_id',
    categoryId: 'category_id',
    scheduledPublishAt: 'scheduled_publish_at',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      updates.push(`${col} = $${idx}`);
      params.push(data[key]);
      idx++;
    }
  }

  if (data.targetRoles !== undefined) {
    updates.push(`target_roles = $${idx}`);
    params.push(data.targetRoles ? JSON.stringify(data.targetRoles) : null);
    idx++;
  }

  if (data.targetClassIds !== undefined) {
    updates.push(`target_class_ids = $${idx}`);
    params.push(data.targetClassIds ? JSON.stringify(data.targetClassIds) : null);
    idx++;
  }

  if (data.attachments !== undefined) {
    updates.push(`attachments = $${idx}`);
    params.push(JSON.stringify(data.attachments || []));
    idx++;
  }

  if (data.status !== undefined) {
    updates.push(`status = $${idx}`);
    params.push(data.status);
    idx++;
    if (data.status === 'published' && !existing.publishedAt) {
      updates.push(`published_at = $${idx}`);
      params.push(new Date().toISOString());
      idx++;
      updates.push(`published_by = $${idx}`);
      params.push(editorId);
      idx++;
    }
    if (data.status === 'archived') {
      updates.push(`archived_at = $${idx}`);
      params.push(new Date().toISOString());
      idx++;
    }
  }

  if (updates.length === 0) return existing;

  updates.push(`updated_at = $${idx}`);
  params.push(new Date().toISOString());
  idx++;
  params.push(id);

  if (isPostgresConfigured()) {
    await pgQuery(`UPDATE announcements SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  } else {
    db.prepare(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  return getAnnouncementById(id);
}

// ── PUBLISH ───────────────────────────────────────────────────────────────────

export async function publishAnnouncement({ id, publishedBy, scheduledPublishAt = null }) {
  if (scheduledPublishAt) {
    // Schedule for later
    if (isPostgresConfigured()) {
      await pgQuery(
        `UPDATE announcements SET status = 'draft', scheduled_publish_at = $1, updated_at = current_timestamp WHERE id = $2`,
        [scheduledPublishAt, id]
      );
    } else {
      db.prepare(
        `UPDATE announcements SET status = 'draft', scheduled_publish_at = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(scheduledPublishAt, id);
    }
  } else {
    // Publish immediately
    if (isPostgresConfigured()) {
      await pgQuery(
        `UPDATE announcements SET status = 'published', published_at = current_timestamp, published_by = $1, updated_at = current_timestamp WHERE id = $2`,
        [publishedBy, id]
      );
    } else {
      db.prepare(
        `UPDATE announcements SET status = 'published', published_at = datetime('now'), published_by = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(publishedBy, id);
    }
  }
  return getAnnouncementById(id);
}

// ── ARCHIVE ──────────────────────────────────────────────────────────────────

export async function archiveAnnouncement(id) {
  if (isPostgresConfigured()) {
    await pgQuery(
      `UPDATE announcements SET status = 'archived', archived_at = current_timestamp, is_active = FALSE, updated_at = current_timestamp WHERE id = $1`,
      [id]
    );
  } else {
    db.prepare(
      `UPDATE announcements SET status = 'archived', archived_at = datetime('now'), is_active = 0, updated_at = datetime('now') WHERE id = ?`
    ).run(id);
  }
  return getAnnouncementById(id);
}

// ── DELETE ─────────────────────────────────────────────────────────────────────

export async function deleteAnnouncement(id) {
  if (isPostgresConfigured()) {
    await pgQuery('DELETE FROM announcements WHERE id = $1', [id]);
  } else {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  }
}

// ── READ TRACKING ─────────────────────────────────────────────────────────────

export async function markAnnouncementAsRead({ announcementId, userId }) {
  const id = `ann_read_${Date.now()}`;

  if (isPostgresConfigured()) {
    // PostgreSQL: upsert in one query
    await pgQuery(`
      INSERT INTO announcement_reads (id, announcement_id, user_id, read_at)
      VALUES ($1, $2, $3, current_timestamp)
      ON CONFLICT (announcement_id, user_id) DO UPDATE SET read_at = current_timestamp
    `, [id, announcementId, userId]);
  } else {
    // SQLite: try UPDATE first, then INSERT if no row updated
    const updateResult = db.prepare(
      `UPDATE announcement_reads SET read_at = datetime('now') WHERE announcement_id = ? AND user_id = ?`
    ).run(announcementId, userId);
    if (updateResult.changes === 0) {
      db.prepare(
        `INSERT INTO announcement_reads (id, announcement_id, user_id, read_at) VALUES (?, ?, ?, datetime('now'))`
      ).run(id, announcementId, userId);
    }
  }
}

export async function getReadCount(announcementId) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(
      `SELECT COUNT(*) as count FROM announcement_reads WHERE announcement_id = $1`,
      [announcementId]
    );
    return parseInt(res.rows[0].count, 10);
  }
  return db.prepare(
    `SELECT COUNT(*) as count FROM announcement_reads WHERE announcement_id = ?`
  ).get(announcementId)?.count || 0;
}

// ── CATEGORIES ────────────────────────────────────────────────────────────────

export async function listCategories({ schoolId } = {}) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(
      `SELECT * FROM announcement_categories WHERE school_id = $1 OR school_id IS NULL ORDER BY sort_order ASC`,
      [schoolId]
    );
    return res.rows;
  }
  return db.prepare(
    `SELECT * FROM announcement_categories WHERE school_id = ? OR school_id IS NULL ORDER BY sort_order ASC`
  ).all(schoolId);
}

// ── RECIPIENT QUERY (for notification targeting) ─────────────────────────────

/**
 * Get the list of user IDs who should receive a notification for an announcement.
 * Resolves scope + targetRoles + targetClassIds → actual user IDs.
 *
 * @param {object} announcement — parsed announcement row
 * @returns {Promise<Array<{ id, role }>>}
 */
export async function getAnnouncementRecipients(announcement) {
  const schoolId = announcement.schoolId || announcement.school_id;
  const scope = announcement.scope || 'all';
  const targetRoles = announcement.targetRoles || announcement.target_roles;
  const targetClassIds = announcement.targetClassIds || announcement.target_class_ids;

  // Parse target roles from DB (PostgreSQL TEXT[], SQLite JSON string)
  let rolesToNotify = [];
  if (targetRoles) {
    if (Array.isArray(targetRoles)) {
      rolesToNotify = targetRoles;
    } else if (typeof targetRoles === 'string') {
      try { rolesToNotify = JSON.parse(targetRoles); } catch { rolesToNotify = []; }
    }
  }

  // Parse target class IDs
  let classIds = [];
  if (targetClassIds) {
    if (Array.isArray(targetClassIds)) {
      classIds = targetClassIds;
    } else if (typeof targetClassIds === 'string') {
      try { classIds = JSON.parse(targetClassIds); } catch { classIds = []; }
    }
  }

  // Build user query based on scope
  if (isPostgresConfigured()) {
    const conditions = ['u.is_active = TRUE'];
    const params = [];
    let idx = 1;

    if (schoolId) {
      conditions.push(`(u.school_id = $${idx} OR u.school_id IS NULL)`);
      params.push(schoolId);
      idx++;
    }

    // Scope-based filtering
    if (scope === 'class' && classIds.length > 0) {
      // Students in target classes
      conditions.push(`(
        (u.role = 'student' AND u.id IN (
          SELECT s.user_id FROM students s
          JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = TRUE
          WHERE ce.class_id = ANY($${idx}::text[])
        ))
      )`);
      params.push(classIds);
      idx++;
    } else if (scope === 'teacher') {
      conditions.push(`u.role = 'teacher'`);
    } else if (scope === 'parent') {
      conditions.push(`u.role = 'parent'`);
    } else if (scope === 'student') {
      conditions.push(`u.role = 'student'`);
    } else if (rolesToNotify.length > 0) {
      // Specific roles targeted
      const rolePlaceholders = rolesToNotify.map((_, i) => `$${idx + i}`).join(',');
      conditions.push(`u.role IN (${rolePlaceholders})`);
      params.push(...rolesToNotify);
      idx += rolesToNotify.length;
    }
    // 'all' scope: no role filter — all active users in school

    const whereClause = conditions.join(' AND ');
    const res = await pgQuery(`
      SELECT u.id, u.role
      FROM users u
      WHERE ${whereClause}
      LIMIT 500
    `, params);
    return res.rows.map((r) => ({ id: r.id, role: r.role }));
  }

  // SQLite fallback
  const conditions = ['u.is_active = 1'];
  const params = [];

  if (schoolId) {
    conditions.push(`(u.school_id = ? OR u.school_id IS NULL)`);
    params.push(schoolId);
  }

  if (scope === 'class' && classIds.length > 0) {
    const classPlaceholders = classIds.map(() => '?').join(',');
    conditions.push(`(
      (u.role = 'student' AND u.id IN (
        SELECT s.user_id FROM students s
        JOIN class_enrollments ce ON ce.student_id = s.id AND ce.is_current = 1
        WHERE ce.class_id IN (${classPlaceholders})
      ))
    )`);
    params.push(...classIds);
  } else if (scope === 'teacher') {
    conditions.push(`u.role = 'teacher'`);
  } else if (scope === 'parent') {
    conditions.push(`u.role = 'parent'`);
  } else if (scope === 'student') {
    conditions.push(`u.role = 'student'`);
  } else if (rolesToNotify.length > 0) {
    const rolePlaceholders = rolesToNotify.map(() => '?').join(',');
    conditions.push(`u.role IN (${rolePlaceholders})`);
    params.push(...rolesToNotify);
  }

  const whereClause = conditions.join(' AND ');
  const rows = db.prepare(`
    SELECT u.id, u.role
    FROM users u
    WHERE ${whereClause}
    LIMIT 500
  `).all(...params);
  return rows.map((r) => ({ id: r.id, role: r.role }));
}
