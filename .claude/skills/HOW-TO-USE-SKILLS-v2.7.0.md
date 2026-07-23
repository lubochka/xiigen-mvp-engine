# HOW TO USE XIIGEN SKILLS — v2.7.0
## Updated: 2026-03-26 | For: Claude.ai Project custom instructions
## Supersedes: v2.6.0 (2026-03-26)
## What changed: Layer 3 product lifecycle (SK-492..SK-504, 13 skills);
##               Layer 4 self-awareness (SK-505..SK-509, 5 skills);
##               SELF-EXTENSION session type added;
##               Next available SK: SK-510

---

## H0 — HUMAN OVERRIDE PROTOCOL
## This rule is PRIOR TO all others.

```
1. Luba's direct instruction in this conversation      ← ALWAYS WINS
2. Memory updates made in this conversation
3. Skills, governance rules, FC checks, V-gates
4. Claude's training defaults
```

Contradiction between levels 1 and 3: **Execute first. State contradiction. Ask exception type.**

---

## SESSION TYPE CLASSIFICATION

**GENERATION:** producing flow phases, service code, topology contracts
→ Full governance. SK-457 preflight. ⛔ STOP after each phase.

**PLANNING:** designing flows, reviewing plans
→ Plan gates. Present plan. Await "yes" before session files. SK-459 at ⛔ STOP.

**MAINTENANCE:** fixing files, updating skills, creating zips, docs
→ Execute directly. SK-440 blast radius first. One ⛔ STOP at end.

**INVESTIGATION:** gap analysis, simulation, diagnosis
→ SK-441 → SK-434 → SK-432. SK-459 at ⛔ STOP.

**DEBUG:** specific failing test or broken command
→ SK-484 (codebase-state-baseline) FIRST. SK-473 (test-failure-triage) if failures present.

**QA:** validating a delivered phase against acceptance criteria
→ SK-481. Run acceptance criteria checks. QA REPORT (APPROVED or DEFECTS_FOUND).
→ OPTIONAL Wave 0/1. REQUIRED before Phase E DPO capture.

**SELF-EXTENSION:** closing a capability gap the engine is missing  ← NEW v2.7.0
→ SK-509 (extension-session-type) governs this session type.
→ SK-505 (capability-state-reader) FIRST — read state before any planning.
→ SK-506 (gap-to-proposal) — classify gap and produce proposal.
→ ⛔ STOP — present proposal to Luba. Await explicit "yes" before building.
→ Execute build using appropriate sub-session type (MAINTENANCE or PLANNING+GENERATION).
→ SK-507 (implementation-integrity) — verify gap closed, guard installed.
→ SK-508 (training-data-gap-audit) — remediate affected DPO triples.
→ Final ⛔ STOP.

---

## MANDATORY CHECKS BEFORE EVERY ⛔ STOP

**Every session type — GENERATION, PLANNING, MAINTENANCE, INVESTIGATION, DEBUG, QA, SELF-EXTENSION.**

0. PREFLIGHT GATE (SK-457) — at Claude Code session start
1. OUTPUT CONTRACT VERIFICATION (SK-448) — before claiming done
2. MISSION PROGRESS CHECK (SK-445) — first section of every PHASE-COMPLETE
3. ISSUE INVENTORY (FC-29) — FIXED / DEFERRED+CARRY-FORWARD / EXCEPTION only
4. TEST GATE — ABSOLUTE (P19): `failures === 0`

---

## SKILL ACTIVATION TRIGGERS (v2.7.0 — additions only)

### Layer 3 — Product lifecycle (new in v2.7.0)

