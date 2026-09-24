// =============================================================================
// API Types & Utilities — G40 Frontend Data Layer & G46 Error Handling
// Standardized error parsing and API response types
// =============================================================================

import { ZodError } from 'zod';

// =============================================
// Error Types (Backend Standard Format)
// =============================================

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, unknown>,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      requestId: this.requestId,
      ...(this.details && { details: this.details }),
    };
  }
}

export class NetworkError extends Error {
  requestId?: string;
  constructor(message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  requestId?: string;
  constructor(
    message: string,
    public fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthError extends Error {
  requestId?: string;
  constructor(
    message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    public code = 'UNAUTHORIZED'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// =============================================
// Error Code Constants (Backend Stable Codes)
// =============================================

export const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  
  // Authorization
  FORBIDDEN: 'FORBIDDEN',
  TENANT_FORBIDDEN: 'TENANT_FORBIDDEN',
  
  // Validation
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FIELD_VALIDATION_ERROR: 'FIELD_VALIDATION_ERROR',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
} as const;

// =============================================
// API Response Standard Format
// Backend returns: { success, data, error, meta }
// =============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code?: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
  status?: number;
  message?: string;
  requestId?: string;
}

// =============================================
// Error Response (from backend)
// =============================================

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

// =============================================
// Success Response (from backend)
// =============================================

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

// =============================================
// Loading/Error/Empty State Types
// =============================================

export type ApiState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error; requestId?: string }
  | { status: 'empty'; data?: T };

// =============================================
// Error Parsing Utility
// Converts any error to a standardized Error type
// =============================================

export function parseApiError(error: unknown): Error & { requestId?: string; code?: string } {
  // Already an Error type with requestId
  if (error instanceof ApiError) return error;
  if (error instanceof NetworkError) return error;
  if (error instanceof ValidationError) return error;
  if (error instanceof AuthError) return error;
  if (error instanceof Error && 'requestId' in error) return error as Error & { requestId?: string };

  // Network errors (fetch failed)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new NetworkError();
  }

  // API error response (from backend)
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    
    // Standard backend error format
    if (err.success === false && err.error) {
      const errResp = err.error as Record<string, unknown>;
      const requestId = err.requestId as string | undefined;
      
      return new ApiError(
        String(errResp.message || 'Đã xảy ra lỗi'),
        String(errResp.code || 'UNKNOWN_ERROR'),
        (err.status as number) || (errResp.code ? 400 : 500),
        errResp.details as Record<string, unknown> | undefined,
        requestId
      );
    }
    
    // Legacy format with message field
    if ('message' in err && typeof err.message === 'string') {
      return new Error(String(err.message)) as Error & { requestId?: string };
    }
  }

  // String error
  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error('Đã xảy ra lỗi không xác định');
}

// =============================================
// Error Classification
// =============================================

export function isAuthError(error: Error): boolean {
  if (error instanceof AuthError) return true;
  if (error instanceof ApiError) {
    const authCodes = ['UNAUTHORIZED', 'TOKEN_EXPIRED', 'TOKEN_INVALID', 'ACCOUNT_LOCKED'];
    return authCodes.includes(error.code);
  }
  return false;
}

export function isForbiddenError(error: Error): boolean {
  if (error instanceof ApiError) {
    const forbiddenCodes = ['FORBIDDEN', 'TENANT_FORBIDDEN'];
    return forbiddenCodes.includes(error.code);
  }
  return false;
}

export function isNotFoundError(error: Error): boolean {
  if (error instanceof ApiError) {
    const notFoundCodes = ['NOT_FOUND', 'ROUTE_NOT_FOUND'];
    return notFoundCodes.includes(error.code);
  }
  return false;
}

export function isValidationError(error: Error): boolean {
  if (error instanceof ValidationError) return true;
  if (error instanceof ApiError) {
    const validationCodes = ['BAD_REQUEST', 'VALIDATION_ERROR', 'FIELD_VALIDATION_ERROR'];
    return validationCodes.includes(error.code);
  }
  return false;
}

export function isRateLimitError(error: Error): boolean {
  if (error instanceof ApiError) {
    const rateLimitCodes = ['RATE_LIMIT_EXCEEDED', 'TOO_MANY_REQUESTS'];
    return rateLimitCodes.includes(error.code);
  }
  return false;
}

