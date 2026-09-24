/**
 * Auth Module Validation Schemas
 * Defines Zod validation rules for authentication endpoints.
 */

import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string({ required_error: 'Vui lòng nhập tài khoản và mật khẩu' })
    .trim()
    .min(1, 'Vui lòng nhập tài khoản và mật khẩu'),
  password: z
    .string({ required_error: 'Vui lòng nhập tài khoản và mật khẩu' })
    .trim()
    .min(1, 'Vui lòng nhập tài khoản và mật khẩu'),
  role: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' })
    .min(1, 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới'),
  newPassword: z
    .string({ required_error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' })
    .min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Vui lòng nhập địa chỉ email' })
    .trim()
    .email('Email không đúng định dạng'),
});

export const resetPasswordSchema = z.object({
  token: z
    .string({ required_error: 'Mã token đặt lại mật khẩu là bắt buộc' })
    .trim()
    .min(1, 'Mã token đặt lại mật khẩu là bắt buộc'),
  newPassword: z
    .string({ required_error: 'Vui lòng nhập mật khẩu mới' })
    .min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

export const registerSchema = z.object({
  username: z
    .string({ required_error: 'Thiếu thông tin bắt buộc: username' })
    .trim()
    .min(1, 'Thiếu thông tin bắt buộc: username'),
  email: z
    .string({ required_error: 'Thiếu thông tin bắt buộc: email' })
    .trim()
    .email('Email không đúng định dạng'),
  name: z
    .string({ required_error: 'Thiếu thông tin bắt buộc: name' })
    .trim()
    .min(1, 'Thiếu thông tin bắt buộc: name'),
  role: z.enum(['student', 'teacher', 'parent', 'admin'], {
    errorMap: () => ({ message: 'Vai trò không hợp lệ. Chỉ chấp nhận: student, teacher, parent, admin' }),
  }),
  code: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').optional(),
});
