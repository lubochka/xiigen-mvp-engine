# GUIDE-B03 — How to Produce `FLOW-XX-PLAN-STATE.json`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 13 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-24
## v2.1 amendment: authConstraints block (from STEP-1 auth constraints, GUIDE-B21 v3.2)
##   and tenantCertTarget field added to schema. Both populated during STEP-1 authoring.
##   Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 17.

---

## FINAL GOAL (re-read before authoring any FLOW-XX-PLAN-STATE.json):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

---

## WHAT THIS FILE IS

`FLOW-XX-PLAN-STATE.json` is the **planning phase progress tracker**. It records the
completion status of the 10 STEP files (STEP-1-INVARIANTS through STEP-10-CHAIN-REVIEW)
and the outcome of each planning cycle (Cycle 1 Planner, Cycle 2 Convergence,
Cycle 3 Depth Decision).

This file is the machine-readable gate between the planning phase and implementation:
`"ready_for_phase_a": true` means all 10 STEP documents are authored, the chain review
passes, and Claude Code can begin Phase A (corpus seed + design fixtures).

**Critical distinction from IMPL-STATE.json (B-02):**
- IMPL-STATE tracks *implementation* phase progress (Phases A-F, services, tests)
- PLAN-STATE tracks *planning* phase progress (Steps 1-10, planning cycles, chain review)
- PLAN-STATE is completed BEFORE implementation starts; IMPL-STATE is maintained DURING implementation

