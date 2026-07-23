#!/usr/bin/env python3
"""
Phase 11 — Implementation readiness inventory.

Implementation of 258 new BFA rules across 47 flows is a multi-session
engineering effort. This generator emits a readiness report per flow + a
cross-flow rollup that shows exactly what P11 must deliver:

  - Existing CF rules already registered in server/src/engine-contracts/{slug}*.ts
  - New CF rules specified in P10 but not yet registered
  - Whether the flow has a *-bfa-rules.ts file to extend
  - Server test baseline touch-point

Output:
  docs/flow-coverage/{slug}/P11-impl-readiness.md
  docs/flow-coverage/P11-IMPL-READINESS-ROLLUP.md
"""
import glob
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SESSIONS_DIR = ROOT / "docs" / "sessions"
FLOW_COVERAGE = ROOT / "docs" / "flow-coverage"
CONTRACTS_DIR = ROOT / "server" / "src" / "engine-contracts"
TEST_DIR = ROOT / "server" / "test"


def load_automation(flow_id: str) -> dict | None:
    p = SESSIONS_DIR / flow_id / "flow-ui-automation.json"
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def parse_p10_cf_range(slug: str) -> tuple[list[str], int]:
    """Return (cf_list, new_spec_count) from P10 doc."""
    p = FLOW_COVERAGE / slug / "P10-server-specs.md"
    if not p.exists():
        return [], 0
    text = p.read_text(encoding="utf-8")
    m_range = re.search(r"CF consumed:\s*\*\*\s*CF-(\d+)\s*…\s*CF-(\d+)", text) or \
              re.search(r"CF consumed:.*?CF-(\d+)\s*…\s*CF-(\d+)", text)
    m_count = re.search(r"SERVER_REQUIRED rows without prior CF:\*\*\s*(\d+)", text)
    count = int(m_count.group(1)) if m_count else 0
    if m_range:
        start, end = int(m_range.group(1)), int(m_range.group(2))
        return [f"CF-{n}" for n in range(start, end + 1)], count
    return [], count


def existing_cf_rules_for_slug(slug: str) -> list[str]:
    files = sorted(glob.glob(str(CONTRACTS_DIR / f"{slug}*.ts")))
    rules = set()
    for f in files:
        text = Path(f).read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(r"ruleId:\s*['\"](CF-[A-Z0-9-]+)['\"]", text):
            rules.add(m.group(1))
    return sorted(rules)


def bfa_rules_file(slug: str) -> str | None:
    p = CONTRACTS_DIR / f"{slug}-bfa-rules.ts"
    return str(p.relative_to(ROOT)).replace("\\", "/") if p.exists() else None


def test_dir_for_slug(slug: str) -> str | None:
    p = TEST_DIR / slug
    return str(p.relative_to(ROOT)).replace("\\", "/") if p.exists() else None


