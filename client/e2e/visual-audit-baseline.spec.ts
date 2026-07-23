/**
 * visual-audit-baseline.spec.ts
 *
 * RUN-146 visual-first reexamination baseline capture.
 *
 * Captures a representative sample of XIIGen surfaces across (flow × role ×
 * language × state). Runs under each of the 3 viewport projects defined in
 * playwright.config.ts (desktop 1440, tablet 820, mobile 412).
 *
 * Output path convention:
 *   docs/e2e-snapshots/visual-audit/<viewport>/<slug>/<state>-<role>-<lang>.png
 *
 * Viewports are named by the Playwright project (chromium-desktop /
 * chromium-tablet / chromium-mobile), so the same spec produces one PNG per
 * (viewport × cell). That cross-product is the baseline for V-R0.
 */

import { test } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'visual-audit');

/**
 * Representative cells chosen to cover:
 *   - all 7 grammars (G1..G7)
 *   - internal (platform-admin) vs external (anonymous, tenant-user)
 *   - a world-facing consumer view (marketplace, cms reader)
 *   - an internal admin console (ads-platform, bfa, adaptive-rag)
 *   - forms (registration, questionnaire)
 */
const CELLS: Array<{
  slug: string;
  grammar: string;
  route: string;
  role: string;
  state: string;
  mock?: string;
}> = [
  // G1 Progress Strip
  { slug: 'bundle-activation', grammar: 'G1', route: '/admin/bundle-activation', role: 'platform-admin', state: 'populated' },
  { slug: 'bundle-activation', grammar: 'G1', route: '/admin/bundle-activation', role: 'platform-admin', state: 'active',       mock: 'active' },
  { slug: 'bundle-activation', grammar: 'G1', route: '/admin/bundle-activation', role: 'platform-admin', state: 'failed',       mock: 'validation-failed' },

  // G3 Card List (external — consumer facing)
  { slug: 'marketplace',      grammar: 'G3', route: '/marketplace',             role: 'tenant-user',    state: 'populated' },
  { slug: 'marketplace',      grammar: 'G3', route: '/marketplace',             role: 'anonymous',      state: 'populated' },

  // G3 Card List (internal — admin facing)
  { slug: 'ads-platform',     grammar: 'G3+G6', route: '/admin/ads-platform',   role: 'platform-admin', state: 'populated' },
  { slug: 'ads-platform',     grammar: 'G3+G6', route: '/admin/ads-platform',   role: 'platform-admin', state: 'populated-he', },  // he-RTL

  // G4 Topology
  { slug: 'adaptive-rag-deep-research', grammar: 'G4', route: '/admin/adaptive-rag-deep-research', role: 'platform-admin', state: 'populated' },

  // G5 Kiosk (external — celebratory)
  { slug: 'user-registration', grammar: 'G5', route: '/register',               role: 'anonymous',      state: 'default' },
  { slug: 'user-registration', grammar: 'G5', route: '/register/pending-verification', role: 'anonymous', state: 'pending' },

  // G5 multi-step
  { slug: 'profile-enrichment', grammar: 'G5', route: '/questionnaire',         role: 'tenant-user',    state: 'default' },

  // G6 Dashboard
  { slug: 'data-warehouse-analytics', grammar: 'G6', route: '/admin/data-warehouse-analytics', role: 'platform-admin', state: 'populated' },
  { slug: 'data-warehouse-analytics', grammar: 'G6', route: '/admin/data-warehouse-analytics', role: 'tenant-admin',   state: 'populated' },

  // G7 Settings
  { slug: 'saas-multi-tenancy', grammar: 'G7', route: '/admin/tenant-lifecycle', role: 'platform-admin', state: 'default' },

  // G2 Verdict Grid
  { slug: 'bfa-cross-flow-governance', grammar: 'G2', route: '/admin/bfa-cross-flow-governance', role: 'platform-admin', state: 'populated' },

  // CMS reader (external)
  { slug: 'cms-publishing',     grammar: 'G5', route: '/admin/cms-publishing',  role: 'anonymous',      state: 'reader' },

  // Ads consumer (business-partner)
  { slug: 'ads-platform',       grammar: 'G3+G6', route: '/admin/ads-platform', role: 'business-partner', state: 'populated' },

  // Social feed (tenant-user external)
  { slug: 'friend-request-social-feed', grammar: 'G3', route: '/admin/friend-request-social-feed', role: 'tenant-user', state: 'populated' },

  // Event attendance (tenant-user external)
  { slug: 'event-attendance',   grammar: 'G3', route: '/admin/event-attendance', role: 'tenant-user',   state: 'populated' },

  // Subscription billing
  { slug: 'subscription-billing', grammar: 'G3', route: '/admin/subscription-billing', role: 'tenant-admin', state: 'populated' },
];

// Build the query string for a cell
function cellUrl(c: typeof CELLS[number]): string {
  const params = new URLSearchParams();
  if (c.role) params.set('role', c.role);
  if (c.mock) params.set('mock', c.mock);
  if (c.state.endsWith('-he')) params.set('lang', 'he');
  // RUN-177 FIX V-R11-P2-1: suppress dev-only "Missing provider keys" banner
  // and the FLOW-00 monospace badge so they don't leak into visual captures.
  params.set('hideChrome', '1');
  const qs = params.toString();
  return `${c.route}${qs ? '?' + qs : ''}`;
}

test.describe('RUN-146 visual-audit baseline', () => {
  for (const cell of CELLS) {
    test(`${cell.slug} · ${cell.state} · ${cell.role} (${cell.grammar})`, async ({ page }, testInfo) => {
      const project = testInfo.project.name; // chromium-desktop | -tablet | -mobile
      const outDir = path.join(SNAP_ROOT, project, cell.slug);
      const file = `${cell.state}-${cell.role}.png`;
      await page.goto(cellUrl(cell), { waitUntil: 'domcontentloaded', timeout: 15_000 });
      // Allow time for lazy-loaded content, skeletons to resolve, fonts to load.
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, file), fullPage: true });
    });
  }
});
