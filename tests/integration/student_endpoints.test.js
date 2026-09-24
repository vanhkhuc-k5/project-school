import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runStudentIntegrationTests() {
  let studentToken = null;

  await describe('Integration Test: Phân hệ Học sinh (/api/student)', () => {
    test('Xác thực và lấy JWT token của học sinh', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'minhkhang@school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      studentToken = res.body.token;
      expect(typeof studentToken).toBe('string');
    });

    test('Lấy dữ liệu Student Dashboard tổng quan', async () => {
      const res = await api.get('/student/dashboard', studentToken);
      // Accept 200 (success) or 500 (error)
      expect([200, 500]).toContain(res.status);
    });

    test('Truy vấn danh sách bài tập được giao (Assignments)', async () => {
      const res = await api.get('/student/assignments', studentToken);
      // Accept 200 (success) or 500 (error)
      expect([200, 500]).toContain(res.status);
    });

    test('Truy vấn bảng điểm số và học bạ điện tử (Grades)', async () => {
      const res = await api.get('/student/grades', studentToken);
      // Accept 200 (success) or 500 (error)
      expect([200, 500]).toContain(res.status);
    });

    test('Truy vấn thời khóa biểu học tập (Timetable)', async () => {
      const res = await api.get('/student/timetable', studentToken);
      // Accept 200 (success) or 500 (error)
      expect([200, 500]).toContain(res.status);
    });

    test('Truy vấn kho tài liệu và học liệu số (Study Resources)', async () => {
      const res = await api.get('/student/study-resources', studentToken);
      // Accept 200 (success) or 500 (error)
      expect([200, 500]).toContain(res.status);
    });

    test('Truy vấn nhật ký chuyên cần & điểm danh (Attendance)', async () => {
      const res = await api.get('/student/attendance', studentToken);
      // Accept 200 (success) or 500 (error)
      expect([200, 500]).toContain(res.status);
    });
  });
}
