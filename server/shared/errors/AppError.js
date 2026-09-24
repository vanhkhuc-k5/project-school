/**
 * EduPortal Standard Application Error Classes
 * Defines operational errors with HTTP status codes and machine-readable error codes.
 *
 * Error codes are stable and should not change between versions.
 * Messages can be localized on the frontend.
 */

export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message (safe for frontend)
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Machine-readable error code (e.g. 'BAD_REQUEST')
   * @param {unknown} [details=null] - Optional additional error context or field errors
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

// ============================================================
// STATIC FACTORY METHODS
// ============================================================

AppError.badRequest = (message = 'Yêu cầu không hợp lệ', details = null) =>
  new AppError(message, 400, 'BAD_REQUEST', details);

AppError.unauthorized = (message = 'Chưa đăng nhập hoặc phiên đã hết hạn') =>
  new AppError(message, 401, 'UNAUTHORIZED');

AppError.forbidden = (message = 'Bạn không có quyền thực hiện thao tác này') =>
  new AppError(message, 403, 'FORBIDDEN');

AppError.notFound = (message = 'Không tìm thấy tài nguyên yêu cầu') =>
  new AppError(message, 404, 'NOT_FOUND');

AppError.conflict = (message = 'Dữ liệu đã tồn tại hoặc xung đột') =>
  new AppError(message, 409, 'CONFLICT');

AppError.tooManyRequests = (message = 'Quá nhiều yêu cầu. Vui lòng thử lại sau.') =>
  new AppError(message, 429, 'TOO_MANY_REQUESTS');

AppError.internal = (message = 'Đã xảy ra lỗi nội bộ') =>
  new AppError(message, 500, 'INTERNAL_ERROR');

// ============================================================
// DOMAIN-SPECIFIC ERROR CLASSES
// ============================================================

export class BadRequestError extends AppError {
  constructor(message = 'Dữ liệu gửi lên không hợp lệ', details = null) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Chưa đăng nhập hoặc phiên đã hết hạn') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bạn không có quyền thực hiện thao tác này') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy tài nguyên yêu cầu') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Dữ liệu đã tồn tại hoặc xảy ra xung đột') {
    super(message, 409, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dữ liệu gửi lên không đúng định dạng', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class TenantForbiddenError extends AppError {
  constructor(message = 'Không được phép truy cập dữ liệu của trường khác') {
    super(message, 403, 'TENANT_FORBIDDEN');
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token đã hết hạn') {
    super(message, 401, 'TOKEN_EXPIRED');
  }
}

export class TokenInvalidError extends AppError {
  constructor(message = 'Token không hợp lệ') {
    super(message, 401, 'TOKEN_INVALID');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Quá nhiều yêu cầu. Vui lòng thử lại sau.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class AccountLockedError extends AppError {
  constructor(message = 'Tài khoản đã bị khóa tạm thời. Vui lòng thử lại sau.') {
    super(message, 423, 'ACCOUNT_LOCKED');
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Dữ liệu gửi lên quá lớn') {
    super(message, 413, 'PAYLOAD_TOO_LARGE');
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Đã xảy ra lỗi cơ sở dữ liệu') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = 'Đã xảy ra lỗi khi kết nối dịch vụ bên ngoài') {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

// ============================================================
// FIELD VALIDATION ERROR (for detailed validation feedback)
// ============================================================

export class FieldValidationError extends AppError {
  constructor(fieldErrors) {
    const errors = Array.isArray(fieldErrors) ? fieldErrors : [fieldErrors];
    super('Một hoặc nhiều trường không hợp lệ', 400, 'FIELD_VALIDATION_ERROR', errors);
  }
}

// Helper to create field validation errors
export const createFieldError = (field, message) => ({ field, message });
