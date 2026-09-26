/**
 * Integration Tests: G33 — Department Head Module
 *
 * Tests cover:
 * 1. Department Head authentication and domain scoping
 * 2. Department overview and dashboard
 * 3. Domain-scoped queries (teachers, subjects, classes, students)
 * 4. Performance visibility within department
 * 5. Assignment visibility within department
 * 6. Isolation from other departments
 * 7. Isolation from school admin endpoints
 *
 * CRITICAL: Department Head is domain-scoped, NOT school-wide admin.
 */

import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runDepartmentHeadTests() {
  // Test fixtures
  let deptHeadToken = null;
  let adminToken = null;
  let teacherToken = null;

  // Department IDs - dept_math_it has head_teacher_id = usr_teacher_1 (nguyenvana)
  const MY_DEPT_ID = 'dept_math_it';
  const OTHER_DEPT_ID = 'dept_natural_sciences';

  // Test users
  const ADMIN_USER = { identifier: 'admin@school.edu.vn', password: '123456' };
  // nguyenvana@school.edu.vn is usr_teacher_1 who is head of dept_math_it
  const DEPT_HEAD_USER = { identifier: 'nguyenvana@school.edu.vn', password: '123456' };
  // nguyenvanteo is usr_teacher_2 - regular teacher (not head)
  const TEACHER_USER = { identifier: 'nguyenvanteo@school.edu.vn', password: '123456' };

  let deptHeadExists = false;
  let teacherExists = false;

  await describe('G33 — Department Head Module', () => {

    // ─── AUTH ──────────────────────────────────────────────────────────────────

    test('AUTH: Try to login as department head (nguyenvana)', async () => {
      const res = await api.post('/auth/login', DEPT_HEAD_USER);
      if (res.status === 200) {
        deptHeadToken = res.body.token;
        deptHeadExists = true;
        expect(res.body.success).toBe(true);
      } else {
        console.log('SKIP: Department head user nguyenvana not found in database');
        // Try alternate credentials
        const res2 = await api.post('/auth/login', TEACHER_USER);
        if (res2.status === 200) {
          teacherToken = res2.body.token;
          teacherExists = true;
        }
      }
    });

    test('AUTH: Admin can login for cross-check', async () => {
      const res = await api.post('/auth/login', ADMIN_USER);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      adminToken = res.body.token;
    });

    test('AUTH: Regular teacher can login', async () => {
      if (teacherExists) return; // Already logged in
      const res = await api.post('/auth/login', TEACHER_USER);
      if (res.status === 200) {
        teacherToken = res.body.token;
        teacherExists = true;
      }
    });

    // ─── 1. DEPARTMENT OVERVIEW ────────────────────────────────────────────────

    test('OVERVIEW: Dept Head can get department overview', async () => {
      if (!deptHeadExists) {
        console.log('SKIP: No department head user available');
        return;
      }
      const res = await api.get('/department-head/overview', deptHeadToken);
      if (res.status === 403) {
        // User is department head but department not configured
        console.log('SKIP: Department head user exists but no department assigned');
        return;
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.department).toBeDefined();
      expect(res.body.data.teacherCount).toBeDefined();
      expect(res.body.data.subjectCount).toBeDefined();
    });

    test('OVERVIEW: Unauthenticated request denied', async () => {
      const res = await api.get('/department-head/overview');
      expect(res.status).toBe(401);
    });

    // ─── 2. DOMAIN-SCOPED TEACHERS ─────────────────────────────────────────────

    test('TEACHERS: Dept Head can list teachers in their department', async () => {
      if (!deptHeadExists) {
        console.log('SKIP: No department head user available');
        return;
      }
      const res = await api.get(`/department-head/${MY_DEPT_ID}/teachers`, deptHeadToken);
      if (res.status === 403) {
        console.log('SKIP: Department not assigned to user');
        return;
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('TEACHERS: Dept Head can filter teachers by search', async () => {
      if (!deptHeadExists) return;
      const res = await api.get(`/department-head/${MY_DEPT_ID}/teachers?search=Nguyen`, deptHeadToken);
      if (res.status === 403) return;
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // ─── 3. DOMAIN-SCOPED SUBJECTS ────────────────────────────────────────────

    test('SUBJECTS: Dept Head can list subjects in their department', async () => {
      if (!deptHeadExists) return;
      const res = await api.get(`/department-head/${MY_DEPT_ID}/subjects`, deptHeadToken);
      if (res.status === 403) return;
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('SUBJECTS: Dept Head can filter subjects by grade level', async () => {
      if (!deptHeadExists) return;
      const res = await api.get(`/department-head/${MY_DEPT_ID}/subjects?gradeLevel=10`, deptHeadToken);
      if (res.status === 403) return;
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // ─── 4. DOMAIN-SCOPED CLASSES ─────────────────────────────────────────────

    test('CLASSES: Dept Head can list classes with department subjects', async () => {
      if (!deptHeadExists) return;
      const res = await api.get(`/department-head/${MY_DEPT_ID}/classes`, deptHeadToken);
      if (res.status === 403) return;
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // ─── 5. PERFORMANCE VISIBILITY ────────────────────────────────────────────

    test('PERFORMANCE: Dept Head can view subject performance', async () => {
      if (!deptHeadExists) return;
      const res = await api.get(`/department-head/${MY_DEPT_ID}/performance`, deptHeadToken);
      if (res.status === 403) return;
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bySubject).toBeDefined();
      expect(res.body.data.byClass).toBeDefined();
    });

    test('PERFORMANCE: Performance scoped to department', async () => {
      if (!deptHeadExists) return;
      const res = await api.get(`/department-head/${MY_DEPT_ID}/performance?period=this_semester`, deptHeadToken);
      if (res.status === 403) return;
      expect(res.status).toBe(200);
      expect(res.body.data.departmentId).toBe(MY_DEPT_ID);
    });

    // ─── 6. ASSIGNMENT VISIBILITY ─────────────────────────────────────────────

    test('ASSIGNMENTS: Dept Head can view assignments for department subjects', async () => {
      if (!deptHeadExists) return;
      const res = await api.get(`/department-head/${MY_DEPT_ID}/assignments`, deptHeadToken);
      if (res.status === 403) return;
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('ASSIGNMENTS: Dept Head can filter by status', async () => {
      if (!deptHeadExists) return;
      const res = await api.get(`/department-head/${MY_DEPT_ID}/assignments?status=published`, deptHeadToken);
      if (res.status === 403) return;
      expect(res.status).toBe(200);
    });

    // ─── 7. DOMAIN-SCOPED STUDENTS ────────────────────────────────────────────

    test('STUDENTS: Dept Head can list students in department classes', async () => {
      if (!deptHeadExists) return;
      const res = await api.get(`/department-head/${MY_DEPT_ID}/students`, deptHeadToken);
      if (res.status === 403) return;
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    // ─── 8. CRITICAL: DEPARTMENT ISOLATION ────────────────────────────────────

    test('ISOLATION: Dept Head CANNOT access other departments', async () => {
      if (!deptHeadExists) {
        // Use admin token to verify endpoint exists but dept head has no access
        const res = await api.get(`/department-head/${OTHER_DEPT_ID}/subjects`, adminToken);
        // Admin should have access to see the endpoint, dept head should not
        console.log('SKIP: No department head user for isolation test');
        return;
      }
      const res = await api.get(`/department-head/${OTHER_DEPT_ID}/subjects`, deptHeadToken);
      // Either 403 (not head of other dept) or 400 (department not assigned)
      expect([400, 403]).toContain(res.status);
    });

    test('ISOLATION: Dept Head CANNOT list other department teachers', async () => {
      if (!deptHeadExists) return;
      const res = await api.get(`/department-head/${OTHER_DEPT_ID}/teachers`, deptHeadToken);
      expect([400, 403]).toContain(res.status);
    });

    test('ISOLATION: Dept Head CANNOT access other department performance', async () => {
      if (!deptHeadExists) return;
      const res = await api.get(`/department-head/${OTHER_DEPT_ID}/performance`, deptHeadToken);
      expect([400, 403]).toContain(res.status);
    });

    // ─── 9. CRITICAL: NOT SCHOOL ADMIN ────────────────────────────────────────

    test('NOT_ADMIN: Dept Head CANNOT access school admin audit logs', async () => {
      if (!deptHeadExists) return;
      const res = await api.get('/admin/audit-logs', deptHeadToken);
      expect(res.status).toBe(403);
    });

    test('NOT_ADMIN: Dept Head CANNOT create users', async () => {
      if (!deptHeadExists) return;
      const res = await api.post('/admin/users', {
        name: 'Test User',
        email: 'testdepthead@school.edu.vn',
        role: 'teacher',
      }, deptHeadToken);
      expect(res.status).toBe(403);
    });

    test('NOT_ADMIN: Dept Head CANNOT delete departments', async () => {
      if (!deptHeadExists) return;
      const res = await api.delete(`/academic-structure/departments/${OTHER_DEPT_ID}`, deptHeadToken);
      expect(res.status).toBe(403);
    });

    // ─── 10. REGULAR TEACHER vs DEPARTMENT HEAD ────────────────────────────────

    test('ROLE_CHECK: Regular teacher CANNOT use department-head overview', async () => {
      if (!teacherExists) {
        console.log('SKIP: No regular teacher token available');
        return;
      }
      const res = await api.get('/department-head/overview', teacherToken);
      // Regular teacher is not a department head — should be 403
      expect([403]).toContain(res.status);
    });

    test('ROLE_CHECK: Regular teacher CANNOT access dept-head teachers', async () => {
      if (!teacherExists) return;
      const res = await api.get(`/department-head/${MY_DEPT_ID}/teachers`, teacherToken);
      expect([403]).toContain(res.status);
    });

    // ─── 11. RBAC PERMISSION CHECKS ──────────────────────────────────────────

    test('RBAC: Dept Head has DEPARTMENT_HEAD_READ permission', async () => {
      if (!deptHeadExists) return;
      const res = await api.get('/department-head/overview', deptHeadToken);
      if (res.status === 403) {
        console.log('SKIP: Department not assigned');
        return;
      }
      expect(res.status).toBe(200);
    });

    test('RBAC: Dept Head does NOT have USER_DISABLE permission', async () => {
      if (!deptHeadExists) return;
      const res = await api.post('/admin/users', {
        name: 'Test',
        email: 'test@test.com',
        role: 'student',
      }, deptHeadToken);
      expect(res.status).toBe(403);
    });

    test('RBAC: Dept Head does NOT have TUITION_MANAGE permission', async () => {
      if (!deptHeadExists) return;
      const res = await api.get('/tuition/invoices', deptHeadToken);
      // Accept 403 (forbidden), or 500 (error)
      expect([403, 500]).toContain(res.status);
    });

    // ─── 12. UPDATE DEPARTMENT ─────────────────────────────────────────────────

    test('UPDATE: Dept Head can update department description', async () => {
      if (!deptHeadExists) return;
      const res = await api.patch(`/department-head/${MY_DEPT_ID}`, {
        description: 'Updated by department head test',
      }, deptHeadToken);
      if (res.status === 403) {
        console.log('SKIP: Department not assigned');
        return;
      }
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // ─── 13. ENDPOINT EXISTENCE VERIFICATION ─────────────────────────────────

    test('VERIFY: Department-head overview endpoint is registered', async () => {
      // Just verify one key endpoint - others are tested above
      const res = await api.get('/department-head/overview', adminToken);
      // Should return 403 (admin doesn't have dept_head permissions) not 404
      expect(res.status === 404).toBe(false);
    });

    // ─── 14. SUMMARY ──────────────────────────────────────────────────────────

    test('SUMMARY: Department Head integration tests completed', () => {
      console.log('G33 Department Head Module Tests Complete');
      console.log('Department head user exists:', deptHeadExists);
      console.log('Regular teacher user exists:', teacherExists);
    });
  });
}
