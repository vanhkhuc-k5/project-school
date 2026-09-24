// =============================================================================
// Mock AI Provider — For testing and development
// G37 Production AI Tutor Architecture
// =============================================================================

import { AIProvider } from './provider.interface.js';
import { MESSAGE_ROLES } from '../ai-tutor.types.js';

/**
 * Mock AI Provider for testing and development
 * Simulates AI responses without making actual API calls
 */
export class MockAIProvider extends AIProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'MockProvider';
    this.responses = config.responses || [];
    this.responseIndex = 0;
    this.delayMs = config.delayMs || 500;
    this.failRate = config.failRate || 0;
  }

  async initialize() {
    console.log('[MockAIProvider] Initialized');
    return true;
  }

  async chat(messages, options = {}) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.delayMs));

    // Simulate random failures if configured
    if (this.failRate > 0 && Math.random() < this.failRate) {
      throw new Error('MockAIProvider: Simulated provider failure');
    }

    const lastUserMessage = messages.filter(m => m.role === MESSAGE_ROLES.USER).pop();
    const userText = lastUserMessage?.content || '';

    // Generate a Socratic-style response
    const response = this.generateSocraticResponse(userText, options);

    return {
      content: response,
      usage: {
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150,
      },
      model: 'mock-gpt-3.5',
      finishReason: 'stop',
    };
  }

  generateSocraticResponse(userText, options = {}) {
    const lower = userText.toLowerCase();

    // Topic detection
    let topic = 'chủ đề chung';
    if (lower.includes('toán') || lower.includes('công thức') || lower.includes('phương trình') || lower.includes('số') || lower.includes('hình')) {
      topic = 'Toán học';
    } else if (lower.includes('lý') || lower.includes('vật lý') || lower.includes('lực') || lower.includes('năng lượng')) {
      topic = 'Vật lý';
    } else if (lower.includes('hóa') || lower.includes('nguyên tử') || lower.includes('phản ứng') || lower.includes('phương trình hóa')) {
      topic = 'Hóa học';
    } else if (lower.includes('sinh') || lower.includes('tế bào') || lower.includes('gen') || lower.includes('tiến hóa')) {
      topic = 'Sinh học';
    } else if (lower.includes('sử') || lower.includes('lịch sử') || lower.includes('chiến tranh') || lower.includes('cách mạng')) {
      topic = 'Lịch sử';
    } else if (lower.includes('văn') || lower.includes('ngữ văn') || lower.includes('tác giả') || lower.includes('tác phẩm')) {
      topic = 'Ngữ văn';
    }

    // Generate Socratic response
    const responses = [
      `Câu hỏi hay về ${topic}! Trước khi đi vào chi tiết, em hãy chia sẻ em đã hiểu những gì về vấn đề này? Điều gì khiến em băn khoăn nhất?`,
      
      `Em đang đặt câu hỏi về ${topic}. Theo phương pháp Socratic, thầy muốn hỏi em: Nếu em phải giải thích khái niệm này cho một bạn cùng lớp, em sẽ bắt đầu từ đâu?`,
      
      `Thầy thấy em đang quan tâm đến ${topic}. Thay vì đưa ra đáp án ngay, thầy muốn em thử phân tích: Các em đã được học những kiến thức nào liên quan đến vấn đề này?`,
      
      `Đây là một câu hỏi thú vị về ${topic}! Để hỗ trợ em tốt nhất, thầy có một số câu hỏi gợi mở: Bước đầu tiên em thường làm khi gặp dạng bài này là gì?`,
      
      `Rất vui được giúp em về ${topic}. Thầy Gia Sư AI sẽ không hoàn thành bài kiểm tra thay em, nhưng sẽ hướng dẫn em từng bước. Em đã thử làm phần nào chưa, và phần nào khiến em gặp khó khăn?`,
    ];

    // Select response based on message content hash for consistency
    const hash = userText.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const index = hash % responses.length;
    
    return responses[index];
  }

  async healthCheck() {
    return {
      healthy: true,
      provider: this.name,
      latencyMs: this.delayMs,
      message: 'Mock provider is healthy',
    };
  }

  handleError(error) {
    return {
      code: 'MOCK_PROVIDER_ERROR',
      message: error.message,
      suggestion: 'This is a mock provider for testing',
    };
  }
}
