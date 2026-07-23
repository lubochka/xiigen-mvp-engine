---
name: plan-review-skill
version: "2.1.0"
sk_number: SK-410
priority: MANDATORY
load_order: 8
author: luba
updated: "2026-04-24"
supersedes: "2.0.0"
description: >
  14+5 failure classes for plan review. v2.0 added FC-14 (goal delivery) and
  FC-15 (design artifact completeness) running first. v2.1 adds FC-19 (auth
  requirement declaration), FC-20 (arbiter NDJSON type coverage per SK-554),
  and FC-21 (definition of done protocol reference including Guard 14 check).
  All three run in the FIRST tier alongside FC-14/FC-15. Closes AUTH-ARBITER-
  SKILLS-REMEDIATION-PLAN-v3.0 Phase 10.
---

# Plan Review Skill v2.1 — 17 Failure Classes + 3-Gate Approval

A plan with count drift costs more to fix than to prevent. A plan that misses the
user's goals costs even more. A plan that ships unguarded controllers or uncertified
flows costs more still. This skill prevents all three.

## Origin

v1.0 extracted from the XIIGen skill migration planning session (March 2026).
v2.0 extended after XIIGEN-GOVERNANCE-AUTHORING-R1 (2026-04-16): FC-14/15 added
after User Journey Reconnection v27 shipped with 3 of 4 goals unmapped.
v2.1 adds FC-19/20/21 after AUTH-ARBITER analysis (2026-04-24) confirmed that
no FC gate checked whether a plan declared auth requirements, declared NDJSON
type coverage, or referenced the portability/auth certification protocol.

## When to Invoke

- BEFORE handing any plan to Claude Code
- BEFORE declaring a plan "ready for approval"
- AFTER any plan edit that touches a number, a phase, or a skill list
- AFTER any plan edit that touches a goal, a turn, or a referenced artifact
- **(NEW v2.1)** AFTER any plan edit that touches a controller, a distribution
  tier claim, or an arbiter fixture

---

## PRECEDENCE RULE (v2.0, extended v2.1)

FC-14, FC-15, FC-19, FC-20, and FC-21 run FIRST. If any returns BLOCK,
FC-1..FC-12 are not evaluated.

```
Order of evaluation:
  FC-14  (Goal Delivery Completeness — SK-534)
  FC-15  (Design Artifact Populated — SK-537)
  FC-19  (Auth Requirement Declaration — NEW v2.1)
  FC-20  (Arbiter NDJSON Type Coverage — SK-554 — NEW v2.1)
  FC-21  (Definition of Done Protocol Reference — NEW v2.1)
      ↓ (only if all PASS or CHALLENGE)
  FC-1 through FC-12 (internal consistency)
  FC-16 (Architect Habits Discipline — SK-538 v1.2.0)
  FC-17 (Response Construction Protocol Compliance)
  FC-18 (UI/UX Compliance — FC-18 gate — if React pages)
```

Rationale: a plan with perfect internal consistency that ships unguarded controllers
or omits the portability protocol is still the wrong plan. FC-19/20/21 audit whether
the plan's security and certification posture is sound before correctness is checked.

---

## The 17 Failure Classes

### FC-14: Goal Delivery Completeness (v2.0 — RUNS FIRST)

**Governance:** SK-534 Goal Delivery Completeness Arbiter

Decompose goal statement into discrete elements. Each element mapped to ≥1 plan turn
with a verification step. Verdict per element: APPROVED | BLOCK_UNMAPPED |
BLOCK_UNVERIFIED | CHALLENGE. Any BLOCK → plan rejected before FC-1..FC-12 execute.

---

### FC-15: Design Artifact Populated (v2.0 — RUNS FIRST)

**Governance:** SK-537 Design Artifact Completeness

For every artifact referenced: Checks 1-2 (exist + fields populated) must pass.
Any artifact failing Checks 1-2 → plan rejected or must add enrichment task.

---

### FC-19: Auth Requirement Declaration — NEW v2.1

**Runs FIRST alongside FC-14 and FC-15.**

A plan that generates HTTP controllers must declare what authentication and
authorization those controllers require. Without this declaration, every generated
controller ships unguarded and every generated route is anonymous.

