#!/usr/bin/env python3
"""
Generate flow-ui-automation.json in every docs/sessions/FLOW-XX/ directory.

Seeded from:
  - FLOW-UI-COVERAGE-PLAN-v2.md classification table
  - docs/sessions/47-FLOW-CURRENT-STATE-MASTER.json (slugs, topology status)
  - Filesystem inventory (topology contracts, client pages, e2e specs, snapshots)

Schema: per-flow phase state machine for P0..P13 (see FLOW-UI-COVERAGE-PLAN-v2).
Classification determines which phases apply (ALL / ENGINE_INTERNAL_SUBSET / ADAPTER_MINIMAL).
Idempotent: preserves phase status when re-run unless --reset is passed.
"""

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SESSIONS_DIR = ROOT / "docs" / "sessions"
TOPOLOGY_DIR = ROOT / "contracts" / "topologies"
CLIENT_PAGES = ROOT / "client" / "src" / "pages"
CLIENT_E2E = ROOT / "client" / "e2e"
ROOT_E2E = ROOT / "e2e" / "tests"
SNAPSHOT_DIR = ROOT / "docs" / "e2e-snapshots"
MASTER_STATE = SESSIONS_DIR / "47-FLOW-CURRENT-STATE-MASTER.json"
GENERATED_AT = "2026-04-17"
PLAN_REF = "docs/sessions/FLOW-UI-COVERAGE-PLAN-v2.md"

# Classification per FLOW-UI-COVERAGE-PLAN-v2 (lines 30-77)
CLASSIFICATION = {
    "FLOW-00": "ENGINE_INTERNAL",
    "FLOW-01": "TENANT_FACING",
    "FLOW-02": "TENANT_FACING",
    "FLOW-03": "TENANT_FACING",
    "FLOW-04": "TENANT_FACING",
    "FLOW-05": "TENANT_FACING",
    "FLOW-06": "TENANT_FACING",
    "FLOW-07": "TENANT_FACING",
    "FLOW-08": "TENANT_FACING",
    "FLOW-09": "TENANT_FACING",
    "FLOW-10": "TENANT_FACING",
    "FLOW-11": "ADMIN_FACING",
    "FLOW-12": "TENANT_FACING",
    "FLOW-13": "ADMIN_FACING",
    "FLOW-14": "ADMIN_FACING",
    "FLOW-15": "ADMIN_FACING",
    "FLOW-16": "TENANT_FACING",
    "FLOW-17": "TENANT_FACING",
    "FLOW-18": "ENGINE_INTERNAL",
    "FLOW-19": "ADMIN_FACING",
    "FLOW-20": "ADMIN_FACING",
    "FLOW-21": "TENANT_FACING",
    "FLOW-22": "TENANT_FACING",
    "FLOW-23": "TENANT_FACING",
    "FLOW-24": "TENANT_FACING",
    "FLOW-25": "ENGINE_INTERNAL",
    "FLOW-26": "ENGINE_INTERNAL",
    "FLOW-27": "ENGINE_INTERNAL",
    "FLOW-28": "TENANT_FACING",
    "FLOW-29": "ENGINE_INTERNAL",
    "FLOW-30": "ENGINE_INTERNAL",
    "FLOW-31": "ENGINE_INTERNAL",
    "FLOW-32": "ENGINE_INTERNAL",
    "FLOW-33": "ENGINE_INTERNAL",
    "FLOW-34": "ADMIN_FACING",
    "FLOW-35": "ENGINE_INTERNAL",
    "FLOW-36": "ENGINE_INTERNAL",
    "FLOW-37": "ENGINE_INTERNAL",
    "FLOW-38": "ENGINE_INTERNAL",
    "FLOW-39": "ENGINE_INTERNAL",
    "FLOW-40": "ENGINE_INTERNAL",
    "FLOW-41": "ADAPTER",
    "FLOW-42": "ENGINE_INTERNAL",
    "FLOW-43": "ENGINE_INTERNAL",
    "FLOW-44": "ENGINE_INTERNAL",
    "FLOW-45": "ENGINE_INTERNAL",
    "FLOW-46": "ADMIN_FACING",
    "FLOW-47": "ENGINE_INTERNAL",
}

