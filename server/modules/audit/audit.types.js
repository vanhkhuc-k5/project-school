// =============================================================================
// Audit Module Types — G36 Centralized Audit Trail
// =============================================================================

// ── Audit Event Categories ────────────────────────────────────────────────────

export const AUDIT_CATEGORIES = {
  AUTHENTICATION: 'AUTHENTICATION',
  USER_MANAGEMENT: 'USER_MANAGEMENT',
  STUDENT_MANAGEMENT: 'STUDENT_MANAGEMENT',
  ENROLLMENT: 'ENROLLMENT',
  ATTENDANCE: 'ATTENDANCE',
  GRADE: 'GRADE',
  TUITION: 'TUITION',
  PERMISSION: 'PERMISSION',
  SYSTEM: 'SYSTEM',
};

// ── Audit Severity Levels ──────────────────────────────────────────────────────

export const AUDIT_SEVERITY = {
  INFO: 'INFO',           // Normal operations (view, list, export)
  WARNING: 'WARNING',      // Potentially sensitive operations
  ERROR: 'ERROR',         // Failed operations
  CRITICAL: 'CRITICAL',   // Security-related critical events
};

// ── Audit Event Types ──────────────────────────────────────────────────────────

export const AUDIT_EVENTS = {
  // Authentication Events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_LOCKED: 'LOGIN_LOCKED',
  LOGOUT: 'LOGOUT',
  TOKEN_REFRESH: 'TOKEN_REFRESH',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  
  // User Management Events
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DISABLED: 'USER_DISABLED',
  USER_ENABLED: 'USER_ENABLED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  
  // Student Management Events
  STUDENT_PROFILE_UPDATED: 'STUDENT_PROFILE_UPDATED',
  STUDENT_GRADE_LEVEL_CHANGED: 'STUDENT_GRADE_LEVEL_CHANGED',
  
  // Enrollment Events
  STUDENT_ENROLLED: 'STUDENT_ENROLLED',
  STUDENT_TRANSFERRED: 'STUDENT_TRANSFERRED',
  STUDENT_WITHDRAWN: 'STUDENT_WITHDRAWN',
  BULK_ENROLLMENT: 'BULK_ENROLLMENT',
  
  // Attendance Events
  ATTENDANCE_TAKEN: 'ATTENDANCE_TAKEN',
  ATTENDANCE_CORRECTED: 'ATTENDANCE_CORRECTED',
  
  // Grade Events
  GRADE_CREATED: 'GRADE_CREATED',
  GRADE_UPDATED: 'GRADE_UPDATED',
  GRADE_PUBLISHED: 'GRADE_PUBLISHED',
  GRADE_UNLOCKED: 'GRADE_UNLOCKED',
  GRADE_CORRECTED: 'GRADE_CORRECTED',
  BULK_GRADE_ENTERED: 'BULK_GRADE_ENTERED',
  
  // Tuition Events
  INVOICE_CREATED: 'INVOICE_CREATED',
  INVOICE_ISSUED: 'INVOICE_ISSUED',
  PAYMENT_RECORDED: 'PAYMENT_RECORDED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  
  // Permission Events
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  PERMISSION_REVOKED: 'PERMISSION_REVOKED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  
  // Import/Export Events (G35)
  DATA_IMPORTED: 'DATA_IMPORTED',
  DATA_EXPORTED: 'DATA_EXPORTED',
  TEMPLATE_DOWNLOADED: 'TEMPLATE_DOWNLOADED',
  
  // System Events
  CONFIGURATION_CHANGED: 'CONFIGURATION_CHANGED',
  SCHOOL_PROFILE_UPDATED: 'SCHOOL_PROFILE_UPDATED',
  ACADEMIC_YEAR_CREATED: 'ACADEMIC_YEAR_CREATED',
  ACADEMIC_YEAR_ACTIVATED: 'ACADEMIC_YEAR_ACTIVATED',
};

// ── Severity Mapping ────────────────────────────────────────────────────────────

