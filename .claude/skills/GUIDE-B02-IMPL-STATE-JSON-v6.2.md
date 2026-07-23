# GUIDE-B02 — How to Produce `FLOW-XX-IMPL-STATE.json`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 12 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-24
## v6.2 amendment: authStatus, authGaps, authTier, tenantCertTier, portabilityTest,
##   protocolStatus fields added. Phase G/H/I phase labels added to phases object.
##   SELF-CHECK extended. Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 16.

---

## FINAL GOAL (re-read before authoring any FLOW-XX-IMPL-STATE.json):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

---

## WHAT THIS FILE IS

`FLOW-XX-IMPL-STATE.json` is the **implementation lifecycle tracker**. It records
which phases (A-F) have been completed, which task types are done, what the current
test baseline is, which architectural decisions are locked, and what was deferred.

Unlike `CURRENT-STATE.json` (B-01) which snapshots the filesystem, IMPL-STATE.json
records the *implementation decisions and outcomes* — the why and what of what was built.

This file grows during implementation and is updated at the close of each phase.
It is the authoritative source for `SESSION-BRIEF.md` (B-41) and `PHASE-COMPLETE.md` (B-42).

**Authoring schema reference:** ZIP-01 `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md`;
ZIP-01 SK-426 phases A-F definition; ZIP-02 `LIBRARY-5` implementation conventions.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-01 | PRIMARY + STRUCTURE | AUTHORING-GUIDE v1.15 §impl-state schema; SK-426 (phases A-F definition and lifecycle conventions) |
| ZIP-02 | PRIMARY | LIBRARY-5 implementation phase structure (Phase A-F label conventions, gate criteria per phase) |
| ZIP-11 | FIXTURE | FLOW-09 IMPL-STATE.json (all phases COMPLETE — mature example); FLOW-32 IMPL-STATE.json (phases NOT_STARTED — empty start-state) |
| ZIP-16 | REFERENCE | Flow's business spec `{NN}-{slug}.md` → task type list T{N}-T{N+K} for `task_types{}` object |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-IMPL-STATE.json`
**File size range:** 4-8 KB (simple flows) to 15-20 KB (complex flows with full phase data)
**When authored:** Created at implementation start; updated at close of each phase

---

## TWO VALID SCHEMA VARIANTS

The IMPL-STATE.json schema has two variants observed in the wild:

**Variant A — Compact (FLOW-09 pattern):**
Used for flows with standard phases A-F. Fields: `flowId`, `slug`, `phases{}`,
`current_phase`, `task_types{}`, `test_baseline{}`, `verdict`.

**Variant B — Extended (FLOW-46 pattern):**
Used for flows with additional context: adds `flowName`, `wave`, `implementationMode`,
`phase_status`, `status_reason`, `prerequisites[]`, `artifact_boundaries{}`,
`indices_required[]`, `design_documents{}`, `architectural_decisions_locked{}`,
`branch`, `commit_baseline`, `authored_at`.

**Rule:** Always use Variant B for new flows. It provides more context for future sessions
and is backward-compatible with systems that only read Variant A fields.

---

## STEP-BY-STEP AUTHORING INSTRUCTIONS FOR CLAUDE CODE

### Pre-condition

```bash
# Get the flow's task type range from the implementation plan or spec
grep -i "task type\|T[0-9]\{3\}" docs/sessions/FLOW-XX/FLOW-XX-IMPLEMENTATION-PLAN*.md 2>/dev/null | head -5
# Get current branch
git branch --show-current
# Get current commit
git rev-parse --short HEAD
# Get current test counts
cd server && npx jest --passWithNoTests 2>&1 | tail -3
cd client && npx jest --passWithNoTests 2>&1 | tail -3
```

---

### Step 1: Write the file header

```json
{
  "flowId": "FLOW-XX",
  "flowName": "{Display Name from spec}",
  "slug": "{slug-from-spec}",
  "wave": "FLOW-XX-standalone",
  "implementationMode": "af-pipeline",
  "branch": "{current-branch}",
  "authored_at": "{YYYY-MM-DD}",
  "commit_baseline": "{7-char hash of pre-implementation commit}",
```

**Rules:**
- `implementationMode` is always `"af-pipeline"` for standard XIIGen flows
- `wave` is `"FLOW-XX-standalone"` unless the flow is part of a named wave grouping
- `commit_baseline` is the git commit hash **before** this flow's implementation starts —
  this anchors the test baseline numbers

