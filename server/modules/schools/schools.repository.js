/**
 * Schools Module Repository
 * Database access for school configuration across PostgreSQL and SQLite.
 */

import { isPostgresConfigured, pgQuery } from '../../shared/database/index.js';
import { db } from '../../db.js';

export const schoolsRepository = {
  /**
   * Find school by ID
   */
  async findById(schoolId) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT id, code, name, short_name, email, phone, address,
               province, district, ward, principal_name, website, logo_url, status,
               created_at, updated_at
        FROM schools
        WHERE id = $1
      `, [schoolId]);
      return res.rows[0] || null;
    }

    // SQLite fallback
    return db.prepare(`
      SELECT id, code, name, short_name, email, phone, address,
             province, district, ward, principal_name, website, logo_url, status,
             created_at, updated_at
      FROM schools
      WHERE id = ?
    `).get(schoolId) || null;
  },

  /**
   * Update school profile
   */
  async update(schoolId, data) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'name', 'short_name', 'email', 'phone', 'address',
      'province', 'district', 'ward', 'principal_name', 'website', 'logo_url', 'status'
    ];

    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        fields.push(key);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) {
      return this.findById(schoolId);
    }

    if (isPostgresConfigured()) {
      const setClauses = fields.map((f, idx) => `${f} = $${idx + 1}`);
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      values.push(schoolId);

      const query = `
        UPDATE schools
        SET ${setClauses.join(', ')}
        WHERE id = $${values.length}
        RETURNING *
      `;
      const res = await pgQuery(query, values);
      return res.rows[0] || null;
    }

    // SQLite fallback
    const setClauses = fields.map((f) => `${f} = ?`);
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    values.push(schoolId);

    const query = `
      UPDATE schools
      SET ${setClauses.join(', ')}
      WHERE id = ?
    `;
    db.prepare(query).run(...values);
    return this.findById(schoolId);
  },
};
