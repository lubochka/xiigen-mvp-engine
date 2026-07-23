/**
 * Viewer role taxonomy — canonical roles for role-scoped UI templating.
 *
 * Architectural context (Luba C6, 2026-04-20):
 *   Each XIIGen flow may serve multiple user roles with different visibility
 *   scopes. A marketplace page visible to the public internet renders a
 *   different template than the same module viewed by a registered tenant
 *   user, which differs again from the freelancer view or the business-
 *   partner view.
 *
 * This taxonomy is the single source of truth for role-based branching
 * in page components, templates, API calls, and test fixtures. Pages that
 * are role-aware branch on `ViewerRole` values via <RoleScopedView>.
 *
 * GAP-11 extraction (Fix Plan v4.9 Tier 2 A78, 2026-04-22):
 *   Moved from client/src/components/common/ViewerRole.ts to
 *   packages/plugin-sdk/src/ViewerRole.ts. This is Guard 4's linchpin
 *   extraction — publishing this package unblocks Req-1 (client-side
 *   decoupling) for every role-aware page in the fleet. The original
 *   client location remains as a re-export shim for backwards compatibility;
 *   callers may import from either path.
 *
 * Guidance for adding a new role:
 *   1. Add the enum member below (preserve alphabetical order within group).
 *   2. Map its visibility scope in VIEWER_ROLE_SCOPE.
 *   3. Add a fixture state in every role-aware page's MOCK_STATES.
 *   4. Add a Playwright test case: ?role=<new-role> → screenshot.
 */

export const VIEWER_ROLES = [
  // Public / anonymous — no authentication required
  'anonymous',
  'public-marketplace-visitor',

  // Authenticated tenant users
  'tenant-user',
  'tenant-admin',

  // Role-specialised tenant users
  'referral-user',
  'freelancer',
  'business-partner',
  'event-organiser',

  // Platform-level
  'platform-admin',
  'platform-support',
] as const;

export type ViewerRole = (typeof VIEWER_ROLES)[number];

/** What each role can see (broad-to-narrow). */
export const VIEWER_ROLE_SCOPE: Record<ViewerRole, {
  authenticated: boolean;
  tenantScoped: boolean;
  description: string;
}> = {
  anonymous: {
    authenticated: false,
    tenantScoped: false,
    description: 'Public internet visitor with no identity. Sees discovery + marketing surfaces only.',
  },
  'public-marketplace-visitor': {
    authenticated: false,
    tenantScoped: false,
    description: 'Anonymous browsing a marketplace listing. Read-only marketplace entries; no purchase flow without auth.',
  },
  'tenant-user': {
    authenticated: true,
    tenantScoped: true,
    description: 'Registered user of the tenant. Default authenticated persona.',
  },
  'tenant-admin': {
    authenticated: true,
    tenantScoped: true,
    description: 'Administrator of the tenant. Sees admin panels and configuration surfaces.',
  },
  'referral-user': {
    authenticated: true,
    tenantScoped: true,
    description: 'User who joined via a referral link. Sees referral-reward surfaces + referrer relationship.',
  },
  freelancer: {
    authenticated: true,
    tenantScoped: true,
    description: 'User offering services. Sees gig postings, milestone payouts, freelancer-specific controls.',
  },
  'business-partner': {
    authenticated: true,
    tenantScoped: true,
    description: 'Business hiring freelancers or partnering with the tenant. Sees contract + hiring surfaces.',
  },
  'event-organiser': {
    authenticated: true,
    tenantScoped: true,
    description: 'User running events (distinct from attendees). Sees event-management admin within the tenant scope.',
  },
  'platform-admin': {
    authenticated: true,
    tenantScoped: false,
    description: 'XIIGen platform operator (MASTER_TENANT_ID). Sees engine-internal + cross-tenant surfaces.',
  },
  'platform-support': {
    authenticated: true,
    tenantScoped: false,
    description: 'Platform-level support reviewing a single tenant in read-only mode.',
  },
};

/** Default viewer role when no identity is resolved. */
export const DEFAULT_VIEWER_ROLE: ViewerRole = 'anonymous';

/** Role guards for imperative code. Prefer <RoleScopedView> for rendering. */
export function isAuthenticated(role: ViewerRole): boolean {
  return VIEWER_ROLE_SCOPE[role].authenticated;
}

export function isTenantScoped(role: ViewerRole): boolean {
  return VIEWER_ROLE_SCOPE[role].tenantScoped;
}

export function isPublicMarketplaceView(role: ViewerRole): boolean {
  return role === 'anonymous' || role === 'public-marketplace-visitor';
}
