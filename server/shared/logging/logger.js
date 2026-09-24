/**
 * Structured Production Logger & Request Correlation
 * G47 - Comprehensive logging with request tracing
 * 
 * Features:
 * - Request ID correlation
 * - Structured JSON output for log aggregation
 * - Configurable log levels
 * - Sensitive data masking
 * - Performance metrics
 */

import { AsyncLocalStorage } from 'async_hooks';

// =============================================
// Async Local Storage for Request Context
// =============================================

export const requestContext = new AsyncLocalStorage();

/**
 * Get current request context (available anywhere in the request chain)
 */
export function getRequestContext() {
  return requestContext.getStore() || {};
}

// =============================================
// Log Levels
// =============================================

export const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
};

const LOG_LEVEL_NAMES = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];

// =============================================
// Sensitive Data Masking
// =============================================

const SENSITIVE_FIELDS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'auth',
  'api_key',
  'apikey',
  'private_key',
  'ssn',
  'social_security',
  'credit_card',
  'card_number',
  'cvv',
  'pin',
  'otp',
  'pin_code',
  'old_password',
  'new_password',
  'confirm_password',
  'current_password',
]);

const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /api.?key/i,
  /bearer/i,
];

/**
 * Mask sensitive data in objects
 */
export function maskSensitiveData(data, depth = 0) {
  if (depth > 10) return '[MAX_DEPTH]';
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // Check if field name suggests sensitive
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(data)) {
        return '[REDACTED]';
      }
    }
    return data;
  }
  
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, depth + 1));
  }
  
  const masked = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase()) || SENSITIVE_PATTERNS.some(p => p.test(key))) {
      masked[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value, depth + 1);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

// =============================================
// Request Correlation Context
// =============================================

export function createRequestContext(req) {
  return {
    requestId: req.id,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.originalUrl,
    query: req.query,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get?.('User-Agent') || req.headers?.['user-agent'],
    // User info (safe fields only)
    userId: req.user?.id,
    userRole: req.user?.role,
    schoolId: req.user?.schoolId || req.user?.school_id,
    // Performance tracking
    startTime: Date.now(),
  };
}

// =============================================
// Structured Logger Class
// =============================================

class StructuredLogger {
  constructor(options = {}) {
    this.level = options.level ?? this.getLogLevel();
    this.format = options.format ?? this.detectFormat();
    this.includeStackTrace = options.includeStackTrace ?? process.env.NODE_ENV !== 'production';
  }

  getLogLevel() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && LogLevel[envLevel] !== undefined) {
      return LogLevel[envLevel];
    }
    return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }

  detectFormat() {
    return process.env.NODE_ENV === 'production' ? 'json' : 'pretty';
  }

  shouldLog(level) {
    return level <= this.level;
  }

  formatMessage(level, message, meta = {}) {
    const context = getRequestContext();
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: LOG_LEVEL_NAMES[level],
      message,
      ...context,
      ...meta,
    };

    // Add request correlation if available
    if (context.requestId) {
      logEntry.requestId = context.requestId;
    }

    return logEntry;
  }

  output(formatted) {
    if (this.format === 'json') {
      console.log(JSON.stringify(formatted));
    } else {
      // Pretty format for development
      const { timestamp, level, message, requestId, ...rest } = formatted;
      const parts = [`[${timestamp}]`, `[${level}]`];
      
      if (requestId) {
        parts.push(`[${requestId}]`);
      }
      
      parts.push(message);
      
      if (Object.keys(rest).length > 0) {
        parts.push(JSON.stringify(rest, null, 2));
      }
      
      console.log(parts.join(' '));
    }
  }

  error(message, meta = {}) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.formatMessage(LogLevel.ERROR, message, meta);
    
    if (meta?.error instanceof Error) {
      entry.error = {
        name: meta.error.name,
        message: meta.error.message,
        ...(this.includeStackTrace && { stack: meta.error.stack }),
      };
      delete meta.error;
    }
    
    console.error(JSON.stringify(entry));
  }

  warn(message, meta = {}) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    const entry = this.formatMessage(LogLevel.WARN, message, meta);
    this.output(entry);
  }

  info(message, meta = {}) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    const entry = this.formatMessage(LogLevel.INFO, message, meta);
    this.output(entry);
  }

  debug(message, meta = {}) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    const entry = this.formatMessage(LogLevel.DEBUG, message, meta);
    this.output(entry);
  }

  trace(message, meta = {}) {
    if (!this.shouldLog(LogLevel.TRACE)) return;
    const entry = this.formatMessage(LogLevel.TRACE, message, meta);
    this.output(entry);
  }

  // Child logger with additional context
  child(additionalContext) {
    const parent = this;
    return {
      error: (msg, meta) => parent.error(msg, { ...additionalContext, ...meta }),
      warn: (msg, meta) => parent.warn(msg, { ...additionalContext, ...meta }),
      info: (msg, meta) => parent.info(msg, { ...additionalContext, ...meta }),
      debug: (msg, meta) => parent.debug(msg, { ...additionalContext, ...meta }),
      trace: (msg, meta) => parent.trace(msg, { ...additionalContext, ...meta }),
    };
  }

  // Log HTTP request completion
  logRequest(req, res, duration, meta = {}) {
    const context = getRequestContext();
    
    const entry = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 400 ? 'WARN' : 'INFO',
      type: 'http_request',
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      schoolId: req.user?.schoolId || req.user?.school_id,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...meta,
    };

    if (res.statusCode >= 400) {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  // Log business events
  logEvent(eventName, data = {}) {
    const context = getRequestContext();
    
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      type: 'business_event',
      event: eventName,
      requestId: context.requestId,
      userId: context.userId,
      schoolId: context.schoolId,
      ...maskSensitiveData(data),
    };

    console.log(JSON.stringify(entry));
  }

  // Log security events
  logSecurity(event, details = {}) {
    const context = getRequestContext();
    
    const entry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      type: 'security_event',
      event,
      requestId: context.requestId,
      userId: context.userId,
      schoolId: context.schoolId,
      ip: details.ip || context.ip,
      path: details.path || context.path,
      ...details,
    };

    console.warn(JSON.stringify(entry));
  }
}