**Authoring schema reference:** ZIP-01 `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md`;
ZIP-03 `FLOW-PREP-MASTER-PLAN.md` (step definitions for steps 1-10)

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-01 | PRIMARY + STRUCTURE | AUTHORING-GUIDE v1.15 §plan-state schema; 10-STEP planning sequence documentation |
| ZIP-03 | PRIMARY | FLOW-PREP-MASTER-PLAN.md — 10 step definitions (rounds R0-R10 each produce one STEP document) |
| ZIP-11 | FIXTURE | FLOW-32 PLAN-STATE.json (step tracker + chain_review_verdict); FLOW-09 and FLOW-25 examples (identical structure — confirmed consistent) |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-PLAN-STATE.json`
**File size range:** 2-4 KB
**When authored:** Created during Step 1 (INVARIANTS); updated incrementally as each STEP document completes; finalized at Step 10 (CHAIN-REVIEW)

---

## SCHEMA — CONFIRMED FROM THREE FLOWS (FLOW-09, FLOW-25, FLOW-32)

All three flows produce structurally identical PLAN-STATE.json files. The schema is fixed — field names and structure do not vary.

```json
{
  "flowId": "FLOW-XX",
  "flow_title": "{Display Name from spec}",
  "task_range": "T{N}-T{N+K}",
  "domain": "{XIIGen Engine domain — from design simulation}",
  "security_sensitive": false,
  "guide_version": "v2",
  "current_step": {1-10},
  "step_status": "COMPLETE | IN_PROGRESS | NOT_STARTED",
  "cycle1": {
    "status": "INVARIANTS_EXTRACTED | TEST_DEFINED | PENDING",
    "context_package_file": "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md",
    "grade_threshold": 0.85
  },
  "cycle2": {
    "status": "TEST_DEFINED | PENDING",
    "template_file": "FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md"
  },
  "cycle3": {
    "status": "TEST_DEFINED | PENDING",
    "context_package_file": "FLOW-XX-STEP-6-CYCLE3-CONTEXT.md"
  },
  "executor_handoff": {
    "status": "HANDOFF_CONTRACT_READY | PENDING",
    "handoff_file": "FLOW-XX-STEP-8-HANDOFF-CONTRACT.md"
  },
  "visibility_contracts": {
    "status": "CONTRACTS_DEFINED | PENDING",
    "per_cycle": {
      "cycle1": "DEFINED | PENDING",
      "cycle2": "DEFINED | PENDING",
      "cycle3": "DEFINED | PENDING",
      "cycle4": "DEFINED | PENDING",
      "cycle5_meta_arbiter": "DEFINED | PENDING"
    }
  },
  "chain_review": {
    "gaps": [],
    "verdict": "READY_FOR_EXECUTION | BLOCKED | IN_PROGRESS"
  },
  "meta_arbiter": {
    "trigger_threshold": 0.85,
    "skill": "SK-525"
  },
  "missing_skills": [],
  "documents_produced": [
    "FLOW-XX-STEP-1-INVARIANTS.md",
    "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md",
    "FLOW-XX-STEP-3-CYCLE1-TEST.md",
    "FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md",
    "FLOW-XX-STEP-5-CYCLE2-TEST.md",
    "FLOW-XX-STEP-6-CYCLE3-CONTEXT.md",
    "FLOW-XX-STEP-7-CYCLE3-TEST.md",
    "FLOW-XX-STEP-8-HANDOFF-CONTRACT.md",
    "FLOW-XX-STEP-9-VISIBILITY.md",
    "FLOW-XX-STEP-10-CHAIN-REVIEW.md"
  ],
  "prepared_at": "{YYYY-MM-DD}",
  "ready_for_phase_a": false,
  "blockers": [],
  "authConstraints": {
    "option": "A | B | C",
    "hasHttpControllers": null,
    "routeCount": 0,
    "publicRouteCount": 0,
    "requiredRoles": [],
    "identityCritical": false,
    "authDeferredReason": null,
    "phaseHSession": null
  },
  "tenantCertTarget": "NOT_DISTRIBUTABLE | TIER_A | TIER_B | TIER_C | TIER_D"
}
```

---

## STEP-BY-STEP AUTHORING INSTRUCTIONS FOR CLAUDE CODE

### Step 1: Create the file at the start of Step 1 (INVARIANTS)

When STEP-1-INVARIANTS.md is being authored, create PLAN-STATE.json with initial values:

```json
{
  "flowId": "FLOW-XX",
  "flow_title": "{from spec or master state}",
  "task_range": "T{N}-T{N+K}",
  "domain": "{from design simulation domain declaration}",
  "security_sensitive": false,
  "guide_version": "v2",
  "current_step": 1,
  "step_status": "IN_PROGRESS",
  "cycle1": { "status": "PENDING", "context_package_file": "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md", "grade_threshold": 0.85 },
  "cycle2": { "status": "PENDING", "template_file": "FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md" },
  "cycle3": { "status": "PENDING", "context_package_file": "FLOW-XX-STEP-6-CYCLE3-CONTEXT.md" },
  "executor_handoff": { "status": "PENDING", "handoff_file": "FLOW-XX-STEP-8-HANDOFF-CONTRACT.md" },
  "visibility_contracts": { "status": "PENDING", "per_cycle": { "cycle1": "PENDING", "cycle2": "PENDING", "cycle3": "PENDING", "cycle4": "PENDING", "cycle5_meta_arbiter": "PENDING" } },
  "chain_review": { "gaps": [], "verdict": "IN_PROGRESS" },
  "meta_arbiter": { "trigger_threshold": 0.85, "skill": "SK-525" },
  "missing_skills": [],
  "documents_produced": [],
  "prepared_at": "{today YYYY-MM-DD}",
  "ready_for_phase_a": false,
  "blockers": [],
  "authConstraints": {
    "option": "A | B | C",
    "hasHttpControllers": null,
    "routeCount": 0,
    "publicRouteCount": 0,
    "requiredRoles": [],
    "identityCritical": false,
    "authDeferredReason": null,
    "phaseHSession": null
  },
  "tenantCertTarget": "NOT_DISTRIBUTABLE | TIER_A | TIER_B | TIER_C | TIER_D"
}
```

---

### Step 2: Update incrementally as each STEP document completes

Each STEP document (B-27..B-36) ends with a `## STATE WRITE` block that specifies
what to update in PLAN-STATE.json. After authoring each STEP file, apply those writes.

