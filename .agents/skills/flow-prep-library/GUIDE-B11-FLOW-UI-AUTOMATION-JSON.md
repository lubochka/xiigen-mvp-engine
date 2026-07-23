# GUIDE-B11 — How to Produce `flow-ui-automation.json`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 21 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any flow-ui-automation.json):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

---

## WHAT THIS FILE IS

`flow-ui-automation.json` is the **UI coverage phase tracker** for a flow. It records:
- The flow's UI classification (TENANT_FACING / ADMIN_FACING / ENGINE_INTERNAL)
- Which UI automation phases (P0-P13) apply
- The status of each phase (completed / pending) with arbiter verdicts
- The six completion criteria for Playwright PNG evidence (Rule 32)

**Schema:** `flow-ui-automation.v1`
**Rule 32 enforcement (ZIP-01):** Phase P13 requires Playwright PNG evidence. The
`completion.criterion5_p13_zero_failures` and `criterion6_png_size_over_1kb` fields
are the machine-readable Rule 32 gate.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-01 | PRIMARY + STRUCTURE | AUTHORING-GUIDE v1.15 Rule 32 (Playwright PNG evidence); `flow-ui-automation.v1` schema |
| ZIP-14 | REFERENCE | `ux-guidelines.csv` (classification criteria; determines `uiRequired` and phase scope) |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/flow-ui-automation.json`
**File size range:** 40-80 lines
**When authored:** After Phase B services exist or initial UI gap analysis; updated as phases complete

---

## THREE CLASSIFICATION TYPES — CONFIRMED FROM FOUR FLOWS

| Classification | uiRequired | p1_input_branch | Confirmed flows |
|---------------|-----------|----------------|----------------|
| `TENANT_FACING` | `"Full"` | `"A"` | FLOW-09 |
| `ADMIN_FACING` | `"Admin full"` | `"B"` | FLOW-46 |
| `ENGINE_INTERNAL` | `"Admin debug only"` | `"C"` | FLOW-25, FLOW-47 |

**Selection rule:**
- Tenant-user or public-facing UI → TENANT_FACING / "A"
- Platform-admin-only UI → ADMIN_FACING / "B"
- Background services, arbiters, engine internals → ENGINE_INTERNAL / "C"

All three classifications use all 14 phases P0-P13. Only the scope of P5/P6 differs.

---

## THE 14 PHASES — FIXED NAMES AND ARBITER LISTS

| Phase | Name | Arbiters | dependsOn |
|-------|------|---------|-----------|
| P0 | Flow Inventory & Classification Gate | goal_delivery_row_count, classification_accuracy, no_assumed_classifications | [] |
| P1 | Server Business Logic Inventory | goal_delivery_edge_plus_node, scope_isolation_no_code_refs, terminal_state_coverage, iron_rule_labels, branch_honest_flagging | [P0] |
| P2 | UI Gap Analysis | goal_delivery_row_equals_p1, route_truthfulness_grep_app_tsx, potemkin_detection, engine_internal_correctness | [P1] |
| P3 | UI Automation Gap Analysis | goal_delivery_row_equals_covered, both_directories_searched, test_string_truthfulness, duplicate_flagging | [P2] |
| P4 | Snapshot Gap Analysis | goal_delivery_row_equals_tested_partial, png_file_verification_ls, call_truthfulness_verbatim | [P3] |
| P5 | UI Specification | goal_delivery_every_gap_has_spec, backgroundsteps_coverage, client_architecture_alignment, engine_internal_scope, data_testid_completeness | [P2,P3,P4] |
| P6 | UI Implementation | goal_delivery_every_spec_has_component, scope_isolation_no_business_logic, test_ids_present, state_completeness_rtl, route_registered_app_tsx | [P5] |
| P7 | UI → Server Connection | goal_delivery_every_action_has_api_call, scope_isolation_tenantid_from_auth, endpoint_existence_grep, error_propagation_no_swallow | [P6] |
| P8 | QA Test Scenarios | goal_delivery_test_count_ge_p1, screenshot_completeness, test_id_alignment, scenario_independence, p4_coverage_screenshot_added | [P5,P3,P4] |
| P9 | Edge Case Discovery | iron_rule_coverage_cf_rules, severity_accuracy, server_required_accuracy | [P8] |
| P10 | Server-Side Edge Case Specifications | goal_delivery_every_server_required_has_spec, http_contract_completeness, cf_number_assignment, no_code_behavior_only | [P9] |
| P11 | Server-Side Edge Case Implementation | goal_delivery_every_spec_has_impl, scope_isolation_tenantid_from_als, dna_8_outbox, bfa_rule_match_grep, test_gate_zero_failures | [P10] |
| P12 | Test Coverage Cleanup | stub_free_zero_todo_skip, duplicate_spec_deleted, test_gate_zero_failures, no_false_greens | [P8,P11] |
| P13 | QA Automation Run + Snapshots | png_count_match_test_count, file_size_gate_over_1kb, failure_gate_zero_failures, naming_convention_nn_kebab | [P12] |

---

## STEP-BY-STEP AUTHORING INSTRUCTIONS FOR CLAUDE CODE

### Pre-condition: gather seed evidence

```bash
# Topology contract
ls contracts/topologies/{slug}.topology.json 2>/dev/null && echo "true" || echo "false"
# Client pages directory
ls client/src/pages/{slug}/ 2>/dev/null && echo "true" || echo "false"
# List page files (basenames only)
ls client/src/pages/{slug}/*.tsx 2>/dev/null | xargs -I{} basename {}
# E2E spec
ls client/e2e/{slug}.spec.ts 2>/dev/null && echo "true" || echo "false"
# Snapshot directory and count
ls docs/e2e-snapshots/{slug}/ 2>/dev/null && echo "exists" || echo "missing"
ls docs/e2e-snapshots/{slug}/*.png 2>/dev/null | wc -l
# Current branch
git branch --show-current
```

---

### Step 1: Header and classification

```json
{
  "$schema": "flow-ui-automation.v1",
  "flowId": "FLOW-XX",
  "slug": "{slug}",
  "displayName": "{Display Name}",
  "classification": "{TENANT_FACING | ADMIN_FACING | ENGINE_INTERNAL}",
  "uiRequired": "{Full | Admin full | Admin debug only}",
  "phasesApplicable": ["P0","P1","P2","P3","P4","P5","P6","P7","P8","P9","P10","P11","P12","P13"],
  "generated_at": "{YYYY-MM-DD}",
  "generated_from": [
    "docs/sessions/FLOW-UI-COVERAGE-PLAN-v2.md",
    "docs/sessions/47-FLOW-CURRENT-STATE-MASTER.json",
    "filesystem scan"
  ],
  "branch": "{branch}",
  "p1_input_branch": "{A | B | C}",
```

---

### Step 2: seed_evidence

```json
  "seed_evidence": {
    "topology_contract_exists": {true | false},
    "topology_contract_path": "contracts/topologies/{slug}.topology.json",
    "client_pages_dir_exists": {true | false},
    "client_page_files": ["{PageName1}.tsx", "{PageName2}.tsx"],
    "client_e2e_spec_exists": {true | false},
    "root_e2e_specs": [],
    "snapshot_dir_exists": {true | false},
    "png_count": {N}
  },
```

---

### Step 3: phases object

One entry per phase. Completed phases have `"status": "completed"` with all arbiters `"pass"`.
Pending phases have `"status": "pending"` with all arbiters `"pending"`.

```json
  "phases": {
    "P0": {
      "name": "Flow Inventory & Classification Gate",
      "applies": true,
      "status": "completed | pending",
      "output": "docs/flow-coverage/FLOW-INVENTORY.md",
      "dependsOn": [],
      "arbiters": {
        "goal_delivery_row_count": "pass | pending",
        "classification_accuracy": "pass | pending",
        "no_assumed_classifications": "pass | pending"
      },
      "evidence": {},
      "completed_at": "{YYYY-MM-DD} | null"
    },
    "P1": {
      "name": "Server Business Logic Inventory",
      "applies": true,
      "status": "pending",
      "output": "docs/flow-coverage/{slug}/P1-business-logic-inventory.md",
      "dependsOn": ["P0"],
      "arbiters": {
        "goal_delivery_edge_plus_node": "pending",
        "scope_isolation_no_code_refs": "pending",
        "terminal_state_coverage": "pending",
        "iron_rule_labels": "pending",
        "branch_honest_flagging": "pending"
      },
      "evidence": {},
      "completed_at": null
    }
    // ... continue for P2-P13 using the names and arbiters from the table above
  },
```

**Phase output paths (canonical — for `output` field):**

| Phase | Output |
|-------|--------|
| P0 | `docs/flow-coverage/FLOW-INVENTORY.md` |
| P1-P4, P9-P10 | `docs/flow-coverage/{slug}/P{N}-{kebab-name}.md` |
| P5 | `docs/flow-coverage/{slug}/P5-ui-specs.md` |
| P6 | `client/src/pages/{slug}/ + App.tsx route + __tests__` |
| P7 | `client/src/api/{slug}.api.ts + updated components` |
| P8 | `client/e2e/{slug}.spec.ts` |
| P11 | `server/src/engine/flows/{slug}/*.ts + BFA rules + tests` |
| P12 | `cleaned test files + duplicate spec deleted` |
| P13 | `docs/e2e-snapshots/{slug}/*.png + P13-qa-run-report.md` |

---

### Step 4: completion object

```json
  "completion": {
    "all_six_criteria_met": false,
    "criterion1_p1_shape": false,
    "criterion2_p2_no_gaps": false,
    "criterion3_p3_no_untested": false,
    "criterion4_p4_no_missing_screenshots": false,
    "criterion5_p13_zero_failures": false,
    "criterion6_png_size_over_1kb": false
  },
```

Set each to `true` only from bash verification:

```bash
# criterion5 — zero test failures in P13
grep "failure_gate_zero_failures.*pass" docs/sessions/FLOW-XX/flow-ui-automation.json

# criterion6 — all PNGs > 1KB (Rule 32)
find docs/e2e-snapshots/{slug}/ -name "*.png" -size +1k | wc -l
# Must equal total PNG count for criterion6 = true
```

---

### Step 5: next_phase

```json
  "next_phase": "{first pending phase with all deps complete}",
  "next_phase_note": "{one-sentence description}"
}
```

---

## SELF-CHECK BEFORE SAVING

```
□ classification confirmed from design simulation or ROLE-SCREEN-MATRIX (not guessed)
□ p1_input_branch matches classification: A=TENANT, B=ADMIN, C=ENGINE
□ phasesApplicable has exactly 14 entries: P0-P13
□ seed_evidence booleans from bash commands (not assumed)
□ client_page_files contains basenames only (not paths)
□ Phase arbiters are "pass" only for completed phases
□ completion criteria are true only when bash-verified
□ all_six_criteria_met only true when all six = true
□ next_phase satisfies its dependsOn chain (all deps completed)
□ File saved to docs/sessions/FLOW-XX/flow-ui-automation.json
```

**SILENT_FAILURE RISK 1:** Wrong classification drives wrong phase scope (end-user vs debug).
**SILENT_FAILURE RISK 2:** criterion6 set to true without checking PNG file sizes.
**SILENT_FAILURE RISK 3:** next_phase skipping a phase whose dependsOn is not yet satisfied.

---
*GUIDE-B11 | Round 21 | Phase 4 — Guidance File Authoring*
*Sources: ZIP-01 (P+S — flow-ui-automation.v1 schema, Rule 32), ZIP-14 (R — ux-guidelines.csv)*
*Confirmed examples: FLOW-09 (TENANT_FACING/A), FLOW-46 (ADMIN_FACING/B), FLOW-25/47 (ENGINE_INTERNAL/C)*
*Next: GUIDE-B12 — FLOW-XX-DESIGN-SIMULATION-R1.md (Round 22)*
