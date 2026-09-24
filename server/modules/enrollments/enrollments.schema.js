import { z } from 'zod';

export const enrollStudentSchema = z.object({
  studentId: z.string({ required_error: 'studentId là bắt buộc' }).min(1),
  classId: z.string({ required_error: 'classId là bắt buộc' }).min(1),
  academicYearId: z.string().optional(),
  enrollmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày ghi danh phải là YYYY-MM-DD').optional(),
  notes: z.string().max(500).optional(),
});

export const transferStudentSchema = z.object({
  studentId: z.string({ required_error: 'studentId là bắt buộc' }).min(1),
  targetClassId: z.string({ required_error: 'targetClassId là bắt buộc' }).min(1),
  academicYearId: z.string().optional(),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày chuyển lớp phải là YYYY-MM-DD').optional(),
  reason: z.string({ required_error: 'Lý do chuyển lớp là bắt buộc' }).min(3, 'Lý do chuyển lớp tối thiểu 3 ký tự').max(500),
  notes: z.string().max(500).optional(),
});

export const withdrawStudentSchema = z.object({
  studentId: z.string({ required_error: 'studentId là bắt buộc' }).min(1),
  withdrawalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày rút học sinh phải là YYYY-MM-DD').optional(),
  reason: z.string({ required_error: 'Lý do rút hồ sơ/nghỉ học là bắt buộc' }).min(3, 'Lý do rút hồ sơ tối thiểu 3 ký tự').max(500),
  notes: z.string().max(500).optional(),
});

export const bulkEnrollSchema = z.object({
  classId: z.string({ required_error: 'classId là bắt buộc' }).min(1),
  academicYearId: z.string().optional(),
  studentIds: z.array(z.string().min(1), { required_error: 'studentIds danh sách học sinh là bắt buộc' }).min(1, 'Cần ít nhất 1 học sinh để ghi danh'),
  enrollmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD').optional(),
  notes: z.string().max(500).optional(),
});

export const enrollmentQuerySchema = z.object({
  studentId: z.string().optional(),
  classId: z.string().optional(),
  academicYearId: z.string().optional(),
  status: z.enum(['all', 'enrolled', 'completed', 'dropped', 'transferred', 'withdrawn', 'suspended']).optional(),
  isCurrent: z.enum(['true', 'false', 'all']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
