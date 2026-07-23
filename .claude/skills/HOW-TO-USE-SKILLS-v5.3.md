# HOW TO USE XIIGEN SKILLS — v5.3
## Updated: 2026-04-24 | For: Claude.ai Project custom instructions
## Status: Current — supersedes v5.2

## What changed in v5.3:
##   18 auth / NDJSON / certification skill updates from AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0.
##   All additive. Closes G-AUTH-01..G-AUTH-12 + G-NDJSON-01..G-NDJSON-04 from gap mapping R3.
##
##   NEW SK-554 arbiter-ndjson-requirements: NDJSON minimum type matrix (9 conditions),
##     6 detection commands, UC-7 trigger for TEACH-QA R1-FINAL, Phase A gate check.
##
##   dna-compliance-guard 1.1.0 → 1.2.0: A-1..A-3 auth checks (@UseGuards/@Roles/bypass-paths);
##     D-HIST-001 SDK import check; AUTH GATE + D-HIST-001 gate verdicts.
##
##   generated-code-review 1.1.0 → 1.2.0: Layer 5 auth declaration check; D-HIST-001
##     in Layer 2; AUTH_DEFERRED exception for DPO capture.
##
##   flow-implementation-guide 1.2.0 → 1.3.0: V10 authStatus gate (AUTH_READY/AUTH_DEFERRED);
##     V11 tenantCertTier gate (NONE→TIER_D); NEW Phase H (auth decoration A-1..A-3 + Rule 7);
##     NEW Phase I (tenant cert + TIER-C checklist + Guard 14); Phase A gate SK-554 count.
##
##   phase-preflight 1.1.0 → 1.2.0: Default check #6 auth infrastructure (4-component score);
##     Pattern 5 auth resumption scan.
##
##   test-integrity 2.1.0 → 2.2.0-GR001: Rule 7 (401/403 per controller + R6 cross-tenant JWT);
##     GR-001 Zero Tech Debt Golden Rule prepended.
##
##   self-verification 1.1.0 → 1.2.0: AUTH_PROTECTION_ADDITION as 6th change category;
##     8-step auth verification checklist.
##
##   retroactive-development 1.1.0 → 1.2.0: Auth fix propagation table (A-1..A-3 + D-HIST-001);
##     8-step auth verification protocol; cross-fleet scope scans.
##
##   flow-prerequisites 1.0.0 → 1.1.0: TIER 1 P-5 auth infrastructure (4-component check,
##     NON-BLOCKING); TIER 2/3 renumbered P-6..P-11.
##
##   plan-review-skill 2.0 → 2.1.0 + GR001: FC-19 (auth declaration), FC-20 (NDJSON types
##     per SK-554), FC-21 (definition of done + Guard 14); GR-001 enforcement section.
##
##   flow-lifecycle SK-443 1.0.0 → 1.1.0: MOBILE + AUTH_READY + TIER_A/B/C/D protocol
##     states; Steps 6a/6b/6c (Phase G/H/I lifecycle writes); Guard 14 enforcement.
##
##   qa-session-type SK-481 1.0.0 → 2.0.0: Step 5b protocol completeness (portabilityStatus,
##     authStatus, tenantCertTier, SK-553 L1, Phase 0 auth, SK-554 NDJSON counts,
##     D-HIST-001, per-role visual, R6, repo evidence); BLOCKING severity extended.
##
##   Guide bumps: GUIDE-B17 6.2→6.3, GUIDE-B19 v1→v2, GUIDE-B21 3.1→3.2,
##     GUIDE-B02 existing→6.2, GUIDE-B03 existing→2.1, GUIDE-B04 3.1→3.2,
##     prompt-to-claude 3.1→3.2, GUIDE-B37 v1→v2.
##
##   Skill activation triggers: 12 new rows (auth/cert/D-HIST-001/SK-554 conditions).
##   Layer 1 summary: 8 version bumps + 1 new skill (SK-554).
##   Total skills: 128 (+1 SK-554); Next available SK: SK-555.

