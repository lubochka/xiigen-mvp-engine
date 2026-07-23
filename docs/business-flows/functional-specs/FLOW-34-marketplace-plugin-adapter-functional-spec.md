# Functional Spec — FLOW-34 Marketplace Plugin Adapter

**Grammar:** G3 Card list
**Primary role tiers:** PLATFORM_OPS (adapter author), TENANT_OPS (adapter consumer in their plugin build)
**Current state:** **Designed** — 0 services. Spec formerly under zip's "34-" was translation (now FLOW-48); actual FLOW-34 spec needs authoring.

## 1. Summary

XIIGen's adapter pattern for wiring a third-party platform's plugin SDK into the XIIGen plugin model. The canonical example is Canva (C5 Canva Text Elements Adapter). Platform admins register adapters; tenant admins use them when targeting that platform. Each adapter has a thin Layer 3 wrapping a XIIGen `@xiigen/plugin-sdk` Layer 1 + a per-plugin engine Layer 2.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **PLATFORM_OPS** | `/admin/engine/adapters/` | Register new adapters, version management, compatibility testing |
| **TENANT_OPS** | `/admin/plugins/adapters` | Pick an adapter when publishing a plugin to a target platform |

**Modes:** Draft / Staging / Published. Per-platform target.

## 3. User stories

### Story 3.1 — Admin registers a new adapter

**Screens:** `/admin/engine/adapters/new` → metadata + test → register.

1. Metadata: target platform (Canva / Miro / Webflow / Framer / custom), SDK version supported, permissions required.
2. Upload or link adapter code bundle.
3. Run compatibility tests against the target SDK.
4. Register → available for tenant plugin-publishing flows.

### Story 3.2 — Tenant plugin author picks adapter

**Screens:** plugin publishing flow → adapter picker.

1. When publishing a plugin targeting Canva, tenant sees available adapters for that platform.
2. Pick the adapter → plugin build wires through it.

## 4. Screen structure

- **Adapter registry** — G3 cards per adapter with target platform + SDK version + status.
- **Adapter detail** — metadata + compatibility test history + usage stats.
- **Registration wizard** — 3-step.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| SDK version mismatch | Compatibility test fails; clear error. |
| Target platform updates SDK | Adapter flagged stale; admin prompted to verify. |
| Multiple adapters for same platform | Tenant picks explicitly; default marked. |

## 6. Problematic states

- **No adapters registered** → *"Add an adapter for your first platform."*
- **Test fails** — test report with failures + retry.
- **Adapter deprecated** — banner on detail + migration path.

## 7. Visual direction

**Grammar:** G3 Card list.

**Feel:** *Operational · Technical · Versioned*.

**Signature:** the **compatibility test report** — clearly shows which SDK methods pass/fail.

**Anti-patterns:**
- Hiding SDK version requirements.
- Silent fallback when adapter incompatible.

## 8. Acceptance criteria

- [ ] Adapter registry card list.
- [ ] Adapter detail with compatibility + usage.
- [ ] Registration wizard with SDK test.
- [ ] Tenant picker integration with plugin-publish flows.
- [ ] All 3 problematic states covered.
