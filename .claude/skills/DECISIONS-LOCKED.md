# DECISIONS-LOCKED.md — XIIGen Architecture Decisions (Locked)

These decisions are permanently locked. No flow, session, or addendum may
reverse or amend them without explicit written approval from Luba.

---

## D-FT-1: Feature Registry Namespace

**Status:** LOCKED
**Date:** 2026-03-20
**Decided by:** Luba (FEATURE-REGISTRY-S1 session)

**Decision:** FT-001 onwards is reserved for Feature Registry artifacts.

- FT-IDs are assigned by FLOW-36 FeatureExtractor task type
- No flow, session, or addendum may assign FT-IDs before FLOW-36 executes,
  except FEATURE-REGISTRY-S1 which assigns provisional IDs FT-001–FT-099
  for the Figma plugin migration (confirmed by FLOW-36 Phase A)
- FT-IDs are stable across platforms: same feature = same FT-ID regardless
  of which platform hosts the adapter
- FT-IDs follow the pattern `^FT-[0-9]{3,6}$`

**Rationale:** Prevent collision between flows independently assigning feature
labels to the same capabilities. A feature extracted from the Figma plugin
and later ported to Canva must carry the same FT-ID across both platforms.
Without a locked namespace, flows could independently label the same
capability with different identifiers, breaking the cross-platform registry.

**Scope:**
- Namespace: `FT-001` through `FT-999999`
- Provisional range (FEATURE-REGISTRY-S1): `FT-001` through `FT-099`
- Confirmed range (FLOW-36 Phase A onwards): `FT-100` and above (or confirmed
  provisional IDs FT-001–FT-099 if FLOW-36 Phase A validates them)

---

---
D-FT-2: productScope is MACHINE — never tenant-tunable
  Status: LOCKED | Date: 2026-03-20
  Decision: productScope: "xiigen-capability" = XIIGen's own infrastructure feature.
  productScope: "client-capability" = capability generated for client flows.
  Classification determined at extraction time by FeatureExtractor.
  Tenants cannot reclassify. No API for changing productScope.
  Source: FEATURE-REGISTRY-S1-PLAN-v2.md Deliverable D-FT-2

---
D-FT-3: XIIGen product variants are first-class platformId values
  Status: LOCKED | Date: 2026-03-20
  Decision: xiigen-saas, xiigen-oss, xiigen-enterprise, xiigen-lean are valid platformId values.
  Same PortingDecisionGate logic applies. Same portingCandidate flag. Same signal tracking.
  The Feature Registry is self-referential by design.
  Source: FEATURE-REGISTRY-S1-PLAN-v2.md Deliverable D-FT-3

---
D-VIS-1: blast_radius_promotion_threshold default values
  Status: LOCKED | Date: 2026-03-20
  Decision: directDependencies=0 (always block), transitiveDependencies=2 (block if >2).
  Tunable: FREEDOM config, per tenant.
  Source: FLOW-EXECUTION-VISIBILITY-PLAN.md Addition 5

---
D-VIS-2: DRY_RUN required before any FLOW-01..24 Phase B
  Status: LOCKED | Date: 2026-03-20
  Decision: Every Phase A gate must pass bootstrap:dry-run before any generation.
  Source: FLOW-EXECUTION-VISIBILITY-PLAN.md Addition 3

---
D-VIS-3: test:flow-matrix required in every FLOW-01..24 Phase E gate
  Status: LOCKED | Date: 2026-03-20
  Decision: npm run test:flow-matrix -- --flow=FLOW-XX is mandatory, not optional.
  Source: FLOW-EXECUTION-VISIBILITY-PLAN.md Addition 2

---
D-VIS-4: flow-lifecycle status updated at Phase A and Phase E
  Status: LOCKED | Date: 2026-03-20
  Decision: Phase A gate → GENERATED. Phase E gate → PROMOTED → ACTIVE. Mandatory.
  Source: FLOW-EXECUTION-VISIBILITY-PLAN.md Addition 4

