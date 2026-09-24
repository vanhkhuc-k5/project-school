/**
 * Standardized API Contracts and Envelope Types
 */

import { User } from './domain';

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp?: string;
    requestId?: string;
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  status?: number;
  error?: {
    code: string;
    message: string;
    details?: ApiFieldError[] | unknown;
  };
  message?: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

export interface AuthSuccessPayload {
  token: string;
  user: User;
}

export interface LoginRequestPayload {
  identifier: string;
  password: string;
  role?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface JwtTokenPayload {
  id: string;
  role: string;
  email: string;
  schoolId?: string;
  iat?: number;
  exp?: number;
}
