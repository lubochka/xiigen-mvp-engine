# GUIDE-B01 — How to Produce `FLOW-XX-CURRENT-STATE.json`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 11 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-CURRENT-STATE.json):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the CURRENT-STATE.json guidance: one of the 50 guidance files that together
constitute the library. When Claude Code applies this guidance to a new flow's spec,
it will produce a correct, evidence-backed `FLOW-XX-CURRENT-STATE.json`.

---

## WHAT THIS FILE IS

`FLOW-XX-CURRENT-STATE.json` is the **master inventory snapshot** of a flow's current
implementation state. It records what exists on disk (session documents, server services,
tests), what UX and QA conditions are met, and what cross-tenant readiness looks like —
all as objective, evidence-backed facts.

This file is NOT a plan. It does not describe what should happen. It records what
IS present right now.

**Authoring schema:** `$schema_version: "1.0"` (fixed — do not change)
**Authoring process reference:** ZIP-01 `47-FLOW-STATE-MAPPING-PLAN-v1.1` (batch process schema)
**Section definitions reference:** ZIP-01 `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md`

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-01 | PRIMARY + STRUCTURE | `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md` §D1-D5 section definitions; `47-FLOW-STATE-MAPPING-PLAN-v1.1` batch process schema |
| ZIP-02 | REFERENCE | `LIBRARY-5` implementation phase structure (feeds D2 server process section) |
| ZIP-11 | FIXTURE | Per-flow CURRENT-STATE.json examples (FLOW-01, FLOW-09 confirmed samples) |
| ZIP-16 | REFERENCE | Flow's business spec (`{NN}-{slug}.md`) → slug, displayName, task type range |