| When | Load |
|------|------|
| **New product planning; UML/spec → flows** | **`planning--requirement-to-flow-SKILL.md` (SK-492)** |
| **Inside SK-492 — before Wave 1+ design** | **`planning--cross-cutting-service-SKILL.md` (SK-495)** |
| **Before any event schema is defined** | **`planning--domain-event-design-SKILL.md` (SK-494)** |
| **Mapping UML services to task types** | **`planning--service-boundary-design-SKILL.md` (SK-496)** |
| **Any ranking / matching / scoring task type** | **`planning--algorithm-as-service-SKILL.md` (SK-497)** |
| **Any time-delta state machine service** | **`planning--temporal-behavior-design-SKILL.md` (SK-503)** |
| **Before designing shared fabric interfaces** | **`planning--shared-infrastructure-design-SKILL.md` (SK-504)** |
| **When >3 flows are simultaneously unblocked** | **`planning--feature-prioritization-SKILL.md` (SK-502)** |
| **Before Phase B of any Wave 1+ flow** | **`code-execution--multi-service-local-dev-SKILL.md` (SK-501)** |
| **Cross-service failure with event chain** | **`code-execution--event-driven-debugging-SKILL.md` (SK-498)** |
| **After any wave reaches ACTIVE — business check** | **`planning--product-scope-validation-SKILL.md` (SK-493)** |
| **After any wave reaches ACTIVE — E2E check** | **`qa--user-journey-acceptance-testing-SKILL.md` (SK-499)** |
| **After any wave reaches ACTIVE — schema check** | **`qa--data-flow-integrity-SKILL.md` (SK-500)** |

### Layer 4 — Self-awareness (new in v2.7.0)

| When | Load |
|------|------|
| **SELF-EXTENSION session start** | **`self--extension-session-type-SKILL.md` (SK-509) + `self--capability-state-reader-SKILL.md` (SK-505)** |
| **After SK-505 detects MISSING capability** | **`self--gap-to-proposal-SKILL.md` (SK-506)** |
| **After capability extension completes** | **`self--implementation-integrity-SKILL.md` (SK-507)** |
| **After SK-507 confirms closure** | **`self--training-data-gap-audit-SKILL.md` (SK-508)** |

*(All Layer 1 and Layer 2 triggers from v2.6.0 are unchanged — see v2.6.0 for full table)*

---

## PLANNING PIPELINE ADDITIONS (v2.7.0)

```
New product decomposition sequence (prepend to existing planning pipeline):

⓪(-3)  extension-session-type (SK-509)    ← if session is SELF-EXTENSION
⓪(-3)  capability-state-reader (SK-505)   ← if SELF-EXTENSION: read state first
⓪(-2)  requirement-to-flow (SK-492)       ← if new product: decompose UML/spec first
        cross-cutting-service (SK-495)      ← inside SK-492 decomposition
⓪(-2)  domain-event-design (SK-494)       ← before any flow that defines events
⓪(-2)  shared-infrastructure-design (SK-504) ← if shared infra needed by >1 wave
        feature-prioritization (SK-502)     ← when >3 flows unblocked simultaneously

Then existing pipeline steps:
⓪(-2)  session-scope-resolution (SK-460) ...etc (v2.6.0 unchanged)

New flow design additions (within existing pipeline):
⑤      algorithm-as-service (SK-497)       ← for any ranking/matching/scoring task type
⑤      service-boundary-design (SK-496)    ← when deriving task types from UML
⑤      temporal-behavior-design (SK-503)   ← for any time-delta behavior
```

---

## WHAT CHANGED IN v2.7.0

| Change | What it adds |
|--------|-------------|
| NEW SK-492..SK-499 | Layer 3 HIGH: 8 product lifecycle skills (all urgency = before first customer product) |
| NEW SK-500..SK-504 | Layer 3 MEDIUM: 5 product lifecycle skills (before Wave 2) |
| NEW SK-505..SK-509 | Layer 4: 5 self-awareness skills (engine self-extension governance) |
| UPDATED | Session type classification: SELF-EXTENSION added as 7th session type |
| UPDATED | Skill activation: Layer 3 and Layer 4 trigger tables added |
| UPDATED | Skill index: v3.0.0 → v3.1.0 (86 total skills) |
| CORRECTED | Next available SK: SK-492 → **SK-510** |