export const EVENT_SEVERITY_MAP = {
  [AUDIT_EVENTS.LOGIN_FAILED]: AUDIT_SEVERITY.WARNING,
  [AUDIT_EVENTS.LOGIN_LOCKED]: AUDIT_SEVERITY.CRITICAL,
  [AUDIT_EVENTS.USER_DISABLED]: AUDIT_SEVERITY.WARNING,
  [AUDIT_EVENTS.USER_ROLE_CHANGED]: AUDIT_SEVERITY.WARNING,
  [AUDIT_EVENTS.STUDENT_WITHDRAWN]: AUDIT_SEVERITY.WARNING,
  [AUDIT_EVENTS.ATTENDANCE_CORRECTED]: AUDIT_SEVERITY.WARNING,
  [AUDIT_EVENTS.GRADE_PUBLISHED]: AUDIT_SEVERITY.WARNING,
  [AUDIT_EVENTS.GRADE_UNLOCKED]: AUDIT_SEVERITY.WARNING,
  [AUDIT_EVENTS.GRADE_CORRECTED]: AUDIT_SEVERITY.WARNING,
  [AUDIT_EVENTS.PERMISSION_REVOKED]: AUDIT_SEVERITY.WARNING,
  [AUDIT_EVENTS.PERMISSION_GRANTED]: AUDIT_SEVERITY.WARNING,
  [AUDIT_EVENTS.DATA_IMPORTED]: AUDIT_SEVERITY.WARNING,
  [AUDIT_EVENTS.CONFIGURATION_CHANGED]: AUDIT_SEVERITY.CRITICAL,
  [AUDIT_EVENTS.ACADEMIC_YEAR_ACTIVATED]: AUDIT_SEVERITY.WARNING,
};

// ── Entity Types ───────────────────────────────────────────────────────────────

export const AUDIT_ENTITY_TYPES = {
  USER: 'user',
  STUDENT: 'student',
  TEACHER: 'teacher',
  PARENT: 'parent',
  ENROLLMENT: 'enrollment',
  ATTENDANCE: 'attendance',
  GRADE: 'grade',
  INVOICE: 'invoice',
  PAYMENT: 'payment',
  PERMISSION: 'permission',
  ROLE: 'role',
  SCHOOL: 'school',
  ACADEMIC_YEAR: 'academic_year',
  CLASS: 'class',
  IMPORT_BATCH: 'import_batch',
  EXPORT: 'export',
};

// ── Sensitive Fields ───────────────────────────────────────────────────────────

export const SENSITIVE_FIELDS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'refreshtoken',
  'accesstoken',
  'authorization',
  'cookie',
  'password_hash',
  'passwordhash',
  'secret',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
  'ssn',
  'identity_number',
  'birth_certificate',
]);

// ── Type Interfaces ───────────────────────────────────────────────────────────

/**
 * Audit log entry interface
 */
export class AuditLogEntry {
  constructor({
    id,
    actorId,
    actorName,
    actorRole,
    action,
    entityType,
    entityId,
    schoolId,
    severity,
    category,
    details,
    ipAddress,
    correlationId,
    beforeState,
    afterState,
    metadata,
    createdAt,
  }) {
    this.id = id;
    this.actorId = actorId;
    this.actorName = actorName;
    this.actorRole = actorRole;
    this.action = action;
    this.entityType = entityType;
    this.entityId = entityId;
    this.schoolId = schoolId;
    this.severity = severity;
    this.category = category;
    this.details = details;
    this.ipAddress = ipAddress;
    this.correlationId = correlationId;
    this.beforeState = beforeState;
    this.afterState = afterState;
    this.metadata = metadata;
    this.createdAt = createdAt || new Date().toISOString();
  }
}

/**
 * Audit query filter options
 */
export class AuditQueryOptions {
  constructor({
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
  }) {
    this.actorId = actorId;
    this.action = action;
    this.entityType = entityType;
    this.entityId = entityId;
    this.schoolId = schoolId;
    this.severity = severity;
    this.category = category;
    this.startDate = startDate;
    this.endDate = endDate;
    this.correlationId = correlationId;
    this.page = page;
    this.limit = Math.min(limit, 100); // Max 100 per page
  }
}

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_AUDIT_DETAIL_LENGTH = 10000;
export const MAX_BEFORE_AFTER_SIZE = 5000;
