# Functional Spec — FLOW-38 RAG Quality Feedback (learning loop)

**Grammar:** G6 Dashboard
**Primary role tiers:** PLATFORM_OPS (primary), PLATFORM_SUPPORT (read-only). Engine-internal.
**Current state:** **Half-built** — 5 services, purpose-built `RagQualityScreen` orphaned. Page wrapper renders `AdminCrudPanel`. 13 PNGs.
**Primary unblock:** FLOW-45 RUN-52 page rewrite.
**Resolved from zip:** primary spec is zip's `30-prompt improvements.md` (resolved 2026-04-22).

---

## 1. Summary

Every generation round the engine runs produces a DPO triple — a (chosen, rejected) pair with a quality score. This flow takes those scores and updates the quality rating of the RAG patterns that were retrieved during that round, so future retrievals surface higher-quality patterns first. A platform admin watches the learning loop: what's scoring well, what's scoring poorly, what rules the system has distilled from accumulated triples, how the quality curve is trending. Today the update service runs; the admin has no dashboard to watch it.

---

## 2. Roles & modes

| Role | Route | What they do |
|---|---|---|
| **PLATFORM_OPS** (primary) | `/admin/engine/rag-quality/` | Monitor quality-learning loop, approve distilled rules, tune retrieval thresholds |
| **PLATFORM_SUPPORT** | Same, read-only | Read-only audit |

**Modes:** `?mock=<key>` design preview / live. Filter by flow / by time-window / by success-or-waste.

---

## 3. User stories

### Story 3.1 — Admin watches the quality-learning loop trend

**Screens:** `/admin/engine/rag-quality/` → dashboard.

**Happy path:**
1. Page loads. Top row: metric tiles — *RAG patterns tracked (1,247)* · *Avg quality delta last 7 days (+0.03)* · *Success-within-budget rate (74%)* · *Wasted-cycle rate (21%)*.
2. Below: trend chart — quality score over time with event markers (pattern promotions, demotions, major engine changes). Hover for event detail.
3. Below trend: two card lists — *Rising patterns* (top 5 positive delta) and *Falling patterns* (bottom 5 negative delta) — each card shows the pattern summary, delta, trend arrow.

**UI elements:**
- Metric tiles: large number + label + trend indicator (up/down arrow with delta).
- Trend chart: dual-axis (absolute score + delta), zoomable, range picker (24h / 7d / 30d / 90d).
- Card lists: two columns, scrollable.

### Story 3.2 — Admin drills into a falling pattern

**Trigger:** admin clicks a card in "Falling patterns".

**Happy path:**
1. Side panel slides in with pattern detail: source text excerpt, quality-score history line chart, recent triples using this pattern, related patterns.
2. Actions: **Freeze pattern** (remove from retrieval temporarily), **Request rewrite** (route to prompt-engineering queue), **Mark intentional** (noise expected).
3. If admin freezes, toast: *"Pattern frozen — won't be retrieved for 7 days while you investigate."* + undo.

### Story 3.3 — Admin reviews distilled rules

**Trigger:** admin clicks **Distilled rules** tab.

**Happy path:**
1. Tab shows card list of rules — plain-English sentences the system has derived from accumulated DPO triples (e.g., *"For `REGISTRATION` archetype tasks, generated code should always include a `BuildSearchFilter` usage — 92 of 100 high-quality triples had it"*).
2. Each card: rule text, confidence score, supporting-triple count, first-seen date, three actions: **Promote to iron rule** / **Demote** / **Reject**.
3. Admin reviews + approves / rejects per rule.

**UI elements:**
- `DistilledRuleCard.tsx` component already exists in codebase; wire it here.
- Confidence score as a horizontal bar + numeric %.

### Story 3.4 — Admin sees cycle outcome log

**Trigger:** admin clicks **Cycle outcomes** tab.

**Happy path:**
1. Tab shows per-round log — most recent on top. Each entry: flow + task type, timestamp, outcome (SUCCESS_WITHIN_BUDGET / WASTED_CYCLE), budget used, patterns retrieved, final score, link to the triple in xiigen-training-data.
2. Filter bar: by flow, by outcome, by time window.
3. Click an entry → expanded view with full pattern list and score breakdown.

---

## 4. Screen structure & UI elements

### 4.1 `/admin/engine/rag-quality/` layout

**Tabs:** *Overview · Patterns · Distilled rules · Cycle outcomes · Settings*.

