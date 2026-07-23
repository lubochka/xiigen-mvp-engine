import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for XIIGen client E2E tests.
 *
 * Tests live in client/e2e/
 * Screenshots land in docs/phase-reports/PHASE-A1/snapshots/
 *
 * webServer: starts Vite dev server automatically before tests run.
 * Requires the NestJS server to be running separately at localhost:3000.
 *
 * Worktree isolation (added RUN-47a):
 *   When multiple git worktrees share this repo, Vite may already be
 *   bound to :5173 by a sibling worktree and serving stale code.
 *   Set VITE_PORT in the environment to run this worktree's Vite on
 *   a dedicated port (e.g. VITE_PORT=5174 for pensive-tereshkova).
 */
const VITE_PORT = process.env['VITE_PORT'] ?? '5173';
const BASE_URL = `http://localhost:${VITE_PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,

  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'on',
    trace: 'retain-on-failure',
  },

  // RUN-146 responsive axis: every visual-audit spec captures at 3 viewports so
  // mobile/tablet/desktop breaks are visible per the plan (UX-P5 Layout &
  // Responsive). Reference sizes:
  //   mobile  412\u00d7915  (Pixel 7, also matches iPhone 14 Pro width)
  //   tablet  820\u00d71180 (iPad Air)
  //   desktop 1440\u00d7900  (standard laptop viewport)
  //
  // A named --project filters to a single viewport; the default runs all three.
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 820, height: 1180 },
        isMobile: false,
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],

  // Auto-start Vite before tests, shut it down after
  webServer: {
    command: `npm run dev -- --port ${VITE_PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },

  outputDir: 'playwright-results',
});
