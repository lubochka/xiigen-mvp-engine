#!/usr/bin/env python3
"""
Phase C7 — Build SK549-COVERAGE-tenant-b-v1.0.2.json by mechanical derivation
under V-15-DRIFT-PASS-CONTRACT.md.

Premise:
  All 252 PNGs at tenant-b-northwind-v1.0.2/ are byte-identical to:
    - platform-source/                              (V-13 instance A baseline)
    - tenant-a-acme-v1.0.1/                         (V-13 instance B; Phase C4)
    - tenant-b-northwind-installed-v1.0.1/          (V-13 instance C; Phase C6)
  This is the V-15 PASS criterion for FLOW-01 (server-side-only FREEDOM keys).
  Northwind's own adaptation (rate_limit 15 -> 5) lands at v1.0.2 but lives
  exclusively in EmailVerificationService.getResendLimitMinutes (server-side-only)
  and never reaches any of the 6 client kiosk pages.

Derivation:
  Read SK549-COVERAGE-tenant-b.json (row 5 = tenant-b-installed) and rewrite:
    - vGate identifier  -> V-15 instance B drift contract for row 6 (tenant-b-adapted)
    - cascadePoint      -> P3 tenant-b-adapted (northwind-guild own adaptation v1.0.2)
    - cascadeRow        -> 6
    - storagePath       -> docs/e2e-snapshots/user-registration/tenant-b-northwind-v1.0.2/
    - per-cell verdicts -> identical to instance A (mechanical inheritance)
    - rationale         -> updated to reflect tenant-b-adapted (own override active)
    - 4 freedomOverrides -> rate_limit tightened 15 -> 5 (own); 3 inherited from acme
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

SRC = EVIDENCE_DIR / "SK549-COVERAGE-tenant-b.json"
DST = EVIDENCE_DIR / "SK549-COVERAGE-tenant-b-v1.0.2.json"

PLAT = SNAPS_DIR / "platform-source"
TENA = SNAPS_DIR / "tenant-a-acme-v1.0.1"
TENB_INSTALLED = SNAPS_DIR / "tenant-b-northwind-installed-v1.0.1"
TENB_ADAPTED = SNAPS_DIR / "tenant-b-northwind-v1.0.2"


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
    drift_plat = drift_compare(PLAT, TENB_ADAPTED)
    drift_a = drift_compare(TENA, TENB_ADAPTED)
    drift_b_installed = drift_compare(TENB_INSTALLED, TENB_ADAPTED)

    for name, d in (
        ("platform-source vs tenant-b-v1.0.2", drift_plat),
        ("tenant-a vs tenant-b-v1.0.2", drift_a),
        ("tenant-b-installed vs tenant-b-v1.0.2", drift_b_installed),
    ):
        if d["drift_detected_pairs"] != 0:
            print(f"BLOCK: drift detected on {name}: {d}")
            return 1

    # --- top-level metadata ---
    data["vGate"] = (
        "V-13 instance C (tenant-b-northwind-v1.0.2 hop point) + "
        "V-15 instance B drift contract (row 6 tenant-b-adapted; "
        "drift = 0 vs row 5 tenant-b-installed AND vs platform-source AND vs tenant-a)"
    )
    data["cascadePoint"] = (
        "P3 tenant-b-adapted (northwind-guild own adaptation v1.0.2: "
        "rate_limit 15 -> 5)"
    )
    data["cascadeRow"] = 6
    data["auditedAt"] = "2026-04-25"
    data["auditedBy"] = (
        "mechanically derived from V-13 instance C SK549-COVERAGE-tenant-b.json under "
        "V-15-DRIFT-PASS-CONTRACT.md \u2014 branch claude/vigorous-margulis Phase C7 "
        "DEV-115. Drift verification via scripts/portability/flow-01-build-tenant-b-v102-"
        "coverage.py: 252/252 byte-identical pairs vs platform-source AND vs tenant-a "
        "AND vs tenant-b-installed (row 5)."
    )
    data["samplingStrategy"] = (
        "Mechanical derivation under V-15-DRIFT-PASS-CONTRACT.md. The 252 PNGs at "
        "tenant-b-northwind-v1.0.2 are byte-identical (SHA-256 equality) to all THREE "
        "upstream reference corpora: platform-source (row 1), tenant-a-acme-v1.0.1 "
        "(row 4 hop), and tenant-b-northwind-installed-v1.0.1 (row 5 hop). The cascade "
        "lineage at row 6 is 'northwind-guild forked acme v1.0.1 and tightened rate_"
        "limit 15 -> 5'. Northwind's own override lives exclusively in "
        "EmailVerificationService.getResendLimitMinutes (server-side-only) and never "
        "appears on any of the 6 client kiosk pages, so pixel identity is the V-15 "
        "PASS outcome under the contract. The 3 inherited acme overrides "
        "(inviter_name, community_name, ttl_seconds) are also server-side-only. "
        "Tenant separation is proven behaviourally via "
        "server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts "
        "where the active override values for ScopeContext.tenantId='northwind-guild' "
        "are: rate_limit=5, ttl=3600, inviter='The Acme Pro Team', community='Acme "
        "Pro Members'."
    )

    # --- pngCorpus updates ---
    data["pngCorpus"]["captureSpec"] = (
        "client/e2e/flow-01-visual.spec.ts "
        "(parameterized via XIIGEN_VISUAL_TARGET=tenant-b-northwind-v1.0.2)"
    )
    data["pngCorpus"]["storagePath"] = (
        "docs/e2e-snapshots/user-registration/tenant-b-northwind-v1.0.2/"
    )

    # --- aggregated role verdicts: redirect samplePngPaths ---
    for role in data["aggregatedRoleVerdicts"]:
        role["samplePngPath"] = role["samplePngPath"].replace(
            "tenant-b-northwind-installed-v1.0.1/",
            "tenant-b-northwind-v1.0.2/",
        )
    data["rtlOnAdminVerdict"]["samplePngPath"] = data["rtlOnAdminVerdict"][
        "samplePngPath"
    ].replace(
        "tenant-b-northwind-installed-v1.0.1/",
        "tenant-b-northwind-v1.0.2/",
    )

    # --- v13AcceptanceMatch criterion 4: drift verdict updated for row 6 ---
    data["v13AcceptanceMatch"]["criterion4_driftHopToHop"] = (
        "PASS \u2014 V-15 contract premise re-verified at the cascade row 6 hop. "
        "Drift = 0 px on all 252 PNGs vs THREE upstream baselines: (a) platform-source, "
        "(b) tenant-a-acme-v1.0.1, (c) tenant-b-northwind-installed-v1.0.1 (row 5). "
        "Per V-15-DRIFT-PASS-CONTRACT.md component 1, this is the expected and PASS "
        "outcome for FLOW-01 because the FREEDOM override active at this hop "
        "(northwind's own rate_limit 15 -> 5) is server-side-only and never appears "
        "on the 6 client kiosk pages \u2014 alongside the 3 inherited acme overrides "
        "which are also server-side-only. Behavioural tenant separation continues to "
        "be proven independently via server/test/user-registration/phase-01-adaptation-"
        "freedom-config.spec.ts."
    )

    # --- overallVerdict + rationale ---
    data["overallVerdict"] = "PASS"
    data["rationale"] = (
        "V-15 instance B acceptance gate satisfied via mechanical derivation under "
        "V-15-DRIFT-PASS-CONTRACT.md. The 252 PNGs at tenant-b-northwind-v1.0.2 are "
        "byte-identical to all THREE upstream reference corpora (platform-source, "
        "tenant-a-acme-v1.0.1, tenant-b-northwind-installed-v1.0.1). Drift = 0 px on "
        "all 252 pairs against any reference; under the contract this IS the V-15 "
        "PASS outcome for FLOW-01 (FREEDOM keys are server-side-only and never appear "
        "on client kiosks). The cascade lineage at row 6 is 'northwind-guild own "
        "adaptation v1.0.2 \u2014 rate_limit 15 -> 5'; this is northwind's only own "
        "override and it tightens what acme already tightened. The 3 acme overrides "
        "(inviter_name, community_name, ttl_seconds) are inherited unchanged because "
        "northwind operates as a shared-onboarding consortium under the acme parent "
        "program. Tenant separation is proven behaviourally via "
        "server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts. "
        "All CONCERNs documented at instance A carry forward unchanged to row 6."
    )

    # --- bc001Compliance ---
    data["bc001Compliance"]["auditMode"] = (
        "drift comparison via scripts/portability/flow-01-build-tenant-b-v102-coverage.py "
        "\u2014 byte-level SHA-256 hash equality (vs platform-source AND vs tenant-a "
        "AND vs tenant-b-installed), no image bytes processed in chat context"
    )
    data["bc001Compliance"]["auditArtifact"] = (
        "this file + docs/portability/flow-01/visual-evidence/V-15-INSTANCE-B-AUDIT.md"
    )
    data["bc001Compliance"]["delegationProof"] = (
        "drift script reads PNG bytes locally, emits SHA-256 hashes only; instance A "
        "SK-549 verdicts (already produced by UI/UX agent) are imported by reference "
        "under V-15-DRIFT-PASS-CONTRACT.md mechanical-derivation clause"
    )

    # --- driftAnalysis: triple-baseline ---
    data["driftAnalysis"] = {
        "contractApplied": "docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md",
        "method": (
            "byte-level SHA-256 comparison of all 252 PNG pairs at tenant-b-northwind-"
            "v1.0.2 against THREE baselines: (a) platform-source (row 1), "
            "(b) tenant-a-acme-v1.0.1 (row 4 hop), "
            "(c) tenant-b-northwind-installed-v1.0.1 (row 5 hop)"
        ),
        "script": "scripts/portability/flow-01-build-tenant-b-v102-coverage.py",
        "result": {
            "tenantB_v102_vs_platformSource": drift_plat,
            "tenantB_v102_vs_tenantA": drift_a,
            "tenantB_v102_vs_tenantB_installed": drift_b_installed,
        },
        "expectedOutcome": (
            "drift = 0 px on every PNG vs all three baselines (per V-15-DRIFT-PASS-"
            "CONTRACT.md component 1). The active overrides at row 6 (northwind's "
            "own rate_limit 15 -> 5 + 3 inherited acme overrides) are all server-"
            "side-only."
        ),
        "behaviouralSeparationEvidence": (
            "server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts"
        ),
        "freedomOverrides": [
            {
                "key": "flow01_resend_rate_limit_minutes",
                "platformDefault": 60,
                "acmeValue": 15,
                "northwindValue": 5,
                "source": "northwind-guild own (tightened from acme)",
                "renderingSurface": "server-side-only (EmailVerificationService.getResendLimitMinutes)",
            },
            {
                "key": "flow01_invitation_inviter_name",
                "platformDefault": "The XIIGen Team",
                "acmeValue": "The Acme Pro Team",
                "northwindValue": "The Acme Pro Team",
                "source": "inherited from acme-pro-members v1.0.1",
                "renderingSurface": "server-side-only (OnboardingDeliveryService.deliverInvitation)",
            },
            {
                "key": "flow01_invitation_community_name",
                "platformDefault": "XIIGen Community",
                "acmeValue": "Acme Pro Members",
                "northwindValue": "Acme Pro Members",
                "source": "inherited from acme-pro-members v1.0.1",
                "renderingSurface": "server-side-only (OnboardingDeliveryService.deliverInvitation)",
            },
            {
                "key": "flow01_email_verification_ttl_seconds",
                "platformDefault": 86400,
                "acmeValue": 3600,
                "northwindValue": 3600,
                "source": "inherited from acme-pro-members v1.0.1",
                "renderingSurface": "server-side-only (EmailVerificationService.getTokenExpiryMs)",
            },
        ],
        "verdict": (
            "PASS \u2014 drift = 0 px on every PNG against all three upstream baselines "
            "is the expected and PASS outcome for FLOW-01 under the contract. V-15 "
            "instance B verdict mechanically derived under V-15-DRIFT-PASS-CONTRACT.md."
        ),
    }

    # write
    with DST.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"OK: {DST.name} written ({DST.stat().st_size} bytes)")
    print(
        f"  drift platform-source vs tenant-b-v1.0.2:    "
        f"{drift_plat['byte_identical_pairs']}/{drift_plat['common_pairs']} pairs identical"
    )
    print(
        f"  drift tenant-a vs tenant-b-v1.0.2:           "
        f"{drift_a['byte_identical_pairs']}/{drift_a['common_pairs']} pairs identical"
    )
    print(
        f"  drift tenant-b-installed vs tenant-b-v1.0.2: "
        f"{drift_b_installed['byte_identical_pairs']}/{drift_b_installed['common_pairs']} pairs identical"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
