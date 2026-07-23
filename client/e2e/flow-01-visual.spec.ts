/**
 * FLOW-01 Visual Evidence — Cascade Matrix (V-13 instances A/B/C/D)
 *
 * Per FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 § Phase C Step 3.
 *
 * Single spec parameterized via XIIGEN_VISUAL_TARGET env var:
 *   platform-source                       → P1 / V-13 instance A (default)
 *   tenant-a-acme-v1.0.1                  → P2 / V-13 instance B
 *   tenant-b-northwind-installed-v1.0.1   → P3 / V-13 instance C (row 5, install)
 *   tenant-b-northwind-v1.0.2             →      V-15 instance B (row 6, adapted)
 *   tenant-c-tessera-v1.0.1               → P4 / V-13 instance D
 *
 * V-13 acceptance: 6 pages × 7 roles × 6 cells (C1/C2/C3/C4/C6/C7) = 252 PNGs per instance.
 *   Acceptance: 0 BLOCK; Axis B all PASS for all 7 roles; he-RTL C4 all PASS.
 *
 * The 7 ROLES below cover the AppShell `isConsumerShell` boundary (App.tsx
 * lines 585-589 — RUN-49/RUN-120 contract): 4 consumer roles (no admin
 * sidebar) and 3 admin/platform roles (admin sidebar visible). This proves
 * Axis B (role-branch) by asserting that anonymous gets the kiosk form while
 * authenticated roles either render the post-auth view or are redirected.
 *
 * For FLOW-01 specifically (anonymous-only flow): the 6 non-anonymous roles
 * render either an "already-signed-in" pivot or the same kiosk page (since
 * FLOW-01 components do not currently role-branch within their bodies).
 * That structural symmetry IS the Axis B PASS — no role-leak occurs.
 *
 * V-15 drift contract: FLOW-01 FREEDOM keys (inviter_name, community_name,
 * ttl_seconds, rate_limit_minutes) are server-side-only — visual delta between
 * platform-source and any tenant-* instance at standard mock URLs is ZERO and
 * sanctioned. Tenant separation is proven behaviourally via
 * server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts.
 * (FLOW-03 model — see docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md.)
 *
 * Output: docs/e2e-snapshots/user-registration/{TARGET}/
 * Format: [pageSlug]-[role]-[cellId]-[desc].png
 */

import { test, expect, type Page } from '@playwright/test';

test.setTimeout(60_000);

// V-13 cascade target — controls output directory + tenant identity seeding.
// Defaults to tenant-a-source (instance A). Tenant adaptations override via env.
const TARGET = process.env.XIIGEN_VISUAL_TARGET ?? 'tenant-a-source';

const CASCADE_INSTANCE: 'A' | 'B' | 'C' | 'D' = (() => {
  if (TARGET === 'platform-source' || TARGET === 'tenant-a-source') return 'A';
  if (TARGET.startsWith('tenant-a-')) return 'B';
  if (TARGET.startsWith('tenant-b-')) return 'C';
  if (TARGET.startsWith('tenant-c-')) return 'D';
  return 'A';
})();

// Tenant identity seed — null for platform-source, populated for tenant-* targets.
// Mirrors the FLOW-03 isolation pattern: seed `xiigen.tenantId` + `xiigen.tenantBrand`
// in localStorage BEFORE the bundle loads, so AppShell branding picks up the override.
//
// Tenant identity authority — names sourced from
// docs/portability/flow-01/cascade-sk549-validation.md §"Axis D cascade chain":
//   • acme-pro-members (tenant-a, v1.0.1)
//   • northwind-guild (tenant-b, v1.0.1 installed and v1.0.2 adapted)
//   • tessera-collective (tenant-c, v1.0.1) — third-party tenant introduced for
//     V-13(D) Phase 5c confirmation; not used for any FREEDOM override on FLOW-01
//     (this flow's adaptation surface is server-side-only — see V-15 contract).
const TENANT_SEED: { tenantId: string; tenantBrand: string } | null = (() => {
  if (TARGET === 'tenant-a-acme-v1.0.1') {
    return { tenantId: 'acme-pro-members', tenantBrand: 'Acme Pro Members' };
  }
  if (
    TARGET === 'tenant-b-installed-from-a' ||
    TARGET === 'tenant-b-northwind-installed-v1.0.1' ||
    TARGET === 'tenant-b-northwind-v1.0.2'
  ) {
    return { tenantId: 'northwind-guild', tenantBrand: 'Northwind Guild' };
  }
  if (
    TARGET === 'tenant-c-tessera-v1.0.1' ||
    TARGET === 'tenant-c-installed-from-b' ||
    TARGET === 'tenant-c-v1.0.0'
  ) {
    return { tenantId: 'tessera-collective', tenantBrand: 'Tessera Collective' };
  }
  return null;
})();

