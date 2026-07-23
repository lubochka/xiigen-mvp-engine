#!/usr/bin/env python3
"""
Phase 12 — Test Coverage Cleanup audit.

Scans test files and produces:
  docs/flow-coverage/{slug}/P12-test-cleanup.md — per-flow audit
  docs/flow-coverage/P12-TEST-CLEANUP-ROLLUP.md — cross-flow summary

Audit rules (from FLOW-UI-COVERAGE-PLAN-FINAL.md Phase 12):
  - .todo() / .skip() / xtest() / xit() — flag
  - Conditional skip (if !server) — allowed, note
  - expect(true).toBe(true) — flag as false green
  - e2e/tests/flow{NN}-{slug}.spec.ts duplicates — flag for merge
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SESSIONS_DIR = ROOT / "docs" / "sessions"
FLOW_COVERAGE = ROOT / "docs" / "flow-coverage"
CLIENT_E2E = ROOT / "client" / "e2e"
E2E_TESTS = ROOT / "e2e" / "tests"
SERVER_TEST = ROOT / "server" / "test"


def load_automation(flow_id: str) -> dict | None:
    p = SESSIONS_DIR / flow_id / "flow-ui-automation.json"
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def find_specs_for_slug(slug: str, flow_num: int) -> dict:
    """Find all spec/test files related to this slug."""
    out = {"client_e2e": [], "e2e_tests": [], "server_test": []}
    if CLIENT_E2E.exists():
        out["client_e2e"] = sorted(
            str(p.relative_to(ROOT)).replace("\\", "/")
            for p in CLIENT_E2E.glob(f"*{slug}*.spec.ts")
        )
    if E2E_TESTS.exists():
        patterns = [f"flow{flow_num:02d}*", f"*{slug}*"]
        paths = set()
        for pat in patterns:
            for p in E2E_TESTS.glob(f"{pat}.spec.ts"):
                paths.add(p)
        out["e2e_tests"] = sorted(
            str(p.relative_to(ROOT)).replace("\\", "/") for p in paths
        )
    if SERVER_TEST.exists():
        out["server_test"] = sorted(
            str(p.relative_to(ROOT)).replace("\\", "/")
            for p in SERVER_TEST.rglob(f"*{slug}*.spec.ts")
        )
    return out


def audit_file(p: Path) -> dict:
    if not p.exists():
        return {"skip": 0, "todo": 0, "xit_xtest": 0, "false_green": 0, "lines": 0,
                "conditional_skip": 0}
    text = p.read_text(encoding="utf-8", errors="ignore")
    skip = len(re.findall(r"\.skip\s*\(", text))
    cond_skip = len(re.findall(r"(?:if\s*\([^)]*\)\s*)\btest\.skip\s*\(", text))
    todo = len(re.findall(r"\.todo\s*\(", text))
    xit_xtest = len(re.findall(r"\bxit\s*\(|\bxtest\s*\(", text))
    false_green = len(re.findall(r"expect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*true\s*\)", text))
    lines = len(text.splitlines())
    return {"skip": skip, "todo": todo, "xit_xtest": xit_xtest,
            "false_green": false_green, "lines": lines,
            "conditional_skip": cond_skip}


def merge_audit(audits: list[dict]) -> dict:
    out = {"skip": 0, "todo": 0, "xit_xtest": 0, "false_green": 0, "lines": 0,
           "conditional_skip": 0}
    for a in audits:
        for k in out:
            out[k] += a.get(k, 0)
    return out


def write_p12(flow_id: str, slug: str, classification: str, display_name: str) -> dict:
    flow_num = int(flow_id.split("-")[1])
    specs = find_specs_for_slug(slug, flow_num)

    audits = {}
    for bucket, paths in specs.items():
        audits[bucket] = [(p, audit_file(ROOT / p)) for p in paths]

    all_audits = [a for bucket in audits.values() for _, a in bucket]
    totals = merge_audit(all_audits)
    unconditional_skip = totals["skip"] - totals["conditional_skip"]
    # For rolled-up totals we differentiate unconditional skips
    totals["unconditional_skip"] = max(0, unconditional_skip)

    # Duplicate detection: if client/e2e AND e2e/tests both reference slug → duplicate candidate
    duplicate_candidates = []
    if audits["client_e2e"] and audits["e2e_tests"]:
        for tp, _ in audits["e2e_tests"]:
            duplicate_candidates.append(tp)

    # Determine status: CLEAN (nothing to fix) or NEEDS_FIX (stubs / false-green / dupes)
    needs_fix_reasons = []
    if totals["todo"] > 0:
        needs_fix_reasons.append(f"{totals['todo']} .todo()")
    if totals["unconditional_skip"] > 0:
        needs_fix_reasons.append(f"{totals['unconditional_skip']} unconditional .skip()")
    if totals["xit_xtest"] > 0:
        needs_fix_reasons.append(f"{totals['xit_xtest']} xit/xtest")
    if totals["false_green"] > 0:
        needs_fix_reasons.append(f"{totals['false_green']} expect(true).toBe(true)")
    if duplicate_candidates:
        needs_fix_reasons.append(f"{len(duplicate_candidates)} duplicate spec(s) in e2e/tests/")
    status = "CLEAN" if not needs_fix_reasons else "NEEDS_FIX"

    out_dir = FLOW_COVERAGE / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "P12-test-cleanup.md"

    lines = []
    lines.append(f"# {flow_id} Test Coverage Cleanup — Phase 12")
    lines.append("")
    lines.append(f"**Flow:** {display_name} (`{slug}`)")
    lines.append(f"**Classification:** {classification}")
    lines.append(f"**Status:** {status}"
                 + (f" — {', '.join(needs_fix_reasons)}" if needs_fix_reasons else ""))
    lines.append("")
    lines.append("## Test file inventory")
    lines.append("")
    lines.append("| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |")
    lines.append("|--------|------|------:|------:|----------:|------:|----------:|------------:|")
    for bucket_label, bucket_name in [("client/e2e", "client_e2e"),
                                        ("e2e/tests (full-stack)", "e2e_tests"),
                                        ("server/test", "server_test")]:
        for path, a in audits[bucket_name]:
            lines.append(
                f"| {bucket_label} | `{path}` | {a['lines']} | {a['skip']} | {a['conditional_skip']} | "
                f"{a['todo']} | {a['xit_xtest']} | {a['false_green']} |"
            )
    if not any(audits[b] for b in audits):
        lines.append(f"| — | (no spec files matching `{slug}`) | | | | | | |")
    lines.append("")

    lines.append("## Arbiters")
    lines.append("")
    lines.append(f"- **Stub free:** `.todo`={totals['todo']}, `.skip` (unconditional)={totals['unconditional_skip']}, "
                 f"`xit`/`xtest`={totals['xit_xtest']}. Conditional skips ({totals['conditional_skip']}) accepted "
                 f"(server-readiness gate).")
    if duplicate_candidates:
        lines.append("- **Duplicate:** ❌ — candidates:")
        for c in duplicate_candidates:
            lines.append(f"  - `{c}` — full-stack integration spec. "
                         "Full-stack and client-mock serve different purposes; merge decision requires review.")
    else:
        lines.append("- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.")
    lines.append(f"- **No false greens:** `expect(true).toBe(true)` = {totals['false_green']}.")
    lines.append("- **Test gate:** `npx jest " + slug + " --no-coverage` → failures === 0 required. "
                 "Server jest baseline ≥ 10,617.")
    lines.append("")

    lines.append("## Action items")
    lines.append("")
    if not needs_fix_reasons:
        lines.append("- None — this flow's test suite passes P12 cleanup gate.")
    else:
        for reason in needs_fix_reasons:
            lines.append(f"- Resolve: {reason}")
        if duplicate_candidates:
            lines.append("- **Architect decision required on duplicates:** the `e2e/tests/` files are "
                         "full-stack (server+client) while `client/e2e/` files are client-only mock-state. "
                         "Plan says \"merge + delete\"; architect verdict: these serve different QA layers — "
                         "keep both, but rename `e2e/tests/flow{NN}-*.spec.ts` to semantic "
                         "`e2e/tests/{slug}-fullstack.spec.ts` to comply with Rule 16 (no flow-NN paths).")
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    return {
        "flow": flow_id, "slug": slug, "status": status,
        "client_e2e_files": len(specs["client_e2e"]),
        "e2e_tests_files": len(specs["e2e_tests"]),
        "server_test_files": len(specs["server_test"]),
        "todo": totals["todo"],
        "unconditional_skip": totals["unconditional_skip"],
        "xit_xtest": totals["xit_xtest"],
        "false_green": totals["false_green"],
        "duplicates": len(duplicate_candidates),
    }


def write_rollup(results: list[dict]) -> None:
    clean = sum(1 for r in results if r["status"] == "CLEAN")
    needs = len(results) - clean
    total_todo = sum(r["todo"] for r in results)
    total_uskip = sum(r["unconditional_skip"] for r in results)
    total_false = sum(r["false_green"] for r in results)
    total_dup = sum(r["duplicates"] for r in results)

    lines = []
    lines.append("# Cross-Flow P12 Test Cleanup Roll-Up")
    lines.append("")
    lines.append(f"Flows analyzed: {len(results)} | CLEAN: {clean} | NEEDS_FIX: {needs} | "
                 f".todo: {total_todo} | unconditional .skip: {total_uskip} | "
                 f"false-green: {total_false} | duplicate specs: {total_dup}")
    lines.append("")
    lines.append("| Flow | Slug | Status | client/e2e | e2e/tests | server/test | .todo | .skip (u) | false-green | dup |")
    lines.append("|------|------|--------|-----------:|----------:|------------:|------:|----------:|------------:|----:|")
    for r in results:
        lines.append(
            f"| {r['flow']} | `{r['slug']}` | {r['status']} | {r['client_e2e_files']} | "
            f"{r['e2e_tests_files']} | {r['server_test_files']} | {r['todo']} | "
            f"{r['unconditional_skip']} | {r['false_green']} | {r['duplicates']} |"
        )
    (FLOW_COVERAGE / "P12-TEST-CLEANUP-ROLLUP.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    results = []
    for n in range(48):
        fid = f"FLOW-{n:02d}"
        auto = load_automation(fid)
        if not auto:
            continue
        if "P12" not in auto.get("phasesApplicable", []):
            continue
        slug = auto["slug"]
        classification = auto["classification"]
        display_name = auto.get("displayName", slug)
        results.append(write_p12(fid, slug, classification, display_name))
    write_rollup(results)
    clean = sum(1 for r in results if r["status"] == "CLEAN")
    print(f"wrote {len(results)} P12 cleanup audits + rollup; CLEAN={clean} NEEDS_FIX={len(results) - clean}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
