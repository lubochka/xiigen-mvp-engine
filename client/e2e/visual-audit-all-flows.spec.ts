/**
 * visual-audit-all-flows.spec.ts
 *
 * RUN-150 honest-coverage redo.
 *
 * Captures ALL 45 product flows (48 minus FLOW-41/42/43 INTERNAL_ONLY
 * adapters). One primary cell per flow at its most representative role.
 * Runs at all 3 viewports (desktop 1440, tablet 820, mobile 412) per
 * playwright.config.ts.
 *
 * Output: docs/e2e-snapshots/visual-audit/<viewport>/<slug>/primary-<role>.png
 *
 * This extends visual-audit-baseline.spec.ts (which covered only 13 flows)
 * so the next convergence round is scored against the full product surface.
 */

import { test } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'visual-audit');

// 45 flows = 48 minus FLOW-41/42/43 INTERNAL_ONLY vendor-SDK adapters with no
// XIIGen UI. Route + role + grammar from MARKET-REFERENCE-CATALOG.md +
// App.tsx Route table.
const FLOWS: Array<{
  slug: string;
  grammar: string;
  route: string;
  role: string;
}> = [
  { slug: 'bundle-activation',                grammar: 'G1', route: '/admin/bundle-activation',                   role: 'platform-admin' },
  { slug: 'user-registration',                grammar: 'G5', route: '/register',                                  role: 'anonymous'      },
  { slug: 'profile-enrichment',               grammar: 'G5', route: '/questionnaire',                             role: 'tenant-user'    },
  { slug: 'event-management',                 grammar: 'G5', route: '/events/create',                             role: 'tenant-user'    },
  { slug: 'event-attendance',                 grammar: 'G3', route: '/attendance',                               role: 'tenant-user'    },
  { slug: 'completion-gamification',          grammar: 'G5', route: '/gamification',                              role: 'tenant-user'    },
  { slug: 'user-groups-communities',          grammar: 'G3', route: '/groups',                                    role: 'tenant-user'    },
  { slug: 'friend-request-social-feed',       grammar: 'G3', route: '/social-feed',                              role: 'tenant-user'    },
  { slug: 'marketplace',                      grammar: 'G3', route: '/marketplace',                               role: 'tenant-user'    },
  { slug: 'transactional-event-participation',grammar: 'G5', route: '/tickets/purchase',                          role: 'tenant-user'    },
  { slug: 'reviews-reputation',               grammar: 'G3', route: '/reviews/submit',                            role: 'tenant-user'    },
  { slug: 'schema-registry-dag',              grammar: 'G1', route: '/schema-registry',                           role: 'platform-admin' },
  { slug: 'subscription-billing',             grammar: 'G3', route: '/billing-dashboard',                        role: 'tenant-admin'   },
  { slug: 'data-warehouse-analytics',         grammar: 'G6', route: '/admin/data-warehouse-analytics',            role: 'platform-admin' },
  { slug: 'etl-data-integration',             grammar: 'G1', route: '/admin/etl-data-integration',                role: 'platform-admin' },
  { slug: 'saas-multi-tenancy',               grammar: 'G7', route: '/admin/tenants/lifecycle',                  role: 'platform-admin' },
  { slug: 'marketplace-payments',             grammar: 'G5', route: '/checkout',                                  role: 'tenant-user'    },
  { slug: 'freelancer-marketplace',           grammar: 'G3', route: '/gigs/post',                                 role: 'freelancer'     },
  { slug: 'visual-flow-engine',               grammar: 'G4', route: '/admin/visual-flow/canvas',                 role: 'platform-admin' },
  { slug: 'durable-sagas-compliance',         grammar: 'G1', route: '/admin/sagas',                              role: 'platform-admin' },
  { slug: 'ads-platform',                     grammar: 'G3', route: '/admin/ads-platform',                        role: 'platform-admin' },
  { slug: 'dynamic-forms-workflows',          grammar: 'G7', route: '/dynamic-forms-workflows',                  role: 'tenant-admin'   },
  { slug: 'cms-publishing',                   grammar: 'G5', route: '/cms-publishing',                           role: 'anonymous'      },
  { slug: 'form-builder-templates',           grammar: 'G3', route: '/form-templates',                           role: 'tenant-admin'   },
  { slug: 'ai-safety-moderation',             grammar: 'G5', route: '/ai-safety-moderation',                     role: 'anonymous'      },
  { slug: 'bfa-cross-flow-governance',        grammar: 'G2', route: '/admin/bfa-cross-flow-governance',           role: 'platform-admin' },
  { slug: 'meta-flow-engine',                 grammar: 'G4', route: '/admin/meta-flow-engine',                    role: 'platform-admin' },
  { slug: 'human-interaction-gate',           grammar: 'G2', route: '/admin/human-interaction-gate',              role: 'platform-admin' },
  { slug: 'blog-cms-modules',                 grammar: 'G5', route: '/blog-cms-modules',                         role: 'anonymous'      },
  { slug: 'adaptive-rag-deep-research',       grammar: 'G4', route: '/admin/adaptive-rag-deep-research',          role: 'platform-admin' },
  { slug: 'tenant-lifecycle-manager',         grammar: 'G6', route: '/admin/tenant-lifecycle-manager',            role: 'platform-admin' },
  { slug: 'design-intelligence-engine',       grammar: 'G6', route: '/admin/design-intelligence-engine',          role: 'platform-admin' },
  { slug: 'sharable-flows-marketplace',       grammar: 'G3', route: '/admin/sharable-flows-marketplace',          role: 'platform-admin' },
  { slug: 'system-initiation-bootstrap',      grammar: 'G1', route: '/admin/system-initiation-bootstrap',         role: 'platform-admin' },
  { slug: 'marketplace-plugin-adapter',       grammar: 'G4', route: '/admin/marketplace-plugin-adapter',          role: 'platform-admin' },
  { slug: 'meta-arbitration-engine',          grammar: 'G2', route: '/admin/meta-arbitration-engine',             role: 'platform-admin' },
  { slug: 'feature-registry',                 grammar: 'G3', route: '/admin/feature-registry',                    role: 'platform-admin' },
  { slug: 'design-system-governance',         grammar: 'G2', route: '/admin/design-system-governance',            role: 'platform-admin' },
  { slug: 'rag-quality-feedback',             grammar: 'G6', route: '/admin/rag-quality-feedback',                role: 'platform-admin' },
  { slug: 'oss-curriculum',                   grammar: 'G6', route: '/admin/oss-curriculum',                      role: 'platform-admin' },
  { slug: 'client-push',                      grammar: 'G3', route: '/admin/client-push',                         role: 'platform-admin' },
  { slug: 'ai-self-modification',             grammar: 'G3', route: '/admin/ai-self-modification',                role: 'platform-admin' },
  { slug: 'history-bootstrap',                grammar: 'G1', route: '/admin/history-bootstrap',                   role: 'platform-admin' },
  { slug: 'platform-agent',                   grammar: 'G3', route: '/admin/platform-agent',                      role: 'platform-admin' },
  { slug: 'cycle-chain-extension',            grammar: 'G1', route: '/admin/cycle-chain-extension',               role: 'platform-admin' },
  { slug: 'module-lifecycle',                 grammar: 'G1', route: '/admin/module-lifecycle',                    role: 'platform-admin' },
  { slug: 'admin-i18n',                       grammar: 'G7', route: '/admin/i18n',                               role: 'platform-admin' },
];

function cellUrl(c: typeof FLOWS[number]): string {
  const q = new URLSearchParams();
  q.set('role', c.role);
  return `${c.route}?${q.toString()}`;
}

test.describe('RUN-150 visual-audit all-flows', () => {
  test.setTimeout(20_000);
  for (const cell of FLOWS) {
    test(`${cell.slug} (${cell.grammar}, ${cell.role})`, async ({ page }, testInfo) => {
      const project = testInfo.project.name;
      const outDir = path.join(SNAP_ROOT, project, cell.slug);
      const file = `primary-${cell.role}.png`;
      try {
        await page.goto(cellUrl(cell), { waitUntil: 'domcontentloaded', timeout: 10_000 });
      } catch {
        // Continue to screenshot even if navigation partially failed -- we
        // want the rendered state (possibly a 404, error page, or role fallback)
        // to land on disk so it can be scored.
      }
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(outDir, file), fullPage: true });
    });
  }
});