---

### Step 2: Set phase_status and status_reason

```json
"phase_status": "PHASE_A_COMPLETE | PHASE_B_COMPLETE | ... | PHASE_F_COMPLETE | IN_PROGRESS",
"status_reason": "{one-paragraph narrative of what was done in the most recent phase and what gate it passed}",
```

**phase_status values (canonical):**
| Value | Meaning |
|-------|---------|
| `"NOT_STARTED"` | No phases begun |
| `"PHASE_A_COMPLETE"` | Phase A (corpus seed + design fixtures) done |
| `"PHASE_B_COMPLETE"` | Phase B (service implementations) done |
| `"PHASE_C_COMPLETE"` | Phase C (client integration) done |
| `"PHASE_D_COMPLETE"` | Phase D (admin panels / extensions) done |
| `"PHASE_E_COMPLETE"` | Phase E (design contracts + e2e tests) done |
| `"PHASE_F_COMPLETE"` | Phase F (BFA validation + artifact boundary bump) done = implementation complete |
| `"IN_PROGRESS"` | Currently executing a phase (temporary state during a session) |
| `"PHASE_G_COMPLETE"` | Phase G (portability mobility gate) done — portabilityStatus set |
| `"PHASE_H_COMPLETE"` | Phase H (auth decoration) done — authStatus set |
| `"PHASE_I_COMPLETE"` | Phase I (tenant certification) done — tenantCertTier set |

**status_reason** must include: what gate was passed, what specific evidence proved it
(test count, tsc error count, BFA suite result), and what is deferred.

---

### Step 3: Write prerequisites

```json
"prerequisites": [
  "plan-vN-turns-1-N",
  "flows-{NN}-{NN}-complete"
],
```

Extract from the flow's implementation plan. If no explicit prerequisites listed,
use `[]`.

---

### Step 4: Write the phases object

One entry per phase. The label is the human-readable name from LIBRARY-5 (ZIP-02).

```json
"phases": {
  "phase_A": {
    "status": "COMPLETE | IN_PROGRESS | NOT_STARTED | SKIPPED",
    "label": "Corpus seed + design fixtures (seedFlowCorpus('{slug}'))",
    "completed_at": "{ISO timestamp or null}",
    "artifacts": [
      "fixtures/design-reasoning/{slug}-design-decisions.json ({N} DR + {N} ARCH)",
      "server/src/engine-contracts/{slug}-contracts.ts (T{N}-T{N+K}, family {N})",
      "server/src/engine-contracts/{slug}-bfa-rules.ts (CF-{N}..CF-{N+K})",
      "contracts/topologies/{slug}.topology.json ({N} nodes, {N} edges)",
      "fixtures/arbiters/{slug}-arbiters.bulk.ndjson ({N} records, scope_isolation LAST per FC-32)",
      "fixtures/event-schemas/{slug}/ ({N} schemas: ...)"
    ],
    "gate_results": {
      "server_tsc_errors": 0,
      "client_tsc_errors": 0
    },
    "deferred": "{what was not done in this phase and why, or null}"
  },
  "phase_B": {
    "status": "COMPLETE",
    "label": "Service implementations T{N}-T{N+K}",
    "completed_at": "{ISO timestamp}",
    "artifacts": [
      "server/src/engine/flows/{slug}/{service-name}.service.ts (T{N})",
      "server/src/engine/flows/{slug}/{service-name}.controller.ts"
    ],
    "gate_results": {
      "server_unit_tests": "{N}/{N} {slug} specs pass",
      "server_tsc_errors": 0,
      "client_tsc_errors": 0,
      "client_build_errors": 0
    },
    "deferred": "{deferred items or null}"
  },
  "phase_C": {
    "status": "COMPLETE | NOT_STARTED",
    "label": "Client integration + React pages",
    "completed_at": "{ISO timestamp or null}",
    "artifacts": [
      "client/src/pages/{slug}/{PageName}Page.tsx",
      "client/src/App.tsx — /{route} added"
    ],
    "gate_results": {
      "client_unit_tests": "{N}/{N} {slug} specs pass",
      "client_tsc_errors": 0,
      "client_build_errors": 0
    },
    "deferred": "{or null}"
  },
  "phase_D": {
    "status": "COMPLETE | NOT_STARTED | NOT_APPLICABLE",
    "label": "Admin panel extensions",
    "completed_at": "{ISO timestamp or null}",
    "artifacts": [],
    "gate_results": {},
    "deferred": "{or null}"
  },
  "phase_E": {
    "status": "COMPLETE | NOT_STARTED",
    "label": "Design contracts + e2e + topology QA",
    "completed_at": "{ISO timestamp or null}",
    "artifacts": [
      "server/test/e2e/{slug}/{slug}-integration.spec.ts",
      "client/e2e/{slug}.spec.ts",
      "client/e2e/topology/{slug}-topology-qa.spec.ts"
    ],
    "gate_results": {
      "design_contract_tests": "{N}/{N} pass",
      "playwright_scenarios": "{N}",
      "tvq_specs": "{N}"
    },
    "deferred": "{or null}"
  },
  "phase_F": {
    "status": "COMPLETE | NOT_STARTED",
    "label": "BFA validation + artifact boundary bump",
    "completed_at": "{ISO timestamp or null}",
    "artifacts": [
      "CLAUDE.md — artifact boundaries bumped (nextT={T}, nextF={F}, nextFamily={N}, nextCF={CF})",
      "docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json — counters updated"
    ],
    "gate_results": {
      "bfa_cross_flow_suite": "{N} suites / {N} tests pass",
      "cf_collision_check": "OK",
      "event_namespace_uniqueness": "OK",
      "es_index_uniqueness": "OK"
    },
    "deferred": "{or null}"
  }
}
```

