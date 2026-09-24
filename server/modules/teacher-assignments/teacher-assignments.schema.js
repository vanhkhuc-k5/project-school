import { z } from 'zod';

export const createTeacherAssignmentSchema = z.object({
  teacherId: z.string({ required_error: 'teacherId là bắt buộc' }).min(1),
  classId: z.string({ required_error: 'classId là bắt buộc' }).min(1),
  subjectId: z.string({ required_error: 'subjectId là bắt buộc' }).min(1),
  academicYearId: z.string().optional(),
  semesterId: z.string().nullable().optional(),
  role: z.enum(['primary', 'secondary', 'assistant', 'substitute']).default('primary'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày bắt đầu phải là YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày kết thúc phải là YYYY-MM-DD').nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const updateTeacherAssignmentSchema = z.object({
  role: z.enum(['primary', 'secondary', 'assistant', 'substitute']).optional(),
  status: z.enum(['active', 'inactive', 'transferred', 'revoked']).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày kết thúc phải là YYYY-MM-DD').nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const queryTeacherAssignmentsSchema = z.object({
  teacherId: z.string().optional(),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  academicYearId: z.string().optional(),
  semesterId: z.string().optional(),
  departmentId: z.string().optional(),
  role: z.enum(['all', 'primary', 'secondary', 'assistant', 'substitute']).optional(),
  status: z.enum(['all', 'active', 'inactive', 'transferred', 'revoked']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
