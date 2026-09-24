/**
 * Security Event Logger
 * G47 - Dedicated logger for security and audit events
 * 
 * Features:
 * - Authentication events
 * - Authorization failures
 * - Rate limiting events
 * - Data access violations
 * - Configuration changes
 */

import { logger, maskSensitiveData } from '../logging/logger.js';

/**
 * Security Event Types
 */
export const SecurityEventType = {
  // Authentication
  LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  LOGOUT: 'AUTH_LOGOUT',
  TOKEN_ISSUED: 'AUTH_TOKEN_ISSUED',
  TOKEN_REFRESH: 'AUTH_TOKEN_REFRESH',
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  
  // Authorization
  ACCESS_DENIED: 'AUTHZ_ACCESS_DENIED',
  PERMISSION_CHECK_FAILED: 'AUTHZ_PERMISSION_FAILED',
  CROSS_TENANT_ACCESS: 'AUTHZ_CROSS_TENANT_ACCESS',
  ROLE_VIOLATION: 'AUTHZ_ROLE_VIOLATION',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  BRUTE_FORCE_DETECTED: 'SECURITY_BRUTE_FORCE',
  
  // Data Operations
  DATA_CREATED: 'DATA_CREATED',
  DATA_UPDATED: 'DATA_UPDATED',
  DATA_DELETED: 'DATA_DELETED',
  DATA_ACCESSED: 'DATA_ACCESSED',
  
  // Admin Actions
  USER_CREATED: 'ADMIN_USER_CREATED',
  USER_UPDATED: 'ADMIN_USER_UPDATED',
  USER_DELETED: 'ADMIN_USER_DELETED',
  ROLE_CHANGED: 'ADMIN_ROLE_CHANGED',
  PERMISSION_CHANGED: 'ADMIN_PERMISSION_CHANGED',
  
  // Security Events
  INTRUSION_ATTEMPT: 'SECURITY_INTRUSION',
  SUSPICIOUS_ACTIVITY: 'SECURITY_SUSPICIOUS',
  CONFIG_CHANGED: 'SECURITY_CONFIG_CHANGED',
};

/**
 * Generic security event logger - matches existing usage pattern
 */
export function logSecurityEvent(eventType, details = {}) {
  logger.logSecurity(eventType, details);
}

/**
 * Log authentication success
 */
export function logAuthSuccess(req, user, additionalInfo = {}) {
  logger.logSecurity(SecurityEventType.LOGIN_SUCCESS, {
    userId: user?.id,
    userEmail: user?.email,
    userRole: user?.role,
    schoolId: user?.schoolId || user?.school_id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.originalUrl,
    ...additionalInfo,
  });
}

/**
 * Log authentication failure
 */
export function logAuthFailure(req, reason, additionalInfo = {}) {
  logger.logSecurity(SecurityEventType.LOGIN_FAILED, {
    reason,
    email: req.body?.identifier || req.body?.email,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    path: req.originalUrl,
    ...additionalInfo,
  });
}

/**
 * Log authorization failure
 */
export function logAuthzFailure(req, reason, additionalInfo = {}) {
  logger.logSecurity(SecurityEventType.ACCESS_DENIED, {
    userId: req.user?.id,
    userRole: req.user?.role,
    schoolId: req.user?.schoolId || req.user?.school_id,
    reason,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    ...additionalInfo,
  });
}

/**
 * Log cross-tenant access attempt
 */
export function logCrossTenantAccess(req, attemptedSchoolId, additionalInfo = {}) {
  logger.logSecurity(SecurityEventType.CROSS_TENANT_ACCESS, {
    userId: req.user?.id,
    userSchoolId: req.user?.schoolId || req.user?.school_id,
    attemptedSchoolId,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    ...additionalInfo,
  });
}

/**
 * Log rate limit exceeded
 */
export function logRateLimitExceeded(req, limitType = 'request', additionalInfo = {}) {
  logger.logSecurity(SecurityEventType.RATE_LIMIT_EXCEEDED, {
    userId: req.user?.id,
    userRole: req.user?.role,
    limitType,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...additionalInfo,
  });
}

/**
 * Log data access (for audit trails)
 */
export function logDataAccess(req, resourceType, resourceId, action = 'read') {
  logger.logEvent(`data_access_${action}`, {
    resourceType,
    resourceId,
    userId: req.user?.id,
    schoolId: req.user?.schoolId || req.user?.school_id,
    path: req.originalUrl,
  });
}

/**
 * Log data modification (for audit trails)
 */
export function logDataModification(req, resourceType, resourceId, action, changes = {}) {
  logger.logEvent(`data_${action}`, {
    resourceType,
    resourceId,
    userId: req.user?.id,
    schoolId: req.user?.schoolId || req.user?.school_id,
    path: req.originalUrl,
    changes,
  });
}

/**
 * Log admin action
 */
export function logAdminAction(req, action, targetType, targetId, details = {}) {
  logger.logSecurity(`ADMIN_${action}`, {
    userId: req.user?.id,
    userRole: req.user?.role,
    action,
    targetType,
    targetId,
    schoolId: req.user?.schoolId || req.user?.school_id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...details,
  });
}

/**
 * Log suspicious activity
 */
export function logSuspiciousActivity(req, description, severity = 'medium', additionalInfo = {}) {
  logger.logSecurity(SecurityEventType.SUSPICIOUS_ACTIVITY, {
    description,
    severity,
    userId: req.user?.id,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body ? maskForSecurity(req.body) : undefined,
    ...additionalInfo,
  });
}

/**
 * Mask sensitive fields for security logging
 */
function maskForSecurity(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sensitive = ['password', 'token', 'secret', 'pin', 'otp', 'ssn', 'credit_card'];
  const masked = { ...data };
  
  for (const key of Object.keys(masked)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      masked[key] = '[REDACTED]';
    }
  }
  
  return masked;
}
