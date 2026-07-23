# GUIDE-B38 — How to Produce `STATE.json` (with ZIP-15 §1 Role Registry Integration)
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 48 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any STATE.json):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the STATE.json guidance: one of the 50 guidance files that together
constitute the library. When Claude Code applies this guidance, it will produce a
correct STATE.json (in its applicable variant) that tracks all live state for a
flow's preparation and implementation.

---

## WHAT THIS FILE COVERS

`STATE.json` refers to a family of JSON state-tracking files. A flow may have
several STATE.json variants, each serving a different lifecycle stage:

| Variant | Purpose | When created |
|---------|---------|-------------|
| `FLOW-XX-PLAN-STATE.json` | Tracks the 10-step simulation pipeline progress (Steps 1-10) | During design simulation (Steps 1-8) |
| `FLOW-XX-IMPL-STATE.json` | Tracks the full implementation (Phases A-F) | During implementation |
| `FLOW-XX-CURRENT-STATE.json` | Snapshot of current codebase state across 5 dimensions | During reconciliation or audit runs |
| `FLOW-XX-STATE.json` (final) | Live execution state during Phase B teaching sessions | During Phase B-F teaching |

The ZIP-15 §1 role registry integration note means: when a flow introduces new
roles from ZIP-15's role taxonomy (GUIDE-B21 covers which roles to declare), those
roles must be recorded in the flow's state files under a `roles_introduced` or
similar field.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-17 | PRIMARY | `FLOW-46-IMPL-STATE.json` — full implementation state: flowId, flowName, slug, wave, phase_status, prerequisites, phases (A-F with status/label/artifacts/completed_at), artifact_boundaries (task types/factories/BFA rules introduced), test_baseline, indices_required, design_documents, architectural_decisions_locked, branch |
| ZIP-17 | PRIMARY | `FLOW-46-PLAN-STATE.json` — simulation pipeline state: flow_id, flow_name, current_step, step_status, user_intent, task_range, factory_range, bfa_rule_range, cycle1/2/3, executor_handoff, visibility_contracts, chain_review, documents_produced, documents_pending, prerequisites, artifact_boundaries_this_flow |
| ZIP-17 | PRIMARY | `FLOW-46-CURRENT-STATE.json` — codebase snapshot state: $schema_version, flowId, slug, D1 folder inventory, D2 server processes, D3 UI QA state, D4 design sim QA, D5 cross-tenant install, track_a/b/c topology, overall_status, blockers, follow_ups |
| ZIP-11 | COMPARISON | `FLOW-01/final-flow-testing/FLOW-01-STATE.json` — Phase B execution state: taskTypes, infrastructure_gate, baseline, current_phase, T47/T48/T49 run IDs and scores, generation_results, dpoTripleCheck, dnaCompliance, difficultyPredictionCalibration |
| ZIP-15 | §1 | `XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md` §1 — 9-family role taxonomy (143 entries across 5 layers); §2 confirmed `ScopeContext.roles[]` strings; role integration rule: flows that introduce new human actors must record their Role IDs in state |

---

## OUTPUT FILE SPECIFICATION

STATE.json files are not in `last-phase-testing-plan/` — they live directly in the
flow's session directory:

```
docs/sessions/FLOW-XX/
  FLOW-XX-PLAN-STATE.json      ← produced during Steps 1-10
  FLOW-XX-IMPL-STATE.json      ← produced during implementation
  FLOW-XX-CURRENT-STATE.json   ← produced during reconciliation
  FLOW-XX-STATE.json           ← produced during Phase B-F execution
```

---

## VARIANT 1: PLAN-STATE.JSON

Tracks the 10-step simulation pipeline (Steps 1-10 from the simulation pipeline guide).
Updated after each step by the bash scripts in each step's session file.

