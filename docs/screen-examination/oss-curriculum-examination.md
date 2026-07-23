# Flow UI examination — FLOW-39 oss-curriculum

## Date: 2026-04-20 · Run: RUN-60 · Batch: F (Grammar 6 Dashboard)

## One-sentence spec (F1)
> When a DPO triple is created for a task type, automatically assign
> curriculumTier based on the task type's archetype (ROUTING=Tier 1,
> DATA_PIPELINE=Tier 2, PROCESSING=Tier 3, ORCHESTRATION=Tier 4,
> SCHEDULED=Tier 5), run a shadow comparison of the winning NODE against
> local OSS models (llama3:8b, codellama:13b, deepseek-coder:6.7b).

## Roles
- **platform-admin** — primary; local-model training curriculum operator
- **platform-support** — read-only

Engine-internal.

## Grammar
**G6 Dashboard** — NOT Khan-Academy lesson player. This is a **training corpus
dashboard** — curriculum-tier distribution chart + shadow-run dashboard + DPO
corpus-size readiness per tier.

**Reference (correction from MARKET-REFERENCE-CATALOG):** **LangSmith curriculum view**,
**W&B experiments**, **Humanloop training dashboards**. **NOT** Khan Academy.

## CFI-05 status
**Orphaned screen** — `OssCurriculumScreen.tsx`, `CurriculumTierBadge.tsx`,
`ShadowRunStatusCard.tsx`, `LearningSignalRow.tsx` exist at
`client/src/components/oss-curriculum/` but `OssCurriculumPage.tsx` renders
`AdminCrudPanel` default + `SAMPLE_COURSES` list (which mis-implements as a
student-facing course grid). **FLOW-45 RUN-52 Page-rewrite template applies.**

## Classification
- **Q1 CRUD?** ✅ YES — AdminCrudPanel default + wrong-direction student courses list.
- **Q2 Error/empty?** Empty DPO corpus: "No DPO triples accumulated yet."
- **Q3 Engineering leak?** "DPO triple", "curriculumTier", "archetype", "shadow comparison" — internal but acceptable for admin; the `SAMPLE_COURSES` data ("Flow Design Fundamentals", "Prompt Engineering") is **wrong direction** — this page is NOT a student course catalog.
- **Q4 Role-correct?** 2-role admin scope.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — Page rewrite per FLOW-45
RUN-52 template + **delete `SAMPLE_COURSES` wrong-direction data**.

## 13 existing PNGs

## Planned fixes
- **Delete** `SAMPLE_COURSES` from OssCurriculumPage — wrong product direction
- Metric tiles: DPO triples by tier (T1 ROUTING / T2 DATA_PIPELINE / T3 PROCESSING / T4 ORCHESTRATION / T5 SCHEDULED)
- Distribution chart: triples-per-tier horizontal bar chart
- Shadow-run dashboard: card per active shadow comparison (task type / winning model / local-model gap score)
- Readiness meter per tier: progress bar showing DPO corpus size vs target threshold for model-update trigger
- Use existing `ShadowRunStatusCard` + `CurriculumTierBadge` + `LearningSignalRow` components