**C30/C38 note:** The slug, flowId, and displayName fields are the only spec-dependent
fields. All D1-D5 section structures are universal across all 49 flows.

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-CURRENT-STATE.json`
**File size range:** 5-7 KB (observed across FLOW-47, FLOW-09)
**When authored:** After session folder exists; updated when implementation state changes

---

## STEP-BY-STEP AUTHORING INSTRUCTIONS FOR CLAUDE CODE

### Pre-condition

Before authoring this file, Claude Code must confirm:
```bash
# Confirm the flow's session folder exists
ls docs/sessions/FLOW-XX/
# Confirm the flow's slug from the spec or master state
grep -r "\"flowId\": \"FLOW-XX\"" docs/sessions/ --include="*.json" | head -3
```

If the session folder does not exist: create it with `mkdir -p docs/sessions/FLOW-XX/`
before producing any files.

---

### Step 1: Write the file header

```json
{
  "$schema_version": "1.0",
  "_template_for": "Mirrors docs/sessions/FLOW-01/FLOW-01-CURRENT-STATE.json",
  "_authored_by": "Claude ({batch-process-name} or session name)",
  "_authored_at": "{YYYY-MM-DD}",
  "_authored_against": "branch {branch-name} @ HEAD",
  "flowId": "FLOW-XX",
  "slug": "{slug-from-spec}",
  "displayName": "{Display Name from spec}",
```

**Rules:**
- `$schema_version` is always `"1.0"` — never change this value
- `_authored_by` names the batch plan or session that produced the file
- `_authored_at` is today's date (ISO format: YYYY-MM-DD)
- `_authored_against` names the current branch
- `slug` must exactly match the flow's canonical slug (kebab-case, no spaces)
- `displayName` is the human-readable flow name from the spec or master state

---

### Step 2: Populate D1 — Folder Inventory

D1 records what files exist in the session folder right now.

```bash
# Run these commands to populate D1
ls docs/sessions/FLOW-XX/ | wc -l              # → file_count
ls docs/sessions/FLOW-XX/FLOW-XX-STEP-*.md 2>/dev/null  # → step_artifacts
ls docs/sessions/FLOW-XX/FLOW-XX-*-STATE.json 2>/dev/null  # → state_artifacts
ls docs/sessions/FLOW-XX/ | grep -v "^FLOW-XX-STEP\|STATE" # → other_artifacts
```

```json
"D1_folder_inventory": {
  "session_folder_path": "docs/sessions/FLOW-XX",
  "session_folder_exists": true,
  "file_count": {N},
  "categories": {
    "step_artifacts": [
      "FLOW-XX-STEP-1-INVARIANTS.md",
      "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md"
      // ... list all STEP files found
    ],
    "state_artifacts": [
      "FLOW-XX-CURRENT-STATE.json",
      "FLOW-XX-PLAN-STATE.json"
      // ... list all *-STATE.json and *-STATE.md files found
    ],
    "other_artifacts": [
      "FLOW-XX-DESIGN-SIMULATION-R1.md",
      "FLOW-XX-RAG.md"
      // ... list all remaining files (implementation plan, sessions, etc.)
    ]
  },
  "completeness_assessment": "{see verdict rules below}"
}
```

**D1 completeness_assessment verdict rules:**
- `"COMPLETE — has step + state + traces"` → step_artifacts has all 10 STEP files, state_artifacts has ≥3 state files
- `"PARTIAL — step files present, state files missing"` → step_artifacts has ≥1 STEP file, state_artifacts empty or partial
- `"MINIMAL — session folder exists, core files only"` → file_count < 5, only state files
- `"EMPTY — session folder exists but no relevant files"` → file_count = 0 or only this file

---

### Step 3: Populate D2 — Server Processes

D2 records what server-side code exists for this flow.

```bash
# Run these commands to populate D2
ls server/src/engine/flows/{slug}/ 2>/dev/null    # → service_files
find server/test/e2e/{slug}/ -name "*.spec.ts" 2>/dev/null  # → server_e2e tests
find server/src -name "*.spec.ts" -path "*{slug}*" 2>/dev/null | grep -v e2e  # → server_unit tests
find client -name "*.spec.ts" -path "*{slug}*" 2>/dev/null  # → client_unit tests
```

```json
"D2_server_processes": {
  "src_engine_dir": "server/src/engine/flows/{slug}",
  "src_engine_dir_exists": true,
  "service_files": [
    "server/src/engine/flows/{slug}/{service-name}.service.ts"
    // ... list all .service.ts files found
  ],
  "test_files": {
    "server_unit": [
      // list server unit/spec files for this flow
    ],
    "server_e2e": [
      // list e2e spec files
    ],
    "client_unit": [
      // list client test files
    ]
  }
}
```

**Rule:** If `src_engine_dir_exists: false`, all arrays are empty `[]`. Never fabricate file names — only list files confirmed to exist on disk via the bash commands above.

---

### Step 4: Populate D3 — UI/QA State

D3 records QA coverage and topology state.

```bash
# Check for QA coverage state file
ls docs/sessions/FLOW-XX/FLOW-XX-QA-COVERAGE-STATE.json 2>/dev/null
# Check for topology contract
ls contracts/topologies/{slug}.topology.json 2>/dev/null
# Count topology nodes if file exists
python3 -c "import json; d=json.load(open('contracts/topologies/{slug}.topology.json')); print(len(d.get('nodes', [])))" 2>/dev/null
```

```json
"D3_ui_qa_state": {
  "qa_coverage_state_path": "docs/sessions/FLOW-XX/FLOW-XX-QA-COVERAGE-STATE.json",
  "qa_coverage_state_present": true,
  "topology_node_count": {N or null if no topology},
  "applicabilityToMarketplace": "{YES | NO | PARTIAL | null}",
  "scope_isolation_arbiter_present_per_qa_doc": {true | false | null}
}
```

**Rule:** All values must be confirmed by bash commands. Do not assume `qa_coverage_state_present: true` without running the ls check. Set to `null` if information not available, not to a fabricated value.

---

### Step 5: Populate D4 — Design Sim QA State

D4 records whether design simulation QA was performed.

```bash
# Check for design simulation file
ls docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md 2>/dev/null
```

```json
"D4_design_sim_qa_state": {
  "applicable": true,
  "design_sim_present": true,
  "teach_qa_present": false,
  "reason": "Design simulation exists; teach-QA not yet authored"
}
```

If design sim does not exist:
```json
"D4_design_sim_qa_state": {
  "applicable": false,
  "reason": "No DESIGN-SIMULATION-R1.md in session folder — design phase not yet run"
}
```

---

### Step 6: Populate D5 — Cross-Tenant Install State

D5 records whether the flow has been validated for cross-tenant install.

```bash
# Check for portability test
find client/e2e -name "*portability*" -o -name "*{slug}*" 2>/dev/null | grep -i "portab\|scope"
# Check scope_portability_match_count
grep -r "scope_portability" docs/sessions/FLOW-XX/ 2>/dev/null | wc -l
```

```json
"D5_cross_tenant_install_state": {
  "scope_portability_test_present": false,
  "scope_portability_match_count": 0,
  "evidence_summary": "No scope portability tests found for this flow. Fleet install validation pending."
}
```

---

### Step 7: Populate Track A — Topology Contract

```bash
# Check topology contract
ls contracts/topologies/{slug}.topology.json 2>/dev/null
# If exists, get node/edge count
python3 -c "
import json, sys
try:
  d = json.load(open('contracts/topologies/{slug}.topology.json'))
  print('nodes:', len(d.get('nodes', [])))
  print('edges:', len(d.get('edges', [])))
except: print('NOT_FOUND')
" 2>/dev/null
```

```json
"track_a_topology": {
  "status": "PRESENT",
  "topology_path": "contracts/topologies/{slug}.topology.json",
  "node_count": {N},
  "edge_count_in_file": {N},
  "gate_check": "PASS"
}
```

If absent:
```json
"track_a_topology": {
  "status": "MISSING",
  "topology_path": "contracts/topologies/{slug}.topology.json",
  "node_count": 0,
  "edge_count_in_file": 0,
  "gate_check": "FAIL"
}
```

---

### Step 8: Populate Track B — Topology QA Spec

```bash
ls client/e2e/topology/{slug}-topology-qa.spec.ts 2>/dev/null
```

```json
"track_b_topology_qa_spec": {
  "status": "PRESENT",
  "spec_path": "client/e2e/topology/{slug}-topology-qa.spec.ts"
}
```

If absent: `"status": "NOT_APPLICABLE"` (if no topology) or `"status": "MISSING"` (if topology exists but spec doesn't).

---

### Step 9: Populate Track C — Marketplace Coverage

```bash
# Check ES marketplace packages index (if ES available)
# If ES not available, check for marketplace-related files
grep -r "marketplace" docs/sessions/FLOW-XX/ --include="*.json" | grep -i "package\|coverage" | head -3
```

```json
"track_c_marketplace_coverage": {
  "status": "N/A",
  "es_index": "xiigen-master-..._xiigen-marketplace-packages",
  "package_count_resolved": 0
}
```

---

### Step 10: Set `overall_status`

**overall_status verdict rules (objective, not subjective):**

| Condition | overall_status |
|-----------|---------------|
| D1 completeness = COMPLETE AND D2.src_engine_dir_exists = true AND Track A = PRESENT | `"COMPLETE"` |
| D1 completeness = COMPLETE OR D2 has ≥1 service file OR Track A = PRESENT | `"PARTIAL_OK"` |
| D1 completeness = EMPTY AND D2.src_engine_dir_exists = false AND all tracks MISSING | `"INCOMPLETE"` |

```json
"overall_status": "PARTIAL_OK",
"blockers": [
  "Track A topology contract missing — required for marketplace eligibility"
],
"follow_ups": [
  "Populate D5 cross-tenant install state after fleet install test runs"
]
```

**Rules for blockers and follow_ups:**
- `blockers` = BLOCKING severity items that prevent the flow from progressing
- `follow_ups` = items that should be addressed in a future session (not blocking now)
- Both arrays may be empty `[]` if no items

---

## COMPLETE TEMPLATE

The complete `FLOW-XX-CURRENT-STATE.json` output:

```json
{
  "$schema_version": "1.0",
  "_template_for": "Mirrors docs/sessions/FLOW-01/FLOW-01-CURRENT-STATE.json",
  "_authored_by": "Claude ({session or batch name})",
  "_authored_at": "{YYYY-MM-DD}",
  "_authored_against": "branch {branch-name} @ HEAD",
  "flowId": "FLOW-XX",
  "slug": "{slug}",
  "displayName": "{Display Name}",
  "D1_folder_inventory": {
    "session_folder_path": "docs/sessions/FLOW-XX",
    "session_folder_exists": true,
    "file_count": {N},
    "categories": {
      "step_artifacts": [ /* STEP files found */ ],
      "state_artifacts": [ /* *-STATE.json and *-STATE.md files */ ],
      "other_artifacts": [ /* all other files */ ]
    },
    "completeness_assessment": "{COMPLETE | PARTIAL | MINIMAL | EMPTY}"
  },
  "D2_server_processes": {
    "src_engine_dir": "server/src/engine/flows/{slug}",
    "src_engine_dir_exists": {true | false},
    "service_files": [ /* .service.ts files on disk */ ],
    "test_files": {
      "server_unit": [ /* server unit specs */ ],
      "server_e2e": [ /* e2e specs */ ],
      "client_unit": [ /* client unit specs */ ]
    }
  },
  "D3_ui_qa_state": {
    "qa_coverage_state_path": "docs/sessions/FLOW-XX/FLOW-XX-QA-COVERAGE-STATE.json",
    "qa_coverage_state_present": {true | false},
    "topology_node_count": {N | null},
    "applicabilityToMarketplace": "{YES | NO | PARTIAL | null}",
    "scope_isolation_arbiter_present_per_qa_doc": {true | false | null}
  },
  "D4_design_sim_qa_state": {
    "applicable": {true | false},
    "design_sim_present": {true | false | null},
    "teach_qa_present": {true | false | null},
    "reason": "{explanation}"
  },
  "D5_cross_tenant_install_state": {
    "scope_portability_test_present": {true | false},
    "scope_portability_match_count": {N},
    "evidence_summary": "{what was found or not found}"
  },
  "track_a_topology": {
    "status": "MISSING | PRESENT",
    "topology_path": "contracts/topologies/{slug}.topology.json",
    "node_count": {N},
    "edge_count_in_file": {N},
    "gate_check": "N/A | PASS | FAIL"
  },
  "track_b_topology_qa_spec": {
    "status": "NOT_APPLICABLE | PRESENT | MISSING",
    "spec_path": "client/e2e/topology/{slug}-topology-qa.spec.ts"
  },
  "track_c_marketplace_coverage": {
    "status": "N/A | PRESENT | MISSING",
    "es_index": "xiigen-master-..._xiigen-marketplace-packages",
    "package_count_resolved": {N}
  },
  "overall_status": "PARTIAL_OK | COMPLETE | INCOMPLETE",
  "blockers": [ /* blocking issues */ ],
  "follow_ups": [ /* future session items */ ]
}
```

---

## SELF-CHECK BEFORE SAVING

Before saving `FLOW-XX-CURRENT-STATE.json`, verify:

```
□ $schema_version is exactly "1.0"
□ flowId matches the canonical flow ID (e.g., "FLOW-09")
□ slug is kebab-case matching the actual directory name
□ Every D1-D5 field was populated from a bash command result, not from memory
□ No file names in service_files, test_files, or step_artifacts that were NOT confirmed by ls
□ overall_status follows the objective verdict rules (not a subjective assessment)
□ blockers[] contains only items confirmed by the bash evidence above
□ File saved to docs/sessions/FLOW-XX/FLOW-XX-CURRENT-STATE.json (correct path)
```

**SILENT_FAILURE RISK:** The most common error is listing service files in D2 that don't
actually exist on disk. This makes the flow appear more implemented than it is. Always
run `ls server/src/engine/flows/{slug}/` before populating D2.service_files.

---

## FLOW MATURITY EXAMPLES

The schema is fixed but values vary by how far along implementation is.

**Example A — Pre-implementation (flow spec exists, no code yet):**
- D1: file_count = 1-5 (only planning docs), step_artifacts = [], completeness = MINIMAL
- D2: src_engine_dir_exists = false, service_files = [], test_files = all empty
- Track A: status = MISSING, gate_check = FAIL
- overall_status: INCOMPLETE

**Example B — Planning phase complete (STEP files done, no code yet):**
- D1: file_count = 10-15, step_artifacts = [all 10 STEP files], completeness = COMPLETE
- D2: src_engine_dir_exists = false, service_files = []
- Track A: status = MISSING
- overall_status: PARTIAL_OK

**Example C — Fully implemented (FLOW-09 / FLOW-46 pattern):**
- D1: file_count = 20+, all categories populated
- D2: src_engine_dir_exists = true, service_files = [6+ service files], test_files populated
- Track A: status = PRESENT, gate_check = PASS
- overall_status: COMPLETE

---

## C30/C38 SOURCE SPLIT NOTE

The FLOW-XX-CURRENT-STATE.json schema is **universal** — the same structure applies to
all 49 flows (FLOW-00..FLOW-48). The only fields that vary by flow source are:
- `slug` and `displayName` → from ZIP-16 for FLOW-01..34; from List B CURRENT-STATE or spec for FLOW-35..47; from ZIP-17 batch data for FLOW-00 and FLOW-48
- D2 `src_engine_dir` path → always uses the flow's canonical slug

FLOW-41 (`adapter-ci-cd-bridge`) follows the same schema. It is only exempt from
GUIDE-B50 (ROLE-SCREEN-MATRIX), not from CURRENT-STATE.json.

---

## AUTHORING QUALITY GATE

This guidance file is SELF-SUFFICIENT if a Claude Code session can produce a correct
`FLOW-XX-CURRENT-STATE.json` using only:
1. This guidance file
2. The actual codebase (for bash commands to run)
3. The flow's spec or master state (for slug + displayName)

No other documents are required. If Claude Code needs to look up something not covered
here, this guidance file needs to be updated.

---
*GUIDE-B01 | Round 11 | Phase 4 — Guidance File Authoring*
*Sources: ZIP-01 (P+S), ZIP-02 (R), ZIP-11 (F), ZIP-16 (R)*
*Next: GUIDE-B02 — FLOW-XX-IMPL-STATE.json (Round 12)*
