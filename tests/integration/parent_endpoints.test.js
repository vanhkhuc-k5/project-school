import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runParentIntegrationTests() {
  let parentToken = null;

  await describe('Integration Test: Phân hệ Phụ huynh (/api/parent)', () => {
    test('Xác thực và lấy JWT token của phụ huynh', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'vanhoi@parent.school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      parentToken = res.body.token;
      expect(typeof parentToken).toBe('string');
    });

    test('Truy vấn danh sách học sinh con em của phụ huynh (/parent/children)', async () => {
      const res = await api.get('/parent/children', parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.children)).toBe(true);
      expect(res.body.children.length > 0).toBe(true);
      expect(res.body.children[0].name).toBe('Nguyễn Minh Khôi');
    });

    test('Truy vấn dữ liệu Parent Dashboard tổng quan', async () => {
      const res = await api.get('/parent/dashboard', parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parentName).toBeDefined();
    });

    test('Truy vấn thông tin học phí & hóa đơn điện tử (/parent/tuition)', async () => {
      const res = await api.get('/parent/tuition?childId=std_khoi', parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.invoice).toBeDefined();
      expect(res.body.invoice.bankName).toBe('Vietcombank');
    });

    test('Truy vấn hộp thư trao đổi với giáo viên chủ nhiệm (/parent/messages)', async () => {
      const res = await api.get('/parent/messages', parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    test('Gửi đơn xin phép nghỉ học trực tuyến (/parent/leave-requests)', async () => {
      const leavePayload = {
        studentId: 'std_khoi',
        startDate: '2026-11-15',
        endDate: '2026-11-16',
        reason: 'Gia đình có việc hiếu hỷ ở quê, xin phép nghỉ 2 ngày.',
      };

      const res = await api.post('/parent/leave-requests', leavePayload, parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
}
