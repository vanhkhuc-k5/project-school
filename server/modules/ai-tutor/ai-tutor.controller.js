// =============================================================================
// AI Tutor Controller — HTTP Handlers
// G37 Production AI Tutor Architecture
// =============================================================================

import { aiTutorService } from './ai-tutor.service.js';
import { conversationRepo } from './ai-tutor.repository.js';
import { db } from '../../db.js';

/**
 * Get authenticated student ID from request
 * Falls back gracefully if student record not found in DB
 * Uses students.id (the PK) for FK constraint compliance.
 */
function getStudentContext(req) {
  const userId = req.user.id;

  try {
    // Look up the student's primary key (students.id)
    // Note: students table doesn't have 'name' or 'grade_level' columns;
    // those come from the joined users table
    const student = db.prepare(`
      SELECT s.id, s.grade_level, u.name, u.school_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE u.id = ?
    `).get(userId);

    if (student && student.id) {
      return {
        studentId: student.id,    // students.id — valid FK target
        studentName: student.name || req.user.name || 'Học sinh',
        gradeLevel: student.grade_level || req.user.grade_level || 'high_school_10_12',
        schoolId: student.school_id || req.user.school_id,
        hasStudentRecord: true,
      };
    }
  } catch (err) {
    console.warn(`[AI Tutor] Student lookup failed for ${userId}: ${err.message}`);
  }

  // No student record found — use user_id as fallback (not a valid FK target,
  // so messages will be returned but not persisted to ai_tutor_messages)
  return {
    studentId: userId,           // Will NOT satisfy FK constraint — skip DB save
    studentName: req.user.name || 'Học sinh',
    gradeLevel: req.user.grade_level || 'high_school_10_12',
    schoolId: req.user.school_id,
    hasStudentRecord: false,      // Signal to skip DB persistence
  };
}

/**
 * Format message for API response
 */
function formatMessage(msg) {
  return {
    id: msg.id,
    sender: msg.sender,
    text: msg.text,
    topic: msg.topic,
    hasImage: msg.has_image === 1 || msg.hasImage,
    imageCaption: msg.image_caption || msg.imageCaption,
    content: msg.aiContent || (msg.ai_content ? JSON.parse(msg.ai_content) : null),
    createdAt: msg.createdAt || msg.created_at,
  };
}

// ── Message Endpoints ────────────────────────────────────────────────────────

/**
 * GET /ai-tutor/messages — Get conversation history
 */
