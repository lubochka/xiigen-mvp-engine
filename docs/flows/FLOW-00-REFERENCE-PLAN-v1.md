# FLOW-00: BUNDLE ACTIVATION
## Reference Plan v1.0 — DO NOT EXECUTE
## Date: 2026-03-20
## Status: DRAFT — awaiting Gate C approval

---

## POSITION IN EXECUTION ORDER

```
... → FLOW-36 → FLOW-00 → FLOW-34 → FLOW-01..24
```

FLOW-00 runs **after FLOW-36** (needs FT records and bundle manifests)
and **before FLOW-34** (FLOW-34 generates platform adapters for already-active flows).
FLOW-00 is the entry point for tenant provisioning — it reads a bundle manifest,
validates it, and activates the required flows for a specific tenant.

---

## WHY THIS IS A SEPARATE FLOW, NOT PART OF FLOW-34

FLOW-34 translates FT capabilities to platform adapters. It answers:
"Given this feature on Figma, generate the Canva adapter."

FLOW-00 answers: "Given this tenant selected Bundle X, which flows do they get,
in what order, with what FREEDOM config defaults?"

These are orthogonal responsibilities. Conflating them would mean FLOW-34 needs
to know about tenant provisioning, bundle manifests, and onboarding sequences —
none of which are adapter-generation concerns. FLOW-00 calls FLOW-33's
BootstrapOrchestrator per flow; FLOW-34 calls FLOW-36's PlatformAdapterGenerator
per feature. Different callers, different inputs, different outputs.

---

## WHAT THIS FLOW BUILDS

After FLOW-00, the engine can:

1. Validate a solution bundle manifest before any tenant provisioning begins
2. Activate a curated set of flows for a tenant in a single atomic operation
3. Pre-populate FREEDOM config with domain-appropriate defaults
4. Track which bundle version a tenant is running
5. Detect when a flow regeneration would degrade an active bundle

```
[T-[+0]] BundleValidator
  Reads solution-bundle.schema.json
  Validates requiredFlows[] exist in flow-lifecycle index
  Validates no BFA conflicts across the bundle's flows
  Validates all requiredFlows are ACTIVE (or activatable)
  Returns BundleValidationReport

[T-[+1]] BundleActivationOrchestrator
  For each flow in requiredFlows[]:
    - Calls T516 BootstrapOrchestrator (DRY_RUN first, then FULL)
    - Updates flow-lifecycle for this tenant: NOT_STARTED → ACTIVE
  Pre-populates FREEDOM config from bundle.defaultFreedomConfig
  Sets bundle status in flow-lifecycle index
  Returns BundleActivationReport

[T-[+2]] BundleStatusTracker
  Monitors active bundles against flow regeneration events
  When T521 regenerates a flow in an active bundle:
    Checks bundle's minFlowVersions constraint
    If new version < minimum: set bundle status = DEGRADED
    If version OK: no action
  Exposes GET /bundles/{bundleId}/status endpoint
```

---

## NAMING TABLE (verify at session start per SK-416)

> Numbers below are PLACEHOLDERS. Verify against live canonical docs.

| Type | ID | Name | Description |
|------|----|------|-------------|
| Task | T-[+0] | BundleValidator | Validate manifest + BFA check across all bundle flows |
| Task | T-[+1] | BundleActivationOrchestrator | Provision all required flows for a tenant |
| Task | T-[+2] | BundleStatusTracker | Monitor bundle health against flow regeneration |
| Factory | F-[+0] | IBundleRegistryService | CRUD for bundle manifests in ES |
| Factory | F-[+1] | IBundleActivationService | Orchestration of multi-flow provisioning |
| Factory | F-[+2] | IBundleStatusService | Health monitoring + DEGRADED detection |
| Family | [+0] | SolutionBundles | — |

New archetypes: none — VALIDATION (T-[+0] uses existing), ORCHESTRATION (T-[+1]),
GOVERNANCE (T-[+2])

New BFA CF rules: estimated 8–12
- Bundle must have ≥ 1 requiredFlow
- requiredFlows must all exist in flow-lifecycle
- All requiredFlows must be ACTIVE before bundle status = ACTIVE
- BundleActivationOrchestrator must call DRY_RUN before FULL on each flow
- Bundle DEGRADED when any requiredFlow version < minFlowVersions[flowId]
- FREEDOM config pre-population must not overwrite tenant-existing values

---

## PRINCIPLE ANSWERS (P1–P10)

### P1 — Multi-Tenant
Every bundle activation is tenant-scoped. Tenant A's "B2B Marketplace" bundle
is entirely independent of Tenant B's bundle selection. Bundle manifests
themselves are platform-level (shared); activation records are tenant-scoped.
Isolation test: Tenant A's bundle activation does not affect Tenant B's flows.

