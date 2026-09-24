// =============================================================================
// Audit Controller — HTTP Handlers
// G36 Centralized Audit Trail
// =============================================================================
import { auditService } from './audit.service.js';
import { 
  AUDIT_EVENTS,
  AUDIT_SEVERITY,
  AUDIT_CATEGORIES,
  AUDIT_ENTITY_TYPES 
} from './audit.types.js';

/**
 * Extract user ID from request
 */
function getUserId(req) {
  return req.user?.id || req.user?.userId || req.user?.sub || null;
}

/**
 * Extract school ID from request
 */
function getSchoolId(req) {
  return req.user?.schoolId || req.user?.school_id || null;
}

/**
 * Extract user role from request
 */
function getUserRole(req) {
  return req.user?.role || null;
}

// ── Query Endpoints ──────────────────────────────────────────────────────────

/**
 * GET /audit/logs — Query audit logs with filters
 */
export async function queryAuditLogs(req, res, next) {
  try {
    const {
      actorId,
      action,
      entityType,
      entityId,
      schoolId,
      severity,
      category,
      startDate,
      endDate,
      correlationId,
      page,
      limit,
    } = req.query;

    // Authorization: Only admins, principals can query audit logs
    const role = getUserRole(req);
    if (!['admin', 'school_admin', 'principal', 'vice_principal', 'super_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Chỉ quản trị viên mới có quyền truy vấn nhật ký kiểm toán',
      });
    }

    // School scoping: Non-super admins can only see their school's logs
    const targetSchoolId = schoolId || getSchoolId(req);
    const isSuperAdmin = role === 'super_admin';

    const result = await auditService.query({
      actorId,
      action,
      entityType,
      entityId,
      schoolId: isSuperAdmin ? targetSchoolId : targetSchoolId,
      severity,
      category,
      startDate,
      endDate,
      correlationId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /audit/logs/:id — Get single audit log entry
 */
export async function getAuditLog(req, res, next) {
  try {
    const { id } = req.params;

    // Authorization: Only admins can view individual logs
    const role = getUserRole(req);
    if (!['admin', 'school_admin', 'principal', 'vice_principal', 'super_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Chỉ quản trị viên mới có quyền xem nhật ký kiểm toán',
      });
    }

    const log = await auditService.getById(id);

    res.json({
      success: true,
      log,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /audit/entity/:type/:id — Get audit history for an entity
 */
export async function getEntityAuditHistory(req, res, next) {
  try {
    const { type, id } = req.params;
    const { page, limit, startDate, endDate } = req.query;

    // Authorization
    const role = getUserRole(req);
    if (!['admin', 'school_admin', 'principal', 'vice_principal', 'super_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Chỉ quản trị viên mới có quyền xem nhật ký kiểm toán',
      });
    }

    const result = await auditService.getEntityHistory(type, id, {
      schoolId: getSchoolId(req),
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /audit/security — Get security events (warnings/critical)
 */
export async function getSecurityEvents(req, res, next) {
  try {
    const { page, limit, startDate, endDate } = req.query;

    // Authorization: Only admins can view security events
    const role = getUserRole(req);
    if (!['admin', 'school_admin', 'principal', 'vice_principal', 'super_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Chỉ quản trị viên mới có quyền xem sự kiện bảo mật',
      });
    }

    const result = await auditService.getSecurityEvents(getSchoolId(req), {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /audit/actors/:actorId — Get activity for a specific actor
 */
export async function getActorActivity(req, res, next) {
  try {
    const { actorId } = req.params;
    const { page, limit, startDate, endDate } = req.query;

    // Authorization
    const role = getUserRole(req);
    if (!['admin', 'school_admin', 'principal', 'vice_principal', 'super_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Chỉ quản trị viên mới có quyền xem nhật ký kiểm toán',
      });
    }

    const result = await auditService.getActorActivity(actorId, {
      schoolId: getSchoolId(req),
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /audit/stats — Get audit statistics
 */
export async function getAuditStats(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    // Authorization
    const role = getUserRole(req);
    if (!['admin', 'school_admin', 'principal', 'vice_principal', 'super_admin'].includes(role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Chỉ quản trị viên mới có quyền xem thống kê kiểm toán',
      });
    }

    // Get counts by severity and category
    const result = await auditService.query({
      schoolId: getSchoolId(req),
      startDate,
      endDate,
      page: 1,
      limit: 1000, // Get all for stats
    });

    // Calculate statistics
    const logs = result.logs;
    const stats = {
      totalEvents: logs.length,
      bySeverity: {},
      byCategory: {},
      byAction: {},
      recentActivity: logs.slice(0, 10),
    };

    for (const log of logs) {
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    }

    res.json({
      success: true,
      stats,
      period: { startDate, endDate },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /audit/actions — Get available audit actions for filtering
 */
export async function getAuditActions(req, res, next) {
  try {
    res.json({
      success: true,
      actions: Object.values(AUDIT_EVENTS),
      categories: Object.values(AUDIT_CATEGORIES),
      severityLevels: Object.values(AUDIT_SEVERITY),
      entityTypes: Object.values(AUDIT_ENTITY_TYPES),
    });
  } catch (err) {
    next(err);
  }
}
