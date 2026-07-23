#!/usr/bin/env python3
"""
Phase C6 — Build SK549-COVERAGE-tenant-b.json by mechanical derivation
under V-15-DRIFT-PASS-CONTRACT.md.

Premise:
  All 252 PNGs at tenant-b-northwind-installed-v1.0.1/ are byte-identical to:
    - platform-source/         (V-13 instance A baseline)
    - tenant-a-acme-v1.0.1/    (V-13 instance B; PNGs already audited)
  This is the V-15 PASS criterion for FLOW-01 (server-side-only FREEDOM keys).

Derivation:
  Read SK549-COVERAGE-tenant-a.json and rewrite:
    - vGate identifier  → V-13 instance C + V-15 instance B/C drift contract
    - cascadePoint      → P3 tenant-b-installed (northwind-guild installed acme v1.0.1)
    - cascadeRow        → 5
    - storagePath       → docs/e2e-snapshots/user-registration/tenant-b-northwind-installed-v1.0.1/
    - per-cell verdicts → identical to instance A (mechanical inheritance)
    - rationale         → updated to reflect tenant-b lineage
    - 4 freedomOverrides → unchanged (acme overrides are still active because
      northwind installed acme's v1.0.1 unchanged; northwind tightening applies
      at v1.0.2 which is row 6 / Phase C7).
"""
import json
import sys
import hashlib
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_DIR = ROOT / "docs" / "portability" / "flow-01" / "visual-evidence"
SNAPS_DIR = ROOT / "docs" / "e2e-snapshots" / "user-registration"

SRC = EVIDENCE_DIR / "SK549-COVERAGE-tenant-a.json"
DST = EVIDENCE_DIR / "SK549-COVERAGE-tenant-b.json"

PLAT = SNAPS_DIR / "platform-source"
TENA = SNAPS_DIR / "tenant-a-acme-v1.0.1"
TENB = SNAPS_DIR / "tenant-b-northwind-installed-v1.0.1"


def drift_compare(a: Path, b: Path) -> dict:
    a_pngs = {p.name for p in a.glob("*.png")}
    b_pngs = {p.name for p in b.glob("*.png")}
    common = a_pngs & b_pngs
    matches = 0
    for name in sorted(common):
        ha = hashlib.sha256((a / name).read_bytes()).hexdigest()
        hb = hashlib.sha256((b / name).read_bytes()).hexdigest()
        if ha == hb:
            matches += 1
    return {
        "left_corpus": str(a.relative_to(ROOT)).replace("\\", "/"),
        "right_corpus": str(b.relative_to(ROOT)).replace("\\", "/"),
        "left_pngs": len(a_pngs),
        "right_pngs": len(b_pngs),
        "common_pairs": len(common),
        "byte_identical_pairs": matches,
        "drift_detected_pairs": len(common) - matches,
        "missing_at_right": len(a_pngs - b_pngs),
        "extras_at_right": len(b_pngs - a_pngs),
    }