// Singleton instance
export const logger = new StructuredLogger();

// =============================================
// Request Logger Middleware (Enhanced)
// =============================================

export function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Generate request ID if not already set by requestIdMiddleware
  if (!req.id) {
    req.id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Set response header for correlation
  res.setHeader('X-Request-ID', req.id);
  
  // Create request context for async operations
  const context = createRequestContext(req);
  
  // Run the rest of the request in the async context
  requestContext.run(context, () => {
    // Log on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      // Skip health check logging
      if (req.originalUrl !== '/api/health') {
        logger.logRequest(req, res, duration);
      }
    });
    
    next();
  });
}

// =============================================
// Error Logging Helper
// =============================================

export function logError(error, context = {}) {
  const requestCtx = getRequestContext();
  
  logger.error(error.message, {
    ...requestCtx,
    ...context,
    error,
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    code: error.code,
  });
}

// =============================================
// Audit Log Helper
// =============================================

export function logAudit(action, resource, details = {}) {
  const context = getRequestContext();
  
  logger.info('AUDIT', {
    type: 'audit',
    action,
    resource,
    userId: context.userId,
    schoolId: context.schoolId,
    requestId: context.requestId,
    ...maskSensitiveData(details),
  });
}

// =============================================
// Performance Metrics
// =============================================

export class PerformanceTimer {
  constructor(label) {
    this.label = label;
    this.start = Date.now();
    this.checkpoints = [];
  }

  checkpoint(name) {
    this.checkpoints.push({
      name,
      duration: Date.now() - this.start,
    });
  }

  end() {
    const total = Date.now() - this.start;
    logger.debug(`${this.label} completed`, {
      totalDuration: `${total}ms`,
      checkpoints: this.checkpoints,
    });
    return total;
  }
}

export function startTimer(label) {
  return new PerformanceTimer(label);
}
