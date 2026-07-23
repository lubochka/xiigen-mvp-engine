# Flow UI examination — FLOW-35 meta-arbitration-engine

## Date: 2026-04-20 · Run: RUN-56 · Batch: B (Grammar 2 Verdict Grid)

## One-sentence spec (F1)
> When a generation round completes with arbiter scores, apply cross-cutting
> meta-arbiter policies — spend limits, security gates, improvement detection,
> [...] and compute the final arbitration verdict.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-07.md`)
- **platform-admin** — primary; reviews meta-arbiter verdicts, overrides when necessary
- **platform-support** — read-only audit
- All other roles excluded (engine-internal)

## State inventory (F2)
17 processes. Meta-arbiter panel for cross-cutting decisions. Per-round
verdict is a matrix: arbiter × dimension (cost / safety / quality / drift).

## Grammar
**G2 Verdict Grid** — pending rounds × arbiter cells, per-cell
APPROVED/REJECTED/NEEDS_REVISION.
Reference: **GitHub PR review (reviewers × files), Linear issue approval, Gerrit code review**.

## Classification
- **Q1 CRUD?** Likely — MetaArbitrationEnginePage → AdminCrudPanel default.
- **Q2 Error/empty?** Empty meta-arbiter queue without pending rounds should be celebrated.
- **Q3 Engineering leak?** High risk — "arbiter scores", "meta-arbiter policies", "drift detection" are internal concepts; translate to: "AI review scores", "Cross-cutting policies", "Drift alerts".
- **Q4 Role-correct?** ✅ 2-role scope is tight.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — verdict grid rebuild;
NEEDS_LABEL_SANITISATION (P1) for arbiter jargon.

## 13 existing PNGs
See PNG-INVENTORY FLOW-35 section. Retained until verdict-grid rebuild.

## Planned fixes (deferred)

**P0 — Verdict Grid for pending rounds:**
- Left column: pending generation rounds (newest first)
- Main panel: per-round arbiter × dimension matrix
  - Rows: arbiters (5-arbiter-consensus panel)
  - Columns: cost-limit / safety / quality / drift / improvement
  - Cells: APPROVED ✅ / REJECTED ❌ / NEEDS_REVISION 🟡
- Consensus verdict + action row (Approve / Override / Escalate / Defer)

**P1 — Label sanitisation:** "arbiter" → "reviewer"; "drift" → "Model consistency"; "meta-arbiter policies" → "Cross-cutting review policies".

**P1 — Inbox-zero empty state:** "All rounds cleared."
