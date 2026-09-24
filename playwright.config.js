import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for EduPortal
 * G45 - Browser-level tests for highest-value workflows
 */
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false, // Run tests sequentially to avoid race conditions
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // NOTE: Playwright manages both backend and frontend servers automatically.
  // Backend health check uses /api/health (not /) since Express only serves /api/*
  webServer: [
    {
      command: 'npm run server',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173/',
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
});
