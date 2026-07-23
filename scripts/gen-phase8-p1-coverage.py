#!/usr/bin/env python3
"""
Phase 8 of FLOW-UI-COVERAGE-PLAN-FINAL — per-P1-state Playwright coverage.

For each flow with P3 NOT_TESTED or PARTIAL rows, emit client/e2e/{slug}.spec.ts
containing one test() per business state. Route + data-testid resolution:

  1. State → target page: from P5 per-state table (authoritative)
  2. Target page → actual route: lookup in client/src/App.tsx (ground truth;
     P5's "Proposed Route" is a naming-pattern guess, often wrong)
  3. Target page → actual data-testid: first data-testid="..." in the page
     source (ground truth; P5's "hook" is a pattern guess that may miss)
  4. Fallbacks: P5 proposed route, P5 hint, /admin/{slug}, page-{slug}

Test shape matches P8 spec:
  page.goto(route) → waitForLoadState → screenshot → expect(getByTestId).toBeVisible()

Usage:
  python scripts/gen-phase8-p1-coverage.py --all
  python scripts/gen-phase8-p1-coverage.py --slugs completion-gamification user-groups-communities
  python scripts/gen-phase8-p1-coverage.py --dry-run
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COVERAGE = ROOT / "docs" / "flow-coverage"
APP_TSX = ROOT / "client" / "src" / "App.tsx"
E2E = ROOT / "client" / "e2e"
PAGES = ROOT / "client" / "src" / "pages"
SNAPS = ROOT / "docs" / "e2e-snapshots"

ROUTE_RE = re.compile(r'<Route\s+path="([^"]+)"\s+element=\{<(\w+)')
TESTID_RE = re.compile(r'data-testid=["\']([^"\']+)["\']')
MD_PAGE_ROW = re.compile(
    r"^\|\s*`([^`]+\.tsx)`\s*\|\s*`([^`]+)`\s*\|", re.MULTILINE
)
MD_STATE_ROW = re.compile(
    r"^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*`?([A-Z][^|`]*\.tsx)`?\s*\|\s*`?([^`|]+?)`?\s*\|",
    re.MULTILINE,
)
P3_ROW_RE = re.compile(
    r"^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([A-Z_]+)\s*\|\s*([A-Z_]+)\s*\|",
    re.MULTILINE,
)


def load_app_routes() -> dict[str, str]:
    text = APP_TSX.read_text(encoding="utf-8", errors="ignore")
    return {m.group(2): m.group(1) for m in ROUTE_RE.finditer(text)}


def first_testid_in_page(slug: str, page_file: str) -> str | None:
    """Find first data-testid in client/src/pages/{slug}/{page_file}, recursively if needed."""
    direct = PAGES / slug / page_file
    if direct.exists():
        text = direct.read_text(encoding="utf-8", errors="ignore")
        m = TESTID_RE.search(text)
        if m:
            return m.group(1)
    # Some page files live under other slug directories; search all pages
    for candidate in PAGES.rglob(page_file):
        text = candidate.read_text(encoding="utf-8", errors="ignore")
        m = TESTID_RE.search(text)
        if m:
            return m.group(1)
    return None


def parse_p5(slug: str):
    path = COVERAGE / slug / "P5-ui-specs.md"
    if not path.exists():
        return {}, []
    text = path.read_text(encoding="utf-8")
    pages = {m.group(1): m.group(2) for m in MD_PAGE_ROW.finditer(text)}
    state_rows = []
    for m in MD_STATE_ROW.finditer(text):
        state_rows.append(
            (
                int(m.group(1)),
                m.group(2).strip(),
                m.group(3).strip(),
                m.group(4).strip(),
            )
        )
    return pages, state_rows


def parse_p3(slug: str) -> dict[int, str]:
    path = COVERAGE / slug / "P3-automation-gap-analysis.md"
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    result = {}
    for m in P3_ROW_RE.finditer(text):
        row_num = int(m.group(1))
        auto = m.group(4)
        result[row_num] = auto
    return result


def parse_p3_rollup() -> list[dict]:
    path = COVERAGE / "P3-AUTOMATION-GAP-ROLLUP.md"
    text = path.read_text(encoding="utf-8")
    rows = []
    rx = re.compile(
        r"^\|\s*FLOW-(\d+)\s*\|\s*`([^`]+)`\s*\|\s*\w+\s*\|"
        r"\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*`?([^`|]+?)`?\s*\|"
        r"\s*(\d+)\s*\|",
        re.MULTILINE,
    )
    for m in rx.finditer(text):
        rows.append(
            {
                "flow_num": m.group(1),
                "slug": m.group(2),
                "tested": int(m.group(3)),
                "partial": int(m.group(4)),
                "not_tested": int(m.group(5)),
                "auth_spec": m.group(6).strip(),
                "duplicates": int(m.group(7)),
            }
        )
    return rows


def slugify(s: str, maxlen: int = 40) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower())[:maxlen].strip("-")
    return s or "state"


def sanitize_title(s: str, maxlen: int = 80) -> str:
    s = s.replace("`", "").replace('"', "'")
    if len(s) > maxlen:
        s = s[:maxlen].rstrip() + "…"
    return s


def resolve_route_and_testid(
    slug: str,
    target_page: str,
    p5_hint: str,
    p5_pages: dict[str, str],
    app_routes: dict[str, str],
) -> tuple[str, str, dict]:
    """Return (route, testid, diagnostics)."""
    comp = target_page.replace(".tsx", "")
    app_route = app_routes.get(comp)
    real_testid = first_testid_in_page(slug, target_page)
    p5_route = p5_pages.get(target_page)

    route = app_route or p5_route or f"/admin/{slug}"
    testid = real_testid or p5_hint or f"page-{slug}"

    return route, testid, {
        "app_route": app_route,
        "p5_route": p5_route,
        "real_testid": real_testid,
        "p5_hint": p5_hint,
    }


STANDALONE_HEADER_TEMPLATE = """/**
 * FLOW-{flow_num} {display} — P1 state coverage (P8).
 *
 * Generated by scripts/gen-phase8-p1-coverage.py.
 * One test per NOT_TESTED / PARTIAL row in P3.
 * Mapping: docs/flow-coverage/{slug}/P5-ui-specs.md
 */

