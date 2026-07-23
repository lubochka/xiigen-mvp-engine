#!/usr/bin/env python3
"""
Phase C7 closure - update FLOW-01-PORTABILITY-STATE.json.

Performs:
  - Phase C7 status: PENDING -> COMPLETED, sets commitHash placeholder, evidencePaths, lastCheckedAt
  - cascadeVisualEvidence rows[5] (row 6 tenant-b-adapted): verdict=PASS, currentState=COMPLETE
  - cascadeVisualEvidence rows[6] (row 7 tenant-b-repo): verdict=PASS, currentState=COMPLETE
  - vGateManifest V-14: instanceVerdicts.B_northwind = PASS
  - vGateManifest V-15: instanceVerdicts.B_driftPlatformToTenantB = PASS
  - lastUpdated: rewrite Phase C7 narrative
"""

import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
STATE_PATH = ROOT / "docs" / "portability" / "flow-01" / "FLOW-01-PORTABILITY-STATE.json"

EVIDENCE_PATHS_C7 = [
    "docs/e2e-snapshots/user-registration/tenant-b-northwind-v1.0.2/ (252 PNGs, V-15 instance B drift evidence)",
    "client/e2e/flow-01-v14-evidence-tenant-b.spec.ts (4 PNGs: 2 marketplace + 2 repo)",
    "docs/portability/flow-01/repo-evidence/northwind--user-registration/ (7 files, ~49 KB)",
    "docs/e2e-snapshots/user-registration/tenant-b-marketplace/01-marketplace-tile-northwind-1280px.png",
    "docs/e2e-snapshots/user-registration/tenant-b-marketplace/02-install-dialog-northwind-1280px.png",
    "docs/e2e-snapshots/user-registration/tenant-b-repo/01-repo-overview-1280px.png",
    "docs/e2e-snapshots/user-registration/tenant-b-repo/02-repo-tree-1280px.png",
    "docs/portability/flow-01/visual-evidence/V-14-INSTANCE-B-AUDIT.md",
    "docs/portability/flow-01/visual-evidence/V-15-INSTANCE-B-AUDIT.md",
    "docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-b-v1.0.2.json",
    "scripts/portability/flow-01-build-tenant-b-v102-coverage.py",
    "docs/portability/flow-01/tenant-profile-northwind-guild.json",
]