---

## WHAT EACH SKILL PREVENTS (v2.7.0 additions)

| Skill | What it prevents |
|-------|-----------------|
| SK-492 requirement-to-flow | Building flows in wrong order; missing cross-flow dependency |
| SK-493 product-scope-validation | "All services pass but platform doesn't work" |
| SK-494 domain-event-design | 50+ events with inconsistent names, payloads that drop fields |
| SK-495 cross-cutting-service | Building notification service twice across FLOW-03 and FLOW-07 |
| SK-496 service-boundary-design | Over/under-scoped task types; T47 covering 5 distinct domains |
| SK-497 algorithm-as-service | ML weights hardcoded in scoring services (I-2 contamination class) |
| SK-498 event-driven-debugging | Cross-service failure traced to wrong service, wrong layer fixed |
| SK-499 user-journey-acceptance-testing | Wave approved without verifying the user journey works end-to-end |
| SK-500 data-flow-integrity | Field dropped at service 3 produces wrong output at service 8, undetected |
| SK-501 multi-service-local-dev | Phase B run without upstream data, produces zero valid generations |
| SK-502 feature-prioritization | Wave 1 built in wrong order because customer priority ignored |
| SK-503 temporal-behavior-design | Phase transitions hardcoded instead of FREEDOM-config-timed |
| SK-504 shared-infrastructure-design | Same shared index built twice with different schemas |
| SK-505 capability-state-reader | Session starts assuming all dependencies exist; fails mid-generation |
| SK-506 gap-to-proposal | Every gap escalated to "new flow needed" when CONVENTION/ADAPTATION would suffice |
| SK-507 implementation-integrity | Capability session adds interface but no named check; guard never installed |
| SK-508 training-data-gap-audit | 15 triples from gap window permanently contaminate graduation count |
| SK-509 extension-session-type | Self-extension happens ad hoc; no formal approval gate before building |

---

## LAYER SUMMARY

```
Layer 1 — Engine internals (47 skills, SK-426..SK-470): COMPLETE
Layer 2 — Engine lifecycle (21 skills, SK-471..SK-491): COMPLETE  
Layer 3 — Product lifecycle (13 skills, SK-492..SK-504): COMPLETE
Layer 4 — Self-awareness (5 skills, SK-505..SK-509):    COMPLETE

Total: 86 skills
Next available: SK-510
```

---

## FILE INVENTORY (v2.7.0 complete — 86 skill files)

**New in v2.7.0 (18 skills):**
- `planning--requirement-to-flow-SKILL.md` (SK-492)
- `planning--product-scope-validation-SKILL.md` (SK-493)
- `planning--domain-event-design-SKILL.md` (SK-494)
- `planning--cross-cutting-service-SKILL.md` (SK-495)
- `planning--service-boundary-design-SKILL.md` (SK-496)
- `planning--algorithm-as-service-SKILL.md` (SK-497)
- `code-execution--event-driven-debugging-SKILL.md` (SK-498)
- `qa--user-journey-acceptance-testing-SKILL.md` (SK-499)
- `qa--data-flow-integrity-SKILL.md` (SK-500)
- `code-execution--multi-service-local-dev-SKILL.md` (SK-501)
- `planning--feature-prioritization-SKILL.md` (SK-502)
- `planning--temporal-behavior-design-SKILL.md` (SK-503)
- `planning--shared-infrastructure-design-SKILL.md` (SK-504)
- `self--capability-state-reader-SKILL.md` (SK-505)
- `self--gap-to-proposal-SKILL.md` (SK-506)
- `self--implementation-integrity-SKILL.md` (SK-507)
- `self--training-data-gap-audit-SKILL.md` (SK-508)
- `self--extension-session-type-SKILL.md` (SK-509)

**All prior skills from v2.6.0:** SK-426..SK-491 (68 files, unchanged)

**Next available SK number: SK-510**
