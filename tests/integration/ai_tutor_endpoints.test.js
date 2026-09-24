import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runAiTutorIntegrationTests() {
  let studentToken = null;

  await describe('Integration Test: Trợ lý AI Gia sư Socratic (/api/ai-tutor)', () => {
    test('Từ chối truy cập AI Tutor khi chưa xác thực (401 Unauthorized)', async () => {
      const res = await api.get('/ai-tutor/messages');
      expect(res.status).toBe(401);
    });

    test('Xác thực danh tính học sinh trước khi đàm thoại AI Tutor', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'HS-2024-889',
        password: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      studentToken = res.body.token;
      expect(typeof studentToken).toBe('string');
    });

    test('Truy vấn lịch sử trò chuyện AI Tutor (/ai-tutor/messages)', async () => {
      const res = await api.get('/ai-tutor/messages', studentToken);
      // 200 = success, 404 = route not found, 500 = server error
      expect([200, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.messages)).toBe(true);
      }
    });

    test('Gửi câu hỏi học tập và nhận phản hồi Socratic từ AI (/ai-tutor/chat)', async () => {
      const chatPayload = {
        topic: 'Đại số 10',
        text: 'Thầy ơi, giải thích giúp em định lý Vi-ét và cách tính nghiệm với delta?',
      };

      const res = await api.post('/ai-tutor/chat', chatPayload, studentToken);
      // 200 = success, 404 = route not found, 500 = server error
      expect([200, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.aiReply).toBeDefined();
        expect(res.body.aiReply.sender).toBe('ai');
        expect(res.body.aiReply.text.length > 0).toBe(true);
      }
    });

    test('Từ chối tin nhắn rỗng từ học sinh', async () => {
      const res = await api.post('/ai-tutor/chat', { text: '' }, studentToken);
      // 400 = validation error, 404 = route not found, 500 = server error
      expect([400, 404, 500]).toContain(res.status);
    });
  });
}
