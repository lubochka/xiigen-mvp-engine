# FLOW-DESIGN SKILL SET — INDEX & INTEGRATION GUIDE
## v3.1.0 — 2026-03-26 | +18 new skills (SK-492..SK-509), Layer 3 product lifecycle + Layer 4 self-awareness
## Works in: Claude.ai Project (web sessions) AND Claude Code (execution)

---

## WHAT CHANGED IN v3.1.0

Source: Product vision gap analysis (20 gaps) + self-extension analysis (5 skills)

| Change | What it adds |
|--------|-------------|
| NEW SK-492 | requirement-to-flow: UML/spec → flow list, task types, dependency order |
| NEW SK-493 | product-scope-validation: post-wave product intent validation |
| NEW SK-494 | domain-event-design: naming, payload, versioning, consumer limit (≤5) |
| NEW SK-495 | cross-cutting-service: service appearance counting, 3 sharing patterns |
| NEW SK-496 | service-boundary-design: UML service → task type mapping principles |
| NEW SK-497 | algorithm-as-service: ranking/matching/scoring as ALGORITHM archetype |
| NEW SK-498 | event-driven-debugging: cross-service event trace, 3-step isolation protocol |
| NEW SK-499 | user-journey-acceptance-testing: E2E scenario from UML sequence diagrams |
| NEW SK-500 | data-flow-integrity: output schema of service N vs input of service N+1 |
| NEW SK-501 | multi-service-local-dev: minimum running set, seed data, event mock |
| NEW SK-502 | feature-prioritization: business value × dependency multiplier × infra cost |
| NEW SK-503 | temporal-behavior-design: time-delta state machines, phase transitions |
| NEW SK-504 | shared-infrastructure-design: cache/ML/search across flows |
| NEW SK-505 | capability-state-reader: query own manifest before any extension session |
| NEW SK-506 | gap-to-proposal: CONVENTION→ADAPTATION→EXTENSION→NEW FLOW ladder for engine gaps |
| NEW SK-507 | implementation-integrity: verify gap closed, guard installed, no new gaps |
| NEW SK-508 | training-data-gap-audit: remediate triples from gap window |
| NEW SK-509 | extension-session-type: SELF-EXTENSION as formal session type |
| LAYER ADDED | Layer 3 — Product Lifecycle (SK-492..SK-504) |
| LAYER ADDED | Layer 4 — Engine Self-Awareness (SK-505..SK-509) |

---

## LAYER MAP (complete — 4 layers)

```
Layer 1 — ENGINE INTERNALS (SK-426..SK-470, 47 skills)
  How the AF pipeline works, flows, session governance.
  STATUS: Complete.

Layer 2 — ENGINE LIFECYCLE (SK-471..SK-491, 21 skills)
  Score interpretation, PromptPatch, test triage, code review.
  STATUS: Complete (v3.0.0).

Layer 3 — PRODUCT LIFECYCLE (SK-492..SK-504, 13 skills)   ← NEW v3.1.0
  UML→flows, event design, service boundaries, QA, local dev.
  STATUS: HIGH-urgency complete (SK-492..SK-499).
          MEDIUM-urgency complete (SK-500..SK-504).

Layer 4 — ENGINE SELF-AWARENESS (SK-505..SK-509, 5 skills) ← NEW v3.1.0
  Capability state, gap detection, extension session governance.
  STATUS: Complete.
```

---

## NEW SKILL TABLE — v3.1.0

### Layer 3 — Product Lifecycle (HIGH urgency, SK-492..SK-499)
*Run before first customer product*

| File | SK | Category | Load | When |
|------|----|----------|------|------|
| `planning--requirement-to-flow-SKILL.md` | SK-492 | planning | 0 | New product planning; UML to flows |
| `planning--product-scope-validation-SKILL.md` | SK-493 | planning | 99 | After each wave is ACTIVE |
| `planning--domain-event-design-SKILL.md` | SK-494 | planning | 1 | Before any event schema is defined |
| `planning--cross-cutting-service-SKILL.md` | SK-495 | planning | 0 | During SK-492 decomposition; before Wave 1+ design |
| `planning--service-boundary-design-SKILL.md` | SK-496 | planning | 1 | When mapping UML services to task types |
| `planning--algorithm-as-service-SKILL.md` | SK-497 | planning | 1 | Any ranking/matching/scoring task type |
| `code-execution--event-driven-debugging-SKILL.md` | SK-498 | code-execution | 0 | Cross-service failure with event chain |
| `qa--user-journey-acceptance-testing-SKILL.md` | SK-499 | qa | 99 | Before claiming wave deliverable |

### Layer 3 — Product Lifecycle (MEDIUM urgency, SK-500..SK-504)
*Run before Wave 2 parallel execution*

| File | SK | Category | Load | When |
|------|----|----------|------|------|
| `qa--data-flow-integrity-SKILL.md` | SK-500 | qa | 99 | After any wave completes |
| `code-execution--multi-service-local-dev-SKILL.md` | SK-501 | code-execution | 0 | Before Phase B of any Wave 1+ flow |
| `planning--feature-prioritization-SKILL.md` | SK-502 | planning | 0 | When >3 flows are unblocked simultaneously |
| `planning--temporal-behavior-design-SKILL.md` | SK-503 | planning | 1 | Any time-delta state machine service |
| `planning--shared-infrastructure-design-SKILL.md` | SK-504 | planning | 0 | Before designing shared fabric interfaces |

