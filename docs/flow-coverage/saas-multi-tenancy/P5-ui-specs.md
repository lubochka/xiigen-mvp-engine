# FLOW-15 UI Spec - Phase 5 Deliverable

**Flow:** SaaS Multi-Tenancy (`saas-multi-tenancy`)
**Classification:** ADMIN_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `TenantLifecyclePage.tsx` | `/admin/tenants/lifecycle` | `last-action`, `lifecycle-error`, `reactivate-button`, `suspend-button`, `tenant-lifecycle-page`, `tenant-status-badge` +1 |
| `TenantProvisioningPage.tsx` | `/admin/tenants/provisioning` | `billing-contact-input`, `provision-error`, `provision-submit`, `provision-success`, `tenant-id`, `tenant-provisioning-page` +4 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | T605 provisions tenants atomically with SETNX, synchronous FREEDOM seed, activation, audit, and TenantProvisioned emit | `TenantProvisioningPage.tsx` | `tenant-provisioning-page` |
| 2 | T606 protects machine-locked FREEDOM keys and writes mutable config through OCC | `TenantProvisioningPage.tsx` | `tenant-provisioning-page` |
| 3 | T607 materializes quota counters from tier definitions through one MULTI_EXEC batch | `TenantProvisioningPage.tsx` | `tenant-provisioning-page` |
| 4 | T608 manages tenant suspension, termination, and reactivation without deleting on suspension | `TenantLifecyclePage.tsx` | `tenant-lifecycle-page` |
| 5 | T605/T606/T607/T608 resolve tenant identity from internal hash or TenantContextResolver, never request body tenantId | `TenantLifecyclePage.tsx` | `tenant-lifecycle-page` |
| 6 | FLOW-15 governance rules are registered and seeded for CF-15-1 through CF-15-4 and CF-945 through CF-948 | `TenantLifecyclePage.tsx` | `tenant-lifecycle-page` |

## Phase 6 Work Items

**Action:** spec validation only - pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 - Per-state coverage:** row count = 6 (= P1 item count). PASS
- **Arbiter 2 - Route proposal truthfulness:** PASS - routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 - Data-testid grounding:** PASS - existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 - Mode correctness:** PASS - WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