# Override slugs for FLOW-00 (not in master state file — comes from CLAUDE.md)
FLOW_00 = {"slug": "bundle-activation", "displayName": "Bundle Activation"}

# Phase metadata from FLOW-UI-COVERAGE-PLAN-v2
PHASE_META = {
    "P0": {
        "name": "Flow Inventory & Classification Gate",
        "output_template": "docs/flow-coverage/FLOW-INVENTORY.md",
        "per_flow_output": False,
        "dependsOn": [],
        "arbiters": ["goal_delivery_row_count", "classification_accuracy", "no_assumed_classifications"],
    },
    "P1": {
        "name": "Server Business Logic Inventory",
        "output_template": "docs/flow-coverage/{slug}/P1-business-logic-inventory.md",
        "per_flow_output": True,
        "dependsOn": ["P0"],
        "arbiters": ["goal_delivery_edge_plus_node", "scope_isolation_no_code_refs", "terminal_state_coverage", "iron_rule_labels", "branch_honest_flagging"],
    },
    "P2": {
        "name": "UI Gap Analysis",
        "output_template": "docs/flow-coverage/{slug}/P2-ui-gap-analysis.md",
        "per_flow_output": True,
        "dependsOn": ["P1"],
        "arbiters": ["goal_delivery_row_equals_p1", "route_truthfulness_grep_app_tsx", "potemkin_detection", "engine_internal_correctness"],
    },
    "P3": {
        "name": "UI Automation Gap Analysis",
        "output_template": "docs/flow-coverage/{slug}/P3-automation-gap-analysis.md",
        "per_flow_output": True,
        "dependsOn": ["P2"],
        "arbiters": ["goal_delivery_row_equals_covered", "both_directories_searched", "test_string_truthfulness", "duplicate_flagging"],
    },
    "P4": {
        "name": "Snapshot Gap Analysis",
        "output_template": "docs/flow-coverage/{slug}/P4-snapshot-gap-analysis.md",
        "per_flow_output": True,
        "dependsOn": ["P3"],
        "arbiters": ["goal_delivery_row_equals_tested_partial", "png_file_verification_ls", "call_truthfulness_verbatim"],
    },
    "P5": {
        "name": "UI Specification",
        "output_template": "docs/flow-coverage/{slug}/P5-ui-specs.md",
        "per_flow_output": True,
        "dependsOn": ["P2", "P3", "P4"],
        "arbiters": ["goal_delivery_every_gap_has_spec", "backgroundsteps_coverage", "client_architecture_alignment", "engine_internal_scope", "data_testid_completeness"],
    },
    "P6": {
        "name": "UI Implementation",
        "output_template": "client/src/pages/{slug}/ + App.tsx route + __tests__",
        "per_flow_output": True,
        "dependsOn": ["P5"],
        "arbiters": ["goal_delivery_every_spec_has_component", "scope_isolation_no_business_logic", "test_ids_present", "state_completeness_rtl", "route_registered_app_tsx"],
    },
    "P7": {
        "name": "UI \u2192 Server Connection",
        "output_template": "client/src/api/{slug}.api.ts + updated components",
        "per_flow_output": True,
        "dependsOn": ["P6"],
        "arbiters": ["goal_delivery_every_action_has_api_call", "scope_isolation_tenantid_from_auth", "endpoint_existence_grep", "error_propagation_no_swallow"],
    },
    "P8": {
        "name": "QA Test Scenarios",
        "output_template": "client/e2e/{slug}.spec.ts",
        "per_flow_output": True,
        "dependsOn": ["P5", "P3", "P4"],
        "arbiters": ["goal_delivery_test_count_ge_p1", "screenshot_completeness", "test_id_alignment", "scenario_independence", "p4_coverage_screenshot_added"],
    },
    "P9": {
        "name": "Edge Case Discovery",
        "output_template": "docs/flow-coverage/{slug}/P9-edge-cases.md",
        "per_flow_output": True,
        "dependsOn": ["P8"],
        "arbiters": ["iron_rule_coverage_cf_rules", "severity_accuracy", "server_required_accuracy"],
    },
    "P10": {
        "name": "Server-Side Edge Case Specifications",
        "output_template": "docs/flow-coverage/{slug}/P10-server-specs.md",
        "per_flow_output": True,
        "dependsOn": ["P9"],
        "arbiters": ["goal_delivery_every_server_required_has_spec", "http_contract_completeness", "cf_number_assignment", "no_code_behavior_only"],
    },
    "P11": {
        "name": "Server-Side Edge Case Implementation",
        "output_template": "server/src/engine/flows/{slug}/*.ts + BFA rules + tests",
        "per_flow_output": True,
        "dependsOn": ["P10"],
        "arbiters": ["goal_delivery_every_spec_has_impl", "scope_isolation_tenantid_from_als", "dna_8_outbox", "bfa_rule_match_grep", "test_gate_zero_failures"],
    },
    "P12": {
        "name": "Test Coverage Cleanup",
        "output_template": "cleaned test files + duplicate spec deleted",
        "per_flow_output": True,
        "dependsOn": ["P8", "P11"],
        "arbiters": ["stub_free_zero_todo_skip", "duplicate_spec_deleted", "test_gate_zero_failures", "no_false_greens"],
    },
    "P13": {
        "name": "QA Automation Run + Snapshots",
        "output_template": "docs/e2e-snapshots/{slug}/*.png + P13-qa-run-report.md",
        "per_flow_output": True,
        "dependsOn": ["P12"],
        "arbiters": ["png_count_match_test_count", "file_size_gate_over_1kb", "failure_gate_zero_failures", "naming_convention_nn_kebab"],
    },
}

