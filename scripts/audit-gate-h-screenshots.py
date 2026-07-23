#!/usr/bin/env python3
"""
Gate H auditor — Every action test must have a pre-action screenshot AND a post-action screenshot.

An "action test" is a Playwright test() block that contains `.click()`, `.fill(`, `.press(`,
`.selectOption(`, or `.check(` on a Locator.

For each action test block:
  - PRE  = screenshot call that appears BEFORE the first action in the test
  - POST = screenshot call that appears AFTER the last action in the test

Reports, per spec file, rows that are missing PRE or POST.

Usage:
  python scripts/audit-gate-h-screenshots.py            # prints report
  python scripts/audit-gate-h-screenshots.py --json     # emits machine-readable report
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLIENT_E2E = ROOT / "client" / "e2e"

# Action patterns — everything the user can do to mutate UI state
ACTION_RE = re.compile(r"\.(click|fill|press|selectOption|check|uncheck|setInputFiles|type)\s*\(")
SCREENSHOT_RE = re.compile(r"\bpage\.screenshot\s*\(")
TEST_START_RE = re.compile(
    r"""(?m)^\s*test\s*(?:\.(?:only|skip|fixme|slow))?\s*\(\s*['"]([^'"]+)['"]"""
)


def parse_test_blocks(text: str) -> list[tuple[str, int, int]]:
    """Return list of (name, body_start, body_end) — test() callback body bounds.

    For `test('name', async ({ page }) => { <body> })`, we want the braces of <body>,
    not the destructure `{ page }`. Strategy: find the `=>` token that opens the
    arrow function body, then walk braces from there.
    """
    blocks: list[tuple[str, int, int]] = []
    for m in TEST_START_RE.finditer(text):
        name = m.group(1)
        # Find `=>` then next `{` (arrow function body). Fallback: next `{` if no arrow.
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


def audit_block(body: str) -> dict:
    actions = [m.start() for m in ACTION_RE.finditer(body)]
    shots = [m.start() for m in SCREENSHOT_RE.finditer(body)]
    if not actions:
        return {"is_action_test": False}
    first_action = min(actions)
    last_action = max(actions)
    pre = any(s < first_action for s in shots)
    post = any(s > last_action for s in shots)
    return {
        "is_action_test": True,
        "actions": len(actions),
        "screenshots": len(shots),
        "pre": pre,
        "post": post,
    }


def audit_file(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    rows: list[dict] = []
    for name, start, end in parse_test_blocks(text):
        body = text[start:end]
        info = audit_block(body)
        if not info.get("is_action_test"):
            continue
        if not info["pre"] or not info["post"]:
            rows.append({
                "spec": str(path.relative_to(ROOT)).replace("\\", "/"),
                "test": name,
                "actions": info["actions"],
                "screenshots": info["screenshots"],
                "pre_action_shot": info["pre"],
                "post_action_shot": info["post"],
            })
    return rows


def main() -> int:
    emit_json = "--json" in sys.argv
    all_rows: list[dict] = []
    if not CLIENT_E2E.exists():
        print("no client/e2e directory found")
        return 2
    for spec in sorted(CLIENT_E2E.glob("*.spec.ts")):
        all_rows.extend(audit_file(spec))

    if emit_json:
        print(json.dumps(all_rows, indent=2))
        return 0

    print(f"Gate H audit — {len(all_rows)} action tests missing pre- or post-action screenshot")
    print("=" * 80)
    by_spec: dict[str, list[dict]] = {}
    for r in all_rows:
        by_spec.setdefault(r["spec"], []).append(r)
    for spec, rows in sorted(by_spec.items()):
        print(f"\n{spec} ({len(rows)})")
        for r in rows:
            flags: list[str] = []
            if not r["pre_action_shot"]:
                flags.append("NO-PRE")
            if not r["post_action_shot"]:
                flags.append("NO-POST")
            print(f"   [{' / '.join(flags)}]  {r['test']}  (actions={r['actions']}, shots={r['screenshots']})")
    return 0 if not all_rows else 1


if __name__ == "__main__":
    raise SystemExit(main())