**When FC-19 applies:**
- Plan produces any file matching `*.controller.ts`
- Plan produces any HTTP endpoint (`@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`)
- Plan describes "REST API", "endpoints", "routes", or "HTTP interface"

**Detection protocol:**

```bash
# Step 1: Identify if the plan produces controllers
CTRL_COUNT=$(grep -cE "controller\.ts|@Controller|REST|endpoint|HTTP route" PLAN.md \
  2>/dev/null || echo 0)
echo "Controller-producing plan: $CTRL_COUNT references"

# Step 2: Check for auth declaration section
AUTH_SECTION=$(grep -cE "auth.*require|@UseGuards|@Roles|@Public|bypass.*path|BYPASS_PATH|\
  AUTH_DEFERRED|auth.*declaration|route.*protected|protected.*route" PLAN.md \
  2>/dev/null || echo 0)
echo "Auth declaration present: $AUTH_SECTION references"
```

**Required auth declaration content (at least one of):**
```
Option A — Full auth plan:
  Routes protected: [list route paths]
  Guards: @UseGuards(JwtAuthGuard, RolesGuard)
  Roles per route: [table of route → @Roles values]
  Public routes (if any): [list + BYPASS_PATHS update step]

Option B — AUTH_DEFERRED declaration:
  authStatus: AUTH_DEFERRED
  Reason: AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4 not yet deployed
  Phase H: [named follow-up session or plan phase for decoration]

Option C — N/A declaration:
  No HTTP controllers in this plan (service-only flow)
```

**FC-19 verdict rules:**
- `CTRL_COUNT === 0` → **PASS (N/A)** — no controllers, no auth requirement needed
- Auth declaration present (Option A, B, or C) → **PASS**
- `CTRL_COUNT > 0 AND AUTH_SECTION === 0` → **BLOCK** — add auth declaration before FC-1..FC-12

**Detection command (for plan review session):**
```bash
# Check if plan mentions controllers AND has auth section
HAS_CTRL=$(grep -cE "\.controller\.ts|@Controller\(" PLAN.md || echo 0)
HAS_AUTH=$(grep -cE "@UseGuards|AUTH_DEFERRED|auth.*declaration|bypass-paths" PLAN.md || echo 0)
echo "FC-19: controllers=$HAS_CTRL auth_declared=$HAS_AUTH"
# BLOCK if HAS_CTRL > 0 AND HAS_AUTH == 0
```

---

### FC-20: Arbiter NDJSON Type Coverage — NEW v2.1

**Runs FIRST alongside FC-14 and FC-15.**

**Governance:** SK-554 Arbiter NDJSON Requirements

A plan that creates or modifies `fixtures/arbiters/{slug}-arbiters.bulk.ndjson`
must declare that arbiter type coverage meets the SK-554 minimum type matrix.
Without this check, NDJSON files can ship with zero typed records and no
`scope_isolation` coverage.

**When FC-20 applies:**
- Plan produces or modifies `fixtures/arbiters/` files
- Plan describes "arbiter fixture", "NDJSON", or "bulk.ndjson"
- Plan produces a new flow (all new flows require NDJSON)

**Detection protocol:**

```bash
# Step 1: Does the plan touch arbiter fixtures?
NDJSON_REF=$(grep -cE "arbiters/|bulk\.ndjson|arbiter.*fixture|fixture.*arbiter" PLAN.md \
  2>/dev/null || echo 0)
echo "Arbiter NDJSON references: $NDJSON_REF"

# Step 2: Does the plan declare type coverage?
TYPE_COVERAGE=$(grep -cE "scope_isolation|arbiterType|SK-554|type.*coverage|NDJSON.*type" \
  PLAN.md 2>/dev/null || echo 0)
echo "Arbiter type coverage declared: $TYPE_COVERAGE references"
```

**Required NDJSON coverage declaration (at least one of):**
```
Option A — Coverage assertion:
  NDJSON type coverage: scope_isolation ≥1, domain ≥3, security ≥1 (PII flow)
  Verified by: jq '[.[] | select(.arbiterType=="scope_isolation")] | length' ≥ 1

Option B — New flow declaration:
  New NDJSON to be created following SK-554 minimum type matrix
  scope_isolation: ≥1 per tenant-data service (mandatory)
  [other types per SK-554 matrix for this flow's characteristics]

Option C — N/A declaration:
  No arbiter fixtures produced or modified in this plan
```

