import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOT_VARIANT =
  process.env['XIIGEN_EVENT_MANAGEMENT_SNAPSHOT_VARIANT'] ?? 'tenant-a-source';
const TENANT_A_ADAPTATION_VARIANTS = new Set([
  'tenant-a-v1.0.1',
  'tenant-b-installed-from-a',
  'tenant-b-v1.0.2',
  'tenant-c-installed-from-b',
  'tenant-c-v1.0.0',
]);
const IS_TENANT_A_ADAPTED = TENANT_A_ADAPTATION_VARIANTS.has(SNAPSHOT_VARIANT);
const TENANT_B_ADAPTATION_VARIANTS = new Set([
  'tenant-b-v1.0.2',
  'tenant-c-installed-from-b',
  'tenant-c-v1.0.0',
]);
const IS_TENANT_B_ADAPTED = TENANT_B_ADAPTATION_VARIANTS.has(SNAPSHOT_VARIANT);
const TENANT_C_INSTALL_VARIANTS = new Set(['tenant-c-installed-from-b', 'tenant-c-v1.0.0']);
const IS_TENANT_C_INSTALLED = TENANT_C_INSTALL_VARIANTS.has(SNAPSHOT_VARIANT);
const TENANT_C_ADAPTATION_VARIANTS = new Set(['tenant-c-v1.0.0']);
const IS_TENANT_C_ADAPTED = TENANT_C_ADAPTATION_VARIANTS.has(SNAPSHOT_VARIANT);

const ADAPTATION_CONTEXT_BY_VARIANT: Record<
  string,
  {
    tenant: string;
    adaptation: string;
    moduleName: string;
    waitlistMaxSize?: string;
    analyticsWindowDays?: string;
  }
> = {
  'tenant-a-v1.0.1': {
    tenant: 'acme-corp',
    adaptation: 'tenant-a-v1.0.1',
    moduleName: 'event-management-acme-curated-events',
  },
  'tenant-b-installed-from-a': {
    tenant: 'northwind',
    adaptation: 'tenant-b-installed-from-a',
    moduleName: 'event-management-acme-curated-events',
  },
  'tenant-b-v1.0.2': {
    tenant: 'northwind',
    adaptation: 'tenant-b-v1.0.2',
    moduleName: 'event-management-northwind-sponsor-forums',
    waitlistMaxSize: '12',
  },
  'tenant-c-installed-from-b': {
    tenant: 'tessera-collective',
    adaptation: 'tenant-c-installed-from-b',
    moduleName: 'event-management-northwind-sponsor-forums',
    waitlistMaxSize: '12',
  },
  'tenant-c-v1.0.0': {
    tenant: 'tessera-collective',
    adaptation: 'tenant-c-v1.0.0',
    moduleName: 'event-management-tessera-residency-circles',
    waitlistMaxSize: '12',
    analyticsWindowDays: '45',
  },
};

const SNAPSHOT_DIR = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'e2e-snapshots',
  'event-management',
  SNAPSHOT_VARIANT,
);

const ROLES = [
  {
    id: 'anonymous',
    expected: ['event-create-public-view', 'event-public-signin', 'event-public-listing'],
  },
  {
    id: 'public-marketplace-visitor',
    expected: ['event-create-public-view', 'event-public-signin', 'event-public-listing'],
  },
  {
    id: 'tenant-user',
    expected: ['event-create-user-view', 'event-user-banner', 'event-user-listing'],
  },
  {
    id: 'referral-user',
    expected: ['event-create-referral-view', 'event-referral-banner', 'event-referral-listing'],
  },
  {
    id: 'freelancer',
    expected: ['event-create-freelancer-view', 'event-freelancer-banner', 'event-freelancer-listing'],
  },
  {
    id: 'business-partner',
    expected: ['event-create-partner-view', 'event-partner-banner', 'event-partner-listing'],
  },
  {
    id: 'event-organiser',
    expected: ['event-create-organiser-view', 'event-creation-form', 'event-creation-live-preview'],
  },
  {
    id: 'tenant-admin',
    expected: ['event-create-admin-view', 'event-admin-banner', 'event-admin-queue'],
  },
  {
    id: 'platform-admin',
    expected: ['event-create-platform-admin-view', 'event-platform-total', 'event-platform-pending'],
  },
] as const;

const CELLS = ROLES.flatMap((role) => [
  {
    id: `C-${role.id}-en-desktop`,
    role: role.id,
    lang: 'en',
    viewport: { width: 1280, height: 800 },
    expected: role.expected,
    rtl: false,
  },
  {
    id: `C-${role.id}-he-rtl`,
    role: role.id,
    lang: 'he',
    viewport: { width: 1280, height: 800 },
    expected: role.expected,
    rtl: true,
  },
  {
    id: `C-${role.id}-en-mobile`,
    role: role.id,
    lang: 'en',
    viewport: { width: 375, height: 812 },
    expected: role.expected,
    rtl: false,
  },
]);

