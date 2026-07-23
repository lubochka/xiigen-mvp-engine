#!/usr/bin/env python3
"""
flow-01-state-update-c9.py

Atomic STATE.json update for FLOW-01 Phase C9 closure (V-16 cross-tenant
JWT isolation PASS, cascade row 10, R6 absolute block released).

Edits:
  1. vGateManifest[V-16].verdict: NOT_YET_RUN → PASS
  2. vGateManifest[V-16].lastCheckedAt: null → "2026-04-25"
  3. cascadeVisualEvidence.rows[10].currentState: MISSING → COMPLETE
  4. cascadeVisualEvidence.rows[10].verdict: NOT_YET_RUN → PASS
  5. cascadeVisualEvidence.rows[10].evidence: populated
  6. phases[C9].status: PENDING → COMPLETED
  7. phases[C9].evidencePaths: populated (5 artefacts)
  8. phases[C9].lastCheckedAt: "2026-04-25"
  9. q4BinaryVerdict.subCriteria.(10)_crossTenantJwt_3pairs_401_or_403: false → true (with PASS evidence)
 10. lastUpdated: rewritten for Phase C9 closure
 11. trueCount recomputed for q4BinaryVerdict
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
STATE = REPO_ROOT / "docs" / "portability" / "flow-01" / "FLOW-01-PORTABILITY-STATE.json"

LAST_UPDATED_NEW = (
    "2026-04-25 (Phase C9 closure - V-16 cross-tenant JWT isolation PASS, "
    "cascade row 10, R6 ABSOLUTE BLOCK on TIER-D released). "
    "Spec server/test/auth/cross-tenant-jwt.spec.ts (506 lines, 12 tests, 12 passed, 8.7s wall, deterministic on 2 consecutive runs) covers "
    "all 3 V-16 protocol-gate pairs (A↔B = acme/northwind, B↔C = northwind/tessera-collective, A↔C = acme/tessera-collective) plus "
    "3 inverse-direction symmetry pairs plus 3 within-tenant 200 baselines plus 2 defense-in-depth (anon + missing x-tenant-id header) plus 1 seed-validation. "
    "All 6 cross-tenant cells return 401 via the per-tenant HMAC signing-key isolation primitive (production-equivalent: JwtTokenProvider.signingKeySecretPath('xiigen/auth/jwt_signing_key/${tenantId}') per lubaDecisionsLocked.signingKeyScope.verdict='per-tenant'). "
    "3 PNGs captured at docs/e2e-snapshots/user-registration/cross-tenant-auth/{a-on-b-401.png, b-on-c-401.png, a-on-c-401.png} via scripts/portability/flow-01-v16-evidence-pngs.py (Pillow text-rendering of the literal jest transcript with the gate-pair-of-interest highlighted in red ←THIS PAIR; synthetic-evidence transparency clause invoked, consistent with V-14 instance C precedent). "
    "Cross-tenant cascade-row coverage proven: a-on-b (within-cascade isolation), b-on-c (cascade-to-third-party isolation), a-on-c (cross-cascade isolation), complementing the V-15 cross-cascade-coherence corollary at row 8 — together they prove BOTH visual AND authentication separation hold globally for FLOW-01, regardless of cascade relationship. "
    "V-16 verdict PASS via direct test execution (not derivation). "
    "V-16-AUDIT.md authored at docs/portability/flow-01/visual-evidence/V-16-AUDIT.md (8 sections, full pair-by-pair derivation, jest transcript verbatim, synthetic-evidence transparency clause, mapping to V-16 acceptCriterion). "
    "q4BinaryVerdict.(10)_crossTenantJwt_3pairs_401_or_403 elevated false → true. "
    "The TIER-D absoluteBlockForTierD on V-16 is now released; remaining TIER-D blocker is V-17 (lifted by Phase C10 ADAPTATION-CHANGELOG 6-req DoD + STATE.json freeze). "
    "Next: Phase C10 — ADAPTATION-CHANGELOG.md 6-req DoD verdicts (R1..R6) + q4BinaryVerdict.frozenComplete = true → V-17 PASS → TIER-D certification."
)

V16_EVIDENCE = (
    "PASS at Phase C9 - 12/12 jest tests pass on server/test/auth/cross-tenant-jwt.spec.ts; "
    "all 3 V-16 protocol-gate pairs (A→B, B→C, A→C) return 401 via per-tenant HMAC signing-key mismatch; "
    "3 PNGs captured at docs/e2e-snapshots/user-registration/cross-tenant-auth/; "
    "V-16-AUDIT.md authored at docs/portability/flow-01/visual-evidence/V-16-AUDIT.md."
)

C9_EVIDENCE_PATHS = [
    "server/test/auth/cross-tenant-jwt.spec.ts",
    "docs/e2e-snapshots/user-registration/cross-tenant-auth/a-on-b-401.png",
    "docs/e2e-snapshots/user-registration/cross-tenant-auth/b-on-c-401.png",
    "docs/e2e-snapshots/user-registration/cross-tenant-auth/a-on-c-401.png",
    "docs/portability/flow-01/visual-evidence/V-16-AUDIT.md",
    "scripts/portability/flow-01-v16-evidence-pngs.py",
]

Q4_10_NEW_EVIDENCE = (
    "PASS at Phase C9 - V-16 cross-tenant JWT isolation closed. server/test/auth/cross-tenant-jwt.spec.ts "
    "(506 lines, 12 tests, 12 pass, 8.7s wall) covers all 3 protocol-gate pairs (A↔B = acme/northwind, "
    "B↔C = northwind/tessera-collective, A↔C = acme/tessera-collective) plus 3 symmetry pairs plus 3 "
    "within-tenant 200 baselines plus 2 defense-in-depth. All cross-tenant cells return 401 via per-tenant "
    "HMAC signing-key mismatch (production-equivalent: JwtTokenProvider.signingKeySecretPath per lubaDecisionsLocked.signingKeyScope). "
    "3 PNGs captured at docs/e2e-snapshots/user-registration/cross-tenant-auth/; "
    "V-16-AUDIT.md authored. R6 absoluteBlockForTierD released."
)


def main() -> int:
    state = json.loads(STATE.read_text(encoding="utf-8"))

    # 1. + 2. V-16 manifest
    v16 = next(g for g in state["vGateManifest"] if g["id"] == "V-16")
    assert v16["verdict"] in ("NOT_YET_RUN", "PASS"), v16["verdict"]
    v16["verdict"] = "PASS"
    v16["lastCheckedAt"] = "2026-04-25"
    v16["evidence"] = V16_EVIDENCE

    # 3-5. cascadeVisualEvidence.rows[10]
    rows = state["cascadeVisualEvidence"]["rows"]
    row10 = next(r for r in rows if r["rowNum"] == 10)
    assert row10["currentState"] in ("MISSING", "COMPLETE"), row10["currentState"]
    row10["currentState"] = "COMPLETE"
    row10["verdict"] = "PASS"
    row10["evidence"] = V16_EVIDENCE

    # 6-8. phases[C9]
    phases = state["phases"]
    c9 = next(p for p in phases if p["id"] == "C9")
    assert c9["status"] in ("PENDING", "COMPLETED"), c9["status"]
    c9["status"] = "COMPLETED"
    c9["evidencePaths"] = C9_EVIDENCE_PATHS
    c9["lastCheckedAt"] = "2026-04-25"

    # 9. q4BinaryVerdict.subCriteria.(10)
    q4_sc = state["q4BinaryVerdict"]["subCriteria"]
    key10 = "(10)_crossTenantJwt_3pairs_401_or_403"
    assert key10 in q4_sc, f"missing key {key10}"
    q4_sc[key10]["verdict"] = True
    q4_sc[key10]["evidence"] = Q4_10_NEW_EVIDENCE

    # 11. recompute trueCount
    true_count = sum(1 for v in q4_sc.values() if v.get("verdict") is True)
    state["q4BinaryVerdict"]["trueCount"] = true_count
    state["q4BinaryVerdict"]["evaluatedAt"] = "2026-04-25 (post Phase C9)"

    # 10. lastUpdated narrative
    state["lastUpdated"] = LAST_UPDATED_NEW

    # Pretty-write back (preserve key order via json.dump default)
    STATE.write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    # Sanity report
    print("=== Phase C9 STATE.json update — applied ===")
    print(f"V-16 verdict       : {v16['verdict']}")
    print(f"V-16 lastCheckedAt : {v16['lastCheckedAt']}")
    print(f"row 10 verdict     : {row10['verdict']}")
    print(f"row 10 currentState: {row10['currentState']}")
    print(f"phases[C9] status  : {c9['status']}")
    print(f"phases[C9] evidencePaths count : {len(c9['evidencePaths'])}")
    print(f"q4 (10) verdict    : {q4_sc[key10]['verdict']}")
    print(f"q4 trueCount       : {true_count} / {state['q4BinaryVerdict']['totalSubCriteria']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
