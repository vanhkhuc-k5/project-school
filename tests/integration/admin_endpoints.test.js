import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runAdminIntegrationTests() {
  let adminToken = null;
  let testUserId = null;

  await describe('Integration Test: Phân hệ Quản trị & Ban Giám Hiệu (/api/admin)', () => {
    test('Xác thực và lấy JWT token của Quản trị viên', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'admin@school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      adminToken = res.body.token;
      expect(typeof adminToken).toBe('string');
    });

    test('Lấy báo cáo tổng quan Ban Giám Hiệu & KPIs toàn trường (/admin/overview)', async () => {
      const res = await api.get('/admin/overview', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kpis).toBeDefined();
      expect(res.body.data.schoolName).toBe('Trường THPT Chuyên Bắc Âu');
      expect(Array.isArray(res.body.data.recentActivities)).toBe(true);
    });

    test('Truy vấn danh sách người dùng phân theo vai trò (/admin/users)', async () => {
      const res = await api.get('/admin/users?role=teacher', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length > 0).toBe(true);
      for (const u of res.body.users) {
        expect(u.role).toBe('teacher');
      }
    });

    test('Tạo tài khoản giáo viên mới qua Admin API', async () => {
      const timestamp = Date.now();
      const newUser = {
        username: `gv_test_${timestamp}`,
        email: `gv_test_${timestamp}@school.edu.vn`,
        password: '123456',
        role: 'teacher',
        name: 'Thầy Hoàng Văn Test',
        code: `GV-TEST-${timestamp.toString().slice(-4)}`,
        phone: '0988776655',
      };

      const res = await api.post('/admin/users', newUser, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.userId).toBe('string');
      testUserId = res.body.userId;
    });

    test('Cập nhật thông tin hồ sơ tài khoản người dùng', async () => {
      expect(testUserId).toBeDefined();
      const updateData = {
        name: 'Thầy Hoàng Văn Test (Đã cập nhật)',
        phone: '0911223344',
      };
      const res = await api.put(`/admin/users/${testUserId}`, updateData, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Xóa tài khoản người dùng vừa tạo để dọn dẹp dữ liệu', async () => {
      expect(testUserId).toBeDefined();
      const res = await api.delete(`/admin/users/${testUserId}`, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Truy vấn danh mục lớp học & số lượng học sinh (/admin/classes)', async () => {
      const res = await api.get('/admin/classes', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.classes)).toBe(true);
      expect(res.body.classes.length > 0).toBe(true);
    });

    test('Truy vấn danh mục môn học toàn trường (/admin/subjects)', async () => {
      const res = await api.get('/admin/subjects', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.subjects)).toBe(true);
      expect(res.body.subjects.length >= 10).toBe(true);
    });

    test('Truy vấn báo cáo tài chính & học phí cổng VietQR (/admin/financials)', async () => {
      const res = await api.get('/admin/financials', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.financials).toBeDefined();
      expect(res.body.financials.collectionRate).toBeDefined();
    });

    test('Phát thông báo khẩn cấp toàn trường (/admin/broadcast)', async () => {
      const broadcastData = {
        title: 'Thông báo diễn tập PCCC năm học 2024-2025 (Test Suite)',
        content: 'Toàn thể giáo viên và học sinh tham gia diễn tập tại sân trường vào thứ Sáu tuần này.',
      };
      const res = await api.post('/admin/broadcast', broadcastData, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Truy vấn nhật ký kiểm toán bảo mật (/admin/audit-logs)', async () => {
      const res = await api.get('/admin/audit-logs', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(res.body.logs.length > 0).toBe(true);
    });
  });
}
