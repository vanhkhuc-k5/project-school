/**
 * Auth Module Persistence Repository
 * PostgreSQL-first data access layer with session, token, and account security management.
 */

import {
  query as pgQuery,
  isPostgresConfigured,
  db,
} from '../../shared/database/index.js';

export class AuthRepository {
  /**
   * Find user by identifier (email, username, or code) with optional role filter.
   * @param {string} cleanIdentifier
   * @param {string} [role]
   * @returns {Promise<any>}
   */
  async findByIdentifier(cleanIdentifier, role) {
    if (isPostgresConfigured()) {
      if (role) {
        const qRole = `
          SELECT id, username, email, role, name, code, phone, avatar, password_hash,
                 must_change_password, school_id, status, failed_login_attempts,
                 locked_until, token_version
          FROM users
          WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) OR LOWER(code) = LOWER($1))
          AND role = $2
          LIMIT 1
        `;
        const resRole = await pgQuery(qRole, [cleanIdentifier, role]);
        if (resRole.rows.length > 0) {
          return resRole.rows[0];
        }
      }

      const qAny = `
        SELECT id, username, email, role, name, code, phone, avatar, password_hash,
               must_change_password, school_id, status, failed_login_attempts,
               locked_until, token_version
        FROM users
        WHERE (LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) OR LOWER(code) = LOWER($1))
        LIMIT 1
      `;
      const resAny = await pgQuery(qAny, [cleanIdentifier]);
      return resAny.rows[0] || null;
    }

    // SQLite fallback
    if (role) {
      const user = db
        .prepare(`
          SELECT id, username, email, role, name, code, phone, avatar, password_hash,
                 must_change_password, school_id, status, failed_login_attempts,
                 locked_until, token_version
          FROM users
          WHERE (LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) OR LOWER(code) = LOWER(?))
          AND role = ?
        `)
        .get(cleanIdentifier, cleanIdentifier, cleanIdentifier, role);
      if (user) return user;
    }

    return (
      db
        .prepare(`
          SELECT id, username, email, role, name, code, phone, avatar, password_hash,
                 must_change_password, school_id, status, failed_login_attempts,
                 locked_until, token_version
          FROM users
          WHERE (LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?) OR LOWER(code) = LOWER(?))
        `)
        .get(cleanIdentifier, cleanIdentifier, cleanIdentifier) || null
    );
  }

