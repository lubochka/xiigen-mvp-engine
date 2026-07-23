/**
 * ViewerRole re-export shim.
 *
 * GAP-11 (Fix Plan v4.9 Tier 2 A78, 2026-04-22): the canonical source is
 * now `packages/plugin-sdk/src/ViewerRole.ts`. This file remains as a
 * re-export shim so the 50+ existing client imports (and any new ones)
 * continue to work without modification. New code is encouraged to import
 * directly from `@xiigen/plugin-sdk` once the package is registered with
 * the client's bundler / jest path mapping (follow-up).
 *
 * Guard 4 — this shim exists so the Guard-4-downstream work on FLOW-02/03/
 * 04/09/12 is not blocked waiting for every import site to be rewritten.
 * The shim will be removed once all consumers point at `@xiigen/plugin-sdk`.
 */

export {
  VIEWER_ROLES,
  VIEWER_ROLE_SCOPE,
  DEFAULT_VIEWER_ROLE,
  isAuthenticated,
  isTenantScoped,
  isPublicMarketplaceView,
} from '../../../../packages/plugin-sdk/src/roles/viewer-role';

export type { ViewerRole } from '../../../../packages/plugin-sdk/src/roles/viewer-role';