# Which phases apply per classification (from plan section "Phase application by classification")
PHASES_BY_CLASSIFICATION = {
    "TENANT_FACING": ["P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12", "P13"],
    "ADMIN_FACING":  ["P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12", "P13"],
    # Plan: "Phase 0, Phase 1, Phase 2 (gap = no UI yet), Phase 5 (admin debug spec), Phase 6 (admin status page), Phase 7 (server health endpoint), Phase 8 (smoke test + 1 PNG), Phase 12 (cleanup), Phase 13 (run)"
    "ENGINE_INTERNAL": ["P0", "P1", "P2", "P5", "P6", "P7", "P8", "P12", "P13"],
    "ADAPTER": ["P0", "P1"],
}

UI_REQUIRED = {
    "TENANT_FACING": "Full",
    "ADMIN_FACING": "Admin full",
    "ENGINE_INTERNAL": "Admin debug only",
    "ADAPTER": "No UI",
}


def load_master_state():
    data = json.load(open(MASTER_STATE, encoding="utf-8"))
    by_id = {f["flowId"]: f for f in data["per_flow"]}
    return by_id


def evidence_for_flow(slug: str) -> dict:
    """Gather filesystem evidence for seeding the flow's initial state."""
    ev = {}
    topology_path = TOPOLOGY_DIR / f"{slug}.topology.json"
    ev["topology_contract_exists"] = topology_path.exists()
    ev["topology_contract_path"] = f"contracts/topologies/{slug}.topology.json" if topology_path.exists() else None

    client_page_dir = CLIENT_PAGES / slug
    ev["client_pages_dir_exists"] = client_page_dir.exists()
    if client_page_dir.exists():
        ev["client_page_files"] = sorted([p.name for p in client_page_dir.glob("*.tsx")])
    else:
        ev["client_page_files"] = []

    client_spec = CLIENT_E2E / f"{slug}.spec.ts"
    ev["client_e2e_spec_exists"] = client_spec.exists()

    # Root e2e: file may be named flowNN-{slug}.spec.ts
    root_specs = list(ROOT_E2E.glob(f"*{slug}*.spec.ts")) if ROOT_E2E.exists() else []
    ev["root_e2e_specs"] = [str(p.relative_to(ROOT)).replace("\\", "/") for p in root_specs]

    snap_dir = SNAPSHOT_DIR / slug
    ev["snapshot_dir_exists"] = snap_dir.exists()
    ev["png_count"] = len(list(snap_dir.glob("*.png"))) if snap_dir.exists() else 0

    return ev


def determine_p1_branch(topology_exists: bool, flow_id: str) -> str:
    """Branch A: topology exists. Branch B: no topology, product spec exists. Branch C: neither."""
    if topology_exists:
        return "A"
    # Product spec covers FLOW-01..24 and FLOW-28
    try:
        n = int(flow_id.split("-")[1])
    except Exception:
        return "C"
    if 1 <= n <= 24 or n == 28:
        return "B"
    return "C"


