/**
 * Department Head Module - Zod Validation Schemas
 * G33: Department Head workflows with domain-scoped access.
 */

import { z } from 'zod';

// Query params for listing
export const queryDepartmentTeachersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('active'),
});

export const queryDepartmentSubjectsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  gradeLevel: z.coerce.number().int().min(10).max(12).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'archived', 'all']).default('active'),
});

export const queryDepartmentClassesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  academicYearId: z.string().optional(),
  gradeLevel: z.coerce.number().int().min(10).max(12).optional(),
  search: z.string().optional(),
});

export const queryDepartmentPerformanceSchema = z.object({
  academicYearId: z.string().optional(),
  semesterId: z.string().optional(),
  period: z.enum(['this_month', 'this_semester', 'this_year']).default('this_semester'),
});

export const queryDepartmentAssignmentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  status: z.enum(['draft', 'published', 'closed', 'all']).default('all'),
  search: z.string().optional(),
});

export const queryDepartmentStudentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  classId: z.string().optional(),
  gradeLevel: z.coerce.number().int().min(10).max(12).optional(),
  search: z.string().optional(),
});

// Update department head teacher (assign/reassign)
export const updateDepartmentHeadSchema = z.object({
  headTeacherId: z.string().min(1, 'ID giáo viên không hợp lệ').optional(),
  description: z.string().max(500).optional(),
});

// Validation schemas for teaching plan review
export const queryTeachingPlansSchema = z.object({
  subjectId: z.string().optional(),
  classId: z.string().optional(),
  gradeLevel: z.coerce.number().int().min(10).max(12).optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'all']).default('all'),
});
