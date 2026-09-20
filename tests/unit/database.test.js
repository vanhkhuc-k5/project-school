import { describe, test, expect } from '../helpers/testClient.js';
import { query, isPostgresConfigured } from '../../server/postgres.js';

export async function runDatabaseUnitTests() {
  await describe('Unit Test: Kết nối & Toàn vẹn Dữ liệu Neon PostgreSQL', () => {
    test('Xác định cờ cấu hình PostgreSQL thành công', () => {
      expect(isPostgresConfigured()).toBe(true);
    });

    test('Thực thi câu truy vấn kiểm tra kết nối PostgreSQL thành công', async () => {
      const res = await query('SELECT 1 as connected, NOW() as current_time');
      expect(res.rows.length).toBe(1);
      expect(Number(res.rows[0].connected)).toBe(1);
    });

    test('Kiểm tra sự tồn tại của đầy đủ 19 bảng trong cơ sở dữ liệu', async () => {
      const expectedTables = [
        'users',
        'subjects',
        'classes',
        'students',
        'teacher_assignments',
        'assignments',
        'assignment_questions',
        'assignment_submissions',
        'grades',
        'student_competencies',
        'attendance',
        'timetable',
        'tuition_invoices',
        'school_notices',
        'messages',
        'leave_requests',
        'ai_tutor_messages',
        'study_resources',
        'audit_logs',
      ];

      const res = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);

      const liveTables = res.rows.map((r) => r.table_name);
      for (const table of expectedTables) {
        expect(liveTables.includes(table)).toBe(true);
      }
    });

    test('Kiểm tra dữ liệu người dùng có đầy đủ 4 vai trò chính', async () => {
      const res = await query('SELECT DISTINCT role FROM users ORDER BY role');
      const roles = res.rows.map((r) => r.role);
      expect(roles.includes('admin')).toBe(true);
      expect(roles.includes('teacher')).toBe(true);
      expect(roles.includes('student')).toBe(true);
      expect(roles.includes('parent')).toBe(true);
    });

    test('Kiểm tra danh mục môn học chuẩn THPT có tối thiểu 10 môn', async () => {
      const res = await query('SELECT count(*) as total FROM subjects');
      const total = parseInt(res.rows[0].total, 10);
      expect(total >= 10).toBe(true);
    });

    test('Kiểm tra tính toàn vẹn khóa ngoại (Students phải gắn với Users và Classes hợp lệ)', async () => {
      const res = await query(`
        SELECT s.id, u.name as student_name, c.name as class_name
        FROM students s
        JOIN users u ON s.user_id = u.id
        JOIN classes c ON s.class_id = c.id
      `);
      expect(res.rows.length > 0).toBe(true);
    });
  });
}
