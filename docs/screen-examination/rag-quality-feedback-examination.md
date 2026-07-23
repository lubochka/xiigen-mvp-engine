# Flow UI examination — FLOW-38 rag-quality-feedback

## Date: 2026-04-20 · Run: RUN-60 · Batch: F (Grammar 6 Dashboard)

## One-sentence spec (F1)
> When a generation round completes and a DPO triple is stored for a flow,
> automatically update the qualityScore of each RAG pattern that was retrieved
> during that round using the cycle outcome (SUCCESS_WITHIN_BUDGET or
> WASTED_CYCLE) as the learning signal, so that future context package
> retrievals surface higher-quality patterns first.

## Roles
- **platform-admin** — primary; monitor quality-learning loop
- **platform-support** — read-only audit

Engine-internal.

## Grammar
**G6 Dashboard** — quality-score tiles + scored-runs list + feedback widgets.
**Reference:** **LangSmith** (trace quality), **Humanloop** (LLM observability), **PromptLayer** (prompt quality tracking).

## CFI-05 status
**Orphaned screen** — `RagQualityScreen.tsx` exists at
`client/src/components/rag-quality/` but `RagQualityFeedbackPage.tsx` renders
`AdminCrudPanel` default. **FLOW-45 RUN-52 Page-rewrite template applies.**

## Classification
- **Q1 CRUD?** ✅ YES — AdminCrudPanel default.
- **Q2 Error/empty?** No-data state: "Generation feedback will appear here as rounds complete."
- **Q3 Engineering leak?** "DPO triple", "qualityScore", "SUCCESS_WITHIN_BUDGET", "WASTED_CYCLE", "context package" — internal terms; in UI: "Training signal", "Quality", "Succeeded", "Wasted", "Retrieval context".
- **Q4 Role-correct?** 2-role scope.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — Page rewrite per FLOW-45 RUN-52 template.

## 13 existing PNGs

## Planned fixes
- Metric tiles: RAG patterns scored / Avg quality delta / Recent SUCCESS rate / Recent WASTED rate
- Trend chart: quality score over time with event markers (promotions / demotions)
- Pattern cards: card per RAG pattern with quality score + trend (up/down arrow) + usage count
- Distilled rules card list: plain-English rules derived from accumulated DPO triples (use `DistilledRuleCard.tsx`)
- Cycle outcome log: recent generation rounds with SUCCESS_WITHIN_BUDGET / WASTED_CYCLE verdict