**Schema:**
```json
{
  "flow_id": "FLOW-XX",
  "flow_name": "[Flow human name]",
  "slug": "[slug]",
  "slug_upper": "[SLUG]",
  "current_step": 1,
  "step_status": "[DESIGN_SIM_R1_COMPLETE / COMPLETE / etc.]",
  "user_intent": "[verbatim user intent — from Step 1]",
  "task_range": "T[NNN]-T[NNN+M]",
  "factory_range": "F[N]-F[N+M]",
  "bfa_rule_range": "CF-[N]-CF-[N+M]",
  "cycle1": {
    "status": "[INVARIANTS_EXTRACTED / CONTEXT_PACKAGE_READY / TEST_DEFINED / etc.]",
    "context_package_file": "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md",
    "grade_threshold": 0.85
  },
  "cycle2": {
    "status": "[TEMPLATE_READY / TEST_DEFINED]",
    "template_file": "FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md"
  },
  "cycle3": {
    "status": "[CONTEXT_PACKAGE_READY / TEST_DEFINED]",
    "context_package_file": "FLOW-XX-STEP-6-CYCLE3-CONTEXT.md",
    "termination_depth": 3
  },
  "executor_handoff": {
    "status": "[HANDOFF_CONTRACT_READY / PENDING]",
    "handoff_file": "FLOW-XX-STEP-8-HANDOFF-CONTRACT.md"
  },
  "artifact_boundaries_this_flow": {
    "task_types_introduced": ["T[NNN]", "T[NNN+1]"],
    "factories_introduced": ["F[N]", "F[N+1]"],
    "bfa_rules_introduced": ["CF-[N]", "CF-[N+1]"],
    "indices_introduced": [],
    "next_available_after_flow_xx": {
      "next_T": "T[NNN+M+1]",
      "next_F": "F[N+M+1]",
      "next_CF": "CF-[N+M+1]"
    }
  },
  "roles_introduced": [],
  "prerequisites": [],
  "documents_produced": [],
  "documents_pending": [],
  "authored_at": "YYYY-MM-DD",
  "branch": "[branch-name]"
}
```

**Key rules for PLAN-STATE:**
- `current_step` increments from 1 to 10 as each step completes
- `step_status` is the terminal status of the most recently completed step
- `cycle1/2/3` statuses are updated by each step's bash script (see Step guides)
- `artifact_boundaries_this_flow` must match the canonical counters from
  `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` (Rule 34 — single counter authority)

---

## VARIANT 2: IMPL-STATE.JSON

Tracks the full implementation across Phases A-F. Written at the start of
implementation and updated after each phase.

**Schema:**
```json
{
  "flowId": "FLOW-XX",
  "flowName": "[Flow human name]",
  "slug": "[slug]",
  "wave": "[wave identifier — e.g., wave-3]",
  "implementationMode": "[STANDARD / ADAPTATION / etc.]",
  "phase_status": "[PHASE_A_COMPLETE / ... / PHASE_F_COMPLETE]",
  "status_reason": "[human-readable reason for current status]",
  "prerequisites": [
    {
      "id": "[prerequisite ID]",
      "description": "[what must be complete before this flow can start]",
      "status": "[COMPLETE / IN_PROGRESS / PROPOSED]",
      "commit": "[commit hash if complete]",
      "branch": "[branch]"
    }
  ],
  "phases": {
    "phase_A": {
      "status": "[COMPLETE / IN_PROGRESS / NOT_STARTED]",
      "label": "[Phase A human description]",
      "completed_at": "YYYY-MM-DDTHH:MM:SSZ",
      "artifacts": [
        "[artifact path] ([count and type])"
      ]
    },
    "phase_B": { ... },
    "phase_C": { ... },
    "phase_D": { ... },
    "phase_E": { ... },
    "phase_F": { ... }
  },
  "artifact_boundaries": {
    "nextT_after_flow_xx": "T[NNN+M+1]",
    "nextF_after_flow_xx": "F[N+M+1]",
    "nextCF_after_flow_xx": "CF-[N+M+1]",
    "task_types_introduced": ["T[NNN]", ...],
    "factories_introduced": ["F[N]", ...],
    "bfa_rules_introduced": ["CF-[N]", ...],
    "bfa_rules_remediation": "[explanation if BFA rules were reassigned]"
  },
  "test_baseline": {
    "server_tests": [N],
    "client_tests": [N],
    "bfa_cross_flow_suites": [N],
    "bfa_cross_flow_tests": [N]
  },
  "indices_required": ["[ES index name]", ...],
  "design_documents": ["[path to design doc]", ...],
  "architectural_decisions_locked": {
    "[decision key]": "[decision value and rationale — AD-N]",
    "[decision key]": "[decision value — AD-N]"
  },
  "roles_introduced": [
    {
      "role_id": "[ROLE-ID from ZIP-15 §1 taxonomy]",
      "role_string": "[actual string value in ScopeContext.roles[]]",
      "first_flow": "FLOW-XX",
      "description": "[what this role represents]"
    }
  ],
  "branch": "[branch-name]",
  "commit_baseline": "[baseline commit hash]",
  "authored_at": "YYYY-MM-DD"
}
```

