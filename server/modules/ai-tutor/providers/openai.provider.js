// =============================================================================
// OpenAI Provider — G37 Production AI Tutor Architecture
// Uses native global fetch (available in Node.js 18+)
// =============================================================================

import { AIProvider } from './provider.interface.js';

/**
 * OpenAI GPT Provider
 * Uses the Chat Completions API
 */
export class OpenAIProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'OpenAI';
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
  }

  async initialize() {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }
    console.log(`[OpenAIProvider] Initialized with model: ${this.model}`);
    return true;
  }

  async chat(messages, options = {}) {
    const body = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
    };

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        model: data.model || this.model,
        finishReason: choice?.finish_reason || 'stop',
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async healthCheck() {
    try {
      const start = Date.now();
      await this.chat([{ role: 'user', content: 'Hi' }], { maxTokens: 5 });

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
    const status = error.message.match(/(\d{3})/)?.[1];

    if (status === '401') {
      return {
        code: 'INVALID_API_KEY',
        message: 'OpenAI API key is invalid or expired',
        suggestion: 'Please check your OPENAI_API_KEY environment variable',
      };
    }

    if (status === '429') {
      return {
        code: 'RATE_LIMITED',
        message: 'OpenAI rate limit exceeded',
        suggestion: 'Please wait a moment before retrying',
      };
    }

    if (status === '500' || status === '503') {
      return {
        code: 'SERVICE_ERROR',
        message: 'OpenAI service is temporarily unavailable',
        suggestion: 'Please try again later',
      };
    }

    return {
      code: 'OPENAI_ERROR',
      message: error.message,
      suggestion: 'Check your OpenAI configuration and try again',
    };
  }
}