  /**
   * Find user profile by primary ID.
   * @param {string} id
   * @returns {Promise<any>}
   */
  async findById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        `SELECT id, username, email, role, name, code, phone, avatar, password_hash,
                must_change_password, school_id, status, failed_login_attempts,
                locked_until, token_version
         FROM users WHERE id = $1`,
        [id]
      );
      return res.rows[0] || null;
    }

    return (
      db
        .prepare(
          `SELECT id, username, email, role, name, code, phone, avatar, password_hash,
                  must_change_password, school_id, status, failed_login_attempts,
                  locked_until, token_version
           FROM users WHERE id = ?`
        )
        .get(id) || null
    );
  }

  /**
   * Find user by email address.
   * @param {string} email
   * @returns {Promise<any>}
   */
  async findByEmail(email) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        'SELECT id, username, email, name, role, school_id, status FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email]
      );
      return res.rows[0] || null;
    }

    return (
      db
        .prepare('SELECT id, username, email, name, role, school_id, status FROM users WHERE LOWER(email) = LOWER(?)')
        .get(email) || null
    );
  }

  /**
   * Check if username or email is already taken.
   * @param {string} username
   * @param {string} email
   * @returns {Promise<any>}
   */
  async findByUsernameOrEmail(username, email) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2) LIMIT 1',
        [username, email]
      );
      return res.rows[0] || null;
    }

    return (
      db
        .prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)')
        .get(username, email) || null
    );
  }

  /**
   * Increment failed login attempts counter and return new count.
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async incrementFailedLogin(userId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        'UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1 WHERE id = $1 RETURNING failed_login_attempts',
        [userId]
      );
      return res.rows[0]?.failed_login_attempts || 1;
    }

    db.prepare('UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1 WHERE id = ?').run(userId);
    const row = db.prepare('SELECT failed_login_attempts FROM users WHERE id = ?').get(userId);
    return row?.failed_login_attempts || 1;
  }

  /**
   * Reset failed login counter and clear lockout.
   * @param {string} userId
   */
  async resetFailedLogin(userId) {
    if (isPostgresConfigured()) {
      await pgQuery('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [userId]);
      return;
    }
    db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?').run(userId);
  }

  /**
   * Lock account until a specific timestamp.
   * @param {string} userId
   * @param {Date} lockedUntil
   */
  async lockAccount(userId, lockedUntil) {
    const iso = lockedUntil.toISOString();
    if (isPostgresConfigured()) {
      await pgQuery('UPDATE users SET locked_until = $1 WHERE id = $2', [iso, userId]);
      return;
    }
    db.prepare('UPDATE users SET locked_until = ? WHERE id = ?').run(iso, userId);
  }

  /**
   * Update password hash, increment token_version (revoking previous JWTs), and record timestamp.
   * @param {string} userId
   * @param {string} newPasswordHash
   */
  async updatePassword(userId, newPasswordHash) {
    if (isPostgresConfigured()) {
      await pgQuery(
        `UPDATE users
         SET password_hash = $1,
             must_change_password = false,
             password_changed_at = NOW(),
             token_version = COALESCE(token_version, 1) + 1,
             failed_login_attempts = 0,
             locked_until = NULL
         WHERE id = $2`,
        [newPasswordHash, userId]
      );
      return;
    }

    db.prepare(
      `UPDATE users
       SET password_hash = ?,
           must_change_password = 0,
           password_changed_at = CURRENT_TIMESTAMP,
           token_version = COALESCE(token_version, 1) + 1,
           failed_login_attempts = 0,
           locked_until = NULL
       WHERE id = ?`
    ).run(newPasswordHash, userId);
  }

  /**
   * Insert a new user into storage.
   * @param {{ id: string, username: string, email: string, passwordHash: string, role: string, name: string, code?: string|null, phone?: string|null, school_id?: string|null }} userData
   */
  async createUser(userData) {
    const { id, username, email, passwordHash, role, name, code, phone, school_id, schoolId } = userData;
    const finalSchoolId = school_id || schoolId || 'sch_bacau';

    if (isPostgresConfigured()) {
      await pgQuery(
        `INSERT INTO users (id, username, email, password_hash, role, name, code, phone, school_id, status, token_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', 1)`,
        [id, username, email, passwordHash, role, name, code || null, phone || null, finalSchoolId]
      );
      return;
    }

    db.prepare(
      `INSERT INTO users (id, username, email, password_hash, role, name, code, phone, school_id, status, token_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 1)`
    ).run(id, username, email, passwordHash, role, name, code || null, phone || null, finalSchoolId);
  }

  // ========================================================================
  // REFRESH TOKENS & SESSION MANAGEMENT
  // ========================================================================

  /**
   * Persist a new refresh token record.
   * @param {{ id: string, userId: string, tokenHash: string, familyId: string, expiresAt: Date, userAgent?: string, ipAddress?: string }} tokenData
   */
  async createRefreshToken(tokenData) {
    const { id, userId, tokenHash, familyId, expiresAt, userAgent, ipAddress } = tokenData;
    const expIso = expiresAt.toISOString();

    if (isPostgresConfigured()) {
      await pgQuery(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, is_revoked, expires_at, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, FALSE, $5, $6, $7)`,
        [id, userId, tokenHash, familyId, expIso, userAgent || null, ipAddress || null]
      );
      return;
    }

    db.prepare(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, is_revoked, expires_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)`
    ).run(id, userId, tokenHash, familyId, expIso, userAgent || null, ipAddress || null);
  }

  /**
   * Look up refresh token by SHA-256 hash.
   * @param {string} tokenHash
   * @returns {Promise<any>}
   */
  async findRefreshTokenByHash(tokenHash) {
    if (isPostgresConfigured()) {
      const res = await pgQuery('SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1', [tokenHash]);
      return res.rows[0] || null;
    }

    return db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(tokenHash) || null;
  }

  /**
   * Revoke a specific refresh token by ID.
   * @param {string} id
   */
  async revokeRefreshToken(id) {
    if (isPostgresConfigured()) {
      await pgQuery('UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1', [id]);
      return;
    }
    db.prepare('UPDATE refresh_tokens SET is_revoked = 1 WHERE id = ?').run(id);
  }

  /**
   * Revoke all tokens in a family (e.g. upon token reuse / theft detection).
   * @param {string} familyId
   */
  async revokeFamily(familyId) {
    if (isPostgresConfigured()) {
      await pgQuery('UPDATE refresh_tokens SET is_revoked = TRUE WHERE family_id = $1', [familyId]);
      return;
    }
    db.prepare('UPDATE refresh_tokens SET is_revoked = 1 WHERE family_id = ?').run(familyId);
  }

  /**
   * Revoke all refresh tokens for a user and increment token version.
   * @param {string} userId
   */
  async revokeAllUserTokens(userId) {
    if (isPostgresConfigured()) {
      await pgQuery('UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1', [userId]);
      await pgQuery('UPDATE users SET token_version = COALESCE(token_version, 1) + 1 WHERE id = $1', [userId]);
      return;
    }
    db.prepare('UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?').run(userId);
    db.prepare('UPDATE users SET token_version = COALESCE(token_version, 1) + 1 WHERE id = ?').run(userId);
  }

  // ========================================================================
  // PASSWORD RESETS
  // ========================================================================

  /**
   * Save a password reset request.
   * @param {{ id: string, userId: string, tokenHash: string, expiresAt: Date }} resetData
   */
  async createPasswordReset(resetData) {
    const { id, userId, tokenHash, expiresAt } = resetData;
    const expIso = expiresAt.toISOString();

    if (isPostgresConfigured()) {
      await pgQuery(
        `INSERT INTO password_resets (id, user_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [id, userId, tokenHash, expIso]
      );
      return;
    }

    db.prepare(
      `INSERT INTO password_resets (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`
    ).run(id, userId, tokenHash, expIso);
  }

  /**
   * Find an active password reset record by token hash.
   * @param {string} tokenHash
   * @returns {Promise<any>}
   */
  async findPasswordResetByHash(tokenHash) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(
        'SELECT * FROM password_resets WHERE token_hash = $1 AND used_at IS NULL LIMIT 1',
        [tokenHash]
      );
      return res.rows[0] || null;
    }

    return db.prepare('SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL').get(tokenHash) || null;
  }

  /**
   * Mark password reset token as consumed.
   * @param {string} id
   */
  async markPasswordResetUsed(id) {
    if (isPostgresConfigured()) {
      await pgQuery('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [id]);
      return;
    }
    db.prepare('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  }
}

export const authRepository = new AuthRepository();