def build_phase(phase_id: str, slug: str, applies: bool) -> dict:
    meta = PHASE_META[phase_id]
    out_path = meta["output_template"].format(slug=slug)
    phase = {
        "name": meta["name"],
        "applies": applies,
        "status": "pending" if applies else "skipped",
        "output": out_path,
        "dependsOn": meta["dependsOn"],
        "arbiters": {a: "pending" if applies else "skipped" for a in meta["arbiters"]},
        "evidence": {},
        "completed_at": None,
    }
    return phase


def build_flow_automation(flow_id: str, slug: str, display_name: str, classification: str, existing: dict | None = None) -> dict:
    ev = evidence_for_flow(slug)
    applies_phases = set(PHASES_BY_CLASSIFICATION[classification])
    doc = {
        "$schema": "flow-ui-automation.v1",
        "flowId": flow_id,
        "slug": slug,
        "displayName": display_name,
        "classification": classification,
        "uiRequired": UI_REQUIRED[classification],
        "phasesApplicable": sorted(applies_phases, key=lambda p: int(p[1:])),
        "generated_at": GENERATED_AT,
        "generated_from": [
            PLAN_REF,
            "docs/sessions/47-FLOW-CURRENT-STATE-MASTER.json",
            "filesystem scan",
        ],
        "branch": "claude/vigorous-margulis",
        "p1_input_branch": determine_p1_branch(ev["topology_contract_exists"], flow_id),
        "seed_evidence": ev,
        "phases": {pid: build_phase(pid, slug, pid in applies_phases) for pid in PHASE_META},
        "completion": {
            "all_six_criteria_met": False,
            "criterion1_p1_shape": False,
            "criterion2_p2_no_gaps": False,
            "criterion3_p3_no_untested": False,
            "criterion4_p4_no_missing_screenshots": False,
            "criterion5_p13_zero_failures": False,
            "criterion6_png_size_over_1kb": False,
        },
        "next_phase": "P0",
        "next_phase_note": "Phase 0 is a single cross-flow inventory (docs/flow-coverage/FLOW-INVENTORY.md). After P0 approval each flow advances to P1.",
    }

    # Preserve status when regenerating over an existing file
    if existing and "phases" in existing:
        for pid, ph in existing.get("phases", {}).items():
            if pid in doc["phases"]:
                prior_status = ph.get("status")
                if prior_status in ("completed", "in_progress"):
                    doc["phases"][pid]["status"] = prior_status
                    doc["phases"][pid]["arbiters"] = ph.get("arbiters", doc["phases"][pid]["arbiters"])
                    doc["phases"][pid]["evidence"] = ph.get("evidence", {})
                    doc["phases"][pid]["completed_at"] = ph.get("completed_at")
        if "completion" in existing:
            doc["completion"] = {**doc["completion"], **existing["completion"]}
        if "next_phase" in existing:
            doc["next_phase"] = existing["next_phase"]

    return doc


def main() -> int:
    master = load_master_state()
    written = []
    skipped = []

    # Include FLOW-00 manually (not in master)
    all_flows = [("FLOW-00", FLOW_00["slug"], FLOW_00["displayName"])]
    for fid in sorted(master.keys(), key=lambda x: int(x.split("-")[1])):
        row = master[fid]
        all_flows.append((fid, row["slug"], row.get("displayName", fid)))

    for flow_id, slug, display_name in all_flows:
        session_dir = SESSIONS_DIR / flow_id
        if not session_dir.exists():
            skipped.append(f"{flow_id}: session dir missing")
            continue
        if flow_id not in CLASSIFICATION:
            skipped.append(f"{flow_id}: no classification in plan")
            continue

        out_path = session_dir / "flow-ui-automation.json"
        existing = None
        if out_path.exists():
            try:
                existing = json.load(open(out_path, encoding="utf-8"))
            except Exception:
                existing = None

        doc = build_flow_automation(flow_id, slug, display_name, CLASSIFICATION[flow_id], existing)
        out_path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
        written.append(flow_id)

    print(f"wrote {len(written)} flow-ui-automation.json files")
    for f in written:
        print(f"  + {f}")
    if skipped:
        print("skipped:")
        for s in skipped:
            print(f"  - {s}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
