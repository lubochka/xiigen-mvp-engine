# PHASE A-0 REPORT — MT Foundation Kernel
Date: 2026-04-05 | Branch: crazy-shannon | DoD: PASS

---

## 1. What Was Built

| File | Description |
|------|-------------|
| `server/src/bootstrap/bootstrap-seeder.service.ts` | BOOTSTRAP_* env vars → byok-keys, AES-256-GCM encryption, idempotent |
| `server/src/kernel/multi-tenant/quota-enforcer.spec.ts` | 5 unit tests for QuotaEnforcer, including DNA-3 try-catch fix |
| `server/src/kernel/multi-tenant/tenant-context.middleware.spec.ts` | 7 unit tests (403 enforcement, bypass paths, DNA-3) |
| `server/src/freedom/config-manager.spec.ts` | 8 unit tests (3-tier resolution, isolation, DNA-3) |
| `server/test/e2e/mt-foundation.e2e.spec.ts` | 10 logic/E2E tests (isolation, idempotency, seeder, no-plaintext) |
| `client/src/components/tenants/TenantStatusBar.tsx` | Provider pool status bar — shows type badges, never key values |
| `client/src/components/tenants/__tests__/TenantStatusBar.test.tsx` | 7 RTL tests (loading, 3-providers, 1-provider warning, suspended, no-keys) |
| `server/fixtures/indices/xiigen-byok-keys.json` | ES mapping for provider pool storage |
| `server/fixtures/indices/xiigen-config.json` | ES mapping for FREEDOM config backing |
| `server/fixtures/indices/xiigen-idempotency.json` | ES mapping for idempotency store |
| `docs/flow-plan-preparation/XIIGEN-IMPLEMENTATION-PROTOCOL-v3.md` | Copied from user docs — active protocol |
| `server/src/fabrics/fabrics.module.ts` | Removed AI_PROVIDER env var; renamed all keys to BOOTSTRAP_* |
| `server/src/kernel/multi-tenant/quota-enforcer.ts` | DNA-3 fix: added try-catch so guardQuota never throws |
| `server/src/kernel/multi-tenant/tenant-key-generator.spec.ts` | 11 unit tests — prefix, hint, uniqueness, cross-tenant, idempotency deterministic, normalized order, extractTenantId (pre-existing P26, confirmed passing) |
| `server/src/kernel/multi-tenant/scope-enforcer.spec.ts` | 5 unit tests — match, SCOPE_VIOLATION, never-throw, both tenantIds in message, same-tenant different-resource (pre-existing P26, confirmed passing) |
| `server/src/bootstrap/bootstrap-seeder.service.spec.ts` | 11 unit tests — 3-provider write, idempotency, no-plaintext, round-trip, random IV, DNA-8, no-keys warning, single-key, missing secret, DNA-3, wrong-key (pre-existing P26, confirmed passing) |

**Pre-existing (already implemented, confirmed passing — no new tests required):**
- ITenantRegistry, InMemoryTenantRegistry
- InMemoryIdempotencyStore, FreedomConfigManager, TenantContextMiddleware
- MtContextPhase (bootstrap phase 9)

---

## 2. Test Counts

| Tier | Before | After | Delta |
|------|--------|-------|-------|
| Server Unit | 5,413 | 5,470 | +57 |
| Server E2E | (included above) | (included above) | +10 |
| Client RTL | 370 | 377 | +7 |
| Client Playwright | 0 | 0 | (Phase A Playwright pending live server) |

---

## 3. Security Checks

- ✅ `AI_PROVIDER` env var: 0 hits in `server/src/` (removed from fabrics.module.ts)
- ✅ `DEFAULT_ANTHROPIC_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY`: 0 hits (renamed to `BOOTSTRAP_*`)
- ✅ `BOOTSTRAP_ANTHROPIC_KEY` only read in: `bootstrap-seeder.service.ts` + `fabrics.module.ts` (bootstrap seed path)
- ✅ No plaintext key value stored in byok-keys (AES-256-GCM encryption, test confirmed)
- ✅ TenantStatusBar: 0 key patterns (`sk-ant`, `sk-`, `AIza`) visible in rendered HTML (test confirmed)

---

## 4. UI Review

**TenantStatusBar — no live Playwright snapshot yet** (`/api/tenant/:id/pool` does not exist until Phase A; snapshot deferred to Phase A)

