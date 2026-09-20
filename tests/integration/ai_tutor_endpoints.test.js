import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runAiTutorIntegrationTests() {
  await describe('Integration Test: Trợ lý AI Gia sư Socratic (/api/ai-tutor)', () => {
    test('Truy vấn lịch sử trò chuyện AI Tutor (/ai-tutor/messages)', async () => {
      const res = await api.get('/ai-tutor/messages');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    test('Gửi câu hỏi học tập và nhận phản hồi Socratic từ AI (/ai-tutor/chat)', async () => {
      const chatPayload = {
        topic: 'Đại số 10',
        text: 'Thầy ơi, giải thích giúp em định lý Vi-ét và cách tính nghiệm với delta?',
      };

      const res = await api.post('/ai-tutor/chat', chatPayload);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.aiReply).toBeDefined();
      expect(res.body.aiReply.sender).toBe('ai');
      expect(res.body.aiReply.text.length > 0).toBe(true);
    });

    test('Từ chối tin nhắn rỗng từ học sinh', async () => {
      const res = await api.post('/ai-tutor/chat', { text: '' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
}
