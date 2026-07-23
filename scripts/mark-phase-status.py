#!/usr/bin/env python3
"""
Mark a phase status across all flow-ui-automation.json files.

Usage:
  python scripts/mark-phase-status.py --phase P0 --status completed
  python scripts/mark-phase-status.py --phase P1 --status completed --only-if-output-exists
  python scripts/mark-phase-status.py --phase P0 --status completed --arbiter goal_delivery_row_count=pass
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SESSIONS_DIR = ROOT / "docs" / "sessions"


def next_phase_for(doc: dict) -> str:
    """Return the next not-completed applicable phase id, or DONE."""
    for pid in doc["phasesApplicable"]:
        ph = doc["phases"][pid]
        if ph["applies"] and ph["status"] != "completed":
            return pid
    return "DONE"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--phase", required=True, help="Phase id, e.g. P0")
    ap.add_argument("--status", required=True, choices=["pending", "in_progress", "completed"])
    ap.add_argument("--only-if-output-exists", action="store_true",
                    help="Only update if the phase's output file exists")
    ap.add_argument("--arbiters-pass", action="store_true",
                    help="Also mark all arbiters for this phase as 'pass'")
    ap.add_argument("--completed-at", default="2026-04-17",
                    help="Timestamp to write when status=completed")
    ap.add_argument("--flows", nargs="*", default=None,
                    help="Restrict to specific flowIds (default: all)")
    args = ap.parse_args()

    updated = []
    skipped = []
    for n in range(48):
        fid = f"FLOW-{n:02d}"
        if args.flows and fid not in args.flows:
            continue
        p = SESSIONS_DIR / fid / "flow-ui-automation.json"
        if not p.exists():
            skipped.append(f"{fid}: automation file missing")
            continue
        doc = json.load(open(p, encoding="utf-8"))
        if args.phase not in doc["phases"]:
            skipped.append(f"{fid}: phase {args.phase} not in schema")
            continue
        ph = doc["phases"][args.phase]
        if not ph["applies"]:
            skipped.append(f"{fid}: phase {args.phase} not applicable for classification {doc['classification']}")
            continue
        if args.only_if_output_exists:
            out = ph["output"]
            out_abs = ROOT / out if not out.startswith(("client/", "server/")) else ROOT / out
            # For per-flow outputs like "docs/flow-coverage/{slug}/..." the path is already resolved in seed
            # Interpret output literally (relative to ROOT)
            out_path = ROOT / out
            if not out_path.exists() and not (out_path.is_dir() or out_path.parent.exists() and list(out_path.parent.glob(out_path.name))):
                skipped.append(f"{fid}: output {out} not present on disk")
                continue
        ph["status"] = args.status
        if args.status == "completed":
            ph["completed_at"] = args.completed_at
            if args.arbiters_pass:
                ph["arbiters"] = {k: "pass" for k in ph["arbiters"]}
        elif args.status == "in_progress":
            ph["completed_at"] = None
        else:
            ph["completed_at"] = None
        doc["next_phase"] = next_phase_for(doc)
        p.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
        updated.append(fid)

    print(f"updated {len(updated)} flows: phase={args.phase} -> {args.status}")
    for f in updated:
        print(f"  + {f}")
    if skipped:
        print("skipped:")
        for s in skipped:
            print(f"  - {s}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