## What changed in v5.2:
##   8 code execution skill version bumps — portability enforcement + behavioral
##   assertion gates. All additive. Closes G-29..G-35b + G-38 from gap mapping R3.
##   [Full v5.2 changelog preserved — see v5.2 for detail]

## What changed in v5.1:
##   Eight governance fixes from April 2026 session corpus analysis (H1–H9 confirmed).
##   [Full v5.1 changelog preserved — see v5.1 for detail]

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

**STOP-CADENCE CLAUSE (H0 extension):**
If Luba sets a delivery cadence in the prompt, that cadence OVERRIDES the session type's
default ⛔ STOP pattern. Apply Luba's cadence exactly. Do not compress rounds.
Conflict must be stated at session start: "Your instruction sets cadence X; governance
default is Y; applying X per H0."

**MULTI-STEP PROMPT DISCIPLINE (H0 extension):**
When a prompt contains a sequence, confirm the sequence explicitly before starting step A.
If any step is ambiguous, ask before proceeding.

---

## SESSION-START GATE — MANDATORY BEFORE ANY OUTPUT

Complete all load-order items and questions before producing any analysis, plan, or file.

### PRE-Q0 — Absorption directive

When the session brief contains attachments, uploads, or quoted content of more than
a few paragraphs, the first response action is absorption — a paraphrase of what was
read, not a tool call. The absorption comes before skill loading, before Q0, before
everything else in this gate.

### LOAD ORDER 0 — Reconnaissance Gate (SK-529 v2.5.0)

**Load `planning--reconnaissance-gate-SKILL.md` (SK-529 v2.5.0) FIRST.**

| Session type | File reads | Grep counts | Verbatim excerpts |
|--------------|-----------:|------------:|------------------:|
| EXECUTOR | 5 | 2 | 3 |
| PLANNING | 10 | 3 | 5 |
| REVIEW | 15 | 5 | 8 |
| ARCHITECT | 20 | 8 | 10 |
| MATERIALIZATION | 20 | 8 | 10 |

Wide-scope mode (Rule 26) doubles all thresholds. STATE.recon saved before any synthesis.

**For XIIGen ARCHITECT sessions:** execute Tier-0 search list (SK-529 §10) before synthesis.
T0-4.5: BEHAVIORAL-CORRECTIONS-REGISTRY.md (BC-001..BC-010).

### LOAD ORDER 1 — Session Mode Declaration (SK-535)

Declare exactly one mode in STATE.mode: ARCHITECT | PLANNER | REVIEWER | EXECUTOR | MATERIALIZATION.

### LOAD ORDER 2 — Goal Context Persistence (SK-536)

User's original goal statement captured verbatim into STATE.goalContext.statement.
Every ⛔ STOP output begins with two-layer "Goal reminder" block.

### LOAD ORDER 3 — Claim-as-Hypothesis (SK-531) / Design Artifact Completeness (SK-537)

SK-531 if user message contains claims about existing state.
SK-537 if session references design artifacts.

### LOAD ORDER 4 — Materialization (SK-532) / MVP Round-Trip (SK-533)

SK-532 if MATERIALIZATION session. SK-533 if tenant-facing work.

### LOAD ORDER 5 — Specificity (SK-530) / Goal Delivery (SK-534) / Pipeline Position (SK-528)

SK-530 before any architect or plan-review STOP.
SK-534 FIRST arbiter in every panel.
SK-528 for GENERATION/PLANNING/MATERIALIZATION: Q0a/b/c/d pipeline position.

### Q0 — What is the pipeline position? (SK-528)

Answer all four parts before Q1. CONTEXT_INSUFFICIENT → halt.

### Q1 — Session type (name exactly one)

### Q2 — Skills to load