import {{ test, expect }} from '@playwright/test';
import * as path from 'path';
import {{ fileURLToPath }} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', '{slug}', name);

"""

APPEND_HEADER_TEMPLATE = """

// ---------------------------------------------------------------------------
// P1 state coverage (P8) — auto-generated by scripts/gen-phase8-p1-coverage.py
// Source: docs/flow-coverage/{slug}/P5-ui-specs.md
// Regenerate: python scripts/gen-phase8-p1-coverage.py --slugs {slug}
// ---------------------------------------------------------------------------
const P8_SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', '{slug}', name);

"""

P8_BLOCK_START_MARKER = "// P1 state coverage (P8) — auto-generated"
P8_BLOCK_END_MARKER = "// END P1 state coverage (P8)"


def render_describe_block(
    flow_num: str,
    slug: str,
    rows: list[tuple[int, str, str, str]],
    p3_verdicts: dict[int, str],
    p5_pages: dict[str, str],
    app_routes: dict[str, str],
    snap_var: str = "SNAP",
) -> tuple[str, dict]:
    """Emit just the test.describe block (not the full file)."""
    stats = {
        "slug": slug,
        "new_tests": 0,
        "skipped_tested": 0,
        "rows": [],
    }
    lines = [
        f"test.describe('FLOW-{flow_num} {slug} — P1 state coverage', () => {{",
        "",
        "  test.beforeAll(async ({ request }) => {",
        "    try {",
        "      const r = await request.get('http://localhost:3000/health/live');",
        "      if (!r.ok()) test.skip(true, 'Server not ready');",
        "    } catch {",
        "      test.skip(true, 'Server unreachable — start docker compose up');",
        "    }",
        "  });",
        "",
    ]

    counter = 0
    for row_num, desc, target_page, hint in rows:
        verdict = p3_verdicts.get(row_num, "NOT_TESTED")
        if verdict == "TESTED":
            stats["skipped_tested"] += 1
            continue
        counter += 1
        route, testid, diag = resolve_route_and_testid(
            slug, target_page, hint, p5_pages, app_routes
        )
        state_kebab = slugify(desc, 40)
        png_name = f"{counter:02d}-{state_kebab}.png"
        title = sanitize_title(f"P1-{row_num:02d}: {desc}")

        lines.append(f"  test({json.dumps(title)}, async ({{ page }}) => {{")
        lines.append(f"    await page.goto({json.dumps(route)});")
        lines.append(f"    await page.waitForLoadState('networkidle');")
        lines.append(
            f"    await page.screenshot({{ path: {snap_var}({json.dumps(png_name)}), fullPage: true }});"
        )
        lines.append(
            f"    await expect(page.getByTestId({json.dumps(testid)})).toBeVisible();"
        )
        lines.append("  });")
        lines.append("")
        stats["new_tests"] += 1
        stats["rows"].append(
            {
                "row": row_num,
                "verdict": verdict,
                "route": route,
                "testid": testid,
                "page": target_page,
                "diag": diag,
            }
        )

    lines.append("});")
    lines.append(P8_BLOCK_END_MARKER)
    return "\n".join(lines) + "\n", stats


def splice_into_existing(existing: str, slug: str, describe_block: str) -> str:
    """Append P8 block to existing file, replacing any previous P8 block (idempotent)."""
    start_idx = existing.find(P8_BLOCK_START_MARKER)
    if start_idx != -1:
        # Strip the old P8 section (from the blank line before start marker to end marker)
        end_idx = existing.find(P8_BLOCK_END_MARKER)
        if end_idx != -1:
            # Find start of the header comment (walk back to "// ---" line)
            pre = existing[:start_idx].rstrip()
            # Walk back past the "// ---" header banner
            banner_idx = pre.rfind("// --")
            if banner_idx != -1:
                pre = existing[:banner_idx].rstrip()
            post = existing[end_idx + len(P8_BLOCK_END_MARKER):]
            existing = pre + post.rstrip()
    header = APPEND_HEADER_TEMPLATE.format(slug=slug)
    return existing.rstrip() + "\n" + header + describe_block


def process_flow(flow_num: str, slug: str, app_routes: dict[str, str], dry_run: bool):
    p5_pages, p5_states = parse_p5(slug)
    p3_verdicts = parse_p3(slug)

    rows_for_tests = []
    for row_num, desc, page_file, hint in p5_states:
        v = p3_verdicts.get(row_num, "NOT_TESTED")
        if v in ("NOT_TESTED", "PARTIAL"):
            rows_for_tests.append((row_num, desc, page_file, hint))

    if not rows_for_tests:
        return {"slug": slug, "skipped": "no-rows-to-test", "new_tests": 0}

    out_path = E2E / f"{slug}.spec.ts"
    file_exists = out_path.exists()
    snap_var = "P8_SNAP" if file_exists else "SNAP"

    describe_block, stats = render_describe_block(
        flow_num, slug, rows_for_tests, p3_verdicts, p5_pages, app_routes, snap_var
    )
    # Prepend the start marker on the first line of the describe block
    describe_block = P8_BLOCK_START_MARKER + "\n" + describe_block
    stats["flow_num"] = flow_num
    stats["total_p1"] = len(p5_states)
    stats["not_tested_in_p3"] = sum(1 for v in p3_verdicts.values() if v == "NOT_TESTED")
    stats["partial_in_p3"] = sum(1 for v in p3_verdicts.values() if v == "PARTIAL")
    stats["mode"] = "append" if file_exists else "create"

    if not dry_run:
        (SNAPS / slug).mkdir(parents=True, exist_ok=True)
        display = slug.replace("-", " ").title()
        if file_exists:
            existing = out_path.read_text(encoding="utf-8")
            new_text = splice_into_existing(existing, slug, describe_block)
        else:
            header = STANDALONE_HEADER_TEMPLATE.format(
                flow_num=flow_num, slug=slug, display=display
            )
            new_text = header + describe_block
        out_path.write_text(new_text, encoding="utf-8")
        stats["spec_path"] = str(out_path.relative_to(ROOT))
    return stats


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--slugs", nargs="*", default=[])
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    app_routes = load_app_routes()
    rollup = parse_p3_rollup()
    if args.slugs:
        target = [r for r in rollup if r["slug"] in args.slugs]
    elif args.all:
        target = rollup
    else:
        ap.error("Provide --all or --slugs ...")

    total_tests = 0
    written = 0
    skipped = 0
    for r in target:
        result = process_flow(r["flow_num"], r["slug"], app_routes, args.dry_run)
        if "skipped" in result:
            skipped += 1
            print(f"  FLOW-{r['flow_num']} {r['slug']}: skip ({result['skipped']})")
        else:
            total_tests += result["new_tests"]
            written += 1
            if args.dry_run:
                print(
                    f"  FLOW-{r['flow_num']} {r['slug']}: would write {result['new_tests']} tests"
                )
            else:
                print(
                    f"  FLOW-{r['flow_num']} {r['slug']}: wrote {result['spec_path']} "
                    f"({result['new_tests']} tests)"
                )

    print()
    print(f"Flows processed: {len(target)}  written: {written}  skipped: {skipped}")
    print(f"Total tests generated: {total_tests}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
