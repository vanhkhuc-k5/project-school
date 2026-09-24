# ADR-011: AI Provider Abstraction

- **Status:** Accepted
- **Date:** 2026-09-20
- **Author:** Principal Software Architect
- **Supersedes:** N/A

---

## 1. Context

EduPortal's AI Tutor feature requires integration with AI providers:
- **OpenAI:** GPT-4 for general tutoring
- **Anthropic:** Claude for detailed explanations
- **Google Gemini:** For multimodal support (future)
- **Mock Provider:** For testing and development

The system needs:
- Provider agnostic API
- Easy provider switching
- Consistent response format
- Error handling and retries
- Rate limiting

---

## 2. Decision

### 2.1 Provider Interface

```javascript
// Abstract provider interface
class AIProvider {
  async chat(messages, options) {
    throw new Error('Not implemented');
  }
  
  async validate() {
    throw new Error('Not implemented');
  }
}

// Provider implementations
class OpenAIProvider extends AIProvider { ... }
class AnthropicProvider extends AIProvider { ... }
class GeminiProvider extends AIProvider { ... }
class MockProvider extends AIProvider { ... }
```

### 2.2 Factory Pattern

```javascript
import { createAIProvider } from './factory.js';

const provider = createAIProvider({
  provider: process.env.AI_PROVIDER || 'mock',
  apiKey: process.env.OPENAI_API_KEY,
  // ...
});

const response = await provider.chat(messages, {
  temperature: 0.7,
  maxTokens: 1000,
});
```

### 2.3 Standardized Response

```javascript
// All providers return this format
{
  id: 'msg_abc123',
  content: 'Here is the explanation...',
  model: 'gpt-4',
  usage: {
    promptTokens: 100,
    completionTokens: 200,
    totalTokens: 300,
  },
  finishReason: 'stop',
  createdAt: '2025-01-15T10:00:00Z'
}
```

---

## 3. Alternatives Considered

### Option A: Single Provider (OpenAI Only)

| Pros | Cons |
|------|------|
| Simple | Vendor lock-in |
| No abstraction | No fallback if outage |
| Cost control | Limited features |

**Verdict:** Rejected. Need flexibility for different use cases and reliability.

### Option B: Full AI Abstraction Library (LangChain, LlamaIndex)

| Pros | Cons |
|------|------|
| Many features | Heavy dependency |
| Tool integration | Complexity |
| Standard interface | Opinionated |

**Verdict:** Rejected. Simple abstraction is sufficient. Libraries add unnecessary complexity.

### Option C: Direct API Calls (No Abstraction)

| Pros | Cons |
|------|------|
| Simple | Duplicated code |
| Full control | Hard to switch |
| No abstraction | Inconsistent |

**Verdict:** Rejected. Abstraction enables testing and provider switching.

---

## 4. Consequences

### Positive

1. **Provider Flexibility:** Easy to switch providers
2. **Testing:** Mock provider enables testing without API costs
3. **Reliability:** Fallback to alternative provider
4. **Feature Parity:** Standard interface for all providers

### Negative

1. **Feature Gaps:** Not all providers have same capabilities
2. **Latency Differences:** Providers have different response times
3. **Cost Variation:** Different pricing models

### Mitigation

- Provider-specific options in `options` parameter
- Capability detection per provider
- Cost tracking per provider

---

## 5. Implementation

### Provider Interface

```javascript
// server/modules/ai-tutor/providers/provider.interface.js

export class AIProvider {
  constructor(config) {
    this.config = config;
  }

  /**
   * Send chat message and return response
   * @param {Array<{role: string, content: string}>} messages
   * @param {object} options
   * @returns {Promise<AIResponse>}
   */
  async chat(messages, options = {}) {
    throw new Error('Subclass must implement chat()');
  }

  /**
   * Validate provider configuration
   * @returns {Promise<boolean>}
   */
  async validate() {
    throw new Error('Subclass must implement validate()');
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    return this.constructor.name.replace('Provider', '').toLowerCase();
  }
}
```

### Factory Function

```javascript
// server/modules/ai-tutor/providers/factory.js

export function createAIProvider(config) {
  const { provider = 'mock', ...providerConfig } = config;
  
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(providerConfig);
    case 'anthropic':
      return new AnthropicProvider(providerConfig);
    case 'gemini':
      return new GeminiProvider(providerConfig);
    case 'mock':
    default:
      return new MockProvider(providerConfig);
  }
}
```

### Mock Provider (Testing)

```javascript
// server/modules/ai-tutor/providers/mock.provider.js

export class MockProvider extends AIProvider {
  async chat(messages, options = {}) {
    // Simulate response delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    return {
      id: `mock_${Date.now()}`,
      content: `Mock response to: ${lastMessage.slice(0, 50)}...`,
      model: 'mock',
      usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
      finishReason: 'stop',
      createdAt: new Date().toISOString(),
    };
  }
  
  async validate() {
    return true; // Mock always valid
  }
}
```

### Service Integration

```javascript
// server/modules/ai-tutor/ai-tutor.service.js

import { createAIProvider } from './providers/factory.js';

export class AITutorService {
  constructor() {
    this.provider = createAIProvider({
      provider: config.AI_PROVIDER,
      apiKey: config.OPENAI_API_KEY, // etc
    });
  }
  
  async chat(studentId, message, context) {
    // Check rate limit
    if (this.isRateLimited(studentId)) {
      throw new RateLimitError('Too many requests');
    }
    
    // Build messages with context
    const messages = this.buildMessages(message, context);
    
    // Call provider
    const response = await this.provider.chat(messages, {
      temperature: 0.7,
      maxTokens: 1000,
    });
    
    // Store message
    await this.saveMessage(studentId, message, response);
    
    return response;
  }
}
```

---

## 6. Provider Capabilities

| Provider | Models | Multimodal | Context Window | Rate Limit |
|----------|--------|------------|----------------|------------|
| OpenAI | GPT-4, GPT-3.5 | Images (vision) | 128K | 5000 req/min |
| Anthropic | Claude 3 | Images (vision) | 200K | 1000 req/min |
| Gemini | Gemini Pro | Images, Audio | 1M | 60 req/min |
| Mock | N/A | N/A | N/A | Unlimited |

---

## 7. References

- [ADR-002: Modular Monolith](./ADR-002-MODULAR-MONOLITH.md)
