// =============================================================================
// AI Provider Interface — Abstract base class for AI providers
// G37 Production AI Tutor Architecture
// =============================================================================

import { MESSAGE_ROLES } from '../ai-tutor.types.js';

/**
 * Abstract base class for AI providers
 * All provider implementations must extend this class
 */
export class AIProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = 'BaseProvider';
  }

  /**
   * Initialize the provider (load API keys, etc.)
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Send a chat completion request
   * @param {Array} messages - Array of {role, content} message objects
   * @param {Object} options - Provider-specific options
   * @returns {Promise<{content: string, usage: Object, model: string, finishReason: string}>}
   */
  async chat(messages, options = {}) {
    throw new Error('chat() must be implemented by subclass');
  }

  /**
   * Build messages array from conversation history + new input
   * @param {Array} history - Previous messages
   * @param {string} userInput - Current user input
   * @param {string} systemPrompt - System prompt
   * @param {string} academicContext - Academic context from G38
   * @returns {Array} Formatted messages
   */
  buildMessages(history, userInput, systemPrompt, academicContext = null) {
    const messages = [];
    
    if (systemPrompt) {
      // Append academic context to system prompt if available
      let fullPrompt = systemPrompt;
      if (academicContext) {
        fullPrompt += '\n\n' + academicContext;
      }
      messages.push({ role: MESSAGE_ROLES.SYSTEM, content: fullPrompt });
    }
    
    for (const msg of history) {
      messages.push({
        role: msg.sender === 'ai' ? MESSAGE_ROLES.ASSISTANT : MESSAGE_ROLES.USER,
        content: msg.text || msg.content,
      });
    }
    
    messages.push({ role: MESSAGE_ROLES.USER, content: userInput });
    
    return messages;
  }

  /**
   * Check if the provider is healthy and available
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }

  /**
   * Get provider-specific error message
   */
  handleError(error) {
    throw new Error('handleError() must be implemented by subclass');
  }
}

/**
 * Check if a provider class is valid
 */
export function isValidProvider(ProviderClass) {
  return (
    ProviderClass &&
    typeof ProviderClass === 'function' &&
    'initialize' in ProviderClass.prototype &&
    'chat' in ProviderClass.prototype &&
    'healthCheck' in ProviderClass.prototype
  );
}

/**
 * Provider registry for dynamic provider selection
 */
class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  register(name, ProviderClass) {
    if (!isValidProvider(ProviderClass)) {
      throw new Error(`Invalid provider class: ${ProviderClass}`);
    }
    this.providers.set(name, ProviderClass);
  }

  get(name) {
    return this.providers.get(name);
  }

  list() {
    return Array.from(this.providers.keys());
  }
}

export const providerRegistry = new ProviderRegistry();
