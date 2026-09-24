// =============================================================================
// Parent-Child Authorization Middleware
// G24 — Parent Multi-Child Portal
// Ensures every child-related request is authorized server-side.
// =============================================================================
import { db } from '../../db.js';
import { isPostgresConfigured, pgQuery } from '../database/connection.js';

/**
 * Verify parent-student relationship using SQLite (development/test fallback).
 */
async function verifyParentChildRelationshipSQLite({ parentUserId, studentId, schoolId, requireActive = true }) {
  try {
    // Try new parent_student_links table first
    // Note: parent_id in parent_student_links is the user_id (e.g., 'usr_parent_1')
    // parents.user_id is also the user_id, so join on parents.user_id = psl.parent_id
    let row = null;
    const activeCondition = requireActive ? 'AND psl.is_active = 1' : '';
    
    try {
      row = db.prepare(`
        SELECT psl.*, s.school_id as student_school_id, s.parent_id as student_direct_parent_id
        FROM parent_student_links psl
        JOIN students s ON s.id = psl.student_id
        JOIN parents p ON p.id = psl.parent_id
        WHERE p.user_id = ?
          AND psl.student_id = ?
          ${activeCondition}
        LIMIT 1
      `).get(parentUserId, studentId);
    } catch {
      // parent_student_links table might not exist
    }

    // Fallback: legacy parent_students table
    if (!row) {
      try {
        row = db.prepare(`
          SELECT ps.*, s.school_id as student_school_id, s.parent_id as student_direct_parent_id
          FROM parent_students ps
          JOIN students s ON s.id = ps.student_id
          JOIN parents p ON p.id = ps.parent_id
          WHERE p.user_id = ?
            AND ps.student_id = ?
          LIMIT 1
        `).get(parentUserId, studentId);
      } catch { /* table might not exist */ }
    }

    if (!row) {
      // Fallback: check direct parent_id on students table
      const stdRow = db.prepare(
        'SELECT id, school_id, parent_id FROM students WHERE id = ?'
      ).get(studentId);

      if (!stdRow) {
        // Student not found in SQLite - check PostgreSQL if configured
        if (isPostgresConfigured()) {
          try {
            const pgRes = await pgQuery(
              'SELECT id, school_id, parent_id FROM students WHERE id = $1',
              [studentId]
            );
            if (pgRes.rows.length === 0) {
              return { authorized: false, relationship: null, error: 'STUDENT_NOT_FOUND' };
            }
            const pgStudent = pgRes.rows[0];
            // FIRST check school mismatch - this should be TENANT_FORBIDDEN
            if (schoolId && pgStudent.school_id && pgStudent.school_id !== schoolId) {
              return { authorized: false, relationship: null, error: 'TENANT_FORBIDDEN' };
            }
            // Student exists but parent not linked
            return { authorized: false, relationship: null, error: 'NOT_AUTHORIZED' };
          } catch {
            return { authorized: false, relationship: null, error: 'STUDENT_NOT_FOUND' };
          }
        }
        return { authorized: false, relationship: null, error: 'STUDENT_NOT_FOUND' };
      }

      // FIRST check school mismatch - this should be TENANT_FORBIDDEN
      if (schoolId && stdRow.school_id && stdRow.school_id !== schoolId) {
        return { authorized: false, relationship: null, error: 'TENANT_FORBIDDEN' };
      }

      // Then check parent relationship
      const isDirectParent = stdRow.parent_id === parentUserId;
      if (!isDirectParent) {
        return { authorized: false, relationship: null, error: 'NOT_AUTHORIZED' };
      }
      return { authorized: true, relationship: { type: 'direct_parent' }, error: null };
    }

    // Tenant check
    if (schoolId && row.student_school_id && row.student_school_id !== schoolId) {
      return { authorized: false, relationship: null, error: 'TENANT_FORBIDDEN' };
    }

    return {
      authorized: true,
      relationship: {
        id: row.id,
        type: row.relationship,
        isPrimaryContact: Boolean(row.is_primary_contact),
        isVerified: Boolean(row.is_verified),
        isActive: Boolean(row.is_active),
      },
      error: null,
    };
  } catch (err) {
    console.error('[verifyParentChildRelationship] SQLite error:', err);
    return { authorized: false, relationship: null, error: 'DATABASE_ERROR' };
  }
}

