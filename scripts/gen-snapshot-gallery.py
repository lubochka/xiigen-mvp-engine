#!/usr/bin/env python3
"""
Generate docs/e2e-snapshots/SNAPSHOT-GALLERY.html — Criterion 8 P13 deliverable.

Single HTML file that displays every PNG grouped by flow, with figcaption
showing `<NN>-<state> — test: "<test name>"`. Used to review the full
Playwright snapshot output in one place.

Resolution of test name per PNG:
  1. Scan client/e2e/*.spec.ts files for `page.screenshot({ path: ...('<name>.png') })`
  2. Trace up to the enclosing `test('<name>', ...)` — closest preceding `test(` line
  3. Fall back to "(unresolved)" when no match found
"""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SNAPSHOTS_DIR = ROOT / "docs" / "e2e-snapshots"
CLIENT_E2E = ROOT / "client" / "e2e"
OUT_FILE = SNAPSHOTS_DIR / "SNAPSHOT-GALLERY.html"


def build_png_to_test_index() -> dict[str, str]:
    """Walk spec files once; return {png_name: test_name}."""
    index: dict[str, str] = {}
    if not CLIENT_E2E.exists():
        return index

    shot_re = re.compile(r"""page\.screenshot\s*\(\s*\{[^}]*path\s*:\s*[^'"]*['"]([^'"]+\.png)['"]""")
    test_re = re.compile(r"""\btest\s*\(\s*['"]([^'"]+)['"]""")

    for spec in sorted(CLIENT_E2E.glob("*.spec.ts")):
        text = spec.read_text(encoding="utf-8", errors="ignore")
        # Collect (line, test-name) pairs so we can attribute screenshots to the enclosing test.
        test_positions: list[tuple[int, str]] = []
        for m in test_re.finditer(text):
            test_positions.append((m.start(), m.group(1)))

        for m in shot_re.finditer(text):
            path_full = m.group(1)
            png_name = Path(path_full).name
            pos = m.start()
            # Find the test() that immediately precedes this screenshot
            current = "(unresolved)"
            for start, name in test_positions:
                if start <= pos:
                    current = name
                else:
                    break
            # Do not overwrite — first spec wins (stable per file scan order)
            index.setdefault(png_name, current)
    return index


def collect_flows() -> list[tuple[str, list[Path]]]:
    flows: list[tuple[str, list[Path]]] = []
    if not SNAPSHOTS_DIR.exists():
        return flows
    for slug_dir in sorted(SNAPSHOTS_DIR.iterdir()):
        if not slug_dir.is_dir():
            continue
        pngs = sorted(slug_dir.glob("*.png"))
        if pngs:
            flows.append((slug_dir.name, pngs))
    return flows


def humanize_state(png_stem: str) -> str:
    # "01-ticket-purchase-form" -> "01 · ticket purchase form"
    m = re.match(r"^(\d+)[-_](.+)$", png_stem)
    if not m:
        return png_stem
    num, rest = m.group(1), m.group(2)
    return f"{num} · {rest.replace('-', ' ').replace('_', ' ')}"


def render_html(flows: list[tuple[str, list[Path]]], png_to_test: dict[str, str]) -> str:
    total_pngs = sum(len(p) for _, p in flows)
    flow_links = "\n".join(
        f'        <li><a href="#flow-{slug}">{slug}</a> <span class="count">({len(pngs)})</span></li>'
        for slug, pngs in flows
    )

    sections: list[str] = []
    for slug, pngs in flows:
        figures: list[str] = []
        for png in pngs:
            size_kb = round(png.stat().st_size / 1024, 1)
            blank = size_kb < 1.0
            blank_class = " blank" if blank else ""
            test_name = png_to_test.get(png.name, "(unresolved)")
            state_label = humanize_state(png.stem)
            rel = f"./{slug}/{png.name}"
            figures.append(f"""          <figure class="shot{blank_class}">
            <a href="{html.escape(rel)}" target="_blank"><img src="{html.escape(rel)}" loading="lazy" alt="{html.escape(png.name)}"/></a>
            <figcaption><strong>{html.escape(state_label)}</strong> — test: <code>{html.escape(test_name)}</code> <span class="kb">{size_kb} KB</span></figcaption>
          </figure>""")
        sections.append(f"""      <section class="flow" id="flow-{html.escape(slug)}">
        <h2>{html.escape(slug)} <span class="count">({len(pngs)} PNGs)</span></h2>
        <div class="grid">
{chr(10).join(figures)}
        </div>
      </section>""")

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>XIIGen — Playwright Snapshot Gallery</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; background: #f7f8fa; color: #1f2937; }}
    header {{ background: #1f2937; color: #fff; padding: 16px 24px; position: sticky; top: 0; z-index: 10; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }}
    header h1 {{ margin: 0; font-size: 1.25rem; }}
    header p {{ margin: 4px 0 0; color: #9ca3af; font-size: 0.875rem; }}
    .layout {{ display: grid; grid-template-columns: 240px 1fr; gap: 0; }}
    nav.toc {{ position: sticky; top: 72px; height: calc(100vh - 72px); overflow-y: auto; padding: 16px; background: #fff; border-right: 1px solid #e5e7eb; }}
    nav.toc ul {{ list-style: none; padding: 0; margin: 0; font-size: 0.875rem; }}
    nav.toc a {{ color: #2563eb; text-decoration: none; }}
    nav.toc a:hover {{ text-decoration: underline; }}
    nav.toc .count {{ color: #6b7280; font-size: 0.75rem; }}
    main {{ padding: 16px 24px; }}
    section.flow {{ background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px; }}
    section.flow h2 {{ margin: 0 0 12px; font-size: 1rem; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }}
    section.flow .count {{ color: #6b7280; font-weight: normal; font-size: 0.875rem; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }}
    figure.shot {{ margin: 0; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; background: #f9fafb; }}
    figure.shot.blank {{ border-color: #ef4444; background: #fef2f2; }}
    figure.shot img {{ width: 100%; display: block; }}
    figure.shot figcaption {{ padding: 8px 10px; font-size: 0.75rem; color: #374151; line-height: 1.4; }}
    figure.shot code {{ background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 0.7rem; }}
    figure.shot .kb {{ float: right; color: #6b7280; }}
    figure.shot.blank .kb {{ color: #dc2626; font-weight: 600; }}
  </style>
</head>
<body>
  <header>
    <h1>XIIGen — Playwright Snapshot Gallery</h1>
    <p>{len(flows)} flows · {total_pngs} PNGs · red-bordered = blank (&lt;1 KB)</p>
  </header>
  <div class="layout">
    <nav class="toc">
      <ul>
{flow_links}
      </ul>
    </nav>
    <main>
{chr(10).join(sections)}
    </main>
  </div>
</body>
</html>
"""


def main() -> int:
    png_to_test = build_png_to_test_index()
    flows = collect_flows()
    html_doc = render_html(flows, png_to_test)
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(html_doc, encoding="utf-8")
    total_pngs = sum(len(p) for _, p in flows)
    blanks = sum(1 for _, pngs in flows for p in pngs if p.stat().st_size < 1024)
    unresolved = sum(1 for _, pngs in flows for p in pngs if png_to_test.get(p.name, "(unresolved)") == "(unresolved)")
    print(f"wrote {OUT_FILE.relative_to(ROOT)} — {len(flows)} flows, {total_pngs} PNGs, {blanks} blanks, {unresolved} unresolved-test")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
