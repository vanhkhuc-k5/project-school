// =============================================================================
// AI Tutor Service — Business Logic Layer
// G37 Production AI Tutor Architecture
// G38 Safe Academic Context Integration
// =============================================================================

import {
  AI_PROVIDERS,
  MESSAGE_ROLES,
  AI_TUTOR_CONFIG,
  TUTOR_SYSTEM_PROMPT,
  PRIVACY_CONFIG,
  RateLimitStatus
} from './ai-tutor.types.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { AnthropicProvider } from './providers/anthropic.provider.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { MockAIProvider } from './providers/mock.provider.js';
import { aiContextService } from '../ai-tutor-context/ai-tutor-context.service.js';
import { ContextBuildOptions } from '../ai-tutor-context/ai-tutor-context.types.js';

// Provider singleton
let providerInstance = null;

/**
 * Get or create the AI provider instance
 */
export function getAIProvider() {
  if (providerInstance) {
    return providerInstance;
  }

  const providerType = AI_TUTOR_CONFIG.PROVIDER;

  switch (providerType) {
    case AI_PROVIDERS.OPENAI:
      providerInstance = new OpenAIProvider();
      break;
    case AI_PROVIDERS.ANTHROPIC:
      providerInstance = new AnthropicProvider();
      break;
    case AI_PROVIDERS.GEMINI:
      providerInstance = new GeminiProvider();
      break;
    case AI_PROVIDERS.MOCK:
    default:
      providerInstance = new MockAIProvider();
      break;
  }

  return providerInstance;
}

/**
 * Initialize the AI provider
 */
export async function initializeProvider() {
  const provider = getAIProvider();
  await provider.initialize();
  return provider;
}

// Simple in-memory rate limiter
const rateLimiter = new Map();

function checkRateLimit(studentId) {
  const now = Date.now();
  const key = `ai_tutor:${studentId}`;
  
  let record = rateLimiter.get(key);
  
  if (!record || now - record.windowStart > AI_TUTOR_CONFIG.RATE_LIMIT_WINDOW_MS) {
    // Start new window
    record = {
      windowStart: now,
      count: 0,
    };
  }
  
  record.count++;
  
  const remaining = AI_TUTOR_CONFIG.RATE_LIMIT_MESSAGES - record.count;
  const resetAt = new Date(record.windowStart + AI_TUTOR_CONFIG.RATE_LIMIT_WINDOW_MS).toISOString();
  
  if (record.count > AI_TUTOR_CONFIG.RATE_LIMIT_MESSAGES) {
    return new RateLimitStatus({
      allowed: false,
      remaining: 0,
      resetAt,
      total: AI_TUTOR_CONFIG.RATE_LIMIT_MESSAGES,
    });
  }
  
  rateLimiter.set(key, record);
  
  return new RateLimitStatus({
    allowed: true,
    remaining: Math.max(0, remaining),
    resetAt,
    total: AI_TUTOR_CONFIG.RATE_LIMIT_MESSAGES,
  });
}

/**
 * Sanitize context to remove sensitive information
 */
