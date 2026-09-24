import { z } from 'zod';

export const updateSchoolProfileSchema = z.object({
  name: z.string().min(2, 'Tên trường phải có ít nhất 2 ký tự').max(255).optional(),
  short_name: z.string().max(100).optional(),
  email: z.string().email('Email không đúng định dạng').optional().or(z.literal('')),
  phone: z.string().max(32).optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  province: z.string().max(100).optional().or(z.literal('')),
  district: z.string().max(100).optional().or(z.literal('')),
  ward: z.string().max(100).optional().or(z.literal('')),
  principal_name: z.string().max(255).optional().or(z.literal('')),
  website: z.string().max(255).optional().or(z.literal('')),
  logo_url: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});
