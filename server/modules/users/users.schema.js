/**
 * Users Module Validation Schemas
 * Defines Zod schemas for user management queries and mutations.
 */

import { z } from 'zod';

export const USER_ROLES = [
  'super_admin',
  'school_admin',
  'admin',
  'principal',
  'vice_principal',
  'department_head',
  'teacher',
  'student',
  'parent',
];

export const USER_STATUSES = ['active', 'disabled', 'locked'];

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional().default(''),
  role: z.string().trim().optional().default('all'),
  status: z.string().trim().optional().default('all'),
  schoolId: z.string().trim().optional(),
  sortBy: z.enum(['created_at', 'name', 'username', 'code']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc', 'ASC', 'DESC']).default('desc'),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Họ và tên phải có ít nhất 2 ký tự').max(100, 'Họ và tên không quá 100 ký tự'),
  username: z
    .string()
    .trim()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(50, 'Tên đăng nhập không quá 50 ký tự')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số, dấu chấm, gạch dưới hoặc gạch ngang'),
  email: z.string().trim().email('Email không hợp lệ').optional().or(z.literal('')),
  role: z.enum(USER_ROLES, {
    errorMap: () => ({ message: 'Vai trò người dùng không hợp lệ' }),
  }),
  roles: z.array(z.string()).optional(),
  phone: z.string().trim().max(20, 'Số điện thoại không hợp lệ').optional().or(z.literal('')),
  code: z.string().trim().max(50, 'Mã định danh không quá 50 ký tự').optional().or(z.literal('')),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').optional().or(z.literal('')),
  classId: z.string().trim().optional().or(z.literal('')),
  schoolId: z.string().trim().optional(),
  avatar: z.string().url('Đường dẫn ảnh đại diện không hợp lệ').optional().or(z.literal('')),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Họ và tên phải có ít nhất 2 ký tự').max(100).optional(),
  email: z.string().trim().email('Email không hợp lệ').optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  code: z.string().trim().max(50).optional().or(z.literal('')),
  role: z.enum(USER_ROLES).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
});

export const updateStatusSchema = z.object({
  status: z.enum(['active', 'disabled', 'locked'], {
    errorMap: () => ({ message: 'Trạng thái tài khoản không hợp lệ (active, disabled, locked)' }),
  }),
  reason: z.string().trim().max(255).optional(),
});

export const assignRolesSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  roles: z.array(z.enum(USER_ROLES)).min(1, 'Phải có ít nhất một vai trò được phân công'),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').optional().or(z.literal('')),
  mustChangePassword: z.boolean().default(true),
});
