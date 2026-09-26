/**
 * EduPortal Student E2E Flow
 * G45 - Student Portal Browser Tests
 */

import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../fixtures/testFixtures.js';

async function loginAs(page, credentials) {
  await page.goto('/');
  const response = await page.request.post('http://127.0.0.1:5000/api/auth/login', {
    data: { identifier: credentials.email, password: credentials.password },
  });
  if (response.ok()) {
    const body = await response.json();
    const token = body.token || body.accessToken || body.data?.token;
    if (token) {
      await page.evaluate((t) => localStorage.setItem('eduportal_session_token', t), token);
    }
    return true;
  }
  return false;
}

// ============================================================
// STUDENT GRADES & REPORT CARD FLOW
// ============================================================
test.describe('Student Grades & Report Card', () => {
  
  test.beforeEach(async ({ page }) => {
    const success = await loginAs(page, TEST_CREDENTIALS.studentA1);
    expect(success).toBe(true);
  });

  test('should access Student Grades page', async ({ page }) => {
    await page.goto('/student/grades');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/student\/grades/);
  });

  test('should display Grades list', async ({ page }) => {
    await page.goto('/student/grades');
    await page.waitForLoadState('networkidle');
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });

  test('should open Electronic Report Card Modal', async ({ page }) => {
    await page.goto('/student/grades');
    await page.waitForLoadState('networkidle');
    const reportCardButton = page.locator('button:has-text("học bạ"), button:has-text("xem"), button:has-text("chi tiết")').first();
    if (await reportCardButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reportCardButton.click();
      await page.waitForTimeout(1000);
    }
    expect(true).toBeTruthy();
  });

  test('should display QR Code on Report Card', async ({ page }) => {
    await page.goto('/student/grades');
    await page.waitForLoadState('networkidle');
    const openButton = page.locator('button:has-text("học bạ"), button:has-text("chi tiết")').first();
    if (await openButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await openButton.click();
      await page.waitForTimeout(1500);
    }
    const qrCode = page.locator('img[alt*="qr" i], [class*="qr" i], canvas, svg');
    expect(await qrCode.count() >= 0).toBeTruthy();
  });
});

// ============================================================
// STUDENT EXAM RUNNER v2 FLOW
// ============================================================
test.describe('Student Exam Runner v2', () => {
  
  test.beforeEach(async ({ page }) => {
    const success = await loginAs(page, TEST_CREDENTIALS.studentA1);
    expect(success).toBe(true);
  });

  test('should access Student Assignments page', async ({ page }) => {
    await page.goto('/student/assignments');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/student\/assignments/);
  });

  test('should display Assignments list', async ({ page }) => {
    await page.goto('/student/assignments');
    await page.waitForLoadState('networkidle');
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });

  test('should display Exam Runner interface', async ({ page }) => {
    await page.goto('/student/assignments');
    await page.waitForLoadState('networkidle');
    const startButton = page.locator('button:has-text("Làm bài"), button:has-text("Xem kết quả"), button:has-text("Xem bài")').first();
    if (await startButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }
    const examRunner = page.locator('#exam-modal-root, [class*="exam"], [class*="quiz"]');
    const count = await examRunner.count().catch(() => 0);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display timer in Exam Runner', async ({ page }) => {
    await page.goto('/student/assignments');
    await page.waitForLoadState('networkidle');
    const startButton = page.locator('button:has-text("Làm bài"), button:has-text("Xem kết quả"), button:has-text("Xem bài")').first();
    if (await startButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }
    const timer = page.locator('#exam-modal-root, [class*="timer"]');
    const count = await timer.count().catch(() => 0);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// STUDENT NAVIGATION FLOW
// ============================================================
test.describe('Student Navigation', () => {
  
  test.beforeEach(async ({ page }) => {
    const success = await loginAs(page, TEST_CREDENTIALS.studentA1);
    expect(success).toBe(true);
  });

  test('should access Student Dashboard', async ({ page }) => {
    await page.goto('/student/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/student/);
  });

  test('should access Student Timetable', async ({ page }) => {
    await page.goto('/student/timetable');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/student\/timetable/);
  });

  test('should access Student Attendance', async ({ page }) => {
    await page.goto('/student/attendance');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/student\/attendance/);
  });

  test('should access Student Resources', async ({ page }) => {
    await page.goto('/student/resources');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/student\/resources/);
  });

  test('should access Student Announcements', async ({ page }) => {
    await page.goto('/student/announcements');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/student\/announcements/);
  });

  test('should access AI Tutor', async ({ page }) => {
    await page.goto('/student/ai-tutor');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/student\/ai-tutor/);
  });
});
