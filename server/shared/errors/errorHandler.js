/**
 * Centralized Global Error Handler Middleware
 * Intercepts all operational and unhandled errors, logs them appropriately,
 * and formats standardized error envelopes.
 * 
 * Standard error response format:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "STABLE_MACHINE_CODE",
 *     "message": "Safe user-facing message",
 *     "details": ...
 *   },
 *   "requestId": "..."
 * }
 */

import { ZodError } from 'zod';
import { AppError } from './AppError.js';
import { logError, getRequestContext, maskSensitiveData } from '../logging/logger.js';

// Request ID middleware - adds unique ID to each request
export function requestIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
}

export function errorHandler(err, req, res, _next) {
  const requestId = req.id;
  const context = getRequestContext();
  const isAppError = err instanceof AppError;
  const isZodError = err instanceof ZodError;
  
  // Determine status code
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Đã xảy ra lỗi nội bộ. Vui lòng thử lại sau.';
  
  if (isAppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (isZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Dữ liệu gửi lên không hợp lệ';
  } else if (err.name === 'SqliteError' || err.code === 'SQLITE_ERROR') {
    statusCode = 500;
    code = 'DATABASE_ERROR';
    message = 'Đã xảy ra lỗi cơ sở dữ liệu';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.message || 'Dữ liệu không hợp lệ';
  } else if (err.statusCode) {
    statusCode = err.statusCode;
  } else if (err.status) {
    statusCode = err.status;
  }

  // Structured error logging with full context
  logError(err, {
    requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errorCode: code,
    userId: req.user?.id,
    schoolId: req.user?.schoolId || req.user?.school_id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    // Mask any sensitive data in request body
    ...(req.body && Object.keys(req.body).length > 0 
      ? { requestBody: maskSensitiveData(req.body) } 
      : {}),
  });

  // Build standardized error response
  const responseBody = {
    success: false,
    error: {
      code,
      message,
      ...(isZodError && err.errors ? { details: formatZodErrors(err.errors) } : {}),
      ...(isAppError && err.details ? { details: err.details } : {}),
    },
    requestId,
  };

  res.status(statusCode).json(responseBody);
}

/**
 * Format Zod validation errors into user-friendly format
 */
function formatZodErrors(zodErrors) {
  return zodErrors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req, res) {
  const context = getRequestContext();
  
  // Log 404 as INFO (not an error, just resource not found)
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    type: 'http_request',
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    status: 404,
    userId: req.user?.id,
    schoolId: req.user?.schoolId || req.user?.school_id,
    message: 'Route not found',
  }));
  
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Không tìm thấy route: ${req.method} ${req.originalUrl}`,
    },
    requestId: req.id,
  });
}

/**
 * Async wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