**STATE WRITE mapping — what each STEP updates:**

| STEP file | STATE WRITE content | What to update in PLAN-STATE.json |
|-----------|--------------------|------------------------------------|
| STEP-1 (INVARIANTS) | `cycle1.status → "INVARIANTS_EXTRACTED"`, `step_status → "COMPLETE"` | `cycle1.status`, `current_step → 1`, `step_status → "COMPLETE"`, add `FLOW-XX-STEP-1-INVARIANTS.md` to `documents_produced`, **set `authConstraints` from auth constraints block, set `tenantCertTarget` from distribution intent** (NEW v2.1) |
| STEP-2 (CYCLE1-CONTEXT) | `cycle1.status → "TEST_DEFINED"` (after STEP-3) | Update after STEP-3 completes; `cycle1.status → "TEST_DEFINED"` |
| STEP-3 (CYCLE1-TEST) | `cycle1.status → "TEST_DEFINED"`, `cycle1.grade_threshold → 0.85` | `cycle1.status → "TEST_DEFINED"`, `current_step → 3` |
| STEP-4 (CYCLE2-TEMPLATE) | (no direct state write; STEP-5 writes cycle2) | Add to `documents_produced` |
| STEP-5 (CYCLE2-TEST) | `cycle2.status → "TEST_DEFINED"` | `cycle2.status → "TEST_DEFINED"`, `current_step → 5` |
| STEP-6 (CYCLE3-CONTEXT) | (no direct state write; STEP-7 writes cycle3) | Add to `documents_produced` |
| STEP-7 (CYCLE3-TEST) | `cycle3.status → "TEST_DEFINED"` | `cycle3.status → "TEST_DEFINED"`, `current_step → 7` |
| STEP-8 (HANDOFF-CONTRACT) | `executor_handoff.status → "HANDOFF_CONTRACT_READY"` | `executor_handoff.status`, `current_step → 8` |
| STEP-9 (VISIBILITY) | `visibility_contracts.status → "CONTRACTS_DEFINED"`, all per_cycle → `"DEFINED"` | `visibility_contracts` object, `current_step → 9` |
| STEP-10 (CHAIN-REVIEW) | `chain_review.verdict → "READY_FOR_EXECUTION"`, `current_step → 10`, `step_status → "COMPLETE"` | `chain_review`, `current_step`, `step_status`, set `ready_for_phase_a: true` if verdict = READY_FOR_EXECUTION |

**Rule:** Always add the STEP file to `documents_produced[]` when it is authored. The
`documents_produced` array should list exactly the STEP files that currently exist in
`docs/sessions/FLOW-XX/`.

```bash
# Verify which STEP files exist before updating documents_produced
ls docs/sessions/FLOW-XX/FLOW-XX-STEP-*.md 2>/dev/null
```

---

### Step 2b: Populate authConstraints and tenantCertTarget from STEP-1 (NEW v2.1)

These two fields are populated during Step 1 (INVARIANTS) authoring, when the
auth constraints block and `flow_module_name` FREEDOM key are declared in
FLOW-XX-STEP-1-INVARIANTS.md (per GUIDE-B21 v3.2).

**authConstraints** — derived from the auth constraints section in STEP-1:

```json
"authConstraints": {
  "option": "A",
  "hasHttpControllers": true,
  "routeCount": 4,
  "publicRouteCount": 1,
  "requiredRoles": ["tenant_admin", "tenant_user"],
  "identityCritical": false,
  "authDeferredReason": null,
  "phaseHSession": null
}
```

**Field values by option (from GUIDE-B21 v3.2 FLOW-SPECIFIC CONSTRAINTS):**