---
D-PARALLEL-1: pre_allocated_artifact_ranges are immutable once assigned
  Status: LOCKED | Date: 2026-03-20
  Decision: Parallel instance uses pre-assigned T/F/SK/CF ranges only. Never queries live.
  Source: PARALLEL-EXECUTION-PLAN.md Item 1

---
D-PARALLEL-2: parallel_wave flag governs gate model
  Status: LOCKED | Date: 2026-03-20
  Decision: null=absolute gate. N=delta gate. Absolute baseline verified post-merge by CI.
  Source: PARALLEL-EXECUTION-PLAN.md Item 4

---
D-PARALLEL-3: pre-allocation session required before each wave
  Status: LOCKED | Date: 2026-03-20
  Decision: No Wave N instance starts Phase A before pre-allocation session approved.
  Source: PARALLEL-EXECUTION-PLAN.md Item 5

---
D-34-1: FLOW-34 scope — thin adapters only, runtime transpilation excluded
  Status: LOCKED | Date: 2026-03-20
  Decision: FLOW-34 produces MODE-B-thin adapters only. MODE-B-full is FLOW-37+.
  Enterprise clients receive FlowBundle + NestJS reference (guidance, not runtime).
  Source: FEATURE-REGISTRY-S1-PLAN-v2.md Deliverable D-34-1

---
D-BUNDLE-1: Bundle activation is FLOW-00, not FLOW-34
  Status: LOCKED | Date: 2026-03-20
  Decision: FLOW-34 generates platform adapters per feature (FT-ID → adapter code).
  FLOW-00 provisions flows for a tenant per bundle manifest (bundle → flow activation).
  These are orthogonal responsibilities. Conflating them creates an architectural error.
  Source: FLOW-00-REFERENCE-PLAN-v1.md

---
D-BUNDLE-2: defaultFreedomConfig in bundle manifests is additive only
  Status: LOCKED | Date: 2026-03-20
  Decision: A bundle's defaultFreedomConfig pre-populates values a tenant inherits.
  Tenant overrides are additive — they cannot remove keys set by the bundle.
  This preserves domain expertise encoded in the bundle defaults.
  Source: FLOW-00-REFERENCE-PLAN-v1.md

---
D-CLIENT-1: Every background server step that changes visible UI must specify a client signal type
  Status: LOCKED | Date: 2026-03-20
  Decision: Any server task that runs while the user is viewing the flow and changes
  what they would see MUST declare a signalType in the flow's topology.json
  clientArchitecture.backgroundSteps. Silent mutation of live content is prohibited.
  Source: CLIENT-ARCHITECTURE-SPEC.md §5

---
D-CLIENT-2: Offline queue default is NOT queueable
  Status: LOCKED | Date: 2026-03-20
  Decision: Actions not listed in offlineQueue.queueable are NOT queueable by default.
  Conservative default — flow must explicitly opt in per action. Actions with
  irreversible side effects (payment, email change, deletion) must never be queueable.
  Source: CLIENT-ARCHITECTURE-SPEC.md §3

---
D-CLIENT-3: DraftAbandonedWithEffect for draft expiry when serverSideEffect is present
  Status: LOCKED | Date: 2026-03-20
  Decision: When a draft with serverSideEffect: true expires, the flow must emit
  DraftAbandonedWithEffect (not DraftAbandoned). This distinction is machine-enforced —
  no tenant may suppress it. Server-side cleanup must run for partial submissions.
  Source: CLIENT-ARCHITECTURE-SPEC.md §4

