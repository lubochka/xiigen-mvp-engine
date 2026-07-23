/**
 * platform-agent-teaching-pipeline.spec.ts — FLOW-46 Phase E §5
 *
 * Chat → action round-trip e2e for the Super Agent surface.
 *
 * Pattern: page.route() mocks POST /api/agent/run so this file is self-contained
 * and runs against `client && npm run dev` only — no server, ES, or queue needed.
 *
 * Approve / dismiss tests from TEACH-QA-R0 §5 are deferred until pendingActions
 * confirmationEvent / rollbackEvent UI buttons land on ChatPage. Today the page
 * renders the verdict pill + action list; the apply/dismiss controls ship in a
 * follow-up that wires the existing CLIENT-ARCHITECTURE-SPEC consent flow.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
const CHAT_URL = `${BASE_URL}/chat`;
const API_PATTERN = '**/api/agent/run';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'platform-agent', name);

const MOCK_SESSION = {
  isSuccess: true,
  data: {
    sessionId: 'e2e-session-1',
    userIntent: 'clean up my user-registration flow',
    af9Verdict: 'PASS',
    superJudgeVerdict: 'DEFER_TO_AF9',
    actions: [
      {
        actionId: 'e2e-action-1',
        sessionId: 'e2e-session-1',
        actionType: 'ADVISE',
        adminTenantId: 'master',
        targetTenantId: 'master',
        tenantId: 'master',
        knowledgeScope: 'PRIVATE',
        status: 'EMITTED',
      },
    ],
    contributions: [],
    completedAt: '2026-04-17T00:00:00Z',
  },
};

test.describe('FLOW-46 platform-agent — chat → action surface', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(API_PATTERN, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_SESSION),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('CHAT-01: /chat page renders heading + textarea + submit button', async ({ page }) => {
    try {
      await page.goto(CHAT_URL, { timeout: 10_000 });
    } catch {
      test.skip(true, 'Dev server not running');
    }
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('page-chat')).toBeVisible();
    await expect(page.getByTestId('chat-input')).toBeVisible();
    await expect(page.getByTestId('chat-submit')).toBeVisible();
  });

  test('CHAT-02: submit shows super-judge verdict pill + action card on success', async ({
    page,
  }) => {
    try {
      await page.goto(CHAT_URL, { timeout: 10_000 });
    } catch {
      test.skip(true, 'Dev server not running');
    }
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: SNAP('chat-02-submit-shows-super-judge-verdict-before.png'),
      fullPage: true,
    });
    await page.getByTestId('chat-input').fill('clean up my user-registration flow');
    await page.getByTestId('chat-submit').click();

    await expect(page.getByTestId('super-judge-verdict')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('super-judge-verdict')).toContainText('DEFER_TO_AF9');
    await expect(page.getByTestId('action-list')).toBeVisible();
    await expect(page.getByTestId('action-card-e2e-action-1')).toBeVisible();
  
    await page.screenshot({
      path: SNAP('chat-02-submit-shows-super-judge-verdict-after.png'),
      fullPage: true,
    });
  });
});
