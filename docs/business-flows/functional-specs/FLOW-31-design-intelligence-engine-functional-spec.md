# Functional Spec — FLOW-31 Design Intelligence Engine

**Grammar:** G6 Dashboard
**Primary role tiers:** PLATFORM_OPS. Engine-internal.
**Current state:** **Designed** — 0 services.

## 1. Summary

Tracks trends in design-quality metrics across the platform — prompt-effectiveness, screen-quality scores, AI-slop detection, grammar-type adoption. Lets platform admins see where the engine is generating good UI vs slop, and which prompts need improvement.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **PLATFORM_OPS** | `/admin/engine/design-intel/` | Monitor design-quality trends, investigate regressions |

**Modes:** Historical / Current / Prompt-effectiveness drilldown.

## 3. User stories

### Story 3.1 — Admin scans design-quality trends

**Screens:** `/admin/engine/design-intel/` dashboard.

1. Metric tiles: Overall design score (0-100), AI-slop incidents this week, Grammar-mismatched screens, Average time to convergence.
2. Trend chart: score over 90 days.
3. Top-10 problematic screens card list (lowest scores, most AI-slop signals).

### Story 3.2 — Admin drills into a problematic screen

**Trigger:** click a card in the top-10 list.

1. Screen detail: current rendering + score breakdown per category (accessibility, AI-slop, grammar match, UX writing).
2. History chart of the screen's scores.
3. Suggested improvements (from the engine's own analysis).

### Story 3.3 — Admin compares prompt effectiveness

**Screens:** Prompts tab.

1. Card list of prompts with effectiveness score + version.
2. Click a prompt → version history + A/B outcomes if run.
3. Suggest a PromptPatch (ties to FLOW-38).

## 4. Screen structure

- **Dashboard** — G6 tiles + trends + top-10 problematic.
- **Screen detail** — rendering + score breakdown + history.
- **Prompts tab** — effectiveness + version history.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| No data yet | *"Scores appear after the next generation round."* |
| Metric tile failing | *"—"* placeholder with retry. |
| Prompt changed but no A/B yet | Card shows *"Awaiting data"*. |

## 6. Problematic states

- **Empty** → cold-start messaging.
- **Metric fails individually** → don't block dashboard.
- **Screen detail fails** → retry; dashboard still works.

## 7. Visual direction

**Grammar:** G6 Dashboard.

**Feel:** *Rigorous · Investigative · Observable*.

**Colour world:** neutral chrome; score colours (green / amber / red based on thresholds).

**Signature:** the **suggested improvements** panel on screen detail — the engine proposes its own fixes based on SK-538 / SK-541 audits.

**Anti-patterns:**
- Averaged scores without distribution.
- Vanity metrics without actionable drill-down.

## 8. Acceptance criteria

- [ ] Dashboard with metric tiles + trend + top-10 card list.
- [ ] Screen detail with score breakdown + history + suggestions.
- [ ] Prompts effectiveness view.
- [ ] All 3 problematic states covered.