**Phase label conventions (from ZIP-02 LIBRARY-5):**
| Phase | Standard label |
|-------|---------------|
| A | `"Corpus seed + design fixtures (seedFlowCorpus('{slug}'))"` |
| B | `"Service implementations T{N}-T{N+K}"` |
| C | `"Client integration + React pages"` |
| D | `"Admin panel extensions"` (or `"NOT_APPLICABLE"` if no admin changes) |
| E | `"Design contracts + e2e + topology QA"` |
| F | `"BFA validation + artifact boundary bump"` |
| G | `"Portability mobility gate (V9 P-1..P-5 + D-HIST-001)"` |
| H | `"Auth decoration (A-1..A-3, @UseGuards/@Roles, Rule 7 tests)"` |
| I | `"Tenant certification status (TIER-A/B/C/D, Guard 14, TIER-C checklist)"` |

---

### Step 4b: Write portability and auth status fields (NEW v6.2)

These fields are added at the top level (same level as `phases`, `verdict`, etc.).
They are updated by Phase G (portability), Phase H (auth), and Phase I (cert tier)
in the implementation plan.

**portabilityStatus** — set by V9 gate in Phase G:
```json
"portabilityStatus": "TBD | MOBILE | PARTIAL_GAP | NOT_PORTABLE | NOT_APPLICABLE",
"portabilityGaps": []
```

Values:
| Value | Meaning |
|-------|---------|
| `"TBD"` | V9 has not run yet (initial state) |
| `"MOBILE"` | All P-1..P-5 + D-HIST-001 pass |
| `"PARTIAL_GAP"` | 1-4 checks fail — gaps listed in portabilityGaps[] |
| `"NOT_PORTABLE"` | P-1 (ClsService) > 0 — fundamental blocker |
| `"NOT_APPLICABLE"` | EXTERNAL_REPO adapter flows only |

**authStatus** — set by V10 gate in Phase H:
```json
"authStatus": "TBD | AUTH_READY | AUTH_GAP | AUTH_DEFERRED | NOT_APPLICABLE",
"authGaps": [],
"authTier": "TBD"
```

Values:
| Value | Meaning |
|-------|---------|
| `"TBD"` | V10 has not run yet (initial state — must not be TBD at GOAL_REACHED) |
| `"AUTH_READY"` | All controllers guarded, all routes have @Roles/@Public(), auth tests pass |
| `"AUTH_GAP"` | Controllers exist but some unguarded or routes lack auth declaration |
| `"AUTH_DEFERRED"` | auth.module.ts absent — AUTH-ROLES-GROUPS-PLAN-v3 Phases 1-4 not deployed |
| `"NOT_APPLICABLE"` | Flow has no HTTP controllers (service-only flow) |

**tenantCertTier** — set by V11 gate in Phase I:
```json
"tenantCertTier": "NONE | TIER_A | TIER_B | TIER_C | TIER_D"
```

