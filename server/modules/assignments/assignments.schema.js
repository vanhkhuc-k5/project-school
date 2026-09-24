// =============================================================================
// Zod Validation Schemas for Assignment Authoring (G18)
// =============================================================================
import { z } from 'zod';

// -----------------------------------------------------------------------
// Nested: Question Option (for multiple_choice)
// -----------------------------------------------------------------------
export const questionOptionSchema = z.object({
  id: z.string().optional(),          // client-side id, ignored on write
  text: z.string().min(1, 'Nội dung đáp án không được trống').max(500),
  isCorrect: z.boolean().optional(),   // used only during authoring, NOT stored
});

// -----------------------------------------------------------------------
// Question (used inside assignment payload)
// -----------------------------------------------------------------------
export const assignmentQuestionSchema = z.object({
  id: z.string().optional(),           // client-side key, ignored on write
  prompt: z.string().min(1, 'Câu hỏi không được trống').max(2000),
  questionType: z.enum(['multiple_choice', 'short_answer', 'essay']).default('multiple_choice'),
  maxScore: z.number().positive('Điểm câu hỏi phải lớn hơn 0').max(100).default(1.0),
  options: z.array(questionOptionSchema).optional(),   // MC only
  correctAnswer: z.string().optional(),               // "A"/"B"/"C"/"D" for MC, text for SA
  explanation: z.string().max(1000).optional(),
  hasPlot: z.boolean().optional().default(false),
  plotData: z.string().optional(),
}).refine(
  (data) => {
    if (data.questionType === 'multiple_choice') {
      if (!data.options || data.options.length < 2) {
        return false;
      }
    }
    return true;
  },
  { message: 'Câu hỏi trắc nghiệm phải có ít nhất 2 đáp án', path: ['options'] }
).refine(
  (data) => {
    if (data.questionType === 'multiple_choice' && data.options) {
      const hasCorrect = data.options.some((o) => o.isCorrect === true);
      if (!hasCorrect) return false;
    }
    return true;
  },
  { message: 'Câu hỏi trắc nghiệm phải có ít nhất 1 đáp án đúng', path: ['options'] }
);

// -----------------------------------------------------------------------
// Create Assignment Payload
// -----------------------------------------------------------------------
export const createAssignmentSchema = z.object({
  title: z.string().min(1, 'Tiêu đề bài tập không được trống').max(255),
  instructions: z.string().max(5000).optional().default(''),
  subject: z.string().min(1, 'Môn học không được trống').max(100),
  subjectId: z.string().optional(),
  classId: z.string().optional(),   // single class OR use targetClassIds
  targetClassIds: z.array(z.string()).optional().default([]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Hạn nộp phải theo định dạng YYYY-MM-DD'),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ hạn nộp phải theo định dạng HH:MM').default('23:59'),
  durationMinutes: z.number().int().min(5).max(300).optional().default(45),
  gradingScale: z.string().optional().default('Thang 10 (Hệ số 1)'),
  type: z.enum(['quiz', 'essay', 'attachment']).default('quiz'),
  totalScore: z.number().positive().max(1000).optional().default(10.0),
  academicYearId: z.string().optional(),
  semesterId: z.string().optional(),
  lockAfterDue: z.boolean().optional().default(true),
  shuffleQuestions: z.boolean().optional().default(true),
  questions: z.array(assignmentQuestionSchema).optional().default([]),
  // publish: if true, immediately publishes instead of saving as draft
  publish: z.boolean().optional().default(false),
});

// -----------------------------------------------------------------------
// Update Assignment Payload (draft edits)
// -----------------------------------------------------------------------
export const updateAssignmentSchema = createAssignmentSchema.partial().omit({
  publish: true,   // publishing is a separate action
}).extend({
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

// -----------------------------------------------------------------------
// Publish Action (separate endpoint)
// -----------------------------------------------------------------------
export const publishAssignmentSchema = z.object({
  id: z.string().min(1, 'ID bài tập không được trống'),
});

// -----------------------------------------------------------------------
// Query params
// -----------------------------------------------------------------------
export const queryAssignmentsSchema = z.object({
  status: z.enum(['all', 'draft', 'published', 'archived']).optional().default('all'),
  subject: z.string().optional(),
  classId: z.string().optional(),
  academicYearId: z.string().optional(),
  semesterId: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// -----------------------------------------------------------------------
// Grade Submission
// -----------------------------------------------------------------------
export const gradeSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  score: z.number().min(0, 'Điểm không được âm').max(100),
  feedback: z.string().max(2000).optional().default(''),
});
