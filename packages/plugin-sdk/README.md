# @xiigen/plugin-sdk

Canonical plugin SDK for XIIGen-forked flows. Currently ships the ViewerRole
taxonomy and role-scoping primitives used by every role-aware client page.

## Current exports

- `ViewerRole` type + `VIEWER_ROLES` const (10 canonical roles)
- `VIEWER_ROLE_SCOPE` — per-role visibility descriptor
- `DEFAULT_VIEWER_ROLE` (`'anonymous'`)
- `isAuthenticated(role)`, `isTenantScoped(role)`, `isPublicMarketplaceView(role)`

## Provenance

- Extracted from `client/src/components/common/ViewerRole.ts` on 2026-04-22
- Originated in FLOW-01 role-aware client pages
- GAP-11 extraction per Fix Plan v4.9 Tier 2 A78
- Guard 4 linchpin: publishing this package unblocks Req-1 (client-side
  decoupling) for every role-aware page in the fleet

## Backwards compatibility

The original location `client/src/components/common/ViewerRole.ts` is retained
as a re-export shim that delegates to this package. Consumers may import
from either path — the shim path will be deprecated in a later release
once all consumers reference `@xiigen/plugin-sdk` directly.

## Publishing

Currently `private: true` — not yet published to any npm registry. The
`workspace:*` → `^1.0.0` migration will happen alongside the first npm
registry publish in a future non-plan-mode session with minimally-scoped
credentials. No credentials were used in the authoring of this package.

## No runtime dependencies

Pure TypeScript. No imports from React, NestJS, or any framework. Suitable
for any flow-fork target environment.
