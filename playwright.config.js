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
  timeout: 45000,
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

  // Playwright manages both backend and frontend servers automatically.
  // 
  // Backend: Uses dedicated E2E test server (tests/browser/e2e-server.js)
  //   - Isolated :memory: SQLite database
  //   - Uses test fixtures (NOT production seed)
  //   - Health check: /api/health
  //
  // Frontend: Vite preview server (uses built files for faster startup)
  //   - Port: 5173
  //   - Health check: / (HTTP 200)
  webServer: [
    {
      command: 'node tests/browser/e2e-server.js',
      url: 'http://localhost:5000/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run preview',
      url: 'http://localhost:5173/',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
