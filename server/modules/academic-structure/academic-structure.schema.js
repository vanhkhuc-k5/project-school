/**
 * Academic Structure Validation Schemas
 * Defines Zod schemas for Departments, Subjects, and Classes.
 */

import { z } from 'zod';

// ========================================================================
// 1. DEPARTMENT SCHEMAS
// ========================================================================
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Tên tổ bộ môn phải có ít nhất 2 ký tự').max(100, 'Tên tổ không quá 100 ký tự'),
  code: z.string().trim().max(50, 'Mã tổ không quá 50 ký tự').optional().or(z.literal('')),
  description: z.string().trim().max(1000, 'Mô tả không quá 1000 ký tự').optional().or(z.literal('')),
  headTeacherId: z.string().trim().optional().nullable().or(z.literal('')),
});

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Tên tổ bộ môn phải có ít nhất 2 ký tự').max(100).optional(),
  code: z.string().trim().max(50).optional().or(z.literal('')),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  headTeacherId: z.string().trim().optional().nullable().or(z.literal('')),
});

export const queryDepartmentSchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// ========================================================================
// 2. SUBJECT SCHEMAS
// ========================================================================
export const subjectStatusEnum = z.enum(['active', 'archived'], {
  errorMap: () => ({ message: 'Trạng thái môn học không hợp lệ (active, archived)' }),
});

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2, 'Tên môn học phải có ít nhất 2 ký tự').max(100, 'Tên môn học không quá 100 ký tự'),
  code: z.string().trim().min(2, 'Mã môn học phải có ít nhất 2 ký tự').max(50, 'Mã môn học không quá 50 ký tự').toUpperCase(),
  departmentId: z.string().trim().optional().nullable().or(z.literal('')),
  gradeLevel: z.coerce.number().int().min(0).max(12).optional().nullable(),
  weeklyPeriods: z.coerce.number().int().min(1).max(20).default(3),
  credits: z.coerce.number().min(0.5).max(10).default(2.0),
  status: subjectStatusEnum.default('active'),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const updateSubjectSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: z.string().trim().min(2).max(50).toUpperCase().optional(),
  departmentId: z.string().trim().optional().nullable().or(z.literal('')),
  gradeLevel: z.coerce.number().int().min(0).max(12).optional().nullable(),
  weeklyPeriods: z.coerce.number().int().min(1).max(20).optional(),
  credits: z.coerce.number().min(0.5).max(10).optional(),
  status: subjectStatusEnum.optional(),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const querySubjectSchema = z.object({
  departmentId: z.string().trim().optional(),
  gradeLevel: z.coerce.number().int().optional(),
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// ========================================================================
// 3. CLASS SCHEMAS
// ========================================================================
export const classStatusEnum = z.enum(['active', 'archived', 'completed'], {
  errorMap: () => ({ message: 'Trạng thái lớp học không hợp lệ (active, archived, completed)' }),
});

export const createClassSchema = z.object({
  name: z.string().trim().min(2, 'Tên lớp học phải có ít nhất 2 ký tự').max(50, 'Tên lớp học không quá 50 ký tự'),
  gradeLevel: z.coerce.number().int().min(1, 'Khối lớp từ 1 đến 12').max(12, 'Khối lớp từ 1 đến 12'),
  academicYearId: z.string().trim().optional().or(z.literal('')),
  academicYear: z.string().trim().optional().or(z.literal('')),
  homeroomTeacherId: z.string().trim().optional().nullable().or(z.literal('')),
  room: z.string().trim().max(50, 'Tên phòng học không quá 50 ký tự').optional().or(z.literal('')),
  maxCapacity: z.coerce.number().int().min(1, 'Sĩ số tối thiểu là 1').max(80, 'Sĩ số tối đa là 80').default(45),
  status: classStatusEnum.default('active'),
});

export const updateClassSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  gradeLevel: z.coerce.number().int().min(1).max(12).optional(),
  academicYearId: z.string().trim().optional().or(z.literal('')),
  academicYear: z.string().trim().optional().or(z.literal('')),
  homeroomTeacherId: z.string().trim().optional().nullable().or(z.literal('')),
  room: z.string().trim().max(50).optional().or(z.literal('')),
  maxCapacity: z.coerce.number().int().min(1).max(80).optional(),
  status: classStatusEnum.optional(),
});

export const queryClassSchema = z.object({
  academicYearId: z.string().trim().optional(),
  gradeLevel: z.coerce.number().int().optional(),
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