function sanitizeContext(context) {
  if (!context || typeof context !== 'object') {
    return context;
  }

  const sanitized = {};
  
  for (const [key, value] of Object.entries(context)) {
    // Skip blocked fields
    if (PRIVACY_CONFIG.BLOCKED_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Anonymize ID fields
    if (PRIVACY_CONFIG.ANONYMIZE_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = '[ID_REDACTED]';
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeContext(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Build system prompt with student context
 */
function buildSystemPrompt(context = {}) {
  let prompt = TUTOR_SYSTEM_PROMPT;

  // Add grade level context
  if (context.gradeLevel) {
    const gradeContext = {
      high_school_10_12: 'Cấp THPT (Lớp 10-12)',
      secondary_6_9: 'Cấp THCS (Lớp 6-9)',
      primary_1_5: 'Cấp Tiểu học (Lớp 1-5)',
    };
    prompt += `\n\n## Cấp học: ${gradeContext[context.gradeLevel] || context.gradeLevel}`;
  }

  // Add subject context
  if (context.subject) {
    prompt += `\n## Môn học: ${context.subject}`;
  }

  // Add topic context
  if (context.topic) {
    prompt += `\n## Chủ đề hiện tại: ${context.topic}`;
  }

  // Add school context (safe info only)
  if (context.schoolName) {
    prompt += `\n## Trường: ${context.schoolName}`;
  }

  return prompt;
}

/**
 * Truncate conversation history to fit token limits
 */
function truncateHistory(messages, maxTurns = AI_TUTOR_CONFIG.MAX_CONVERSATION_TURNS) {
  // Keep system message and recent messages
  const systemMessages = messages.filter(m => m.role === MESSAGE_ROLES.SYSTEM);
  const conversationMessages = messages.filter(m => m.role !== MESSAGE_ROLES.SYSTEM);
  
  // Keep only the most recent turns
  const recentMessages = conversationMessages.slice(-maxTurns * 2);
  
  return [...systemMessages, ...recentMessages];
}

/**
 * Build messages for AI request
 */
function buildAIRequest(messages, userInput, context, academicContext = null) {
  const systemPrompt = buildSystemPrompt(context);
  const provider = getAIProvider();
  
  const allMessages = truncateHistory(messages);
  
  return provider.buildMessages(allMessages, userInput, systemPrompt, academicContext);
}

// ============================================================================
// Main AI Tutor Service
// ============================================================================

export const aiTutorService = {
  /**
   * Check if AI Tutor feature is enabled
   */
  isEnabled() {
    return AI_TUTOR_CONFIG.ENABLED;
  },

  /**
   * Get provider health status
   */
  async getHealth() {
    try {
      const provider = getAIProvider();
      return await provider.healthCheck();
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  },

  /**
   * Send a chat message and get AI response
   */
  async chat({ studentId, studentName, userInput, conversationHistory, context = {}, includeAcademicContext = true }) {
    // Check if feature is enabled
    if (!this.isEnabled()) {
      throw new Error('AI Tutor feature is currently disabled');
    }

    // Check rate limit
    const rateLimit = checkRateLimit(studentId);
    if (rateLimit.isExceeded()) {
      throw Object.assign(new Error('Rate limit exceeded'), {
        code: 'RATE_LIMIT_EXCEEDED',
        status: 429,
        resetAt: rateLimit.resetAt,
      });
    }

    // Sanitize context
    const safeContext = sanitizeContext(context);

    // Build academic context for AI (G38)
    let academicContext = null;
    if (includeAcademicContext && context.schoolId) {
      try {
        const buildOptions = new ContextBuildOptions({
          includeHistory: true,
          includeResources: true,
          includeAssignment: true,
          maxHistoryMessages: 3,
          maxTokens: 2000, // Limit context tokens
        });

        const contextResult = await aiContextService.buildContext({
          studentId,
          schoolId: context.schoolId,
          options: buildOptions,
        });

        academicContext = aiContextService.formatContextForPrompt(contextResult);
      } catch (err) {
        console.warn('[AI Tutor] Failed to build academic context:', err.message);
        // Continue without academic context
      }
    }

    try {
      // Initialize provider if needed
      await initializeProvider();

      const provider = getAIProvider();

      // Build messages
      const messages = buildAIRequest(conversationHistory, userInput, safeContext, academicContext);

      // Call AI
      const response = await provider.chat(messages, {
        temperature: 0.7,
        maxTokens: 1000,
      });

      return {
        content: response.content,
        model: response.model,
        usage: response.usage,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
        },
        contextUsed: !!academicContext,
      };
    } catch (error) {
      // Handle provider errors
      const provider = getAIProvider();
      const errorInfo = provider.handleError(error);
      
      throw Object.assign(new Error(errorInfo.message), {
        code: errorInfo.code,
        status: 500,
        suggestion: errorInfo.suggestion,
      });
    }
  },

  /**
   * Get current rate limit status for a student
   */
  getRateLimitStatus(studentId) {
    return checkRateLimit(studentId);
  },

  /**
   * Reset rate limit for a student (admin function)
   */
  resetRateLimit(studentId) {
    const key = `ai_tutor:${studentId}`;
    rateLimiter.delete(key);
    return true;
  },

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return {
      current: AI_TUTOR_CONFIG.PROVIDER,
      available: [
        { id: AI_PROVIDERS.MOCK, name: 'Mock (Testing)', enabled: true },
        { id: AI_PROVIDERS.OPENAI, name: 'OpenAI GPT', enabled: Boolean(process.env.OPENAI_API_KEY) },
        { id: AI_PROVIDERS.ANTHROPIC, name: 'Anthropic Claude', enabled: Boolean(process.env.ANTHROPIC_API_KEY) },
        { id: AI_PROVIDERS.GEMINI, name: 'Google Gemini', enabled: Boolean(process.env.GEMINI_API_KEY) },
      ],
    };
  },
};
