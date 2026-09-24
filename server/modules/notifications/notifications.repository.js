// =============================================================================
// Notifications Repository — Data Access Layer for G26 Notification Center
// Supports both legacy (recipient_id on PostgreSQL) and new (user_id) schemas.
// =============================================================================
import { db } from '../../db.js';
import { isPostgresConfigured, pgQuery } from '../../shared/database/connection.js';
import { ALL_NOTIFICATION_TYPES } from './notifications.types.js';

/**
 * Detect which column to use for user ID.
 * PostgreSQL has legacy 'recipient_id'; SQLite uses our new 'user_id'.
 */
function getUserIdColumn() {
  return isPostgresConfigured() ? 'recipient_id' : 'user_id';
}

/**
 * Generate a notification ID.
 * @returns {string}
 */
function generateId() {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Parse a notification row from either DB driver.
 * Handles both schema variants.
 */
function parseNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id || row.recipient_id || null,
    type: row.type,
    title: row.title,
    message: row.message || '',
    data: (() => {
      if (!row.data) return {};
      if (typeof row.data === 'object') return row.data;
      try { return JSON.parse(row.data); } catch { return {}; }
    })(),
    isRead: Boolean(row.is_read ?? row.isRead ?? 0),
    readAt: row.read_at || row.readAt || null,
    createdAt: row.created_at || row.createdAt || null,
  };
}

// ── CREATE ─────────────────────────────────────────────────────────────────

/**
 * Insert a single notification.
 * @param {{ userId, type, title, message?, data? }} params
 * @returns {Promise<object>} the created notification
 */