test.describe.configure({ mode: 'serial' });

test.describe('Event management visual role matrix', () => {
  test.beforeAll(() => {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  });

  for (const cell of CELLS) {
    test(cell.id, async ({ page }) => {
      await page.setViewportSize(cell.viewport);
      const params = new URLSearchParams({
        role: cell.role,
        lang: cell.lang,
      });
      if (IS_TENANT_A_ADAPTED) {
        const context = ADAPTATION_CONTEXT_BY_VARIANT[SNAPSHOT_VARIANT];
        params.set('tenant', context.tenant);
        params.set('moduleName', context.moduleName);
        params.set('adaptation', context.adaptation);
        params.set('maxAttendees', '10');
        params.set('maxEventsPerOrganizer', '3');
        params.set('promotionChannels', 'in-app updates only');
        if (context.waitlistMaxSize) {
          params.set('waitlistMaxSize', context.waitlistMaxSize);
        }
        if (context.analyticsWindowDays) {
          params.set('analyticsWindowDays', context.analyticsWindowDays);
        }
      }
      await page.goto(`/events/create?${params.toString()}`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('page-event-creation')).toBeVisible();
      await expect(page.getByTestId('page-event-creation')).toHaveAttribute(
        'data-viewer-role',
        cell.role,
      );

      if (cell.rtl) {
        await expect
          .poll(() => page.evaluate(() => document.documentElement.dir))
          .toBe('rtl');
      } else {
        await expect
          .poll(() => page.evaluate(() => document.documentElement.dir))
          .toBe('ltr');
      }

      for (const testId of cell.expected) {
        await expect(page.getByTestId(testId)).toBeVisible();
      }

      if (IS_TENANT_A_ADAPTED) {
        await expect(page.getByTestId('event-adaptation-policy')).toBeVisible();
        await expect(page.getByTestId('event-adaptation-policy-copy')).toContainText(
          '10 attendees',
        );
        await expect(page.getByTestId('event-adaptation-policy-copy')).toContainText(
          '3 active events',
        );
        await expect(page.getByTestId('event-adaptation-policy-copy')).toContainText(
          'in-app updates only',
        );
      } else {
        await expect(page.getByTestId('event-adaptation-policy')).toHaveCount(0);
      }

      if (IS_TENANT_B_ADAPTED) {
        const context = ADAPTATION_CONTEXT_BY_VARIANT[SNAPSHOT_VARIANT];
        await expect(page.getByTestId('event-tenant-b-policy')).toBeVisible();
        await expect(page.getByTestId('event-tenant-b-policy-copy')).toContainText(
          'Sponsor forum',
        );
        await expect(page.getByTestId('event-tenant-b-policy-copy')).toContainText(
          '12 partners',
        );
        await expect(page.getByTestId('event-tenant-b-policy-copy')).toContainText(
          'inherited Acme event limits',
        );
        await expect(page.getByTestId('event-tenant-b-policy-copy')).toContainText(
          context.waitlistMaxSize ?? '12',
        );
      } else {
        await expect(page.getByTestId('event-tenant-b-policy')).toHaveCount(0);
      }

      if (IS_TENANT_C_INSTALLED) {
        const context = ADAPTATION_CONTEXT_BY_VARIANT[SNAPSHOT_VARIANT];
        await expect(page.getByTestId('event-tenant-c-install-context')).toBeVisible();
        await expect(page.getByTestId('event-tenant-c-install-context-copy')).toContainText(
          context.moduleName,
        );
        await expect(page.getByTestId('event-tenant-c-install-context-copy')).toContainText(
          'Acme and Northwind policies remain active',
        );
      } else {
        await expect(page.getByTestId('event-tenant-c-install-context')).toHaveCount(0);
      }

      if (IS_TENANT_C_ADAPTED) {
        const context = ADAPTATION_CONTEXT_BY_VARIANT[SNAPSHOT_VARIANT];
        await expect(page.getByTestId('event-tenant-c-residency-policy')).toBeVisible();
        await expect(page.getByTestId('event-tenant-c-residency-policy-copy')).toContainText(
          `${context.analyticsWindowDays ?? '45'} days`,
        );
        await expect(page.getByTestId('event-tenant-c-residency-policy-copy')).toContainText(
          'Acme and Northwind policies remain active',
        );
      } else {
        await expect(page.getByTestId('event-tenant-c-residency-policy')).toHaveCount(0);
      }

      if (cell.role !== 'event-organiser') {
        await expect(page.getByTestId('event-creation-form')).toHaveCount(0);
      }
      if (cell.role !== 'tenant-admin') {
        await expect(page.getByTestId('event-admin-queue')).toHaveCount(0);
      }
      if (cell.role !== 'platform-admin') {
        await expect(page.getByTestId('event-platform-total')).toHaveCount(0);
      }

      await page.screenshot({
        path: path.join(SNAPSHOT_DIR, `${cell.id}.png`),
        fullPage: true,
      });
    });
  }
});