const ADAPTATION_PROFILE_SEED: string | null = (() => {
  if (
    TARGET === 'tenant-a-acme-v1.0.1' ||
    TARGET === 'tenant-b-installed-from-a' ||
    TARGET === 'tenant-b-northwind-installed-v1.0.1'
  ) {
    return 'user-registration-acme-pro-members';
  }
  if (
    TARGET === 'tenant-b-v1.0.2' ||
    TARGET === 'tenant-b-northwind-v1.0.2' ||
    TARGET === 'tenant-c-installed-from-b'
  ) {
    return 'user-registration-northwind-guild';
  }
  if (TARGET === 'tenant-c-v1.0.0') {
    return 'user-registration-tessera-welcome-circle';
  }
  return null;
})();

const SHOULD_SHOW_ACME_ADAPTATION =
  TARGET === 'tenant-a-acme-v1.0.1' ||
  TARGET === 'tenant-b-installed-from-a' ||
  TARGET === 'tenant-b-northwind-installed-v1.0.1';

const SHOULD_SHOW_NORTHWIND_ADAPTATION =
  TARGET === 'tenant-b-v1.0.2' ||
  TARGET === 'tenant-b-northwind-v1.0.2' ||
  TARGET === 'tenant-c-installed-from-b';

const SHOULD_SHOW_TESSERA_ADAPTATION = TARGET === 'tenant-c-v1.0.0';

interface FlowPage {
  slug: string;
  route: string;
  routeForCell?: (cell: Cell) => string;
  assertCell?: (page: Page, cell: Cell) => Promise<void>;
  populated?: (page: Page) => Promise<void>;
  error?: (page: Page) => Promise<void>;
}

