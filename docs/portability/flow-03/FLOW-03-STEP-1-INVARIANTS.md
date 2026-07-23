# FLOW-03 — STEP 1: PORTABILITY INVARIANTS (Phase F append)

## Status: PLANNING — extends existing docs/sessions/FLOW-03/FLOW-03-STEP-1-INVARIANTS.md
## Skills loaded: SK-553 flow-portability-test-protocol v1.0.0, SK-418 dna-compliance-guard v1.1.0
## Guide version: FLOW-PORTABILITY-TEST-PROTOCOL-v1.2 + FLOW-DOCUMENT-AUTHORING-GUIDE v1.18
## Date: 2026-04-23

---

## SCOPE

This file extends the existing STEP-1-INVARIANTS (docs/sessions/FLOW-03/) with a
**Phase F — Portability** block required by SK-553. The DNA-1..DNA-9 invariants
from the base STEP-1 carry forward; this file adds the 5 portability invariants
(P-1..P-5) and the cross-flow surface.

---

## PHASE F — PORTABILITY INVARIANTS (P-1..P-5)

| # | Invariant | FLOW-03 baseline | Target (session close) | Remediation path |
|---|-----------|------------------|------------------------|------------------|
| P-1 | No ClsService imports / @Inject / runtime use | **PASS** (0 hits) | PASS (0 hits) | None required |
| P-2 | `@connectionType FLOW_SCOPED` JSDoc on every service class | **GAP** (0/4) | **PASS (4/4)** | Phase P1.5 in-session: JSDoc banner on 4 service files (Gap-FLOW-03-B closure) |
| P-3 | FREEDOM keys prefixed `flow03_` (or namespaced) | **PASS** (6/6) | PASS (6/6) | Optional template-literal type narrowing — not required for TIER-D |
| P-4 | No local clones of fabric interfaces | **PASS** (0 clones) | PASS (0 clones) | None required |
| P-5 | `requiredCoInstalls` declaration for cross-flow dependencies | **GAP_INFORMATIONAL** (no package.json) | **PASS** (package.json + circular-install spec) | Phase P1.7 in-session: write server/src/engine/flows/event-management/package.json with `requiredCoInstalls: []`. Phase P2 in-session: write phase-03-circular-install.spec.ts that boots FLOW-03 services without FLOW-04 present (Gap-FLOW-03-C closure) |

---

## FREEDOM KEY CATALOG (Phase F — adaptation surface)

```
flow03_max_events_per_organizer        — EventCreationOrchestrator  — CF-03-rateLimit — profile 2 — TYPE-A, TYPE-D
flow03_max_attendees                    — EventRegistrationManager   — CF-03-capacity  — profile 2 — TYPE-A
flow03_waitlist_max_size                — EventRegistrationManager   — CF-03-waitlist  — profile 2 — TYPE-A, TYPE-D
flow03_promotion_channels               — EventPromotionEngine       — CF-03-channels  — profile 2 — TYPE-A, TYPE-B
flow03_analytics_counter_ttl            — EventAnalyticsTracker      — CF-03-analytics — profile 3 — TYPE-A
flow03_campaign_engagement_threshold    — EventAnalyticsTracker      — CF-03-analytics — profile 2 — TYPE-A
```

**Profile key:** 1=strictly per-tenant (secret-grade), 2=per-tenant tunable
(business-tunable), 3=platform default (rare per-tenant override).

**Adaptation types per FLOW-PORTABILITY-TEST-PROTOCOL-v1.2 Phase 2 table:**
- TYPE-A parametric: change a key value
- TYPE-B grammar: change UI grammar (CARD_LIST → TIMELINE, G5 wizard steps, etc.)
- TYPE-C role scope: add/remove role branch
- TYPE-D edge case: invalid-input fallback behavior

---

## CROSS-FLOW SURFACE (Phase F — P-5 analysis)

### Reads from other flows

