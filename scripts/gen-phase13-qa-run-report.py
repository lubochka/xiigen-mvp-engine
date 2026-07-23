#!/usr/bin/env python3
"""
Phase 13 — QA Run + PNG Snapshots report generator.

Scans docs/e2e-snapshots/{slug}/ for PNGs and cross-references against
the spec files' page.screenshot() calls. Produces:
  docs/flow-coverage/{slug}/P13-qa-run-report.md — per-flow report
  docs/flow-coverage/P13-QA-RUN-ROLLUP.md — cross-flow summary

This generator does NOT run playwright — actual execution requires a
live server + client (docker compose up). It audits what currently
exists on disk as evidence of prior runs, and flags remaining gaps.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SESSIONS_DIR = ROOT / "docs" / "sessions"
FLOW_COVERAGE = ROOT / "docs" / "flow-coverage"
SNAPSHOTS_DIR = ROOT / "docs" / "e2e-snapshots"
CLIENT_E2E = ROOT / "client" / "e2e"
E2E_TESTS = ROOT / "e2e" / "tests"


def load_automation(flow_id: str) -> dict | None:
    p = SESSIONS_DIR / flow_id / "flow-ui-automation.json"
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def snapshot_dir(slug: str) -> Path:
    return SNAPSHOTS_DIR / slug


def list_pngs(slug: str) -> list[dict]:
    d = snapshot_dir(slug)
    if not d.exists():
        return []
    pngs = []
    for p in sorted(d.glob("*.png")):
        size = p.stat().st_size
        pngs.append({"name": p.name, "bytes": size, "kb": round(size / 1024, 1),
                     "blank": size < 1024})
    return pngs


def find_spec_files(slug: str) -> list[Path]:
    paths = []
    if CLIENT_E2E.exists():
        paths.extend(sorted(CLIENT_E2E.glob(f"*{slug}*.spec.ts")))
    return paths


def count_screenshot_calls(spec_paths: list[Path]) -> int:
    n = 0
    for p in spec_paths:
        text = p.read_text(encoding="utf-8", errors="ignore")
        n += len(re.findall(r"\bpage\.screenshot\s*\(", text))
    return n


def count_test_blocks(spec_paths: list[Path]) -> int:
    n = 0
    for p in spec_paths:
        text = p.read_text(encoding="utf-8", errors="ignore")
        n += len(re.findall(r"^\s*test\s*\(\s*['\"]", text, re.MULTILINE))
    return n


def write_p13(flow_id: str, slug: str, classification: str, display_name: str) -> dict:
    pngs = list_pngs(slug)
    specs = find_spec_files(slug)
    shot_calls = count_screenshot_calls(specs)
    test_blocks = count_test_blocks(specs)

    ok_count = sum(1 for p in pngs if not p["blank"])
    blank_count = sum(1 for p in pngs if p["blank"])
    total_png = len(pngs)

    match_ok = (shot_calls == 0) or (total_png >= shot_calls and blank_count == 0)
    status = "READY" if match_ok and total_png > 0 else \
             "PENDING_RUN" if total_png == 0 else \
             "PARTIAL"

    out_dir = FLOW_COVERAGE / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "P13-qa-run-report.md"

    lines = []
    lines.append(f"# {flow_id} QA Run Report — Phase 13")
    lines.append("")
    lines.append(f"**Flow:** {display_name} (`{slug}`)")
    lines.append(f"**Classification:** {classification}")
    lines.append(f"**Status:** {status}")
    lines.append(f"**Spec files:** {len(specs)} | **Test blocks:** {test_blocks} | "
                 f"**Screenshot calls:** {shot_calls}")
    lines.append(f"**PNGs on disk:** {total_png} (OK ≥1KB: {ok_count}, BLANK <1KB: {blank_count})")
    lines.append("")

    if specs:
        lines.append("## Spec files")
        lines.append("")
        for p in specs:
            rel = str(p.relative_to(ROOT)).replace("\\", "/")
            lines.append(f"- `{rel}`")
        lines.append("")

    lines.append("## Snapshots")
    lines.append("")
    if total_png == 0:
        lines.append(f"_No PNGs yet in `docs/e2e-snapshots/{slug}/`. "
                     "Run `npx playwright test client/e2e/" + slug + "*.spec.ts --reporter=list` "
                     "with server + client running to produce them._")
    else:
        lines.append("| # | File | Size (KB) | Visual OK |")
        lines.append("|--:|------|----------:|:---------:|")
        for i, p in enumerate(pngs, 1):
            ok = "❌ BLANK" if p["blank"] else "✅"
            lines.append(f"| {i} | `{p['name']}` | {p['kb']} | {ok} |")
    lines.append("")

    lines.append("## Arbiters")
    lines.append("")
    lines.append(f"- **PNG count match:** {total_png} PNGs vs {shot_calls} screenshot call(s). "
                 f"{'✅ match' if total_png >= shot_calls else '❌ missing ' + str(shot_calls - total_png) + ' PNG(s)'}.")
    lines.append(f"- **File size gate:** {blank_count} blank PNG(s) <1KB. "
                 f"{'✅ pass' if blank_count == 0 else '❌ fail — rerun after server is up'}.")
    lines.append("- **Failure gate:** generator does not execute playwright; "
                 "actual pass/fail column requires live run. Current verdict is based on existing disk state.")
    lines.append("- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.")
    lines.append("")

    lines.append("## Execution prompt")
    lines.append("")
    lines.append("```bash")
    lines.append("# 1) Start the stack")
    lines.append("docker compose up --build -d")
    lines.append("")
    lines.append("# 2) Run playwright for this flow")
    lines.append(f"npx playwright test client/e2e/{slug}*.spec.ts --reporter=list")
    lines.append("")
    lines.append("# 3) Verify PNGs")
    lines.append(f"ls -la docs/e2e-snapshots/{slug}/")
    lines.append(f"find docs/e2e-snapshots/{slug}/ -name '*.png' -size -1k  # expect no output")
    lines.append("")
    lines.append("# 4) Regenerate this report")
    lines.append("python scripts/gen-phase13-qa-run-report.py")
    lines.append("```")
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    return {
        "flow": flow_id, "slug": slug, "status": status,
        "specs": len(specs), "test_blocks": test_blocks,
        "shot_calls": shot_calls, "pngs": total_png,
        "ok": ok_count, "blank": blank_count,
    }


def write_rollup(results: list[dict]) -> None:
    ready = sum(1 for r in results if r["status"] == "READY")
    pending = sum(1 for r in results if r["status"] == "PENDING_RUN")
    partial = sum(1 for r in results if r["status"] == "PARTIAL")
    total_pngs = sum(r["pngs"] for r in results)
    total_blank = sum(r["blank"] for r in results)
    total_specs = sum(r["specs"] for r in results)
    total_shot = sum(r["shot_calls"] for r in results)

    lines = []
    lines.append("# Cross-Flow P13 QA Run Roll-Up")
    lines.append("")
    lines.append(f"Flows analyzed: {len(results)} | READY: {ready} | PENDING_RUN: {pending} | PARTIAL: {partial}")
    lines.append(f"Total PNGs: {total_pngs} (blank <1KB: {total_blank}) | "
                 f"Spec files: {total_specs} | Screenshot calls: {total_shot}")
    lines.append("")
    lines.append("| Flow | Slug | Status | Specs | Tests | Shot calls | PNGs | OK | Blank |")
    lines.append("|------|------|--------|------:|------:|-----------:|-----:|---:|------:|")
    for r in results:
        lines.append(
            f"| {r['flow']} | `{r['slug']}` | {r['status']} | {r['specs']} | {r['test_blocks']} | "
            f"{r['shot_calls']} | {r['pngs']} | {r['ok']} | {r['blank']} |"
        )
    (FLOW_COVERAGE / "P13-QA-RUN-ROLLUP.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    results = []
    for n in range(48):
        fid = f"FLOW-{n:02d}"
        auto = load_automation(fid)
        if not auto:
            continue
        if "P13" not in auto.get("phasesApplicable", []):
            continue
        slug = auto["slug"]
        classification = auto["classification"]
        display_name = auto.get("displayName", slug)
        results.append(write_p13(fid, slug, classification, display_name))
    write_rollup(results)
    ready = sum(1 for r in results if r["status"] == "READY")
    pending = sum(1 for r in results if r["status"] == "PENDING_RUN")
    partial = sum(1 for r in results if r["status"] == "PARTIAL")
    print(f"wrote {len(results)} P13 run reports + rollup; "
          f"READY={ready} PENDING_RUN={pending} PARTIAL={partial}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
