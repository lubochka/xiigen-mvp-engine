# Adaptation Plan — TYPE-A FREEDOM-config — FLOW-03 event-management

**Protocol:** FLOW-PORTABILITY-TEST-PROTOCOL-v1.2 (AI Adaptation Protocol Phase 2)
**Skill:** SK-553 flow-portability-test-protocol v1.0.0
**Session:** PLANNING phase for FLOW-03 portability — **v0.2 EXPANDED SCOPE**
**Scope directive (2026-04-23 verbatim):** "Ok - no tech dept, no pre existing - all need to be fixed"
**Adapter tenant:** `acme-pro-members` (re-used from FLOW-01/02 for cross-flow coherence)
**Date:** 2026-04-23

---

## 1. Adaptation summary

Four FREEDOM keys overridden in the acme tenant's config store. Each key is
read via `IFreedomConfigService` inside a FLOW-03 service; the override produces
tenant-observable behavior divergence that Layer 1 + Layer 2 + Layer 3 will prove.

| Key | Default (per contracts) | acme override (proposed) | Observable outcome |
|-----|-------------------------|--------------------------|---------------------|
| flow03_max_events_per_organizer | (read at P2) | 3 | acme organisers can create max 3 events/month; 4th returns RATE_LIMIT_EXCEEDED |
| flow03_max_attendees | (read at P2) | 10 | acme events default to capacity=10 unless organiser sets explicit cap |
| flow03_waitlist_max_size | (read at P2) | 5 | acme waitlist caps at 5; beyond that → WAITLIST_FULL |
| flow03_promotion_channels | (read at P2) | `["in-app"]` | acme disables push/email/sms for event promotion |

Defaults will be **read at the start of Phase 2** from the contracts file so the
divergence claim is precise. The above values are the *acme overrides*; the
divergence is `default → acme-value` for each key.

---

## 2. Files affected

### Production code
**NONE.** This adaptation is a **TYPE-A parametric change** — the service code
already reads these keys. No TypeScript changes; no service changes.

### New test artifacts (Layer 1)
- `server/test/event-management/phase-03-adaptation-freedom-config.spec.ts`
  - 5 tests (FC-ADAPT-1..FC-ADAPT-5) analog to FLOW-02 precedent:
    - FC-ADAPT-1: `flow03_max_events_per_organizer = 3` → 4th creation returns RATE_LIMIT_EXCEEDED
    - FC-ADAPT-2: `flow03_max_attendees = 10` → registration 11 returns WAITLIST (or WAITLIST_FULL when combined with -3)
    - FC-ADAPT-3: `flow03_waitlist_max_size = 5` → waitlist 6 returns WAITLIST_FULL
    - FC-ADAPT-4: `flow03_promotion_channels = ["in-app"]` → NotificationsSent.channels === ['in-app']; no push/email
    - FC-ADAPT-5: **tenant-isolation proof** — acme override does NOT leak into default tenant context; default tenant retains platform defaults