export async function createNotification({ userId, type, title, message = '', data = {} }) {
  const id = generateId();
  const dataJson = JSON.stringify(data);
  const uidCol = getUserIdColumn();

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      INSERT INTO notifications (id, ${uidCol}, type, title, message, data, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, current_timestamp)
      RETURNING *
    `, [id, userId, type, title, message, dataJson]);
    return parseNotification(res.rows[0]);
  }

  db.prepare(`
    INSERT INTO notifications (id, ${uidCol}, type, title, message, data, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `).run(id, userId, type, title, message, dataJson);

  return getNotificationById(id);
}

/**
 * Create multiple notifications in one call (batch insert).
 * @param {Array<{ userId, type, title, message?, data? }>} notifications
 * @returns {Promise<number>} count of created notifications
 */
export async function createNotificationsBatch(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return 0;

  const uidCol = getUserIdColumn();
  let count = 0;

  if (isPostgresConfigured()) {
    const values = [];
    const params = [];
    for (const n of notifications) {
      const id = generateId();
      values.push(`($${params.length + 1}, $${params.length + 2}, $${params.length + 3}, $${params.length + 4}, $${params.length + 5}, $${params.length + 6})`);
      params.push(id, n.userId, n.type, n.title, n.message || '', JSON.stringify(n.data || {}));
    }
    await pgQuery(`
      INSERT INTO notifications (id, ${uidCol}, type, title, message, data)
      VALUES ${values.join(', ')}
    `, params);
    count = notifications.length;
  } else {
    const insert = db.prepare(`
      INSERT INTO notifications (id, ${uidCol}, type, title, message, data, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `);
    const tx = db.transaction((items) => {
      for (const n of items) {
        insert.run(generateId(), n.userId, n.type, n.title, n.message || '', JSON.stringify(n.data || {}));
        count++;
      }
    });
    tx(notifications);
  }

  return count;
}

// ── READ ─────────────────────────────────────────────────────────────────────

/**
 * Get a single notification by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getNotificationById(id) {
  if (isPostgresConfigured()) {
    const res = await pgQuery('SELECT * FROM notifications WHERE id = $1', [id]);
    return parseNotification(res.rows[0]);
  }
  return parseNotification(db.prepare('SELECT * FROM notifications WHERE id = ?').get(id));
}

/**
 * Get unread count for a specific user.
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getUnreadCount(userId) {
  const uidCol = getUserIdColumn();

  if (isPostgresConfigured()) {
    const res = await pgQuery(
      `SELECT COUNT(*) as count FROM notifications WHERE ${uidCol} = $1 AND is_read = FALSE`,
      [userId]
    );
    return parseInt(res.rows[0].count, 10);
  }
  return db.prepare(
    `SELECT COUNT(*) as count FROM notifications WHERE ${uidCol} = ? AND is_read = 0`
  ).get(userId)?.count || 0;
}

/**
 * List notifications for a user (paginated).
 * @param {{ userId, type?, page, limit }} params
 * @returns {{ notifications: object[], pagination: { total, page, limit, totalPages } }}
 */
export async function listNotificationsForUser({ userId, type = null, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const uidCol = getUserIdColumn();

  if (isPostgresConfigured()) {
    // PostgreSQL: build WHERE with $N placeholders
    const conditions = [`n.${uidCol} = $1`];
    const params = [userId];
    let idx = 2;
    if (type && ALL_NOTIFICATION_TYPES.includes(type)) {
      conditions.push(`n.type = $${idx}`);
      params.push(type);
      idx++;
    }
    const whereClause = conditions.join(' AND ');

    const countRes = await pgQuery(
      `SELECT COUNT(*) as count FROM notifications n WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const intLimit = parseInt(limit, 10);
    const intOffset = parseInt(offset, 10);
    const dataRes = await pgQuery(`
      SELECT * FROM notifications n
      WHERE ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ${intLimit} OFFSET ${intOffset}
    `, params);

    return {
      notifications: dataRes.rows.map(parseNotification),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // SQLite: use ? placeholders
  const conditions = [`n.${uidCol} = ?`];
  const params = [userId];
  if (type && ALL_NOTIFICATION_TYPES.includes(type)) {
    conditions.push('n.type = ?');
    params.push(type);
  }
  const whereClause = conditions.join(' AND ');

  const total = db.prepare(
    `SELECT COUNT(*) as count FROM notifications n WHERE ${whereClause}`
  ).get(...params)?.count || 0;

  const rows = db.prepare(`
    SELECT * FROM notifications n
    WHERE ${whereClause}
    ORDER BY n.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return {
    notifications: rows.map(parseNotification),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ── UPDATE ──────────────────────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 * @param {{ notificationId, userId }} params
 * @returns {Promise<object|null>}
 */
export async function markAsRead({ notificationId, userId }) {
  const uidCol = getUserIdColumn();

  if (isPostgresConfigured()) {
    await pgQuery(`
      UPDATE notifications
      SET is_read = TRUE, read_at = current_timestamp
      WHERE id = $1 AND ${uidCol} = $2 AND is_read = FALSE
    `, [notificationId, userId]);
  } else {
    db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = datetime('now')
      WHERE id = ? AND ${uidCol} = ? AND is_read = 0
    `).run(notificationId, userId);
  }

  return getNotificationById(notificationId);
}

/**
 * Mark all notifications as read for a user.
 * @param {string} userId
 * @returns {Promise<number>} count of updated rows
 */
export async function markAllAsRead(userId) {
  const uidCol = getUserIdColumn();

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      UPDATE notifications
      SET is_read = TRUE, read_at = current_timestamp
      WHERE ${uidCol} = $1 AND is_read = FALSE
    `, [userId]);
    return res.rowCount || 0;
  }

  const result = db.prepare(`
    UPDATE notifications
    SET is_read = 1, read_at = datetime('now')
    WHERE ${uidCol} = ? AND is_read = 0
  `).run(userId);
  return result.changes;
}

// ── DELETE / CLEANUP ────────────────────────────────────────────────────────

/**
 * Delete notifications older than the specified days.
 * @param {number} olderThanDays
 * @returns {Promise<number>} count of deleted rows
 */
export async function deleteOldNotifications(olderThanDays = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const cutoffStr = cutoff.toISOString();

  if (isPostgresConfigured()) {
    const res = await pgQuery(`
      DELETE FROM notifications WHERE created_at < $1
    `, [cutoffStr]);
    return res.rowCount || 0;
  }

  const result = db.prepare(`
    DELETE FROM notifications WHERE created_at < ?
  `).run(cutoffStr);
  return result.changes;
}

/**
 * Delete a single notification (owner only).
 * @param {{ notificationId, userId }} params
 * @returns {Promise<boolean>}
 */
export async function deleteNotification({ notificationId, userId }) {
  const uidCol = getUserIdColumn();

  if (isPostgresConfigured()) {
    const res = await pgQuery(
      `DELETE FROM notifications WHERE id = $1 AND ${uidCol} = $2`,
      [notificationId, userId]
    );
    return (res.rowCount || 0) > 0;
  }
  const result = db.prepare(
    `DELETE FROM notifications WHERE id = ? AND ${uidCol} = ?`
  ).run(notificationId, userId);
  return result.changes > 0;
}
