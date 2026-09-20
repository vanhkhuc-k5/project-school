import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runAcademicCycleE2ETests() {
  let teacherToken = null;
  let studentToken = null;
  let parentToken = null;
  let createdAssignmentId = null;

  await describe('End-to-End Test: Chu trình Khảo thí & Học vụ liên vai trò (Teacher -> Student -> Parent)', () => {
    test('Bước 1: Giáo viên đăng nhập hệ thống', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'mailan@school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      teacherToken = res.body.token;
    });

    test('Bước 2: Giáo viên tạo bài kiểm tra 15 phút và giao cho lớp', async () => {
      const assignmentPayload = {
        title: 'Kiểm tra E2E: Giải tích & Ứng dụng tích phân',
        subject: 'Toán học',
        type: 'quiz',
        instructions: 'Đề thi trắc nghiệm E2E đánh giá năng lực học kỳ.',
        targetClasses: ['11A1', '10A1'],
        deadlineDate: '2026-12-31',
        deadlineTime: '23:59',
        durationMinutes: 45,
        questions: [
          {
            prompt: 'Tích phân ∫ (2x) dx từ 0 đến 2 có giá trị bằng bao nhiêu?',
            points: 10.0,
            options: [
              { id: 'A', text: 'A. 4', isCorrect: true },
              { id: 'B', text: 'B. 2', isCorrect: false },
              { id: 'C', text: 'C. 8', isCorrect: false },
            ],
          },
        ],
      };

      const res = await api.post('/teacher/assignments', assignmentPayload, teacherToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.assignmentId).toBe('string');
      createdAssignmentId = res.body.assignmentId;
    });

    test('Bước 3: Học sinh đăng nhập và nhìn thấy bài tập vừa giao', async () => {
      const loginRes = await api.post('/auth/login', {
        identifier: 'minhkhang@school.edu.vn',
        password: '123456',
      });
      expect(loginRes.status).toBe(200);
      studentToken = loginRes.body.token;

      const listRes = await api.get('/student/assignments', studentToken);
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.assignments)).toBe(true);
      const found = listRes.body.assignments.find((a) => a.id === createdAssignmentId);
      expect(found).toBeDefined();
    });

    test('Bước 4: Học sinh nộp bài tập và nhận điểm tự động', async () => {
      expect(createdAssignmentId).toBeDefined();
      const submitPayload = {
        studentAnswers: {
          [`q_${createdAssignmentId}_1`]: 'A',
        },
      };

      const res = await api.post(`/student/assignments/${createdAssignmentId}/submit`, submitPayload, studentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.score).toBeDefined();
    });

    test('Bước 5: Phụ huynh đăng nhập và theo dõi kết quả của con', async () => {
      const loginRes = await api.post('/auth/login', {
        identifier: 'vanhoi@parent.school.edu.vn',
        password: '123456',
      });
      expect(loginRes.status).toBe(200);
      parentToken = loginRes.body.token;

      const childrenRes = await api.get('/parent/children', parentToken);
      expect(childrenRes.status).toBe(200);
      expect(Array.isArray(childrenRes.body.children)).toBe(true);
      expect(childrenRes.body.children.length > 0).toBe(true);
    });
  });
}
