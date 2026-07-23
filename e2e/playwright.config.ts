/**
 * playwright.config.ts — XIIGen Engine E2E test configuration.
 *
 * Three run modes:
 *   Mode 1 (local): `cd e2e && npx playwright test`
 *                   Uses webServer to start client dev server automatically.
 *                   Server must be running: cd server && npm start
 *   Mode 2 (Docker): DOCKER_E2E=true — uses Docker service names
 *   Mode 3 (CI):    Same as Docker + CI reporter
 *
 * Lesson from WordPress Playwright: Docker containers must use service names
 * not localhost. E2E_BASE_URL is set by docker-compose to http://client-e2e:80.
 */

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env['E2E_BASE_URL'] || 'http://localhost:5173';
const SERVER_URL = process.env['E2E_SERVER_URL'] || 'http://localhost:3000';
const IN_DOCKER = process.env['DOCKER_E2E'] === 'true';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,  // sequential — shared server state prevents parallel browser tests

  reporter: process.env['CI']
    ? [['junit', { outputFile: 'test-results/results.xml' }], ['list']]
    : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: {
      'X-E2E-Test': 'true',
    },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  globalSetup: './global-setup.ts',

  // In local mode (not Docker): start the client dev server automatically
  webServer: IN_DOCKER ? undefined : {
    command: 'cd ../client && npm run dev',
    url: 'http://localhost:5173',
    timeout: 60_000,
    reuseExistingServer: true,
  },
});

export { BASE_URL, SERVER_URL };
