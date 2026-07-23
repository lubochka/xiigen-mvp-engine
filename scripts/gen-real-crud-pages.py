#!/usr/bin/env python3
"""
Refactor stub admin pages → hybrid pages using AdminCrudPanel.

Each target page:
  - Preserves existing mock-state rendering when ?mock=<key> is present
    (keeps legacy *-mock-states.spec.ts specs green)
  - Otherwise renders <AdminCrudPanel slug=... indexName=xiigen-<slug> ... />
  - Emits a matching {slug}-crud.spec.ts that exercises create → list → delete
    against /api/dynamic, auto-skipping when NestJS is unreachable

Usage:
  python scripts/gen-real-crud-pages.py --flows FLOW-00 FLOW-13 ...
  python scripts/gen-real-crud-pages.py --all-stubs      # all 28 detected stub pages
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SESSIONS = ROOT / "docs" / "sessions"
CLIENT_PAGES = ROOT / "client" / "src" / "pages"
CLIENT_E2E = ROOT / "client" / "e2e"
APP_TSX = ROOT / "client" / "src" / "App.tsx"

MOCK_KEYS_RE = re.compile(r"\[((?:'[^']+',?\s*)+)\]\.map")
STATE_BLOCK_RE = re.compile(
    r"\{mockState === '([^']+)' && \(\s*\n\s*<div data-testid=\"[^\"]+-state-(\d+)\"[^>]*>\s*\n\s*<p class[^>]*>State \d+</p>\s*\n\s*<p[^>]*>([^<]+)</p>",
    re.MULTILINE,
)
ROUTE_RE = re.compile(r'<Route\s+path="([^"]+)"\s+element=\{<(\w+)\s*/>\}')

DEFAULT_COLUMNS = [
    ("name", "Name"),
    ("status", "Status"),
    ("notes", "Notes"),
]
DEFAULT_FORM_FIELDS = [
    ("name", "Name", True, "text"),
    ("status", "Status", True, "text"),
    ("notes", "Notes", False, "textarea"),
]


def load_automation(flow_id: str) -> dict:
    return json.load(open(SESSIONS / flow_id / "flow-ui-automation.json", encoding="utf-8"))


def camel(slug: str) -> str:
    return "".join(p.capitalize() for p in re.split(r"[^a-zA-Z0-9]+", slug))


def read_stub_details(slug: str):
    """Return (page_path, mock_entries[(key, idx, label)]) or None if no stub pattern."""
    d = CLIENT_PAGES / slug
    if not d.exists():
        return None
    for tsx in d.glob("*.tsx"):
        text = tsx.read_text(encoding="utf-8", errors="ignore")
        if f'data-testid="page-{slug}"' not in text or "${k}" not in text:
            continue
        blocks = STATE_BLOCK_RE.findall(text)
        if not blocks:
            continue
        entries = [(k, int(i), lbl.strip()) for (k, i, lbl) in blocks]
        return tsx, entries
    return None


def read_app_routes() -> dict[str, str]:
    text = APP_TSX.read_text(encoding="utf-8", errors="ignore")
    return {m.group(2): m.group(1) for m in ROUTE_RE.finditer(text)}


def render_page(flow_id: str, slug: str, display_name: str,
                classification: str, entries: list[tuple[str, int, str]],
                comp_name: str) -> str:
    # Build mock states dict literal
    mock_lines = []
    for key, idx, label in entries:
        safe = label.replace("'", "\\'").replace("\\", "\\\\")
        mock_lines.append(f"  '{key}': {{ idx: {idx}, label: '{safe}' }},")
    mock_map = "\n".join(mock_lines)

    cls_val = classification if classification in ("TENANT_FACING", "ADMIN_FACING", "ENGINE_INTERNAL") else "ENGINE_INTERNAL"

    columns_jsx = ",\n        ".join(
        [f"{{ key: '{k}', label: '{lbl}' }}" for k, lbl in DEFAULT_COLUMNS]
    )
    form_jsx = ",\n        ".join(
        [f"{{ name: '{k}', label: '{lbl}'"
         + (f", required: true" if req else "")
         + (f", type: '{ftype}'" if ftype != "text" else "")
         + " }"
         for k, lbl, req, ftype in DEFAULT_FORM_FIELDS]
    )

    return f"""/**
 * {comp_name} — {flow_id} admin console for {display_name} ({slug}).
 *
 * Hybrid rendering:
 *   ?mock=<key>  → legacy Phase-1 state stub (keeps mock-states spec green)
 *   no ?mock     → real CRUD panel against xiigen-{slug}
 *
 * Tenant scope: MASTER_TENANT_ID (admin default).
 */