| Field | Option A (full auth plan) | Option B (AUTH_DEFERRED) | Option C (N/A — no controllers) |
|-------|--------------------------|--------------------------|--------------------------------|
| `option` | `"A"` | `"B"` | `"C"` |
| `hasHttpControllers` | `true` | `true` | `false` |
| `routeCount` | actual count from spec | actual count | `0` |
| `publicRouteCount` | count of @Public() routes | count or `0` | `0` |
| `requiredRoles` | array of role strings | array or `[]` | `[]` |
| `identityCritical` | from identity-critical detection grep | from grep | `false` |
| `authDeferredReason` | `null` | reason string (e.g. `"AUTH-PLAN v3 Phases 1-4 not yet deployed"`) | `null` |
| `phaseHSession` | `null` | named session (e.g. `"FLOW-XX-AUTH-DECORATION"`) | `null` |

**How to populate:**
```bash
# Extract from STEP-1 INVARIANTS auth constraints section:
grep -A 20 "Auth constraints" docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md
# Read Option A/B/C, route count, roles, identity-critical flag

# Identify controllers from implementation plan (or spec):
grep -c "@Controller\|controller" docs/sessions/FLOW-XX/FLOW-XX-IMPLEMENTATION-PLAN*.md 2>/dev/null
# Or from spec: count HTTP endpoint groups
```

**STEP-1 STATE WRITE extension (NEW v2.1):**
STEP-1 STATE WRITE now includes authConstraints and tenantCertTarget:
```
authConstraints → populated from STEP-1 auth constraints section
tenantCertTarget → populated from STEP-1 distribution intent
```

**tenantCertTarget** — the certification tier this flow is targeting:

```json
"tenantCertTarget": "TIER_B"
```

Values:
| Value | Meaning |
|-------|---------|
| `"NOT_DISTRIBUTABLE"` | Flow is engine-internal — not intended for tenant distribution |
| `"TIER_A"` | Targeting SK-553 Layer 1 certification (unit test gate) |
| `"TIER_B"` | Targeting TIER-A + repo naming + repo evidence |
| `"TIER_C"` | Targeting TIER-B + AI Adaptation + per-role visual + R6 auth isolation (Guard 14) |
| `"TIER_D"` | Targeting full visual coverage at all cascade points |

**How to determine:**
Read the flow's design simulation or master plan for distribution intent.
If the spec mentions "tenant marketplace", "tenant fork", "distribution" → TIER_A minimum.
If there is no distribution intent → NOT_DISTRIBUTABLE.

---

### Step 3: Set ready_for_phase_a at Step 10

```json
"ready_for_phase_a": true
```

Set to `true` ONLY when ALL of these conditions are met:
1. `current_step = 10`
2. `step_status = "COMPLETE"`
3. `chain_review.verdict = "READY_FOR_EXECUTION"`
4. `missing_skills = []` (no unresolved missing skills)
5. `blockers = []` (no blocking issues)

If `chain_review.verdict = "BLOCKED"`, set `ready_for_phase_a: false` and populate
`blockers[]` with the blocking issues from STEP-10's chain review table.

---

### Step 4: Populate missing_skills if any are found

During Step 10 (CHAIN-REVIEW), the MISSING SKILLS AUDIT section lists any skills
referenced in the planning documents that don't exist. Copy those to `missing_skills[]`:

```json
"missing_skills": ["SK-NNN — {skill name}"]
```

If the audit finds no missing skills: `"missing_skills": []`

**Observed value:** All three confirmed examples (FLOW-09, FLOW-25, FLOW-32) have
`"missing_skills": []` — the planning process successfully covers all needed skills.

---

### Step 5: Populate blockers if chain_review is BLOCKED

```json
"chain_review": {
  "gaps": [
    "C{N} → C{N+1} boundary: {what is missing that prevents the handoff}",
    "Missing skill: {skill ID and name}"
  ],
  "verdict": "BLOCKED"
},
"blockers": [
  "Step 10 chain review BLOCKED: {reason}. Fix required before Phase A."
]
```

**Observed value:** All three confirmed examples have `"chain_review": { "gaps": [], "verdict": "READY_FOR_EXECUTION" }` — a planning sequence that reaches all 10 steps correctly will typically have no gaps.

---

## COMPLETE FINAL-STATE TEMPLATE

