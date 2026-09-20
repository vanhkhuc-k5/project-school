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
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studentInfo).toBeDefined();
      expect(res.body.data.studentInfo.name).toBe('Nguyễn Minh Khang');
      expect(Array.isArray(res.body.data.urgentAssignments)).toBe(true);
      expect(Array.isArray(res.body.data.recentGrades)).toBe(true);
    });

    test('Truy vấn danh sách bài tập được giao (Assignments)', async () => {
      const res = await api.get('/student/assignments', studentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.assignments)).toBe(true);
      expect(res.body.assignments.length > 0).toBe(true);
    });

    test('Truy vấn bảng điểm số và học bạ điện tử (Grades)', async () => {
      const res = await api.get('/student/grades', studentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.grades)).toBe(true);
      expect(res.body.grades.length > 0).toBe(true);
    });

    test('Truy vấn thời khóa biểu học tập (Timetable)', async () => {
      const res = await api.get('/student/timetable', studentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.schedule).toBeDefined();
    });

    test('Truy vấn kho tài liệu và học liệu số (Study Resources)', async () => {
      const res = await api.get('/student/study-resources', studentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.resources)).toBe(true);
      expect(res.body.resources.length > 0).toBe(true);
    });

    test('Truy vấn nhật ký chuyên cần & điểm danh (Attendance)', async () => {
      const res = await api.get('/student/attendance', studentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.attendance).toBeDefined();
    });
  });
}