Values (per SK-553 v1.1.0 TIER model):
| Value | Meaning |
|-------|---------|
| `"NONE"` | SK-553 Layer 1 not run AND no documented deferral |
| `"TIER_A"` | SK-553 Layer 1 PASS (or AUTH_DEFERRED documented) |
| `"TIER_B"` | TIER-A + repo {tenantId}--{moduleName} + repo evidence PNG |
| `"TIER_C"` | TIER-B + AI Adaptation 1-5 + per-role visual + R6 auth isolation (Guard 14 required) |
| `"TIER_D"` | All layers + SK-549 full per-role coverage at all cascade points |

**portabilityTest** — records SK-553 layer results:
```json
"portabilityTest": {
  "phase0Auth": {
    "status": "NOT_RUN | PASS | AUTH_DEFERRED",
    "date": null,
    "evidence": null
  },
  "layer1": {
    "status": "NOT_RUN | PASS | FAIL",
    "date": null,
    "evidence": {
      "connectionAnnotations": null,
      "clsServiceHits": null,
      "dHist001SdkImports": null,
      "stubTests": null,
      "behavioralAssertions": null,
      "tenantIsolation": null
    }
  },
  "layer2": { "status": "NOT_RUN | PASS | NOT_APPLICABLE" },
  "layer3": { "status": "NOT_RUN | PASS | NOT_APPLICABLE" },
  "r6AuthIsolation": { "status": "NOT_RUN | PASS | FAIL" },
  "repoNaming": { "convention": "{tenantId}--{moduleName}", "verified": false },
  "repoEvidence": { "screenshots": 0 }
}
```

**protocolStatus** — summary of all protocol checks (for PHASE-COMPLETE gate):
```json
"protocolStatus": {
  "sk553Layer1": "NOT_RUN | PASS | FAIL",
  "sk553Phase0": "NOT_RUN | PASS | AUTH_DEFERRED",
  "ndjsonScopeIsolation": 0,
  "ndjsonNoTypeRecords": 0,
  "dHist001SdkImports": 0
}
```

**When to update each field:**
| Field | Updated by | Updated when |
|-------|-----------|-------------|
| portabilityStatus, portabilityGaps | Phase G close | V9 gate runs |
| authStatus, authGaps, authTier | Phase H close | V10 gate runs |
| tenantCertTier | Phase I close | V11 tier determination runs |
| portabilityTest.layer1 | Phase G close | SK-553 v1.1.0 Layer 1 runs |
| portabilityTest.phase0Auth | Phase H close | SK-553 v1.1.0 Phase 0 runs |
| protocolStatus | Phase G/H/I close | Each gate runs |

---

### Step 5: Write artifact_boundaries

```json
"artifact_boundaries": {
  "nextT_after_flow_XX": "T{N+1}",
  "nextF_after_flow_XX": "F{N+1}",
  "nextCF_after_flow_XX": "CF-{N+1}",
  "nextFamily_after_flow_XX": {N+1}
}
```

**How to get these values:**
```bash
# Read canonical counter source (Rule 34)
python3 -c "
import json
d = json.load(open('docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json'))
print(json.dumps(d, indent=2))
" 2>/dev/null | grep -E "nextT|nextF|nextCF|nextFamily|nextBfaRule"
```

Record the values **before** this flow's implementation starts, then update to the
post-implementation values after Phase F completes.

---

### Step 6: Write test_baseline

```json
"test_baseline": {
  "server": {N — server test count at commit_baseline},
  "client": {N — client test count at commit_baseline},
  "note": "Pre-{FLOW-XX} implementation at commit {hash} (branch {branch})."
}
```

**How to get test counts at baseline:**
```bash
# At the commit_baseline commit (before implementation starts):
cd server && npx jest --passWithNoTests 2>&1 | grep -E "Tests:|passed"
cd client && npx jest --passWithNoTests 2>&1 | grep -E "Tests:|passed"
```

These are the numbers the implementation must not regress below.

---

### Step 7: Write indices_required

```json
"indices_required": [
  "xiigen-{slug}-{index-name}",
  "xiigen-{slug}-{index-name-2}"
]
```

Extract from the flow's implementation plan or design simulation. If no new
ES indices are created by this flow, use `[]`.

---

### Step 8: Write design_documents

