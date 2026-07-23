/**
 * @xiigen/plugin-sdk — barrel export.
 *
 * Canonical XIIGen plugin SDK primitives. Currently ships:
 *   - ViewerRole taxonomy (role-scoped UI templating)
 *
 * Additional extractions will be added here as GAP-11 extraction work
 * proceeds (per Fix Plan v4.9 Tier 2).
 */

export {
  VIEWER_ROLES,
  VIEWER_ROLE_SCOPE,
  DEFAULT_VIEWER_ROLE,
  isAuthenticated,
  isTenantScoped,
  isPublicMarketplaceView,
} from './roles/viewer-role';

export type { ViewerRole } from './roles/viewer-role';
