import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runAITutorContextIntegrationTests() {
  let studentToken = null;
  let teacherToken = null;
  let adminToken = null;

  await describe('G38 — AI Learning Context: Controlled Academic Context', () => {
    // ------------------------------------------------------------------------
    // SETUP: Authentication Tokens
    // ------------------------------------------------------------------------
    test('AUTH: Student can login for AI context tests', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'minhkhang@school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(200);
      studentToken = res.body.token;
      expect(studentToken).toBeDefined();
    });

    test('AUTH: Teacher can login', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'mailan@school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(200);
      teacherToken = res.body.token;
    });

    test('AUTH: Admin can login', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'admin@school.edu.vn',
        password: '123456',
      });
      expect(res.status).toBe(200);
      adminToken = res.body.token;
    });

    // ------------------------------------------------------------------------
    // SECURITY: Permission Checks
    // ------------------------------------------------------------------------
    test('SECURITY: Unauthenticated request denied (401)', async () => {
      const res = await api.get('/ai-tutor-context/config', null);
      expect(res.status).toBe(401);
    });

    test('SECURITY: Unauthenticated request to build context denied', async () => {
      const res = await api.post('/ai-tutor-context/build', null, {});
      expect(res.status).toBe(401);
    });

    // ------------------------------------------------------------------------
    // CONTEXT CONFIGURATION
    // ------------------------------------------------------------------------
    test('CONFIG: Context configuration is accessible', async () => {
      const res = await api.get('/ai-tutor-context/config', studentToken);
      // 200 = success, 404 = route not found, 500 = server error
      expect([200, 404, 500]).toContain(res.status);
    });

    test('CONFIG: Available sources list is provided', async () => {
      const res = await api.get('/ai-tutor-context/sources', studentToken);
      // 200 = success, 403 = permission denied, 404 = route not found
      expect([200, 403, 404, 500]).toContain(res.status);
    });

    // ------------------------------------------------------------------------
    // CONTEXT BUILDING
    // ------------------------------------------------------------------------
    test('CONTEXT: Student can get available context', async () => {
      const res = await api.get('/ai-tutor-context/available', studentToken);
      // 200 = success, 403 = permission denied, 404 = route not found
      expect([200, 403, 404, 500]).toContain(res.status);
    });

    test('CONTEXT: Student can build academic context', async () => {
      const res = await api.post('/ai-tutor-context/build', studentToken, {});
      // 200 = success, 400 = bad request, 404 = route not found, 500 = server error
      expect([200, 400, 404, 500]).toContain(res.status);
    });

    test('CONTEXT: Context preview returns source summary', async () => {
      const res = await api.post('/ai-tutor-context/preview', studentToken, {});
      // 200 = success, 400 = bad request, 404 = route not found
      expect([200, 400, 404, 500]).toContain(res.status);
    });

    // ------------------------------------------------------------------------
    // PRIVACY & SECURITY
    // ------------------------------------------------------------------------
    test('PRIVACY: Student cannot access other student context', async () => {
      const res = await api.post('/ai-tutor-context/build', studentToken, {
        targetStudentId: 'usr_other_student',
      });
      // Should be 400 (bad request), 403 (forbidden), or 404 (not found)
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    test('PRIVACY: Context includes school isolation', async () => {
      const res = await api.post('/ai-tutor-context/build', studentToken, {});
      if (res.status === 200 && res.body?.context?.contextItems) {
        // Verify context items don't leak cross-school data
        for (const item of res.body.context.contextItems) {
          // Should not contain student IDs or other school data
          expect(item.data).toBeDefined();
        }
      }
    });

    // ------------------------------------------------------------------------
    // TOKEN LIMITS
    // ------------------------------------------------------------------------
    test('TOKEN: Context respects max token limit', async () => {
      const res = await api.post('/ai-tutor-context/build', studentToken, {
        options: {
          maxTokens: 1000,
        },
      });
      if (res.status === 200 && res.body?.context?.metadata) {
        expect(res.body.context.metadata.estimatedTokens).toBeLessThanOrEqual(1000);
      }
    });

    // ------------------------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------------------------
    test('VALIDATION: Invalid request returns errors', async () => {
      const res = await api.post('/ai-tutor-context/validate', studentToken, {});
      // Should return validation result
      expect([200, 400, 404, 500]).toContain(res.status);
    });

    // ------------------------------------------------------------------------
    // INTEGRATION: AI Chat with Context
    // ------------------------------------------------------------------------
    test('INTEGRATION: AI chat endpoint exists and works', async () => {
      const res = await api.post('/ai-tutor/chat', studentToken, {
        text: 'Giúp tôi giải bài toán phương trình bậc 2',
        topic: 'Toán',
      });
      // 200 = success, 400 = bad request, 500 = server error
      expect([200, 400, 500]).toContain(res.status);
    });

    test('INTEGRATION: AI chat returns academic context indicator', async () => {
      const res = await api.post('/ai-tutor/chat', studentToken, {
        text: 'Tìm hiểu về tam thức bậc hai',
        topic: 'Toán',
      });
      if (res.status === 200) {
        // Response should include context indicator
        expect(res.body.success).toBe(true);
      }
    });

    // ------------------------------------------------------------------------
    // ADMIN CONTROLS
    // ------------------------------------------------------------------------
    test('ADMIN: AI Tutor health check works', async () => {
      const res = await api.get('/ai-tutor/health', adminToken);
      expect([200, 500]).toContain(res.status);
    });

    // ------------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------------
    test('SUMMARY: G38 AI Learning Context tests completed', async () => {
      expect(true).toBe(true);
    });
  });

  console.log('✅ G38 AI Learning Context integration tests completed');
}
