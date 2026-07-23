#!/usr/bin/env python3
"""
Phase C6 closure - update FLOW-01-PORTABILITY-STATE.json.

Performs:
  - Phase C6 status: PENDING -> COMPLETED, sets commitHash placeholder, evidencePaths, lastCheckedAt
    Also fixes the storagePath typo in artifacts list (v1.0.3 -> v1.0.1).
  - cascadeVisualEvidence rows[4] (row 5 tenant-b-installed): verdict=PASS, currentState=COMPLETE
  - vGateManifest V-13: instanceVerdicts.C_tenantBInstalled = PASS
  - lastUpdated: rewrite Phase C6 narrative
"""

import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
STATE_PATH = ROOT / "docs" / "portability" / "flow-01" / "FLOW-01-PORTABILITY-STATE.json"

EVIDENCE_PATHS_C6 = [
    "docs/e2e-snapshots/user-registration/tenant-b-northwind-installed-v1.0.1/ (252 PNGs)",
    "docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-b.json",
    "docs/portability/flow-01/visual-evidence/FC-18-AUDIT-TRAIL-tenant-b.md",
    "scripts/portability/flow-01-build-tenant-b-coverage.py",
    "client/e2e/flow-01-visual.spec.ts (TENANT_SEED reconciled to canonical northwind/tessera names)",
    "docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md (placeholder slugs reconciled)",
]


