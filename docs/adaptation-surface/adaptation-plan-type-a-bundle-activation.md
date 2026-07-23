# Adaptation Plan - Type A - Bundle Activation

Flow: FLOW-00 Bundle Activation
Tenant: acme-corp
Adapted module name: acme-launch-bundles
Version: 1.0.1

## Summary

Acme Corp adapts Bundle Activation into an operations-friendly launch bundle
module. The service orchestration remains unchanged: validation, readiness
check, activation ordering, tenant isolation, and event persistence keep the
same rules. The adaptation is a tenant-facing value change expressed through
flow-scoped configuration and rendered UI copy.

## Changed Values

| Tenant-facing behavior | Platform value | Acme value | Evidence |
|---|---|---|---|
| Readiness step label | Preview activation | Check bundle readiness | Tenant A role screenshots show the adapted label |
| Support route | platform-support | Acme launch desk | Tenant A role screenshots show the adapted route |
| Displayed full launch estimate | 10 seconds | about 9 seconds | Tenant A role screenshots and marketplace listing show the estimate |

## Applied Surface

- `client/src/pages/bundle-activation/BundleActivationPage.tsx`
- `client/src/pages/MarketplacePage.tsx`
- `client/e2e/bundle-activation-tenant-a-adaptation.spec.ts`
- `client/e2e/bundle-activation-marketplace-listing.spec.ts`
- Tenant A fork repo: `freedom-config.defaults.json`
- Tenant A fork repo: `tenant.config.json`
- Tenant A fork repo: `ADAPTATION-CHANGELOG.md`

## Verification Plan

1. Run the Tenant A fork package TypeScript and Jest checks.
2. Push the adapted Tenant A fork package and verify GitHub Actions passes.
3. Publish `@xiigen-fork/acme-launch-bundles@1.0.1` to the local registry and
   verify `npm view` returns `1.0.1`.
4. Capture 9 adapted role screenshots under
   `docs/e2e-snapshots/bundle-activation/tenant-a-v1.0.1/`.
5. Capture the marketplace listing screenshot at
   `docs/e2e-snapshots/marketplace/bundle-activation-v1.0.1-listing.png`.

## Plain-Language UI Requirement

The rendered UI must not expose configuration key names. It should say:

"Acme launch policy: readiness step Check bundle readiness, support route Acme
launch desk, full launch estimate about 9 seconds."

That sentence proves the adapted values are visible to reviewers without
showing engine internals to users.