```json
"design_documents": {
  "master_plan": "Not in repo — user document FLOW-XX-{SLUG}-MASTER-PLAN-vN.md",
  "design_sim": "docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md (authored {date} | PENDING)",
  "teach_qa": "docs/sessions/FLOW-XX/FLOW-XX-TEACH-QA-R0.md (authored {date} | PENDING)",
  "implementation_plan": "docs/sessions/FLOW-XX/FLOW-XX-IMPLEMENTATION-PLAN-v1.md (authored {date} | PENDING)"
}
```

Replace `PENDING` with `authored {date}` once each document is produced.

---

### Step 9: Write architectural_decisions_locked

Record the key architectural decisions made during implementation that must not
be re-debated in future sessions.

```json
"architectural_decisions_locked": {
  "{decisionName}": "{decision summary} — AD-{N}",
  "{decisionName2}": "{decision summary} — AD-{N}",
  ...
}
```

Source these from:
1. The design simulation WHAT FLOW-XX INHERITS table (inherited decisions)
2. Explicit decisions made during this implementation (new decisions)

**Example keys seen in FLOW-46:**
`identityModel`, `accessModel`, `approvalModel`, `scopeModel`, `contributionModel`,
`superJudgePlacement`, `indicesBootstrap`

If no architectural decisions were locked during this implementation, use `{}`.

---

### Step 10: Set current_phase (Variant A compatibility)

```json
"current_phase": "phase_f"
```

This is the last phase that was completed (or the phase currently in progress).
Use lowercase with underscore: `phase_a`, `phase_b`, ..., `phase_f`.
If not yet started: `"current_phase": "phase_a"` (the first phase to run).

---

### Step 11: Write task_types object

```json
"task_types": {
  "T{N}": { "status": "COMPLETE | IN_PROGRESS | NOT_STARTED", "turns_complete": {N} },
  "T{N+1}": { "status": "COMPLETE", "turns_complete": 1 },
  ...
  "T{N+K}": { "status": "COMPLETE" }
}
```

**How to determine task type status:**
- `COMPLETE` = the service for this task type is in `server/src/engine/flows/{slug}/`
  and its tests pass
- `IN_PROGRESS` = implementation started but tests not yet passing
- `NOT_STARTED` = no service file yet for this task type

**How to get task types:**
```bash
# From the implementation plan or contracts file
grep -E "^  T[0-9]{3}" server/src/engine-contracts/{slug}-contracts.ts 2>/dev/null | head -20
# Or from the design simulation
grep "T[0-9]\{3\} — " docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md 2>/dev/null | head -20
```

---

### Step 12: Write verdict

```json
"verdict": "GOAL_REACHED | GOAL_PARTIALLY_REACHED | IN_PROGRESS"
```

**Verdict rules:**
| Condition | Verdict |
|-----------|---------|
| phase_status = PHASE_F_COMPLETE AND all task types COMPLETE AND test_baseline not regressed | `"GOAL_REACHED"` |
| Phase F complete but ≥1 deferred item that affects goal elements | `"GOAL_PARTIALLY_REACHED"` |
| Any phase incomplete | `"IN_PROGRESS"` |
| portabilityStatus = "TBD" OR authStatus = "TBD" | CANNOT be `"GOAL_REACHED"` — run Phase G and Phase H first |
| portabilityStatus = "PARTIAL_GAP" or authStatus = "AUTH_DEFERRED" with documented reason | `"GOAL_PARTIALLY_REACHED"` acceptable |

---

## COMPLETE TEMPLATE

