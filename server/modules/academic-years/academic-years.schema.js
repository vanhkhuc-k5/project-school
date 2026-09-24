import { z } from 'zod';

export const createAcademicYearSchema = z.object({
  name: z.string().min(2, 'Tên năm học phải có ít nhất 2 ký tự').max(50),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày bắt đầu phải theo định dạng YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày kết thúc phải theo định dạng YYYY-MM-DD'),
  is_current: z.boolean().optional().default(false),
}).refine((data) => new Date(data.start_date) < new Date(data.end_date), {
  message: 'Ngày kết thúc năm học phải sau ngày bắt đầu',
  path: ['end_date'],
});

export const updateAcademicYearSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_current: z.boolean().optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) < new Date(data.end_date);
  }
  return true;
}, {
  message: 'Ngày kết thúc năm học phải sau ngày bắt đầu',
  path: ['end_date'],
});

export const createSemesterSchema = z.object({
  name: z.string().min(2, 'Tên học kỳ phải có ít nhất 2 ký tự').max(50),
  semester_number: z.number().int().min(1).max(3),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày bắt đầu phải theo định dạng YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày kết thúc phải theo định dạng YYYY-MM-DD'),
  is_current: z.boolean().optional().default(false),
}).refine((data) => new Date(data.start_date) < new Date(data.end_date), {
  message: 'Ngày kết thúc học kỳ phải sau ngày bắt đầu',
  path: ['end_date'],
});

export const updateSemesterSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  semester_number: z.number().int().min(1).max(3).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_current: z.boolean().optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) < new Date(data.end_date);
  }
  return true;
}, {
  message: 'Ngày kết thúc học kỳ phải sau ngày bắt đầu',
  path: ['end_date'],
});