The PLAN-STATE.json at completion (all 10 steps done, ready for Phase A):

```json
{
  "flowId": "FLOW-XX",
  "flow_title": "{Display Name}",
  "task_range": "T{N}-T{N+K}",
  "domain": "{XIIGen Engine — domain area}",
  "security_sensitive": false,
  "guide_version": "v2",
  "current_step": 10,
  "step_status": "COMPLETE",
  "cycle1": {
    "status": "TEST_DEFINED",
    "context_package_file": "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md",
    "grade_threshold": 0.85
  },
  "cycle2": {
    "status": "TEST_DEFINED",
    "template_file": "FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md"
  },
  "cycle3": {
    "status": "TEST_DEFINED",
    "context_package_file": "FLOW-XX-STEP-6-CYCLE3-CONTEXT.md"
  },
  "executor_handoff": {
    "status": "HANDOFF_CONTRACT_READY",
    "handoff_file": "FLOW-XX-STEP-8-HANDOFF-CONTRACT.md"
  },
  "visibility_contracts": {
    "status": "CONTRACTS_DEFINED",
    "per_cycle": {
      "cycle1": "DEFINED",
      "cycle2": "DEFINED",
      "cycle3": "DEFINED",
      "cycle4": "DEFINED",
      "cycle5_meta_arbiter": "DEFINED"
    }
  },
  "chain_review": {
    "gaps": [],
    "verdict": "READY_FOR_EXECUTION"
  },
  "meta_arbiter": {
    "trigger_threshold": 0.85,
    "skill": "SK-525"
  },
  "missing_skills": [],
  "documents_produced": [
    "FLOW-XX-STEP-1-INVARIANTS.md",
    "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md",
    "FLOW-XX-STEP-3-CYCLE1-TEST.md",
    "FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md",
    "FLOW-XX-STEP-5-CYCLE2-TEST.md",
    "FLOW-XX-STEP-6-CYCLE3-CONTEXT.md",
    "FLOW-XX-STEP-7-CYCLE3-TEST.md",
    "FLOW-XX-STEP-8-HANDOFF-CONTRACT.md",
    "FLOW-XX-STEP-9-VISIBILITY.md",
    "FLOW-XX-STEP-10-CHAIN-REVIEW.md"
  ],
  "prepared_at": "{YYYY-MM-DD}",
  "ready_for_phase_a": true,
  "blockers": [],
  "authConstraints": {
    "option": "A | B | C",
    "hasHttpControllers": true,
    "routeCount": 0,
    "publicRouteCount": 0,
    "requiredRoles": [],
    "identityCritical": false,
    "authDeferredReason": null,
    "phaseHSession": null
  },
  "tenantCertTarget": "NOT_DISTRIBUTABLE | TIER_A | TIER_B | TIER_C | TIER_D"
}
```

---

## FIELD-BY-FIELD REFERENCE