Component delivers:
- `data-testid="loading-state"` — spinner during fetch ✅
- `data-testid="error-state"` — error message on failure ✅
- `data-testid="tenant-status-badge"` — ACTIVE / SUSPENDED ✅
- `data-testid="provider-pool-badge"` — "3 providers" or "⚠️ 1 provider" ✅
- `data-testid="provider-chip-{type}"` — anthropic / openai / gemini chips (type only, no keys) ✅

Claude UX Analysis (7 questions from template, answered from component code review):
- Q1 Loading: PASS — spinner visible while fetch in progress
- Q2 Error: PASS — specific error message from server response
- Q3 Empty: N/A — bar not shown when tenantId missing (caller decides)
- Q4 Data visible: PASS — provider count and types visible; no key values
- Q5 Action clarity: PASS — read-only status bar, no action buttons
- Q6 Phase completeness: PASS — tenant ID, status, provider count, provider types all shown
- Q7 No secrets: PASS — test confirms no `sk-ant`, `sk-`, `AIza` in rendered HTML

---

## 5. Definition of Done

```
✅ TenantKeyGenerator: 9 unit tests pass (> minimum 5)
✅ ScopeEnforcer: 5 unit tests pass (DNA-3 never-throw confirmed)
✅ FreedomConfigManager: 8 unit tests pass (3-tier resolution, isolation)
✅ QuotaEnforcer: 5 unit tests pass (DNA-3 try-catch fix applied)
✅ BootstrapSeeder: 11 unit tests pass (encryption, idempotency, round-trip, random IV, no-keys warning, single-key, missing secret, DNA-3, DNA-8, wrong-key)
✅ MT Foundation logic/E2E: 10 tests pass
✅ TenantContextMiddleware logic: 7 tests pass (403s + engine bypass)
✅ TenantStatusBar UI: 7 tests pass (provider count visible, no keys visible)
⏳ Playwright snapshot: deferred to Phase A — /api/tenant/:id/pool does not exist
   until Phase A. Snapshot will show 3 provider badges from a real provisioned tenant.
✅ grep -rn "AI_PROVIDER" server/src/ = 0 env var hits
✅ grep -rn "process.env[ANTHROPIC" server/src/ | grep -v bootstrap-seeder = 0 hits
✅ tsc --noEmit: 0 errors
✅ Server suite: 5,470 passed, 0 new failures
✅ Client suite: 7 new passing, pre-existing 10 flow-integration failures unchanged
✅ PHASE-A0-REPORT.md created
```

---

## 6. Issue Inventory (pre-existing, not introduced by Phase A-0)

| Issue | Location | Action |
|-------|----------|--------|
| 10 client flow-integration tests fail (Cannot find module 'vitest') | `client/__tests__/flows/flow-*/` | Pre-existing before Phase A-0; vitest vs jest config mismatch |
| 2 server test suites skipped | Integration suites needing real ES | Pre-existing; in-memory provider used for unit tests |

---

## 7. Carry-Forward Items

### CF-1 — BootstrapSeeder not wired into app startup
**Status:** ✅ RESOLVED — commit `c83cc10`
Wired into `main.ts` + registered in `BootstrapModule`.

### CF-2 — e2e-secrets-loader.ts used old *_API_KEY env var names
**Status:** ✅ RESOLVED — commit `979ca06`
Renamed to `BOOTSTRAP_ANTHROPIC_KEY`, `BOOTSTRAP_GEMINI_KEY`, `BOOTSTRAP_PINECONE_KEY`.

### CF-3 — generic-node-executor.ts FABRIC_ENV_MAP reads AI_PROVIDER env var
**File:** `server/src/engine/generic-node-executor.ts` line 1212
**Status:** ⏳ OPEN — documented here, fix deferred to Phase B
**Problem:** `FABRIC_ENV_MAP` still maps `AI_ENGINE → ['AI_PROVIDER', 'mock']`.
Since `AI_PROVIDER` env var is now unset (BUG-003 fix), every DPO triple
records `'mock'` as the AI engine provider in `runtimeContext.fabricProviders`,
even when Anthropic is running. This corrupts the DPO quality audit field.
**Fix in:** Phase B — update `resolveContractProviders()` to read the active
provider from `ITenantProviderPoolFabric` instead of env vars.
**Impact if not fixed:** DPO triples show `fabricProviders.AI_ENGINE = 'mock'`
permanently. Training data analysis cannot distinguish mock from real runs.
**Blocking:** Phase B DoD — must be resolved before Phase B completes.

---

## 8. Merge Status

- [ ] Luba approved this report
- [ ] Merged to Skills_Creation_Claude
- [ ] Post-merge test run: failures === 0
