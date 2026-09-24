// =============================================================================
// Zod Validation Schemas for Submission Workflow (G19)
// =============================================================================
import { z } from 'zod';

// -----------------------------------------------------------------------
// Save draft answers
// -----------------------------------------------------------------------
export const saveDraftSchema = z.object({
  answers: z.record(z.string(), z.union([
    z.string(),
    z.boolean(),
    z.number(),
  ])).optional().default({}),
});

// -----------------------------------------------------------------------
// Submit answers
// -----------------------------------------------------------------------
export const submitAssignmentSchema = z.object({
  answers: z.record(z.string(), z.union([
    z.string(),
    z.boolean(),
    z.number(),
  ])).optional().default({}),
});

// -----------------------------------------------------------------------
// Grade submission (teacher action)
// -----------------------------------------------------------------------
export const gradeSubmissionSchema = z.object({
  submissionId: z.string().min(1, 'submissionId là bắt buộc'),
  score: z.number().min(0, 'Điểm không được âm').max(100),
  feedback: z.string().max(2000).optional().default(''),
});

// -----------------------------------------------------------------------
// Query submissions (for teachers/admin)
// -----------------------------------------------------------------------
export const querySubmissionsSchema = z.object({
  assignmentId: z.string().optional(),
  studentId: z.string().optional(),
  status: z.enum(['all', 'in_progress', 'submitted', 'graded']).optional().default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

// -----------------------------------------------------------------------
// Student view: published assignments list
// -----------------------------------------------------------------------
export const queryStudentAssignmentsSchema = z.object({
  status: z.enum(['all', 'pending', 'completed']).optional().default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