```json
{
  "flowId": "FLOW-XX",
  "flowName": "{Display Name}",
  "slug": "{slug}",
  "wave": "FLOW-XX-standalone",
  "implementationMode": "af-pipeline",
  "branch": "{branch-name}",
  "authored_at": "{YYYY-MM-DD}",
  "commit_baseline": "{7-char hash}",
  "phase_status": "NOT_STARTED | PHASE_A_COMPLETE | ... | PHASE_F_COMPLETE",
  "status_reason": "{narrative of most recent phase result}",
  "prerequisites": [],
  "phases": {
    "phase_A": {
      "status": "NOT_STARTED",
      "label": "Corpus seed + design fixtures (seedFlowCorpus('{slug}'))",
      "completed_at": null,
      "artifacts": [],
      "gate_results": {},
      "deferred": null
    },
    "phase_B": { "status": "NOT_STARTED", "label": "Service implementations T{N}-T{N+K}", "completed_at": null, "artifacts": [], "gate_results": {}, "deferred": null },
    "phase_C": { "status": "NOT_STARTED", "label": "Client integration + React pages", "completed_at": null, "artifacts": [], "gate_results": {}, "deferred": null },
    "phase_D": { "status": "NOT_APPLICABLE", "label": "Admin panel extensions", "completed_at": null, "artifacts": [], "gate_results": {}, "deferred": null },
    "phase_E": { "status": "NOT_STARTED", "label": "Design contracts + e2e + topology QA", "completed_at": null, "artifacts": [], "gate_results": {}, "deferred": null },
    "phase_F": { "status": "NOT_STARTED", "label": "BFA validation + artifact boundary bump", "completed_at": null, "artifacts": [], "gate_results": {}, "deferred": null }
  },
  "artifact_boundaries": {
    "nextT_after_flow_XX": "T{N}",
    "nextF_after_flow_XX": "F{N}",
    "nextCF_after_flow_XX": "CF-{N}",
    "nextFamily_after_flow_XX": {N}
  },
  "test_baseline": {
    "server": 0,
    "client": 0,
    "note": "Pre-FLOW-XX baseline at commit {hash} (branch {branch}). Populate before Phase A begins."
  },
  "indices_required": [],
  "design_documents": {
    "master_plan": "Not in repo — user document FLOW-XX-MASTER-PLAN-v1.md",
    "design_sim": "docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md (PENDING)",
    "teach_qa": "docs/sessions/FLOW-XX/FLOW-XX-TEACH-QA-R0.md (PENDING)",
    "implementation_plan": "docs/sessions/FLOW-XX/FLOW-XX-IMPLEMENTATION-PLAN-v1.md (PENDING)"
  },
  "architectural_decisions_locked": {},
  "current_phase": "phase_a",
  "task_types": {},
  "verdict": "IN_PROGRESS",
  "portabilityStatus": "TBD",
  "portabilityGaps": [],
  "authStatus": "TBD",
  "authGaps": [],
  "authTier": "TBD",
  "tenantCertTier": "NONE",
  "portabilityTest": {
    "phase0Auth": { "status": "NOT_RUN", "date": null, "evidence": null },
    "layer1": {
      "status": "NOT_RUN",
      "date": null,
      "evidence": {
        "connectionAnnotations": null,
        "clsServiceHits": null,
        "dHist001SdkImports": null,
        "stubTests": null,
        "behavioralAssertions": null,
        "tenantIsolation": null
      }
    },
    "layer2": { "status": "NOT_RUN" },
    "layer3": { "status": "NOT_RUN" },
    "r6AuthIsolation": { "status": "NOT_RUN" },
    "repoNaming": { "convention": "{tenantId}--{moduleName}", "verified": false },
    "repoEvidence": { "screenshots": 0 }
  },
  "protocolStatus": {
    "sk553Layer1": "NOT_RUN",
    "sk553Phase0": "NOT_RUN",
    "ndjsonScopeIsolation": 0,
    "ndjsonNoTypeRecords": 0,
    "dHist001SdkImports": 0
  }
}
```

---

## SELF-CHECK BEFORE SAVING

```
□ flowId matches the canonical flow ID
□ slug is kebab-case matching the canonical slug
□ commit_baseline is a real 7-char git hash (run git log --oneline -1 to confirm)
□ test_baseline.server and test_baseline.client are real test counts from running jest
□ artifact_boundaries read from docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json (Rule 34)
□ Phase labels match LIBRARY-5 conventions from ZIP-02
□ gate_results in each completed phase contain real counts (not fabricated)
□ deferred items documented — never set deferred to null when items were skipped
□ verdict follows the objective verdict rules above
□ File saved to docs/sessions/FLOW-XX/FLOW-XX-IMPL-STATE.json
□ [v6.2] portabilityStatus is not "TBD" at GOAL_REACHED or GOAL_PARTIALLY_REACHED
□ [v6.2] authStatus is not "TBD" at GOAL_REACHED or GOAL_PARTIALLY_REACHED
□ [v6.2] tenantCertTier is set (not "NONE") if the flow targets distribution
□ [v6.2] portabilityTest.layer1.evidence fields populated if Layer 1 ran
□ [v6.2] protocolStatus.ndjsonScopeIsolation ≥ 1 (SK-554 scope_isolation count)
□ [v6.2] protocolStatus.dHist001SdkImports = 0 (no SDK imports in service files)
```

