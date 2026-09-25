// =============================================================================
// Logbook Schema — Zod Validation Schemas for Digital Class Logbook
// Implements: Sổ Đầu Bài Điện Tử, Conduct Evaluation, Discipline Records
// =============================================================================
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Logbook Entry Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const createLogbookEntrySchema = z.object({
  class_id: z.string().min(1, 'class_id là bắt buộc'),
  academic_year: z.string().min(1, 'academic_year là bắt buộc'),
  semester: z.number().int().min(1).max(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày: YYYY-MM-DD'),
  day_of_week: z.number().int().min(1).max(7),
  period_number: z.number().int().min(1).max(10),
  subject_id: z.string().optional(),
  subject_name: z.string().optional(),
  lesson_title: z.string().min(1, 'Tên bài học là bắt buộc'),
  topic_code: z.string().optional(),
  present_count: z.number().int().min(0).default(0),
  absent_count: z.number().int().min(0).default(0),
  absent_student_ids: z.array(z.string()).optional(),
  score: z.number().min(0).max(10).optional(),
  rating: z.enum(['tot', 'kha', 'trung_binh', 'kem']).optional(),
  notes: z.string().optional(),
  homework: z.string().optional(),
});

export const updateLogbookEntrySchema = z.object({
  lesson_title: z.string().min(1).optional(),
  topic_code: z.string().optional(),
  present_count: z.number().int().min(0).optional(),
  absent_count: z.number().int().min(0).optional(),
  absent_student_ids: z.array(z.string()).optional(),
  score: z.number().min(0).max(10).optional().nullable(),
  rating: z.enum(['tot', 'kha', 'trung_binh', 'kem']).optional().nullable(),
  notes: z.string().optional().nullable(),
  homework: z.string().optional().nullable(),
  status: z.enum(['draft', 'submitted', 'approved']).optional(),
});

export const signLogbookEntrySchema = z.object({
  teacher_signature: z.string().min(1, 'Chữ ký là bắt buộc'),
});

export const queryLogbookEntriesSchema = z.object({
  class_id: z.string().optional(),
  teacher_id: z.string().optional(),
  academic_year: z.string().optional(),
  semester: z.number().int().min(1).max(2).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['draft', 'submitted', 'approved']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

// ─────────────────────────────────────────────────────────────────────────────
// Conduct Evaluation Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const createConductEvaluationSchema = z.object({
  student_id: z.string().min(1, 'student_id là bắt buộc'),
  class_id: z.string().min(1, 'class_id là bắt buộc'),
  academic_year: z.string().min(1, 'academic_year là bắt buộc'),
  semester: z.number().int().min(0).max(2),
  conduct_grade: z.enum(['tot', 'kha', 'dat', 'chua_dat']),
  teacher_comment: z.string().optional(),
  evaluation_type: z.enum(['midterm', 'semester', 'yearly']).default('semester'),
});

export const updateConductEvaluationSchema = z.object({
  conduct_grade: z.enum(['tot', 'kha', 'dat', 'chua_dat']).optional(),
  teacher_comment: z.string().optional().nullable(),
});

export const batchUpdateConductSchema = z.object({
  evaluations: z.array(z.object({
    student_id: z.string(),
    conduct_grade: z.enum(['tot', 'kha', 'dat', 'chua_dat']),
    teacher_comment: z.string().optional(),
  })),
});

export const queryConductEvaluationsSchema = z.object({
  class_id: z.string().optional(),
  student_id: z.string().optional(),
  academic_year: z.string().optional(),
  semester: z.number().int().min(0).max(2).optional(),
  evaluation_type: z.enum(['midterm', 'semester', 'yearly']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

// ─────────────────────────────────────────────────────────────────────────────
// Discipline Record Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const createDisciplineRecordSchema = z.object({
  class_id: z.string().min(1, 'class_id là bắt buộc'),
  group_id: z.string().optional(),
  student_id: z.string().min(1, 'student_id là bắt buộc'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày: YYYY-MM-DD'),
  period_number: z.number().int().min(0).max(12).default(0),
  violation_type: z.enum([
    'uniform', 'late', 'no_homework', 'disruptive', 'phone', 'eating', 'other'
  ]),
  points_deducted: z.number().int().default(-1),
  notes: z.string().optional(),
});

export const updateDisciplineRecordSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'resolved', 'dismissed']).optional(),
  notes: z.string().optional().nullable(),
});

export const queryDisciplineRecordsSchema = z.object({
  class_id: z.string().optional(),
  group_id: z.string().optional(),
  student_id: z.string().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  violation_type: z.enum([
    'uniform', 'late', 'no_homework', 'disruptive', 'phone', 'eating', 'other'
  ]).optional(),
  status: z.enum(['pending', 'confirmed', 'resolved', 'dismissed']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

// ─────────────────────────────────────────────────────────────────────────────
// Seating Arrangement Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const saveSeatingArrangementSchema = z.object({
  class_id: z.string().min(1, 'class_id là bắt buộc'),
  academic_year: z.string().min(1, 'academic_year là bắt buộc'),
  semester: z.number().int().min(0).max(2).default(0),
  rows: z.number().int().min(1).max(10).default(4),
  cols: z.number().int().min(1).max(10).default(5),
  seating_data: z.record(z.string(), z.string().nullable()).default({}),
  description: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Report Card Comment Generation
// ─────────────────────────────────────────────────────────────────────────────

export const generateAICommentsSchema = z.object({
  class_id: z.string().min(1, 'class_id là bắt buộc'),
  academic_year: z.string().min(1, 'academic_year là bắt buộc'),
  semester: z.number().int().min(1).max(2).default(1),
  student_ids: z.array(z.string()).optional(), // Optional: specific students, all if empty
});

// ─────────────────────────────────────────────────────────────────────────────
// Rating helpers
// ─────────────────────────────────────────────────────────────────────────────

export const RATING_LABELS = {
  tot: { label: 'Tốt', score: 10, color: 'text-emerald-600' },
  kha: { label: 'Khá', score: 8, color: 'text-blue-600' },
  trung_binh: { label: 'Trung bình', score: 6, color: 'text-amber-600' },
  kem: { label: 'Yếu', score: 4, color: 'text-red-600' },
};

export const CONDUCT_LABELS = {
  tot: { label: 'Tốt', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  kha: { label: 'Khá', color: 'text-blue-600', bg: 'bg-blue-50' },
  dat: { label: 'Đạt', color: 'text-amber-600', bg: 'bg-amber-50' },
  chua_dat: { label: 'Chưa đạt', color: 'text-red-600', bg: 'bg-red-50' },
};

export const VIOLATION_LABELS = {
  uniform: { label: 'Đồng phục', icon: '👔', points: -1 },
  late: { label: 'Đi muộn', icon: '⏰', points: -1 },
  no_homework: { label: 'Chưa học bài', icon: '📚', points: -1 },
  disruptive: { label: 'Mất trật tự', icon: '🔊', points: -2 },
  phone: { label: 'Điện thoại', icon: '📱', points: -2 },
  eating: { label: 'Ăn uống', icon: '🍔', points: -1 },
  other: { label: 'Khác', icon: '⚠️', points: -1 },
};
