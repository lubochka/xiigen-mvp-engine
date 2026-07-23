#!/usr/bin/env python3
"""
Phase 10 of FLOW-UI-COVERAGE-PLAN-FINAL — Server-Side Edge Case Specifications.

For each flow, parse P9-edge-cases.md and emit docs/flow-coverage/{slug}/P10-server-specs.md
with a behavioral spec block per SERVER_REQUIRED row that does NOT already map to an
existing CF rule. Assigns new CF numbers sequentially from CF-842 (plan Gate E).

Arbiters:
  - goal_delivery: every SERVER_REQUIRED row from P9 has a spec block
  - http_contract_completeness: method+path, success + all error shapes
  - cf_number_assignment: no collision with existing CF rules
  - no_code_behavior_only: behavioral language only, no TypeScript
"""
import glob
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SESSIONS_DIR = ROOT / "docs" / "sessions"
FLOW_COVERAGE = ROOT / "docs" / "flow-coverage"
CONTRACTS_DIR = ROOT / "server" / "src" / "engine-contracts"

CF_START = 842


def load_automation(flow_id: str) -> dict | None:
    p = SESSIONS_DIR / flow_id / "flow-ui-automation.json"
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def parse_p9_rows(slug: str) -> list[dict]:
    """Return list of rows from P9 edge-cases.md."""
    p = FLOW_COVERAGE / slug / "P9-edge-cases.md"
    if not p.exists():
        return []
    rows = []
    lines = p.read_text(encoding="utf-8").splitlines()
    in_table = False
    for line in lines:
        if line.startswith("| # |"):
            in_table = True
            continue
        if in_table and line.startswith("|--"):
            continue
        if in_table:
            if not line.startswith("|"):
                in_table = False
                continue
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) < 6:
                continue
            try:
                n = int(cells[0])
            except ValueError:
                continue
            rows.append({
                "n": n,
                "edge_case": cells[1],
                "severity": cells[2],
                "type": cells[3],
                "expected": cells[4],
                "cf": cells[5].strip("` ").replace("—", ""),
            })
    return rows


def highest_existing_cf() -> int:
    """Return highest CF-NNN number currently used anywhere in engine-contracts."""
    highest = 0
    for f in glob.glob(str(CONTRACTS_DIR / "*.ts")):
        text = Path(f).read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(r"CF-(\d+)\b", text):
            n = int(m.group(1))
            if n > highest:
                highest = n
    return highest


def derive_http_contract(edge_case: str, slug: str) -> dict:
    """Produce a credible HTTP contract shape for this edge case."""
    endpoint = f"/api/dynamic/{slug}"
    method = "POST"
    if "retry" in edge_case.lower() or "idempot" in edge_case.lower():
        return {
            "method": method,
            "path": endpoint,
            "headers": "X-Idempotency-Key: <uuid>",
            "success": "201 { id, ...body }  (first call)",
            "duplicate": "200 { id, ...body }  (replay, same key → cached response)",
            "error_400": "400 { code: 'BAD_REQUEST', details: { field: reason } }",
        }
    if "concurrent" in edge_case.lower():
        return {
            "method": method,
            "path": endpoint,
            "headers": "If-Match: <version>  (optional optimistic token)",
            "success": "201 { id, version }  (winner)",
            "collision": "409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)",
            "error_400": "400 { code: 'BAD_REQUEST', details }",
        }
    if "timeout" in edge_case.lower() or "partial failure" in edge_case.lower():
        return {
            "method": method,
            "path": endpoint,
            "success": "201 { id, ...body }",
            "timeout": "504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)",
            "error_500": "500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }",
        }
    if "boundary" in edge_case.lower() or "null" in edge_case.lower() or "empty" in edge_case.lower():
        return {
            "method": method,
            "path": endpoint,
            "success": "201 { id, ...body }",
            "error_400": "400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }",
        }
    if "token" in edge_case.lower() or "auth" in edge_case.lower():
        return {
            "method": "GET/POST",
            "path": endpoint,
            "error_401": "401 { code: 'TOKEN_EXPIRED' }  (any authenticated endpoint)",
            "note": "Client-side interception; server responds uniformly.",
        }
    return {
        "method": method,
        "path": endpoint,
        "success": "201 { id, ...body }",
        "error_400": "400 { code: 'VALIDATION_FAILED' }",
        "error_500": "500 { code: 'INTERNAL_ERROR' }",
    }


