# Flow UI examination — FLOW-25 bfa-cross-flow-governance

## Date: 2026-04-20 · Run: RUN-56 · Batch: B (Grammar 2 Verdict Grid)

## One-sentence spec (F1)
> When a new flow is registered on the XIIGen engine, run BFA conflict
> detection across all active flows, validate entity, route, and factory
> overlap, and block deployment if any conflict is detected.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-05.md`)
- **platform-admin** — primary; reviews conflict reports, approves / blocks flow deployment
- **platform-support** — read-only audit of governance decisions
- All other roles excluded (engine-internal governance)

## State inventory (F2)
29 processes. Engine-internal governance scanner:
- per-dimension conflict scan (entity / route / factory / event / data / schema / policy)
- decision gate (APPROVED / BLOCKED / NEEDS_REVIEW)
- deployment pipeline interlock

## Grammar
**G2 Verdict Grid** — per-flow-pair conflict matrix. Reference: GitHub PR review
(reviewers × files), Linear issue approval, Gerrit code review.

## Classification
- **Q1 CRUD?** Likely — existing `BfaCrossFlowGovernancePage.tsx` → probably AdminCrudPanel default. Needs PNG inspection.
- **Q2 Error/empty?** Likely — empty governance dashboard without a pending conflict shows empty state; needs good copy.
- **Q3 Engineering leak?** ⚠️ HIGH RISK — "BFA", "CF-32", "scope_isolation", "entity/route/factory overlap" are all internal vocabulary that must be translated for even platform-admin users. Use domain language: "Conflict scan", "Rule violation", "Deployment block".
- **Q4 Role-correct?** ✅ Only 2 roles — tight scope.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) for verdict grid; NEEDS_LABEL_SANITISATION (P1) for BFA / CF-XX jargon.

## 20 existing PNGs
CRUD-pattern + state mocks. See PNG-INVENTORY FLOW-25 section. Retained
until verdict-grid rebuild ships.

## Planned fixes (deferred)

**P0 — Verdict Grid for pending conflicts** (Grammar 2):
- Left column: pending flow registrations (newest first)
- Right panel: per-conflict detail with per-dimension (entity/route/factory/etc.) APPROVED/BLOCKED/NEEDS_REVISION cell
- Consensus verdict at bottom: "Deployment blocked by 2 dimensions (route overlap with FLOW-12, factory overlap with FLOW-17)"
- Approve / Override / Escalate / Defer actions

**P1 — Label sanitisation:** "BFA conflict" → "Cross-flow conflict"; "CF-32" → "Scope isolation rule"; "entity/route/factory overlap" → plain English.
