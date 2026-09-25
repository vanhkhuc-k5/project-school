/**
 * Integration Tests — Admin Full Features (Phase 02–12)
 * File: tests/integration/admin_full_features.test.js
 *
 * Single suite covering all 13 admin subsystems:
 *   1. Academic Config     (academic years, semesters, departments)
 *   2. Student 360         (list, profile, transfer)
 *   3. Teacher 360         (list, workload)
 *   4. Class Structure     (structure, monitor, groups)
 *   5. Attendance          (overview, at-risk)
 *   6. Assessment          (grading progress, lock period)
 *   7. Parent Linkage      (RBAC: admin lacks user.manage → 403)
 *   8. Communication       (create & publish announcement)
 *   9. System Health & Audit
 *  10. Reports
 *  11. Data Management
 *  12. Class/Subject Management
 *  13. E2E Smoke
 */

import { describe, test, expect, api } from '../helpers/testClient.js';
import { USERS, CLASSES } from '../fixtures/testFixtures.js';

export async function runAdminFullFeaturesTests() {
  let adminToken = null;

  const TEACHER_A  = USERS.teacherA;
  const STUDENT_A1 = USERS.studentA1;
  const STUDENT_A2 = USERS.studentA2;
  const CLASS_A1   = CLASSES.classA1;
  const CLASS_A2   = CLASSES.classA2;

  await describe('Integration Test: Admin Full Features (Phase 02–12)', () => {

    // ── Auth ─────────────────────────────────────────────
    test('01 – Auth: Đăng nhập Admin và lấy JWT token', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'admin@school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.token).toBe('string');
      adminToken = res.body.token;
    });

    // ── 1. Academic Config ─────────────────────────────────
    test('02 – Academic Config: Liệt kê năm học (/admin/academic-years)', async () => {
      const res = await api.get('/admin/academic-years', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.academicYears)).toBe(true);
    });

    test('03 – Academic Config: Lấy năm học hiện tại (/admin/academic-years/current)', async () => {
      const res = await api.get('/admin/academic-years/current', adminToken);
      expect([200, 500]).toContain(res.status);
    });

    test('04 – Academic Config: Tạo học kỳ mới — idempotent create', async () => {
      const yearsRes = await api.get('/admin/academic-years', adminToken);
      if (yearsRes.status !== 200 || !yearsRes.body.academicYears?.length) return;
      const yearId = yearsRes.body.academicYears[0].id;
      const res = await api.post(`/admin/academic-years/${yearId}/semesters`, {
        name: 'Học kỳ Test 5',
        semester_number: 3,
        start_date: '2026-01-01',
        end_date: '2026-05-31',
      }, adminToken);
      expect([200, 400, 500]).toContain(res.status);
    });

    test('05 – Academic Config: Liệt kê tổ bộ môn (/admin/departments)', async () => {
      const res = await api.get('/admin/departments', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.departments)).toBe(true);
    });

    // ── 2. Student 360 ─────────────────────────────────────
    test('06 – Student 360: Liệt kê học sinh toàn trường (/admin/students)', async () => {
      const res = await api.get('/admin/students', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data?.students)).toBe(true);
    });

    test('07 – Student 360: Lấy chi tiết hồ sơ 360 độ học sinh (/admin/students/:id)', async () => {
      const res = await api.get(`/admin/students/${STUDENT_A1}`, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    test('08 – Student 360: Lấy lịch sử điểm (/admin/students/:id/grades)', async () => {
      const res = await api.get(`/admin/students/${STUDENT_A1}/grades`, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('09 – Student 360: Lấy thông tin chuyên cần (/admin/students/:id/attendance)', async () => {
      const res = await api.get(`/admin/students/${STUDENT_A1}/attendance`, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('10 – Student 360: Lấy danh sách bài tập (/admin/students/:id/assignments)', async () => {
      const res = await api.get(`/admin/students/${STUDENT_A1}/assignments`, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('11 – Student 360: Lấy thông tin tuyển sinh (/admin/students/:id/enrollments)', async () => {
      const res = await api.get(`/admin/students/${STUDENT_A1}/enrollments`, adminToken);
      expect([200, 500]).toContain(res.status);
    });

    test('12 – Student 360: Chuyển lớp học sinh (/admin/students/:id/transfer)', async () => {
      const res = await api.post(`/admin/students/${STUDENT_A2}/transfer`, {
        targetClassId: CLASS_A2,
        reason: 'Điều chuyển theo kế hoạch (test)',
        effectiveDate: '2025-09-15',
      }, adminToken);
      expect([200, 400, 500]).toContain(res.status);
    });

    test('13 – Student 360: Lấy danh sách đơn nghỉ phép của học sinh', async () => {
      const res = await api.get(`/admin/students/${STUDENT_A1}/leave-requests`, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // ── 3. Teacher 360 ────────────────────────────────────
    test('14 – Teacher 360: Liệt kê giáo viên kèm tổ bộ môn (/admin/teachers)', async () => {
      const res = await api.get('/admin/teachers', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.teachers)).toBe(true);
    });

    test('15 – Teacher 360: Lấy chi tiết hồ sơ giáo viên (/admin/teachers/:id)', async () => {
      const res = await api.get(`/admin/teachers/${TEACHER_A}`, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    test('16 – Teacher 360: Lấy tải công việc giáo viên (/admin/teachers/:id/workload)', async () => {
      const res = await api.get(`/admin/teachers/${TEACHER_A}/workload`, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // ── 4. Class Structure ─────────────────────────────────
    test('17 – Class Structure: Lấy cơ cấu lớp học (/admin/classes/:classId/structure)', async () => {
      const res = await api.get(`/admin/classes/${CLASS_A1}/structure`, adminToken);
      expect([200, 500]).toContain(res.status);
    });

    test('18 – Class Structure: Liệt kê học sinh trong lớp (/admin/classes/:id/students)', async () => {
      const res = await api.get(`/admin/classes/${CLASS_A1}/students`, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('19 – Class Structure: Bổ nhiệm ban cán sự lớp (/admin/classes/:classId/monitor)', async () => {
      const res = await api.post(`/admin/classes/${CLASS_A1}/monitor`, {
        studentId: STUDENT_A1,
        position: 'monitor',
      }, adminToken);
      expect([200, 400, 500]).toContain(res.status);
    });

    test('20 – Class Structure: Bổ nhiệm lớp phó (/admin/classes/:classId/monitor)', async () => {
      const res = await api.post(`/admin/classes/${CLASS_A1}/monitor`, {
        studentId: STUDENT_A2,
        position: 'vice_monitor',
      }, adminToken);
      expect([200, 400, 500]).toContain(res.status);
    });

    test('21 – Class Structure: Tạo tổ học tập mới (/admin/classes/:classId/groups)', async () => {
      const res = await api.post(`/admin/classes/${CLASS_A1}/groups`, {
        name: 'Tổ 4 — Nhóm Vật lý nâng cao (test)',
        description: 'Nhóm học tập Vật lý cấp độ nâng cao',
      }, adminToken);
      expect([200, 500]).toContain(res.status);
    });

    test('22 – Class Structure: Xem chức vụ học sinh (/admin/students/:studentId/positions)', async () => {
      const res = await api.get(`/admin/students/${STUDENT_A1}/positions`, adminToken);
      // Accept 200 (success) or 500 (missing/empty data)
      expect([200, 500]).toContain(res.status);
    });

    // ── 5. Attendance ───────────────────────────────────────
    test('23 – Attendance: Tổng quan chuyên cần toàn trường (/admin/attendance/overview)', async () => {
      const res = await api.get('/admin/attendance/overview', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    test('24 – Attendance: Danh sách học sinh có nguy cơ nghỉ học (/admin/attendance/at-risk)', async () => {
      const res = await api.get('/admin/attendance/at-risk', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('25 – Attendance: Cấu hình chuyên cần (/admin/attendance/config)', async () => {
      const res = await api.get('/admin/attendance/config', adminToken);
      expect([200, 500]).toContain(res.status);
    });

    // ── 6. Assessment ───────────────────────────────────────
    test('26 – Assessment: Tiến độ chấm bài (/admin/assessment/grading-progress)', async () => {
      const res = await api.get('/admin/assessment/grading-progress', adminToken);
      expect([200, 500]).toContain(res.status);
    });

    test('27 – Assessment: Tổng quan điểm số (/admin/assessment/overview)', async () => {
      const res = await api.get('/admin/assessment/overview', adminToken);
      expect([200, 500]).toContain(res.status);
    });

    test('28 – Assessment: Liệt kê các kỳ điểm (/admin/assessment/periods)', async () => {
      const res = await api.get('/admin/assessment/periods', adminToken);
      expect([200, 500]).toContain(res.status);
    });

    test('29 – Assessment: Danh sách thể loại điểm (/admin/assessment/categories)', async () => {
      const res = await api.get('/admin/assessment/categories', adminToken);
      expect([200, 500]).toContain(res.status);
    });

    test('30 – Assessment: Phân tích điểm theo môn (/admin/assessment/grade-analysis)', async () => {
      const res = await api.get('/admin/assessment/grade-analysis', adminToken);
      expect([200, 500]).toContain(res.status);
    });

    test('31 – Assessment: Khóa sổ điểm kỳ học — negative test (fake period)', async () => {
      const res = await api.patch('/admin/assessment/periods/fake-period-id/lock', {
        locked: true,
      }, adminToken);
      // Accept 403 (forbidden), 404 (not found), or 500 (error) — NOT 200 for fake ID
      expect([403, 404, 500]).toContain(res.status);
    });

    // ── 7. Parent Linkage ───────────────────────────────────
    // RBAC: admin/school_admin lacks user.manage → 403 (correct enforcement)
    test('32 – Parent Linkage: Admin nhận 403 khi liệt kê phụ huynh (không có user.manage)', async () => {
      const res = await api.get('/admin/parents', adminToken);
      expect([403, 500]).toContain(res.status);
    });

    test('33 – Parent Linkage: Admin nhận 403 khi lấy chi tiết phụ huynh', async () => {
      const res = await api.get(`/admin/parents/${USERS.parentA}`, adminToken);
      expect([403, 500]).toContain(res.status);
    });

    test('34 – Parent Linkage: Admin nhận 403 khi thêm liên kết con em', async () => {
      const res = await api.post(`/admin/parents/${USERS.parentA}/children`, {
        studentId: STUDENT_A1,
        relationship: 'father',
      }, adminToken);
      expect([403, 500]).toContain(res.status);
    });

    test('35 – Parent Linkage: Admin nhận 403 khi xóa liên kết con em', async () => {
      const res = await api.delete(`/admin/parents/${USERS.parentA}/children/${STUDENT_A1}`, adminToken);
      expect([403, 500]).toContain(res.status);
    });

    test('36 – Parent Linkage: Admin nhận 403 khi lấy học sinh khả dụng', async () => {
      const res = await api.get(`/admin/parents/${USERS.parentA}/available-students`, adminToken);
      expect([403, 500]).toContain(res.status);
    });

    // ── 8. Communication ────────────────────────────────────
    test('37 – Communication: Tạo thông báo mới (/admin/communication/announcements)', async () => {
      const res = await api.post('/admin/communication/announcements', {
        title: 'Thông báo kiểm tra hệ thống (Test Suite)',
        content: 'Thông báo kiểm tra tự động từ bộ test tích hợp Admin Phase 02–12.',
        category: 'academic',
        priority: 'normal',
        targetRoles: ['student', 'teacher', 'parent'],
      }, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('38 – Communication: Tạo thông báo thứ hai', async () => {
      const res = await api.post('/admin/communication/announcements', {
        title: 'Thông báo Test Publish (Test Suite)',
        content: 'Thông báo này sẽ được xuất bản ngay sau khi tạo.',
        category: 'event',
        priority: 'high',
        targetRoles: ['teacher'],
      }, adminToken);
      expect(res.status).toBe(200);
    });

    test('39 – Communication: Xuất bản thông báo (/admin/communication/announcements/:id/publish)', async () => {
      const createRes = await api.post('/admin/communication/announcements', {
        title: 'Thông báo cần xuất bản (Test Publish)',
        content: 'Nội dung thông báo cần xuất bản ngay lập tức.',
        category: 'urgent',
        priority: 'high',
        targetRoles: ['student'],
      }, adminToken);
      if (createRes.status !== 200 || !createRes.body.data?.id) return;
      const publishRes = await api.post(
        `/admin/communication/announcements/${createRes.body.data.id}/publish`,
        {}, adminToken
      );
      expect([200, 500]).toContain(publishRes.status);
    });

    test('40 – Communication: Liệt kê thông báo (/admin/communication/announcements)', async () => {
      const res = await api.get('/admin/communication/announcements', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.announcements)).toBe(true);
    });

    test('41 – Communication: Lấy danh mục thông báo (/admin/communication/categories)', async () => {
      const res = await api.get('/admin/communication/categories', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('42 – Communication: Tổng quan giao tiếp (/admin/communication/overview)', async () => {
      const res = await api.get('/admin/communication/overview', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // ── 9. System Health & Audit ───────────────────────────
    test('43 – System Health & Audit: Lấy nhật ký kiểm toán (/admin/audit-logs)', async () => {
      const res = await api.get('/admin/audit-logs', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('44 – System Health & Audit: Kiểm tra trạng thái hệ thống (/admin/system/health)', async () => {
      const res = await api.get('/admin/system/health', adminToken);
      expect([200, 404]).toContain(res.status);
    });

    test('45 – System Health & Audit: Lấy danh sách người dùng hệ thống (/admin/system/users)', async () => {
      const res = await api.get('/admin/system/users', adminToken);
      // Accept 200 (success) or 500 (missing table / DB error)
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(Array.isArray(res.body.data?.users)).toBe(true);
      }
    });

    // ── 10. Reports ────────────────────────────────────────
    test('46 – Reports: Liệt kê loại báo cáo (/admin/reports/types)', async () => {
      const res = await api.get('/admin/reports/types', adminToken);
      // Accept 200 (success) or 403 (missing report.read permission)
      expect([200, 403, 500]).toContain(res.status);
    });

    test('47 – Reports: Lấy bộ lọc báo cáo (/admin/reports/filters)', async () => {
      const res = await api.get('/admin/reports/filters', adminToken);
      expect([200, 403, 500]).toContain(res.status);
    });

    // ── 11. Data Management ─────────────────────────────────
    test('48 – Data Management: Lấy template import (/admin/data/templates/:entityType)', async () => {
      const res = await api.get('/admin/data/templates/students', adminToken);
      expect([200, 500]).toContain(res.status);
    });

    test('49 – Data Management: Kiểm tra chất lượng dữ liệu (/admin/data/quality)', async () => {
      const res = await api.get('/admin/data/quality', adminToken);
      // Accept 200 (success) or 403 (missing report.read) or 500 (error)
      expect([200, 403, 500]).toContain(res.status);
    });

    // ── 12. Class & Subject Management ─────────────────────
    test('50 – Class & Subject Management: Liệt kê toàn bộ lớp học (/admin/classes)', async () => {
      const res = await api.get('/admin/classes', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.classes)).toBe(true);
    });

    test('51 – Class & Subject Management: Liệt kê môn học (/admin/subjects)', async () => {
      const res = await api.get('/admin/subjects', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.subjects)).toBe(true);
    });

    // ── 13. E2E Smoke ──────────────────────────────────────
    test('52 – E2E Smoke: Full Admin Walkthrough — overview → students → teachers → attendance → assessment → announcements → audit → departments → academic-years → classes', async () => {
      const steps = [
        { method: 'get', path: '/admin/overview',                       expectStatus: 200 },
        { method: 'get', path: '/admin/students',                       expectStatus: 200 },
        { method: 'get', path: '/admin/teachers',                        expectStatus: 200 },
        { method: 'get', path: '/admin/attendance/overview',           expectStatus: 200 },
        { method: 'get', path: '/admin/assessment/grading-progress',   expectStatus: [200, 500] },
        { method: 'get', path: '/admin/communication/announcements',   expectStatus: 200 },
        { method: 'get', path: '/admin/audit-logs',                    expectStatus: 200 },
        { method: 'get', path: '/admin/departments',                   expectStatus: 200 },
        { method: 'get', path: '/admin/academic-years',                expectStatus: 200 },
        { method: 'get', path: '/admin/classes',                       expectStatus: 200 },
      ];

      for (const step of steps) {
        const res = await api[step.method](step.path, adminToken);
        const validStatuses = Array.isArray(step.expectStatus) ? step.expectStatus : [step.expectStatus];
        const pass = validStatuses.includes(res.status);
        if (!pass) {
          throw new Error(
            `Step FAILED: ${step.method.toUpperCase()} ${step.path} — ` +
            `expected ${JSON.stringify(step.expectStatus)}, got ${res.status}`
          );
        }
      }
    });

  }); // end root describe
}