| Field | Type | Values | Source |
|-------|------|--------|--------|
| `flowId` | string | `"FLOW-XX"` | Master state |
| `flow_title` | string | Display name | ZIP-16 spec or master state |
| `task_range` | string | `"T{N}-T{N+K}"` | Implementation plan or STEP-1 INVARIANTS |
| `domain` | string | `"XIIGen Engine — {area}"` | Design simulation domain declaration |
| `security_sensitive` | boolean | Always `false` (not `"false"`) | Default |
| `guide_version` | string | Always `"v2"` (fixed) | ZIP-03 FLOW-PREP-MASTER-PLAN version |
| `current_step` | integer | 0-10 | Increments with each STEP completed |
| `step_status` | string | `"NOT_STARTED"` / `"IN_PROGRESS"` / `"COMPLETE"` | Overall planning phase status |
| `cycle1.status` | string | `"PENDING"` → `"INVARIANTS_EXTRACTED"` → `"TEST_DEFINED"` | Updated from STEP-1 and STEP-3 STATE WRITE |
| `cycle1.grade_threshold` | float | Always `0.85` | Fixed threshold from STEP-3 |
| `cycle2.status` | string | `"PENDING"` → `"TEST_DEFINED"` | Updated from STEP-5 STATE WRITE |
| `cycle3.status` | string | `"PENDING"` → `"TEST_DEFINED"` | Updated from STEP-7 STATE WRITE |
| `executor_handoff.status` | string | `"PENDING"` → `"HANDOFF_CONTRACT_READY"` | Updated from STEP-8 STATE WRITE |
| `visibility_contracts.status` | string | `"PENDING"` → `"CONTRACTS_DEFINED"` | Updated from STEP-9 STATE WRITE |
| `visibility_contracts.per_cycle.*` | string | `"PENDING"` → `"DEFINED"` | All 5 set at STEP-9 |
| `chain_review.gaps` | array | `[]` (no gaps) or gap descriptions | From STEP-10 chain boundary table |
| `chain_review.verdict` | string | `"IN_PROGRESS"` → `"READY_FOR_EXECUTION"` or `"BLOCKED"` | From STEP-10 CHAIN VERDICT |
| `meta_arbiter.trigger_threshold` | float | Always `0.85` | Fixed |
| `meta_arbiter.skill` | string | Always `"SK-525"` | Fixed |
| `missing_skills` | array | `[]` or `["SK-NNN — {name}"]` | From STEP-10 MISSING SKILLS AUDIT |
| `documents_produced` | array | List of 10 STEP filenames | Populated as each STEP is authored |
| `prepared_at` | string | `"YYYY-MM-DD"` | Date STEP-10 was completed |
| `ready_for_phase_a` | boolean | `false` until STEP-10 passes | Gate field |
| `blockers` | array | `[]` or blocking items | From STEP-10 when verdict = BLOCKED |
| `authConstraints` | object | See Step 2b | From STEP-1 auth constraints section (GUIDE-B21 v3.2) |
| `authConstraints.option` | string | `"A"` / `"B"` / `"C"` | Option A=full plan, B=AUTH_DEFERRED, C=N/A |
| `authConstraints.identityCritical` | boolean | `false` (default) or `true` if grep finds masterTenantId/superJudge | From identity-critical detection in STEP-1 |
| `tenantCertTarget` | string | `"NOT_DISTRIBUTABLE"` / `"TIER_A"` / `"TIER_B"` / `"TIER_C"` / `"TIER_D"` | From STEP-1 distribution intent |

---

## INCREMENTAL UPDATE PATTERN

PLAN-STATE.json is written **incrementally during the planning phase**. Each STEP
document's `## STATE WRITE` block tells Claude Code exactly what to update.

**Correct pattern:**
```
Author STEP-1 → Update PLAN-STATE: current_step=1, step_status=COMPLETE, cycle1.status=INVARIANTS_EXTRACTED, add STEP-1 to documents_produced
Author STEP-2 → Update PLAN-STATE: current_step=2, add STEP-2 to documents_produced
Author STEP-3 → Update PLAN-STATE: current_step=3, cycle1.status=TEST_DEFINED
...
Author STEP-10 → Update PLAN-STATE: current_step=10, step_status=COMPLETE, chain_review.verdict=READY_FOR_EXECUTION, ready_for_phase_a=true, prepared_at=today
```

**SILENT_FAILURE RISK:** The most common error is writing PLAN-STATE.json once at the
end (after Step 10) and back-filling all the status values from memory rather than from
the actual STATE WRITE blocks in each STEP document. This creates fabricated state.

The correct approach: update PLAN-STATE.json after EACH step completes, applying only
what that step's STATE WRITE block specifies.

---

## RELATIONSHIP TO OTHER B-TYPES

**PLAN-STATE.json feeds into:**
- `FLOW-XX-STATE.json` (B-43): the broader state ledger includes plan state as one validation record
- `SESSION-BRIEF.md` (B-41): "ready_for_phase_a" status is reported in the session brief
- `FLOW-XX-CURRENT-STATE.json` (B-01): D1.step_artifacts references the documents_produced list