**FC-20 verdict rules:**
- `NDJSON_REF === 0` → **PASS (N/A)** — no arbiter fixtures in scope
- Coverage declaration present (Option A, B, or C) → **PASS**
- `NDJSON_REF > 0 AND TYPE_COVERAGE === 0` → **BLOCK** — add SK-554 type coverage declaration

---

### FC-21: Definition of Done Protocol Reference — NEW v2.1

**Runs FIRST alongside FC-14 and FC-15.**

A plan that claims to deliver a flow to ACTIVE, MOBILE, or TIER-X status must
reference the portability protocol (SK-553) and auth protocol (V10) as delivery
gates, or explicitly defer them with a named follow-up session. Without this
check, plans can claim completion without any protocol having been run.

This gap was identified across all 49 flows: zero plans referenced SK-553 Layer 1
or the TIER-C certification checklist in their delivery criteria.

**When FC-21 applies:**
- Plan claims to deliver a flow to ACTIVE, MOBILE, TIER_A, TIER_B, TIER_C, or TIER_D
- Plan uses language like "flow complete", "ready for distribution", "done"
- Plan produces a PHASE-COMPLETE document

**Detection protocol:**

```bash
# Step 1: Does the plan claim flow completion?
COMPLETION_CLAIM=$(grep -cE "\bACTIVE\b|\bMOBILE\b|\bTIER[_-][ABCD]\b|\bPHASE-COMPLETE\b|\
  flow.*complete|complete.*flow|done.*flow|distribution.*ready" PLAN.md \
  2>/dev/null || echo 0)
echo "Flow completion claims: $COMPLETION_CLAIM"

# Step 2: Does the plan reference the protocol?
PROTOCOL_REF=$(grep -cE "SK-553|portability.*test|V9.*gate|V10.*gate|Layer 1|AUTH_DEFERRED|\
  authStatus|portabilityStatus|tenantCertTier|Guard 14" PLAN.md \
  2>/dev/null || echo 0)
echo "Protocol references: $PROTOCOL_REF"

# Step 3: For TIER-C claims specifically, check Guard 14
TIER_C_CLAIM=$(grep -cE "TIER[_-]C|TIER_C" PLAN.md 2>/dev/null || echo 0)
GUARD_14_REF=$(grep -cE "Guard 14|AUTH-PLAN.*Phase.*[1-4]|auth.*infrastructure.*deploy" \
  PLAN.md 2>/dev/null || echo 0)
echo "TIER-C claims: $TIER_C_CLAIM | Guard 14 references: $GUARD_14_REF"
```

**Required protocol reference (at least one of):**
```
Option A — Full protocol references:
  portabilityStatus target: MOBILE (V9 gate)
  authStatus target: AUTH_READY or AUTH_DEFERRED (V10 gate)
  SK-553 Layer 1: included as delivery gate OR explicitly deferred
  tenantCertTier: TIER_A minimum declared
  [For TIER-C]: Guard 14 explicitly checked

Option B — Explicit deferral:
  SK-553 Layer 1: NOT_RUN — deferred to [named session or plan phase]
  authStatus: AUTH_DEFERRED — deferred to Phase H
  tenantCertTier: NONE — to be upgraded in [named session]

Option C — N/A:
  This plan does not complete a flow (infrastructure only, or partial phase)
```

**FC-21 verdict rules:**
- `COMPLETION_CLAIM === 0` → **PASS (N/A)** — no completion claim, no protocol required
- Protocol reference present (Option A, B, or C) → **PASS**
- `COMPLETION_CLAIM > 0 AND PROTOCOL_REF === 0` → **BLOCK** — add protocol reference
- `TIER_C_CLAIM > 0 AND GUARD_14_REF === 0` → **BLOCK** — Guard 14 must be explicitly addressed for TIER-C

---

### FC-1 through FC-12 (v1.0 — unchanged)