export async function getMessages(req, res, next) {
  try {
    const { studentId, hasStudentRecord } = getStudentContext(req);
    const { topic, limit } = req.query;

    const history = hasStudentRecord
      ? await conversationRepo.getConversationHistory(studentId, { topic, limit: parseInt(limit) || 50 })
      : [];

    res.json({
      success: true,
      messages: history.map(formatMessage),
      rateLimit: aiTutorService.getRateLimitStatus(studentId),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /ai-tutor/messages — Clear conversation history
 */
export async function clearMessages(req, res, next) {
  try {
    const { studentId } = getStudentContext(req);
    const { topic } = req.query;

    const deleted = await conversationRepo.deleteConversation(studentId, topic);

    res.json({
      success: true,
      deleted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /ai-tutor/topics — Get conversation topics
 */
export async function getTopics(req, res, next) {
  try {
    const { studentId } = getStudentContext(req);

    const topics = await conversationRepo.getStudentTopics(studentId);

    res.json({
      success: true,
      topics,
    });
  } catch (err) {
    next(err);
  }
}

// ── Chat Endpoints ───────────────────────────────────────────────────────────

/**
 * POST /ai-tutor/chat — Send message and get AI response
 */
export async function chat(req, res, next) {
  try {
    const { text, topic, imageData } = req.body;
    const { studentId, studentName, gradeLevel, schoolId, hasStudentRecord } = getStudentContext(req);

    // Validate input
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        code: 'EMPTY_MESSAGE',
        message: 'Nội dung tin nhắn không được để trống',
      });
    }

    // Check if feature is enabled
    if (!aiTutorService.isEnabled()) {
      return res.status(503).json({
        success: false,
        code: 'FEATURE_DISABLED',
        message: 'Gia sư AI hiện đang tạm ngừng hoạt động. Vui lòng thử lại sau.',
      });
    }

    // Get conversation history (only if student record exists — otherwise empty)
    const history = hasStudentRecord
      ? await conversationRepo.getConversationHistory(studentId, { topic: topic || 'general', limit: 20 })
      : [];

    // Generate message IDs
    const userMsgId = `msg_u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const aiMsgId = `msg_ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Save user message (only if student record exists to satisfy FK constraint)
    if (hasStudentRecord) {
      await conversationRepo.saveMessage({
        id: userMsgId,
        studentId,
        topic: topic || 'general',
        sender: 'user',
        text: text.trim(),
      }).catch(err => console.warn('[AI Tutor] Could not save user message:', err.message));
    }

    // Build context for AI
    const context = {
      studentId,
      studentName,
      gradeLevel,
      subject: topic || 'general',
      topic: topic || 'general',
      schoolId,
    };

    // Call AI service
    const aiResponse = await aiTutorService.chat({
      studentId,
      studentName,
      userInput: text.trim(),
      conversationHistory: history,
      context,
    });

    // Save AI response (only if student record exists)
    if (hasStudentRecord) {
      conversationRepo.saveMessage({
        id: aiMsgId,
        studentId,
        topic: topic || 'general',
        sender: 'ai',
        text: aiResponse.content,
        aiContent: {
          intro: aiResponse.content,
          model: aiResponse.model,
          timestamp: new Date().toISOString(),
        },
      }).catch(err => console.warn('[AI Tutor] Could not save AI response:', err.message));
    }

    // Format response
    const response = {
      id: aiMsgId,
      sender: 'ai',
      text: aiResponse.content,
      time: 'Vừa xong',
      badge: 'Phản hồi Socratic',
      content: {
        intro: aiResponse.content,
        model: aiResponse.model,
      },
    };

    res.json({
      success: true,
      reply: response,
      aiReply: response,
      rateLimit: aiResponse.rateLimit,
    });
  } catch (err) {
    // Handle rate limit errors
    if (err.code === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Bạn đã gửi quá nhiều tin nhắn. Vui lòng chờ một chút trước khi tiếp tục.',
        resetAt: err.resetAt,
      });
    }

    // Handle provider errors
    if (err.code) {
      return res.status(500).json({
        success: false,
        code: err.code,
        message: err.message,
        suggestion: err.suggestion,
      });
    }

    next(err);
  }
}

// ── Admin Endpoints ──────────────────────────────────────────────────────────

/**
 * GET /ai-tutor/health — Check AI service health
 */
export async function getHealth(req, res, next) {
  try {
    const health = await aiTutorService.getHealth();
    const providers = aiTutorService.getAvailableProviders();

    res.json({
      success: true,
      enabled: aiTutorService.isEnabled(),
      ...health,
      providers,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /ai-tutor/admin/reset-rate — Reset rate limit for a student
 */
export async function resetRateLimit(req, res, next) {
  try {
    const { studentId } = req.body;

    // Only admins can reset rate limits
    if (!['admin', 'school_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Chỉ quản trị viên mới có quyền reset rate limit',
      });
    }

    aiTutorService.resetRateLimit(studentId);

    res.json({
      success: true,
      message: 'Rate limit đã được reset',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /ai-tutor/stats — Get usage statistics
 */
export async function getStats(req, res, next) {
  try {
    const { studentId } = getStudentContext(req);

    const stats = await conversationRepo.getConversationStats(studentId);

    res.json({
      success: true,
      stats,
      rateLimit: aiTutorService.getRateLimitStatus(studentId),
    });
  } catch (err) {
    next(err);
  }
}
