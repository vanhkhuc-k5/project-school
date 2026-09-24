// =============================================================================
// AI Tutor Types — G37 Production AI Tutor Architecture
// =============================================================================

// ── Provider Types ─────────────────────────────────────────────────────────────

export const AI_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GEMINI: 'gemini',
  AZURE_OPENAI: 'azure_openai',
  MOCK: 'mock',
};

// ── Message Types ─────────────────────────────────────────────────────────────

export const MESSAGE_ROLES = {
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
};

// ── Tutor Context Types ────────────────────────────────────────────────────────

export const GRADE_LEVELS = {
  PRIMARY_1_5: 'primary_1_5',
  SECONDARY_6_9: 'secondary_6_9',
  HIGH_SCHOOL_10_12: 'high_school_10_12',
};

// ── AI Request/Response Types ─────────────────────────────────────────────────

export class AIRequest {
  constructor({
    messages,
    studentId,
    studentName,
    gradeLevel,
    subject,
    topic,
    schoolContext,
    options = {},
  }) {
    this.messages = messages;
    this.studentId = studentId;
    this.studentName = studentName;
    this.gradeLevel = gradeLevel;
    this.subject = subject;
    this.topic = topic;
    this.schoolContext = schoolContext;
    this.options = {
      temperature: 0.7,
      maxTokens: 1000,
      ...options,
    };
  }
}

export class AIResponse {
  constructor({ content, usage, model, finishReason }) {
    this.content = content;
    this.usage = usage;
    this.model = model;
    this.finishReason = finishReason;
  }
}

// ── Feature Flag ─────────────────────────────────────────────────────────────

export const AI_TUTOR_CONFIG = {
  ENABLED: process.env.AI_TUTOR_ENABLED !== 'false',
  PROVIDER: process.env.AI_PROVIDER || AI_PROVIDERS.MOCK,
  RATE_LIMIT_MESSAGES: parseInt(process.env.AI_TUTOR_RATE_LIMIT || '50', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.AI_TUTOR_RATE_WINDOW || '60000', 10),
  MAX_CONVERSATION_TURNS: 20,
  MAX_PROMPT_LENGTH: 4000,
};

// ── Rate Limit Status ─────────────────────────────────────────────────────────

export class RateLimitStatus {
  constructor({ allowed, remaining, resetAt, total }) {
    this.allowed = allowed;
    this.remaining = remaining;
    this.resetAt = resetAt;
    this.total = total;
  }

  isExceeded() {
    return !this.allowed;
  }
}

// ── Tutor System Prompt ───────────────────────────────────────────────────────

export const TUTOR_SYSTEM_PROMPT = `Bạn là Gia Sư AI Socratic cho học sinh Việt Nam.

## Nguyên tắc Socratic
- Không đưa ra đáp án trực tiếp
- Đặt câu hỏi gợi mở để học sinh tự tìm ra lời giải
- Hướng dẫn tư duy từng bước
- Khuyến khích suy luận logic

## Hành vi
- Giải thích khái niệm khi học sinh yêu cầu
- Phân tích lỗi sai và hướng dẫn cách sửa
- Liên hệ thực tế khi phù hợp
- Điều chỉnh ngôn ngữ theo độ tuổi

## Bảo mật & An toàn
- KHÔNG hoàn thành bài tập kiểm tra thay học sinh
- Gợi ý phương pháp, không đưa đáp án cuối cùng cho bài kiểm tra
- Phù hợp với học sinh tiểu học đến trung học phổ thông
- Luôn phản hồi bằng tiếng Việt

## Ngữ cảnh
- Xác định môn học và chủ đề từ câu hỏi
- Điều chỉnh độ khó theo cấp học
- Ghi nhận các bước học sinh đã làm được`;

// ── Privacy Settings ─────────────────────────────────────────────────────────

export const PRIVACY_CONFIG = {
  // Fields to NEVER send to AI provider
  BLOCKED_FIELDS: [
    'password',
    'token',
    'secret',
    'key',
    'ssn',
    'identity_number',
    'birth_certificate',
    'address',
    'phone',
    'email',
    'parent_name',
    'parent_phone',
  ],

  // Fields to anonymize (replace with placeholder)
  ANONYMIZE_FIELDS: [
    'id',
    'student_id',
    'user_id',
    'name',
  ],

  // Context info that IS safe to send
  SAFE_CONTEXT: [
    'grade_level',
    'subject',
    'topic',
    'grade',
  ],
};

// ── Data Sent to AI Provider ─────────────────────────────────────────────────
//
// The following student information IS sent to the configured AI provider:
//   - grade_level     (e.g. "high_school_10_12") — no PII
//   - subject         (e.g. "Toán 10") — no PII
//   - topic           (e.g. "Phương trình bậc 2") — no PII
//   - school_name     (e.g. "Trường THPT ABC") — school name only, no contact info
//   - user message text (student-submitted content)
//
// The following is NEVER sent:
//   - Any field listed in BLOCKED_FIELDS (passwords, tokens, secrets, IDs)
//   - Student name, email, phone, address, or any PII
//   - Parent information
//
// Reference: docs/security/AI_TUTOR_PRIVACY.md
