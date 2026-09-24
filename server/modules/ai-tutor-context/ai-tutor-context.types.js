// =============================================================================
// AI Tutor Context Types — G38 Safe Academic Context
// =============================================================================

// ── Context Sources ──────────────────────────────────────────────────────────

export const CONTEXT_SOURCES = {
  CURRENT_SUBJECT: 'current_subject',
  CURRICULUM_TOPIC: 'curriculum_topic',
  LEARNING_RESOURCE: 'learning_resource',
  ASSIGNMENT_CONTEXT: 'assignment_context',
  STUDENT_HISTORY: 'student_history',
  TEACHER_NOTES: 'teacher_notes',
};

// ── Context Source Configuration ───────────────────────────────────────────────

export const CONTEXT_SOURCE_CONFIG = {
  [CONTEXT_SOURCES.CURRENT_SUBJECT]: {
    enabled: true,
    tokenWeight: 100,
    ttlMinutes: 60,
    requiresPermission: false,
    privacySensitive: false,
  },
  [CONTEXT_SOURCES.CURRICULUM_TOPIC]: {
    enabled: true,
    tokenWeight: 200,
    ttlMinutes: 120,
    requiresPermission: false,
    privacySensitive: false,
  },
  [CONTEXT_SOURCES.LEARNING_RESOURCE]: {
    enabled: true,
    tokenWeight: 500,
    ttlMinutes: 60,
    requiresPermission: true, // Teacher/admin must approve
    privacySensitive: false,
  },
  [CONTEXT_SOURCES.ASSIGNMENT_CONTEXT]: {
    enabled: true,
    tokenWeight: 300,
    ttlMinutes: 30,
    requiresPermission: false,
    privacySensitive: false,
  },
  [CONTEXT_SOURCES.STUDENT_HISTORY]: {
    enabled: false, // Disabled by default for privacy
    tokenWeight: 400,
    ttlMinutes: 15,
    requiresPermission: false,
    privacySensitive: true,
  },
  [CONTEXT_SOURCES.TEACHER_NOTES]: {
    enabled: false,
    tokenWeight: 150,
    ttlMinutes: 60,
    requiresPermission: true,
    privacySensitive: true,
  },
};

// ── Token Limits ─────────────────────────────────────────────────────────────

export const CONTEXT_LIMITS = {
  MAX_TOTAL_TOKENS: 4000,
  MAX_CONTEXT_PER_SOURCE: 1500,
  MAX_HISTORY_MESSAGES: 5,
  MAX_RESOURCES: 3,
  MAX_TOPIC_DEPTH: 2,
};

// ── Privacy Tiers ─────────────────────────────────────────────────────────────

export const PRIVACY_TIERS = {
  PUBLIC: 'public',          // Anyone in school can see
  SCHOOL_SCOPED: 'school',   // Same school only
  CLASS_SCOPED: 'class',     // Same class only
  STUDENT_PRIVATE: 'student', // Only the student
};

// ── Attribution Labels ────────────────────────────────────────────────────────

export const ATTRIBUTION_LABELS = {
  [CONTEXT_SOURCES.CURRENT_SUBJECT]: '📚 Chủ đề hiện tại',
  [CONTEXT_SOURCES.CURRICULUM_TOPIC]: '📖 Nội dung chương trình',
  [CONTEXT_SOURCES.LEARNING_RESOURCE]: '📎 Tài liệu học tập',
  [CONTEXT_SOURCES.ASSIGNMENT_CONTEXT]: '📝 Ngữ cảnh bài tập',
  [CONTEXT_SOURCES.STUDENT_HISTORY]: '📊 Lịch sử học tập',
  [CONTEXT_SOURCES.TEACHER_NOTES]: '💬 Ghi chú giáo viên',
};

// ── Sensitive Data Patterns ────────────────────────────────────────────────────

export const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api_key/i,
  /apikey/i,
  /private/i,
  /\b\d{9,}\b/, // Long numbers (potential IDs)
];

// ── Context Build Options ────────────────────────────────────────────────────

export class ContextBuildOptions {
  constructor({
    includeHistory = true,
    includeResources = true,
    includeAssignment = true,
    maxHistoryMessages = CONTEXT_LIMITS.MAX_HISTORY_MESSAGES,
    maxTokens = CONTEXT_LIMITS.MAX_TOTAL_TOKENS,
  } = {}) {
    this.includeHistory = includeHistory;
    this.includeResources = includeResources;
    this.includeAssignment = includeAssignment;
    this.maxHistoryMessages = maxHistoryMessages;
    this.maxTokens = maxTokens;
  }
}
