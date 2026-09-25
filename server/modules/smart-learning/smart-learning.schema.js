// =============================================================================
// Smart Learning Schema — Zod Validation for Flashcards, SM-2, Flipped Classroom
// Implements: Flashcard system, spaced repetition, exam parser
// =============================================================================
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Flashcard Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const createFlashcardDeckSchema = z.object({
  subject_id: z.string().optional(),
  subject_name: z.string().optional(),
  grade_level: z.number().int().min(1).max(12).optional(),
  title: z.string().min(1, 'Tiêu đề bộ thẻ là bắt buộc'),
  description: z.string().optional(),
  deck_type: z.enum(['general', 'vocabulary', 'formula', 'history', 'geography', 'science']).default('general'),
  is_system: z.boolean().default(false),
  is_public: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

export const createFlashcardCardSchema = z.object({
  deck_id: z.string().min(1, 'deck_id là bắt buộc'),
  front_text: z.string().min(1, 'Nội dung mặt trước là bắt buộc'),
  front_type: z.enum(['text', 'formula', 'image', 'mixed']).default('text'),
  front_image_url: z.string().url().optional(),
  back_text: z.string().min(1, 'Nội dung mặt sau là bắt buộc'),
  back_type: z.enum(['text', 'formula', 'image', 'mixed']).default('text'),
  back_image_url: z.string().url().optional(),
  phonetic: z.string().optional(),
  audio_url: z.string().url().optional(),
  example_sentence: z.string().optional(),
  formula_latex: z.string().optional(),
  formula_type: z.enum(['equation', 'theorem', 'definition', 'constant']).optional(),
  hint: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).default(2),
  tags: z.array(z.string()).optional(),
});

export const reviewFlashcardSchema = z.object({
  card_id: z.string().min(1, 'card_id là bắt buộc'),
  quality: z.number().int().min(0).max(5).describe('SM-2 quality: 0= blackout, 1=wrong, 2=hard, 3=correct, 4=easy, 5=perfect'),
  response_time_ms: z.number().int().optional(),
});

export const queryFlashcardDecksSchema = z.object({
  subject_id: z.string().optional(),
  grade_level: z.number().int().min(1).max(12).optional(),
  deck_type: z.enum(['general', 'vocabulary', 'formula', 'history', 'geography', 'science']).optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

// ─────────────────────────────────────────────────────────────────────────────
// Flipped Classroom Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const createFlippedMaterialSchema = z.object({
  class_id: z.string().min(1, 'class_id là bắt buộc'),
  subject_id: z.string().optional(),
  subject_name: z.string().optional(),
  timetable_entry_id: z.string().optional(),
  title: z.string().min(1, 'Tiêu đề là bắt buộc'),
  description: z.string().optional(),
  slide_url: z.string().url().optional(),
  mindmap_url: z.string().url().optional(),
  video_url: z.string().url().optional(),
  summary_text: z.string().optional(),
  key_points: z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
  warmup_questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    options: z.array(z.string()),
    correct_answer: z.number().int().min(0).max(3),
  })).optional(),
  available_from: z.string().datetime().optional(),
  available_until: z.string().datetime().optional(),
});

export const queryFlippedMaterialsSchema = z.object({
  class_id: z.string().optional(),
  subject_id: z.string().optional(),
  timetable_entry_id: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

// ─────────────────────────────────────────────────────────────────────────────
// Exam Parser Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const parseExamDocxSchema = z.object({
  // Base64 encoded file content
  file_content: z.string().min(1, 'Nội dung file là bắt buộc'),
  filename: z.string().min(1, 'Tên file là bắt buộc'),
  subject: z.string().optional(),
});

export const updateParsedQuestionSchema = z.object({
  prompt: z.string().optional(),
  options: z.array(z.string()).optional(),
  correct_answer: z.number().int().min(0).max(3).optional(),
  difficulty: z.enum(['NB', 'TH', 'VD', 'VDC']).optional(),
  max_score: z.number().positive().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SM-2 Algorithm Constants
// ─────────────────────────────────────────────────────────────────────────────

export const SM2_QUALITY_LABELS = {
  0: { label: 'Quên hoàn toàn', color: 'text-red-600', description: 'Không nhớ gì' },
  1: { label: 'Sai', color: 'text-red-500', description: 'Nhớ nhưng trả lời sai' },
  2: { label: 'Khó', color: 'text-amber-600', description: 'Phải suy nghĩ lâu' },
  3: { label: 'Nhớ tốt', color: 'text-emerald-600', description: 'Trả lời đúng sau khi nhớ lại' },
  4: { label: 'Quá dễ', color: 'text-blue-600', description: 'Trả lời dễ dàng' },
  5: { label: 'Hoàn hảo', color: 'text-purple-600', description: 'Nhớ ngay lập tức' },
};

export const MASTERY_LEVELS = {
  new: { label: 'Mới', color: 'gray', min_interval: 0, max_interval: 1 },
  learning: { label: 'Đang học', color: 'amber', min_interval: 1, max_interval: 7 },
  review: { label: 'Ôn tập', color: 'blue', min_interval: 7, max_interval: 30 },
  mastered: { label: 'Đã thuộc', color: 'emerald', min_interval: 30, max_interval: 365 },
};

export const CATEGORY_COLORS = {
  alkali_metal: { bg: 'bg-red-500', text: 'text-white', label: 'Kim loại kiềm' },
  alkaline_earth: { bg: 'bg-orange-500', text: 'text-white', label: 'Kim loại kiềm thổ' },
  transition_metal: { bg: 'bg-yellow-500', text: 'text-black', label: 'Kim loại chuyển tiếp' },
  post_transition_metal: { bg: 'bg-yellow-300', text: 'text-black', label: 'Kim loại sau chuyển tiếp' },
  metalloid: { bg: 'bg-teal-500', text: 'text-white', label: 'Á kim' },
  nonmetal: { bg: 'bg-green-500', text: 'text-white', label: 'Phi kim' },
  halogen: { bg: 'bg-green-400', text: 'text-white', label: 'Halogen' },
  noble_gas: { bg: 'bg-purple-500', text: 'text-white', label: 'Khí hiếm' },
  lanthanide: { bg: 'bg-pink-500', text: 'text-white', label: 'Lanthanide' },
  actinide: { bg: 'bg-pink-400', text: 'text-white', label: 'Actinide' },
  unknown: { bg: 'bg-gray-500', text: 'text-white', label: 'Không xác định' },
};
