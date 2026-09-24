/**
 * Academic Years & Semesters Module Repository
 * Database access for academic cycles across PostgreSQL and SQLite.
 */

import { isPostgresConfigured, pgQuery } from '../../shared/database/index.js';
import { db } from '../../db.js';

export const academicYearsRepository = {
  /**
   * Find all academic years with nested semesters for a school
   */
  async findAll(schoolId) {
    if (isPostgresConfigured()) {
      const yearsRes = await pgQuery(`
        SELECT id, school_id, name,
               to_char(start_date, 'YYYY-MM-DD') as start_date,
               to_char(end_date, 'YYYY-MM-DD') as end_date,
               is_current, created_at
        FROM academic_years
        WHERE school_id = $1
        ORDER BY start_date DESC
      `, [schoolId]);

      const semestersRes = await pgQuery(`
        SELECT id, school_id, academic_year_id, name, semester_number,
               to_char(start_date, 'YYYY-MM-DD') as start_date,
               to_char(end_date, 'YYYY-MM-DD') as end_date,
               is_current, created_at
        FROM semesters
        WHERE school_id = $1
        ORDER BY semester_number ASC
      `, [schoolId]);

      const semestersByYear = {};
      for (const sem of semestersRes.rows) {
        if (!semestersByYear[sem.academic_year_id]) {
          semestersByYear[sem.academic_year_id] = [];
        }
        semestersByYear[sem.academic_year_id].push(sem);
      }

      return yearsRes.rows.map((year) => ({
        ...year,
        semesters: semestersByYear[year.id] || [],
      }));
    }

    // SQLite fallback
    const years = db.prepare(`
      SELECT id, school_id, name, start_date, end_date,
             CASE WHEN is_current = 1 THEN 1 ELSE 0 END as is_current,
             created_at
      FROM academic_years
      WHERE school_id = ?
      ORDER BY start_date DESC
    `).all(schoolId).map((y) => ({ ...y, is_current: Boolean(y.is_current) }));

    const semesters = db.prepare(`
      SELECT id, school_id, academic_year_id, name, semester_number,
             start_date, end_date,
             CASE WHEN is_current = 1 THEN 1 ELSE 0 END as is_current,
             created_at
      FROM semesters
      WHERE school_id = ?
      ORDER BY semester_number ASC
    `).all(schoolId).map((s) => ({ ...s, is_current: Boolean(s.is_current) }));

    const semestersByYear = {};
    for (const sem of semesters) {
      if (!semestersByYear[sem.academic_year_id]) {
        semestersByYear[sem.academic_year_id] = [];
      }
      semestersByYear[sem.academic_year_id].push(sem);
    }

    return years.map((year) => ({
      ...year,
      semesters: semestersByYear[year.id] || [],
    }));
  },

  /**
   * Find current active academic year and active semester
   */
  async findCurrent(schoolId) {
    if (isPostgresConfigured()) {
      const yearRes = await pgQuery(`
        SELECT id, school_id, name,
               to_char(start_date, 'YYYY-MM-DD') as start_date,
               to_char(end_date, 'YYYY-MM-DD') as end_date,
               is_current, created_at
        FROM academic_years
        WHERE school_id = $1 AND is_current = TRUE
        LIMIT 1
      `, [schoolId]);

      const currentYear = yearRes.rows[0] || null;

      let currentSemester = null;
      if (currentYear) {
        const semRes = await pgQuery(`
          SELECT id, school_id, academic_year_id, name, semester_number,
                 to_char(start_date, 'YYYY-MM-DD') as start_date,
                 to_char(end_date, 'YYYY-MM-DD') as end_date,
                 is_current, created_at
          FROM semesters
          WHERE school_id = $1 AND is_current = TRUE
          LIMIT 1
        `, [schoolId]);
        currentSemester = semRes.rows[0] || null;
      }

      return {
        academicYear: currentYear,
        currentSemester,
      };
    }

    // SQLite fallback
    const currentYear = db.prepare(`
      SELECT id, school_id, name, start_date, end_date,
             1 as is_current, created_at
      FROM academic_years
      WHERE school_id = ? AND is_current = 1
      LIMIT 1
    `).get(schoolId) || null;

    let currentSemester = null;
    if (currentYear) {
      currentSemester = db.prepare(`
        SELECT id, school_id, academic_year_id, name, semester_number,
               start_date, end_date, 1 as is_current, created_at
        FROM semesters
        WHERE school_id = ? AND is_current = 1
        LIMIT 1
      `).get(schoolId) || null;
    }

    return {
      academicYear: currentYear ? { ...currentYear, is_current: true } : null,
      currentSemester: currentSemester ? { ...currentSemester, is_current: true } : null,
    };
  },

  /**
   * Find academic year by ID with semesters
   */
  async findById(id, schoolId = null) {
    if (isPostgresConfigured()) {
      const conditions = ['id = $1'];
      const values = [id];
      if (schoolId) {
        conditions.push(`school_id = $2`);
        values.push(schoolId);
      }

      const res = await pgQuery(`
        SELECT id, school_id, name,
               to_char(start_date, 'YYYY-MM-DD') as start_date,
               to_char(end_date, 'YYYY-MM-DD') as end_date,
               is_current, created_at
        FROM academic_years
        WHERE ${conditions.join(' AND ')}
      `, values);

      const year = res.rows[0];
      if (!year) return null;

      const semRes = await pgQuery(`
        SELECT id, school_id, academic_year_id, name, semester_number,
               to_char(start_date, 'YYYY-MM-DD') as start_date,
               to_char(end_date, 'YYYY-MM-DD') as end_date,
               is_current, created_at
        FROM semesters
        WHERE academic_year_id = $1
        ORDER BY semester_number ASC
      `, [id]);

      year.semesters = semRes.rows;
      return year;
    }

    // SQLite fallback
    let query = `
      SELECT id, school_id, name, start_date, end_date,
             CASE WHEN is_current = 1 THEN 1 ELSE 0 END as is_current,
             created_at
      FROM academic_years
      WHERE id = ?
    `;
    const params = [id];
    if (schoolId) {
      query += ' AND school_id = ?';
      params.push(schoolId);
    }

    const year = db.prepare(query).get(...params);
    if (!year) return null;

    const semesters = db.prepare(`
      SELECT id, school_id, academic_year_id, name, semester_number,
             start_date, end_date,
             CASE WHEN is_current = 1 THEN 1 ELSE 0 END as is_current,
             created_at
      FROM semesters
      WHERE academic_year_id = ?
      ORDER BY semester_number ASC
    `).all(id).map((s) => ({ ...s, is_current: Boolean(s.is_current) }));

    return {
      ...year,
      is_current: Boolean(year.is_current),
      semesters,
    };
  },

  /**
   * Find overlapping academic years in the same school
   */
  async findOverlappingYears(schoolId, startDate, endDate, excludeId = null) {
    if (isPostgresConfigured()) {
      const conditions = [
        'school_id = $1',
        '(start_date <= $3::date AND end_date >= $2::date)'
      ];
      const values = [schoolId, startDate, endDate];
      if (excludeId) {
        conditions.push(`id != $${values.length + 1}`);
        values.push(excludeId);
      }

      const res = await pgQuery(`
        SELECT id, name, to_char(start_date, 'YYYY-MM-DD') as start_date, to_char(end_date, 'YYYY-MM-DD') as end_date
        FROM academic_years
        WHERE ${conditions.join(' AND ')}
      `, values);

      return res.rows;
    }

    // SQLite fallback
    let query = `
      SELECT id, name, start_date, end_date
      FROM academic_years
      WHERE school_id = ? AND (start_date <= ? AND end_date >= ?)
    `;
    const params = [schoolId, endDate, startDate];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    return db.prepare(query).all(...params);
  },

  /**
   * Check if year name already exists in school
   */
  async findByName(schoolId, name, excludeId = null) {
    if (isPostgresConfigured()) {
      const conditions = ['school_id = $1', 'LOWER(name) = LOWER($2)'];
      const values = [schoolId, name.trim()];
      if (excludeId) {
        conditions.push(`id != $3`);
        values.push(excludeId);
      }
      const res = await pgQuery(`SELECT id FROM academic_years WHERE ${conditions.join(' AND ')}`, values);
      return res.rows[0] || null;
    }

    let query = 'SELECT id FROM academic_years WHERE school_id = ? AND LOWER(name) = LOWER(?)';
    const params = [schoolId, name.trim()];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    return db.prepare(query).get(...params) || null;
  },

  /**
   * Create academic year
   */
  async createYear({ id, schoolId, name, startDate, endDate, isCurrent = false }) {
    if (isPostgresConfigured()) {
      if (isCurrent) {
        // Reset previous active year
        await pgQuery(`UPDATE academic_years SET is_current = FALSE WHERE school_id = $1`, [schoolId]);
      }

      const res = await pgQuery(`
        INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_current)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, school_id, name, to_char(start_date, 'YYYY-MM-DD') as start_date, to_char(end_date, 'YYYY-MM-DD') as end_date, is_current, created_at
      `, [id, schoolId, name, startDate, endDate, isCurrent]);

      return res.rows[0];
    }

    // SQLite fallback
    if (isCurrent) {
      db.prepare(`UPDATE academic_years SET is_current = 0 WHERE school_id = ?`).run(schoolId);
    }
    db.prepare(`
      INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_current)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, schoolId, name, startDate, endDate, isCurrent ? 1 : 0);

    return this.findById(id, schoolId);
  },

  /**
   * Update academic year
   */
  async updateYear(id, schoolId, { name, startDate, endDate, isCurrent }) {
    if (isPostgresConfigured()) {
      if (isCurrent === true) {
        await pgQuery(`UPDATE academic_years SET is_current = FALSE WHERE school_id = $1 AND id != $2`, [schoolId, id]);
      }

      const fields = [];
      const values = [];
      let idx = 1;

      if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
      if (startDate !== undefined) { fields.push(`start_date = $${idx++}`); values.push(startDate); }
      if (endDate !== undefined) { fields.push(`end_date = $${idx++}`); values.push(endDate); }
      if (isCurrent !== undefined) { fields.push(`is_current = $${idx++}`); values.push(isCurrent); }

      values.push(id);
      values.push(schoolId);

      const res = await pgQuery(`
        UPDATE academic_years
        SET ${fields.join(', ')}
        WHERE id = $${idx++} AND school_id = $${idx++}
        RETURNING id, school_id, name, to_char(start_date, 'YYYY-MM-DD') as start_date, to_char(end_date, 'YYYY-MM-DD') as end_date, is_current, created_at
      `, values);

      return res.rows[0];
    }

    // SQLite fallback
    if (isCurrent === true) {
      db.prepare(`UPDATE academic_years SET is_current = 0 WHERE school_id = ? AND id != ?`).run(schoolId, id);
    }

    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (startDate !== undefined) { fields.push('start_date = ?'); values.push(startDate); }
    if (endDate !== undefined) { fields.push('end_date = ?'); values.push(endDate); }
    if (isCurrent !== undefined) { fields.push('is_current = ?'); values.push(isCurrent ? 1 : 0); }

    values.push(id, schoolId);
    db.prepare(`UPDATE academic_years SET ${fields.join(', ')} WHERE id = ? AND school_id = ?`).run(...values);

    return this.findById(id, schoolId);
  },

  /**
   * Set academic year as current (atomic switch)
   */
  async setCurrentYear(id, schoolId) {
    if (isPostgresConfigured()) {
      await pgQuery(`UPDATE academic_years SET is_current = FALSE WHERE school_id = $1`, [schoolId]);
      await pgQuery(`UPDATE academic_years SET is_current = TRUE WHERE id = $1 AND school_id = $2`, [id, schoolId]);
      return this.findById(id, schoolId);
    }

    db.prepare(`UPDATE academic_years SET is_current = 0 WHERE school_id = ?`).run(schoolId);
    db.prepare(`UPDATE academic_years SET is_current = 1 WHERE id = ? AND school_id = ?`).run(id, schoolId);
    return this.findById(id, schoolId);
  },

  /**
   * Check historical records tied to an academic year
   */
  async hasHistoricalData(yearId) {
    if (isPostgresConfigured()) {
      const clsCheck = await pgQuery(`
        SELECT COUNT(*) as count FROM classes WHERE academic_year_id = $1
      `, [yearId]);
      return parseInt(clsCheck.rows[0]?.count || '0', 10) > 0;
    }

    const cls = db.prepare(`SELECT COUNT(*) as count FROM classes WHERE academic_year_id = ?`).get(yearId);
    return cls && cls.count > 0;
  },

  /**
   * Delete academic year
   */
  async deleteYear(id, schoolId) {
    if (isPostgresConfigured()) {
      await pgQuery(`DELETE FROM semesters WHERE academic_year_id = $1`, [id]);
      await pgQuery(`DELETE FROM academic_years WHERE id = $1 AND school_id = $2`, [id, schoolId]);
      return true;
    }

    db.prepare(`DELETE FROM semesters WHERE academic_year_id = ?`).run(id);
    db.prepare(`DELETE FROM academic_years WHERE id = ? AND school_id = ?`).run(id, schoolId);
    return true;
  },

  // --------------------------------------------------------------------------
  // SEMESTERS
  // --------------------------------------------------------------------------

  /**
   * Find semester by ID
   */
  async findSemesterById(semesterId, schoolId = null) {
    if (isPostgresConfigured()) {
      const conditions = ['id = $1'];
      const values = [semesterId];
      if (schoolId) {
        conditions.push(`school_id = $2`);
        values.push(schoolId);
      }
      const res = await pgQuery(`
        SELECT id, school_id, academic_year_id, name, semester_number,
               to_char(start_date, 'YYYY-MM-DD') as start_date,
               to_char(end_date, 'YYYY-MM-DD') as end_date,
               is_current, created_at
        FROM semesters
        WHERE ${conditions.join(' AND ')}
      `, values);
      return res.rows[0] || null;
    }

    let query = `
      SELECT id, school_id, academic_year_id, name, semester_number,
             start_date, end_date,
             CASE WHEN is_current = 1 THEN 1 ELSE 0 END as is_current,
             created_at
      FROM semesters
      WHERE id = ?
    `;
    const params = [semesterId];
    if (schoolId) {
      query += ' AND school_id = ?';
      params.push(schoolId);
    }
    const row = db.prepare(query).get(...params);
    return row ? { ...row, is_current: Boolean(row.is_current) } : null;
  },

  /**
   * Find overlapping semesters within the same academic year
   */
  async findOverlappingSemesters(yearId, startDate, endDate, excludeId = null) {
    if (isPostgresConfigured()) {
      const conditions = [
        'academic_year_id = $1',
        '(start_date <= $3::date AND end_date >= $2::date)'
      ];
      const values = [yearId, startDate, endDate];
      if (excludeId) {
        conditions.push(`id != $${values.length + 1}`);
        values.push(excludeId);
      }

      const res = await pgQuery(`
        SELECT id, name, to_char(start_date, 'YYYY-MM-DD') as start_date, to_char(end_date, 'YYYY-MM-DD') as end_date
        FROM semesters
        WHERE ${conditions.join(' AND ')}
      `, values);
      return res.rows;
    }

    let query = `
      SELECT id, name, start_date, end_date
      FROM semesters
      WHERE academic_year_id = ? AND (start_date <= ? AND end_date >= ?)
    `;
    const params = [yearId, endDate, startDate];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    return db.prepare(query).all(...params);
  },

  /**
   * Check semester number duplicate in year
   */
  async findSemesterByNumber(yearId, semesterNumber, excludeId = null) {
    if (isPostgresConfigured()) {
      const conditions = ['academic_year_id = $1', 'semester_number = $2'];
      const values = [yearId, semesterNumber];
      if (excludeId) {
        conditions.push(`id != $3`);
        values.push(excludeId);
      }
      const res = await pgQuery(`SELECT id FROM semesters WHERE ${conditions.join(' AND ')}`, values);
      return res.rows[0] || null;
    }

    let query = 'SELECT id FROM semesters WHERE academic_year_id = ? AND semester_number = ?';
    const params = [yearId, semesterNumber];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    return db.prepare(query).get(...params) || null;
  },

  /**
   * Create semester
   */
  async createSemester({ id, schoolId, academicYearId, name, semesterNumber, startDate, endDate, isCurrent = false }) {
    if (isPostgresConfigured()) {
      if (isCurrent) {
        await pgQuery(`UPDATE semesters SET is_current = FALSE WHERE school_id = $1`, [schoolId]);
      }

      const res = await pgQuery(`
        INSERT INTO semesters (id, school_id, academic_year_id, name, semester_number, start_date, end_date, is_current)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, school_id, academic_year_id, name, semester_number,
                  to_char(start_date, 'YYYY-MM-DD') as start_date,
                  to_char(end_date, 'YYYY-MM-DD') as end_date,
                  is_current, created_at
      `, [id, schoolId, academicYearId, name, semesterNumber, startDate, endDate, isCurrent]);

      return res.rows[0];
    }

    if (isCurrent) {
      db.prepare(`UPDATE semesters SET is_current = 0 WHERE school_id = ?`).run(schoolId);
    }
    db.prepare(`
      INSERT INTO semesters (id, school_id, academic_year_id, name, semester_number, start_date, end_date, is_current)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, schoolId, academicYearId, name, semesterNumber, startDate, endDate, isCurrent ? 1 : 0);

    return this.findSemesterById(id, schoolId);
  },

  /**
   * Update semester
   */
  async updateSemester(id, schoolId, { name, semesterNumber, startDate, endDate, isCurrent }) {
    if (isPostgresConfigured()) {
      if (isCurrent === true) {
        await pgQuery(`UPDATE semesters SET is_current = FALSE WHERE school_id = $1 AND id != $2`, [schoolId, id]);
      }

      const fields = [];
      const values = [];
      let idx = 1;

      if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
      if (semesterNumber !== undefined) { fields.push(`semester_number = $${idx++}`); values.push(semesterNumber); }
      if (startDate !== undefined) { fields.push(`start_date = $${idx++}`); values.push(startDate); }
      if (endDate !== undefined) { fields.push(`end_date = $${idx++}`); values.push(endDate); }
      if (isCurrent !== undefined) { fields.push(`is_current = $${idx++}`); values.push(isCurrent); }

      values.push(id, schoolId);

      const res = await pgQuery(`
        UPDATE semesters
        SET ${fields.join(', ')}
        WHERE id = $${idx++} AND school_id = $${idx++}
        RETURNING id, school_id, academic_year_id, name, semester_number,
                  to_char(start_date, 'YYYY-MM-DD') as start_date,
                  to_char(end_date, 'YYYY-MM-DD') as end_date,
                  is_current, created_at
      `, values);

      return res.rows[0];
    }

    // SQLite fallback
    if (isCurrent === true) {
      db.prepare(`UPDATE semesters SET is_current = 0 WHERE school_id = ? AND id != ?`).run(schoolId, id);
    }

    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (semesterNumber !== undefined) { fields.push('semester_number = ?'); values.push(semesterNumber); }
    if (startDate !== undefined) { fields.push('start_date = ?'); values.push(startDate); }
    if (endDate !== undefined) { fields.push('end_date = ?'); values.push(endDate); }
    if (isCurrent !== undefined) { fields.push('is_current = ?'); values.push(isCurrent ? 1 : 0); }

    values.push(id, schoolId);
    db.prepare(`UPDATE semesters SET ${fields.join(', ')} WHERE id = ? AND school_id = ?`).run(...values);

    return this.findSemesterById(id, schoolId);
  },

  /**
   * Set semester as current (atomic switch)
   */
  async setCurrentSemester(id, schoolId) {
    if (isPostgresConfigured()) {
      await pgQuery(`UPDATE semesters SET is_current = FALSE WHERE school_id = $1`, [schoolId]);
      await pgQuery(`UPDATE semesters SET is_current = TRUE WHERE id = $1 AND school_id = $2`, [id, schoolId]);
      return this.findSemesterById(id, schoolId);
    }

    db.prepare(`UPDATE semesters SET is_current = 0 WHERE school_id = ?`).run(schoolId);
    db.prepare(`UPDATE semesters SET is_current = 1 WHERE id = ? AND school_id = ?`).run(id, schoolId);
    return this.findSemesterById(id, schoolId);
  },

  /**
   * Delete semester
   */
  async deleteSemester(id, schoolId) {
    if (isPostgresConfigured()) {
      await pgQuery(`DELETE FROM semesters WHERE id = $1 AND school_id = $2`, [id, schoolId]);
      return true;
    }
    db.prepare(`DELETE FROM semesters WHERE id = ? AND school_id = ?`).run(id, schoolId);
    return true;
  },
};
