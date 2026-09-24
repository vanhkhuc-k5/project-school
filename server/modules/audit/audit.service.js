// =============================================================================
// Audit Service — Business Logic Layer
// G36 Centralized Audit Trail
// =============================================================================
import * as repo from './audit.repository.js';
import { AppError } from '../../shared/errors/index.js';
import {
  AUDIT_EVENTS,
  AUDIT_SEVERITY,
  AUDIT_CATEGORIES,
  AUDIT_ENTITY_TYPES,
  SENSITIVE_FIELDS,
  EVENT_SEVERITY_MAP,
  MAX_AUDIT_DETAIL_LENGTH,
  MAX_BEFORE_AFTER_SIZE,
} from './audit.types.js';

/**
 * Generate a unique audit log ID
 */
function generateAuditId() {
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Generate correlation ID for request tracing
 */
export function generateCorrelationId() {
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Sanitize sensitive fields from an object
 */
function sanitizeObject(obj, maxDepth = 10, currentDepth = 0) {
  if (!obj || typeof obj !== 'object' || currentDepth >= maxDepth) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth, currentDepth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, maxDepth, currentDepth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Sanitize before/after state, limiting size
 */
function sanitizeState(state, maxSize = MAX_BEFORE_AFTER_SIZE) {
  if (!state) return null;
  
  const sanitized = sanitizeObject(state);
  const json = JSON.stringify(sanitized);
  
  if (json.length > maxSize) {
    return {
      _truncated: true,
      _originalSize: json.length,
      summary: `State truncated (${Math.round(json.length / 1024)}KB → ${Math.round(maxSize / 1024)}KB)`,
    };
  }
  
  return sanitized;
}

/**
 * Sanitize details field
 */
function sanitizeDetails(details, maxLength = MAX_AUDIT_DETAIL_LENGTH) {
  if (!details) return null;
  
  const sanitized = sanitizeObject(details);
  const json = JSON.stringify(sanitized);
  
  if (json.length > maxLength) {
    return json.slice(0, maxLength - 50) + '... [TRUNCATED]';
  }
  
  return sanitized;
}

/**
 * Determine severity for an event
 */
function determineSeverity(action) {
  return EVENT_SEVERITY_MAP[action] || AUDIT_SEVERITY.INFO;
}

/**
 * Determine category for an event
 */
function determineCategory(action) {
  if (action.startsWith('LOGIN') || action.startsWith('LOGOUT') || action.startsWith('TOKEN')) {
    return AUDIT_CATEGORIES.AUTHENTICATION;
  }
  if (action.startsWith('USER_')) {
    return AUDIT_CATEGORIES.USER_MANAGEMENT;
  }
  if (action.startsWith('STUDENT_')) {
    return AUDIT_CATEGORIES.STUDENT_MANAGEMENT;
  }
  if (action.includes('ENROLL')) {
    return AUDIT_CATEGORIES.ENROLLMENT;
  }
  if (action.includes('ATTENDANCE')) {
    return AUDIT_CATEGORIES.ATTENDANCE;
  }
  if (action.includes('GRADE')) {
    return AUDIT_CATEGORIES.GRADE;
  }
  if (action.includes('INVOICE') || action.includes('PAYMENT')) {
    return AUDIT_CATEGORIES.TUITION;
  }
  if (action.includes('PERMISSION') || action.includes('ROLE')) {
    return AUDIT_CATEGORIES.PERMISSION;
  }
  return AUDIT_CATEGORIES.SYSTEM;
}

export const auditService = {
  // =========================================================================
  // CORE AUDIT LOGGING
  // =========================================================================

  /**
   * Log an audit event
   */
  async log({
    action,
    actorId = null,
    actorName = 'System',
    actorRole = 'system',
    entityType = null,
    entityId = null,
    schoolId = null,
    details = null,
    ipAddress = null,
    correlationId = null,
    beforeState = null,
    afterState = null,
    metadata = null,
    userRequest = null, // Express request object for auto-extraction
  }) {
    // Auto-extract from request if provided
    if (userRequest) {
      actorId = actorId || userRequest.user?.id || userRequest.user?.userId;
      actorName = actorName !== 'System' ? actorName : (userRequest.user?.name || 'Unknown');
      actorRole = actorRole !== 'system' ? actorRole : (userRequest.user?.role || 'unknown');
      schoolId = schoolId || userRequest.user?.schoolId || userRequest.user?.school_id;
      ipAddress = ipAddress || userRequest.ip || userRequest.headers?.['x-forwarded-for']?.split(',')[0];
      correlationId = correlationId || userRequest.correlationId;
    }

    const auditEntry = {
      id: generateAuditId(),
      actorId,
      actorName,
      actorRole,
      action,
      entityType,
      entityId,
      schoolId,
      severity: determineSeverity(action),
      category: determineCategory(action),
      details: sanitizeDetails(details),
      ipAddress: ipAddress ? String(ipAddress).slice(0, 64) : null,
      correlationId,
      beforeState: sanitizeState(beforeState),
      afterState: sanitizeState(afterState),
      metadata: sanitizeObject(metadata),
      createdAt: new Date().toISOString(),
    };

    // Store in database
    await repo.auditRepository.create(auditEntry);

    // Also log to console in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[AUDIT:${auditEntry.severity}] ${action}`, {
        id: auditEntry.id,
        actor: `${actorName} (${actorRole})`,
        entity: entityType ? `${entityType}:${entityId}` : null,
        school: schoolId,
        correlationId,
      });
    }

    return auditEntry;
  },

  // =========================================================================
  // CONVENIENCE METHODS FOR COMMON EVENTS
  // =========================================================================

  /**
   * Log authentication event
   */
  async logAuth({
    event,
    identifier,
    success,
    lockDuration = null,
    failureReason = null,
    userRequest = null,
  }) {
    return this.log({
      action: event,
      actorName: identifier,
      actorRole: 'auth',
      details: {
        success,
        failureReason: failureReason || undefined,
        lockDuration: lockDuration || undefined,
      },
      userRequest,
    });
  },

  /**
   * Log user management event
   */
  async logUserManagement({
    event,
    targetUserId,
    targetUserName,
    changes,
    userRequest = null,
  }) {
    return this.log({
      action: event,
      actorId: userRequest?.user?.id,
      actorName: userRequest?.user?.name,
      actorRole: userRequest?.user?.role,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: targetUserId,
      details: {
        targetUserName,
        changes: sanitizeObject(changes),
      },
      beforeState: changes?.before,
      afterState: changes?.after,
      userRequest,
    });
  },

  /**
   * Log enrollment event
   */
  async logEnrollment({
    event,
    studentId,
    studentName,
    classId,
    className,
    previousClassId = null,
    userRequest = null,
  }) {
    return this.log({
      action: event,
      actorId: userRequest?.user?.id,
      actorName: userRequest?.user?.name,
      actorRole: userRequest?.user?.role,
      entityType: AUDIT_ENTITY_TYPES.STUDENT,
      entityId: studentId,
      details: {
        studentName,
        classId,
        className,
        previousClassId,
      },
      userRequest,
    });
  },

  /**
   * Log grade event
   */
  async logGrade({
    event,
    gradeId,
    studentId,
    studentName,
    subjectName,
    score,
    maxScore,
    previousScore = null,
    userRequest = null,
  }) {
    return this.log({
      action: event,
      actorId: userRequest?.user?.id,
      actorName: userRequest?.user?.name,
      actorRole: userRequest?.user?.role,
      entityType: AUDIT_ENTITY_TYPES.GRADE,
      entityId: gradeId,
      details: {
        studentId,
        studentName,
        subjectName,
        score,
        maxScore,
        previousScore,
      },
      beforeState: previousScore !== null ? { score: previousScore } : null,
      afterState: { score },
      userRequest,
    });
  },

  /**
   * Log attendance event
   */
  async logAttendance({
    event,
    studentId,
    studentName,
    date,
    status,
    previousStatus = null,
    correctionReason = null,
    userRequest = null,
  }) {
    return this.log({
      action: event,
      actorId: userRequest?.user?.id,
      actorName: userRequest?.user?.name,
      actorRole: userRequest?.user?.role,
      entityType: AUDIT_ENTITY_TYPES.ATTENDANCE,
      entityId: `${studentId}_${date}`,
      details: {
        studentId,
        studentName,
        date,
        status,
        previousStatus,
        correctionReason,
      },
      beforeState: previousStatus ? { status: previousStatus } : null,
      afterState: { status },
      userRequest,
    });
  },

  /**
   * Log permission change
   */
  async logPermissionChange({
    event,
    targetUserId,
    targetUserName,
    permissions,
    previousPermissions = null,
    userRequest = null,
  }) {
    return this.log({
      action: event,
      actorId: userRequest?.user?.id,
      actorName: userRequest?.user?.name,
      actorRole: userRequest?.user?.role,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: targetUserId,
      details: {
        targetUserName,
        permissions,
      },
      beforeState: previousPermissions ? { permissions: previousPermissions } : null,
      afterState: { permissions },
      userRequest,
    });
  },

  /**
   * Log data import
   */
  async logImport({
    entityType,
    recordCount,
    successCount,
    errorCount,
    batchId,
    userRequest = null,
  }) {
    return this.log({
      action: AUDIT_EVENTS.DATA_IMPORTED,
      actorId: userRequest?.user?.id,
      actorName: userRequest?.user?.name,
      actorRole: userRequest?.user?.role,
      entityType: AUDIT_ENTITY_TYPES.IMPORT_BATCH,
      entityId: batchId,
      details: {
        importedEntityType: entityType,
        totalRecords: recordCount,
        successCount,
        errorCount,
      },
      userRequest,
    });
  },

  /**
   * Log data export
   */
  async logExport({
    entityType,
    recordCount,
    filters,
    userRequest = null,
  }) {
    return this.log({
      action: AUDIT_EVENTS.DATA_EXPORTED,
      actorId: userRequest?.user?.id,
      actorName: userRequest?.user?.name,
      actorRole: userRequest?.user?.role,
      entityType: AUDIT_ENTITY_TYPES.EXPORT,
      details: {
        exportedEntityType: entityType,
        recordCount,
        filters: sanitizeObject(filters),
      },
      userRequest,
    });
  },

  // =========================================================================
  // AUDIT QUERY
  // =========================================================================

  /**
   * Query audit logs with filters
   */
  async query(filters = {}) {
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
      page = 1,
      limit = 50,
    } = filters;

    // Authorization: only admins and principals can query audit logs
    // This should be enforced at the controller level

    const result = await repo.auditRepository.findMany({
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
    });

    return {
      logs: result.logs.map(log => ({
        ...log,
        // Parse JSON fields if stored as strings
        details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details,
        beforeState: log.before_state || log.beforeState ? 
          (typeof log.before_state === 'string' ? JSON.parse(log.before_state) : log.before_state) : null,
        afterState: log.after_state || log.afterState ? 
          (typeof log.after_state === 'string' ? JSON.parse(log.after_state) : log.after_state) : null,
        metadata: log.metadata ? 
          (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : null,
      })),
      pagination: result.pagination,
    };
  },

  /**
   * Get audit log by ID
   */
  async getById(id) {
    const log = await repo.auditRepository.findById(id);
    if (!log) {
      throw AppError.notFound('Audit log not found');
    }
    return log;
  },

  /**
   * Get audit trail for a specific entity
   */
  async getEntityHistory(entityType, entityId, options = {}) {
    return this.query({
      entityType,
      entityId,
      ...options,
    });
  },

  /**
   * Get audit trail for a specific actor
   */
  async getActorActivity(actorId, options = {}) {
    return this.query({
      actorId,
      ...options,
    });
  },

  /**
   * Get security events (failed logins, permission changes, etc.)
   */
  async getSecurityEvents(schoolId, options = {}) {
    return this.query({
      schoolId,
      severity: [AUDIT_SEVERITY.WARNING, AUDIT_SEVERITY.CRITICAL],
      ...options,
    });
  },
};
