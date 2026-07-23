#!/usr/bin/env python3
"""
Phase C5 closure - update FLOW-01-PORTABILITY-STATE.json.

Performs:
  - Phase C5 status: PENDING -> COMPLETED, sets commitHash placeholder, evidencePaths, lastCheckedAt
  - cascadeVisualEvidence rows[2] (row 3 tenant-a-marketplace): verdict=PASS, currentState=COMPLETE
  - cascadeVisualEvidence rows[3] (row 4 tenant-a-repo): verdict=PASS, currentState=COMPLETE
  - vGateManifest V-14: initialize instanceVerdicts dict + set A=PASS
  - lastUpdated: rewrite Phase C5 narrative
"""

import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
STATE_PATH = ROOT / "docs" / "portability" / "flow-01" / "FLOW-01-PORTABILITY-STATE.json"

EVIDENCE_PATHS_C5 = [
    "client/e2e/flow-01-v14-evidence.spec.ts (4 PNGs: 2 marketplace + 2 repo)",
    "docs/portability/flow-01/repo-evidence/acme--user-registration/ (7 files, ~44 KB)",
    "docs/e2e-snapshots/user-registration/tenant-a-marketplace/01-marketplace-tile-acme-1280px.png",
    "docs/e2e-snapshots/user-registration/tenant-a-marketplace/02-install-dialog-acme-1280px.png",
    "docs/e2e-snapshots/user-registration/tenant-a-repo/01-repo-overview-1280px.png",
    "docs/e2e-snapshots/user-registration/tenant-a-repo/02-repo-tree-1280px.png",
    "docs/portability/flow-01/visual-evidence/V-14-INSTANCE-A-AUDIT.md",
]