def main() -> int:
    if not STATE_PATH.is_file():
        print(f"FAIL: state file not found at {STATE_PATH}")
        return 1

    with STATE_PATH.open("r", encoding="utf-8") as f:
        s = json.load(f)

    # --- Phase C7 ---
    found_c7 = False
    for p in s["phases"]:
        if p.get("id") == "C7":
            found_c7 = True
            p["status"] = "COMPLETED"
            p["commitHash"] = "PENDING_BACKFILL"
            p["lastCheckedAt"] = "2026-04-25"
            p["evidencePaths"] = EVIDENCE_PATHS_C7
            p["notes"] = (
                "Phase C7 closes cascade rows 6 (tenant-b-adapted v1.0.2) and 7 (tenant-b-repo "
                "northwind--user-registration) via V-14 instance B + V-15 instance B. Repo slug: "
                "northwind--user-registration (double-dash separator per v2.0 line 744). 7-file "
                "synthetic cascade-fork repo scaffold at docs/portability/flow-01/repo-evidence/"
                "northwind--user-registration/ (3 verbatim service files from acme v1.0.1 + tenant "
                "package.json/config.json with cascade lineage table + README/.gitignore). "
                "4 V-14 PNGs captured: marketplace tile (real UI from SharableFlowsMarketplacePage "
                "sfm-consumer-card-5), install dialog (synthetic cascade-aware FREEDOM-diff modal "
                "with 5-column table distinguishing own vs inherited), repo overview + tree "
                "(synthetic GitHub-style HTML with fork-banner + lineage table). 252 V-15 PNGs at "
                "tenant-b-northwind-v1.0.2 verified byte-identical to THREE upstream baselines: "
                "platform-source, tenant-a-acme-v1.0.1, AND tenant-b-northwind-installed-v1.0.1 "
                "(row 5). Per V-15-DRIFT-PASS-CONTRACT.md component 1 this is the V-15 PASS "
                "outcome for FLOW-01 (FREEDOM keys server-side-only). V-14(B) instance verdict "
                "and V-15(B) instance verdict both PASS. Synthetic-evidence transparency clause "
                "invoked at V-14-INSTANCE-B-AUDIT.md \u00a73 - external GitHub provisioning is TIER-B "
                "promotion territory. Top-level V-14 verdict remains NOT_YET_RUN until C "
                "(tenant-c, Phase C8) also PASS. Top-level V-15 verdict remains NOT_YET_RUN "
                "until C (tenant-c drift, Phase C8) also PASS."
            )
            break
    if not found_c7:
        print("FAIL: Phase C7 entry not found in phases list")
        return 1

    # --- cascadeVisualEvidence row 6 (index 5) ---
    rows = s["cascadeVisualEvidence"]["rows"]
    row6 = rows[5]
    assert row6.get("rowNum") == 6 and row6.get("cascadePoint") == "tenant-b-adapted", (
        f"row 6 sanity check failed: {row6}"
    )
    row6["currentState"] = (
        "COMPLETE - 252 PNGs at docs/e2e-snapshots/user-registration/tenant-b-northwind-v1.0.2/; "
        "drift = 0 px on 252/252 byte-identical pairs vs THREE upstream baselines "
        "(platform-source, tenant-a-acme-v1.0.1, tenant-b-northwind-installed-v1.0.1); "
        "V-15 instance B drift verdict PASS via mechanical derivation under "
        "V-15-DRIFT-PASS-CONTRACT.md (FREEDOM keys server-side-only)"
    )
    row6["verdict"] = "PASS"
    row6["lastCheckedAt"] = "2026-04-25"
    row6["repoSlug"] = "northwind--user-registration"
    row6["evidence"] = (
        "client/e2e/flow-01-visual.spec.ts (XIIGEN_VISUAL_TARGET=tenant-b-northwind-v1.0.2) + "
        "scripts/portability/flow-01-build-tenant-b-v102-coverage.py (drift) + "
        "docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-b-v1.0.2.json + "
        "docs/portability/flow-01/visual-evidence/V-15-INSTANCE-B-AUDIT.md"
    )
    row6["capturedWhen"] = "Phase C7 - 2026-04-25"

    # --- cascadeVisualEvidence row 7 (index 6) ---
    row7 = rows[6]
    assert row7.get("rowNum") == 7 and row7.get("cascadePoint") == "tenant-b-repo", (
        f"row 7 sanity check failed: {row7}"
    )
    row7["currentState"] = (
        "COMPLETE - 2 PNGs at docs/e2e-snapshots/user-registration/tenant-b-repo/ "
        "(01-repo-overview-1280px.png + 02-repo-tree-1280px.png, synthetic GitHub-style "
        "renders of northwind--user-registration cascade-fork scaffold); 7-file local "
        "scaffold at docs/portability/flow-01/repo-evidence/northwind--user-registration/; "
        "repo slug compliant with v2.0 line 744 double-dash convention; 2 marketplace "
        "PNGs at tenant-b-marketplace/ (real UI tile + synthetic cascade-aware install "
        "dialog); V-14 instance B PASS (synthetic-evidence transparency invoked)"
    )
    row7["verdict"] = "PASS"
    row7["lastCheckedAt"] = "2026-04-25"
    row7["evidence"] = (
        "docs/portability/flow-01/repo-evidence/northwind--user-registration/ + "
        "client/e2e/flow-01-v14-evidence-tenant-b.spec.ts + "
        "docs/portability/flow-01/visual-evidence/V-14-INSTANCE-B-AUDIT.md"
    )
    row7["capturedWhen"] = "Phase C7 - 2026-04-25"
    row7["repoScaffoldPath"] = "docs/portability/flow-01/repo-evidence/northwind--user-registration/"

    # --- V-14 vGate: instance B verdict PASS ---
    for vg in s["vGateManifest"]:
        if vg.get("id") == "V-14":
            iv = vg.setdefault("instanceVerdicts", {})
            iv["B_northwind"] = {
                "verdict": "PASS",
                "lastCheckedAt": "2026-04-25",
                "repoSlug": "northwind--user-registration",
                "evidence": (
                    "docs/portability/flow-01/repo-evidence/northwind--user-registration/ + "
                    "docs/e2e-snapshots/user-registration/tenant-b-marketplace/ (2 PNGs) + "
                    "docs/e2e-snapshots/user-registration/tenant-b-repo/ (2 PNGs) + "
                    "client/e2e/flow-01-v14-evidence-tenant-b.spec.ts (capture spec) + "
                    "docs/portability/flow-01/visual-evidence/V-14-INSTANCE-B-AUDIT.md (audit). "
                    "Cascade-fork audit per V-14-INSTANCE-B-AUDIT.md \u00a77 proves cascade lineage "
                    "and own-vs-inherited distinctions are discoverable from manifests alone. "
                    "Synthetic-evidence transparency clause invoked at audit \u00a73; external "
                    "GitHub provisioning deferred to TIER-B promotion."
                ),
            }
            vg["lastCheckedAt"] = "2026-04-25"
            # Top-level verdict still NOT_YET_RUN until all 3 instances PASS
            break

    # --- V-15 vGate: instance B verdict PASS ---
    for vg in s["vGateManifest"]:
        if vg.get("id") == "V-15":
            iv = vg.setdefault("instanceVerdicts", {})
            iv["B_driftPlatformToTenantB"] = {
                "verdict": "PASS",
                "lastCheckedAt": "2026-04-25",
                "evidence": (
                    "scripts/portability/flow-01-build-tenant-b-v102-coverage.py result: "
                    "252/252 byte-identical pairs against THREE upstream baselines "
                    "(platform-source, tenant-a-acme-v1.0.1, tenant-b-northwind-installed-"
                    "v1.0.1). 0 drift, 0 missing, 0 extras on each comparison. Per "
                    "V-15-DRIFT-PASS-CONTRACT.md component 1 this is the expected and PASS "
                    "outcome for FLOW-01 \u2014 the active overrides at row 6 (1 own: rate_limit "
                    "15\u21925; 3 inherited from acme: inviter_name, community_name, ttl_seconds) "
                    "are all server-side-only and never reach the 6 client kiosk pages. "
                    "Behavioural separation: server/test/user-registration/phase-01-adaptation-"
                    "freedom-config.spec.ts (Layer 1 PASS). Coverage record: "
                    "docs/portability/flow-01/visual-evidence/SK549-COVERAGE-tenant-b-v1.0.2.json. "
                    "Audit: docs/portability/flow-01/visual-evidence/V-15-INSTANCE-B-AUDIT.md."
                ),
            }
            vg["lastCheckedAt"] = "2026-04-25"
            break

    # --- lastUpdated narrative ---
    s["lastUpdated"] = (
        "2026-04-25 (Phase C7 closure - V-14 instance B + V-15 instance B PASS). Cascade rows "
        "6 + 7 complete: 252 PNGs at tenant-b-northwind-v1.0.2 with drift = 0 px on 252/252 "
        "byte-identical pairs against THREE upstream baselines (platform-source, tenant-a-"
        "acme-v1.0.1, tenant-b-northwind-installed-v1.0.1) \u2014 V-15(B) verdict PASS via "
        "mechanical derivation under V-15-DRIFT-PASS-CONTRACT.md component 1. "
        "northwind--user-registration cascade-fork repo scaffold (7 files, ~49 KB) at "
        "docs/portability/flow-01/repo-evidence/ with cascade lineage table in package.json + "
        "README; 4 V-14 PNGs captured via client/e2e/flow-01-v14-evidence-tenant-b.spec.ts "
        "(1 real marketplace tile from sfm-consumer-card-5 + 3 synthetic HTML renders for "
        "cascade-aware install dialog, repo overview, repo tree). Repo naming compliant with "
        "v2.0 line 744 double-dash convention. V-14 instance B verdict PASS with "
        "synthetic-evidence transparency clause invoked. Cascade lineage now demonstrably "
        "preserves pixel identity across all 3 hops (v1.0.0 \u2192 v1.0.1 \u2192 v1.0.2). "
        "Phase C5 + C6 + C7 close out the tenant-a + tenant-b-installed + tenant-b-adapted "
        "portions of cascade (rows 4, 5, 6, 7). Next: Phase C8 - V-13 instance D + V-14 "
        "instance C + V-15 instance C (tenant-c tessera-collective install + repo + drift, "
        "cascade rows 8 + 9)."
    )

    # write
    with STATE_PATH.open("w", encoding="utf-8") as f:
        json.dump(s, f, indent=2, ensure_ascii=False)

    print("OK: STATE.json updated for Phase C7 closure")
    print("  Phase C7 status: COMPLETED")
    print("  Row 6 verdict: PASS")
    print("  Row 7 verdict: PASS")
    print("  V-14 instance B verdict: PASS")
    print("  V-15 instance B verdict: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