### New adapter artifacts (Phase 2)
- `docs/portability/flow-03/tenant-profile-acme-pro-members.json`
  - Tenant id, tenant display name, 4 FREEDOM overrides, cross-flow reference to FLOW-02 tenant
  - Analogue to `docs/portability/flow-02/tenant-profile-acme-pro-members.json` (re-used or new depending on Luba's choice of sub-tenant)

### New Playwright artifacts (Phase 3)
- `client/e2e/event-management-tenant-isolation.spec.ts`
  - 5 tests (I-01..I-05) analog to FLOW-02 precedent:
    - I-01: two browser contexts carry their own tenant ID (no cross-read)
    - I-02: acme context renders EventListPage scoped to its own events
    - I-03: default context does NOT see acme event titles in the list
    - I-04: clearing acme storage leaves default storage untouched
    - I-05: EventCreationPage wizard initial state renders per-tenant with isolated seeds
  - **Anchor PNGs saved to** `docs/portability/flow-03/visual-evidence/phase-03-tenant-isolation/`

### New visual-evidence artifacts (Phase 4)
- `docs/design-context/event-management/.impeccable.md` (Gap-FLOW-03-A closure)
- `docs/portability/flow-03/visual-evidence/SK549-COVERAGE.json` (7-axis cells)
- `docs/portability/flow-03/visual-evidence/FC-18-AUDIT-TRAIL.md`

### Final artifacts (Phases 5-6)
- `docs/portability/flow-03/ADAPTATION-CHANGELOG.md`
- Updated `docs/portability/flow-03/FLOW-03-PORTABILITY-STATE.json` with
  Q4 binary 7/7 TRUE at session close

---

## 3. Tests that verify the change

### Layer 1 (Jest) — 5 tests

```typescript
// server/test/event-management/phase-03-adaptation-freedom-config.spec.ts
describe('FLOW-03 FREEDOM-config adaptation — acme-pro-members', () => {
  it('FC-ADAPT-1: organiser rate limit divergence — acme=3 vs default (from contracts)', async () => {
    // Sets up acme tenant context, creates 3 events (success), 4th returns RATE_LIMIT_EXCEEDED.
    // Domain assertion: result.errorCode === 'RATE_LIMIT_EXCEEDED'
  });

  it('FC-ADAPT-2: capacity divergence — acme default max_attendees=10', async () => {
    // Organiser creates event without explicit capacity.
    // Stored capacity === 10 (acme default), not the platform default.
  });

  it('FC-ADAPT-3: waitlist cap divergence — acme max=5', async () => {
    // Fill event to capacity, fill waitlist to 5, 6th registration returns WAITLIST_FULL.
  });

  it('FC-ADAPT-4: promotion channel pruning — acme = in-app only', async () => {
    // Trigger promotion; NotificationsSent.channels === ['in-app']; no push/email.
  });

  it('FC-ADAPT-5: tenant isolation — default tenant unaffected by acme overrides', async () => {
    // Default tenant creates 5 events (succeeds — platform default > 3).
    // Default tenant's event caps === platform default, not acme's 10.
  });
});
```

### Layer 2 (Playwright) — 5 tests

```typescript
// client/e2e/event-management-tenant-isolation.spec.ts
// Two browser contexts; each addInitScript seeds its own tenantId + tenant-specific event fixtures.
// Then navigates to /events and verifies per-tenant rendering.
// Anchor PNGs captured for I-02, I-03, I-05 cells.
```

### Layer 3 (SK-549 7-axis visual) — UI/UX agent

Minimum cells per FLOW-PORTABILITY-TEST-PROTOCOL-v1.2:

| Cell | Route | Role | Lang | State | Viewport |
|------|-------|------|------|-------|----------|
| C1 | /events (EventListPage) | tenant-user | en | empty | 1280px |
| C2 | /events | tenant-user | en | populated | 1280px |
| C3 | /events | tenant-user | en | error (API 500) | 1280px |
| C4 | /events | tenant-user | **he-RTL** | populated | 1280px |
| C5 | /events | tenant-admin | en | populated | 1280px |
| C6 | /events | tenant-user | en | populated | **375px mobile** |
| C7 | /events | tenant-user | en | populated | **768px tablet** |
| W1 | /events/create | tenant-user | en | step-1-details | 1280px |
| W2 | /events/create | tenant-user | en | step-2-tickets | 1280px |
| W3 | /events/create | tenant-user | en | step-3-promotion | 1280px |
| W4 | /events/create | tenant-user | en | step-4-publish | 1280px |
| W5 | /events/create | tenant-user | **he-RTL** | step-1-details | 1280px |
| W6 | /events/create | tenant-user | en | step-1-details | **375px mobile** |

**Minimum 13 cells** (7 for EventListPage + 6 for EventCreationPage wizard
coverage — 4 wizard steps + 1 RTL + 1 mobile). SK-549 7-axis per cell; Axis D
(business-logic state) MANDATORY per protocol v1.2 (FLOW-03 is NEEDS_PURPOSE_BUILT_UI).

---

## 4. Five-requirement DoD (FLOW-PORTABILITY-TEST-PROTOCOL-v1.2)

| Req | Criterion | Planned evidence |
|-----|-----------|------------------|
| R1 Decoupling | Services construct without NestJS DI + DNA scan clean | Jest passes; `@connectionType FLOW_SCOPED` added via P1.5 (Gap-FLOW-03-B closed 4/4); SK-418 re-run P-1..P-5 all PASS |
| R2 Fork with code | `ForkFlowHandlerService` runs | **PROVEN at TIER-D workspace level** — P1.7 writes server/src/engine/flows/event-management/package.json; P2 writes circular-install spec that boots FLOW-03 services via the package resolver (not root DI), confirming the workspace-level cold-boot proof. External registry publish (npm public, GitHub release) remains deferred-to-Sprint-B infra work, explicitly called out in changelog. |
| R3 AI adaptation | Adaptation surface + TYPE-A override + visual evidence at each cascade point | adaptation-surface.json (this plan's sibling); tenant-profile-acme-pro-members.json; 5 Jest tests; SK-549 verdicts on 13+ cells |
| R4 Independent test | N/N tests pass in fork repo (simulated via workspace isolation for TIER-D) | Jest + Playwright green; circular-install spec boots FLOW-03 standalone (no FLOW-04 services present) |
| R5 Cascade (visual) | SK-549 PASS on minimum cell matrix | 13+ cells PASS all 7 axes |

**All five requirements targeted as MET in this session** per 2026-04-23 directive.
R2 is proven at workspace level (sufficient for TIER-D per protocol v1.2); the
narrower Sprint-B-class work (npm publish, GitHub release automation, CI infra)
is explicitly named as non-blocking for FLOW-03's own decoupling correctness.

---

## 5. Four-axis review (Fabric / DNA / Tenant / Visual)

Run at each Phase close (P2, P3, P4, P5). All four must PASS before P6 commit.

### Fabric-First
- **Gate:** `grep '^import.*@elastic|@aws-sdk|stripe|openai|@anthropic|bull|kafka'`
  on all generated test specs and tenant-profile JSON.
- **Expected:** 0 hits.
- **Applies to:** phase-03-adaptation-freedom-config.spec.ts, event-management-tenant-isolation.spec.ts, tenant-profile-*.json.

### Genie-DNA
- **Gate:** SK-418 v1.1 dna-compliance-guard on every touched test file.
- **Expected:** 0 violations across DNA-1..DNA-9 + P-1..P-5.
- **Applies to:** test specs (DNA-3 DataProcessResult, DNA-5 tenantId via ALS, DNA-7 idempotency, DNA-8 outbox order, DNA-9 CloudEvents envelope on emitted event assertions).

### Tenant-Separation ("keys are never in dev")
- **Gate:** grep `sk-ant-|sk-proj-|ghp_|AIzaSy|pcsk_|AKIA` across session diff; grep `process\.env` in generated spec files (INTEGRATION_TEST/TEST_TENANT_ID permitted).
- **Expected:** 0 hits on secret patterns; 0 hits on process.env tenant config reads.
- **Applies to:** everything Luba commits.

### Visual-Validation
- **Gate:** SK-549 7-axis per cell; agent returns verdict table + COVERAGE JSON; PNGs NEVER in chat (BC-001).
- **Expected:** 13+ cells PASS all 7 axes (Axis D mandatory).
- **Applies to:** Phase 4 deliverables.

---

## 6. Scope decisions (locked per 2026-04-23 directive)

Q-2, Q-3 answered by directive "no tech debt, no pre-existing — all need to be fixed":

- **Q-1 Tenant choice:** `acme-pro-members` — re-used from FLOW-01/02 for cross-flow coherence. Default recommendation; no objection received.
- **Q-2 Gap-FLOW-03-B P-2 JSDoc:** **IN-SESSION CLOSURE** via Phase P1.5 (pre-GENERATION MAINTENANCE). 4 service files get `@connectionType FLOW_SCOPED / @flowId FLOW-03 / @portability MOBILE` banner.
- **Q-3 Gap-FLOW-03-C circular-install test:** **IN-SESSION CLOSURE** split across P1.7 (package.json with `requiredCoInstalls: []`) and P2 (circular-install spec boots FLOW-03 services standalone). The cross-flow FLOW-03\u2194FLOW-04 two-directional scenario remains FLOW-04's session scope by protocol (portability unit = single flow).
- **Q-4 FREEDOM key count:** 4 keys (max_events_per_organizer, max_attendees, waitlist_max_size, promotion_channels) + FC-ADAPT-5 tenant isolation. Analytics keys excluded (profile 3 / deep-internal).
- **Also locked — Gap-FLOW-03-D IMPL-STATE debt:** **IN-SESSION CLOSURE** via Phase P1.6 (pure doc-state edit of FLOW-03-IMPL-STATE.json to remove FLOW-04-owned services from FLOW-03 phase scope; handoff note for FLOW-04 portability session).

---

## 7. Phase execution plan (post-approval)

```
PLANNING (this response, v0.2 expanded scope)              \u2190 STATUS: AWAITING APPROVAL
  STATE.json + STEP-1-INVARIANTS + adaptation-surface + adaptation-plan

\u26d4 STOP — GENERATION approval required before any code touched

P1.5 GENERATION — MAINTENANCE pre-flight (Gap-FLOW-03-B closure)
  Add @connectionType FLOW_SCOPED / @flowId FLOW-03 / @portability MOBILE JSDoc
  above all 4 @Injectable() service classes
  VERIFY: 4/4 annotated; SK-418 P-2 sub-check PASS; `npx tsc --noEmit` = 0 errors;
          existing event-management jest suite still passes (105 it-blocks)
  Commit: "FLOW-03 portability v1.0.1 — P-2 connectionType annotations (Gap-B closed)"

P1.6 GENERATION — MAINTENANCE pre-flight (Gap-FLOW-03-D closure)
  Edit docs/sessions/FLOW-03/FLOW-03-IMPL-STATE.json: remove FLOW-04-owned services
  from FLOW-03 phase scope (PHASE-2A..2E event-attendance/, rsvp-orchestrator/,
  waitlist-manager/, check-in-orchestrator/, presence-counter/ entries); append
  handoff-note for FLOW-04 portability session
  VERIFY: diff shows only FLOW-04-owned moves; no code touched
  Commit: "FLOW-03 portability v1.0.2 — IMPL-STATE D-3 reconciliation (Gap-D closed)"

P1.7 GENERATION — MAINTENANCE pre-flight (Gap-FLOW-03-C part 1)
  Create server/src/engine/flows/event-management/package.json with
  { name: '@xiigen/event-management', version: '1.0.0', requiredCoInstalls: [] }
  VERIFY: package.json present; `npm workspaces` resolves; tsc unchanged
  Commit: "FLOW-03 portability v1.0.3 — requiredCoInstalls declaration (Gap-C part 1)"

P2 GENERATION — Layer 1 FREEDOM-config adaptation + circular-install spec
  Write: server/test/event-management/phase-03-adaptation-freedom-config.spec.ts (5 tests)
         server/test/event-management/phase-03-circular-install.spec.ts (Gap-C part 2)
         docs/portability/flow-03/tenant-profile-acme-pro-members.json
  Run: npx jest server/test/event-management/phase-03-*.spec.ts
  Expected: 5 FC-ADAPT-1..5 pass; circular-install boot test passes; tsc 0 errors;
            existing event-management jest still passes
  Record 4-axis verdicts in STATE.json
  Commit: "FLOW-03 portability v1.0.4 — Layer 1 FREEDOM adaptation + circular-install (Gap-C part 2)"

P3 GENERATION — Layer 2 Playwright tenant-isolation
  Write: client/e2e/event-management-tenant-isolation.spec.ts (5 tests I-01..I-05)
  Run: npx playwright test client/e2e/event-management-tenant-isolation.spec.ts
  Expected: 5/5 pass; 4 anchor PNGs captured to visual-evidence/phase-03-tenant-isolation/
  Record 4-axis verdicts
  Commit: "FLOW-03 portability v1.0.5 — Layer 2 Playwright tenant isolation"

P4 GENERATION (delegated) — Layer 3 SK-549 visual + Gap-A closure
  Step 0: Close Gap-FLOW-03-A (write .impeccable.md via SK-540 Step 1b extraction)
  Step 1: Delegate to UI/UX agent — SK-549 7-axis across 13+ cells (C1..C7 + W1..W6)
  Step 2: Collect verdicts + SK549-COVERAGE.json + FC-18-AUDIT-TRAIL.md
  Any BLOCK verdict \u2192 fix via code edit \u2192 re-audit loop
  Record 4-axis verdicts
  Commit: "FLOW-03 portability v1.0.6 — Layer 3 SK-549 visual validation (Gap-A closed)"

P5 — ADAPTATION-CHANGELOG + 5-req DoD
  Write: docs/portability/flow-03/ADAPTATION-CHANGELOG.md
  All 5 reqs MET (R2 proven at workspace-level); 4 gap-closure blocks
  Commit: "FLOW-03 portability v1.0.7 — ADAPTATION-CHANGELOG + 5-req DoD"

P6 — Finalize STATE.json + commit + push
  Mark Q4 binary 12/12 TRUE
  portabilityStatus: "MOBILE" + tenantReadyStatus: "FULLY_CERTIFIED"
  portabilityGaps: [] (all closed)
  Push to claude/vigorous-margulis (per feedback_push_on_commit — push after commit)
```

---

## 8. Rollback plan

All planning artifacts are new files under `docs/portability/flow-03/`. If
planning rejected: delete the folder; no impact on existing code or tests.

All GENERATION artifacts (post-approval) are additive: new test specs, new
tenant-profile JSON, new visual-evidence. Deletion restores baseline.

Pre-flight Gap-FLOW-03-B (JSDoc additions) is reversible: revert the 4 service
files via `git checkout HEAD -- server/src/engine/flows/event-management/`.

---

**PLAN STATUS: v0.2 EXPANDED SCOPE — AWAITING GENERATION APPROVAL**

**Next action (on explicit "proceed"):** Execute P1.5 \u2192 P1.6 \u2192 P1.7 \u2192 P2 \u2192 P3 \u2192
P4 \u2192 P5 \u2192 P6 per the execution plan above. Pulse every 3 minutes during long runs.
Commit + push after every phase. No middle approvals per feedback_phase_gate_autopilot
unless an architectural or product concern arises.
