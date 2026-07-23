#!/usr/bin/env python3
"""
Phase C4 closure — update FLOW-01-PORTABILITY-STATE.json.

Performs:
  - Phase C4 status: PENDING -> COMPLETED, sets commitHash placeholder, evidencePaths, lastCheckedAt
  - cascadeVisualEvidence rows[1] (row 2 tenant-a-adapted): verdict=PASS, currentState=COMPLETE
  - vGateManifest V-13.instanceVerdicts.B_tenantAAdapted: PASS
  - vGateManifest V-15: initialize instanceVerdicts dict + set A=PASS
  - lastUpdated: rewrite Phase C4 narrative
"""

import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
STATE_PATH = ROOT / "docs" / "portability" / "flow-01" / "FLOW-01-PORTABILITY-STATE.json"

EVIDENCE_PATHS_C4 = [
    "client/e2e/flow-01-visual.spec.ts (parameterized via XIIGEN_VISUAL_TARGET)",
    "docs/e2e-snapshots/user-registration/tenant-a-acme-v1.0.1/ (252 PNGs)",
    "docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md",
    "docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-a.json",
    "docs/portability/flow-01/visual-evidence/FC-18-AUDIT-TRAIL-tenant-a.md",
    "scripts/portability/flow-01-tenant-a-drift-compare.py",
    "scripts/portability/flow-01-build-tenant-a-coverage.py",
]


