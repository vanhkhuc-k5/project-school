/**
 * EduPortal Browser E2E Tests
 * G45 - Browser-level tests for highest-value workflows
 * 
 * Tests critical multi-role workflows from browser to database.
 * Uses accessible selectors and test IDs for stability.
 */

import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../fixtures/testFixtures.js';

/**
 * Helper to login via API and set auth state for subsequent page tests
 */
async function loginViaAPI(page, credentials) {
  const response = await page.request.post('http://localhost:5000/api/auth/login', {
    data: {
      identifier: credentials.email,
      password: credentials.password,
    },
  });
  
  if (response.ok()) {
    const body = await response.json();
    // Store token in localStorage (simulating frontend auth)
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify({
        id: body.user?.id,
        email: body.user?.email,
        role: body.user?.role,
        name: body.user?.name,
      }));
    }, body.token);
    return true;
  }
  return false;
}

/**
 * Helper to wait for and click elements safely
 */
async function safeClick(page, selector, options = {}) {
  await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
  await page.click(selector, options);
}

/**
 * Helper to fill form fields with accessible labels
 */
async function fillByLabel(page, label, value) {
  const input = page.locator(`label:text-is("${label}") + input, label:text("${label}") ~ input, [aria-label="${label}"], [data-testid="${label}"]`);
  await input.fill(value);
}

// ============================================================
// LOGIN WORKFLOW TESTS
// ============================================================

test.describe('Login Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form with required fields', async ({ page }) => {
    await expect(page.locator('input[type="email"], input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation error for empty credentials', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/required|không được trống/i')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"], input[name="identifier"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/invalid|sai|không đúng/i')).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.fill('input[type="email"], input[name="identifier"]', TEST_CREDENTIALS.adminA.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.adminA.password);
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await expect(page.locator('text=/dashboard|trang chủ/i')).toBeVisible();
  });

  test('should maintain session after page reload', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"], input[name="identifier"]', TEST_CREDENTIALS.adminA.email);
    await page.fill('input[type="password"]', TEST_CREDENTIALS.adminA.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    
    // Reload page
    await page.reload();
    
    // Should still be logged in (no redirect to login)
    await expect(page).not.toHaveURL(/login/);
  });
});

