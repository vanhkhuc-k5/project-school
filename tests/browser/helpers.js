/**
 * Browser Test Helpers
 * G45 - Shared utilities for browser E2E tests
 */

import { test as base, expect } from '@playwright/test';

/**
 * Custom test fixture with auth helpers
 */
export const test = base.extend({
  authenticatedPage: async ({ page, credentials }, use) => {
    if (credentials) {
      await loginViaAPI(page, credentials);
    }
    await use(page);
  },
});

/**
 * Login via API and set auth state in localStorage
 */
export async function loginViaAPI(page, { email, password }) {
  const response = await page.request.post('http://127.0.0.1:5000/api/auth/login', {
    data: { identifier: email, password },
  });
  
  if (response.ok()) {
    const body = await response.json();
    if (body.token) {
      await page.evaluate((token) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify({
          id: body.user?.id,
          email: body.user?.email,
          role: body.user?.role,
          name: body.user?.name,
        }));
      }, body.token);
      return { success: true, user: body.user };
    }
  }
  
  const errorText = await response.text();
  throw new Error(`Login failed: ${errorText}`);
}

/**
 * Logout and clear auth state
 */
export async function logout(page) {
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page) {
  return await page.evaluate(() => {
    return localStorage.getItem('auth_token') !== null;
  });
}

/**
 * Navigate to page and wait for load
 */
export async function navigateAndWait(page, path, timeout = 10000) {
  await page.goto(path, { waitUntil: 'networkidle', timeout });
}

/**
 * Wait for page to have expected content
 */
export async function waitForContent(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Fill form with accessible selectors
 */
export async function fillFormField(page, label, value) {
  // Try multiple selector patterns
  const selectors = [
    `label:text-is("${label}") + input`,
    `label:text("${label}") ~ input`,
    `[aria-label="${label}"]`,
    `[aria-labelledby="${label}"]`,
    `input[name="${label.toLowerCase()}"]`,
    `input[placeholder*="${label}" i]`,
  ];
  
  for (const selector of selectors) {
    const input = page.locator(selector).first();
    if (await input.isVisible({ timeout: 100 }).catch(() => false)) {
      await input.fill(value);
      return;
    }
  }
  
  throw new Error(`Could not find input for label: ${label}`);
}

/**
 * Click button with accessible selectors
 */
export async function clickButton(page, text, options = {}) {
  const selectors = [
    `button:text-is("${text}")`,
    `button:text("${text}")`,
    `button:has-text("${text}")`,
    `[role="button"]:text-is("${text}")`,
    `[role="button"]:has-text("${text}")`,
  ];
  
  for (const selector of selectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 100 }).catch(() => false)) {
      await button.click(options);
      return;
    }
  }
  
  throw new Error(`Could not find button with text: ${text}`);
}

/**
 * Submit form and wait for response
 */
export async function submitForm(page, buttonText = 'Submit') {
  await clickButton(page, buttonText);
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for dialog/modal to appear
 */
export async function waitForDialog(page, timeout = 5000) {
  await page.waitForSelector('dialog, [role="dialog"], .modal, .Dialog', { state: 'visible', timeout });
}

/**
 * Close dialog/modal
 */
export async function closeDialog(page) {
  const closeButtons = page.locator('button:has-text("close"), button:has-text("đóng"), [aria-label="close"]');
  if (await closeButtons.first().isVisible({ timeout: 500 }).catch(() => false)) {
    await closeButtons.first().click();
  } else {
    await page.keyboard.press('Escape');
  }
}

/**
 * Take screenshot with descriptive name
 */
export async function screenshot(page, name) {
  await page.screenshot({ path: `screenshots/${name}-${Date.now()}.png`, fullPage: true });
}

/**
 * Get text content accessible to screen readers
 */
export async function getAccessibleText(page, selector) {
  return await page.locator(selector).textContent();
}

/**
 * Check for visible errors
 */
export async function hasError(page) {
  const errorSelectors = [
    '[role="alert"]',
    '.error',
    '.Error',
    '[aria-live="assertive"]',
    'text=/error|lỗi/i',
  ];
  
  for (const selector of errorSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    if (count > 0) {
      const text = await elements.first().textContent();
      if (text && text.trim()) {
        return text.trim();
      }
    }
  }
  
  return null;
}

/**
 * Wait for redirect to expected URL
 */
export async function waitForRedirect(page, expectedUrlPattern, timeout = 10000) {
  await page.waitForURL(expectedUrlPattern, { timeout });
}

/**
 * Check if on expected page
 */
export async function isOnPage(page, urlPattern) {
  const url = page.url();
  const regex = typeof urlPattern === 'string' ? new RegExp(urlPattern) : urlPattern;
  return regex.test(url);
}

/**
 * Reload and verify authentication persists
 */
export async function reloadAndVerifyAuth(page) {
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  return token !== null;
}

/**
 * Extract data from page for debugging
 */
export async function extractPageState(page) {
  return await page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
    localStorage: {
      hasToken: localStorage.getItem('auth_token') !== null,
      user: localStorage.getItem('user'),
    },
    errors: Array.from(document.querySelectorAll('[role="alert"], .error')).map(el => el.textContent),
  }));
}

/**
 * Retry action until it succeeds or times out
 */
export async function retryUntil(asyncFn, options = {}) {
  const { maxAttempts = 3, delay = 1000 } = options;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await page.waitForTimeout(delay);
    }
  }
}