**PLAN-STATE.json reads from:**
- All 10 STEP files (B-27..B-36): each STEP's STATE WRITE block provides the update values

---

## SELF-CHECK BEFORE SAVING FINAL STATE

```
□ flowId matches the canonical flow ID
□ guide_version is exactly "v2" (string, not number)
□ security_sensitive is false (boolean, not string "false")
□ meta_arbiter.trigger_threshold is 0.85 (float, not string "0.85")
□ meta_arbiter.skill is "SK-525"
□ documents_produced[] contains exactly the STEP files confirmed to exist on disk
  (run: ls docs/sessions/FLOW-XX/FLOW-XX-STEP-*.md to verify)
□ chain_review.verdict = "READY_FOR_EXECUTION" if and only if STEP-10 explicitly stated this
□ ready_for_phase_a = true if and only if chain_review.verdict = "READY_FOR_EXECUTION"
  AND missing_skills = [] AND blockers = []
□ prepared_at is today's date (not the date implementation started)
□ File saved to docs/sessions/FLOW-XX/FLOW-XX-PLAN-STATE.json
□ [v2.1] authConstraints.option is "A", "B", or "C" — not null or placeholder
□ [v2.1] authConstraints populated from STEP-1 auth constraints section (not invented)
□ [v2.1] tenantCertTarget is set (not a placeholder value) for all flows
□ [v2.1] If authConstraints.option = "B": authDeferredReason and phaseHSession are non-null
□ [v2.1] If flow has HTTP controllers: hasHttpControllers = true and requiredRoles is non-empty
```

---

## THREE CONFIRMED EXAMPLES SUMMARY

All three flows (FLOW-09, FLOW-25, FLOW-32) produce structurally identical PLAN-STATE.json:
- Same top-level fields in same order
- `guide_version: "v2"` (fixed across all flows)
- `security_sensitive: false` (fixed across all flows)
- `meta_arbiter: { trigger_threshold: 0.85, skill: "SK-525" }` (fixed across all flows)
- All `documents_produced` arrays contain exactly 10 STEP filenames
- All `chain_review.verdict: "READY_FOR_EXECUTION"` (planning chains were correct)
- All `missing_skills: []` (planning skills were available)
- All `blockers: []`

The ONLY differences between flows are: `flowId`, `flow_title`, `task_range`, `domain`,
`prepared_at`, and the specific STEP filenames in `documents_produced`.

---

## C30/C38 SOURCE SPLIT NOTE

The PLAN-STATE.json schema is **universal** — same structure for all 49 flows.
`flow_title` and `task_range` come from:
- FLOW-01..34: ZIP-16 primary spec (`{NN}-{slug}.md` → personas + task types)
- FLOW-35..47: DESIGN-SIMULATION-R1.md (flow_title and task_range are declared in the header)
- FLOW-00/FLOW-48: ZIP-17 ROLE-ANALYSIS-BATCH data + STEP-1-INVARIANTS (which defines task_range)

---

## AUTHORING QUALITY GATE

This guidance file is SELF-SUFFICIENT if a Claude Code session can produce a correct
`FLOW-XX-PLAN-STATE.json` using only:
1. This guidance file
2. The STEP files for this flow (to apply STATE WRITE blocks)
3. The flow's basic identity (flowId, slug, task_range)

---
*GUIDE-B03 | Round 13 | Phase 4 — Guidance File Authoring*
*Sources: ZIP-01 (P+S), ZIP-03 (P), ZIP-11 (F)*
*Next: GUIDE-B04 — FLOW-XX-QA-COVERAGE-STATE.json (Round 14)*
*v2.1 amendment: authConstraints block (option A/B/C + fields from STEP-1 auth*
*constraints section in GUIDE-B21 v3.2) and tenantCertTarget field added.*
*Step 2b added: authoring instructions + field table + STATE WRITE extension.*
*Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 17.*
