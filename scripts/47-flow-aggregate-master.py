#!/usr/bin/env python3
"""
47-flow-aggregate-master.py

Aggregates docs/sessions/FLOW-{01..47}/FLOW-NN-CURRENT-STATE.json into the
Phase 3 master rollup:
  docs/sessions/47-FLOW-CURRENT-STATE-MASTER.json
  docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md
"""
import json
import subprocess
from pathlib import Path

WORK = Path(r"C:\Projects\xiigen mvp\.claude\worktrees\vigorous-margulis")
SESS = WORK / "docs" / "sessions"
OUT_J = SESS / "47-FLOW-CURRENT-STATE-MASTER.json"
OUT_M = SESS / "47-FLOW-CURRENT-STATE-MASTER.md"


def head_sha():
    try:
        return subprocess.check_output(
            ["git", "-C", str(WORK), "rev-parse", "--short", "HEAD"],
            text=True,
        ).strip()
    except Exception:
        return "unknown"


def load(flow_num):
    fid = f"FLOW-{flow_num:02d}"
    path = SESS / fid / f"{fid}-CURRENT-STATE.json"
    if not path.exists():
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        return {"_err": str(e), "flowId": fid}


def safe(d, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
        if cur is None:
            return default
    return cur


def per_flow_row(state):
    if state is None:
        return None
    return {
        "flowId": state.get("flowId"),
        "slug": state.get("slug"),
        "displayName": state.get("displayName"),
        "d1_session_dir_exists": safe(state, "D1_folder_inventory", "session_folder_exists",
                                       default=safe(state, "D1_folder_inventory", "session_folder_path") is not None),
        "d1_file_count": safe(state, "D1_folder_inventory", "file_count", default=0),
        "d2_service_count": safe(state, "D2_server_processes", "service_count",
                                  default=len(safe(state, "D2_server_processes", "service_files", default=[]))),
        "d2_src_dir_exists": (safe(state, "D2_server_processes", "src_dir_exists", default=None)
                               if safe(state, "D2_server_processes", "src_dir_exists", default=None) is not None
                               else (safe(state, "D2_server_processes", "service_count",
                                           default=len(safe(state, "D2_server_processes", "service_files", default=[]))) > 0
                                     or safe(state, "D2_server_processes", "src_engine_dir") is not None)),
        "d3_qa_present": safe(state, "D3_ui_qa_state", "qa_present", default=False)
                          or safe(state, "D3_ui_qa_state", "topology_node_count") is not None,
        "d3_topology_node_count": safe(state, "D3_ui_qa_state", "topology_node_count"),
        "track_a_status": safe(state, "track_a_topology", "status", default="UNKNOWN"),
        "track_a_node_count": safe(state, "track_a_topology", "node_count", default=0),
        "track_b_status": safe(state, "track_b_topology_qa_spec", "status", default="UNKNOWN"),
        "track_c_status": safe(state, "track_c_marketplace_coverage", "status", default="UNKNOWN"),
        "track_c_package_count": safe(state, "track_c_marketplace_coverage", "package_count_resolved", default=0),
        "blockers": state.get("blockers", []),
    }


def main():
    rows = []
    for n in range(1, 48):
        st = load(n)
        row = per_flow_row(st)
        if row:
            rows.append(row)

    totals = {
        "flow_count": len(rows),
        "d1_session_dirs_present": sum(1 for r in rows if r["d1_session_dir_exists"]),
        "d2_src_dirs_present": sum(1 for r in rows if r["d2_src_dir_exists"]),
        "d2_services_total": sum(r["d2_service_count"] for r in rows),
        "d3_qa_present": sum(1 for r in rows if r["d3_qa_present"]),
        "track_a_topology_present": sum(1 for r in rows if r["track_a_status"] in ("PRE-EXISTING", "ALREADY-EXISTS")),
        "track_a_topology_absent": sum(1 for r in rows if r["track_a_status"] in ("NOT_PRESENT", "MISSING")),
        "track_b_replaced": sum(1 for r in rows if r["track_b_status"] == "REPLACED"),
        "track_b_replace_blocked": sum(1 for r in rows if r["track_b_status"] == "REPLACE_BLOCKED"),
        "track_b_not_applicable": sum(1 for r in rows if r["track_b_status"] == "NOT_APPLICABLE"),
        "track_c_all_pass": sum(1 for r in rows if r["track_c_status"] == "ALL_PASS"),
        "track_c_partial_fail": sum(1 for r in rows if r["track_c_status"] == "PARTIAL_FAIL"),
        "track_c_na": sum(1 for r in rows if r["track_c_status"] == "N/A"),
        "total_blockers": sum(len(r["blockers"]) for r in rows),
    }

    master = {
        "$schema_version": "1.0",
        "_authored_by": "Claude (47-FLOW-STATE-MAPPING-PLAN-v1.1 Phase 3 rollup)",
        "_authored_at": "2026-04-17",
        "_authored_against": f"branch claude/vigorous-margulis @ {head_sha()}",
        "scope": "FLOW-01 through FLOW-47 (46 flows present, FLOW-00 wave-init excluded)",
        "totals": totals,
        "per_flow": rows,
    }

    OUT_J.write_text(json.dumps(master, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_J}  ({len(rows)} flows)")

    md = []
    md.append("# 47-FLOW CURRENT-STATE MASTER ROLLUP")
    md.append("")
    md.append(f"**Authored:** 2026-04-17 against `claude/vigorous-margulis` @ `{head_sha()}`")
    md.append("")
    md.append(f"**Scope:** FLOW-01..47 — {len(rows)} flows mapped against the 47-FLOW-STATE-MAPPING-PLAN-v1.1 procedure (D1-D5 + Track A no-op + Track B REPLACE + Track C ASSERT).")
    md.append("")
    md.append("## Totals")
    md.append("")
    md.append("| Dimension | Count |")
    md.append("|---|---|")
    md.append(f"| Flows mapped | {totals['flow_count']} |")
    md.append(f"| D1: session dirs present | {totals['d1_session_dirs_present']} |")
    md.append(f"| D2: server src dirs present | {totals['d2_src_dirs_present']} |")
    md.append(f"| D2: total service files (.service.ts) | {totals['d2_services_total']} |")
    md.append(f"| D3: QA-COVERAGE-STATE present | {totals['d3_qa_present']} |")
    md.append(f"| Track A: topology JSON present (no-op) | {totals['track_a_topology_present']} |")
    md.append(f"| Track A: topology JSON absent | {totals['track_a_topology_absent']} |")
    md.append(f"| Track B: REPLACED (loadRealTopology adopted) | {totals['track_b_replaced']} |")
    md.append(f"| Track B: REPLACE_BLOCKED (spec exists, topo missing) | {totals['track_b_replace_blocked']} |")
    md.append(f"| Track B: NOT_APPLICABLE (no spec) | {totals['track_b_not_applicable']} |")
    md.append(f"| Track C: ALL_PASS | {totals['track_c_all_pass']} |")
    md.append(f"| Track C: PARTIAL_FAIL | {totals['track_c_partial_fail']} |")
    md.append(f"| Track C: N/A (no marketplace package) | {totals['track_c_na']} |")
    md.append(f"| Total blockers across all flows | {totals['total_blockers']} |")
    md.append("")
    md.append("## Per-flow matrix")
    md.append("")
    md.append("| Flow | Slug | D1 files | D2 svc | D3 QA | Track A | Track B | Track C | Blockers |")
    md.append("|---|---|---|---|---|---|---|---|---|")
    for r in rows:
        d3 = "YES" if r["d3_qa_present"] else "no"
        md.append(
            f"| {r['flowId']} | {r['slug']} | {r['d1_file_count']} | {r['d2_service_count']} "
            f"| {d3} | {r['track_a_status']} | {r['track_b_status']} | {r['track_c_status']} "
            f"| {len(r['blockers'])} |"
        )
    md.append("")
    md.append("## Source")
    md.append("")
    md.append("This file is generated by `scripts/47-flow-aggregate-master.py` from the 47 per-flow `docs/sessions/FLOW-NN/FLOW-NN-CURRENT-STATE.json` files. Re-run after any per-flow update.")
    md.append("")

    OUT_M.write_text("\n".join(md), encoding="utf-8")
    print(f"Wrote {OUT_M}")


if __name__ == "__main__":
    main()