- **FROM FLOW-02 (profile-enrichment):** NO direct index reads. FLOW-03 does NOT
  read `xiigen-user-profiles` or FLOW-02 FREEDOM keys.
- **FROM FLOW-04 (event-attendance):** NO direct index reads. FLOW-03 does NOT
  read from FLOW-04 data stores.

### Writes consumed by other flows

- **TO FLOW-04:** FLOW-03 emits `EventCreated`, `TargetAudienceIdentified`,
  `FeedsUpdated`, `PromotionCampaignCompleted`. FLOW-04 consumes `EventCreated`
  (into RSVPOrchestrator + WaitlistManager) via the queue fabric.
  **Contract:** CloudEvents envelope per DNA-9; no direct index-read cross-flow.

### requiredCoInstalls declaration

FLOW-03 runs standalone for its own services. FLOW-04 requires FLOW-03
(since FLOW-04 attendance subscribes to FLOW-03's EventCreated). The reverse
relationship (FLOW-03 requires FLOW-04) exists only for the CIRCULAR scenario
where FLOW-03 observability dashboards surface FLOW-04 RSVP counts — this
integration is OPTIONAL and deferred per Gap-FLOW-03-C.

Current session (v0.2 expanded scope): declares `requiredCoInstalls: []` in
FLOW-03 package.json via Phase P1.7 (empty — FLOW-03 stands alone for its 4
services). FLOW-04 portability session will declare `requiredCoInstalls:
['@xiigen/event-management']`. FLOW-03's standalone-boot runtime test runs
in Phase P2 (Gap-FLOW-03-C closure); it proves FLOW-03 has no silent reverse
dependency on FLOW-04. The cross-flow FLOW-03\u2194FLOW-04 two-directional
scenario remains FLOW-04's session scope by protocol definition.

---

## SUCCESS CRITERIA (portability-specific — extends base STEP-1)

A FLOW-03 portability session is successful when ALL of:

1. P-1 through P-5 all PASS (or CARRY-FORWARD with documented rationale)
2. Every FREEDOM key in the catalog above has `semantics`, `irCitation`,
   `profile`, `adaptationTypes` populated in `adaptation-surface-event-management.json`
3. Tenant profile JSON exists with ≥1 FREEDOM override that produces
   tenant-observable behavior divergence (Layer 1 test proves this)
4. Tenant isolation holds: tenant-A event data never visible to tenant-B
   queries; FREEDOM overrides scoped to tenant ALS context
5. 4-axis review passes: Fabric-First + Genie-DNA + Tenant-Separation + Visual-Validation
6. Visual evidence captured per SK-549 7-axis for 2 React pages (EventListPage + EventCreationPage)
7. ADAPTATION-CHANGELOG committed with 5-req DoD verdicts per protocol v1.2

---

## STATE WRITE

```
portabilityPhase           → "Phase F — Portability Invariants (v0.2 expanded)"
p1ClsService               → "PASS (0 hits)"
p2ConnectionType           → "GAP (0/4) @ baseline → TARGET PASS (4/4) @ P1.5 close — Gap-FLOW-03-B"
p3FreedomScoping           → "PASS (6/6 flow03_ prefix)"
p4LocalInterfaceClones     → "PASS (0)"
p5RequiredCoInstalls       → "GAP_INFORMATIONAL @ baseline → TARGET PASS @ P1.7 + P2 close — Gap-FLOW-03-C (package.json + circular-install spec IN-SESSION)"
adaptationSurfaceKeyCount  → 6 (4 chosen for Layer 1)
crossFlowReadCount         → 0
crossFlowEmitTargets       → ["FLOW-04"]
stepStatus                 → "PLANNING_COMPLETE_PENDING_GENERATION_APPROVAL"
scopeDirective             → "no tech debt, no pre-existing — all 4 gaps IN_SCOPE"
```

---

**PHASE F INVARIANTS COMPLETE — awaiting plan approval before GENERATION**
