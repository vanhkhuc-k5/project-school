import { describe, test, expect } from '../helpers/testClient.js';
import { query } from '../../server/shared/database/index.js';

export async function runCoreDomainSchemaTests() {
  await describe('Unit Test: Cấu Trúc Thực Thể Chuẩn Hóa PostgreSQL (Core Domain Schema)', () => {
    test('Kiểm tra sự tồn tại của đầy đủ các bảng mới chuẩn hóa', async () => {
      const expectedNormalizedTables = [
        'schools',
        'academic_years',
        'semesters',
        'roles',
        'permissions',
        'role_permissions',
        'user_roles',
        'departments',
        'teachers',
        'parents',
        'parent_students',
        'class_enrollments',
        'class_subjects',
        'grade_categories',
        'attendance_sessions',
        'attendance_records',
        'announcements',
        'notifications',
        'parent_teacher_messages',
        'tuition_payments',
        'ai_conversations',
        'ai_messages',
      ];

      const res = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);

      const liveTables = res.rows.map((r) => r.table_name);
      for (const table of expectedNormalizedTables) {
        expect(liveTables.includes(table)).toBe(true);
      }
    });

    test('Trường học gốc (sch_bacau) tồn tại với mã chuẩn THPT Bắc Âu', async () => {
      const res = await query('SELECT * FROM schools WHERE id = $1', ['sch_bacau']);
      expect(res.rows.length).toBe(1);
      const school = res.rows[0];
      expect(school.code).toBe('BACAU_THPT');
      expect(school.name).toBe('Trường THPT Chuyên Bắc Âu');
      expect(school.status).toBe('active');
    });

    test('Năm học hiện tại và các học kỳ được liên kết chặt chẽ với trường học', async () => {
      const ayRes = await query('SELECT * FROM academic_years WHERE school_id = $1 AND is_current = true', ['sch_bacau']);
      expect(ayRes.rows.length).toBe(1);
      const ay = ayRes.rows[0];
      expect(ay.name).toBe('2024 - 2025');

      const semRes = await query('SELECT * FROM semesters WHERE academic_year_id = $1 ORDER BY semester_number', [ay.id]);
      expect(semRes.rows.length >= 2).toBe(true);
      expect(semRes.rows[0].semester_number).toBe(1);
      expect(semRes.rows[0].is_current).toBe(true);
      expect(semRes.rows[1].semester_number).toBe(2);
    });

    test('Ma trận phân quyền RBAC: Có đầy đủ vai trò hệ thống và quyền hạn', async () => {
      const roleRes = await query('SELECT name FROM roles ORDER BY name');
      const roleNames = roleRes.rows.map((r) => r.name);
      expect(roleNames.includes('admin')).toBe(true);
      expect(roleNames.includes('principal')).toBe(true);
      expect(roleNames.includes('teacher')).toBe(true);
      expect(roleNames.includes('student')).toBe(true);
      expect(roleNames.includes('parent')).toBe(true);

      const permRes = await query('SELECT count(*) as total FROM role_permissions WHERE role_id = $1', ['role_admin']);
      const permCount = parseInt(permRes.rows[0].total, 10);
      expect(permCount >= 5).toBe(true);
    });

    test('Ràng buộc đa trường học (Tenant Scoping): Người dùng gắn với school_id', async () => {
      const res = await query('SELECT count(*) as unassigned FROM users WHERE school_id IS NULL');
      const unassignedCount = parseInt(res.rows[0].unassigned, 10);
      expect(unassignedCount).toBe(0);

      const checkSample = await query('SELECT school_id FROM users LIMIT 5');
      for (const u of checkSample.rows) {
        expect(u.school_id).toBe('sch_bacau');
      }
    });

    test('Danh mục đánh giá chuẩn MOET (grade_categories) đầy đủ hệ số và tối thiểu 5 loại', async () => {
      const res = await query('SELECT code, coefficient FROM grade_categories WHERE school_id = $1', ['sch_bacau']);
      expect(res.rows.length >= 5).toBe(true);
      
      const codes = res.rows.map((r) => r.code);
      expect(codes.includes('MIENG')).toBe(true);
      expect(codes.includes('15P')).toBe(true);
      expect(codes.includes('1TIET')).toBe(true);
      expect(codes.includes('GIUA_KY')).toBe(true);
      expect(codes.includes('CUOI_KY')).toBe(true);
    });

    test('Lịch sử xếp lớp (class_enrollments) liên kết học sinh với niên khóa', async () => {
      const res = await query(`
        SELECT ce.id, s.id as student_id, c.name as class_name, ay.name as year_name
        FROM class_enrollments ce
        JOIN students s ON ce.student_id = s.id
        JOIN classes c ON ce.class_id = c.id
        JOIN academic_years ay ON ce.academic_year_id = ay.id
        LIMIT 5
      `);
      expect(res.rows.length > 0).toBe(true);
      expect(res.rows[0].class_name).toBeDefined();
      expect(res.rows[0].year_name).toBe('2024 - 2025');
    });
  });
}
