/**
 * Quick Debug Test - Login Flow
 */

import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../fixtures/testFixtures.js';

test('should login as Admin', async ({ page }) => {
  console.log('Starting login test...');
  
  await page.goto('/login');
  console.log('Navigated to /login');
  
  await page.waitForTimeout(2000);
  console.log('Waited 2s');
  
  // Check if login form exists
  const identifierInput = page.locator('#login-identifier');
  const passwordInput = page.locator('#login-password');
  
  console.log('Looking for login inputs...');
  
  const identifierVisible = await identifierInput.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Identifier input visible:', identifierVisible);
  
  if (identifierVisible) {
    await identifierInput.fill(TEST_CREDENTIALS.adminA.email);
    await passwordInput.fill(TEST_CREDENTIALS.adminA.password);
    
    console.log('Filled credentials, clicking submit...');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    console.log('Current URL after login:', page.url());
  }
  
  expect(identifierVisible).toBe(true);
});
