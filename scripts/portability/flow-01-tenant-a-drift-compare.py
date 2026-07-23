#!/usr/bin/env python3
"""
FLOW-01 V-15 instance A drift comparison — platform-source vs tenant-a-acme-v1.0.1.

Per docs/portability/flow-01/V-15-DRIFT-PASS-CONTRACT.md:
  - Expected outcome: 252 byte-identical pairs (drift = 0 px on every PNG)
  - Any drift > byte-equality is a CONCERN to investigate (potential server-side
    leak into client rendering)
  - Pixel identity is the V-15 PASS criterion for FLOW-01 (server-side-only
    FREEDOM keys)

Usage:
  python scripts/portability/flow-01-tenant-a-drift-compare.py

Output:
  Prints per-file drift verdict + summary.
  Exits 0 if drift PASS (all 252 byte-identical), 1 otherwise.
"""

import hashlib
import os
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
BASELINE_DIR = ROOT / "docs" / "e2e-snapshots" / "user-registration" / "platform-source"
TENANT_A_DIR = ROOT / "docs" / "e2e-snapshots" / "user-registration" / "tenant-a-acme-v1.0.1"


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    if not BASELINE_DIR.is_dir():
        print(f"FAIL: baseline not found at {BASELINE_DIR}")
        return 1
    if not TENANT_A_DIR.is_dir():
        print(f"FAIL: tenant-a not found at {TENANT_A_DIR}")
        return 1

    baseline_pngs = sorted(p.name for p in BASELINE_DIR.glob("*.png"))
    tenant_pngs = sorted(p.name for p in TENANT_A_DIR.glob("*.png"))

    print(f"Baseline corpus:       {len(baseline_pngs)} PNGs at {BASELINE_DIR.relative_to(ROOT)}")
    print(f"Tenant-a corpus:       {len(tenant_pngs)} PNGs at {TENANT_A_DIR.relative_to(ROOT)}")

    only_in_baseline = sorted(set(baseline_pngs) - set(tenant_pngs))
    only_in_tenant = sorted(set(tenant_pngs) - set(baseline_pngs))
    common = sorted(set(baseline_pngs) & set(tenant_pngs))

    if only_in_baseline:
        print(f"\n[CONCERN] {len(only_in_baseline)} PNGs only in baseline (missing at tenant-a):")
        for n in only_in_baseline[:10]:
            print(f"   {n}")
        if len(only_in_baseline) > 10:
            print(f"   ... +{len(only_in_baseline) - 10} more")

    if only_in_tenant:
        print(f"\n[CONCERN] {len(only_in_tenant)} PNGs only in tenant-a (extras vs baseline):")
        for n in only_in_tenant[:10]:
            print(f"   {n}")

    print(f"\nCommon PNGs to compare: {len(common)}")

    drift_count = 0
    drift_files: list[tuple[str, int, int]] = []
    identical_count = 0

    for name in common:
        b_path = BASELINE_DIR / name
        t_path = TENANT_A_DIR / name
        b_hash = sha256_of(b_path)
        t_hash = sha256_of(t_path)
        if b_hash == t_hash:
            identical_count += 1
        else:
            drift_count += 1
            drift_files.append((name, b_path.stat().st_size, t_path.stat().st_size))

    print(f"\n=== V-15 Drift Comparison Result ===")
    print(f"Byte-identical pairs:   {identical_count}/{len(common)}")
    print(f"Drift detected:         {drift_count}/{len(common)}")
    print(f"Missing at tenant-a:    {len(only_in_baseline)}")
    print(f"Extras at tenant-a:     {len(only_in_tenant)}")

    if drift_files:
        print(f"\n[CONCERN] First 20 drift files (name, baseline-bytes, tenant-bytes):")
        for name, b_sz, t_sz in drift_files[:20]:
            print(f"   {name:<80} {b_sz:>8} {t_sz:>8} (delta {t_sz - b_sz:+d})")

    contract_pass = (
        len(common) == 252
        and identical_count == 252
        and drift_count == 0
        and len(only_in_baseline) == 0
        and len(only_in_tenant) == 0
    )

    print()
    if contract_pass:
        print("V-15 instance A verdict: PASS")
        print("  - 252 byte-identical pairs (drift = 0 on every PNG)")
        print("  - Per V-15-DRIFT-PASS-CONTRACT.md, this IS the expected and PASS outcome")
        print("  - Tenant separation proven behaviourally via")
        print("    server/test/user-registration/phase-01-adaptation-freedom-config.spec.ts")
        return 0
    else:
        print("V-15 instance A verdict: BLOCK or CONCERN")
        print("  - Either corpus mismatch or non-zero drift detected")
        print("  - Per V-15-DRIFT-PASS-CONTRACT.md component 1, drift > byte-equality")
        print("    indicates a server-side leak — must investigate")
        return 1


if __name__ == "__main__":
    sys.exit(main())
