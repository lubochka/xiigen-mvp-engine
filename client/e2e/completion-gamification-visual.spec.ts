/**
 * FLOW-05 visual evidence for the configured cascade point.
 *
 * Output:
 * docs/e2e-snapshots/completion-gamification/{FLOW05_EVIDENCE_SEGMENT}
 */

import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const evidenceSegment = process.env['FLOW05_EVIDENCE_SEGMENT'] ?? 'tenant-a-source';
const expectedPointsTotal = process.env['FLOW05_EXPECT_POINTS_TOTAL'] ?? null;
const expectedBasePoints = process.env['FLOW05_EXPECT_BASE_POINTS'] ?? null;
const expectedBonusPoints = process.env['FLOW05_EXPECT_BONUS_POINTS'] ?? null;
const expectedStreakGraceHours = process.env['FLOW05_EXPECT_STREAK_GRACE_HOURS'] ?? null;
const expectedMlCooldownDays = process.env['FLOW05_EXPECT_ML_COOLDOWN_DAYS'] ?? null;

const EVIDENCE_DIR = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'e2e-snapshots',
  'completion-gamification',
  evidenceSegment,
);

const ROLES = [
  'tenant-user',
  'referral-user',
  'freelancer',
  'event-organiser',
  'tenant-admin',
] as const;

type FlowRole = (typeof ROLES)[number];

interface Cell {
  id: 'C2' | 'C4' | 'C6';
  lang: 'en' | 'he';
  viewport: { width: number; height: number };
  desc: string;
}

const CELLS: Cell[] = [
  {
    id: 'C2',
    lang: 'en',
    viewport: { width: 1280, height: 800 },
    desc: 'en-populated-desktop',
  },
  {
    id: 'C4',
    lang: 'he',
    viewport: { width: 1280, height: 800 },
    desc: 'he-rtl-populated-desktop',
  },
  {
    id: 'C6',
    lang: 'en',
    viewport: { width: 375, height: 812 },
    desc: 'en-populated-mobile',
  },
];

const LEARNER_ROLES: readonly FlowRole[] = [
  'tenant-user',
  'referral-user',
  'event-organiser',
];

function routeFor(role: FlowRole, lang: Cell['lang']): string {
  const base = role === 'tenant-admin'
    ? '/lessons/complete'
    : '/lessons/complete?mock=submitted';

  const separator = base.includes('?') ? '&' : '?';
  const params = [`role=${role}`, `lang=${lang}`];
  if (expectedPointsTotal) params.push(`pointsTotal=${expectedPointsTotal}`);
  if (expectedBasePoints) params.push(`basePoints=${expectedBasePoints}`);
  if (expectedBonusPoints) params.push(`bonusPoints=${expectedBonusPoints}`);
  if (expectedStreakGraceHours) params.push(`graceHours=${expectedStreakGraceHours}`);
  if (expectedMlCooldownDays) params.push(`cooldownDays=${expectedMlCooldownDays}`);
  return `${base}${separator}${params.join('&')}`;
}

async function seedLocale(page: Page, lang: Cell['lang']): Promise<void> {
  await page.addInitScript((selectedLang) => {
    try {
      window.localStorage.setItem('xiigen.locale', selectedLang);
    } catch {
      /* localStorage may be unavailable */
    }

    if (selectedLang === 'he') {
      const setDir = () => {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'he');
      };
      if (document.readyState !== 'loading') {
        setDir();
      } else {
        document.addEventListener('DOMContentLoaded', setDir);
      }
    }
  }, lang);
}

