// =============================================================================
// AI Tutor Repository — Database Operations
// G37 Production AI Tutor Architecture
// Supports both PostgreSQL (Neon Cloud) and SQLite (offline dev fallback)
// =============================================================================

import { isPostgresConfigured, pgQuery } from '../../shared/database/index.js';
import { db } from '../../db.js';

/**
 * Execute a query against the active database (PostgreSQL or SQLite).
 * @param {string} pgSql - PostgreSQL syntax query with $1, $2 placeholders
 * @param {string} sqliteSql - SQLite syntax query with ? placeholders
 * @param {any[]} params - Query parameters
 */
async function execQuery(pgSql, sqliteSql, params) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(pgSql, params);
    return res.rows;
  }
  return db.prepare(sqliteSql).all(...params);
}

/**
 * Execute a mutation query against the active database.
 * @param {string} pgSql - PostgreSQL syntax
 * @param {string} sqliteSql - SQLite syntax
 * @param {any[]} params - Query parameters
 */
async function execRun(pgSql, sqliteSql, params) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(pgSql, params);
    return { changes: res.rowCount || 0, lastInsertRowid: null };
  }
  return db.prepare(sqliteSql).run(...params);
}

/**
 * Execute a scalar query.
 * @param {string} pgSql - PostgreSQL syntax
 * @param {string} sqliteSql - SQLite syntax
 * @param {any[]} params - Query parameters
 */
async function execGet(pgSql, sqliteSql, params) {
  if (isPostgresConfigured()) {
    const res = await pgQuery(pgSql, params);
    return res.rows[0] || null;
  }
  return db.prepare(sqliteSql).get(...params) || null;
}

// ── Row mappers ──────────────────────────────────────────────────────────────

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id,
    topic: row.topic,
    sender: row.sender,
    text: row.text,
    aiContent: row.ai_content ? JSON.parse(row.ai_content) : null,
    createdAt: row.created_at || row.createdAt,
  };
}

// ============================================================================
// AI Conversation Repository
// ============================================================================

export const conversationRepo = {

  /**
   * Save a message to the conversation
   */
  async saveMessage({ id, studentId, topic, sender, text, aiContent = null }) {
    const aiContentJson = aiContent ? JSON.stringify(aiContent) : null;

    await execRun(
      `INSERT INTO ai_tutor_messages (id, student_id, topic, sender, text, ai_content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      `INSERT OR IGNORE INTO ai_tutor_messages (id, student_id, topic, sender, text, ai_content, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, studentId, topic, sender, text, aiContentJson]
    );

    return { id, studentId, topic, sender, text };
  },

  /**
   * Get conversation history for a student
   */
  async getConversationHistory(studentId, options = {}) {
    const { limit = 50, topic } = options;

    let pgSql = `
      SELECT id, student_id, topic, sender, text, ai_content, created_at
      FROM ai_tutor_messages
      WHERE student_id = $1
    `;
    let sqliteSql = `
      SELECT id, student_id, topic, sender, text, ai_content, created_at
      FROM ai_tutor_messages
      WHERE student_id = ?
    `;

    const pgParams = [studentId];
    const sqliteParams = [studentId];

    if (topic) {
      pgSql += ` AND topic = $2`;
      sqliteSql += ` AND topic = ?`;
      pgParams.push(topic);
      sqliteParams.push(topic);
    }

    // LIMIT: $2 if no topic, $3 if topic present
    const limitIdx = topic ? 3 : 2;
    pgSql += ` ORDER BY created_at ASC LIMIT $${limitIdx}`;
    sqliteSql += ` ORDER BY created_at ASC LIMIT ?`;
    pgParams.push(limit);
    sqliteParams.push(limit);

    if (isPostgresConfigured()) {
      const res = await pgQuery(pgSql, pgParams);
      return res.rows.map(mapRow);
    }
    return db.prepare(sqliteSql).all(...sqliteParams).map(mapRow);
  },

  /**
   * Get message by ID
   */
  async getMessageById(id) {
    return execGet(
      `SELECT * FROM ai_tutor_messages WHERE id = $1`,
      `SELECT * FROM ai_tutor_messages WHERE id = ?`,
      [id]
    );
  },

  /**
   * Delete conversation for a student
   */
  async deleteConversation(studentId, topic = null) {
    if (topic) {
      const res = await execRun(
        `DELETE FROM ai_tutor_messages WHERE student_id = $1 AND topic = $2`,
        `DELETE FROM ai_tutor_messages WHERE student_id = ? AND topic = ?`,
        [studentId, topic]
      );
      return res.changes;
    }
    const res = await execRun(
      `DELETE FROM ai_tutor_messages WHERE student_id = $1`,
      `DELETE FROM ai_tutor_messages WHERE student_id = ?`,
      [studentId]
    );
    return res.changes;
  },

  /**
   * Count messages for a student
   */
  async countMessages(studentId, topic = null) {
    if (topic) {
      const row = await execGet(
        `SELECT COUNT(*) as count FROM ai_tutor_messages WHERE student_id = $1 AND topic = $2`,
        `SELECT COUNT(*) as count FROM ai_tutor_messages WHERE student_id = ? AND topic = ?`,
        [studentId, topic]
      );
      return parseInt(row?.count || 0, 10);
    }
    const row = await execGet(
      `SELECT COUNT(*) as count FROM ai_tutor_messages WHERE student_id = $1`,
      `SELECT COUNT(*) as count FROM ai_tutor_messages WHERE student_id = ?`,
      [studentId]
    );
    return parseInt(row?.count || 0, 10);
  },

  /**
   * Get unique topics for a student
   */
  async getStudentTopics(studentId) {
    return execQuery(
      `SELECT DISTINCT topic, COUNT(*) as message_count, MAX(created_at) as last_message
       FROM ai_tutor_messages
       WHERE student_id = $1
       GROUP BY topic
       ORDER BY last_message DESC`,
      `SELECT DISTINCT topic, COUNT(*) as message_count, MAX(created_at) as last_message
       FROM ai_tutor_messages
       WHERE student_id = ?
       GROUP BY topic
       ORDER BY last_message DESC`,
      [studentId]
    );
  },

  /**
   * Get conversation statistics for a student
   */
  async getConversationStats(studentId) {
    return execGet(
      `SELECT
         COUNT(*) as total_messages,
         COUNT(DISTINCT topic) as topic_count,
         MIN(created_at) as first_message,
         MAX(created_at) as last_message,
         SUM(CASE WHEN sender = 'user' THEN 1 ELSE 0 END) as user_messages,
         SUM(CASE WHEN sender = 'ai' THEN 1 ELSE 0 END) as ai_messages
       FROM ai_tutor_messages
       WHERE student_id = $1`,
      `SELECT
         COUNT(*) as total_messages,
         COUNT(DISTINCT topic) as topic_count,
         MIN(created_at) as first_message,
         MAX(created_at) as last_message,
         SUM(CASE WHEN sender = 'user' THEN 1 ELSE 0 END) as user_messages,
         SUM(CASE WHEN sender = 'ai' THEN 1 ELSE 0 END) as ai_messages
       FROM ai_tutor_messages
       WHERE student_id = ?`,
      [studentId]
    );
  },
};