### Layer 4 — Engine Self-Awareness (SK-505..SK-509)

| File | SK | Category | Load | When |
|------|----|----------|------|------|
| `self--capability-state-reader-SKILL.md` | SK-505 | self | -2 | Start of every SELF-EXTENSION session |
| `self--gap-to-proposal-SKILL.md` | SK-506 | self | 0 | After SK-505 detects MISSING capability |
| `self--implementation-integrity-SKILL.md` | SK-507 | self | 99 | After capability extension completes |
| `self--training-data-gap-audit-SKILL.md` | SK-508 | self | 99 | After SK-507 confirms integrity |
| `self--extension-session-type-SKILL.md` | SK-509 | self | -2 | Session type reference for self-extension |

---

## ALL PRIOR SKILLS — unchanged from v3.0.0

(SK-426..SK-491 table unchanged — see v3.0.0 for full listing)

---

## UPDATED GAP TABLE — v3.1.0 additions

| Gap | Description | Status |
|-----|-------------|--------|
| Gap 54 | No skill for UML/spec → flow decomposition | RESOLVED — SK-492 |
| Gap 55 | No skill for post-wave product intent validation | RESOLVED — SK-493 |
| Gap 56 | 50+ domain events with no design discipline | RESOLVED — SK-494 |
| Gap 57 | Feed/Notification appear in 5-7 UMLs — no shared service identification | RESOLVED — SK-495 |
| Gap 58 | UML service → task type mapping made by judgment each time | RESOLVED — SK-496 |
| Gap 59 | 5 distinct algorithm services with no design pattern | RESOLVED — SK-497 |
| Gap 60 | Cross-service event chain failure has no debug protocol | RESOLVED — SK-498 |
| Gap 61 | User journey E2E validation absent ("all services pass, platform broken") | RESOLVED — SK-499 |
| Gap 62 | Data flow integrity across 8-service chains unverified | RESOLVED — SK-500 |
| Gap 63 | Local dev with upstream service dependencies unguided | RESOLVED — SK-501 |
| Gap 64 | Flow build order when business priority conflicts with dependency order | RESOLVED — SK-502 |
| Gap 65 | Time-delta state machines have no archetype or design pattern | RESOLVED — SK-503 |
| Gap 66 | Shared cache/ML/search design not distinguished from per-flow services | RESOLVED — SK-504 |
| Gap 67 | Engine cannot query its own capability state | RESOLVED — SK-505 |
| Gap 68 | Capability gaps require human to detect and classify | RESOLVED — SK-506 |
| Gap 69 | Capability sessions don't verify closure or guard installation | RESOLVED — SK-507 |
| Gap 70 | Training data from gap windows accumulates without remediation | RESOLVED — SK-508 |
| Gap 71 | Self-extension has no formal session type — happens ad hoc | RESOLVED — SK-509 |

---

## SKILL ACTIVATION ADDITIONS — v3.1.0

### Product planning (new triggers for Layer 3)

```
Before any new product planning session:
  SK-492 requirement-to-flow           ← first step for every new product
  SK-495 cross-cutting-service         ← inside SK-492, before Wave 1+ design

Before any event schema is defined:
  SK-494 domain-event-design           ← naming, payload, consumer limit

When UML service → task type mapping:
  SK-496 service-boundary-design       ← merge/split principles

Any ranking, matching, scoring task type:
  SK-497 algorithm-as-service          ← ALGORITHM archetype design

Any time-delta state machine service:
  SK-503 temporal-behavior-design      ← phase boundaries, scheduler use

When ≥3 flows are unblocked simultaneously:
  SK-502 feature-prioritization        ← value × dependency × infra cost

Before designing shared fabric interfaces:
  SK-504 shared-infrastructure-design  ← cache/ML/search design protocol

Before Phase B of any Wave 1+ flow:
  SK-501 multi-service-local-dev       ← minimum running set + seed data

After any wave reaches ACTIVE:
  SK-493 product-scope-validation      ← business outcome verification
  SK-499 user-journey-acceptance-testing ← E2E scenario validation
  SK-500 data-flow-integrity           ← schema chain verification

Cross-service failure with event chain:
  SK-498 event-driven-debugging        ← trace, isolate, identify

SELF-EXTENSION session:
  SK-509 extension-session-type        ← session type governance
  SK-505 capability-state-reader       ← step 1: read state
  SK-506 gap-to-proposal               ← step 2: classify + propose
  (⛔ STOP — await approval)
  SK-507 implementation-integrity      ← step 4: verify closure
  SK-508 training-data-gap-audit       ← step 5: remediate triples
```

---

## FILE INVENTORY (v3.1.0 complete — 86 skill files)

**New in v3.1.0 (18 skills):**
Layer 3 HIGH: SK-492..SK-499 (8 files, planning + code-execution + qa categories)
Layer 3 MEDIUM: SK-500..SK-504 (5 files, qa + code-execution + planning categories)
Layer 4: SK-505..SK-509 (5 files, self category)

**All prior skills:** SK-426..SK-491 (68 files, unchanged from v3.0.0)

---

## NEXT AVAILABLE SK NUMBER

After v3.1.0: **SK-510**
