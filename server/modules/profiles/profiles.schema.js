/**
 * Profiles Module Validation Schemas
 * Defines Zod schemas for Teacher, Student, and Parent domain profiles.
 */

import { z } from 'zod';

// ========================================================================
// 1. TEACHER SCHEMAS
// ========================================================================
export const teacherStatusEnum = z.enum(['active', 'on_leave', 'resigned'], {
  errorMap: () => ({ message: 'Trạng thái công tác không hợp lệ (active, on_leave, resigned)' }),
});

export const createTeacherProfileSchema = z.object({
  userId: z.string().trim().min(1, 'Mã tài khoản người dùng không được để trống'),
  employeeId: z.string().trim().max(50, 'Mã nhân viên không quá 50 ký tự').optional(),
  departmentId: z.string().trim().optional().nullable(),
  homeroomClassId: z.string().trim().optional().nullable(),
  specialty: z.string().trim().max(100, 'Chuyên môn không quá 100 ký tự').optional(),
  qualification: z.string().trim().max(255, 'Trình độ/bằng cấp không quá 255 ký tự').optional(),
  subjects: z.union([z.array(z.string()), z.string()]).optional(),
  status: teacherStatusEnum.default('active'),
  contactEmail: z.string().trim().email('Email liên hệ không hợp lệ').optional().or(z.literal('')),
  contactPhone: z.string().trim().max(20, 'Số điện thoại liên hệ không hợp lệ').optional().or(z.literal('')),
  officeRoom: z.string().trim().max(50, 'Phòng làm việc không quá 50 ký tự').optional().or(z.literal('')),
  bio: z.string().trim().max(1000, 'Giới thiệu bản thân không quá 1000 ký tự').optional().or(z.literal('')),
});

export const updateTeacherProfileSchema = z.object({
  employeeId: z.string().trim().max(50).optional(),
  departmentId: z.string().trim().optional().nullable(),
  homeroomClassId: z.string().trim().optional().nullable(),
  specialty: z.string().trim().max(100).optional(),
  qualification: z.string().trim().max(255).optional(),
  subjects: z.union([z.array(z.string()), z.string()]).optional(),
  status: teacherStatusEnum.optional(),
  contactEmail: z.string().trim().email('Email liên hệ không hợp lệ').optional().or(z.literal('')),
  contactPhone: z.string().trim().max(20).optional().or(z.literal('')),
  officeRoom: z.string().trim().max(50).optional().or(z.literal('')),
  bio: z.string().trim().max(1000).optional().or(z.literal('')),
});

// ========================================================================
// 2. STUDENT SCHEMAS
// ========================================================================
export const studentEnrollmentStatusEnum = z.enum(['enrolled', 'active', 'graduated', 'suspended', 'transferred'], {
  errorMap: () => ({ message: 'Trạng thái học vụ không hợp lệ' }),
});

export const createStudentProfileSchema = z.object({
  userId: z.string().trim().min(1, 'Mã tài khoản người dùng không được để trống'),
  studentCode: z.string().trim().max(50, 'Mã học sinh không quá 50 ký tự').optional(),
  currentClassId: z.string().trim().optional().nullable(),
  dob: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải có định dạng YYYY-MM-DD').optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).default('male'),
  address: z.string().trim().max(255).optional().or(z.literal('')),
  enrollmentStatus: studentEnrollmentStatusEnum.default('active'),
  enrollmentDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateStudentProfileSchema = z.object({
  studentCode: z.string().trim().max(50).optional(),
  currentClassId: z.string().trim().optional().nullable(),
  dob: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải có định dạng YYYY-MM-DD').optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().trim().max(255).optional().or(z.literal('')),
  enrollmentStatus: studentEnrollmentStatusEnum.optional(),
  enrollmentDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Guardian Assignment
export const assignGuardianSchema = z.object({
  parentId: z.string().trim().min(1, 'Mã phụ huynh không được để trống'),
  relationship: z.enum(['father', 'mother', 'guardian', 'other'], {
    errorMap: () => ({ message: 'Mối quan hệ không hợp lệ (father, mother, guardian, other)' }),
  }).default('guardian'),
  isPrimaryContact: z.boolean().default(true),
  isVerified: z.boolean().default(true),
});

// ========================================================================
// 3. PARENT SCHEMAS
// ========================================================================
export const createParentProfileSchema = z.object({
  userId: z.string().trim().min(1, 'Mã tài khoản người dùng không được để trống'),
  occupation: z.string().trim().max(100).optional().or(z.literal('')),
  workplace: z.string().trim().max(255).optional().or(z.literal('')),
  contactPhone: z.string().trim().max(20).optional().or(z.literal('')),
  contactEmail: z.string().trim().email('Email liên hệ không hợp lệ').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateParentProfileSchema = z.object({
  occupation: z.string().trim().max(100).optional().or(z.literal('')),
  workplace: z.string().trim().max(255).optional().or(z.literal('')),
  contactPhone: z.string().trim().max(20).optional().or(z.literal('')),
  contactEmail: z.string().trim().email('Email liên hệ không hợp lệ').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional(),
});

export const linkChildSchema = z.object({
  studentId: z.string().trim().min(1, 'Mã học sinh không được để trống'),
  relationship: z.enum(['father', 'mother', 'guardian', 'other']).default('guardian'),
  isPrimaryContact: z.boolean().default(true),
  isVerified: z.boolean().default(true),
});

// ========================================================================
// 4. COMMON QUERIES
// ========================================================================
export const profileQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional().default(''),
  departmentId: z.string().trim().optional(),
  classId: z.string().trim().optional(),
  status: z.string().trim().optional().default('all'),
});
