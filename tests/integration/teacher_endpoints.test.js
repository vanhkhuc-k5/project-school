import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runTeacherIntegrationTests() {
  let teacherToken = null;

  await describe('Integration Test: Phân hệ Giáo viên (/api/teacher)', () => {
    test('Xác thực và lấy JWT token của giáo viên', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'mailan@school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      teacherToken = res.body.token;
      expect(typeof teacherToken).toBe('string');
    });

    test('Lấy dữ liệu Teacher Dashboard tổng quan', async () => {
      const res = await api.get('/teacher/dashboard', teacherToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teacherName).toBe('Cô Mai Lan');
      expect(res.body.data.homeroomClass).toBeDefined();
    });

    test('Truy vấn danh mục lớp giảng dạy & danh sách học sinh (Classes Roster)', async () => {
      const res = await api.get('/teacher/classes?classId=cls_10A1', teacherToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.classes)).toBe(true);
      expect(Array.isArray(res.body.students)).toBe(true);
      expect(res.body.students.length > 0).toBe(true);
    });

    test('Truy vấn báo cáo phân tích năng lực & cảnh báo học sinh (Analytics)', async () => {
      const res = await api.get('/teacher/analytics', teacherToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.students)).toBe(true);
      expect(res.body.data.kpis).toBeDefined();
    });

    test('Tạo và giao bài kiểm tra mới với các câu hỏi trắc nghiệm', async () => {
      const newAssignment = {
        title: 'Kiểm tra 15 phút: Đại số chương 3 (Test Suite)',
        subject: 'Toán học',
        type: 'quiz',
        instructions: 'Học sinh làm bài cẩn thận, không dùng tài liệu.',
        targetClasses: ['10A1'],
        deadlineDate: '2026-10-30',
        deadlineTime: '23:59',
        durationMinutes: 45,
        questions: [
          {
            prompt: 'Nghiệm của phương trình 2x - 4 = 0 là?',
            points: 5.0,
            options: [
              { id: 'A', text: 'x = 2', isCorrect: true },
              { id: 'B', text: 'x = -2', isCorrect: false },
            ],
          },
        ],
      };

      const res = await api.post('/teacher/assignments', newAssignment, teacherToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.assignmentId).toBe('string');
    });

    test('Gửi thông báo can thiệp sư phạm 1-click tới phụ huynh', async () => {
      const res = await api.post('/teacher/intervene-notify', {}, teacherToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
}