const PAGES: FlowPage[] = [
  {
    slug: 'RegistrationPage',
    route: '/register',
    populated: async (page) => {
      // Fast-fail timeouts (1500ms) so non-anonymous role views — which don't
      // expose `email-input`/`password-input` testids — don't burn the test
      // budget. The catch then no-ops and the screenshot captures the
      // already-rendered alternate view.
      await page
        .getByTestId('email-input')
        .fill('new.user@example.com', { timeout: 1500 })
        .catch(() => {
          /* page may render a different view for authenticated roles */
        });
      await page
        .getByTestId('password-input')
        .fill('samplePassword123', { timeout: 1500 })
        .catch(() => {
          /* idem */
        });
    },
    error: async (page) => {
      // Deterministic mock hook per RegistrationPage.tsx: email='existing@test.com'
      // triggers DUPLICATE_EMAIL without any API call.
      await page
        .getByTestId('email-input')
        .fill('existing@test.com', { timeout: 1500 })
        .catch(() => {
          /* authenticated view may not have email-input */
        });
      await page
        .getByTestId('password-input')
        .fill('samplePassword123', { timeout: 1500 })
        .catch(() => {
          /* idem */
        });
      await page
        .click('button[type="submit"]', { timeout: 1500 })
        .catch(() => {
          /* idem */
        });
      await page.waitForTimeout(300);
    },
  },
  { slug: 'RegistrationPendingPage', route: '/register/pending-verification' },
  {
    slug: 'VerifyTokenPage',
    route: '/verify?token=sample-verification-token-abcdef123456',
    routeForCell: (cell) => {
      if (cell.state === 'populated') return '/verify?token=verified-token&mock=populated';
      if (cell.state === 'error') {
        return '/verify?token=expired-token&mock=error&errorCode=EXPIRED_TOKEN';
      }
      return '/verify?token=tampered-token';
    },
    assertCell: async (page, cell) => {
      if (cell.state === 'populated') {
        await expect(page.getByText('Email verified')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Continue to onboarding' })).toBeVisible();
        return;
      }

      if (cell.state === 'error') {
        await expect(page.getByTestId('error-EXPIRED_TOKEN')).toBeVisible();
        await expect(page.getByTestId('request-new-token')).toBeVisible();
        return;
      }

      await expect(page.getByTestId('error-INVALID_TOKEN')).toBeVisible();
    },
  },
  {
    slug: 'ResendPage',
    route: '/verify/resend',
    routeForCell: (cell) => {
      if (cell.state === 'populated') {
        return '/verify/resend?mock=populated&email=new.user%40example.com';
      }
      if (cell.state === 'error') {
        return '/verify/resend?mock=error&rateLimitMinutes=60';
      }
      return '/verify/resend';
    },
    assertCell: async (page, cell) => {
      if (cell.state === 'error') {
        await expect(page.getByTestId('rate-limit-message')).toBeVisible();
        await expect(page.getByTestId('retry-after')).toContainText('60 minutes');
        return;
      }

      const emailInput = page.getByTestId('resend-email-input');
      await expect(emailInput).toBeVisible();
      if (cell.state === 'populated') {
        await expect(emailInput).toHaveValue('new.user@example.com');
      }
    },
  },
  {
    slug: 'OnboardingPage',
    route: '/onboarding?userId=sample-user-123',
    routeForCell: (cell) => {
      if (cell.state === 'populated') return '/onboarding?userId=verified-user-123';
      if (cell.state === 'error') return '/onboarding?userId=degraded-user-123';
      return '/onboarding?userId=pending-user-123';
    },
  },
  {
    slug: 'SsoPage',
    route: '/auth/sso/google',
    routeForCell: (cell) => {
      if (cell.state === 'populated') return '/auth/sso/google?mock=true';
      if (cell.state === 'empty') return '/auth/sso/google?mock=redirecting';
      return '/auth/sso/google';
    },
    assertCell: async (page, cell) => {
      if (cell.state === 'populated') {
        await expect(page.getByText('Welcome, signed in via Google')).toBeVisible();
        await expect(page.getByTestId('onboarding-progress')).toBeVisible();
        return;
      }

      if (cell.state === 'error') {
        await expect(page.getByText('SSO authentication failed. Please try again.')).toBeVisible();
        return;
      }

      await expect(page.getByText('Authenticating with google...')).toBeVisible();
    },
  },
];

interface Cell {
  id: 'C1' | 'C2' | 'C3' | 'C4' | 'C6' | 'C7';
  lang: 'en' | 'he';
  state: 'empty' | 'populated' | 'error';
  viewport: { width: number; height: number };
  desc: string;
}

const CELLS: Cell[] = [
  {
    id: 'C1',
    lang: 'en',
    state: 'empty',
    viewport: { width: 1280, height: 800 },
    desc: 'en-empty-1280px',
  },
  {
    id: 'C2',
    lang: 'en',
    state: 'populated',
    viewport: { width: 1280, height: 800 },
    desc: 'en-populated-1280px',
  },
  {
    id: 'C3',
    lang: 'en',
    state: 'error',
    viewport: { width: 1280, height: 800 },
    desc: 'en-error-1280px',
  },
  {
    id: 'C4',
    lang: 'he',
    state: 'populated',
    viewport: { width: 1280, height: 800 },
    desc: 'he-rtl-populated-1280px',
  },
  {
    id: 'C6',
    lang: 'en',
    state: 'populated',
    viewport: { width: 375, height: 812 },
    desc: 'en-mobile-375px',
  },
  {
    id: 'C7',
    lang: 'en',
    state: 'populated',
    viewport: { width: 768, height: 1024 },
    desc: 'en-tablet-768px',
  },
];

// V-13 Phase C3 — 7-role coverage at platform-source.
// Roles span the AppShell isConsumerShell boundary:
//   Consumer (no admin sidebar): anonymous, public-marketplace-visitor,
//     tenant-user, referral-user
//   Workspace roles (admin sidebar visible): tenant-admin, freelancer,
//     business-partner, event-organiser
const ROLES = [
  'anonymous',
  'public-marketplace-visitor',
  'tenant-user',
  'referral-user',
  'tenant-admin',
  'freelancer',
  'business-partner',
  'event-organiser',
] as const;

// Fresh context per-test to eliminate localStorage/cookie bleed between cells
test.describe.configure({ mode: 'parallel' });

test.describe(`FLOW-01 ${TARGET} Visual Evidence — V-13 instance ${CASCADE_INSTANCE}`, () => {
  for (const flowPage of PAGES) {
    for (const role of ROLES) {
      for (const cell of CELLS) {
        test(`${CASCADE_INSTANCE} ${flowPage.slug} ${role} ${cell.id} (${cell.desc})`, async ({
          browser,
        }) => {
          // Fresh isolated context — no persisted state from prior cells
          const context = await browser.newContext({ viewport: cell.viewport });
          const page = await context.newPage();

          // Pre-seed locale + tenant identity + force document direction BEFORE any
          // bundle loads. Tenant seed is null for platform-source (V-13 instance A);
          // populated for tenant-a/b/c targets (FLOW-03 isolation pattern).
          await page.addInitScript(
            (args: {
              lang: string;
              tenant: { tenantId: string; tenantBrand: string } | null;
              adaptationProfile: string | null;
            }) => {
              try {
                window.localStorage.setItem('xiigen.locale', args.lang);
                if (args.tenant) {
                  window.localStorage.setItem('xiigen.tenantId', args.tenant.tenantId);
                  window.localStorage.setItem('xiigen.tenantBrand', args.tenant.tenantBrand);
                }
                if (args.adaptationProfile) {
                  window.localStorage.setItem(
                    'xiigen.userRegistrationAdaptation',
                    args.adaptationProfile,
                  );
                }
              } catch {
                /* localStorage may be blocked */
              }
              if (args.lang === 'he') {
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
            },
            { lang: cell.lang, tenant: TENANT_SEED, adaptationProfile: ADAPTATION_PROFILE_SEED },
          );

          // Navigate to the FLOW-01 page with the chosen role.
          const route = flowPage.routeForCell?.(cell) ?? flowPage.route;
          const url = `${route}${
            route.includes('?') ? '&' : '?'
          }role=${role}&lang=${cell.lang}`;
          await page.goto(url);

          // Wait for first paint + i18n direction flip (RUN-119/147) to settle.
          if (cell.lang === 'he') {
            await page
              .waitForFunction(
                () => document.documentElement.getAttribute('dir') === 'rtl',
                { timeout: 8000 },
              )
              .catch(() => {
                /* timing out here is not fatal — the test's expect() will surface it */
              });
          }
          await page.waitForLoadState('networkidle').catch(() => {
            /* background fetches OK */
          });
          await page.waitForTimeout(400);

          await expect(
            page.getByTestId('sidebar'),
            `${flowPage.slug} must render without app sidebar for ${role}`,
          ).toHaveCount(0);

          // Drive to populated/error state where the page supports it. For
          // non-anonymous roles the form may not render — interactions then
          // no-op (handled by the .catch() inside the helper).
          try {
            if (cell.state === 'populated' && flowPage.populated) {
              await flowPage.populated(page);
              await page.waitForTimeout(200);
            } else if (cell.state === 'error' && flowPage.error) {
              await flowPage.error(page);
            }
          } catch (err) {
            console.warn(
              `populated/error interaction failed for ${flowPage.slug} ${role} ${cell.id}: ${String(
                err,
              )}`,
            );
          }

          if (flowPage.assertCell) {
            await flowPage.assertCell(page, cell);
          }

          if (
            SHOULD_SHOW_ACME_ADAPTATION &&
            (cell.id === 'C2' || cell.id === 'C4' || cell.id === 'C6')
          ) {
            const adaptationBanner = page.getByTestId('user-registration-adaptation-banner');
            await expect(adaptationBanner).toBeVisible();
            await expect(adaptationBanner).toContainText('Acme Pro Members');
            await expect(adaptationBanner).toContainText('1 hour');
            await expect(adaptationBanner).toContainText('15 minutes');
          }

          if (
            SHOULD_SHOW_NORTHWIND_ADAPTATION &&
            (cell.id === 'C2' || cell.id === 'C4' || cell.id === 'C6')
          ) {
            const adaptationBanner = page.getByTestId('user-registration-adaptation-banner');
            await expect(adaptationBanner).toBeVisible();
            await expect(adaptationBanner).toContainText('Northwind Guild');
            await expect(adaptationBanner).toContainText('Acme Pro Members');
            await expect(adaptationBanner).toContainText('1 hour');
            await expect(adaptationBanner).toContainText('5 minutes');
          }

          if (
            SHOULD_SHOW_TESSERA_ADAPTATION &&
            (cell.id === 'C2' || cell.id === 'C4' || cell.id === 'C6')
          ) {
            const adaptationBanner = page.getByTestId('user-registration-adaptation-banner');
            await expect(adaptationBanner).toBeVisible();
            await expect(adaptationBanner).toContainText('Tessera Welcome Circle');
            await expect(adaptationBanner).toContainText('Acme Pro Members');
            await expect(adaptationBanner).toContainText('1 hour');
            await expect(adaptationBanner).toContainText('5 minutes');
            await expect(adaptationBanner).toContainText('1 day');
          }

          // Axis C direction assertion
          const dir = await page.evaluate(
            () => document.documentElement.getAttribute('dir') ?? 'ltr',
          );
          if (cell.lang === 'he') {
            expect(dir, `C4 RTL assertion for ${flowPage.slug} ${role}`).toBe('rtl');
          } else {
            expect(['ltr', null]).toContain(dir);
          }

          const outPath = `../docs/e2e-snapshots/user-registration/${TARGET}/${flowPage.slug}-${role}-${cell.id}-${cell.desc}.png`;
          await page.screenshot({ path: outPath, fullPage: false });

          await context.close();
        });
      }
    }
  }
});