| FC | Name | What it catches |
|----|------|----------------|
| FC-1 | Count Drift | Number updated in one place, not all places |
| FC-2 | Path Errors | File paths don't match codebase convention |
| FC-3 | Phantom Skills | Skill in load order but no phase creates it |
| FC-4 | Duplicate Numbers | Same position number appears twice |
| FC-5 | Missing Items in Lists | Skill absent from one required list |
| FC-6 | Stale Numbers | Number references older version of live data |
| FC-7 | Phase Placement Errors | Skill in different phase across plan/deliverable/session |
| FC-8 | Format Violations | Plan formatted for human reading, not Claude Code execution |
| FC-9 | Requirement Ambiguity | Delivery requirement has no project-specific "done" definition |
| FC-10 | Cross-Document Propagation | Fix applied to one doc, stale in others |
| FC-11 | Overview-Detail Phase Mismatch | Phase header lists different skills than deliverable block |
| FC-12 | Foundational Principles Compliance | Plan doesn't address P1-P8 gate questions |

Full detection protocols for FC-1..FC-12: see plan-review-skill v1.0.0.

---

### FC-16: Architect Habits Discipline (v2.0 — SK-538 v1.2.0)

Verifies the plan author ran the three-step doc-first loop at authoring time.
PASS if authoring-time evidence present; CONCERN if Tier 1 Gate 0i passed but
authoring evidence missing; BLOCK if both absent.

---

### FC-17: Response Construction Protocol Compliance (v2.0)

For every substantive response in the plan-authoring session: Step 1 decomposition,
Step 2 absorption (full mode), Step 3 prior-correction thread, Step 5 source-layer
tags, Step 6 feedback recheck. All must be present for the response to be compliant.

---

### FC-18: UI/UX Compliance (v2.0 — if React pages)

Fires only if the plan produces `*.tsx` files in `client/src/pages/`. Verifies
Phase 7 is declared, FC-18 Audit Trail path is specified, grammar type declared
for tenant-facing pages. Does not fire for server-only plans.

---

## Updated Review Protocol (12 steps)

**Steps 1-3 (new in v2.1 — run FIRST):**

**Step 0a** — FC-19 Auth Requirement Declaration: does the plan produce controllers?
If yes: is auth declared (Option A/B/C)?
```bash
HAS_CTRL=$(grep -cE "\.controller\.ts|@Controller\(" PLAN.md || echo 0)
HAS_AUTH=$(grep -cE "@UseGuards|AUTH_DEFERRED|auth.*declaration|bypass-paths" PLAN.md || echo 0)
echo "FC-19: $([[ $HAS_CTRL -eq 0 || $HAS_AUTH -gt 0 ]] && echo 'PASS' || echo 'BLOCK')"
```

**Step 0b** — FC-20 NDJSON Type Coverage: does the plan touch arbiters?
If yes: is SK-554 type coverage declared?
```bash
HAS_NDJSON=$(grep -cE "arbiters/|bulk\.ndjson" PLAN.md || echo 0)
HAS_TYPES=$(grep -cE "scope_isolation|arbiterType|SK-554" PLAN.md || echo 0)
echo "FC-20: $([[ $HAS_NDJSON -eq 0 || $HAS_TYPES -gt 0 ]] && echo 'PASS' || echo 'BLOCK')"
```

**Step 0c** — FC-21 Definition of Done Protocol Reference: does the plan claim completion?
If yes: is protocol referenced? For TIER-C: is Guard 14 addressed?
```bash
HAS_DONE=$(grep -cE "ACTIVE|MOBILE|TIER[_-][ABCD]|PHASE-COMPLETE" PLAN.md || echo 0)
HAS_PROTO=$(grep -cE "SK-553|V9|V10|AUTH_DEFERRED|portabilityStatus|tenantCertTier" PLAN.md || echo 0)
HAS_G14=$(grep -cE "Guard 14" PLAN.md || echo 0)
TIER_C=$(grep -cE "TIER[_-]C" PLAN.md || echo 0)
echo "FC-21 done: $([[ $HAS_DONE -eq 0 || $HAS_PROTO -gt 0 ]] && echo 'PASS' || echo 'BLOCK')"
echo "FC-21 Guard14: $([[ $TIER_C -eq 0 || $HAS_G14 -gt 0 ]] && echo 'PASS' || echo 'BLOCK')"
```