- **Overview:** metric tiles + trend chart + rising/falling card lists (Story 3.1).
- **Patterns:** full card list of all tracked RAG patterns with quality score + sort options.
- **Distilled rules:** Story 3.3.
- **Cycle outcomes:** Story 3.4.
- **Settings:** configurable thresholds (retrieval min score, freeze duration, rule promotion bar).

### 4.2 Pattern card

```
┌──────────────────────────────────────────────────────────┐
│ Pattern summary: "REGISTRATION archetype atomic-write"   │
│ Quality: 0.87 ↗ +0.03 (7d)                                │
│ Retrieved 342 times · 89 high-quality triples             │
└──────────────────────────────────────────────────────────┘
```

### 4.3 Distilled rule card

```
┌──────────────────────────────────────────────────────────┐
│ For REGISTRATION archetype tasks, generated code should  │
│ always include a BuildSearchFilter usage.                │
│                                                           │
│ Confidence: ▓▓▓▓▓▓▓▓▓░ 92%                                │
│ Supporting triples: 100 · First seen: Mar 14              │
│                                                           │
│ [Promote to iron rule]  [Demote]  [Reject]                │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| Pattern has < 10 supporting triples | Quality score shown as *"Not enough data"* — don't attribute trends. |
| Admin freezes a pattern that's iron-ruled | Warning: *"This pattern is an iron rule — freezing may cause generation failures. Continue?"* |
| Distilled rule contradicts an existing iron rule | Rule card shows *"Conflicts with iron rule X"* and requires resolution before promotion. |
| Trend chart has a gap (engine was down) | Show gap with a note on hover: *"Engine offline 2026-04-18 10:00–14:00"*. |
| Scores all zero (cold start) | Banner: *"Learning loop is seeding — scores become meaningful after ~50 cycles."* |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Unauthenticated** | Redirect. |
| **Permission denied** | `/404`. |
| **Empty (cold start)** | Empty state: *"Generation feedback will appear here as rounds complete — usually within a day of first traffic."* |
| **Loading** | Skeleton tiles + chart placeholder. |
| **Metric tile fails individually** | Tile shows *"—"* with retry hover; other tiles load normally. |
| **Trend chart fails** | Chart area shows *"Couldn't render trend — try again"* with retry; does not block tab navigation. |
| **Freeze save fails** | Toast *"Couldn't freeze — retry?"*; card stays in its previous state. |
| **Rule promotion fails** | Inline error on the card; card stays actionable. |
| **Settings save fails** | Form validation error or banner; settings not persisted. |

---

## 7. Visual direction

**Grammar:** G6 Dashboard.

**Feel:** *Technical · Observable · Honest*. Show the actual numbers. Don't hide noise behind smoothing.

**Reference UIs:** **LangSmith** (trace quality), **Humanloop** (LLM observability), **PromptLayer** (prompt quality tracking).

**Colour world:**
- Neutral technical palette (oscilloscope green for positive delta, terminal amber for warning, fault red for negative delta, rack-grey chrome).
- Trend chart uses the same green/red/amber tri-colour.

**Signature:** the **Distilled rules** tab — plain-English rules the system extracted from evidence. It's the closest the engine gets to explaining what it learned.

**Anti-patterns:**
- "WASTED_CYCLE" / "SUCCESS_WITHIN_BUDGET" / "DPO triple" / "qualityScore" raw terms in user-facing copy — use "Succeeded", "Wasted", "Training signal", "Quality".
- Generic admin CRUD table (replace).
- Averaged-only metrics without distribution (show histograms / percentiles where possible).

---

## 8. Acceptance criteria

- [ ] `RagQualityFeedbackPage.tsx` wraps `RagQualityScreen` via FLOW-45 RUN-52 template.
- [ ] Four metric tiles render with trend indicators.
- [ ] Trend chart interactive, zoomable, with event markers.
- [ ] Rising / Falling pattern cards render with quality + delta + retrieval count.
- [ ] Pattern side panel: score history chart, recent triples list, three actions.
- [ ] Distilled rules tab renders `DistilledRuleCard.tsx` with confidence + actions.
- [ ] Cycle outcomes tab renders filterable per-round log.
- [ ] Settings tab allows threshold tuning with validation.
- [ ] All 9 problematic states (§6) documented treatment.
- [ ] Zero engineering terms (DPO, qualityScore, WASTED_CYCLE) in user-facing copy.