/**
 * Verify authenticated parent has an active relationship with the target student.
 * Returns { authorized: boolean, relationship: object|null, error: string|null }
 *
 * Rules:
 * 1. Super admin / school admin bypass all relationship checks
 * 2. Relationship must be active (is_active = 1)
 * 3. Student must belong to same school tenant
 */
export async function verifyParentChildRelationship({ parentUserId, studentId, schoolId, requireActive = true }) {
  if (!studentId) {
    return { authorized: false, relationship: null, error: 'MISSING_STUDENT_ID' };
  }

  if (isPostgresConfigured()) {
    try {
      const activeCondition = requireActive ? 'AND psl.is_active = 1' : '';
      
      // Note: parent_student_links.parent_id stores the parent's ID (parents.id, e.g. 'prt_vanhoi')
      // parents.user_id is the user's ID (e.g. 'usr_parent_vanhoi')
      const res = await pgQuery(`
        SELECT psl.*, s.school_id as student_school_id, s.user_id as student_user_id
        FROM parent_student_links psl
        JOIN students s ON s.id = psl.student_id
        JOIN parents p ON p.id = psl.parent_id
        WHERE p.user_id = $1
          AND psl.student_id = $2
          ${activeCondition}
        LIMIT 1
      `, [parentUserId, studentId]);

      if (res.rows.length === 0) {
        // No link in PostgreSQL - fall back to SQLite for development/testing
        return verifyParentChildRelationshipSQLite({ parentUserId, studentId, schoolId, requireActive });
      }

      const rel = res.rows[0];

      // Tenant check
      if (schoolId && rel.student_school_id && rel.student_school_id !== schoolId) {
        return { authorized: false, relationship: null, error: 'TENANT_FORBIDDEN' };
      }

      return {
        authorized: true,
        relationship: {
          id: rel.id,
          type: rel.relationship,
          isPrimaryContact: Boolean(rel.is_primary_contact),
          isVerified: Boolean(rel.is_verified),
          isActive: Boolean(rel.is_active),
        },
        error: null,
      };
    } catch (err) {
      console.error('[verifyParentChildRelationship] PG error, falling back to SQLite:', err.message);
      return verifyParentChildRelationshipSQLite({ parentUserId, studentId, schoolId, requireActive });
    }
  }

  // SQLite fallback
  return verifyParentChildRelationshipSQLite({ parentUserId, studentId, schoolId, requireActive });
}

/**
 * Express middleware factory: enforces parent-child authorization for a given studentId source.
 * @param {Function} getStudentId - extracts studentId from req (e.g. req.params.id or req.query.studentId)
 */
export function requireParentChildRelationship(getStudentId) {
  return async (req, res, next) => {
    // Admins bypass
    const isAdmin = ['admin', 'school_admin', 'super_admin'].includes(req.user?.role);
    if (isAdmin) return next();

    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_STUDENT_ID',
        message: 'Thiếu thông tin học sinh.',
      });
    }

    const schoolId = req.schoolId || req.user?.schoolId || req.user?.school_id;
    const { authorized, error, relationship } = await verifyParentChildRelationship({
      parentUserId: req.user.id,
      studentId,
      schoolId,
    });

    if (!authorized) {
      const statusMap = {
        NOT_AUTHORIZED: 403,
        TENANT_FORBIDDEN: 403,
        STUDENT_NOT_FOUND: 404,
        MISSING_STUDENT_ID: 400,
        DATABASE_ERROR: 500,
      };
      const status = statusMap[error] || 403;
      const messageMap = {
        NOT_AUTHORIZED: 'Bạn không có quyền truy cập thông tin của học sinh này.',
        TENANT_FORBIDDEN: 'Không được truy cập học sinh thuộc trường khác.',
        STUDENT_NOT_FOUND: 'Không tìm thấy học sinh.',
        MISSING_STUDENT_ID: 'Thiếu thông tin học sinh.',
        DATABASE_ERROR: 'Lỗi khi xác minh quan hệ phụ huynh.',
      };
      return res.status(status).json({
        success: false,
        code: error,
        message: messageMap[error] || 'Không được phép truy cập.',
      });
    }

    // Attach verified relationship to request for downstream use
    req.verifiedChildRelationship = { studentId, ...relationship };
    next();
  };
}