def main() -> int:
    if not STATE_PATH.is_file():
        print(f"FAIL: state file not found at {STATE_PATH}")
        return 1

    with STATE_PATH.open("r", encoding="utf-8") as f:
        s = json.load(f)

    # --- Phase C6 ---
    found_c6 = False
    for p in s["phases"]:
        if p.get("id") == "C6":
            found_c6 = True
            p["status"] = "COMPLETED"
            p["commitHash"] = "PENDING_BACKFILL"
            p["lastCheckedAt"] = "2026-04-25"
            p["evidencePaths"] = EVIDENCE_PATHS_C6
            # Fix the storagePath typo: v1.0.3 -> v1.0.1
            p["artifacts"] = [
                a.replace(
                    "tenant-b-northwind-installed-v1.0.3",
                    "tenant-b-northwind-installed-v1.0.1",
                )
                for a in p.get("artifacts", [])
            ]
            p["notes"] = (
                "Phase C6 closes cascade row 5 (tenant-b-installed) via V-13 instance C. "
                "Capture target: tenant-b-northwind-installed-v1.0.1 (northwind-guild "
                "installed acme-pro-members v1.0.1 unchanged). 252 PNGs captured via "
                "client/e2e/flow-01-visual.spec.ts with XIIGEN_VISUAL_TARGET="
                "tenant-b-northwind-installed-v1.0.1. Drift comparison via "
                "scripts/portability/flow-01-build-tenant-b-coverage.py: 252/252 byte-"
                "identical pairs against platform-source AND against tenant-a-acme-v1.0.1. "
                "Per V-15-DRIFT-PASS-CONTRACT.md this IS the V-15 PASS outcome for FLOW-01 "
                "(server-side-only adaptation surface). V-13 instance C verdict mechanically "
                "derived from instance A under the contract. TENANT_SEED block in capture "
                "spec was reconciled from placeholder names (tenant-b-orca / tenant-c-bolt) "
                "to canonical cascade names (tenant-b-northwind-installed-v1.0.1 + "
                "tenant-b-northwind-v1.0.2 + tenant-c-tessera-v1.0.1) sourced from "
                "cascade-sk549-validation.md. Top-level V-13 verdict remains NOT_YET_RUN "
                "until D (tenant-c, Phase C8) also PASS."
            )
            break
    if not found_c6:
        print("FAIL: Phase C6 entry not found in phases list")
        return 1

    # --- cascadeVisualEvidence row 5 (index 4) ---
    rows = s["cascadeVisualEvidence"]["rows"]
    row5 = rows[4]
    assert row5.get("rowNum") == 5 and row5.get("cascadePoint") == "tenant-b-installed", (
        f"row 5 sanity check failed: {row5}"
    )
    row5["currentState"] = (
        "COMPLETE - 252 PNGs at docs/e2e-snapshots/user-registration/"
        "tenant-b-northwind-installed-v1.0.1/ (replaces 3 stale v1.1-protocol "
        "ResendPage PNGs); drift = 0 px vs platform-source AND vs tenant-a; "
        "V-13 instance C verdict PASS (mechanically derived under "
        "V-15-DRIFT-PASS-CONTRACT.md)"
    )
    row5["verdict"] = "PASS"
    row5["lastCheckedAt"] = "2026-04-25"
    row5["evidence"] = (
        "client/e2e/flow-01-visual.spec.ts (XIIGEN_VISUAL_TARGET="
        "tenant-b-northwind-installed-v1.0.1) + "
        "scripts/portability/flow-01-build-tenant-b-coverage.py (drift) + "
        "docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-b.json + "
        "docs/portability/flow-01/visual-evidence/FC-18-AUDIT-TRAIL-tenant-b.md"
    )
    row5["capturedWhen"] = "Phase C6 - 2026-04-25"

    # --- V-13 vGate ---
    for vg in s["vGateManifest"]:
        if vg.get("id") == "V-13":
            iv = vg.setdefault("instanceVerdicts", {})
            iv["C_tenantBInstalled"] = {
                "verdict": "PASS",
                "lastCheckedAt": "2026-04-25",
                "cascadeTarget": "tenant-b-northwind-installed-v1.0.1",
                "evidence": (
                    "docs/e2e-snapshots/user-registration/tenant-b-northwind-installed-"
                    "v1.0.1/ (252 PNGs) + "
                    "docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-b."
                    "json + "
                    "docs/portability/flow-01/visual-evidence/FC-18-AUDIT-TRAIL-tenant-"
                    "b.md. Drift = 0 px on all 252 pairs against platform-source baseline "
                    "AND against tenant-a-acme-v1.0.1 capture; per V-15-DRIFT-PASS-"
                    "CONTRACT.md this IS the V-15 PASS outcome for FLOW-01 (FREEDOM keys "
                    "are server-side-only). V-13 instance C verdicts mechanically derived "
                    "from instance A under the contract."
                ),
            }
            iv.setdefault(
                "D_tenantC",
                {"verdict": "NOT_YET_RUN", "lastCheckedAt": None},
            )
            vg["lastCheckedAt"] = "2026-04-25"
            # Top-level verdict still NOT_YET_RUN until all 4 instances PASS
            break

    # --- lastUpdated narrative ---
    s["lastUpdated"] = (
        "2026-04-25 (Phase C6 closure - V-13 instance C PASS). Cascade row 5 (tenant-b-"
        "installed) complete: 252 PNGs at tenant-b-northwind-installed-v1.0.1/ with drift "
        "= 0 px against BOTH platform-source AND tenant-a baselines, mechanically deriving "
        "V-13(C) verdict from V-13(A) under V-15-DRIFT-PASS-CONTRACT.md. Cascade lineage: "
        "northwind-guild installed acme-pro-members v1.0.1 unchanged \u2014 acme's 4 server-"
        "side FREEDOM overrides remain active and propagate to northwind context without "
        "any client-rendered drift. TENANT_SEED block in flow-01-visual.spec.ts reconciled "
        "from placeholder slugs (orca/bolt) to canonical cascade names (northwind-guild + "
        "tessera-collective for tenant-c). V-15 contract premise re-verified at this hop. "
        "Next: Phase C7 - V-15 instance B + V-14 instance B (tenant-b-adapted v1.0.2 + "
        "northwind--user-registration repo, cascade rows 6+7)."
    )

    # write
    with STATE_PATH.open("w", encoding="utf-8") as f:
        json.dump(s, f, indent=2, ensure_ascii=False)

    print("OK: STATE.json updated for Phase C6 closure")
    print("  Phase C6 status: COMPLETED")
    print("  Row 5 verdict: PASS")
    print("  V-13 instance C verdict: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
