// =============================================================================
// Zod Validation Schemas for Gradebook Domain (G20)
// =============================================================================
import { z } from 'zod';

// -----------------------------------------------------------------------
// Grade Category
// -----------------------------------------------------------------------
export const gradeCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Tên loại điểm không được trống').max(100),
  code: z.string().min(1, 'Mã loại điểm không được trống').max(50),
  coefficient: z.number().positive().max(10).default(1.0),
  weight: z.number().min(0).max(1).default(1.0),     // fraction of final grade
  minEntriesPerSemester: z.number().int().min(0).default(1),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const createGradeCategorySchema = gradeCategorySchema;
export const updateGradeCategorySchema = gradeCategorySchema.partial();

// -----------------------------------------------------------------------
// Grade Entry (individual score row)
// -----------------------------------------------------------------------
export const createGradeSchema = z.object({
  studentId: z.string().min(1, 'Mã học sinh không được trống'),
  subjectId: z.string().optional(),
  subject: z.string().min(1, 'Môn học không được trống').max(100),
  assignmentId: z.string().optional(),
  gradeCategoryId: z.string().optional(),
  // Raw score (the actual student score)
  rawScore: z.number().min(0, 'Điểm không được âm'),
  // Max possible score for this entry
  maxScore: z.number().positive().max(1000).default(10.0),
  // Weight within the category (0.0–1.0)
  weight: z.number().min(0).max(1).default(1.0),
  gradingPeriod: z.enum(['regular', 'midterm', 'final', 'special']).default('regular'),
  academicYearId: z.string().optional(),
  semesterId: z.string().optional(),
  teacherFeedback: z.string().max(2000).optional().default(''),
});

export const updateGradeSchema = z.object({
  rawScore: z.number().min(0).optional(),
  maxScore: z.number().positive().max(1000).optional(),
  weight: z.number().min(0).max(1).optional(),
  gradingPeriod: z.enum(['regular', 'midterm', 'final', 'special']).optional(),
  teacherFeedback: z.string().max(2000).optional(),
  status: z.enum(['draft', 'published']).optional(),
});

export const publishGradeSchema = z.object({
  gradeId: z.string().min(1, 'gradeId là bắt buộc'),
});

// -----------------------------------------------------------------------
// Batch publish grades
// -----------------------------------------------------------------------
export const batchPublishGradesSchema = z.object({
  gradeIds: z.array(z.string()).min(1, 'Phải chọn ít nhất 1 điểm'),
});

// -----------------------------------------------------------------------
// Grade Calculation Config
// -----------------------------------------------------------------------
export const createGradeConfigSchema = z.object({
  schoolId: z.string().min(1, 'schoolId là bắt buộc'),
  academicYearId: z.string().min(1, 'academicYearId là bắt buộc'),
  semesterId: z.string().min(1, 'semesterId là bắt buộc'),
  periodLabel: z.string().min(1, 'periodLabel là bắt buộc').max(50),
  categoryWeights: z.record(z.string(), z.number().min(0).max(1)),
  minEntries: z.record(z.string(), z.number().int().min(0)),
  scaleFactor: z.number().positive().max(100).default(10.0),
});

export const computeGradesSchema = z.object({
  studentIds: z.array(z.string()).optional(),  // if empty, compute all enrolled students
  academicYearId: z.string().min(1),
  semesterId: z.string().min(1),
  subjectId: z.string().optional(),
  configId: z.string().optional(),  // use specific config, or derive from current weights
});

// -----------------------------------------------------------------------
// Query schemas
// -----------------------------------------------------------------------
export const queryGradesSchema = z.object({
  studentId: z.string().optional(),
  subjectId: z.string().optional(),
  gradeCategoryId: z.string().optional(),
  academicYearId: z.string().optional(),
  semesterId: z.string().optional(),
  status: z.enum(['all', 'draft', 'published']).optional().default('all'),
  gradingPeriod: z.enum(['all', 'regular', 'midterm', 'final', 'special']).optional().default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

export const queryCategoriesSchema = z.object({
  schoolId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const querySnapshotsSchema = z.object({
  studentId: z.string().optional(),
  academicYearId: z.string().optional(),
  semesterId: z.string().optional(),
  subjectId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
