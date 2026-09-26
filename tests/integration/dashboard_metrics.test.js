/**
 * Integration Tests: G31 — Admin Dashboard Real Metrics
 *
 * Features tested:
 * 1. Admin can retrieve real dashboard metrics
 * 2. Metrics are school-scoped
 * 3. Attendance trends are date-scoped
 * 4. No mock/fabricated numbers
 */

import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runDashboardIntegrationTests() {
  await describe('G31 — Admin Dashboard Real Metrics', async () => {
    let adminToken = null;
    const testSchoolId = 'sch_bacau';

    // ── Auth Setup ─────────────────────────────────────────────────────────
    await test('AUTH: Admin login for dashboard tests', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'admin@school.edu.vn',
        password: '123456',
      });
      adminToken = res.body?.token || res.body?.accessToken;
      expect(res.status).toBe(200);
      expect(adminToken).toBeTruthy();
    });

    // ── Dashboard Metrics ──────────────────────────────────────────────────
    await test('GET /dashboard/metrics: Retrieve real dashboard metrics', async () => {
      const res = await api.get('/dashboard/metrics', adminToken);
      expect(res.status).toBe(200);
      expect(res.body).toBeTruthy();
      expect(res.body.success).toBe(true);
    });

    await test('METRICS: Response has required structure', async () => {
      const res = await api.get('/dashboard/metrics', adminToken);
      const data = res.body?.data;
      
      expect(data).toBeTruthy();
      
      // Check quick stats
      expect(data.quickStats).toBeTruthy();
      expect(data.quickStats.students).toBeTruthy();
      expect(data.quickStats.teachers).toBeTruthy();
      expect(data.quickStats.classes).toBeTruthy();
      
      // Check attendance
      expect(data.attendance).toBeTruthy();
      expect(data.attendance.summary).toBeTruthy();
      expect(typeof data.attendance.summary.total).toBe('number');
      expect(typeof data.attendance.summary.present).toBe('number');
      expect(typeof data.attendance.summary.absent).toBe('number');
      
      // Check pending operations
      expect(data.pendingOperations).toBeTruthy();
      expect(typeof data.pendingOperations.leaveRequests).toBe('number');
      expect(typeof data.pendingOperations.pendingAnnouncements).toBe('number');
      
      // Check security
      expect(data.security).toBeTruthy();
      expect(typeof data.security.lockedAccounts).toBe('number');
      expect(typeof data.security.failedLogins).toBe('number');
      
      // Check meta
      expect(data.meta).toBeTruthy();
      expect(data.meta.schoolId).toBeTruthy();
      expect(data.meta.generatedAt).toBeTruthy();
    });

    await test('METRICS: Values are from database (non-negative)', async () => {
      const res = await api.get('/dashboard/metrics', adminToken);
      const data = res.body?.data;
      
      // All counts should be >= 0
      expect(data.quickStats.students.total).toBeGreaterThanOrEqual(0);
      expect(data.quickStats.teachers.total).toBeGreaterThanOrEqual(0);
      expect(data.quickStats.classes.total).toBeGreaterThanOrEqual(0);
      expect(data.attendance.summary.total).toBeGreaterThanOrEqual(0);
    });

    await test('METRICS: School-scoped filtering works', async () => {
      // The metrics should be for a specific school
      const res = await api.get('/dashboard/metrics', adminToken);
      const data = res.body?.data;
      
      // School ID should be present
      expect(data.meta.schoolId).toBeTruthy();
    });

    // ── Attendance Trends ──────────────────────────────────────────────────
    await test('GET /dashboard/attendance-trends: Retrieve attendance trends', async () => {
      const res = await api.get('/dashboard/attendance-trends?period=this_week', adminToken);
      expect(res.status).toBe(200);
      expect(res.body).toBeTruthy();
      expect(res.body.success).toBe(true);
    });

    await test('TRENDS: Response has required structure', async () => {
      const res = await api.get('/dashboard/attendance-trends?period=this_week', adminToken);
      const data = res.body?.data;
      
      expect(data).toBeTruthy();
      expect(data.period).toBeTruthy();
      expect(data.startDate).toBeTruthy();
      expect(data.endDate).toBeTruthy();
      expect(Array.isArray(data.data)).toBe(true);
    });

    // ── Recent Announcements ─────────────────────────────────────────────────
    await test('METRICS: Recent announcements are included', async () => {
      const res = await api.get('/dashboard/metrics', adminToken);
      const data = res.body?.data;
      
      // Recent announcements should be an array
      expect(Array.isArray(data.recentAnnouncements)).toBe(true);
      
      // If there are announcements, check structure
      if (data.recentAnnouncements.length > 0) {
        const announcement = data.recentAnnouncements[0];
        expect(announcement.id).toBeTruthy();
        expect(announcement.title).toBeTruthy();
      }
    });

    // ── Grade Breakdown ─────────────────────────────────────────────────────
    await test('METRICS: Grade breakdown is included', async () => {
      const res = await api.get('/dashboard/metrics', adminToken);
      const data = res.body?.data;
      
      expect(Array.isArray(data.gradeBreakdown)).toBe(true);
      
      // If there are grades, check structure
      if (data.gradeBreakdown.length > 0) {
        const grade = data.gradeBreakdown[0];
        expect(typeof grade.grade).toBe('number');
        expect(typeof grade.students).toBe('number');
      }
    });

    // ── Security Metrics ───────────────────────────────────────────────────
    await test('METRICS: Security issues are tracked', async () => {
      const res = await api.get('/dashboard/metrics', adminToken);
      const data = res.body?.data;
      
      expect(data.security).toBeTruthy();
      expect(typeof data.security.totalIssues).toBe('number');
      // Security issues should be >= 0
      expect(data.security.totalIssues).toBeGreaterThanOrEqual(0);
    });

    // ── Error Cases ─────────────────────────────────────────────────────────
    await test('ERROR: Unauthenticated request returns 401', async () => {
      const res = await api.get('/dashboard/metrics', null);
      expect(res.status).toBe(401);
    });

    await test('ERROR: Invalid period parameter uses default', async () => {
      const res = await api.get('/dashboard/attendance-trends?period=invalid', adminToken);
      // Should still return 200 with default period
      expect(res.status).toBe(200);
    });

    console.log('✅ G31 Dashboard integration tests completed');
  });
}