---
D-NAMING-1: Authoritative domain name table for flow files and directories
  Status: LOCKED | Date: 2026-03-22
  Decision: Every flow's source files (engine-contracts/ and engine/flows/) must use
  the domain name from this table, never the flow number. The flow number appears only
  in file header comments and index.ts barrel exports.

  Canonical domain name table (enforced by SK-430 Rule 1 and Rule 2):

  | Flow ID | Domain Name (files/dirs)       | Human-Readable flowName          |
  |---------|-------------------------------|----------------------------------|
  | FLOW-25 | bfa-conflict-detection        | BFA Conflict Detection           |
  | FLOW-26 | self-developing-flow-engine   | Self-Developing Flow Engine      |
  | FLOW-27 | human-approval-workflow       | Human Approval Workflow          |
  | FLOW-29 | queue-fabric-bootstrap        | Queue Fabric Bootstrap           |
  | FLOW-30 | tenant-lifecycle              | Tenant Lifecycle Manager         |
  | FLOW-31 | design-system-governance      | Design System Governance         |
  | FLOW-33 | code-generation-loop          | Code Generation Loop Bootstrap   |
  | FLOW-35 | meta-arbitration-engine       | Meta-Arbitration Engine          |
  | FLOW-36 | feature-registry              | Feature Registry                 |
  | FLOW-00 | bundle-activation             | Bundle Activation                |

  Note: engine-contracts/ files renamed in SESSION-NAMING-REFACTOR used interim names
  (bfa-conflict-arbitration, flow-extension-engine, etc.). FLOW-00.1 Phase B will
  align these to the canonical names in this table.

  Source: SK-430-SKILL.md (package v1.0), SKILL-REGISTRATION-MANIFEST-v4.md
  Any change requires SK-417 decision reopening protocol.

---

## D-STACK-1 — Three-Tier Stack Coupling Taxonomy (2026-03-22)

CONCEPT_NEUTRAL: Rule applies identically on any stack. Arbiter checking it may use stack-specific patterns, but the rule text is identical everywhere.
IMPL_VARIES:     Concept identical; syntax differs by coupling dimension. Genesis prompt is a parameterized template.
STACK_COUPLED:   Implementation fundamentally different per stack. No shared template. Separate stackImplementations entry per stack.
INCOMPATIBLE:    Cannot be implemented on this stack within XIIGen's architecture model. Must be flagged with reason + mitigation before implementation begins.

**To change:** SK-417 decision reopening required.
**Registered:** 2026-03-22

---

## D-STACK-2 — Option C Hybrid Genesis Prompt Format (2026-03-22)

Approved: hybrid format with 4 sections.
Section 1 (neutralIronRules): no framework names, no stack syntax — ever.
Section 2 (conceptDescription): plain English business description.
Section 3 (eventContracts): CONSUMES / EMITS / BOUNDARY, always stack-neutral.
Section 4 (stackImplementations): per-StackKey generation frames, keyed by "{stackType}:{side}".

**To change:** SK-417 decision reopening required.
**Registered:** 2026-03-22

---

## D-STACK-3 — Priority Stacks for Stack Coupling Audit (2026-03-22)

**Decision:** NestJS + React.js are the priority stacks.

Server priority: node-nestjs (TypeScript + NestJS)
Client priority: react-web (React.js SPA)

**Meaning:** Full IMPL_VARIES annotation is produced for node-nestjs first.
Other server stacks (python-fastapi, php-laravel, php-wordpress, dotnet-aspnet,
rust-axum) receive INCOMPATIBLE flags where structural constraints apply, and
generationFrame stubs otherwise.