| Session type | Must read before first output |
|---|---|
| **GENERATION** | SK-529 v2.5.0 FIRST + SK-535 + SK-536 + SK-528 + SK-531 + SK-537 + SK-538 + RESPONSE-CONSTRUCTION-PROTOCOL + `code-execution--flow-implementation-guide-SKILL.md` **v1.3.0** + `planning--plan-review-SKILL.md` **v2.1.0** + `code-execution--flow-restructure-SKILL.md` + SK-526 (arbiters) + SK-442 v1.1 (arbiters) + **SK-539 v1.1.0** (React pages) + **SK-542** (examining pages) + **SK-540** (.impeccable.md absent) + **SK-552** (N ≥ 5 instances) |
| **PLANNING** | SK-529 v2.5.0 FIRST + SK-535 + SK-536 + SK-528 + SK-460 + SK-538 + RESPONSE-CONSTRUCTION-PROTOCOL + `planning--plan-review-SKILL.md` **v2.1.0** + `planning--session-file-authoring-SKILL.md` v1.1 + SK-526 + SK-442 v1.1 + SK-534 + SK-552 (N ≥ 5) |
| **MATERIALIZATION** | SK-529 v2.5.0 FIRST + SK-535 + SK-536 + SK-528 + SK-532 + SK-533 + SK-537 + SK-531 + SK-534 + SK-530 + SK-538 + RESPONSE-CONSTRUCTION-PROTOCOL + SK-539 v1.1.0 + SK-542 + SK-540 + SK-552 |
| **REVIEW** | SK-529 v2.5.0 FIRST + SK-535 + SK-536 + SK-528 + SK-410 v2.0 + SK-530 + SK-534 + SK-537 + SK-538 + RESPONSE-CONSTRUCTION-PROTOCOL |
| **QA** | `planning--qa-session-type-SKILL.md` **(SK-481 v2.0.0)** |
| **INVESTIGATION** | SK-529 v2.5.0 FIRST + flow-completeness-checker v2.0 + solution-scope-gate + root-cause-ladder |
| **DEBUG** | SK-529 v2.5.0 FIRST + test-failure-triage (SK-473) |
| **MAINTENANCE** | change-propagation (SK-440) blast radius first |

### Q3 — H0 conflicts

State and resolve before proceeding.

### Q4 — Output contract (binary criterion required)

**SESSION-START GATE CHECKLIST:**
```
□ PRE-Q0 absorption completed (paraphrase IS entire first response)
□ SK-529 v2.5.0 threshold met; STATE.recon saved; T0-4.5 BEHAVIORAL-CORRECTIONS-REGISTRY read
□ SK-535 mode declared
□ SK-536 goal captured verbatim; STATE.productGoal from SESSION-LOAD-PLAN v32
□ Q0 pipeline position answered or CI emitted
□ Q1 session type declared
□ Q2 skills read (each with ✅)
□ Q3 H0 conflicts: NONE or resolved
□ Q4 output contract — BINARY FORMAT required
□ RESPONSE-CONSTRUCTION-PROTOCOL loaded
□ ROUND CONTRACT loaded (5 checks before every response)
```

---

## MANDATORY CHECKS BEFORE EVERY ⛔ STOP (15 checks)

1. OUTPUT CONTRACT VERIFICATION — MANDATORY STOP FORMAT block (SESSION GOAL / THIS ROUND PRODUCED / OUTPUT CONTRACT MET/PARTIAL/NOT MET / LAST CORRECTION STATUS)
2. MISSION PROGRESS CHECK (SK-445)
3. ISSUE INVENTORY (FC-29) — FIXED / DEFERRED+CARRY-FORWARD / EXCEPTION only
4. TEST GATE — ABSOLUTE (P19): `failures === 0`
5. FC-32 — scope_isolation arbiter in every node
6. PIPELINE CONTRACT CHECK (SK-528) — Q0a/b/c/d
7. DOCUMENTATION ARTIFACTS GATE (Rule 17) — Markdown companion for every structured file
8. RECONNAISSANCE EVIDENCE (SK-529 v2.5.0) — STATE.recon; Gate 3 three-path routing; Gate 4 universal claims; Gate 5 N≥5 hypotheses
9. CLAIMS VERIFIED (SK-531) — no PENDING_VERIFICATION blocking claims
10. GOAL REMINDER BLOCK (SK-536) — two-layer block visible to Luba
11. GOAL DELIVERY VERDICT (SK-534) — plan reviews only
12. ARCHITECT HABITS DISCIPLINE (SK-538 v1.2.0 / FC-16)
13. TOOLS BEFORE PERSON (N-A13)
14. RESPONSE CONSTRUCTION PROTOCOL COMPLIANCE (FC-17)
15. UI/UX COMPLIANCE (FC-18) — if ≥1 React page produced