**Key rules for IMPL-STATE:**
- `phases` object keys are exactly: `phase_A`, `phase_B`, `phase_C`, `phase_D`, `phase_E`, `phase_F`
- `phase_status` top-level field uses the pattern `PHASE_[X]_COMPLETE`
- `architectural_decisions_locked` values are strings (decision + rationale), not nested objects
- `artifact_boundaries` records `next[T/F/CF]_after_flow_xx` — the first available ID
  AFTER this flow has consumed its IDs. Must agree with INFRASTRUCTURE-FLOWS-STATE-v6.json.

---

## VARIANT 3: CURRENT-STATE.JSON

Produced during reconciliation runs or batch audit passes. It snapshots the actual
codebase state across 5 dimensions. Used by the 47-FLOW-STATE-MAPPING-PLAN batch runs.

**Schema:**
```json
{
  "$schema_version": "1.0",
  "_template_for": "Mirrors docs/sessions/FLOW-01/FLOW-01-CURRENT-STATE.json",
  "_authored_by": "[who/what produced this]",
  "_authored_at": "YYYY-MM-DD",
  "_authored_against": "branch [branch-name] @ HEAD",
  "flowId": "FLOW-XX",
  "slug": "[slug]",
  "displayName": "[Flow human name]",
  "D1_folder_inventory": {
    "session_folder_path": "docs/sessions/FLOW-XX",
    "session_folder_exists": true,
    "file_count": [N],
    "categories": {
      "step_artifacts": ["[file]", ...],
      "state_artifacts": ["[file]", ...],
      "other_artifacts": ["[file]", ...]
    },
    "completeness_assessment": "[COMPLETE / PARTIAL / MISSING — with reason]"
  },
  "D2_server_processes": {
    "src_engine_dir": "server/src/engine/flows/[slug]",
    "src_engine_dir_exists": true,
    "service_files": ["[service file]", ...],
    "service_count": [N],
    "test_files": {
      "server_unit": ["[file]", ...],
      "server_e2e": ["[file]", ...],
      "client_unit": ["[file]", ...]
    }
  },
  "D3_ui_qa_state": { ... },
  "D4_design_sim_qa_state": { ... },
  "D5_cross_tenant_install_state": { ... },
  "track_a_topology": { ... },
  "track_b_topology_qa_spec": { ... },
  "track_c_marketplace_coverage": { ... },
  "overall_status": "[COMPLETE / PARTIAL / NOT_STARTED]",
  "blockers": [],
  "follow_ups": []
}
```

---

## VARIANT 4: FLOW-XX-STATE.JSON (Phase B-F execution state)

Produced during Phase B-F teaching sessions. Tracks run IDs, scores, DNA compliance,
DPO triples, and other live execution metrics.

**Core fields:**
```json
{
  "flowId": "FLOW-XX",
  "context": "[brief context — e.g., XIIGen Community, NestJS, projectId=xiigen-community]",
  "taskTypes": ["T[NNN]", "T[NNN+1]", ...],
  "infrastructure_gate": "[PASS / FAIL]",
  "baseline": { "server_tests": [N], "client_tests": [N] },
  "current_phase": "[A-complete / B-complete / etc.]",
  "completed_phases": ["A", "B", ...],
  "taskTypeCycleBudgets": { "T[NNN]": [N], ... },
  "T[NNN]_RUN_ID": "[uuid]",
  "T[NNN]_SCORE": [float],
  "T[NNN]_FINAL_SCORE": [float],
  "T[NNN]_CYCLES": [N],
  "generation_results": { ... },
  "dpoTripleCheck": { ... },
  "scoreBreakdown": { ... },
  "prescriptivenessCheck": { ... },
  "dnaCompliance": { ... },
  "difficultyPredictionCalibration": { ... }
}
```

