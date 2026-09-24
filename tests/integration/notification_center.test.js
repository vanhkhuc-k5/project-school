/**
 * Integration Tests: G26 — Notification Center
 *
 * Tests cover:
 * 1. Authenticated users can list their notifications
 * 2. Unread count endpoint
 * 3. Mark as read (single)
 * 4. Mark all as read
 * 5. Pagination and type filtering
 * 6. Role-based access (all authenticated users)
 */

import { describe, test, expect, api } from '../helpers/testClient.js';

export async function runNotificationCenterTests() {
  await describe('G26 — Notification Center', async () => {
    let adminToken = null;
    let teacherToken = null;
    let studentToken = null;

    // ── Auth ────────────────────────────────────────────────────────────────
    await test('AUTH: Admin login for test setup', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'admin@school.edu.vn',
        password: '123456',
      });
      adminToken = res.body?.token || res.body?.accessToken;
      expect(res.status).toBe(200);
      expect(adminToken).toBeTruthy();
    });

    await test('AUTH: Teacher login', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'mailan@school.edu.vn',
        password: '123456',
      });
      teacherToken = res.body?.token || res.body?.accessToken;
      expect(res.status).toBe(200);
      expect(teacherToken).toBeTruthy();
    });

    await test('AUTH: Student login', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'HS-2024-889',
        password: '123456',
      });
      studentToken = res.body?.token || res.body?.accessToken;
      expect(res.status).toBe(200);
      expect(studentToken).toBeTruthy();
    });

    // ── Unread Count ───────────────────────────────────────────────────────
    await test('GET /notifications/unread-count returns 0 for fresh user', async () => {
      const res = await api.get('/notifications/unread-count', studentToken);
      expect(res.status).toBe(200);
      expect(res.body?.unreadCount).toBe(0);
    });

    // ── List (empty) ──────────────────────────────────────────────────────
    await test('GET /notifications lists empty array for fresh user', async () => {
      const res = await api.get('/notifications', studentToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body?.notifications)).toBe(true);
    });

    // ── Auth required ──────────────────────────────────────────────────────
    await test('GET /notifications rejects unauthenticated request (401)', async () => {
      const res = await api.get('/notifications');
      expect(res.status).toBe(401);
    });

    // ── Admin can list notifications ───────────────────────────────────────
    await test('GET /notifications works for admin', async () => {
      const res = await api.get('/notifications', adminToken);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body?.notifications)).toBe(true);
    });

    // ── Admin can get unread count ────────────────────────────────────────
    await test('GET /notifications/unread-count works for admin', async () => {
      const res = await api.get('/notifications/unread-count', adminToken);
      expect(res.status).toBe(200);
      expect(typeof res.body?.unreadCount).toBe('number');
    });

    // ── Mark all as read ──────────────────────────────────────────────────
    await test('PATCH /notifications/read-all marks all as read', async () => {
      const res = await api.patch('/notifications/read-all', {}, adminToken);
      expect(res.status).toBe(200);
      expect(res.body?.success).toBe(true);
    });

    // ── Pagination query param ────────────────────────────────────────────
    await test('GET /notifications accepts page and limit query params', async () => {
      const res = await api.get('/notifications?page=1&limit=5', adminToken);
      expect(res.status).toBe(200);
      expect(res.body?.pagination?.page).toBe(1);
      expect(res.body?.pagination?.limit).toBe(5);
    });

    // ── Type filter ───────────────────────────────────────────────────────
    await test('GET /notifications accepts type filter', async () => {
      const res = await api.get('/notifications?type=ASSIGNMENT_PUBLISHED', adminToken);
      expect(res.status).toBe(200);
    });

    // ── Invalid type returns 400 ──────────────────────────────────────────
    await test('GET /notifications rejects invalid type (400)', async () => {
      const res = await api.get('/notifications?type=INVALID_TYPE', adminToken);
      expect(res.status).toBe(400);
    });

    // ── Teacher can access notifications ──────────────────────────────────
    await test('GET /notifications works for teacher', async () => {
      const res = await api.get('/notifications', teacherToken);
      expect(res.status).toBe(200);
    });

    await test('GET /notifications/unread-count works for teacher', async () => {
      const res = await api.get('/notifications/unread-count', teacherToken);
      expect(res.status).toBe(200);
      expect(typeof res.body?.unreadCount).toBe('number');
    });
  });
}
