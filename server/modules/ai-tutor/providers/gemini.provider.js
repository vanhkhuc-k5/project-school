// =============================================================================
// Google Gemini Provider — G37 Production AI Tutor Architecture
// =============================================================================

import { AIProvider } from './provider.interface.js';
import { MESSAGE_ROLES } from '../ai-tutor.types.js';

/**
 * Google Gemini Provider
 * Uses the Google AI Studio / Gemini REST API
 */
export class GeminiProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'Gemini';
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    this.model = config.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta/models';
    this.maxTokens = config.maxTokens || 1024;
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error(
        'Google Gemini API key not configured. Set GEMINI_API_KEY environment variable.'
      );
    }
    console.log(`[GeminiProvider] Initialized with model: ${this.model}`);
    return true;
  }

  async chat(messages, options = {}) {
    // Convert messages to Gemini format
    const systemInstruction = messages.find(m => m.role === MESSAGE_ROLES.SYSTEM);
    const conversationMessages = messages.filter(m => m.role !== MESSAGE_ROLES.SYSTEM);

    const contents = conversationMessages.map(m => ({
      role: m.role === MESSAGE_ROLES.ASSISTANT ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = {
      contents,
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction.content }] } } : {}),
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? this.maxTokens,
      },
    };

    try {
      const url = `${this.baseURL}/${this.model}:generateContent?key=${this.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `Gemini API error: ${response.status} - ${error.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || '';

      return {
        content: text,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0,
        },
        model: data.modelVersion || this.model,
        finishReason: candidate?.finishReason || 'stop',
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async healthCheck() {
    try {
      const start = Date.now();
      await this.chat([{ role: 'user', content: 'Hi' }], { maxTokens: 10 });

      return {
        healthy: true,
        provider: this.name,
        model: this.model,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        healthy: false,
        provider: this.name,
        error: error.message,
      };
    }
  }

  handleError(error) {
    const message = error.message || '';

    if (message.includes('400') && message.includes('API_KEY')) {
      return {
        code: 'INVALID_API_KEY',
        message: 'Google Gemini API key is invalid or expired',
        suggestion: 'Please check your GEMINI_API_KEY environment variable',
      };
    }

    if (message.includes('429') || message.includes('quota') || message.includes('rate limit')) {
      return {
        code: 'RATE_LIMITED',
        message: 'Gemini API quota exceeded or rate limited',
        suggestion: 'Please wait before making more requests or upgrade your plan',
      };
    }

    if (message.includes('500') || message.includes('503') || message.includes('server error')) {
      return {
        code: 'SERVICE_ERROR',
        message: 'Gemini service is temporarily unavailable',
        suggestion: 'Please try again later',
      };
    }

    if (message.includes('400') && message.includes('content')) {
      return {
        code: 'INVALID_CONTENT',
        message: 'Invalid content sent to Gemini API',
        suggestion: 'Check that message content is properly formatted',
      };
    }

    return {
      code: 'GEMINI_ERROR',
      message: error.message,
      suggestion: 'Check your Gemini configuration and try again',
    };
  }
}
