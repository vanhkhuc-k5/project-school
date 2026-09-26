// =============================================================================
// Leave Requests Repository — Data Access Layer
// G28 — Student Leave Requests Lifecycle
// Supports: PostgreSQL (Neon Cloud) + SQLite (local dev)
// =============================================================================
import { pgQuery, isPostgresConfigured } from '../../postgres.js';
import { db } from '../../db.js';
import { nanoid } from 'nanoid';
import { REASON_LABELS } from './leave-requests.types.js';

function parseLeaveRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    schoolId: row.school_id,
    studentId: row.student_id,
    parentId: row.parent_id,
    academicYearId: row.academic_year_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reasonType: row.reason_type,
    reasonDetail: row.reason_detail,
    emergencyPhone: row.emergency_phone,
    status: row.status,
    reviewNote: row.review_note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    cancellationReason: row.cancellation_reason,
    cancelledBy: row.cancelled_by,
    cancelledAt: row.cancelled_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Enriched fields
    studentName: row.student_name,
    parentName: row.parent_name,
    reviewerName: row.reviewer_name,
    className: row.class_name,
  };
}

export const leaveRequestRepo = {
  /**
   * Find leave request by ID.
   */
  async findById(id) {
    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        SELECT lr.*,
               s_u.name as student_name,
               p_u.name as parent_name,
               r_u.name as reviewer_name,
               c.name as class_name
        FROM leave_requests lr
        LEFT JOIN users s_u ON lr.student_id = s_u.id
        LEFT JOIN users p_u ON lr.parent_id = p_u.id
        LEFT JOIN users r_u ON lr.reviewed_by = r_u.id
        LEFT JOIN students s ON lr.student_id = s.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE lr.id = $1
      `, [id]);
      return parseLeaveRequest(res.rows[0]) || null;
    }

    const row = db.prepare(`
      SELECT lr.*,
             s_u.name as student_name,
             p_u.name as parent_name,
             r_u.name as reviewer_name,
             c.name as class_name
      FROM leave_requests lr
      LEFT JOIN users s_u ON lr.student_id = s_u.id
      LEFT JOIN users p_u ON lr.parent_id = p_u.id
      LEFT JOIN users r_u ON lr.reviewed_by = r_u.id
      LEFT JOIN students s ON lr.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE lr.id = ?
    `).get(id);
    return parseLeaveRequest(row) || null;
  },

  /**
   * Create a new leave request.
   */
  async create({ id, schoolId, studentId, parentId, academicYearId, startDate, endDate, reasonType, reasonDetail, emergencyPhone, createdBy }) {
    const reqId = id || `leave_${nanoid(12)}`;
    const now = new Date().toISOString();
    const reason = reasonDetail || REASON_LABELS[reasonType] || 'Không có mô tả';

    if (isPostgresConfigured()) {
      const res = await pgQuery(`
        INSERT INTO leave_requests (
          id, school_id, student_id, parent_id, academic_year_id,
          start_date, end_date, reason, reason_type, reason_detail, emergency_phone,
          status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $12)
        RETURNING *
      `, [reqId, schoolId, studentId, parentId, academicYearId, startDate, endDate, reason, reasonType || 'family_event', reasonDetail || null, emergencyPhone || null, now]);
      return parseLeaveRequest(res.rows[0]);
    }

    db.prepare(`
      INSERT INTO leave_requests (
        id, school_id, student_id, parent_id, academic_year_id,
        start_date, end_date, reason, reason_type, reason_detail, emergency_phone,
        status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
    `).run(reqId, schoolId, studentId, parentId, academicYearId, startDate, endDate, reason, reasonType || 'family_event', reasonDetail || null, emergencyPhone || null);

    return this.findById(reqId);
  },

  /**
   * List leave requests with filters.
   */
  async list({ schoolId, studentId, parentId, status, reviewerId, page = 1, limit = 20, startDateFrom, startDateTo }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (schoolId) {
      conditions.push(`lr.school_id = $${idx}`);
      params.push(schoolId);
      idx++;
    }
    if (studentId) {
      conditions.push(`lr.student_id = $${idx}`);
      params.push(studentId);
      idx++;
    }
    if (parentId) {
      conditions.push(`lr.parent_id = $${idx}`);
      params.push(parentId);
      idx++;
    }
    if (status) {
      conditions.push(`lr.status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (startDateFrom) {
      conditions.push(`lr.start_date >= $${idx}`);
      params.push(startDateFrom);
      idx++;
    }
    if (startDateTo) {
      conditions.push(`lr.start_date <= $${idx}`);
      params.push(startDateTo);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    if (isPostgresConfigured()) {
      const countRes = await pgQuery(
        `SELECT COUNT(*) as count FROM leave_requests lr ${whereClause}`,
        params
      );
      const total = parseInt(countRes.rows[0]?.count || '0', 10);

      const intLimit = parseInt(limit, 10);
      const intOffset = parseInt(offset, 10);
      const res = await pgQuery(`
        SELECT lr.*,
               s_u.name as student_name,
               p_u.name as parent_name,
               r_u.name as reviewer_name,
               c.name as class_name
        FROM leave_requests lr
        LEFT JOIN users s_u ON lr.student_id = s_u.id
        LEFT JOIN users p_u ON lr.parent_id = p_u.id
        LEFT JOIN users r_u ON lr.reviewed_by = r_u.id
        LEFT JOIN students s ON lr.student_id = s.id
        LEFT JOIN classes c ON s.class_id = c.id
        ${whereClause}
        ORDER BY lr.created_at DESC
        LIMIT ${intLimit} OFFSET ${intOffset}
      `, params);

      return {
        requests: res.rows.map(parseLeaveRequest),
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    // SQLite
    const total = db.prepare(`SELECT COUNT(*) as count FROM leave_requests lr ${whereClause}`).get(...params)?.count || 0;

    const rows = db.prepare(`
      SELECT lr.*,
             s_u.name as student_name,
             p_u.name as parent_name,
             r_u.name as reviewer_name,
             c.name as class_name
      FROM leave_requests lr
      LEFT JOIN users s_u ON lr.student_id = s_u.id
      LEFT JOIN users p_u ON lr.parent_id = p_u.id
      LEFT JOIN users r_u ON lr.reviewed_by = r_u.id
      LEFT JOIN students s ON lr.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      ${whereClause}
      ORDER BY lr.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      requests: rows.map(parseLeaveRequest),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  /**
   * List pending requests (for review dashboard).
   */
  async listPending({ schoolId, page = 1, limit = 20 }) {
    return this.list({ schoolId, status: 'pending', page, limit });
  },

  /**
   * Update status to reviewed (approved/rejected).
   */
  async updateStatusReviewed(id, { status, reviewNote, reviewerId }) {
    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE leave_requests
        SET status = $1, review_note = $2, reviewed_by = $3, reviewed_at = $4, updated_at = $4
        WHERE id = $5
      `, [status, reviewNote || null, reviewerId, now, id]);
      return;
    }

    db.prepare(`
      UPDATE leave_requests
      SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, reviewNote || null, reviewerId, now, id);
  },

  /**
   * Cancel a leave request.
   */
  async updateStatusCancelled(id, { cancellationReason, cancelledBy }) {
    const now = new Date().toISOString();

    if (isPostgresConfigured()) {
      await pgQuery(`
        UPDATE leave_requests
        SET status = 'cancelled', cancellation_reason = $1, cancelled_by = $2, cancelled_at = $3, updated_at = $3
        WHERE id = $4
      `, [cancellationReason || null, cancelledBy, now, id]);
      return;
    }

    db.prepare(`
      UPDATE leave_requests
      SET status = 'cancelled', cancellation_reason = ?, cancelled_by = ?, cancelled_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(cancellationReason || null, cancelledBy, now, id);
  },
};
