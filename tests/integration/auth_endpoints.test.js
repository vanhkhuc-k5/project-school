import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runAuthIntegrationTests() {
  await describe('Integration Test: API Xác thực & Phân quyền (/api/auth)', () => {
    test('Đăng nhập thành công với tài khoản Admin', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'admin@school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('admin');
      expect(typeof res.body.token).toBe('string');
    });

    test('Đăng nhập thành công với tài khoản Giáo viên', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'mailan@school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('teacher');
      expect(res.body.user.name).toBe('Cô Mai Lan');
    });

    test('Đăng nhập thành công với tài khoản Học sinh (qua mã định danh)', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'HS-2024-889',
        password: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('student');
      expect(res.body.user.name).toBe('Nguyễn Minh Khang');
    });

    test('Đăng nhập thành công với tài khoản Phụ huynh', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'vanhoi@parent.school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('parent');
      expect(res.body.user.name).toBe('Nguyễn Văn Hồi');
    });

    test('Từ chối đăng nhập khi sai mật khẩu (401 Unauthorized)', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'admin@school.edu.vn',
        password: 'SaiMatKhau123',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Từ chối đăng nhập khi tài khoản không tồn tại (401 Unauthorized)', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'user_khong_ton_tai_xyz@school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Lấy thông tin người dùng hiện tại qua endpoint /auth/me', async () => {
      // 1. Login lấy token
      const loginRes = await api.post('/auth/login', {
        identifier: 'mailan@school.edu.vn',
        password: '123456',
      });
      const token = loginRes.body.token;

      // 2. Gọi /auth/me
      const meRes = await api.get('/auth/me', token);
      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.user.email).toBe('mailan@school.edu.vn');
      expect(meRes.body.user.role).toBe('teacher');
    });

    test('Từ chối /auth/me khi token không hợp lệ (403 Forbidden)', async () => {
      const res = await api.get('/auth/me', 'invalid_fake_token_value');
      expect(res.status).toBe(403);
    });
  });
}