**Execution boundary (addendum 2026-03-22):**
"generationFrame stubs otherwise" means stubs in EngineContractParams reference data
(the engine's knowledge base for future generation). It does NOT mean stubs in:
  - topology.json nodes
  - SESSION files that Claude Code executes
  - stateNotes blocks for non-priority client stacks

Claude Code's execution context (SESSION files + topology nodes) contains ONLY:
  1. Stacks listed in STATE.json stackTargets (server) and clientTargets (client) — full annotation
  2. INCOMPATIBLE one-line flags for known structural blockers — always included
  3. Platform entries (redis:platform, jest:platform, aws-ses:platform) — always included

Everything else belongs in a FUTURE STACKS APPENDIX in the reference plan. It never
enters the session file. Violating this boundary causes agent drift — Claude Code
annotates frameworks nobody is building, which wastes context and risks implementing
the wrong stack.

**Approved:** 2026-03-22 ("Nest.js + React.js to priority")
**Addendum:** 2026-03-22 (execution boundary clause)
**To change:** SK-417 decision reopening required.

---

## D-STACK-4 — WordPress LIMITED Stack Treatment (2026-03-22)

WordPress (php-wordpress) is a SUPPORTED LIMITED stack.
Structural incompatibilities in FLOW-01 through FLOW-04:
  1. Fan-in parallelism (T50): INCOMPATIBLE — no native parallel execution primitive
  2. Long-running background jobs (T48, T64): INCOMPATIBLE — wp_cron unreliable for precise TTL
  3. Reliable Redis anti-replay (T65): DEGRADED — via wp_transient only
  4. Realtime WebSocket push (T51, T61): INCOMPATIBLE without external JS layer

Recommendation: php-laravel for PHP server deployments requiring these features.

**To change:** SK-417 decision reopening required.
**Registered:** 2026-03-22

---

## D-STACK-5 — Angular Observable Scope Declaration Location (2026-03-22)

State architecture notes (stateHolderType, stateScope, propagationRisk, routeGuardRequired)
are declared in topology.json at the node level under stackCoupling.entries["angular:client"].stateNotes.
Flow reference plans (Pass 3) reference the topology.json values — they do not duplicate.
The functional spec arbiter enforces stateNotes correctness in generated Angular code.

Note: In FLOW-00.2 v2, the field is StateArchitectureNotes (framework-neutral names).
AngularClientNotes was deprecated — stateHolderType replaces subjectType, etc.

**To change:** SK-417 decision reopening required.
**Registered:** 2026-03-22

---

## D-STACK-6 — SK-431 Pipeline Position (2026-03-22)

SK-431 StackCouplingAuditor runs as step 9 of the planning pipeline for ALL flows.
Rationale: a plan without stackCoupling annotation implicitly assumes node-nestjs only.
Single-stack plans (supportedServerStacks: ['node-nestjs']) produce minimal annotations —
V29–V31 pass trivially. Multi-stack plans get full annotation.

**To change:** SK-417 decision reopening required.
**Registered:** 2026-03-22

---

## D-STACK-7 — stackType is Open String; stackCategory is Closed Enum (2026-03-22)

**Context:** The previous design attempted to enumerate all stacks in a TypeScript
enum. WordPress, SAP ABAP, Joomla, a tenant's internal Go monolith, Salesforce APEX
are all legitimate deployment targets XIIGen has never seen. An enum breaks every
time a new platform emerges.

**Decision:**
- `stackType` is an **open string** — the tenant names their own stack.
  XIIGen ships well-known values for the 14 marketplace platforms and canonical
  server/client stacks. Any tenant can add their own without modifying XIIGen.

- `stackCategory` is a **closed enum** (22 values) — describes the KIND of
  technology. Drives which coupling dimensions are relevant. Never changes
  per-tenant. Examples: `design-platform-plugin`, `web-framework`, `cms-plugin`,
  `erp-extension`, `platform-service`, `custom`.

- `StackKey` is `"{stackType}:{side}"` — the map key.
  `side` is `server | client | platform | other`.
  No hardcoded top-level `server`/`client` keys. Platform entries are first-class.

**StackCategory closed values:**
```
design-platform-plugin  whiteboard-plugin  ecommerce-app  productivity-plugin
browser-extension  crm-extension  automation-node  payment-plugin
web-framework  cms-plugin  erp-extension  mobile-native  mobile-cross
desktop-native  client-spa  client-ssr  platform-service  sdk-package
build-tool  test-runner  ci-cd  custom
```

**Well-known stackType values (non-exhaustive):**
Server: `node-nestjs`, `node-nextjs`, `python-fastapi`, `php-laravel`,
        `php-wordpress`, `dotnet-aspnet`, `rust-axum`
Client: `react-web`, `angular`, `vue`, `react-native`, `android-kotlin`,
        `ios-swift`, `figma-plugin`, `canva-app`, `miro-app`, `shopify-polaris`,
        `wix-blocks`, `webflow-app`, `monday-sdk`, `google-workspace`,
        `framer-plugin`, `atlassian-forge`, `chrome-extension`, `n8n-node`,
        `stripe-app`, `salesforce-lwc`
Platform: `@xiigen/plugin-sdk`, `redis`, `firebase-fcm`, `aws-ses`,
          `jest`, `github-actions`, `webpack`, `gradle`, `xcode`
Custom:   anything the tenant names — requires `StackCapabilityDeclaration`

**To change:** SK-417 decision reopening required.
**Registered:** 2026-03-22

---

## D-STACK-8 — @xiigen/plugin-sdk is the Canonical Platform-Side Neutral Layer (2026-03-22)

**Context:** 65 marketplace plugins across 14 platform SDKs all need the same
things: auth, AI gateway access, usage tracking, freemium enforcement, brand kit
storage, dashboard bridge. These are pure XIIGen concerns — nothing about them
is specific to Figma, Canva, Miro, or any other host platform.

**Decision:**
- `@xiigen/plugin-sdk` is an npm package that every marketplace plugin imports.
- It implements auth (OAuth per platform), AI gateway (rate-limited proxy),
  usage tracker (per-user per-plugin counts), freemium gate, and dashboard bridge.
- It is registered as `"@xiigen/plugin-sdk:platform"` in every plugin's
  `TaskTypeStackCoupling.entries` map.
- Its tier is always `CONCEPT_NEUTRAL` — it is identical across all 65 plugins.
- It is the Layer 1 in the three-layer adapter architecture of FLOW-34.

**Architecture position:**
```
Layer 1 (@xiigen/plugin-sdk:platform) — CONCEPT_NEUTRAL — identical across all 65 plugins
  Auth, AI gateway, usage tracking, freemium gate, brand kit, dashboard bridge

Layer 2 (core engines) — IMPL_VARIES per plugin family
  CSS engine (Utility), Diagram Parser + AF Pipeline (FLOW),
  Workflow Generator (AUTO), Video Engine (VIDEO)

Layer 3 (platform adapter) — STACK_COUPLED per platform
  canva-adapter.ts, figma-adapter.ts, miro-adapter.ts, shopify-adapter.ts, ...
  This is what FLOW-34 generates.
```

**Consequence:** Any change to @xiigen/plugin-sdk affects all 65 plugins.
Blast radius assessment (SK-424) required before any modification.
The SDK is versioned independently of any plugin.

**C5 (Canva Text Elements Adapter) is the canonical example** of this three-layer
architecture in practice. See FLOW-34-REFERENCE-PLAN-v1.md.

**To change:** SK-417 decision reopening required.
**Registered:** 2026-03-22


---

## D-HIST Group — Historical RAG Decisions (Phase R5, 2026-04-19)

These 8 decisions were extracted from `docs/sessions/historyRag/` pass files,
per-flow `ARCHITECTURE-DECISIONS.json` files, `docs/decisions/`, and
`docs/architecture/` during the History RAG integration plan (Phase R0-R5,
2026-04-19). Each is proposed for permanent lock status. Luba approval is
required before any may be changed.

Source fixtures: `fixtures/rag-patterns/hist_arch_001`, `hist_arch_007`,
`hist_fd_017`, `hist_fd_026`; `fixtures/design-reasoning/historical/`
`hist_flow_flow03_d_03_1`, `hist_flow_flow03_d_03_4`,
`hist_flow_flow04_d_04_5`, `hist_adr_flow18_topology`.

---

## D-HIST-001 — Fabric-First: Interface + Factory + Skeleton Mandatory (2026-04-19)

Every external system dependency is introduced through three artifacts in order:
(1) Interface — abstract class in `fabrics/interfaces/` (`IDatabaseService`,
    `IAiProvider`, `IQueueService`, etc.);
(2) Factory — resolves to a concrete provider via `FactoryResolutionContext`;
(3) Skeleton — base class or stub that the Skill Factory generates concrete
    implementations from.

Generated services import only interface tokens (`DATABASE_SERVICE`, `AI_PROVIDER`,
etc.) via `@Inject()`. Provider SDKs (`@elastic/elasticsearch`, `@anthropic-ai/sdk`)
appear ONLY inside provider implementation files under `fabrics/*/providers/`. Never
in service code. The fabric layer is the single boundary where SDKs are permitted.

This invariant makes provider migration a configuration change, not a code change.
Violation: any `import { Client } from '@elastic/elasticsearch'` in a service file.
Detected by: FC-31, DNA compliance scan, BFA Phase A gate.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-002 — Idempotency SETNX at ORDER 1 Before Any Processing (2026-04-19)

All queue consumers that mutate state place a SETNX idempotency check at ORDER 1 —
before any business logic:

```typescript
// ORDER 1 — idempotency guard (MACHINE — never remove or reorder)
const alreadyProcessed = await this.cache.setIfAbsent(
  `idem:${event.id}`, 'processing', ttlSeconds
);
if (!alreadyProcessed.data) return DataProcessResult.success({ skipped: true });
// ORDER 2+ — business logic starts here
```

Queue delivery is at-least-once. Without SETNX at ORDER 1, every redelivery
produces duplicate state mutations (double charges, double registrations, double
points). SETNX must be first — not after any I/O — to prevent partial execution
on redelivery from producing partial duplicates.

`cycleBudget` for REGISTRATION archetype tasks = 3 (maximum). A lower budget risks
the model generating the sequential anti-pattern before the arbiter can reject it.

Detected by: NAMED_CHECK_IDEMPOTENCY in validate.handler.ts; score-0 in AF-9.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-003 — V39 Rule: 4 Artifacts per External System (2026-04-19)

For every external system dependency, the engine generates exactly 4 artifacts:
(1) Interface — abstract contract (`IEmailService`, `IPaymentGateway`, etc.);
(2) Factory — resolution via `IExternalServiceFactory<T>.createAsync(context)`;
(3) Base Skeleton — abstract class that generated implementations extend;
(4) Generated Implementation — concrete class produced by the Skill Factory.

The Skill Factory routes to implementations via factories. Generated code never
imports concrete providers directly. V39 was codified after finding 6 flows that
skipped the factory and called provider SDKs directly during FLOW-DESIGN-017 review.

Supplements D-HIST-001 (fabric-first principle) at the per-external-system level.
Detected by: V39 named check, BFA Phase A audit, FC-31 pattern scan.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-004 — BOLA: Tenant Scope via AsyncLocalStorage, Never Request Parameter (2026-04-19)

Tenant scoping is automatic via AsyncLocalStorage (ALS). `TenantContextMiddleware`
sets `TenantContext` in ALS on every request. All fabric providers read `tenantId`
from ALS internally. No service method accepts `tenantId` as a parameter.

This makes cross-tenant reads architecturally impossible by construction: no developer
can accidentally query another tenant's data because the tenant filter is applied
automatically by the fabric. Passing `tenantId` as a parameter creates a
caller-responsibility model where any caller can pass any tenantId — including forged.

Addresses OWASP API Top 1 (BOLA — Broken Object Level Authorization): manipulating
object IDs to access other tenants' data. ALS-automatic scoping makes this impossible
within XIIGen's service layer without a deliberate fabric override.

Detected by: DNA-5 scan, BOLA named check, scope isolation arbiter (SK-526 / FC-32).

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-005 — REGISTRATION Archetype: Atomic Single-Operation, cycleBudget=3 (2026-04-19)

The REGISTRATION archetype uses a single atomic operation. `registerAtomically()`
wraps both the capacity check and the registration write in one database transaction.
No separate `check()` then `create()` sequence is ever permitted.

The default model output is a sequential check-then-write (PROCESSING archetype).
This produces a race condition under concurrent requests: two users see capacity=1,
both pass the check, both write — capacity goes to -1. This is the canonical
REGISTRATION failure mode. It compiles, passes unit tests, and is a SILENT_FAILURE
in training data if the arbiter does not catch it at score-0.

Teaching point: "When you see 'check available then register', it is always a race
condition. The only safe pattern is `registerAtomically()`."

cycleBudget = 3 (maximum) for REGISTRATION archetype tasks.
DPO triple tagged `dpo-training-guard` (correctness-propagating).
Source: FLOW-03 ARCHITECTURE-DECISIONS.json D-03-1.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-006 — Best-Effort Observer: Catch Block Returns Success, Never Failure (2026-04-19)

Any task type that observes another task type's output (analytics tracking,
notification dispatch, audit logging, feed updates) is a best-effort observer.
The entire handler body is wrapped in try/catch. The catch block returns
`DataProcessResult.success({ operationName: false })` — never `DataProcessResult.failure()`.