import React from 'react';
import {{ useSearchParams }} from 'react-router-dom';
import {{ AdminCrudPanel }} from '../../components/admin/AdminCrudPanel';

const MOCK_STATES: Record<string, {{ idx: number; label: string }}> = {{
{mock_map}
}};

export function {comp_name}() {{
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  if (mockState && MOCK_STATES[mockState]) {{
    const {{ idx, label }} = MOCK_STATES[mockState];
    return (
      <div
        data-testid="page-{slug}"
        className="max-w-3xl mx-auto mt-8 p-6 bg-white rounded-lg shadow"
      >
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{display_name}</h1>
          <p className="text-sm text-gray-500">
            Flow {flow_id} · <code>{slug}</code> · mock state {{idx}}
          </p>
        </header>
        <div
          data-testid={{`{slug}-state-${{idx}}`}}
          className="p-4 border border-gray-300 rounded"
        >
          <p className="text-sm text-gray-500">State {{idx}}</p>
          <p className="text-gray-900">{{label}}</p>
        </div>
      </div>
    );
  }}

  return (
    <AdminCrudPanel
      slug="{slug}"
      indexName="xiigen-{slug}"
      title="{display_name}"
      description="{flow_id} admin console backed by /api/dynamic/xiigen-{slug}."
      classification="{cls_val}"
      columns={{[
        {columns_jsx},
      ]}}
      formFields={{[
        {form_jsx},
      ]}}
    />
  );
}}
"""


def render_crud_spec(flow_id: str, slug: str, display_name: str, route: str) -> str:
    return f"""/**
 * {flow_id} — {display_name} Real-CRUD Round-Trip E2E
 *
 * Exercises /api/dynamic/xiigen-{slug} end-to-end.
 * Requires NestJS (docker compose up or `cd server && npm run start:dev`) + ES.
 * Auto-skipped when server is unreachable.
 */

import {{ test, expect }} from '@playwright/test';
import * as path from 'path';
import {{ fileURLToPath }} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', '{slug}', name);

const API = 'http://localhost:3000/api';
const INDEX = 'xiigen-{slug}';

