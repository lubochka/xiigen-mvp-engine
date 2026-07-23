#!/usr/bin/env python3
"""
Update flow-ui-automation.json state machines to FINAL plan rules.

Per FLOW-UI-COVERAGE-PLAN-FINAL.md (supersedes v1..v5.1):
  - ENGINE_INTERNAL is a documentation label only.
  - All 47 in-scope flows run all 13 phases (P0..P13).
  - Only FLOW-41 (ADAPTER) is exempt: Phase 0 + Phase 1 only.

Effect on each JSON:
  TENANT_FACING / ADMIN_FACING / ENGINE_INTERNAL → phasesApplicable = P0..P13
  ADAPTER (FLOW-41) → phasesApplicable = P0, P1
  For each phase now applicable but previously skipped:
    phases.P*.applies = true
    phases.P*.status = "pending" (unless already completed)
    arbiter values flipped from "skipped" → "pending"
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SESSIONS_DIR = ROOT / "docs" / "sessions"

FULL_PHASES = ["P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12", "P13"]
ADAPTER_PHASES = ["P0", "P1"]


def update_flow(flow_id: str) -> dict:
    p = SESSIONS_DIR / flow_id / "flow-ui-automation.json"
    if not p.exists():
        return {"flowId": flow_id, "changed": False, "reason": "no JSON"}
    data = json.loads(p.read_text(encoding="utf-8"))
    cls = data.get("classification")
    changed = False

    if cls == "ADAPTER":
        desired = ADAPTER_PHASES
    else:
        desired = FULL_PHASES

    if data.get("phasesApplicable") != desired:
        data["phasesApplicable"] = desired
        changed = True

    # Flip applies/status for phases that were skipped under old rule
    for ph in FULL_PHASES:
        if ph not in data.get("phases", {}):
            continue
        phase = data["phases"][ph]
        should_apply = ph in desired
        if phase.get("applies") != should_apply:
            phase["applies"] = should_apply
            changed = True
        if should_apply and phase.get("status") == "skipped":
            phase["status"] = "pending"
            for k, v in list(phase.get("arbiters", {}).items()):
                if v == "skipped":
                    phase["arbiters"][k] = "pending"
            phase["completed_at"] = None
            changed = True
        if not should_apply and phase.get("status") != "completed":
            phase["status"] = "skipped"
            for k in list(phase.get("arbiters", {}).keys()):
                phase["arbiters"][k] = "skipped"

    data["generated_from"] = [
        "docs/sessions/FLOW-UI-COVERAGE-PLAN-FINAL.md",
        "docs/sessions/47-FLOW-CURRENT-STATE-MASTER.json",
        "filesystem scan",
    ]

    if changed:
        p.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return {"flowId": flow_id, "classification": cls, "changed": changed, "applicable": len(desired)}


def main() -> int:
    results = []
    for n in range(48):
        fid = f"FLOW-{n:02d}"
        results.append(update_flow(fid))
    updated = sum(1 for r in results if r.get("changed"))
    print(f"Scanned {len(results)} flows; updated {updated}")
    by_cls = {}
    for r in results:
        cls = r.get("classification") or "UNKNOWN"
        by_cls.setdefault(cls, 0)
        by_cls[cls] += 1 if r.get("changed") else 0
    for cls, n in by_cls.items():
        print(f"  {cls}: {n} JSONs changed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