```typescript
async handle(event: SomeEvent): Promise<DataProcessResult<ObserverResult>> {
  try {
    // ... observer logic ...
    return DataProcessResult.success({ tracked: true });
  } catch (err) {
    this.logger.warn('Observer failed — best-effort', { err });
    return DataProcessResult.success({ tracked: false }); // NEVER failure
  }
}
```

A failure result from an observer contaminates the DPO triple of the upstream task:
it transforms a successful business outcome into a failed training example, corrupting
the AI's learning signal for the correct upstream pattern.

DPO triple tagged `dpo-training-guard`. Cross-reference: D-02-BROAD-03 (FLOW-02
nudge best-effort), D-HIST-007 (SILENT_FAILURE), D-HIST-005 (REGISTRATION).
Source: FLOW-03 ARCHITECTURE-DECISIONS.json D-03-4.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-007 — SILENT_FAILURE: config.get() for MACHINE Constant = score-0 (2026-04-19)

When a named check prevents a SILENT_FAILURE (code that compiles, passes all tests,
but violates an architectural invariant), that check is `score-0` severity, not
`BUILD_FAILURE`. BUILD_FAILURE is for compilation errors. SILENT_FAILURE violations
require score-0 because the violation is invisible to standard testing.

Canonical example: a value declared in `machineConstants[]` with `neverFromConfig: true`.
The model generates `this.config.get('qr_token_ttl', 60)` — the code is functionally
correct but architecturally wrong. It must be scored 0 regardless of functional
correctness, because a tenant override of a security constant is the actual failure.