def main() -> int:
    if not STATE_PATH.is_file():
        print(f"FAIL: state file not found at {STATE_PATH}")
        return 1

    with STATE_PATH.open("r", encoding="utf-8") as f:
        s = json.load(f)

    # --- Phase C5 ---
    found_c5 = False
    for p in s["phases"]:
        if p.get("id") == "C5":
            found_c5 = True
            p["status"] = "COMPLETED"
            p["commitHash"] = "PENDING_BACKFILL"
            p["lastCheckedAt"] = "2026-04-25"
            p["evidencePaths"] = EVIDENCE_PATHS_C5
            p["notes"] = (
                "Phase C5 closes cascade rows 3 (tenant-a-marketplace) and 4 (tenant-a-repo) "
                "via V-14 instance A. Repo slug: acme--user-registration (double-dash separator "
                "per v2.0 line 744). 7-file synthetic repo scaffold at "
                "docs/portability/flow-01/repo-evidence/acme--user-registration/ (3 verbatim "
                "service files + tenant package.json/config.json + README/.gitignore). "
                "4 PNGs captured: marketplace tile (real UI from SharableFlowsMarketplacePage), "
                "install dialog (synthetic FREEDOM-diff modal), repo overview + tree (synthetic "
                "GitHub-style HTML). Synthetic-evidence transparency clause invoked at "
                "V-14-INSTANCE-A-AUDIT.md \u00a73 - external GitHub provisioning is TIER-B promotion "
                "territory, downstream of this gate. Top-level V-14 verdict remains NOT_YET_RUN "
                "until B (northwind, Phase C7) and C (tenant-c, Phase C8) also PASS."
            )
            break
    if not found_c5:
        print("FAIL: Phase C5 entry not found in phases list")
        return 1

    # --- cascadeVisualEvidence row 3 (index 2) ---
    rows = s["cascadeVisualEvidence"]["rows"]
    row3 = rows[2]
    assert row3.get("rowNum") == 3 and row3.get("cascadePoint") == "tenant-a-marketplace", (
        f"row 3 sanity check failed: {row3}"
    )
    row3["currentState"] = (
        "COMPLETE - 2 PNGs at docs/e2e-snapshots/user-registration/tenant-a-marketplace/ "
        "(01-marketplace-tile-acme-1280px.png from real SharableFlowsMarketplacePage UI; "
        "02-install-dialog-acme-1280px.png synthetic FREEDOM-diff modal); "
        "V-14 instance A row-3 component PASS"
    )
    row3["verdict"] = "PASS"
    row3["lastCheckedAt"] = "2026-04-25"
    row3["evidence"] = (
        "client/e2e/flow-01-v14-evidence.spec.ts test 1+2 + "
        "docs/portability/flow-01/visual-evidence/V-14-INSTANCE-A-AUDIT.md \u00a72.1"
    )
    row3["capturedWhen"] = "Phase C5 - 2026-04-25"

    # --- cascadeVisualEvidence row 4 (index 3) ---
    row4 = rows[3]
    assert row4.get("rowNum") == 4 and row4.get("cascadePoint") == "tenant-a-repo", (
        f"row 4 sanity check failed: {row4}"
    )
    row4["currentState"] = (
        "COMPLETE - 2 PNGs at docs/e2e-snapshots/user-registration/tenant-a-repo/ "
        "(01-repo-overview-1280px.png + 02-repo-tree-1280px.png, synthetic GitHub-style "
        "renders of acme--user-registration scaffold); 7-file local scaffold at "
        "docs/portability/flow-01/repo-evidence/acme--user-registration/; repo slug "
        "compliant with v2.0 line 744 double-dash convention; V-14 instance A row-4 "
        "component PASS (synthetic-evidence transparency invoked)"
    )
    row4["verdict"] = "PASS"
    row4["lastCheckedAt"] = "2026-04-25"
    row4["evidence"] = (
        "docs/portability/flow-01/repo-evidence/acme--user-registration/ + "
        "client/e2e/flow-01-v14-evidence.spec.ts test 3+4 + "
        "docs/portability/flow-01/visual-evidence/V-14-INSTANCE-A-AUDIT.md \u00a72.2"
    )
    row4["capturedWhen"] = "Phase C5 - 2026-04-25"
    row4["repoScaffoldPath"] = "docs/portability/flow-01/repo-evidence/acme--user-registration/"

    # --- V-14 vGate ---
    for vg in s["vGateManifest"]:
        if vg.get("id") == "V-14":
            iv = vg.setdefault("instanceVerdicts", {})
            iv["A_acme"] = {
                "verdict": "PASS",
                "lastCheckedAt": "2026-04-25",
                "repoSlug": "acme--user-registration",
                "evidence": (
                    "docs/portability/flow-01/repo-evidence/acme--user-registration/ + "
                    "docs/e2e-snapshots/user-registration/tenant-a-marketplace/ (2 PNGs) + "
                    "docs/e2e-snapshots/user-registration/tenant-a-repo/ (2 PNGs) + "
                    "client/e2e/flow-01-v14-evidence.spec.ts (capture spec) + "
                    "docs/portability/flow-01/visual-evidence/V-14-INSTANCE-A-AUDIT.md (audit). "
                    "Synthetic-evidence transparency clause invoked at audit \u00a73; external "
                    "GitHub provisioning deferred to TIER-B promotion."
                ),
            }
            iv.setdefault(
                "B_northwind",
                {"verdict": "NOT_YET_RUN", "lastCheckedAt": None},
            )
            iv.setdefault(
                "C_tenantC",
                {"verdict": "NOT_YET_RUN", "lastCheckedAt": None},
            )
            vg["lastCheckedAt"] = "2026-04-25"
            # Top-level verdict still NOT_YET_RUN until all 3 instances PASS
            break

    # --- lastUpdated narrative ---
    s["lastUpdated"] = (
        "2026-04-25 (Phase C5 closure - V-14 instance A PASS). Cascade rows 3 + 4 complete: "
        "acme--user-registration repo scaffold (7 files, ~44 KB) at "
        "docs/portability/flow-01/repo-evidence/; 4 PNGs captured via "
        "client/e2e/flow-01-v14-evidence.spec.ts (1 real marketplace UI + 3 synthetic HTML "
        "renders for install dialog, repo overview, repo tree). Repo naming compliant with "
        "v2.0 line 744 double-dash convention. Synthetic-evidence transparency clause invoked "
        "at V-14-INSTANCE-A-AUDIT.md \u00a73 - external GitHub provisioning deferred to TIER-B "
        "promotion. Phase C4 + C5 close out the tenant-a portion of cascade (rows 2-4). "
        "Next: Phase C6 - V-13 instance C + V-15 instance B (tenant-b northwind install + "
        "drift, cascade row 5)."
    )

    # write
    with STATE_PATH.open("w", encoding="utf-8") as f:
        json.dump(s, f, indent=2, ensure_ascii=False)

    print(f"OK: STATE.json updated for Phase C5 closure")
    print(f"  Phase C5 status: COMPLETED")
    print(f"  Row 3 verdict: PASS")
    print(f"  Row 4 verdict: PASS")
    print(f"  V-14 instance A verdict: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