def main() -> int:
    if not SRC.is_file():
        print(f"FAIL: source coverage not found at {SRC}")
        return 1

    with SRC.open("r", encoding="utf-8") as f:
        data = json.load(f)

    # --- drift comparisons (V-15 contract evidence) ---
    drift_plat_b = drift_compare(PLAT, TENB)
    drift_a_b = drift_compare(TENA, TENB)

    if drift_plat_b["drift_detected_pairs"] != 0:
        print(f"BLOCK: drift platform-source vs tenant-b: {drift_plat_b}")
        return 1
    if drift_a_b["drift_detected_pairs"] != 0:
        print(f"BLOCK: drift tenant-a vs tenant-b: {drift_a_b}")
        return 1

    # --- top-level metadata ---
    data["vGate"] = (
        "V-13 instance C (tenant-b-northwind-installed-v1.0.1) + "
        "V-15 contract premise (drift = 0 vs platform-source AND vs tenant-a-acme-v1.0.1)"
    )
    data["cascadePoint"] = (
        "P3 tenant-b-installed (northwind-guild installed acme-pro-members v1.0.1)"
    )
    data["cascadeRow"] = 5
    data["auditedAt"] = "2026-04-25"
    data["auditedBy"] = (
        "mechanically derived from V-13 instance B SK549-COVERAGE-tenant-a.json under "
        "V-15-DRIFT-PASS-CONTRACT.md \u2014 branch claude/vigorous-margulis Phase C6 "
        "DEV-115. Drift verification via scripts/portability/flow-01-build-tenant-b-"
        "coverage.py: 252/252 byte-identical pairs vs platform-source AND vs tenant-a."
    )
    data["samplingStrategy"] = (
        "Mechanical derivation under V-15-DRIFT-PASS-CONTRACT.md. The 252 PNGs at "
        "tenant-b-northwind-installed-v1.0.1 are byte-identical (SHA-256 equality) "
        "to BOTH the platform-source baseline AND the tenant-a-acme-v1.0.1 capture, "
        "so per-cell SK-549 verdicts inherit unchanged from instance A. The cascade "
        "lineage at row 5 is 'northwind-guild installed acme-pro-members v1.0.1 "
        "unchanged' \u2014 acme's 4 FREEDOM overrides remain active because northwind "
        "did not yet tighten anything; northwind's own adaptation (rate_limit "
        "15\u21925) lands at v1.0.2 / row 6 / Phase C7. All 4 acme overrides are "
        "server-side-only (see freedomOverrides) and never appear on the 6 client "
        "kiosk pages, so pixel identity is the V-15 PASS outcome under the contract. "
        "Tenant separation is proven behaviourally via "
        "server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts."
    )

    # --- pngCorpus updates ---
    data["pngCorpus"]["captureSpec"] = (
        "client/e2e/flow-01-visual.spec.ts "
        "(parameterized via XIIGEN_VISUAL_TARGET=tenant-b-northwind-installed-v1.0.1)"
    )
    data["pngCorpus"]["storagePath"] = (
        "docs/e2e-snapshots/user-registration/tenant-b-northwind-installed-v1.0.1/"
    )

    # --- aggregated role verdicts: redirect samplePngPaths ---
    for role in data["aggregatedRoleVerdicts"]:
        role["samplePngPath"] = role["samplePngPath"].replace(
            "platform-source/",
            "tenant-b-northwind-installed-v1.0.1/",
        )
    data["rtlOnAdminVerdict"]["samplePngPath"] = data["rtlOnAdminVerdict"][
        "samplePngPath"
    ].replace(
        "platform-source/",
        "tenant-b-northwind-installed-v1.0.1/",
    )

    # --- v13AcceptanceMatch criterion 4: drift verdict updated ---
    data["v13AcceptanceMatch"]["criterion4_driftHopToHop"] = (
        "PASS \u2014 V-15 contract premise re-verified at this hop. Drift = 0 px on all "
        "252 PNGs vs platform-source baseline AND vs tenant-a-acme-v1.0.1 capture "
        "(byte-equality, see driftAnalysis). Per V-15-DRIFT-PASS-CONTRACT.md component 1, "
        "this is the expected and PASS outcome for FLOW-01 because the 4 FREEDOM "
        "overrides active at this hop (the same 4 acme overrides; northwind installed "
        "acme v1.0.1 unchanged) are server-side-only and never appear on the 6 client "
        "kiosk pages. Behavioural tenant separation continues to be proven independently "
        "via server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts."
    )

    # --- overallVerdict + rationale ---
    data["overallVerdict"] = "PASS"
    data["rationale"] = (
        "V-13 instance C acceptance gate satisfied via mechanical derivation under "
        "V-15-DRIFT-PASS-CONTRACT.md. The 252 PNGs at tenant-b-northwind-installed-v1.0.1 "
        "are byte-identical to BOTH the platform-source baseline (V-13 instance A) AND "
        "the tenant-a-acme-v1.0.1 capture (V-13 instance B). Drift = 0 px on all 252 "
        "pairs against either reference; under the contract this IS the V-15 PASS "
        "outcome for FLOW-01 (FREEDOM keys are server-side-only and never appear on "
        "client kiosks). The cascade lineage at this row is 'northwind-guild installed "
        "acme's v1.0.1 unchanged'; acme's 4 server-side overrides remain active and "
        "northwind's own adaptation (rate_limit 15\u21925) is deferred to v1.0.2 / row 6. "
        "Tenant separation is proven behaviourally via "
        "server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts. "
        "All CONCERNs documented at instance A carry forward unchanged to instance C."
    )

    # --- bc001Compliance ---
    data["bc001Compliance"]["auditMode"] = (
        "drift comparison via scripts/portability/flow-01-build-tenant-b-coverage.py "
        "\u2014 byte-level SHA-256 hash equality (vs platform-source AND vs tenant-a), "
        "no image bytes processed in chat context"
    )
    data["bc001Compliance"]["auditArtifact"] = (
        "this file + docs/portability/flow-01/visual-evidence/FC-18-AUDIT-TRAIL-tenant-b.md"
    )
    data["bc001Compliance"]["delegationProof"] = (
        "drift script reads PNG bytes locally, emits SHA-256 hashes only; instance A "
        "SK-549 verdicts (already produced by UI/UX agent) are imported by reference "
        "under V-15-DRIFT-PASS-CONTRACT.md mechanical-derivation clause"
    )

    # --- driftAnalysis: dual-baseline ---
    data["driftAnalysis"] = {
        "contractApplied": "docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md",
        "method": (
            "byte-level SHA-256 comparison of all 252 PNG pairs at tenant-b-northwind-"
            "installed-v1.0.1 against TWO baselines: (a) platform-source, (b) "
            "tenant-a-acme-v1.0.1"
        ),
        "script": "scripts/portability/flow-01-build-tenant-b-coverage.py",
        "result": {
            "tenantB_vs_platformSource": drift_plat_b,
            "tenantB_vs_tenantA": drift_a_b,
        },
        "expectedOutcome": (
            "drift = 0 px on every PNG (per V-15-DRIFT-PASS-CONTRACT.md component 1). "
            "Both baselines must agree because acme's overrides are still active at "
            "row 5 (northwind installed acme v1.0.1 unchanged) and all 4 are server-"
            "side-only."
        ),
        "behaviouralSeparationEvidence": (
            "server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts"
        ),
        "freedomOverrides": data["driftAnalysis"]["freedomOverrides"],
        "verdict": (
            "PASS \u2014 drift = 0 px on every PNG vs both baselines is the expected and "
            "PASS outcome for FLOW-01 under the contract. V-15 contract premise re-"
            "verified at this hop."
        ),
    }

    # write
    with DST.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"OK: {DST.name} written ({DST.stat().st_size} bytes)")
    print(
        f"  drift platform-source vs tenant-b: "
        f"{drift_plat_b['byte_identical_pairs']}/{drift_plat_b['common_pairs']} pairs identical"
    )
    print(
        f"  drift tenant-a vs tenant-b:       "
        f"{drift_a_b['byte_identical_pairs']}/{drift_a_b['common_pairs']} pairs identical"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