### P2 — Safe Configs
FREEDOM config pre-population via ISecretsService for any credential-bearing
default values. `defaultFreedomConfig` in bundle manifest contains no credentials
— only non-sensitive config defaults (thresholds, algorithm choices, TTLs).
Actual tenant credentials always go through ISecretsService.

### P3 — Prompt Improvement
BundleValidator uses a versioned PromptAsset for any AI-assisted validation
(e.g. compatibility scoring). AF-9 verdict triggers PromptPatch on low scores.

### P4 — Dual RAG
Global tier: `solution-bundles` ES index (production).
Local tier: in-memory bundle store in docker-compose.test.yml.
Tests use LOCAL tier only.

### P5 — Always Improve
Metrics per activation: flows_activated, activation_time_ms, config_overrides_count,
first_degradation_days. Stored in FREEDOM layer. Improvement cycle: high
first_degradation_days → review minFlowVersions constraints.

### P6 — Decision Nodes Arbitrated
BundleValidator has a BFA-compliance arbiter. BundleActivationOrchestrator has
a sequencing arbiter (correct flow activation order per dependency graph).

### P7 — Local Testability
All 4 layers. InMemoryBundleRegistry for unit/simulation. Docker-local for
full ES integration. Zero cloud credentials at any gate.

### P8 — Local Model Training
BundleValidator high-quality validations captured as training data.
Per-tenant isolation enforced.

### P9 — Mode C Event-First
Events in `contracts/events/FLOW-00/`:
- BundleActivationRequested (client event — tenant selects bundle)
- BundleValidationCompleted
- BundleActivated (terminal — all required flows ACTIVE)
- BundleDegraded (T-[+2] emits when version check fails)
- BundleRestored (T-[+2] emits when degraded flow is re-promoted)
correlationId + tenantId + traceparent on all events. No PII.

### P10 — Client-Side Architecture
Client state map: tenant sees bundle selection → validation progress →
activation progress (per-flow) → bundle active.
FlowStateSnapshot: returns current activation step + flows_remaining.
App-reopen: activation resumes from last completed flow.
Optimistic UI: "Activate Bundle" button optimistic pending → confirmed by
BundleActivated, rolled back by BundleValidationFailed.

---

## SOLUTION BUNDLE SCHEMA (canonical — defined in FEATURE-REGISTRY-S1)

The full schema lives in `contracts/bundles/solution-bundle.schema.json`
(created in FEATURE-REGISTRY-S1-PLAN amendment — see that document).

Key fields used by FLOW-00:

```json
{
  "bundleId": "B-001",
  "name": "B2B Marketplace",
  "schemaVersion": "1.0",
  "requiredFlows": ["FLOW-01", "FLOW-02", "FLOW-03", "FLOW-09"],
  "optionalFlows": ["FLOW-07", "FLOW-13"],
  "minFlowVersions": {
    "FLOW-01": "v1",
    "FLOW-02": "v1",
    "FLOW-03": "v1",
    "FLOW-09": "v1"
  },
  "defaultFreedomConfig": {
    "matching_algorithm": "portfolio-based",
    "payment_model": "escrow",
    "onboarding_questionnaire": "b2b-marketplace-v1",
    "blast_radius_promotion_threshold": { "directDependencies": 0, "transitiveDependencies": 2 }
  },
  "tenantAdaptationGuide": "markdown string — what can be overridden and how",
  "incompatibilities": ["B-003"]
}
```

---

## THREE PHASES

### PHASE A — Foundation (~2h)

```
- Create EngineContracts for T-[+0], T-[+1], T-[+2]
- Register F-[+0], F-[+1], F-[+2] factory interfaces
- Seed BFA CF rules (8–12 rules)
- Create solution-bundles ES index
- Seed genesis prompts to AF-3
- Register 3 arbiters (BFA-compliance, sequencing, version-check)
- Seed initial bundle manifests:
    B-001: B2B Marketplace
    B-002: Community Platform
    B-003: Content Creator
    B-004: B2B SaaS
  (stubs — full configs in later phases)
- Baseline snapshot: FLOW-00-A-baseline.json

Gate:
□ 3 EngineContracts
□ 3 factory interfaces
□ CF rules seeded (no collisions)
□ solution-bundles index created
□ 4 bundle manifest stubs valid against solution-bundle.schema.json
□ npx tsc --noEmit = 0 errors
□ Tests: entry + ~12
```

### PHASE B — BundleValidator + BundleStatusTracker (~3h)