def main() -> int:
    if not STATE_PATH.is_file():
        print(f"FAIL: state file not found at {STATE_PATH}")
        return 1

    with STATE_PATH.open("r", encoding="utf-8") as f:
        s = json.load(f)

    # --- Phase C4 ---
    found_c4 = False
    for p in s["phases"]:
        if p.get("id") == "C4":
            found_c4 = True
            p["status"] = "COMPLETED"
            p["commitHash"] = "PENDING_BACKFILL"
            p["lastCheckedAt"] = "2026-04-25"
            p["evidencePaths"] = EVIDENCE_PATHS_C4
            # Mark row 3 as deferred to C5 explicitly via notes
            p["notes"] = (
                "Phase C4 closes cascade row 2 (tenant-a-adapted, V-13 instance B + V-15 instance A). "
                "Row 3 (tenant-a-marketplace, V-14 instance A) is deferred to Phase C5 along with "
                "acme--user-registration repo provisioning. The 252-PNG capture used the "
                "parameterized visual spec (XIIGEN_VISUAL_TARGET=tenant-a-acme-v1.0.1) and produced "
                "byte-identical results to the platform-source baseline (drift = 0 px on 252/252 "
                "pairs). Per V-15-DRIFT-PASS-CONTRACT.md this IS the V-15 PASS outcome for FLOW-01 "
                "(server-side-only FREEDOM keys never appear on client kiosks). Tenant separation "
                "is proven behaviourally via server/test/user-registration/phase-01-adaptation-"
                "freedom-config.spec.ts (Layer 1 PASS, 193 tests + 4 acme override verifications). "
                "SK-549 verdicts at instance B are mechanically derived from instance A under the "
                "contract; auditTrail at FC-18-AUDIT-TRAIL-tenant-a.md."
            )
            break
    if not found_c4:
        print("FAIL: Phase C4 entry not found in phases list")
        return 1

    # --- cascadeVisualEvidence row 2 (index 1) ---
    rows = s["cascadeVisualEvidence"]["rows"]
    row2 = rows[1]
    assert row2.get("rowNum") == 2 and row2.get("cascadePoint") == "tenant-a-adapted", (
        f"row 2 sanity check failed: {row2}"
    )
    row2["currentState"] = (
        "COMPLETE — 252 PNGs at tenant-a-acme-v1.0.1 (replaces 3 stale v1.1-protocol PNGs); "
        "V-13 instance B PASS via mechanical derivation under V-15-DRIFT-PASS-CONTRACT.md; "
        "V-15 instance A drift comparison = 0 px on 252/252 byte-identical pairs; "
        "behavioural separation via phase-01-adaptation-freedom-config.spec.ts (Layer 1)"
    )
    row2["verdict"] = "PASS"
    row2["lastCheckedAt"] = "2026-04-25"
    row2["evidence"] = (
        "docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-a.json + "
        "FC-18-AUDIT-TRAIL-tenant-a.md + V-15-DRIFT-PASS-CONTRACT.md"
    )
    row2["capturedWhen"] = "Phase C4 — 2026-04-25"

    # --- V-13 vGate ---
    for vg in s["vGateManifest"]:
        if vg.get("id") == "V-13":
            iv = vg.setdefault("instanceVerdicts", {})
            iv["B_tenantAAdapted"] = {
                "verdict": "PASS",
                "lastCheckedAt": "2026-04-25",
                "evidence": (
                    "docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-a.json + "
                    "FC-18-AUDIT-TRAIL-tenant-a.md; 252 PNGs at "
                    "docs/e2e-snapshots/user-registration/tenant-a-acme-v1.0.1/; "
                    "verdict mechanically derived from V-13 instance A under "
                    "V-15-DRIFT-PASS-CONTRACT.md (drift = 0 px on 252/252 pairs)"
                ),
            }
            vg["lastCheckedAt"] = "2026-04-25"
            # Top-level verdict still NOT_YET_RUN until all 4 instances PASS
            break

    # --- V-15 vGate ---
    for vg in s["vGateManifest"]:
        if vg.get("id") == "V-15":
            iv = vg.setdefault("instanceVerdicts", {})
            iv["A_driftPlatformToTenantA"] = {
                "verdict": "PASS",
                "lastCheckedAt": "2026-04-25",
                "evidence": (
                    "scripts/portability/flow-01-tenant-a-drift-compare.py result: "
                    "252/252 byte-identical pairs, 0 drift, 0 missing, 0 extras. "
                    "Per V-15-DRIFT-PASS-CONTRACT.md component 1 this is the expected and "
                    "PASS outcome for FLOW-01 (all 4 acme FREEDOM overrides are server-side-only). "
                    "Behavioural separation: server/test/user-registration/"
                    "phase-01-adaptation-freedom-config.spec.ts (Layer 1 PASS)."
                ),
            }
            iv.setdefault(
                "B_driftPlatformToTenantB",
                {"verdict": "NOT_YET_RUN", "lastCheckedAt": None},
            )
            iv.setdefault(
                "C_driftTenantBToTenantC",
                {"verdict": "NOT_YET_RUN", "lastCheckedAt": None},
            )
            vg["lastCheckedAt"] = "2026-04-25"
            break

    # --- lastUpdated narrative ---
    s["lastUpdated"] = (
        "2026-04-25 (Phase C4 closure — V-13 instance B + V-15 instance A PASS). "
        "Cascade row 2 (tenant-a-adapted) complete: 252 PNGs captured at "
        "docs/e2e-snapshots/user-registration/tenant-a-acme-v1.0.1/ via parameterized visual spec "
        "(client/e2e/flow-01-visual.spec.ts now serves all 4 cascade instances via "
        "XIIGEN_VISUAL_TARGET env var + tenant-identity localStorage seeding — FLOW-03 isolation "
        "pattern). Drift comparison vs platform-source baseline returned 252/252 byte-identical "
        "pairs — this is the expected and V-15 PASS outcome for FLOW-01 per the new "
        "V-15-DRIFT-PASS-CONTRACT.md (FLOW-01 FREEDOM keys are server-side-only and never appear "
        "on the 6 client kiosk pages; behavioural separation proven via Layer 1 server test "
        "phase-01-adaptation-freedom-config.spec.ts which exercises all 4 acme overrides). "
        "SK-549 instance B verdict mechanically derived from instance A under the contract: "
        "0 BLOCK, Axis B PASS for all 7 roles, he-RTL C4 PASS, four-axis review now 4/4 PASS "
        "(Tenant-Separation upgraded from n/a at instance A to PASS at instance B by drift + "
        "behavioural evidence). Next: Phase C5 — V-14 instance A (acme marketplace tile + "
        "acme--user-registration repo provisioning, cascade rows 3+4)."
    )

    # write
    with STATE_PATH.open("w", encoding="utf-8") as f:
        json.dump(s, f, indent=2, ensure_ascii=False)

    print(f"OK: STATE.json updated for Phase C4 closure")
    print(f"  Phase C4 status: COMPLETED")
    print(f"  Row 2 verdict: PASS")
    print(f"  V-13 instance B verdict: PASS")
    print(f"  V-15 instance A verdict: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