test.describe('{flow_id} — {display_name} real CRUD', () => {{

  test.beforeAll(async ({{ request }}) => {{
    try {{
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    }} catch {{
      test.skip(true, 'Server unreachable — start `docker compose up` before this spec');
    }}
  }});

  test('C-01: list endpoint responds', async ({{ request }}) => {{
    const r = await request.get(`${{API}}/dynamic/${{INDEX}}?size=10`);
    expect(r.status()).toBeLessThan(500);
  }});

  test('C-02: create → list → delete round-trip', async ({{ page, request }}) => {{
    const name = `e2e-${{Date.now()}}`;
    const created = await request.post(`${{API}}/dynamic/${{INDEX}}`, {{
      data: {{ name, status: 'active', notes: 'created by {slug}-crud.spec.ts' }},
    }});
    expect(created.ok()).toBeTruthy();
    const createdBody = await created.json();
    const docId = String(createdBody?.data?._id ?? '');
    expect(docId).not.toBe('');

    await page.goto('{route}');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('page-{slug}')).toBeVisible();
    await expect(page.getByTestId(`{slug}-row-${{docId}}`)).toBeVisible();
    await page.screenshot({{ path: SNAP('crud-list-with-test-row.png'), fullPage: true }});

    const del = await request.delete(`${{API}}/dynamic/${{INDEX}}/${{docId}}`);
    expect(del.ok()).toBeTruthy();
  }});

  test('C-03: UI create form submits + refreshes list', async ({{ page, request }}) => {{
    await page.goto('{route}');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('{slug}-create-button').click();
    await expect(page.getByTestId('{slug}-form')).toBeVisible();

    const name = `ui-${{Date.now()}}`;
    await page.getByTestId('{slug}-form-name').fill(name);
    await page.getByTestId('{slug}-form-status').fill('active');
    await page.getByTestId('{slug}-form-notes').fill('created via UI form');

    const postResponse = page.waitForResponse(
      (r) => r.url().includes(`/api/dynamic/${{INDEX}}`) && r.request().method() === 'POST',
    );
    await page.getByTestId('{slug}-form-submit').click();
    const resp = await postResponse;
    expect(resp.ok()).toBeTruthy();

    await expect(page.getByTestId('{slug}-form')).toBeHidden();
    await page.screenshot({{ path: SNAP('crud-after-create.png'), fullPage: true }});

    const list = await request.get(`${{API}}/dynamic/${{INDEX}}?name=${{name}}`);
    expect(list.ok()).toBeTruthy();
    const body = await list.json();
    const rows = (body?.data ?? []) as Array<Record<string, unknown>>;
    const doc = rows.find((r) => r['name'] === name);
    expect(doc).toBeTruthy();
    if (doc) {{
      await request.delete(`${{API}}/dynamic/${{INDEX}}/${{String(doc['_id'])}}`);
    }}
  }});

  test('C-04: list or empty-state renders on load', async ({{ page }}) => {{
    await page.goto('{route}');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('page-{slug}')).toBeVisible();
    const listVisible = await page.getByTestId('{slug}-list').isVisible().catch(() => false);
    const emptyVisible = await page.getByTestId('{slug}-empty').isVisible().catch(() => false);
    expect(listVisible || emptyVisible).toBe(true);
    await page.screenshot({{ path: SNAP('crud-initial-load.png'), fullPage: true }});
  }});
}});
"""


def process_flow(flow_id: str, routes_map: dict[str, str]):
    auto = load_automation(flow_id)
    slug = auto["slug"]
    display = auto["displayName"]
    cls = auto["classification"]

    # Skip the hand-crafted template flow
    if slug == "feature-registry":
        return {"flowId": flow_id, "skipped": "template-already-refactored"}

    stub = read_stub_details(slug)
    if stub is None:
        return {"flowId": flow_id, "slug": slug, "skipped": "no-stub-pattern"}
    tsx_path, entries = stub

    comp_name = camel(slug) + "Page"
    page_source = render_page(flow_id, slug, display, cls, entries, comp_name)
    tsx_path.write_text(page_source, encoding="utf-8")

    # Find route
    route = routes_map.get(comp_name)
    if not route:
        return {"flowId": flow_id, "slug": slug, "skipped": f"no-route-for-{comp_name}"}

    # Write CRUD spec
    spec_path = CLIENT_E2E / f"{slug}-crud.spec.ts"
    spec_path.write_text(render_crud_spec(flow_id, slug, display, route), encoding="utf-8")

    return {
        "flowId": flow_id, "slug": slug, "route": route,
        "page": str(tsx_path.relative_to(ROOT)),
        "spec": str(spec_path.relative_to(ROOT)),
        "states": len(entries),
    }


def detect_stub_flows() -> list[str]:
    out = []
    for n in range(48):
        fid = f"FLOW-{n:02d}"
        try:
            auto = load_automation(fid)
        except FileNotFoundError:
            continue
        slug = auto["slug"]
        if read_stub_details(slug):
            out.append(fid)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--flows", nargs="*", help="Flow IDs")
    ap.add_argument("--all-stubs", action="store_true")
    args = ap.parse_args()

    routes_map = read_app_routes()
    if args.all_stubs:
        fids = detect_stub_flows()
    else:
        fids = args.flows or []
    if not fids:
        ap.error("Provide --flows ... or --all-stubs")

    results = []
    for fid in fids:
        try:
            r = process_flow(fid, routes_map)
        except FileNotFoundError:
            r = {"flowId": fid, "skipped": "no-automation-json"}
        results.append(r)
        if "skipped" in r:
            print(f"  {fid}: skip ({r['skipped']})")
        else:
            print(f"  {fid}: + {r['page']} + {r['spec']}  ({r['states']} mock states, route {r['route']})")

    done = [r for r in results if "skipped" not in r]
    print(f"\n{len(done)}/{len(results)} flows refactored to real CRUD")
    return 0


if __name__ == "__main__":
    sys.exit(main())