async function expectRoleSurface(page: Page, role: FlowRole): Promise<void> {
  await expect(page.getByTestId('page-lesson-completion')).toHaveAttribute(
    'data-viewer-role',
    role,
  );

  if (role === 'tenant-admin') {
    await expect(page.getByTestId('lesson-admin-table')).toBeVisible();
    if (expectedPointsTotal) {
      await expect(page.getByTestId('lesson-admin-points-earned')).toContainText(
        `+${expectedPointsTotal}`,
      );
    }
    if (expectedStreakGraceHours) {
      await expect(page.getByTestId('lesson-admin-streak-grace-window')).toContainText(
        `${expectedStreakGraceHours}-hour`,
      );
    }
    if (expectedMlCooldownDays) {
      await expect(page.getByTestId('lesson-admin-ml-cooldown-window')).toContainText(
        `${expectedMlCooldownDays}-day`,
      );
    }
    await expect(page.getByTestId('completion-form')).toHaveCount(0);
    return;
  }

  if (role === 'freelancer' || LEARNER_ROLES.includes(role)) {
    await expect(page.getByTestId('gamification-feedback')).toBeVisible();
    await expect(page.getByTestId('points-earned')).toBeVisible();
    if (expectedPointsTotal) {
      await expect(page.getByTestId('points-earned')).toContainText(`+${expectedPointsTotal}`);
    }
    if (expectedBasePoints) {
      await expect(page.getByTestId('points-breakdown')).toContainText(
        `Base points: ${expectedBasePoints}`,
      );
    }
    if (expectedBonusPoints) {
      await expect(page.getByTestId('points-breakdown')).toContainText(
        `Bonus (score >= 80%): +${expectedBonusPoints}`,
      );
    }
    if (expectedStreakGraceHours) {
      await expect(page.getByTestId('streak-grace-window')).toContainText(
        `${expectedStreakGraceHours} hours after midnight`,
      );
    }
    if (expectedMlCooldownDays) {
      await expect(page.getByTestId('ml-cooldown-window')).toContainText(
        `${expectedMlCooldownDays} days`,
      );
    }
    await expect(page.getByTestId('current-level')).toBeVisible();
    await expect(page.getByTestId('streak-count')).toBeVisible();
    await expect(page.getByTestId('next-lesson-cta')).toBeVisible();
    await expect(page.getByTestId('completion-form')).toHaveCount(0);
  }

  if (role === 'freelancer') {
    await expect(page.getByTestId('lesson-freelancer-portfolio')).toBeVisible();
  }
}

async function expectNoTenantConsumerInternalCopy(page: Page, role: FlowRole): Promise<void> {
  if (role !== 'tenant-user' && role !== 'referral-user') return;

  const bodyText = await page.locator('body').innerText();
  const forbidden = [
    /\bBFA\b/,
    /\bDNA-[1-9]\b/,
    /\bAF[- ]station\b/i,
    /\barbiter\b/i,
    /FREEDOM config/,
    /MACHINE code/,
    /DataProcessResult/,
    /ENGINE_INTERNAL/,
    /\bT[0-9]{3}\b/,
    /\bCF-[0-9]{3}\b/,
  ];

  for (const pattern of forbidden) {
    expect(bodyText).not.toMatch(pattern);
  }
}

test.describe(`FLOW-05 ${evidenceSegment} visual evidence`, () => {
  test.beforeAll(() => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  });

  for (const role of ROLES) {
    for (const cell of CELLS) {
      test(`${role} ${cell.id} ${cell.desc}`, async ({ page }) => {
        await page.setViewportSize(cell.viewport);
        await seedLocale(page, cell.lang);
        await page.goto(routeFor(role, cell.lang));
        await page.waitForLoadState('networkidle').catch(() => undefined);

        if (cell.lang === 'he') {
          await expect
            .poll(
              async () => page.evaluate(() => document.documentElement.getAttribute('dir')),
              { timeout: 8_000 },
            )
            .toBe('rtl');
        }

        await expectRoleSurface(page, role);
        await expectNoTenantConsumerInternalCopy(page, role);

        const outPath = path.join(EVIDENCE_DIR, `${role}-${cell.id}-${cell.desc}.png`);
        await page.screenshot({ path: outPath, fullPage: true });
      });
    }
  }
});