---

## ZIP-15 §1 ROLE REGISTRY INTEGRATION

When a flow introduces new human or system actors from ZIP-15 §1's role taxonomy,
those roles must be recorded in `PLAN-STATE.json` and `IMPL-STATE.json` under
`roles_introduced`.

**When to populate `roles_introduced`:**
- The flow spec mentions actors beyond ROLE-0 (anonymous) and ROLE-1 (authenticated)
- The flow introduces a context role (ROLE-1-ORGANIZER, ROLE-1-ATTENDEE, etc.)
- The flow introduces a new tenant-configured role (ROLE-MODERATOR, ROLE-EDITOR, etc.)
- The flow introduces a non-human actor (ROLE-BFA-REVIEWER, ROLE-BUILD-AGENT)

**Role entry format:**
```json
{
  "role_id": "ROLE-1-ORGANIZER",
  "role_string": "organizer",
  "first_flow": "FLOW-03",
  "description": "User who owns the event — derived from object ownership"
}
```

**Where to look up role IDs:** ZIP-15 §1 (GUIDE-B21 references this). The role_string
is the actual value stored in `ScopeContext.roles[]` at runtime. The role_id is the
canonical identifier from ZIP-15's 9-family taxonomy.

**Rule 34 interaction:** When a new flow uses a role first introduced by a prior flow,
`roles_introduced` is empty or lists only truly new roles. If no new roles are
introduced, include: `"roles_introduced": []`.

**For flows that are engine-internal** (no human actors, no UI):
```json
"roles_introduced": [],
"roles_note": "Engine-internal flow — no human actors beyond ROLE-0/ROLE-1"
```

---

## THE ARTIFACT BOUNDARIES FIELD — CRITICAL RULE

Every STATE.json variant that tracks artifact boundaries must agree with the canonical
counter source: `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json`.

**Rule 34 (from HOW-TO-USE-SKILLS v4.4.0):** Before any session consumes a counter
(T, F, CF, SK, FC, etc.), read the canonical file. If it disagrees with the cached
value, the canonical file wins.

**Verification command:**
```bash
# Read canonical counters before writing to STATE.json
node -e "
const s = JSON.parse(require('fs').readFileSync('docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json'));
console.log('next T:', s.nextT || s.counters?.nextT);
console.log('next F:', s.nextF || s.counters?.nextF);
console.log('next CF:', s.nextCF || s.counters?.nextCF);
"
```

**Boundaries must be written AFTER consuming, not before.** The PLAN-STATE.json
`artifact_boundaries_this_flow.next_available_after_flow_xx` values are the FIRST
AVAILABLE IDs after this flow has taken its share — not the IDs this flow uses.

---

## HOW TO PRODUCE EACH STATE.JSON VARIANT

### PLAN-STATE.json — Produced during Steps 1-10

Each step in the simulation pipeline (Steps 1-10) appends to PLAN-STATE.json.
Bash scripts in each step file write their outputs. By Step 10, the file is complete.

```bash
# Template initialization (run once before Step 1):
node -e "
const fs = require('fs');
const state = {
  flow_id: 'FLOW-XX',
  flow_name: '[Flow name]',
  slug: '[slug]',
  current_step: 0,
  step_status: 'INITIALIZED',
  user_intent: '',
  task_range: '',
  factory_range: '',
  bfa_rule_range: '',
  cycle1: { status: 'NOT_STARTED' },
  cycle2: { status: 'NOT_STARTED' },
  cycle3: { status: 'NOT_STARTED' },
  executor_handoff: { status: 'NOT_STARTED' },
  artifact_boundaries_this_flow: {
    task_types_introduced: [],
    factories_introduced: [],
    bfa_rules_introduced: []
  },
  roles_introduced: [],
  authored_at: new Date().toISOString().split('T')[0]
};
fs.writeFileSync('FLOW-XX-PLAN-STATE.json', JSON.stringify(state, null, 2));
console.log('PLAN-STATE.json initialized');
"
```

### IMPL-STATE.json — Produced at implementation start

Written when the implementation session begins. Phases are populated as they complete.