---

## SKILL ACTIVATION TRIGGERS

### Layer 8 — Governance discipline

| When | Load |
|------|------|
| **Any session start** | **SK-529 v2.5.0 Reconnaissance Gate (load_order 0) — FIRST** |
| **Any XIIGen ARCHITECT session** | **SK-529 v2.5.0 §10 Tier-0 — 9 files before synthesis** |
| **Any PLANNING, MATERIALIZATION, ARCHITECT, REVIEW session** | **SK-535 Session Mode Declaration** |
| **Any session with user-stated goal** | **SK-536 Goal Context Persistence** |
| **Any session with user assertion about existing state** | **SK-531 Claim-as-Hypothesis** |
| **Any session referencing design artifacts** | **SK-537 Design Artifact Completeness** |
| **Any MATERIALIZATION** | **SK-532 Materialization Session Type** |
| **Any tenant-facing work** | **SK-533 MVP Round-Trip Verification** |
| **Any architect or plan-review output** | **SK-530 Specificity Calibration** |
| **Any plan review** | **SK-534 Goal Delivery Completeness (FIRST arbiter)** |
| **Any ARCHITECT/PLANNER/REVIEWER/MATERIALIZATION session** | **SK-538 Architect Habits v1.2.0** |
| **Any session with declared mode** | **RESPONSE-CONSTRUCTION-PROTOCOL v1.0** |
| **New .service.ts file in engine/flows/** | **dna-compliance-guard v1.2.0 — portability P-1..P-5 + auth A-1..A-3 + D-HIST-001** |
| **Flow phase close (before V9 in STATE.json)** | **flow-implementation-guide v1.3.0 V9 portability gate** |
| **Flow phase close (before V10 in STATE.json)** | **flow-implementation-guide v1.3.0 V10 authStatus gate (NEW v5.3)** |
| **Flow phase close (before V11 in STATE.json)** | **flow-implementation-guide v1.3.0 V11 tenantCertTier gate (NEW v5.3)** |
| **After Phase B generates service code (before DPO capture)** | **generated-code-review v1.2.0 — all 5 layers including Layer 5 auth** |
| **Any new spec file in engine/flows/** | **test-integrity v2.2.0-GR001 Rule 6 behavioral assertions + Rule 7 auth tests (NEW v5.3)** |
| **Portability or auth violation found** | **retroactive-development v1.2.0 portability + auth fix propagation tables** |
| **Auth fix applied to existing service** | **self-verification v1.2.0 — AUTH_PROTECTION_ADDITION category (NEW v5.3)** |
| **New ES document OR TypeScript service file** | **data-connection-classification v2.0.0** |
| **Controller generated without @UseGuards or @Roles** | **dna-compliance-guard v1.2.0 A-1/A-2 + flow-implementation-guide v1.3.0 Phase H (NEW v5.3)** |
| **Distributable flow reaching Phase F without tenantCertTier declared** | **flow-implementation-guide v1.3.0 Phase I + flow-lifecycle v1.1.0 Step 6c (NEW v5.3)** |
| **D-HIST-001: direct SDK import found in service file** | **retroactive-development v1.2.0 D-HIST-001 fix row + dna-compliance-guard v1.2.0 (NEW v5.3)** |
| **Guard 14 check required (targeting TIER_C lifecycle write)** | **flow-lifecycle v1.1.0 Step 6c — auth infra 4-component score before TIER_C (NEW v5.3)** |
| **TEACH-QA R0 produced for any flow** | **GUIDE-B19 v2 UC-7 — NDJSON type coverage check (SK-554) before Phase A (NEW v5.3)** |
| **Phase A NDJSON fixture produced** | **SK-554 arbiter-ndjson-requirements — scope_isolation count + no-type record count (NEW v5.3)** |
| **QA session runs on Phase G/H/I close** | **SK-481 v2.0.0 Step 5b — protocol completeness check (portabilityStatus/authStatus/tenantCertTier) (NEW v5.3)** |
| **ACTIVE promotion for distributable flow (Phase E)** | **flow-lifecycle v1.1.0 Steps 6a/6b/6c — portabilityStatus/authStatus/tenantCertTier CAS writes (NEW v5.3)** |
| **Session examining or repairing existing React pages** | **SK-542 Flow UI Examination Protocol v1.0.0** |
| **First React page for flow + .impeccable.md absent** | **SK-540 Product Design Context v1.0.0** |
| **Any session producing React pages** | **SK-539 UI/UX Compliance v1.1.0** |
| **Phase 7 Step 5** | **SK-541 Screen Craft Audit v1.0.0** |
| **N ≥ 5 instances of same entity type** | **SK-552 Per-Entity Examination Protocol v1.1.0** |
| **Any UI/UX session — before first file** | **SK-543 Work Scope Inventory (load_order 0)** |
| **Any ⛔ STOP with improvement metric** | **SK-544 Improvement Measurement Protocol** |
| **Any ⛔ STOP claiming fleet progress** | **SK-545 UI Fleet Completion Criteria** |
| **Any ⛔ STOP with improvement/completion claim** | **SK-546 Coverage Completeness Gate** |
| **Any session claiming a result before STOP** | **SK-547 Output Skepticism** |
| **Any multi-phase plan before Phase 1** | **SK-548 Plan Self-Validation** |
| **Any PNG examination** | **SK-549 Per-Image Validation** |
| **Fleet-level UI/UX improvement session** | **SK-550 Visual Examination Round** |
| **Any ⛔ STOP claiming visual improvement** | **SK-551 Coverage Matrix** |

---

## LAYER SUMMARY — v5.3

```
Layer 1 — Engine internals (48 skills, SK-426..SK-470 + SK-554):     COMPLETE ← v5.3
          dna-compliance-guard **v1.2.0** — P-1..P-5 portability + A-1..A-3 auth
            checks (@UseGuards, @Roles, bypass-paths) + D-HIST-001 SDK import check ← v5.3
          generated-code-review **v1.2.0** — Layer 5 auth declaration + D-HIST-001
            in Layer 2 + AUTH_DEFERRED exception for DPO capture ← v5.3
          flow-implementation-guide **v1.3.0** — V10 authStatus gate + V11 tenantCertTier
            gate + NEW Phase H (auth A-1..A-3 + Rule 7) + NEW Phase I (cert TIER-A/B/C/D
            + Guard 14 + TIER-C checklist) + SK-554 NDJSON count in Phase A gate ← v5.3
          phase-preflight **v1.2.0** — default check #6 auth infra (4-component score)
            + Pattern 5 auth resumption scan ← v5.3
          test-integrity **v2.2.0-GR001** — Rule 7 (401/403 per controller) + Rule 8
            (R6 cross-tenant JWT isolation) + GR-001 Zero Tech Debt Golden Rule ← v5.3
          self-verification **v1.2.0** — AUTH_PROTECTION_ADDITION as 6th change category
            + 8-step auth verification checklist ← v5.3
          retroactive-development **v1.2.0** — auth fix propagation table (A-1..A-3 +
            D-HIST-001) + 8-step auth protocol + cross-fleet scope scans ← v5.3
          flow-prerequisites **v1.1.0** — TIER 1 P-5 auth infra check (4-component,
            NON-BLOCKING) + TIER 2/3 renumbered P-6..P-11 ← v5.3
          **NEW SK-554** arbiter-ndjson-requirements v1.0.0 — NDJSON minimum type
            matrix (9 conditions: scope_isolation mandatory; security for PII/auth;
            domain for business-logic); 6 detection commands; UC-7 trigger for
            TEACH-QA R1-FINAL; Phase A gate check ← v5.3
Layer 2 — Engine lifecycle (22 skills, SK-471..SK-491 + SK-481 v2.0.0):  COMPLETE ← v5.3
          flow-lifecycle **SK-443 v1.1.0** — MOBILE/AUTH_READY/TIER_A/B/C/D protocol
            states; Steps 6a (Phase G portabilityStatus CAS write) / 6b (Phase H
            authStatus CAS write) / 6c (Phase I tenantCertTier CAS write + Guard 14
            enforcement); transition rules extended ← v5.3
          qa-session-type **SK-481 v2.0.0** — Step 5b protocol completeness check
            (portabilityStatus/authStatus/tenantCertTier/SK-553 L1/Phase 0 auth/
            SK-554 NDJSON/D-HIST-001/per-role visual/R6/repo evidence);
            BLOCKING severity extended; Key Rule TBD=skipped gate ← v5.3
Layer 3 — Product lifecycle (13 skills, SK-492..SK-504):             COMPLETE
Layer 4 — Self-awareness (5 skills, SK-505..SK-509):                 COMPLETE
Layer 5 — Dynamic decision architecture (10 skills, SK-510..SK-519): COMPLETE
Layer 6 — AI-driven topology planning (6 skills, SK-520..SK-525):    COMPLETE
Layer 6x — Scope isolation enforcement (1 skill, SK-526):            COMPLETE
Layer 7 — Pipeline position enforcement (1 skill, SK-528):           COMPLETE
Layer 8 — Governance discipline (11 skills, SK-529..SK-539):         COMPLETE
          SK-529 v2.5.0; SK-539 v1.1.0 (unchanged from v5.2)
Layer 9 — Response construction (1 protocol, v1.0):                  COMPLETE
Layer 10 — Screen examination + design context (3 skills):           COMPLETE
Layer 11 — UI/UX Fleet Discipline (5 skills, SK-543..SK-547):        COMPLETE
Layer 12 — Plan Integrity (1 skill, SK-548):                         COMPLETE
Layer 13 — Visual Examination (3 skills, SK-549..SK-551):            COMPLETE
Layer 14 — Multi-entity Examination Protocol (1 skill, SK-552):      COMPLETE

Reference — GUIDE-B17 IMPLEMENTATION-PLAN:           v6.3 (NEW v5.3)
            Phase A gate: SK-554 NDJSON scope_isolation count; Phase B: auth + D-HIST-001;
            Phase G: G.6 D-HIST-001; NEW Phase H (auth A-1..A-3 + Rule 7 tests);
            NEW Phase I (cert tier + TIER-C checklist + Guard 14)
Reference — GUIDE-B19 TEACH-QA-R1-FINAL:             v2 (NEW v5.3)
            UC-7 NDJSON type coverage (SK-554); CRITICAL trigger scope_isolation=0;
            HIGH trigger empty arbiterType; GAP TYPE template; Key Rule 6
Reference — GUIDE-B21 STEP-1-INVARIANTS:             v3.2 (NEW v5.3)
            Auth constraints block (Option A/B/C + routes/roles/bypass-paths);
            flow_module_name FREEDOM key (CF-FORK-01); FREEDOM/MACHINE table row;
            STATE WRITE: authConstraints + tenantCertTarget + flowModuleName;
            Key Rules 6 + 7
Reference — GUIDE-B02 IMPL-STATE-JSON:               v6.2 (NEW v5.3)
            authStatus/authGaps/authTier/tenantCertTier/portabilityTest/protocolStatus
            fields; Phase G/H/I phase labels; verdict rules TBD blocks GOAL_REACHED;
            SILENT_FAILURE RISK 3
Reference — GUIDE-B03 PLAN-STATE-JSON:               v2.1 (NEW v5.3)
            authConstraints block (option A/B/C + fields from STEP-1 auth section);
            tenantCertTarget; Step 2b authoring instructions; STATE WRITE extended
Reference — GUIDE-B04 QA-COVERAGE-STATE-JSON:        v3.2 (NEW v5.3)
            Q7 auth_protection_declared (A-1/A-2 + Rule 7 tests; AUTH_DEFERRED ok);
            Q8 tenant_cert_tier (reads IMPL-STATE.json; TBD on completed flow = BLOCKED);
            overallReadiness extended to Q1-Q8
Reference — prompt-to-claude:                        v3.2 (NEW v5.3)
            Rule 8: Phase H mandatory; Rule 9: Phase I mandatory;
            FP-7 controller without auth; FP-8 no cert tier; Key Files extended
Reference — GUIDE-B37 PHASE-COMPLETE:                v2 (NEW v5.3)
            Protocol status block in gate results (portabilityStatus/authStatus/
            tenantCertTier ✅/⚠/❌); ENGINE PROGRESS rows for all three fields;
            GOAL_REACHED blocker rule; Key Rule 5
Reference — plan-review-skill:                       v2.1.0 + GR001 (NEW v5.3)
            FC-19 (auth declaration); FC-20 (NDJSON types per SK-554);
            FC-21 (definition of done + Guard 14); GR-001 Zero Tech Debt enforcement
Reference — XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE:   v2.2 (unchanged from v5.0)
Reference — XIIGEN-SESSION-START-PROMPT:              v5.1 (unchanged from v5.1)
Reference — CODE-REVIEW-PROTOCOL:                     v1.9 (unchanged from v5.1)
Reference — FLOW-DOCUMENT-AUTHORING-GUIDE:            v1.17 (unchanged from v5.1)
Reference — BEHAVIORAL-CORRECTIONS-REGISTRY.md:       v1.0 (unchanged from v5.1)
Reference — data-connection-classification:           v2.0.0 (unchanged from v5.2)
Reference — SKILL-INDEX:                              v4.4.0 (NEW v5.3)
            SK-554 registered; 8 version bumps; GAPS CLOSED v4.4.0 (16 entries)

Total: 128 skills + 1 protocol + reference documents  ← +1 SK-554 vs v5.2
Next available: SK-555
Next available FC: FC-22
```

---

## GAPS CLOSED — v5.3

```
G-AUTH-01: No skill requires @UseGuards on controllers
  → dna-compliance-guard v1.2.0 A-1 + flow-implementation-guide v1.3.0 Phase H
G-AUTH-02: No skill requires @Roles/@Public() on routes
  → dna-compliance-guard v1.2.0 A-2 + Phase H
G-AUTH-03: @Public() routes not validated against bypass-paths.registry.ts
  → dna-compliance-guard v1.2.0 A-3 + Phase H Step H.4
G-AUTH-04: No 401/403 auth tests required by any skill
  → test-integrity v2.2.0-GR001 Rule 7 + Phase H Step H.5
G-AUTH-05: No R6 cross-tenant JWT isolation test required
  → test-integrity v2.2.0-GR001 Rule 8
G-AUTH-06: Auth violations not propagated retroactively
  → retroactive-development v1.2.0 auth fix propagation table
G-AUTH-07: Auth protection changes not tracked as a verification category
  → self-verification v1.2.0 AUTH_PROTECTION_ADDITION
G-AUTH-08: Auth infrastructure not checked in phase preflight
  → phase-preflight v1.2.0 default check #6
G-AUTH-09: Generated code review misses auth declarations
  → generated-code-review v1.2.0 Layer 5
G-AUTH-10: No V10 authStatus gate in implementation plan
  → flow-implementation-guide v1.3.0 V10
G-AUTH-11: No V11 tenantCertTier gate in implementation plan
  → flow-implementation-guide v1.3.0 V11
G-AUTH-12: Lifecycle index never writes auth/cert status
  → flow-lifecycle v1.1.0 Steps 6a/6b/6c
G-NDJSON-01: No skill defines minimum NDJSON arbiter types
  → SK-554 arbiter-ndjson-requirements (NEW)
G-NDJSON-02: scope_isolation=0 not a TEACH-QA trigger
  → GUIDE-B19 v2 UC-7 + SK-554
G-NDJSON-03: NDJSON type coverage not checked in Phase A gate
  → flow-implementation-guide v1.3.0 Phase A gate
G-NDJSON-04: NDJSON coverage not in QA coverage dimensions
  → GUIDE-B04 v3.2 Q7/Q8
```

---

## BACKWARD COMPATIBILITY — v5.2 → v5.3

All changes are additive. No skills removed or renumbered.

**Sessions started under v5.2:** May continue under v5.2 rules through completion.
The auth checks (A-1..A-3), V10/V11 gates, Phase H/I, SK-554 NDJSON checks, and
Step 5b protocol completeness are not retroactively required mid-session.
Must adopt v5.3 for the next session they start.

**dna-compliance-guard migration (v1.1.0 → v1.2.0):**
A-1..A-3 are additive to P-1..P-5. For any session creating controllers:
run A-1/A-2/A-3 pre-commit. AUTH_DEFERRED is an acceptable exit if auth.module.ts absent.

**flow-implementation-guide migration (v1.2.0 → v1.3.0):**
V10/V11 and Phase H/I are new steps. Sessions that completed Phase F without these:
Phase H and I are the next sessions to run before claiming GOAL_REACHED.
V10 = TBD blocks GOAL_REACHED — run Phase H first.

**test-integrity migration (v2.1.0 → v2.2.0-GR001):**
Rule 7 (401/403) and Rule 8 (R6 cross-tenant) are new. GR-001 is a prepended
editorial rule, not a new check. Existing spec files are grandfathered; add
Rules 7/8 tests before the next QA session on the same flow.

**SK-554 (NEW):**
Any TEACH-QA R0 now triggers UC-7 in R1-FINAL. Any Phase A gate now checks
scope_isolation count (FAIL if 0). Existing flows with approved R1-FINAL docs
are grandfathered; UC-7 applies on next revision.

**flow-lifecycle migration (v1.0.0 → v1.1.0):**
Steps 6a/6b/6c are new. For flows that reached ACTIVE without these writes:
run Steps 6a/6b/6c in the next maintenance session to backfill the protocol fields.
Until backfilled, portabilityStatus/authStatus/tenantCertTier = TBD in the index.

**qa-session-type migration (v1.0.0 → v2.0.0):**
Step 5b is new. All QA sessions on Phase G/H/I close must include Step 5b.
QA sessions on Phase A-F may skip Step 5b (state fields not yet applicable).

**Human action required:**
1. Replace code-execution skill files with v1.2.0/v1.3.0/v2.2.0 versions
2. Add `code-execution--arbiter-ndjson-requirements-SKILL-SK-554.md` to project knowledge
3. Replace pipeline--flow-lifecycle-SKILL.md with v1.1.0 version
4. Replace planning--qa-session-type-SKILL.md with v2.0.0 version
5. Replace plan-review-skill with v2.1.0 version
6. Replace GUIDE-B17/B19/B21/B02/B03/B04 and prompt-to-claude in flow-prep library
7. Upload HOW-TO-USE-SKILLS-v5.3 and SKILL-INDEX-v4.4.0 to project knowledge