export function isServerError(error: Error): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500;
  }
  if (error instanceof NetworkError) return true;
  return false;
}

export function isClientError(error: Error): boolean {
  if (error instanceof ApiError) {
    return error.status >= 400 && error.status < 500;
  }
  return false;
}

// =============================================
// Response Validation with Zod
// =============================================

export function validateResponse<T>(
  response: ApiResponse<T>,
  validator?: (data: unknown) => T
): T {
  if (!response.success) {
    const requestId = response.requestId;
    const err = new ApiError(
      response.error?.message || response.message || 'Yêu cầu thất bại',
      response.error?.code || 'UNKNOWN_ERROR',
      response.status || 500,
      response.error?.details as Record<string, unknown> | undefined,
      requestId
    );
    throw err;
  }

  if (validator) {
    return validator(response.data as unknown);
  }

  return response.data as T;
}

// =============================================
// HTTP Status Code Helpers
// =============================================

export function isAuthStatus(status: number): boolean {
  return status === 401;
}

export function isForbiddenStatus(status: number): boolean {
  return status === 403;
}

export function isNotFoundStatus(status: number): boolean {
  return status === 404;
}

export function isValidationStatus(status: number): boolean {
  return status === 400;
}

export function isServerStatus(status: number): boolean {
  return status >= 500;
}

// =============================================
// Retry Configuration
// =============================================

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryOn: (error: Error) => boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 0,
  retryDelay: 1000,
  retryOn: (error: Error) => {
    // Only retry on network errors or 5xx server errors
    return (
      error instanceof NetworkError ||
      (error instanceof ApiError && isServerError(error))
    );
  },
};

// =============================================
// Cache Configuration
// =============================================

export interface CacheConfig {
  key: string;
  ttl: number; // Time to live in milliseconds
  staleWhileRevalidate?: boolean;
}

export const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// =============================================
// Pagination Types
// =============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// =============================================
// API Request Options
// =============================================

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  retries?: number;
}

// =============================================
// User-Friendly Error Messages
// Maps error codes to localized user messages
// =============================================

export function getErrorMessage(error: Error): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case ErrorCodes.TOKEN_EXPIRED:
        return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      case ErrorCodes.TOKEN_INVALID:
        return 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
      case ErrorCodes.ACCOUNT_LOCKED:
        return 'Tài khoản đã bị khóa tạm thời. Vui lòng thử lại sau.';
      case ErrorCodes.FORBIDDEN:
      case ErrorCodes.TENANT_FORBIDDEN:
        return 'Bạn không có quyền thực hiện thao tác này.';
      case ErrorCodes.NOT_FOUND:
        return 'Không tìm thấy dữ liệu yêu cầu.';
      case ErrorCodes.VALIDATION_ERROR:
      case ErrorCodes.FIELD_VALIDATION_ERROR:
        return 'Dữ liệu nhập không hợp lệ. Vui lòng kiểm tra lại.';
      case ErrorCodes.RATE_LIMIT_EXCEEDED:
      case ErrorCodes.TOO_MANY_REQUESTS:
        return 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';
      case ErrorCodes.PAYLOAD_TOO_LARGE:
        return 'Dữ liệu gửi lên quá lớn.';
      default:
        return error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }
  }
  
  if (error instanceof NetworkError) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
  }
  
  if (error instanceof AuthError) {
    return error.message;
  }
  
  if (error instanceof ValidationError) {
    return error.message;
  }
  
  return error.message || 'Đã xảy ra lỗi không xác định.';
}

// =============================================
// Field Error Extraction
// =============================================

export function getFieldErrors(error: Error): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  
  if (error instanceof ValidationError && error.fieldErrors) {
    for (const [field, messages] of Object.entries(error.fieldErrors)) {
      fieldErrors[field] = Array.isArray(messages) ? messages[0] : String(messages);
    }
  }
  
  if (error instanceof ApiError && error.details) {
    const details = error.details;
    if (Array.isArray(details)) {
      for (const detail of details as Array<{ field?: string; message?: string }>) {
        if (detail.field) {
          fieldErrors[detail.field] = detail.message || 'Giá trị không hợp lệ';
        }
      }
    }
  }
  
  return fieldErrors;
}