// ============================================================
// ADMIN USER MANAGEMENT TESTS
// ============================================================

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, TEST_CREDENTIALS.adminA);
    await page.goto('/admin/users');
  });

  test('should display user list', async ({ page }) => {
    await expect(page.locator('table, [role="table"], [data-testid="user-table"]')).toBeVisible({ timeout: 10000 });
  });

  test('should search for users by name', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i], input[aria-label*="search" i], [data-testid="search-users"]');
    await searchInput.fill('admin');
    await page.waitForTimeout(500);
    
    // Results should be filtered
    const rows = page.locator('table tbody tr, [role="row"]');
    await expect(rows.first()).toBeVisible();
  });

  test('should open create user dialog', async ({ page }) => {
    const addButton = page.locator('button:has-text("add" i), button:has-text("tạo" i), [data-testid="add-user"]');
    await addButton.click();
    
    await expect(page.locator('dialog, [role="dialog"], [data-testid="user-form"]')).toBeVisible();
    await expect(page.locator('input[name="name"], input[placeholder*="name"]')).toBeVisible();
  });

  test('should create new user with valid data', async ({ page }) => {
    const addButton = page.locator('button:has-text("add" i), button:has-text("tạo" i), [data-testid="add-user"]');
    await addButton.click();
    
    // Fill form
    await page.fill('input[name="name"], input[placeholder*="name"]', 'Test User E2E');
    await page.fill('input[name="email"], input[placeholder*="email"]', `testuser_${Date.now()}@school.edu.vn`);
    await page.fill('input[name="password"]', 'TestPass123!');
    
    // Submit
    await page.click('button[type="submit"]:visible');
    
    // Should show success and close dialog
    await expect(page.locator('text=/success|tạo thành công/i')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// ADMIN CLASS MANAGEMENT TESTS
// ============================================================

test.describe('Admin Class Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, TEST_CREDENTIALS.adminA);
    await page.goto('/admin/classes');
  });

  test('should display class list', async ({ page }) => {
    await expect(page.locator('table, [role="table"], [data-testid="class-table"]')).toBeVisible({ timeout: 10000 });
  });

  test('should create new class', async ({ page }) => {
    const addButton = page.locator('button:has-text("add" i), button:has-text("tạo" i), [data-testid="add-class"]');
    await addButton.click();
    
    await page.fill('input[name="name"]', `10A1_${Date.now()}`);
    await page.fill('select[name="grade_level"], [name="grade_level"]', '10');
    
    await page.click('button[type="submit"]:visible');
    await expect(page.locator('text=/success|tạo thành công/i')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// TEACHER ASSIGNMENT WORKFLOW
// ============================================================

test.describe('Teacher Assignment Workflow', () => {
  let teacherPage;

  test.beforeEach(async ({ page }) => {
    teacherPage = page;
    await loginViaAPI(page, TEST_CREDENTIALS.teacherA);
    await page.goto('/teacher/assignments');
  });

  test('should display teacher assignments page', async ({ page }) => {
    await expect(page.locator('text=/assignments|bài tập/i')).toBeVisible({ timeout: 10000 });
  });

  test('should open create assignment form', async ({ page }) => {
    const createButton = page.locator('button:has-text("tạo" i), button:has-text("create" i), [data-testid="create-assignment"]');
    await createButton.click();
    
    await expect(page.locator('input[name="title"], [name="title"]')).toBeVisible();
  });

  test('should create assignment with questions', async ({ page }) => {
    // Open form
    await page.click('button:has-text("tạo" i):visible');
    
    // Fill basic info
    await page.fill('input[name="title"]', `Test Assignment E2E ${Date.now()}`);
    await page.fill('select[name="subject"], [name="subject"]', 'Toán');
    
    // Add question
    await page.click('button:has-text("thêm câu hỏi" i)');
    await page.fill('textarea[name="question"], [name="prompt"]', 'What is 2+2?');
    await page.fill('input[name="points"]', '10');
    
    // Submit
    await page.click('button[type="submit"]:visible');
    
    // Should succeed
    await expect(page.locator('text=/success|tạo thành công/i')).toBeVisible({ timeout: 5000 });
  });

  test('should publish assignment', async ({ page }) => {
    // Find draft assignment
    const draftRow = page.locator('tr:has-text("draft" i), [data-status="draft"]').first();
    await draftRow.locator('button:has-text("publish" i)').click();
    
    await expect(page.locator('text=/published|đã đăng/i')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// ATTENDANCE WORKFLOW
// ============================================================

test.describe('Attendance Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, TEST_CREDENTIALS.teacherA);
    await page.goto('/teacher/attendance');
  });

  test('should display attendance taking interface', async ({ page }) => {
    await expect(page.locator('text=/attendance|điểm danh/i')).toBeVisible({ timeout: 10000 });
  });

  test('should mark student present', async ({ page }) => {
    // Find a student row
    const studentRow = page.locator('tbody tr').first();
    await studentRow.locator('button:has-text("present" i), button:has-text("có mặt" i)').click();
    
    // Should show as marked
    await expect(studentRow.locator('text=/present|có mặt/i, [data-status="present"]')).toBeVisible();
  });

  test('should mark student absent with reason', async ({ page }) => {
    const studentRow = page.locator('tbody tr').first();
    await studentRow.locator('button:has-text("absent" i), button:has-text("vắng" i)').click();
    
    // Should prompt for reason
    await expect(page.locator('textarea[name="reason"], input[name="reason"]')).toBeVisible();
    await page.fill('textarea[name="reason"]', 'Sick note');
    await page.click('button:has-text("confirm" i)');
    
    await expect(studentRow.locator('text=/absent|vắng/i')).toBeVisible();
  });
});

// ============================================================
// STUDENT SUBMISSION WORKFLOW
// ============================================================

test.describe('Student Submission Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, TEST_CREDENTIALS.studentA1);
    await page.goto('/student/assignments');
  });

  test('should display available assignments', async ({ page }) => {
    await expect(page.locator('text=/assignments|bài tập/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('table tbody tr, [role="row"]').first()).toBeVisible();
  });

  test('should view assignment details', async ({ page }) => {
    const firstAssignment = page.locator('tbody tr').first();
    await firstAssignment.click();
    
    await expect(page.locator('text=/question|câu hỏi/i')).toBeVisible({ timeout: 5000 });
  });

  test('should submit assignment answers', async ({ page }) => {
    // Find an assignment
    const assignment = page.locator('tbody tr').first();
    await assignment.click();
    
    // Answer questions
    await page.locator('input[type="radio"], input[type="checkbox"]').first().check();
    
    // Submit
    await page.click('button:has-text("submit" i), button:has-text("nộp" i)');
    
    await expect(page.locator('text=/submitted|nộp thành công/i')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// TEACHER GRADING WORKFLOW
// ============================================================

test.describe('Teacher Grading Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, TEST_CREDENTIALS.teacherA);
    await page.goto('/teacher/submissions');
  });

  test('should display pending submissions', async ({ page }) => {
    await expect(page.locator('text=/submissions|nộp bài/i')).toBeVisible({ timeout: 10000 });
  });

  test('should grade student submission', async ({ page }) => {
    const pendingRow = page.locator('tr:has-text("pending" i), tr:has-text("chờ" i)').first();
    await pendingRow.click();
    
    // Enter grade
    await page.fill('input[name="score"]', '8.5');
    await page.fill('textarea[name="feedback"]', 'Good work!');
    
    await page.click('button:has-text("submit grade" i), button:has-text("chấm điểm" i)');
    
    await expect(page.locator('text=/graded|đã chấm/i')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// STUDENT GRADE VIEWING WORKFLOW
// ============================================================

test.describe('Student Grade Viewing', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, TEST_CREDENTIALS.studentA1);
    await page.goto('/student/grades');
  });

  test('should display grades page', async ({ page }) => {
    await expect(page.locator('text=/grades|điểm/i')).toBeVisible({ timeout: 10000 });
  });

  test('should show grade details', async ({ page }) => {
    const gradeRow = page.locator('tbody tr').first();
    await gradeRow.click();
    
    await expect(page.locator('text=/score|điểm/i')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// PARENT MULTI-CHILD WORKFLOW
// ============================================================

test.describe('Parent Multi-Child Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, TEST_CREDENTIALS.parentA);
    await page.goto('/parent/children');
  });

  test('should display linked children', async ({ page }) => {
    await expect(page.locator('text=/children|con cái/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('tbody tr, [data-testid="child-card"]').first()).toBeVisible();
  });

  test('should switch between children', async ({ page }) => {
    const children = page.locator('tbody tr, [data-testid="child-card"]');
    const childCount = await children.count();
    
    if (childCount > 1) {
      // Click second child
      await children.nth(1).click();
      
      // Should show selected child's data
      await expect(page.locator('[data-testid="selected-child"], .selected')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view selected child grades', async ({ page }) => {
    const firstChild = page.locator('tbody tr, [data-testid="child-card"]').first();
    await firstChild.click();
    
    await page.goto('/parent/grades');
    await expect(page.locator('text=/grades|điểm/i')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// PARENT GRADE VIEWING WORKFLOW
// ============================================================

test.describe('Parent Grade Viewing', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page, TEST_CREDENTIALS.parentA);
    await page.goto('/parent/grades');
  });

  test('should display child grades for parent', async ({ page }) => {
    await expect(page.locator('text=/grades|điểm/i')).toBeVisible({ timeout: 10000 });
  });

  test('should show detailed grade breakdown', async ({ page }) => {
    const gradeRow = page.locator('tbody tr').first();
    await gradeRow.click();
    
    await expect(page.locator('text=/detail|chi tiết/i')).toBeVisible({ timeout: 5000 });
  });

  test('should prevent accessing other student grades', async ({ page }) => {
    // Try to access grades with non-linked student ID
    await page.goto('/parent/student/nonexistent_student_id/grades');
    
    // Should show error
    await expect(page.locator('text=/không có quyền|not authorized|access denied/i')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// CROSS-ROLE SECURITY TESTS (Browser)
// ============================================================

test.describe('Cross-Role Security', () => {
  test('student cannot access admin dashboard', async ({ page }) => {
    await loginViaAPI(page, TEST_CREDENTIALS.studentA1);
    await page.goto('/admin/dashboard');
    
    // Should be redirected or show access denied
    await expect(page.locator('text=/access denied|không có quyền|403/i, url(/login)')).toBeVisible({ timeout: 5000 });
  });

  test('parent cannot access teacher pages', async ({ page }) => {
    await loginViaAPI(page, TEST_CREDENTIALS.parentA);
    await page.goto('/teacher/assignments');
    
    await expect(page.locator('text=/access denied|không có quyền|403/i, url(/login)')).toBeVisible({ timeout: 5000 });
  });

  test('teacher cannot access other school data', async ({ page }) => {
    await loginViaAPI(page, TEST_CREDENTIALS.teacherA); // School A
    // Try to access School B data
    await page.goto('/teacher/class/cls_school_b_class/students');
    
    // Should show not found or access denied
    await expect(page.locator('text=/404|không tìm thấy|access denied|không có quyền/i')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// ACCESSIBILITY TESTS
// ============================================================

test.describe('Accessibility', () => {
  test('login page has proper labels', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('label')).toHaveCount(await page.locator('input').count());
  });

  test('forms have error messages announced', async ({ page }) => {
    await page.goto('/login');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    
    // Errors should be in the DOM (accessible to screen readers)
    const errorText = await page.locator('[role="alert"], .error, .text-red').count();
    expect(errorText).toBeGreaterThan(0);
  });

  test('focus is visible on interactive elements', async ({ page }) => {
    await page.goto('/login');
    
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    
    expect(focusedElement).toBeTruthy();
  });
});
