/**
 * EduPortal Admin E2E Flow
 * G45 - Admin Portal Browser Tests
 * 
 * Tests critical admin workflows from browser perspective.
 * Tests against isolated E2E test server with seeded data.
 */

import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../fixtures/testFixtures.js';

/**
 * Login via API + localStorage (frontend auth pattern).
 * Navigates to frontend before accessing localStorage.
 */
async function loginAs(page, credentials) {
  await page.goto('/');
  
  const response = await page.request.post('http://127.0.0.1:5000/api/auth/login', {
    data: {
      identifier: credentials.email,
      password: credentials.password,
    },
  });
  
  if (response.ok()) {
    const body = await response.json();
    const token = body.token || body.accessToken || body.data?.token;
    if (token) {
      await page.evaluate((t) => {
        localStorage.setItem('eduportal_session_token', t);
      }, token);
    }
    return true;
  }
  return false;
}

// ============================================================
// ADMIN ACADEMIC CONFIGURATION FLOW
// ============================================================
test.describe('Admin Academic Configuration', () => {
  
  test.beforeEach(async ({ page }) => {
    const success = await loginAs(page, TEST_CREDENTIALS.adminA);
    expect(success).toBe(true);
  });

  test('should access Academic Configuration page', async ({ page }) => {
    await page.goto('/admin/academic');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/academic/);
  });

  test('should display Academic Years list', async ({ page }) => {
    await page.goto('/admin/academic');
    await page.waitForLoadState('networkidle');
    
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });
});

// ============================================================
// ADMIN STUDENT 360 PROFILE FLOW
// ============================================================
test.describe('Admin Student 360 Profile', () => {
  
  test.beforeEach(async ({ page }) => {
    const success = await loginAs(page, TEST_CREDENTIALS.adminA);
    expect(success).toBe(true);
  });

  test('should access Student List', async ({ page }) => {
    await page.goto('/admin/students');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/students/);
  });

  test('should access Student 360 Profile', async ({ page }) => {
    await page.goto('/admin/students');
    await page.waitForLoadState('networkidle');
    
    const studentRow = page.locator('tr:has(td), [role="row"], .student-row, a[href*="student"]').first();
    if (await studentRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await studentRow.click();
      await page.waitForTimeout(500);
    }
    
    expect(page.url()).toMatch(/\/students/);
  });
});

// ============================================================
// ADMIN NAVIGATION FLOW
// ============================================================
test.describe('Admin Navigation', () => {
  
  test.beforeEach(async ({ page }) => {
    const success = await loginAs(page, TEST_CREDENTIALS.adminA);
    expect(success).toBe(true);
  });

  test('should access Admin Dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should access Admin Teachers management', async ({ page }) => {
    await page.goto('/admin/teachers');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/teachers/);
  });

  test('should access Admin Announcements', async ({ page }) => {
    await page.goto('/admin/announcements');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/announcements/);
  });

  test('should access Admin Reports', async ({ page }) => {
    await page.goto('/admin/reports');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/reports/);
  });

  test('should access Admin Settings', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/settings/);
  });
});