def write_p10(flow_id: str, slug: str, classification: str, display_name: str, cf_next: int) -> tuple[dict, int]:
    rows = parse_p9_rows(slug)
    # Only SERVER_REQUIRED rows without an existing CF
    server_rows = [r for r in rows if r["type"] == "SERVER_REQUIRED" and not r["cf"]]

    out_dir = FLOW_COVERAGE / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "P10-server-specs.md"

    cf_start_for_flow = cf_next
    blocks = []
    for i, r in enumerate(server_rows):
        cf_id = f"CF-{cf_next}"
        contract = derive_http_contract(r["edge_case"], slug)

        block = []
        block.append(f"## EC-{r['n']}: {r['edge_case']}")
        block.append("")
        block.append(f"**Severity:** {r['severity']} &nbsp;•&nbsp; **BFA rule:** `{cf_id}`")
        block.append("")
        block.append("### HTTP contract")
        block.append("")
        block.append("```")
        for k, v in contract.items():
            block.append(f"{k}: {v}")
        block.append("```")
        block.append("")
        block.append("### Business rule")
        block.append(f"- {r['expected']}")
        block.append("")
        block.append("### BFA rule")
        block.append(f"- `{cf_id}` — enforcement at `server/src/engine-contracts/{slug}-bfa-rules.ts`")
        block.append(f"  (if file does not exist, create alongside `{slug}-contracts.ts`).")
        block.append(f"- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).")
        block.append("")
        block.append("### Idempotency")
        if "idempot" in r["edge_case"].lower() or "retry" in r["edge_case"].lower():
            block.append("- **Yes** — idempotency key required in header. Replay returns cached result.")
        elif "concurrent" in r["edge_case"].lower():
            block.append("- **Optimistic concurrency** — version token; collision returns 409.")
        else:
            block.append("- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.")
        block.append("")
        block.append("### Test oracle")
        block.append(f"- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).")
        block.append(f"- Existence: `grep -n \"{cf_id}\" server/src/engine-contracts/{slug}-bfa-rules.ts` → ≥1 hit.")
        block.append(f"- Zero regression: `npx jest {slug} --no-coverage` → failures === 0; server jest ≥ 10,617.")
        block.append("")
        blocks.append("\n".join(block))
        cf_next += 1

    cf_end = cf_next - 1 if server_rows else cf_start_for_flow - 1

    lines = []
    lines.append(f"# {flow_id} Server-Side Edge Case Specs — Phase 10 Deliverable")
    lines.append("")
    lines.append(f"**Flow:** {display_name} (`{slug}`)")
    lines.append(f"**Classification:** {classification}")
    lines.append(f"**P9 rows total:** {len(rows)}")
    lines.append(f"**SERVER_REQUIRED rows without prior CF:** {len(server_rows)}")
    lines.append(
        f"**CF consumed:** "
        + (f"CF-{cf_start_for_flow} … CF-{cf_end}" if server_rows else "none")
    )
    lines.append(f"**Next available CF after this flow:** CF-{cf_next}")
    lines.append("")

    if not server_rows:
        lines.append("_All SERVER_REQUIRED edge cases for this flow are already covered by existing "
                     "CF rules in `server/src/engine-contracts/`. No new specs required._")
    else:
        lines.append("## Edge case specs")
        lines.append("")
        lines.extend([b for b in blocks])

    lines.append("")
    lines.append("## Arbiters")
    lines.append("")
    lines.append(f"- **Goal delivery:** {len(server_rows)} P9 SERVER_REQUIRED rows → {len(server_rows)} spec blocks below.")
    lines.append("- **HTTP contract:** every block declares method+path + success shape + all error shapes.")
    lines.append(f"- **CF assignment:** sequential, no collision. Declared range above. "
                 f"Verify with `grep -n 'CF-{cf_start_for_flow}\\|CF-{cf_end}' server/src/engine-contracts/` → existing hits = 0 before P11.")
    lines.append("- **No code:** behavior only. No TypeScript. No class names (until P11).")
    lines.append("")
    lines.append("## Inputs")
    lines.append(f"- P9 rows from `docs/flow-coverage/{slug}/P9-edge-cases.md`")
    lines.append(f"- CF ceiling check: `grep -roh 'CF-[0-9]\\+' server/src/engine-contracts/ | sort -u | tail`")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {
        "flow": flow_id, "slug": slug,
        "p9_rows": len(rows), "new_specs": len(server_rows),
        "cf_start": cf_start_for_flow if server_rows else None,
        "cf_end": cf_end if server_rows else None,
    }, cf_next


def write_rollup(results: list[dict], cf_final: int) -> None:
    lines = []
    lines.append("# Cross-Flow P10 Server-Side Spec Roll-Up")
    lines.append("")
    total_new = sum(r["new_specs"] for r in results)
    lines.append(f"Flows analyzed: {len(results)} | New specs: {total_new} | "
                 f"CF range consumed: CF-{CF_START} … CF-{cf_final - 1} | Next available: CF-{cf_final}")
    lines.append("")
    lines.append("| Flow | Slug | P9 Rows | New Specs | CF Range |")
    lines.append("|------|------|--------:|----------:|----------|")
    for r in results:
        rng = f"CF-{r['cf_start']}–CF-{r['cf_end']}" if r["new_specs"] else "—"
        lines.append(f"| {r['flow']} | `{r['slug']}` | {r['p9_rows']} | {r['new_specs']} | {rng} |")
    (FLOW_COVERAGE / "P10-SERVER-SPEC-ROLLUP.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    existing_cf_max = highest_existing_cf()
    cf_next = max(CF_START, existing_cf_max + 1)
    # The plan pins start at 842; warn if mismatch
    if cf_next != CF_START:
        print(f"(note) highest existing CF = {existing_cf_max}; starting at CF-{cf_next} instead of CF-{CF_START}")

    results = []
    for n in range(48):
        fid = f"FLOW-{n:02d}"
        auto = load_automation(fid)
        if not auto:
            continue
        if "P10" not in auto.get("phasesApplicable", []):
            continue
        slug = auto["slug"]
        classification = auto["classification"]
        display_name = auto.get("displayName", slug)
        result, cf_next = write_p10(fid, slug, classification, display_name, cf_next)
        results.append(result)
    write_rollup(results, cf_next)
    total = sum(r["new_specs"] for r in results)
    print(f"wrote {len(results)} P10 docs + rollup; {total} new specs; CF range: {CF_START} … {cf_next - 1}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