```
T-[+0] BundleValidator:
  - Reads bundle manifest from solution-bundles index
  - Validates all requiredFlows exist in flow-lifecycle index
  - Validates no BFA conflicts: POST /engine/bfa/validate with all flow IDs
  - Validates all requiredFlows are ACTIVE (or have no blocking dependency unmet)
  - Returns BundleValidationReport { valid, errors, warnings, estimatedActivationMs }

T-[+2] BundleStatusTracker:
  - Subscribes to flow-lifecycle regeneration events
  - On flow regeneration: check all bundles containing that flow
  - If new version < bundle.minFlowVersions[flowId]: emit BundleDegraded
  - If version OK: no action
  - On flow re-promotion: check if all bundle flows now meet minVersions → emit BundleRestored

Gate:
□ BundleValidator passes for valid 4-flow bundle
□ BundleValidator fails correctly for bundle with missing required flow
□ BundleStatusTracker emits BundleDegraded when version below minimum
□ BundleStatusTracker emits BundleRestored when flow re-promoted
□ Tests: entry + ~20
```

### PHASE C — BundleActivationOrchestrator + Integration (~4h)

```
T-[+1] BundleActivationOrchestrator:
  - Takes validated bundle + tenantId
  - For each flow in requiredFlows[] (dependency-ordered):
    1. Call T516 BootstrapOrchestrator DRY_RUN — must pass before FULL
    2. Call T516 BootstrapOrchestrator FULL
    3. Update flow-lifecycle: NOT_STARTED → ACTIVE for this tenant
    4. Emit per-flow progress event (client reads via FlowStateSnapshot)
  - Pre-populate FREEDOM config from bundle.defaultFreedomConfig
    (does NOT overwrite existing tenant values — additive only)
  - Set bundle activation record: { tenantId, bundleId, bundleVersion,
    activatedAt, flowVersionsAtActivation }
  - Emit BundleActivated (terminal)

Integration:
  - BundleActivationRequested (client) → BundleValidator → BundleActivationOrchestrator
  - Full E2E: tenant selects B-001 → 4 flows activated → FREEDOM config set
  - Parallel activation: Wave 2 flows in same bundle activate in parallel
    (uses parallel_wave from PARALLEL-EXECUTION-PLAN.md)

Gate:
□ Full activation of B-001 (4 flows) completes end-to-end
□ DRY_RUN called before FULL for each flow (verify mock call order)
□ FREEDOM config pre-populated correctly (no overwrites of existing values)
□ BundleActivated event emitted with correct flowVersionsAtActivation
□ FlowStateSnapshot returns correct progress during activation
□ App-reopen: activation resumes from last completed flow
□ Cross-flow edge tests for B-001's dependency graph pass
□ flow-lifecycle records updated for all 4 flows for this tenant
□ Tests: entry + ~35
□ All SK-418 checks pass (15/15)
```

---

## KEY FACTS

```
Execution order:
  ... → FLOW-36 → FLOW-00 → FLOW-34 → FLOW-01..24

Bundle manifests are platform-level (shared across tenants).
Bundle activation records are tenant-scoped.

FLOW-33 connection:
  T-[+1] calls T516 BootstrapOrchestrator directly.
  T516's DRY_RUN mode (Amendment 2) is mandatory before FULL.
  T516's 3-case blast radius protocol applies per-flow within the bundle.

FLOW-36 connection:
  Bundle manifests live in contracts/bundles/ (separate from contracts/features/).
  BundleValidator reads from solution-bundles ES index.
  Feature Registry (FT-IDs) are not in bundle manifests directly — they're
  in individual flow reference plans. Bundles operate at the flow level.

FLOW-35 connection:
  BundleDegraded/BundleRestored events feed into the flow-lifecycle dashboard.
  Flow Map tab (FLOW-36 Phase F) shows bundle status alongside flow status.

Parallel activation:
  When a bundle requires Wave 2 flows (e.g. FLOW-03 + FLOW-05 + FLOW-07),
  T-[+1] uses parallel_wave = 2 activation model from PARALLEL-EXECUTION-PLAN.md.
  Pre-allocated ranges used per flow in the bundle.
```

---

## SESSION FILES TO PRODUCE

```
FLOW-00-STATE.json
SESSION-FLOW-00-A.md    ← foundation: 3 contracts + factories + CF rules + bundle stubs
SESSION-FLOW-00-B.md    ← BundleValidator + BundleStatusTracker
SESSION-FLOW-00-C.md    ← BundleActivationOrchestrator + integration
docs/FLOW-00-REFERENCE.md
```

Every SESSION file ends with Phase Completion Package (SK-427).

⛔ STOP — verify live artifact boundaries at Phase A start.
Read solution-bundle.schema.json (contracts/bundles/) before Phase A.
Read PARALLEL-EXECUTION-PLAN.md before Phase C.