Correct form: `const QR_TOKEN_TTL_SECONDS = 60` — numeric literal in source, never
from config. `machineConstants` entry: `{ name: 'QR_TOKEN_TTL_SECONDS', neverFromConfig: true }`.

Teaching point: "Any named check that prevents a SILENT_FAILURE must be score-0
severity, not BUILD_FAILURE. BUILD_FAILURE is for compilation errors. SILENT_FAILURE
is for architecturally wrong code that compiles and passes tests."

DPO triple tagged `dpo-training-guard`. Governed by SK-441 SILENT_FAILURE protocol.
Source: FLOW-04 ARCHITECTURE-DECISIONS.json D-04-5.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-008 — Read-Path Extension Over Dual-Write for Guarded Services (2026-04-19)

When a service writes to its own index with carefully ordered guards (BOLA, OCC
optimistic concurrency, FLOW_IMMUTABLE), the correct approach to make that data
visible in other read paths is to extend the read path (add a fallback to the
reader) — not to dual-write (add a second write target in the existing service).

Dual-write forces identical guard ordering across two indices. Any future change to
the guard ordering must be applied twice, at different blast radii. OCC schemes
keyed to the original index become fragile when replicated.

The read-path extension is bounded: it touches only the reader (TopologyController)
and a new adapter. The writer's guard invariants remain single-sourced.

Locked: Option (b) — extend TopologyController bridge with additional fallback path.
`FlowCanvasWriterService` (T617) stays untouched; its BOLA + FLOW_IMMUTABLE guards
(CF-18-1) remain single-sourced in `xiigen-flow-canvases`.

Source: docs/decisions/ADR-USER-JOURNEY-RECONNECTION-INDEX-RECONCILIATION.md.
Cross-reference: D-PARALLEL-1 (immutable ranges — same single-source-of-guards principle).

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19