**Steps 1-10 (original — unchanged):**
Step 1: Build Skill Presence Matrix (FC-5). Step 2: Verify Phase Assignments (FC-7).
Step 3: Count All Numbers (FC-1). Step 4: Verify Paths (FC-2). Step 5: Check Load
Order (FC-3/FC-4). Step 6: Verify Source of Numbers (FC-6). Step 7: Format Check
(FC-8). Step 8: Requirement Definitions (FC-9). Step 9: Cross-Document Sweep (FC-10).
Step 10: Overview-Detail Match (FC-11) + Principles Compliance (FC-12).

**Steps 11-12 (v2.0 — unchanged):**
Step 11: FC-14 Goal Delivery + FC-15 Design Artifact Completeness.
Step 12: FC-16 Architect Habits + FC-17 Response Construction + FC-18 UI/UX.

---

## Passing Criteria — Three Gates Required (updated v2.1)

**Gate A — FC Checks (Claude Code runs all steps)**

```
✅ FC-19: Auth declaration present (or N/A for no-controller plans)
✅ FC-20: NDJSON type coverage declared per SK-554 (or N/A)
✅ FC-21: Protocol reference present for completion claims (or N/A)
✅ FC-21: Guard 14 addressed for TIER-C claims (or N/A)
✅ FC-14: All goal elements mapped + verification specified
✅ FC-15: All referenced artifacts pass Checks 1-2
✅ FC-1..FC-12: All internal consistency checks pass
✅ FC-16: Architect habits doc-first loop evidence present
✅ FC-17: Response construction protocol compliant
✅ FC-18: UI/UX compliance (if React pages produced)
```

**Gate B — AI Cross-Review** (2 independent models, different from plan author)

**Gate C — Luba Written Approval** — explicit written approval before execution.

---

## Anti-Patterns Table (updated v2.1)

| Anti-pattern | FC | Real cost |
|---|---|---|
| "I updated the count" (in one place) | FC-1 | 4 re-review rounds |
| Copying a path from memory | FC-2 | 42 files in wrong location |
| Conceptual placeholder in load order | FC-3 | Claude Code loads non-existent skill |
| Duplicate phase numbers | FC-4 | Load order wrong |
| Adding skill without updating all lists | FC-5 | Count drift |
| Using plan-time estimates for live counts | FC-6 | Gate passes on wrong baseline |
| Moving skill without updating all locations | FC-7 | SESSION builds in wrong phase |
| Sending merged doc to Claude Code | FC-8 | Claude Code commits as reference |
| Generic requirement ("UI e2e") | FC-9 | Wrong definition invented |
| Fix in one doc, stale in others | FC-10 | Most frequent failure (30% of issues) |
| Phase header vs deliverable mismatch | FC-11 | Count drift + phantom |
| P1-P8 not answered | FC-12 | Principles violations shipped |
| Plan produces controllers, no auth section | FC-19 | Unguarded controllers shipped |
| Plan touches NDJSON, no type coverage check | FC-20 | Zero arbiterType records shipped |
| Plan claims ACTIVE/MOBILE, no protocol ref | FC-21 | Flow certified without protocol run |
| Plan claims TIER-C, no Guard 14 mention | FC-21 | TIER-C claimed without auth infra |

## Changelog

- **v1.0.0** — initial. FC-1..FC-12, 3-gate approval, 10-step protocol.
- **v2.0.0** — FC-14 (Goal Delivery Completeness, SK-534) + FC-15 (Design Artifact
  Populated, SK-537) run FIRST. Precedence rule. FC-16 (Architect Habits), FC-17
  (Response Construction), FC-18 (UI/UX). 12-step protocol.
- **v2.1.0** — FC-19 (Auth Requirement Declaration), FC-20 (Arbiter NDJSON Type
  Coverage per SK-554), FC-21 (Definition of Done Protocol Reference including Guard 14
  check for TIER-C). All three run FIRST alongside FC-14/FC-15. Steps 0a/0b/0c added
  to review protocol. Anti-patterns table extended. Closes AUTH-ARBITER-SKILLS-
  REMEDIATION-PLAN-v3.0 Phase 10.