def write_p11(flow_id: str, slug: str, classification: str, display_name: str) -> dict:
    new_cfs, new_count = parse_p10_cf_range(slug)
    existing_cfs = existing_cf_rules_for_slug(slug)
    bfa_file = bfa_rules_file(slug)
    test_dir = test_dir_for_slug(slug)

    out_dir = FLOW_COVERAGE / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "P11-impl-readiness.md"

    if new_cfs:
        cf_range_str = f"{new_cfs[0]} … {new_cfs[-1]}"
    else:
        cf_range_str = "(none — P10 had no new specs for this flow)"

    lines = []
    lines.append(f"# {flow_id} Server-Side Implementation Readiness — Phase 11")
    lines.append("")
    lines.append(f"**Flow:** {display_name} (`{slug}`)")
    lines.append(f"**Classification:** {classification}")
    lines.append("")
    lines.append("## Existing CF rules")
    lines.append("")
    lines.append(f"- BFA rules file: `{bfa_file}`" if bfa_file else
                 "- BFA rules file: **MISSING** — P11 must create "
                 f"`server/src/engine-contracts/{slug}-bfa-rules.ts`")
    lines.append(f"- Existing CF rules registered: {len(existing_cfs)} "
                 f"({', '.join(f'`{c}`' for c in existing_cfs[:10])}"
                 f"{' …' if len(existing_cfs) > 10 else ''})")
    lines.append(f"- Test directory: `{test_dir}`" if test_dir else
                 f"- Test directory: **MISSING** — P11 must create `server/test/{slug}/`")
    lines.append("")
    lines.append("## New rules from Phase 10")
    lines.append("")
    lines.append(f"- Count: {new_count}")
    lines.append(f"- CF range: {cf_range_str}")
    if new_cfs:
        lines.append("- Rules to register:")
        for cf in new_cfs:
            lines.append(f"  - `{cf}` — spec block in "
                         f"`docs/flow-coverage/{slug}/P10-server-specs.md`")
    lines.append("")
    lines.append("## Implementation checklist (per CF)")
    lines.append("")
    lines.append("Each new CF requires the following before P11 closes:")
    lines.append("")
    lines.append("1. **Rule registration** — append entry to "
                 f"`server/src/engine-contracts/{slug}-bfa-rules.ts` "
                 "(ruleId, flowId, type, description, violationSeverity, connectionType, "
                 "knowledgeScope, tenantId=MASTER_TENANT_ID).")
    lines.append("2. **Service enforcement** — code in `server/src/engine/flows/" + slug + "/` "
                 "that triggers BFA rule at the relevant decision point. "
                 "DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.")
    lines.append("3. **Unit test** — `server/test/" + slug + "/` with happy path + edge + idempotency.")
    lines.append("4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.")
    lines.append("5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.")
    lines.append("")
    lines.append("## Arbiters")
    lines.append("")
    lines.append(f"- **Goal delivery:** {new_count} P10 specs → {new_count} registered CF rules + {new_count} service "
                 f"enforcement blocks + {new_count} unit tests.")
    lines.append("- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.")
    lines.append("- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.")
    lines.append("- **CF match:** `grep -n 'CF-{N}' " + (bfa_file or f"server/src/engine-contracts/{slug}-bfa-rules.ts") + "` → ≥1 hit per new CF.")
    lines.append("- **Test gate:** failures === 0. Server jest ≥ 10,617.")
    lines.append("")
    lines.append("## Status")
    lines.append("")
    if new_count == 0:
        lines.append("- **READY: no new rules required.** All existing SERVER_REQUIRED cases are covered by "
                     "the flow's existing CF rules. P11 closes without further implementation.")
    else:
        lines.append(f"- **PENDING:** {new_count} rules specified in P10, not yet implemented. "
                     f"Estimated effort: {new_count * 2}h–{new_count * 4}h depending on service complexity.")
        lines.append(f"- Blocker: none. `{bfa_file or 'BFA rules file'}` can be extended incrementally.")
    lines.append("")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {
        "flow": flow_id, "slug": slug,
        "existing_cf": len(existing_cfs),
        "new_cf": new_count,
        "bfa_file_exists": bool(bfa_file),
        "test_dir_exists": bool(test_dir),
    }


def write_rollup(results: list[dict]) -> None:
    total_new = sum(r["new_cf"] for r in results)
    total_existing = sum(r["existing_cf"] for r in results)
    ready = sum(1 for r in results if r["new_cf"] == 0)
    pending = sum(1 for r in results if r["new_cf"] > 0)

    lines = []
    lines.append("# Cross-Flow P11 Implementation Readiness Roll-Up")
    lines.append("")
    lines.append(f"Flows analyzed: {len(results)} | READY: {ready} | PENDING: {pending} | "
                 f"Existing CF rules: {total_existing} | New CF rules to implement: {total_new}")
    lines.append("")
    lines.append("| Flow | Slug | Existing CF | New CF | BFA File | Test Dir | Status |")
    lines.append("|------|------|------------:|-------:|----------|----------|--------|")
    for r in results:
        bfa = "✅" if r["bfa_file_exists"] else "❌ CREATE"
        td = "✅" if r["test_dir_exists"] else "❌ CREATE"
        status = "READY" if r["new_cf"] == 0 else f"PENDING ({r['new_cf']})"
        lines.append(f"| {r['flow']} | `{r['slug']}` | {r['existing_cf']} | {r['new_cf']} | {bfa} | {td} | {status} |")
    lines.append("")
    lines.append("## Notes")
    lines.append("")
    lines.append("- **READY** flows need no new server code — P11 closes immediately for them.")
    lines.append(f"- **PENDING** flows cumulatively require {total_new} new rule registrations + enforcement blocks + unit tests.")
    lines.append("- Implementation batches: prioritize by severity of new CF (CRITICAL first) and by flow wave in execution order.")
    lines.append("- Each rule is additive; never modifies existing CF registrations.")
    (FLOW_COVERAGE / "P11-IMPL-READINESS-ROLLUP.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    results = []
    for n in range(48):
        fid = f"FLOW-{n:02d}"
        auto = load_automation(fid)
        if not auto:
            continue
        if "P11" not in auto.get("phasesApplicable", []):
            continue
        slug = auto["slug"]
        classification = auto["classification"]
        display_name = auto.get("displayName", slug)
        results.append(write_p11(fid, slug, classification, display_name))
    write_rollup(results)
    print(f"wrote {len(results)} P11 readiness docs + rollup")
    print(f"READY: {sum(1 for r in results if r['new_cf'] == 0)}, "
          f"PENDING: {sum(1 for r in results if r['new_cf'] > 0)}, "
          f"new rules: {sum(r['new_cf'] for r in results)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
