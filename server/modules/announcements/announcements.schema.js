// =============================================================================
// Zod Validation Schemas — Announcements Domain
// G25 — Production Announcements
// =============================================================================
import { z } from 'zod';

export const PRIORITY_LEVELS = ['normal', 'important', 'urgent'];
export const SCOPE_VALUES = ['all', 'student', 'teacher', 'parent', 'admin', 'class'];
export const STATUS_VALUES = ['draft', 'published', 'archived'];

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, 'Tiêu đề phải có ít nhất 3 ký tự').max(255, 'Tiêu đề tối đa 255 ký tự'),
  content: z.string().min(10, 'Nội dung phải có ít nhất 10 ký tự'),
  summary: z.string().max(500, 'Tóm tắt tối đa 500 ký tự').optional(),
  scope: z.enum(SCOPE_VALUES).default('all'),
  priority: z.enum(PRIORITY_LEVELS).default('normal'),
  status: z.enum(STATUS_VALUES).default('draft'),
  // Audience targeting
  targetRoles: z.array(z.string()).optional(),
  targetClassIds: z.array(z.string()).optional(),
  // Publication
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  scheduledPublishAt: z.string().datetime().optional().nullable(),
  // Metadata
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string().optional(),
    size: z.number().optional(),
  })).optional(),
  categoryId: z.string().nullable().optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const publishAnnouncementSchema = z.object({
  scheduledPublishAt: z.string().datetime().optional().nullable(),
});

export const listAnnouncementsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(STATUS_VALUES).optional(),
  scope: z.enum(SCOPE_VALUES).optional(),
  priority: z.enum(PRIORITY_LEVELS).optional(),
  categoryId: z.string().nullable().optional(),
  schoolId: z.string().optional(),
  authorId: z.string().optional(),
  search: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const markReadSchema = z.object({
  announcementId: z.string().min(1),
});

export const announcementResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  summary: z.string().nullable(),
  scope: z.string(),
  priority: z.string(),
  status: z.string(),
  publishedAt: z.string().nullable(),
  authorId: z.string().nullable(),
  authorName: z.string().nullable(),
  schoolId: z.string().nullable(),
  classId: z.string().nullable(),
  subjectId: z.string().nullable(),
  scheduledPublishAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  targetRoles: z.array(z.string()).nullable(),
  targetClassIds: z.array(z.string()).nullable(),
  categoryId: z.string().nullable(),
  readCount: z.number().optional(),
  isRead: z.boolean().optional(),
});