```bash
# Initialize IMPL-STATE.json:
node -e "
const state = {
  flowId: 'FLOW-XX',
  flowName: '[Flow name]',
  slug: '[slug]',
  phase_status: 'PHASE_A_IN_PROGRESS',
  phases: {
    phase_A: { status: 'IN_PROGRESS', label: '[Phase A description]' },
    phase_B: { status: 'NOT_STARTED' },
    phase_C: { status: 'NOT_STARTED' },
    phase_D: { status: 'NOT_STARTED' },
    phase_E: { status: 'NOT_STARTED' },
    phase_F: { status: 'NOT_STARTED' }
  },
  artifact_boundaries: {
    task_types_introduced: [],
    factories_introduced: [],
    bfa_rules_introduced: []
  },
  architectural_decisions_locked: {},
  roles_introduced: []
};
require('fs').writeFileSync('FLOW-XX-IMPL-STATE.json', JSON.stringify(state, null, 2));
"
```

### CURRENT-STATE.json — Produced during reconciliation

Typically produced by automated batch runs against the live codebase. Not authored
manually — the batch script reads the file system and populates the D1-D5 dimensions.

---

## ACCEPTANCE CRITERIA FOR STATE.JSON

Before any STATE.json variant is considered complete for its phase:

**PLAN-STATE:**
- [ ] `flow_id`, `flow_name`, `slug` populated
- [ ] `current_step` matches the last completed step (1-10)
- [ ] `user_intent` is verbatim from flow spec (populated at Step 1)
- [ ] `artifact_boundaries_this_flow` matches INFRASTRUCTURE-FLOWS-STATE-v6.json
- [ ] `roles_introduced` populated (or explicitly `[]` for no new roles)

**IMPL-STATE:**
- [ ] All phase entries present (`phase_A` through `phase_F`)
- [ ] Completed phases have `status: "COMPLETE"` + `completed_at` + `artifacts[]`
- [ ] `artifact_boundaries.nextT/F/CF_after_flow_xx` present and verified
- [ ] `architectural_decisions_locked` populated for each locked decision
- [ ] `roles_introduced` populated (or `[]`)

**CURRENT-STATE:**
- [ ] `$schema_version` present
- [ ] `_authored_at` and `_authored_against` branch present
- [ ] All 5 D dimensions populated (D1-D5)
- [ ] `overall_status` present with assessment

---

## KEY RULES

**1. Artifact boundaries must agree with INFRASTRUCTURE-FLOWS-STATE-v6.json.**
Rule 34 is absolute. Read the canonical file before writing any counter to STATE.json.
If the canonical file disagrees with a cached value, the canonical file wins.

**2. roles_introduced is never omitted — empty array if none.**
Every PLAN-STATE and IMPL-STATE must have `roles_introduced`. If no new roles are
introduced, the field is `[]` — not absent. This field enables cross-flow role
analysis across the library.

**3. Phase statuses advance forward, never backward.**
`phase_status` in IMPL-STATE progresses: NOT_STARTED → IN_PROGRESS → COMPLETE.
It never reverts. If a phase needs revision, document the revision in `status_reason`
while keeping `status: "COMPLETE"`.

**4. architectural_decisions_locked values are strings.**
The FLOW-46 IMPL-STATE uses strings: `"MASTER_TENANT_ID — already in design per Luba (AD-1)"`.
Not nested objects. The AD-N reference is inline in the string.

**5. CURRENT-STATE is produced by automation, not manually.**
The five D-dimensions (folder inventory, server processes, UI QA, design sim QA,
cross-tenant install) require reading the actual file system and ES state. They are
not written by hand. The SESSION-GAP-T and batch reconciliation systems produce them.

---

*End of GUIDE-B38 — STATE.json (with ZIP-15 §1 role registry integration)*
*List A sources: ZIP-17 (FLOW-46 IMPL-STATE, PLAN-STATE, CURRENT-STATE),*
*ZIP-11 (FLOW-01 final FLOW-01-STATE.json — Phase B-F execution state),*
*ZIP-15 §1 (role taxonomy — roles_introduced field integration)*
*Target B-type: B-38 — STATE.json (all variants)*
*Round: 48 of 72*