**SILENT_FAILURE RISK:** The most common error is setting `test_baseline.server` and
`test_baseline.client` to 0 or leaving them unpopulated. These values are the gate that
prevents regression — they must be real counts from `npx jest` at the pre-implementation commit.

**SILENT_FAILURE RISK 2:** Setting `verdict: "GOAL_REACHED"` when deferred items include
goal-element work.

**SILENT_FAILURE RISK 3 (NEW v6.2):** Setting `verdict: "GOAL_REACHED"` when
`portabilityStatus = "TBD"` or `authStatus = "TBD"`. TBD means the V9/V10 gate never ran.
The flow's portability and auth posture are unknown — this is not GOAL_REACHED.
Run Phase G and Phase H, then set the correct status (MOBILE, PARTIAL_GAP, AUTH_READY,
AUTH_DEFERRED, etc.) before setting GOAL_REACHED. If the implementation plan's goal statement has unmapped deferred items,
use `"GOAL_PARTIALLY_REACHED"`. See GUIDE-B03 (PLAN-STATE.json) for how to cross-check.

---

## PHASE AUTHORING SEQUENCE

IMPL-STATE.json is updated **incrementally** — not written once and finalized.

1. **Before implementation starts:** Create the file with all phases NOT_STARTED,
   populate test_baseline with pre-implementation counts, set commit_baseline.
2. **After each phase closes:** Update that phase's status to COMPLETE, add artifacts
   list, add gate_results, update phase_status and status_reason.
3. **After Phase F:** Set verdict. If GOAL_REACHED, this file is final.
   If GOAL_PARTIALLY_REACHED, add a note about what must be remediated.

This incremental pattern means IMPL-STATE.json is always current — any session loading
this file knows exactly where implementation stands without reading the full session history.

---

## TWO OBSERVED EXAMPLES

**Example A — FLOW-09 (mature, all phases COMPLETE, compact):**
- All 6 phases: status COMPLETE
- Task types T99-T118: all COMPLETE
- Verdict: GOAL_REACHED
- test_baseline: unit=N, e2e=N, total=N, last_green_commit="{hash}"
- Note: FLOW-09 uses the simpler Variant A schema (no architectural_decisions_locked)

**Example B — FLOW-46 (extended, all phases COMPLETE, with locked decisions):**
- phase_status: PHASE_F_COMPLETE
- architectural_decisions_locked: 6 decisions (identityModel, accessModel, etc.)
- test_baseline: server=10617, client=1208 (real counts)
- indices_required: ["xiigen-agent-actions", "xiigen-agent-contributions"]
- artifact_boundaries: nextT=T657, nextF=F1606, nextCF=CF-842
- design_documents: all present with authored dates
- Verdict: implied GOAL_REACHED (Phase F COMPLETE, all gate_results green)

---

## C30/C38 SOURCE SPLIT NOTE

The IMPL-STATE.json schema is **universal** — same structure for all 49 flows.
For FLOW-35..47 (no ZIP-16 spec): derive `flowName`, `slug`, and `task_types{}` from
the flow's CURRENT-STATE.json or DESIGN-SIMULATION-R1.md rather than ZIP-16.
For FLOW-48 (`i18n-translation`): uses ZIP-17 BATCH-10 data for task type confirmation.

---

## AUTHORING QUALITY GATE

This guidance file is SELF-SUFFICIENT if a Claude Code session can produce a correct
`FLOW-XX-IMPL-STATE.json` using only:
1. This guidance file
2. The actual codebase (for bash commands)
3. The flow's implementation plan (for phase structure and task types)

---
*GUIDE-B02 | Round 12 | Phase 4 — Guidance File Authoring*
*Sources: ZIP-01 (P+S), ZIP-02 (P), ZIP-11 (F), ZIP-16 (R)*
*Next: GUIDE-B03 — FLOW-XX-PLAN-STATE.json (Round 13)*
*v6.2 amendment: authStatus, authGaps, authTier, tenantCertTier, portabilityTest,*
*protocolStatus fields added (Step 4b). Phase G/H/I labels added. SELF-CHECK extended.*
*Verdict rules: TBD portability/auth blocks GOAL_REACHED. SILENT_FAILURE RISK 3 added.*
*Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 16.*
