#!/usr/bin/env python3
"""
Generate skeleton page stubs for MISSING flows (TENANT or ADMIN).

For each flow, creates `client/src/pages/{slug}/{Name}Page.tsx` with:
  - useSearchParams mock-state pattern
  - data-testid="page-{slug}" on outer div
  - One rendered block per P1 state, driven by ?mock=<state>
  - data-testid="{slug}-state-{N}" per P1 item

Prints suggested import + route block to paste into App.tsx.

Usage:
  python scripts/gen-missing-stub-pages.py --flows FLOW-13 FLOW-14 ...
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SESSIONS_DIR = ROOT / "docs" / "sessions"
FLOW_COVERAGE = ROOT / "docs" / "flow-coverage"
CLIENT_PAGES = ROOT / "client" / "src" / "pages"


def load_automation(flow_id: str) -> dict:
    return json.load(open(SESSIONS_DIR / flow_id / "flow-ui-automation.json", encoding="utf-8"))


def read_p1_items(slug: str) -> list[str]:
    p = FLOW_COVERAGE / slug / "P1-business-logic-inventory.md"
    if not p.exists():
        return []
    text = p.read_text(encoding="utf-8")
    return [m.group(2).strip() for m in re.finditer(r"^\s*(\d+)\.\s+(.+?)$", text, re.MULTILINE)]


def camel(slug: str) -> str:
    return "".join(p.capitalize() for p in re.split(r"[^a-zA-Z0-9]+", slug))


def short_label(state: str) -> str:
    """Truncate state for use as JSX content; escape < > that would confuse the parser."""
    # Drop inside-backticks for readability
    s = re.sub(r"`[^`]+`", "", state)
    s = re.sub(r"\s+", " ", s).strip()
    s = (s[:80] + "…") if len(s) > 80 else s
    # Neutralise JSX-sensitive chars (angle brackets and braces)
    s = s.replace("<", "‹").replace(">", "›").replace("{", "❴").replace("}", "❵")
    return s


def mock_key(state: str, idx: int) -> str:
    """Stable mock query-param value from state."""
    words = re.findall(r"[a-zA-Z]+", state.lower())[:3]
    words = [w for w in words if w not in {"the", "a", "an", "of", "to", "and", "or", "from", "for",
                                           "with", "when", "via", "on", "state", "event", "user"}]
    if not words:
        return f"state{idx}"
    return "-".join(words[:2])


def render_stub(flow_id: str, slug: str, display_name: str, p1_items: list[str]) -> str:
    comp = camel(slug) + "Page"
    # Build per-state mock blocks
    state_blocks = []
    mock_keys = []
    for i, state in enumerate(p1_items, 1):
        mk = mock_key(state, i)
        # de-dup
        j = 1
        orig = mk
        while mk in mock_keys:
            j += 1
            mk = f"{orig}-{j}"
        mock_keys.append(mk)
        label = short_label(state).replace("'", "\\'")
        state_blocks.append(
f"""          {{mockState === '{mk}' && (
            <div data-testid="{slug}-state-{i}" className="p-4 border border-gray-300 rounded mb-2">
              <p className="text-sm text-gray-500">State {i}</p>
              <p className="text-gray-900">{label}</p>
            </div>
          )}}"""
        )
    state_jsx = "\n".join(state_blocks) if state_blocks else ""
    mock_list = ", ".join(f"'{k}'" for k in mock_keys)

    return f"""/**
 * {comp} — {flow_id} stub for {display_name} ({slug}).
 *
 * MISSING UI filled in by gen-missing-stub-pages.py to unblock P6/P8 routing + tests.
 * Each Phase-1 business state renders when ?mock=<key> matches.
 *
 * Data-testid contract:
 *   page-{slug} on outer div
 *   {slug}-state-<N> per Phase-1 state (N = 1..{len(p1_items)})
 *
 * Mock keys ({len(mock_keys)}): {mock_list or "(none)"}
 */

import React from 'react';
import {{ useSearchParams }} from 'react-router-dom';

export function {comp}() {{
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  return (
    <div
      data-testid="page-{slug}"
      className="max-w-3xl mx-auto mt-8 p-6 bg-white rounded-lg shadow"
    >
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{display_name}</h1>
        <p className="text-sm text-gray-500">Flow {flow_id} · <code>{slug}</code></p>
      </header>

      {{!mockState && (
        <div data-testid="{slug}-default" className="p-4 bg-gray-50 border border-gray-200 rounded">
          <p className="text-gray-700">
            {display_name} UI stub. Select a state via <code>?mock=&lt;key&gt;</code> to preview.
          </p>
          <ul className="mt-3 text-xs text-gray-500 space-y-1">
            {{[{mock_list}].map((k) => (
              <li key={{k}}>
                <a href={{`?mock=${{k}}`}} className="text-blue-600 hover:underline">?mock={{k}}</a>
              </li>
            ))}}
          </ul>
        </div>
      )}}

{state_jsx}
    </div>
  );
}}
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--flows", nargs="+", required=True, help="FlowIds, e.g. FLOW-13 FLOW-14")
    args = ap.parse_args()

    import_lines = []
    route_lines = []
    for fid in args.flows:
        auto = load_automation(fid)
        slug = auto["slug"]
        classification = auto["classification"]
        display_name = auto["displayName"]
        p1 = read_p1_items(slug)
        if not p1:
            print(f"{fid}: no P1 items, skipping")
            continue
        comp = camel(slug) + "Page"
        out_dir = CLIENT_PAGES / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{comp}.tsx"
        out_path.write_text(render_stub(fid, slug, display_name, p1), encoding="utf-8")
        route_prefix = "/admin/" if classification in ("ENGINE_INTERNAL", "ADMIN_FACING") else "/"
        route = f"{route_prefix}{slug}"
        import_lines.append(f"import {{ {comp} }} from './pages/{slug}/{comp}';  // {fid}")
        route_lines.append(f'<Route path="{route}" element={{<{comp} />}} />  // {fid}')
        print(f"+ wrote {out_path.relative_to(ROOT)}  ({len(p1)} states)")

    print("\n--- Imports to add to App.tsx ---")
    for l in import_lines:
        print(l)
    print("\n--- Routes to add to App.tsx ---")
    for l in route_lines:
        print(l)
    return 0


if __name__ == "__main__":
    sys.exit(main())
