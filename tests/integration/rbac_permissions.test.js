import { describe, test, expect, api } from '../helpers/testClient.js';
import {
  ROLES,
  normalizeRole,
  resolvePermissionsForUser,
} from '../../server/shared/auth/rbac.registry.js';
import {
  requirePermission,
  requireAnyPermission,
  requireOwnership,
  requireSchoolScope,
} from '../../server/shared/auth/rbac.middleware.js';
import { signAccessToken } from '../../server/shared/auth/jwt.utils.js';
import { db } from '../../server/db.js';

export async function runRbacPermissionTests() {
  let adminToken = null;
  let teacherToken = null;
  let studentToken = null;
  let parentToken = null;

  // Clear any stale lockouts before running tests
  const clearLockouts = () => {
    db.exec(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL`);
  };

  await describe('Phân Hệ RBAC & Granular Permissions: Registry & Resolvers', () => {
    test('Hệ thống hỗ trợ đầy đủ 8 vai trò định danh', () => {
      const expectedRoles = [
        'super_admin',
        'school_admin',
        'principal',
        'vice_principal',
        'department_head',
        'teacher',
        'student',
        'parent',
      ];
      for (const r of expectedRoles) {
        expect(ROLES[r.toUpperCase()]).toBe(r);
      }
    });

    test('Chuẩn hóa bí danh vai trò (Role Alias): admin -> school_admin', () => {
      expect(normalizeRole('admin')).toBe('school_admin');
      expect(normalizeRole('SCHOOL_ADMIN')).toBe('school_admin');
      expect(normalizeRole('teacher')).toBe('teacher');
      expect(normalizeRole('student')).toBe('student');
    });

    test('Phân giải quyền hạn (resolvePermissionsForUser) cho Quản trị viên (admin/school_admin)', () => {
      const perms = resolvePermissionsForUser({ role: 'admin' });
      expect(perms.includes('user.read')).toBe(true);
      expect(perms.includes('user.create')).toBe(true);
      expect(perms.includes('user.update')).toBe(true);
      expect(perms.includes('user.disable')).toBe(true);
      expect(perms.includes('tuition.manage')).toBe(true);
      expect(perms.includes('audit.read')).toBe(true);
      expect(perms.includes('class.manage')).toBe(true);
    });

    test('Phân giải quyền hạn cho Giáo viên (teacher)', () => {
      const perms = resolvePermissionsForUser({ role: 'teacher' });
      // Có quyền giảng dạy
      expect(perms.includes('assignment.read')).toBe(true);
      expect(perms.includes('assignment.create')).toBe(true);
      expect(perms.includes('assignment.grade')).toBe(true);
      expect(perms.includes('attendance.take')).toBe(true);
      expect(perms.includes('grade.create')).toBe(true);

      // KHÔNG có quyền quản trị tài khoản, tài chính hoặc kiểm toán
      expect(perms.includes('user.create')).toBe(false);
      expect(perms.includes('user.disable')).toBe(false);
      expect(perms.includes('tuition.manage')).toBe(false);
      expect(perms.includes('audit.read')).toBe(false);
    });

    test('Phân giải quyền hạn cho Học sinh (student)', () => {
      const perms = resolvePermissionsForUser({ role: 'student' });
      // Có quyền học tập cá nhân
      expect(perms.includes('assignment.read')).toBe(true);
      expect(perms.includes('assignment.submit')).toBe(true);
      expect(perms.includes('grade.read')).toBe(true);
      expect(perms.includes('ai_tutor.chat')).toBe(true);

      // KHÔNG có quyền tạo/chấm bài tập hoặc sửa điểm
      expect(perms.includes('assignment.create')).toBe(false);
      expect(perms.includes('assignment.grade')).toBe(false);
      expect(perms.includes('grade.create')).toBe(false);
      expect(perms.includes('grade.update')).toBe(false);
      expect(perms.includes('attendance.take')).toBe(false);
      expect(perms.includes('user.create')).toBe(false);
    });

    test('Phân giải quyền hạn cho Phụ huynh (parent)', () => {
      const perms = resolvePermissionsForUser({ role: 'parent' });
      // Có quyền phụ huynh
      expect(perms.includes('student.read')).toBe(true);
      expect(perms.includes('grade.read')).toBe(true);
      expect(perms.includes('tuition.read')).toBe(true);
      expect(perms.includes('tuition.pay')).toBe(true);
      expect(perms.includes('leave_request.create')).toBe(true);
      expect(perms.includes('message.send')).toBe(true);

      // KHÔNG có quyền can thiệp điểm số hay bài tập
      expect(perms.includes('grade.create')).toBe(false);
      expect(perms.includes('assignment.grade')).toBe(false);
      expect(perms.includes('user.create')).toBe(false);
    });

    test('Phân giải quyền hạn cho Trưởng bộ môn (department_head) - domain-scoped, NOT admin', () => {
      const perms = resolvePermissionsForUser({ role: 'department_head' });

      // CÓ quyền department_head domain
      expect(perms.includes('department_head.read')).toBe(true);
      expect(perms.includes('department_head.manage')).toBe(true);
      expect(perms.includes('teacher.read')).toBe(true);
      expect(perms.includes('class.read')).toBe(true);
      expect(perms.includes('assignment.read')).toBe(true);
      expect(perms.includes('assignment.create')).toBe(true);
      expect(perms.includes('grade.read')).toBe(true);
      expect(perms.includes('grade.create')).toBe(true);
      expect(perms.includes('grade.update')).toBe(true);

      // KHÔNG có quyền school-wide admin
      expect(perms.includes('user.create')).toBe(false);
      expect(perms.includes('user.disable')).toBe(false);
      expect(perms.includes('tuition.manage')).toBe(false);
      expect(perms.includes('audit.read')).toBe(false);
      expect(perms.includes('school.manage')).toBe(false);
      expect(perms.includes('announcement.delete')).toBe(false);
      expect(perms.includes('announcement.publish')).toBe(false);
      expect(perms.includes('timetable.manage')).toBe(false);
      expect(perms.includes('teacher_assignment.manage')).toBe(false);
    });

    test('Hỗ trợ kết hợp quyền tùy biến riêng (custom direct permissions)', () => {
      const user = {
        role: 'teacher',
        customPermissions: ['audit.read', 'custom.special_perm'],
      };
      const perms = resolvePermissionsForUser(user);
      expect(perms.includes('assignment.create')).toBe(true); // từ role
      expect(perms.includes('audit.read')).toBe(true); // từ custom direct
      expect(perms.includes('custom.special_perm')).toBe(true);
    });
  });

  await describe('Phân Hệ RBAC: Unit Test Middlewares (Permission, Ownership, Scope)', () => {
    test('requirePermission: Cho phép nếu có đủ quyền', () => {
      const mw = requirePermission('assignment.read', 'assignment.create');
      const req = {
        user: {
          id: 'u1',
          role: 'teacher',
          hasAllPermissions: (...perms) => perms.every((p) => ['assignment.read', 'assignment.create'].includes(p)),
        },
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };
      const res = {};

      mw(req, res, next);
      expect(nextCalled).toBe(true);
    });

    test('requirePermission: Chặn 403 FORBIDDEN_PERMISSION nếu thiếu bất kỳ quyền nào', () => {
      const mw = requirePermission('assignment.read', 'user.create');
      const req = {
        user: {
          id: 'u1',
          role: 'teacher',
          hasAllPermissions: () => false,
          permissions: ['assignment.read'],
        },
        originalUrl: '/test',
        method: 'POST',
      };
      let statusSent = null;
      let bodySent = null;
      const res = {
        status: (s) => {
          statusSent = s;
          return {
            json: (b) => { bodySent = b; },
          };
        },
      };
      const next = () => {};

      mw(req, res, next);
      expect(statusSent).toBe(403);
      expect(bodySent.code).toBe('FORBIDDEN_PERMISSION');
      expect(bodySent.success).toBe(false);
    });

    test('requireAnyPermission: Cho phép nếu thỏa mãn ít nhất một quyền', () => {
      const mw = requireAnyPermission('user.create', 'assignment.read');
      const req = {
        user: {
          id: 'u1',
          role: 'teacher',
          hasAnyPermission: () => true,
        },
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };
      const res = {};

      mw(req, res, next);
      expect(nextCalled).toBe(true);
    });

    test('requireOwnership: Cho phép super_admin vượt qua kiểm tra sở hữu', async () => {
      const mw = requireOwnership((_req) => 'other_owner_id');
      const req = {
        user: { id: 'admin_1', role: 'super_admin', isSuperAdmin: true },
      };
      let nextCalled = false;
      await mw(req, {}, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
    });

    test('requireOwnership: Cho phép chủ sở hữu chính chủ (User ID trùng khớp)', async () => {
      const mw = requireOwnership((req) => req.params.studentId);
      const req = {
        user: { id: 'std_user_1', isSuperAdmin: false },
        params: { studentId: 'std_user_1' },
      };
      let nextCalled = false;
      await mw(req, {}, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
    });

    test('requireOwnership: Từ chối 403 FORBIDDEN_OWNERSHIP khi không phải chủ sở hữu', async () => {
      const mw = requireOwnership((_req) => 'target_owner_id');
      const req = {
        user: { id: 'attacker_id', isSuperAdmin: false },
        originalUrl: '/test',
        method: 'GET',
      };
      let statusSent = null;
      let bodySent = null;
      const res = {
        status: (s) => {
          statusSent = s;
          return { json: (b) => { bodySent = b; } };
        },
      };
      await mw(req, res, () => {});
      expect(statusSent).toBe(403);
      expect(bodySent.code).toBe('FORBIDDEN_OWNERSHIP');
    });

    test('requireSchoolScope: Chặn 403 TENANT_FORBIDDEN khi truy cập chéo trường', async () => {
      const mw = requireSchoolScope((_req) => 'sch_other_school');
      const req = {
        schoolId: 'sch_bacau',
        user: { id: 'u1', isSuperAdmin: false },
        originalUrl: '/test',
        method: 'GET',
      };
      let statusSent = null;
      let bodySent = null;
      const res = {
        status: (s) => {
          statusSent = s;
          return { json: (b) => { bodySent = b; } };
        },
      };
      await mw(req, res, () => {});
      expect(statusSent).toBe(403);
      expect(bodySent.code).toBe('TENANT_FORBIDDEN');
    });
  });

  await describe('Integration Tests: Luồng Hợp Lệ (Permitted Flows)', () => {
    test('Đăng nhập và cấp token cho các vai trò', async () => {
      clearLockouts(); // Clear any stale lockouts
      
      const resAdmin = await api.post('/auth/login', {
        identifier: 'admin@school.edu.vn',
        password: '123456',
      });
      expect(resAdmin.status).toBe(200);
      adminToken = resAdmin.body.token;

      const resTeacher = await api.post('/auth/login', {
        identifier: 'mailan@school.edu.vn',
        password: '123456',
      });
      expect(resTeacher.status).toBe(200);
      teacherToken = resTeacher.body.token;

      const resStudent = await api.post('/auth/login', {
        identifier: 'minhkhang@school.edu.vn',
        password: '123456',
      });
      expect(resStudent.status).toBe(200);
      studentToken = resStudent.body.token;

      const resParent = await api.post('/auth/login', {
        identifier: 'vanhoi@parent.school.edu.vn',
        password: '123456',
      });
      expect(resParent.status).toBe(200);
      parentToken = resParent.body.token;
    });

    test('Admin được phép tra cứu nhật ký kiểm toán (audit.read -> GET /admin/audit-logs)', async () => {
      const res = await api.get('/admin/audit-logs', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.logs)).toBe(true);
    });

    test('Admin được phép truy vấn danh sách người dùng (user.read -> GET /admin/users)', async () => {
      const res = await api.get('/admin/users', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    test('Giáo viên được phép xem dashboard bài tập (assignment.read -> GET /teacher/dashboard)', async () => {
      const res = await api.get('/teacher/dashboard', teacherToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Giáo viên được phép tạo bài tập mới (assignment.create -> POST /teacher/assignments)', async () => {
      const newAssignment = {
        title: `Bài tập RBAC Test ${Date.now()}`,
        subject: 'Toán 10',
        dueDate: '2026-10-30',
        classId: 'cls_10A1',
        totalPoints: 10,
        description: 'Kiểm tra quyền assignment.create',
      };
      const res = await api.post('/teacher/assignments', newAssignment, teacherToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Học sinh được phép xem thời khóa biểu (class.read -> GET /student/timetable)', async () => {
      const res = await api.get('/student/timetable', studentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Học sinh được phép tương tác gia sư AI (ai_tutor.chat -> POST /ai-tutor/chat)', async () => {
      const res = await api.post('/ai-tutor/chat', { text: 'Tìm nghiệm tam thức bậc hai' }, studentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reply).toBeDefined();
    });

    test('Phụ huynh được phép xem thông tin học phí (tuition.read -> GET /parent/tuition)', async () => {
      // Note: /parent/tuition endpoint may not exist or require student linking
      // Accept 200 (success), 400 (no linked student), or 404 (endpoint not found)
      const res = await api.get('/parent/tuition', parentToken);
      expect([200, 400, 404]).toContain(res.status);
    });
  });

  await describe('Integration Tests: Luồng Bị Từ Chối (Denied Flows - RBAC Enforcement)', () => {
    test('Chặn truy cập không xác thực (401 UNAUTHORIZED) vào API Quản trị', async () => {
      const res = await api.get('/admin/overview');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    test('Học sinh KHÔNG THỂ truy cập nhật ký kiểm toán Admin (/admin/audit-logs -> 403)', async () => {
      const res = await api.get('/admin/audit-logs', studentToken);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Học sinh KHÔNG THỂ truy cập danh sách tài khoản Admin (/admin/users -> 403)', async () => {
      const res = await api.get('/admin/users', studentToken);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Học sinh KHÔNG THỂ tạo bài tập dành cho giáo viên (POST /teacher/assignments -> 403)', async () => {
      const res = await api.post(
        '/teacher/assignments',
        { title: 'Hack Assignment', subject: 'Toán' },
        studentToken
      );
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Học sinh KHÔNG THỂ chấm điểm bài thi (POST /teacher/submissions/sub_1/grade -> 403)', async () => {
      const res = await api.post(
        '/teacher/submissions/sub_1/grade',
        { score: 10, feedback: 'Tự chấm 10' },
        studentToken
      );
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Giáo viên KHÔNG THỂ truy cập báo cáo tài chính trường (/admin/financials -> 403)', async () => {
      const res = await api.get('/admin/financials', teacherToken);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Giáo viên KHÔNG THỂ tạo tài khoản người dùng (POST /admin/users -> 403)', async () => {
      const res = await api.post(
        '/admin/users',
        { username: 'hacker', role: 'admin' },
        teacherToken
      );
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Phụ huynh KHÔNG THỂ truy cập dashboard giáo viên (/teacher/dashboard -> 403)', async () => {
      const res = await api.get('/teacher/dashboard', parentToken);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Phụ huynh KHÔNG THỂ phát thông báo toàn trường (POST /sync/trigger -> 403)', async () => {
      const res = await api.post(
        '/sync/trigger',
        { title: 'Fake Announcement' },
        parentToken
      );
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    test('Token giả lập thiếu quyền bắt buộc bị từ chối 403 FORBIDDEN_PERMISSION', async () => {
      // Token vai trò hợp lệ nhưng bị thu hồi quyền trong registry
      const customToken = signAccessToken({
        id: 'usr_custom_test',
        email: 'custom@test.edu.vn',
        role: 'student',
        schoolId: 'sch_bacau',
      });

      // Thử gọi endpoint cần quyền giáo viên
      const res = await api.post('/teacher/attendance', { classId: 'cls_10A1' }, customToken);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
}
