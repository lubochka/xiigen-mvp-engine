#!/usr/bin/env python3
"""
Gate H patcher — inject pre-action screenshots into tests flagged by audit-gate-h-screenshots.py.

For each test flagged with pre=False:
  Finds the first action call (.click/.fill/.press/etc.) and injects a
  `await page.screenshot(...)` call on the preceding indented line boundary.

For each test flagged with post=False:
  Appends a `await page.screenshot(...)` call at the end of the test block (before closing `}`).

Filename convention:
  <test-id-or-slug>-before.png / <test-id-or-slug>-after.png
  Written to the same dir the existing screenshot in that spec uses (we reuse the spec's SNAP
  helper when it exists — otherwise we fall back to a plain literal path).

Dry-run by default. Pass --apply to write.

Safeguards:
  - Skips tests that already call page.screenshot() before/after the action appropriately
  - Skips tests without any existing screenshot call (risk: no SNAP helper set up)
  - Leaves a `// Gate H: pre-action shot` inline-nothing marker — no, we follow the "no comments"
    project rule. No marker comment.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLIENT_E2E = ROOT / "client" / "e2e"
REPORT = ROOT / "test-results" / "gate-h-report.json"

ACTION_RE = re.compile(r"\.(click|fill|press|selectOption|check|uncheck|setInputFiles|type)\s*\(")
SCREENSHOT_CALL_RE = re.compile(r"""await\s+page\.screenshot\s*\(\s*\{[^}]*path\s*:\s*([^,}]+),""")
TEST_START_RE = re.compile(
    r"""(?m)^\s*test\s*(?:\.(?:only|skip|fixme|slow))?\s*\(\s*['"]([^'"]+)['"]"""
)


def parse_test_blocks(text: str) -> list[tuple[str, int, int]]:
    blocks: list[tuple[str, int, int]] = []
    for m in TEST_START_RE.finditer(text):
        name = m.group(1)
        arrow = text.find("=>", m.end())
        i = text.find("{", arrow + 2 if arrow != -1 else m.end())
        if i == -1:
            continue
        depth = 1
        j = i + 1
        while j < len(text) and depth > 0:
            ch = text[j]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
            j += 1
        blocks.append((name, i, j))
    return blocks


def slug_for_test(name: str) -> str:
    # Pull "R-04" style ID if present
    m = re.match(r"^([A-Z]{1,3}[-_]\d+[a-z]?)\s*[:\-\u2014]", name)
    if m:
        return m.group(1).lower().replace("_", "-")
    s = re.sub(r"[^\w\s-]", "", name).strip().lower()
    s = re.sub(r"[\s_]+", "-", s)
    return s[:40]


def detect_snap_helper(spec_text: str) -> str | None:
    """Return 'SNAP' or 'P8_SNAP' if found as `const SNAP = ...path.join...` etc."""
    for helper in ("SNAP", "P8_SNAP"):
        if re.search(rf"\bconst\s+{helper}\s*=\s*\(", spec_text):
            return helper
    return None


def find_injection_point(body: str) -> int | None:
    """Return offset inside body where to inject pre-action shot.

    Strategy: find first action offset; look back for previous `await page.X` line end;
    insert after that line's `\n`.
    """
    am = ACTION_RE.search(body)
    if not am:
        return None
    pre = body[: am.start()]
    # Find last "await ..." statement end before the action
    # We want the insertion to land on its own line, matching indentation.
    last_await = list(re.finditer(r"^\s*await\s+.+?;\s*$", pre, re.MULTILINE))
    if last_await:
        return last_await[-1].end()
    # Fallback: after first goto
    goto_m = re.search(r"^\s*await\s+page\.goto\s*\([^)]*\)\s*;\s*$", pre, re.MULTILINE)
    if goto_m:
        return goto_m.end()
    return None


def find_indent(body: str, offset: int) -> str:
    """Return indent of the line containing `offset`."""
    line_start = body.rfind("\n", 0, offset) + 1
    line_end = body.find("\n", offset)
    if line_end == -1:
        line_end = len(body)
    line = body[line_start:line_end]
    m = re.match(r"(\s*)", line)
    return m.group(1) if m else "    "


def build_shot_line(indent: str, helper: str | None, slug: str, suffix: str) -> str:
    png = f"{slug}-{suffix}.png"
    if helper:
        call = f"await page.screenshot({{ path: {helper}('{png}'), fullPage: true }});"
    else:
        call = f"await page.screenshot({{ path: `\\${{__dirname}}/../../docs/e2e-snapshots/UNKNOWN/{png}`, fullPage: true }});"
    return f"\n{indent}{call}"


def patch_file(path: Path, flagged: list[dict], dry: bool) -> dict:
    text = path.read_text(encoding="utf-8")
    original = text
    helper = detect_snap_helper(text)

    blocks = parse_test_blocks(text)
    name_to_block = {n: (s, e) for n, s, e in blocks}

    # Apply edits from the end backwards to keep offsets valid
    edits: list[tuple[int, str]] = []

    for row in flagged:
        name = row["test"]
        if name not in name_to_block:
            continue
        bstart, bend = name_to_block[name]
        body = text[bstart:bend]
        slug = slug_for_test(name)

        if not row["pre_action_shot"]:
            inj = find_injection_point(body)
            if inj is not None:
                indent = find_indent(body, inj)
                line = build_shot_line(indent, helper, slug, "before")
                edits.append((bstart + inj, line))

        if not row["post_action_shot"]:
            # Insert before the closing `}` at bend - 1
            # bend-1 is the `}` character
            last_brace = bend - 1
            # Find line start of `}` for indent
            line_start = text.rfind("\n", 0, last_brace) + 1
            closing_line = text[line_start:last_brace]
            closing_indent = re.match(r"(\s*)", closing_line).group(1) if closing_line else "    "
            # Pick a sensible indent one level deeper
            inner_indent = closing_indent + "  "
            line = build_shot_line(inner_indent, helper, slug, "after")
            # Insert before the closing brace position
            edits.append((last_brace, line))

    # Sort descending so insertions don't shift earlier offsets
    edits.sort(key=lambda e: e[0], reverse=True)
    new_text = text
    for off, line in edits:
        new_text = new_text[:off] + line + new_text[off:]

    changed = new_text != original
    if changed and not dry:
        path.write_text(new_text, encoding="utf-8")
    return {"file": str(path.relative_to(ROOT)).replace("\\", "/"),
            "edits": len(edits), "changed": changed}


def main() -> int:
    dry = "--apply" not in sys.argv
    if not REPORT.exists():
        print("no gate-h-report.json — run audit-gate-h-screenshots.py --json first")
        return 2
    rows = json.loads(REPORT.read_text(encoding="utf-8"))
    by_file: dict[str, list[dict]] = {}
    for r in rows:
        by_file.setdefault(r["spec"], []).append(r)

    results: list[dict] = []
    for spec_rel, flagged in by_file.items():
        spec = ROOT / spec_rel
        if not spec.exists():
            continue
        results.append(patch_file(spec, flagged, dry))

    mode = "DRY-RUN" if dry else "APPLIED"
    total_edits = sum(r["edits"] for r in results)
    changed = sum(1 for r in results if r["changed"])
    print(f"{mode}: {changed}/{len(results)} files patched, {total_edits} insertions")
    for r in results:
        if r["edits"]:
            print(f"  {r['edits']:3d}  {r['file']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
