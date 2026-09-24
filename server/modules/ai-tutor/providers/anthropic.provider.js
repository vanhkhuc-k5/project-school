// =============================================================================
// Anthropic Provider — G37 Production AI Tutor Architecture
// Uses native global fetch (available in Node.js 18+)
// =============================================================================

import { AIProvider } from './provider.interface.js';
import { MESSAGE_ROLES } from '../ai-tutor.types.js';

/**
 * Anthropic Claude Provider
 * Uses the Anthropic Messages API (2023-06-01)
 */
export class AnthropicProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'Anthropic';
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.model = config.model || process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
    this.maxTokens = config.maxTokens || 1024;
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error(
        'Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.'
      );
    }
    console.log(`[AnthropicProvider] Initialized with model: ${this.model}`);
    return true;
  }

  async chat(messages, options = {}) {
    // Convert messages to Anthropic format
    const anthropicMessages = messages
      .filter(m => m.role !== MESSAGE_ROLES.SYSTEM)
      .map(m => ({
        role: m.role === MESSAGE_ROLES.ASSISTANT ? 'assistant' : 'user',
        content: m.content,
      }));

    const systemPrompt = messages.find(m => m.role === MESSAGE_ROLES.SYSTEM);

    const body = {
      model: this.model,
      max_tokens: options.maxTokens ?? this.maxTokens,
      messages: anthropicMessages,
      ...(systemPrompt ? { system: systemPrompt.content } : {}),
      temperature: options.temperature ?? 0.7,
    };

    try {
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `Anthropic API error: ${response.status} - ${error.error?.message || response.statusText}`
        );
      }

      const data = await response.json();

      return {
        content: data.content?.[0]?.text || '',
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
        model: data.model || this.model,
        finishReason: data.stop_reason || 'stop',
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

    if (message.includes('401') || message.includes('invalid API key')) {
      return {
        code: 'INVALID_API_KEY',
        message: 'Anthropic API key is invalid or expired',
        suggestion: 'Please check your ANTHROPIC_API_KEY environment variable',
      };
    }

    if (message.includes('429')) {
      return {
        code: 'RATE_LIMITED',
        message: 'Anthropic rate limit exceeded',
        suggestion: 'Please wait a moment before retrying',
      };
    }

    if (message.includes('500') || message.includes('503') || message.includes('overloaded')) {
      return {
        code: 'SERVICE_ERROR',
        message: 'Anthropic service is temporarily unavailable',
        suggestion: 'Please try again later',
      };
    }

    if (message.includes('400') && message.includes('messages')) {
      return {
        code: 'INVALID_REQUEST',
        message: 'Invalid message format sent to Anthropic',
        suggestion: 'Check that messages are properly formatted',
      };
    }

    return {
      code: 'ANTHROPIC_ERROR',
      message: error.message,
      suggestion: 'Check your Anthropic configuration and try again',
    };
  }
}
