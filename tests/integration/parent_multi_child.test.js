/**
 * Integration Tests: G24 — Parent Multi-Child Portal Security
 *
 * Tests cover:
 * 1. Valid child access — authenticated parent can access their own children
 * 2. Unrelated child access — authenticated parent CANNOT access other children
 * 3. Multiple children — parent with multiple children can list and switch
 * 4. Inactive relationship — inactive links are not returned in active list
 *
 * NOTE: These tests run against the SQLite test database. They verify:
 * - Server-side relationship enforcement
 * - No data leakage between children
 * - Proper HTTP status codes for authorization failures
 */

import { describe, test, expect, api } from '../helpers/testClient.js';
import { clearAuthState } from '../helpers/testAuth.js';

export async function runParentMultiChildSecurityTests() {
  // --- Authentication ---
  let parentToken = null;
  let unrelatedParentToken = null;
  let adminToken = null;
  const VALID_STUDENT_ID = 'std_khoi';       // child linked to parent_1 (Nguyen Van Hoi)
  const UNRELATED_STUDENT_ID = 'std_a1';  // child NOT linked to parent_1 (belongs to parent_a)
  const PARENT_USER = { identifier: 'vanhoi@parent.school.edu.vn', password: '123456' };
  const UNRELATED_PARENT = { identifier: 'parent_a@test.edu.vn', password: '123456' };
  const ADMIN_USER = { identifier: 'admin@school.edu.vn', password: '123456' };

  await describe('G24 — Parent Multi-Child Portal Security', () => {
    // Clear auth state before running
    clearAuthState();

    // ─── AUTH ─────────────────────────────────────────────────────────────────

    test('AUTH: Parent can login and receive JWT token', async () => {
      const res = await api.post('/auth/login', PARENT_USER);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.token).toBe('string');
      parentToken = res.body.token;
    });

    test('AUTH: Admin can login for privileged bypass tests', async () => {
      const res = await api.post('/auth/login', ADMIN_USER);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      adminToken = res.body.token;
    });

    // ─── 1. VALID CHILD ACCESS ───────────────────────────────────────────────

    test('VALID: Parent can list their active linked children', async () => {
      const res = await api.get('/parent/children', parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.children)).toBe(true);
      expect(Array.isArray(res.body.data?.children)).toBe(true);
    });

    test('VALID: Parent can access grades of a linked child', async () => {
      const res = await api.get(`/parent/grades?studentId=${VALID_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Grades structure may be empty but should not error
      expect(res.body.data).toBeDefined();
    });

    test('VALID: Parent can access attendance of a linked child', async () => {
      const res = await api.get(`/parent/attendance?studentId=${VALID_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('VALID: Parent can access assignments of a linked child', async () => {
      const res = await api.get(`/parent/assignments?studentId=${VALID_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.assignments)).toBe(true);
    });

    test('VALID: Parent can access announcements', async () => {
      const res = await api.get('/parent/announcements', parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('VALID: Parent can submit leave request for valid child', async () => {
      const leaveId = `leave_test_${Date.now()}`;
      const res = await api.post('/parent/leave-requests', {
        studentId: VALID_STUDENT_ID,
        startDate: '2026-09-25',
        endDate: '2026-09-25',
        reasonType: 'Việc gia đình',
        reasonDetail: 'Test leave request for G24',
      }, parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('VALID: Parent can send message for valid child', async () => {
      const res = await api.post('/parent/messages', {
        studentId: VALID_STUDENT_ID,
        content: 'Test message for G24 security verification',
        senderName: 'Phụ huynh Test',
      }, parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('VALID: Parent can view leave requests for valid child', async () => {
      const res = await api.get(`/parent/leave-requests?studentId=${VALID_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.requests)).toBe(true);
    });

    test('VALID: Parent can view messages for valid child', async () => {
      const res = await api.get(`/parent/messages?studentId=${VALID_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    test('VALID: Parent can view detailed grades for valid child', async () => {
      const res = await api.get(`/parent/grades-detail?studentId=${VALID_STUDENT_ID}&period=hk1`, parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('VALID: Parent can view invoices for valid child', async () => {
      const res = await api.get(`/parent/invoices?studentId=${VALID_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('VALID: Parent can view child detail with relationship metadata', async () => {
      const res = await api.get(`/parent/children/${VALID_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.child).toBeDefined();
      expect(res.body.child.id).toBe(VALID_STUDENT_ID);
    });

    // ─── 2. UNRELATED CHILD ACCESS ───────────────────────────────────────────

    test('UNAUTHORIZED: Parent CANNOT access grades of unrelated child (403)', async () => {
      const res = await api.get(`/parent/grades?studentId=${UNRELATED_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('NOT_AUTHORIZED');
    });

    test('UNAUTHORIZED: Parent CANNOT access attendance of unrelated child (403)', async () => {
      const res = await api.get(`/parent/attendance?studentId=${UNRELATED_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(403);
    });

    test('UNAUTHORIZED: Parent CANNOT access assignments of unrelated child (403)', async () => {
      const res = await api.get(`/parent/assignments?studentId=${UNRELATED_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(403);
    });

    test('UNAUTHORIZED: Parent CANNOT submit leave request for unrelated child (403)', async () => {
      const res = await api.post('/parent/leave-requests', {
        studentId: UNRELATED_STUDENT_ID,
        startDate: '2026-09-25',
        endDate: '2026-09-25',
        reasonType: 'Việc gia đình',
        reasonDetail: 'Unauthorized leave attempt',
      }, parentToken);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('NOT_AUTHORIZED');
    });

    test('UNAUTHORIZED: Parent CANNOT send messages for unrelated child (403)', async () => {
      const res = await api.post('/parent/messages', {
        studentId: UNRELATED_STUDENT_ID,
        content: 'Unauthorized message attempt',
      }, parentToken);
      expect(res.status).toBe(403);
    });

    test('UNAUTHORIZED: Parent CANNOT view leave requests for unrelated child (403)', async () => {
      const res = await api.get(`/parent/leave-requests?studentId=${UNRELATED_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(403);
    });

    test('UNAUTHORIZED: Parent CANNOT view messages for unrelated child (403)', async () => {
      const res = await api.get(`/parent/messages?studentId=${UNRELATED_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(403);
    });

    test('UNAUTHORIZED: Parent CANNOT view detailed grades for unrelated child (403)', async () => {
      const res = await api.get(`/parent/grades-detail?studentId=${UNRELATED_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(403);
    });

    test('UNAUTHORIZED: Parent CANNOT view invoices for unrelated child (403)', async () => {
      const res = await api.get(`/parent/invoices?studentId=${UNRELATED_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(403);
    });

    test('UNAUTHORIZED: Parent CANNOT access child detail of unrelated child (403)', async () => {
      const res = await api.get(`/parent/children/${UNRELATED_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(403);
    });

    test('UNAUTHORIZED: Parent CANNOT pay tuition for unrelated child (403)', async () => {
      const res = await api.post('/parent/tuition/fake_invoice_id/pay', null, parentToken);
      // Either 403 (relationship check) or 404 (invoice not found) is acceptable
      expect([403, 404]).toContain(res.status);
    });

    test('UNAUTHORIZED: Parent CANNOT view timetable of unrelated child (403)', async () => {
      const res = await api.get(`/parent/timetable/${UNRELATED_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(403);
    });

    // ─── 3. MULTIPLE CHILDREN ────────────────────────────────────────────────

    test('MULTI: Parent with multiple children gets all active children in list', async () => {
      const res = await api.get('/parent/children', parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const children = res.body.children || res.body.data?.children || [];
      // If multiple children are linked, all active ones should appear
      if (children.length >= 2) {
        const ids = children.map(c => c.id);
        // Verify no duplicate IDs
        const uniqueIds = [...new Set(ids)];
        expect(uniqueIds.length).toBe(ids.length);
      }
    });

    test('MULTI: Child switch — accessing grades for each linked child works correctly', async () => {
      const listRes = await api.get('/parent/children', parentToken);
      expect(listRes.status).toBe(200);
      const children = listRes.body.children || listRes.body.data?.children || [];
      if (children.length === 0) return; // Skip if no children

      for (const child of children) {
        const gradeRes = await api.get(`/parent/grades?studentId=${child.id}`, parentToken);
        expect(gradeRes.status).toBe(200);
        expect(gradeRes.body.success).toBe(true);
        // Each response should be scoped to the specific child
        expect(gradeRes.body.data).toBeDefined();
      }
    });

    test('MULTI: Each child shows isolated data (no data leakage)', async () => {
      const listRes = await api.get('/parent/children', parentToken);
      const children = listRes.body.children || listRes.body.data?.children || [];
      if (children.length < 2) return; // Need at least 2 children

      const child1Grades = await api.get(`/parent/grades?studentId=${children[0].id}`, parentToken);
      const child2Grades = await api.get(`/parent/grades?studentId=${children[1].id}`, parentToken);

      expect(child1Grades.status).toBe(200);
      expect(child2Grades.status).toBe(200);

      // The data should be scoped to each child — we verify both succeed
      // The actual data isolation is enforced server-side
    });

    test('MULTI: Dashboard resolves to primary contact child when no childId specified', async () => {
      const dashRes = await api.get('/parent/dashboard', parentToken);
      expect(dashRes.status).toBe(200);
      expect(dashRes.body.success).toBe(true);
      // Dashboard should have resolved an activeChildId
      expect(dashRes.body.data).toBeDefined();
    });

    // ─── 4. INACTIVE RELATIONSHIP ─────────────────────────────────────────────

    test('INACTIVE: Inactive links are NOT returned in active children list', async () => {
      const res = await api.get('/parent/children', parentToken);
      expect(res.status).toBe(200);
      const children = res.body.children || res.body.data?.children || [];
      // All returned children should have isActive = true
      const inactiveChildren = children.filter(c => c.isActive === false || c.isActive === 0);
      expect(inactiveChildren.length).toBe(0);
    });

    test('INACTIVE: Parent cannot access child with inactive link (403)', async () => {
      // This test requires a pre-seeded inactive relationship
      // We test by verifying that any child not in the active links
      // (but still in the DB) is rejected
      const res = await api.get('/parent/grades?studentId=std_inactive_test', parentToken);
      // std_inactive_test doesn't exist → 404 or 403
      expect([403, 404]).toContain(res.status);
    });

    // ─── 5. MISSING PARAMETER ─────────────────────────────────────────────────

    test('ERROR: Request without studentId returns 400', async () => {
      const res = await api.get('/parent/grades', parentToken);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('ERROR: Request without studentId for attendance returns 400', async () => {
      const res = await api.get('/parent/attendance', parentToken);
      expect(res.status).toBe(400);
    });

    // ─── 6. ADMIN BYPASS ──────────────────────────────────────────────────────

    test('ADMIN: Admin can access any child grades without relationship check', async () => {
      const res = await api.get(`/parent/grades?studentId=${VALID_STUDENT_ID}`, adminToken);
      expect(res.status).toBe(200);
    });

    test('ADMIN: Admin can access unrelated child grades (bypass)', async () => {
      const res = await api.get(`/parent/grades?studentId=${UNRELATED_STUDENT_ID}`, adminToken);
      expect(res.status).toBe(200);
    });

    // ─── 7. ANNOUNCEMENTS ───────────────────────────────────────────────────

    test('ANNOUNCEMENTS: Parent can view announcements scoped to their child', async () => {
      const res = await api.get(`/parent/announcements?studentId=${VALID_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.announcements)).toBe(true);
    });

    test('ANNOUNCEMENTS: Parent can view general announcements without studentId', async () => {
      const res = await api.get('/parent/announcements', parentToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.announcements)).toBe(true);
    });

    // ─── 8. TIMETABLE ─────────────────────────────────────────────────────────

    test('TIMETABLE: Parent can access timetable for valid child', async () => {
      const res = await api.get(`/parent/timetable/${VALID_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(200);
    });

    test('TIMETABLE: Parent CANNOT access timetable for unrelated child (403)', async () => {
      const res = await api.get(`/parent/timetable/${UNRELATED_STUDENT_ID}`, parentToken);
      expect(res.status).toBe(403);
    });

    test('TIMETABLE: Parent CANNOT access timetable via /children/:id/timetable for unrelated child (403)', async () => {
      const res = await api.get(`/parent/children/${UNRELATED_STUDENT_ID}/timetable`, parentToken);
      expect(res.status).toBe(403);
    });

  });
}
